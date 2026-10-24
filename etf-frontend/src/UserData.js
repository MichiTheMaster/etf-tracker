import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Alert, Box, Button, Chip, IconButton, InputAdornment, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { apiDelete, apiGet, apiPost } from './apiClient';
import { validatePassword } from './passwordPolicy';
import { formatDateTime, t, useI18n } from './i18n';

function PasswordAdornment({ visible, onToggle }) {
  return (
    <InputAdornment position='end'>
      <IconButton size='small' onClick={onToggle} edge='end'>
        {visible ? <VisibilityOff fontSize='small' /> : <Visibility fontSize='small' />}
      </IconButton>
    </InputAdornment>
  );
}

PasswordAdornment.propTypes = {
  visible: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired
};

function LabeledValue({ label, value }) {
  return (
    <Typography>
      <Box component='strong'>{label}</Box>
      {' '}
      {value}
    </Typography>
  );
}

LabeledValue.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.node.isRequired
};

function ProfileDetailsSection({ profile }) {
  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant='h6' sx={{ mb: 2 }}>{t('me.backendTitle')}</Typography>
      <Stack spacing={1}>
        <LabeledValue label={t('me.username')} value={profile?.username || t('common.dash')} />
        <LabeledValue label={t('me.email')} value={profile?.email || t('common.dash')} />
        <LabeledValue label={t('me.emailVerified')} value={profile?.emailVerified ? t('common.yes') : t('common.no')} />
        <Stack direction='row' spacing={1} alignItems='center' flexWrap='wrap'>
          <Typography component='span'>
            <Box component='strong'>{t('me.roles')}</Box>
          </Typography>
          {(profile?.roles || []).map((role) => (
            <Chip key={role} label={role} size='small' />
          ))}
        </Stack>
      </Stack>
    </Paper>
  );
}

ProfileDetailsSection.propTypes = {
  profile: PropTypes.shape({
    username: PropTypes.string,
    email: PropTypes.string,
    emailVerified: PropTypes.bool,
    roles: PropTypes.arrayOf(PropTypes.string)
  })
};

function ClientDataSection({ clientData }) {
  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant='h6' sx={{ mb: 2 }}>{t('me.clientTitle')}</Typography>
      <Stack spacing={1}>
        <LabeledValue label='sessionAuthenticated:' value={clientData.sessionAuthenticated} />
        <LabeledValue label='sessionUsername:' value={clientData.sessionUsername} />
        <LabeledValue label='forceLoggedOut:' value={clientData.forceLoggedOut} />
      </Stack>
    </Paper>
  );
}

ClientDataSection.propTypes = {
  clientData: PropTypes.shape({
    sessionAuthenticated: PropTypes.string.isRequired,
    sessionUsername: PropTypes.string.isRequired,
    forceLoggedOut: PropTypes.string.isRequired
  }).isRequired
};

function PasswordSection({
  pwCurrent,
  pwNew,
  pwConfirm,
  showCurrent,
  showNew,
  showConfirm,
  pwError,
  pwSuccess,
  pwLoading,
  onSubmit,
  onCurrentChange,
  onNewChange,
  onConfirmChange,
  onToggleCurrent,
  onToggleNew,
  onToggleConfirm
}) {
  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant='h6' sx={{ mb: 2 }}>{t('me.changePassword')}</Typography>
      <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
        {t('me.passwordRules')}
      </Typography>
      {pwError && <Alert severity='error' sx={{ mb: 2 }}>{pwError}</Alert>}
      {pwSuccess && <Alert severity='success' sx={{ mb: 2 }}>{pwSuccess}</Alert>}
      <Box component='form' onSubmit={onSubmit}>
        <Stack spacing={2}>
          <TextField
            label={t('me.currentPassword')}
            type={showCurrent ? 'text' : 'password'}
            value={pwCurrent}
            onChange={onCurrentChange}
            required
            size='small'
            slotProps={{
              input: {
                endAdornment: <PasswordAdornment visible={showCurrent} onToggle={onToggleCurrent} />
              }
            }}
          />
          <TextField
            label={t('me.newPassword')}
            type={showNew ? 'text' : 'password'}
            value={pwNew}
            onChange={onNewChange}
            required
            size='small'
            helperText={pwNew && validatePw(pwNew) ? validatePw(pwNew) : ''}
            error={!!pwNew && !!validatePw(pwNew)}
            slotProps={{
              input: {
                endAdornment: <PasswordAdornment visible={showNew} onToggle={onToggleNew} />
              }
            }}
          />
          <TextField
            label={t('me.confirmNewPassword')}
            type={showConfirm ? 'text' : 'password'}
            value={pwConfirm}
            onChange={onConfirmChange}
            required
            size='small'
            helperText={pwConfirm && pwNew !== pwConfirm ? t('auth.passwordMismatch') : ''}
            error={!!pwConfirm && pwNew !== pwConfirm}
            slotProps={{
              input: {
                endAdornment: <PasswordAdornment visible={showConfirm} onToggle={onToggleConfirm} />
              }
            }}
          />
          <Button
            type='submit'
            variant='contained'
            disabled={pwLoading || !!validatePw(pwNew) || pwNew !== pwConfirm || !pwCurrent}
            sx={{ alignSelf: 'flex-start' }}
          >
            {pwLoading ? t('me.changing') : t('me.changePasswordAction')}
          </Button>
        </Stack>
      </Box>
    </Paper>
  );
}

PasswordSection.propTypes = {
  pwCurrent: PropTypes.string.isRequired,
  pwNew: PropTypes.string.isRequired,
  pwConfirm: PropTypes.string.isRequired,
  showCurrent: PropTypes.bool.isRequired,
  showNew: PropTypes.bool.isRequired,
  showConfirm: PropTypes.bool.isRequired,
  pwError: PropTypes.string.isRequired,
  pwSuccess: PropTypes.string.isRequired,
  pwLoading: PropTypes.bool.isRequired,
  onSubmit: PropTypes.func.isRequired,
  onCurrentChange: PropTypes.func.isRequired,
  onNewChange: PropTypes.func.isRequired,
  onConfirmChange: PropTypes.func.isRequired,
  onToggleCurrent: PropTypes.func.isRequired,
  onToggleNew: PropTypes.func.isRequired,
  onToggleConfirm: PropTypes.func.isRequired
};

function EmailSection({
  emailNew,
  emailPassword,
  showEmailPassword,
  emailError,
  emailSuccess,
  emailLoading,
  onSubmit,
  onEmailChange,
  onPasswordChange,
  onTogglePassword
}) {
  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant='h6' sx={{ mb: 2 }}>{t('me.changeEmail')}</Typography>
      {emailError && <Alert severity='error' sx={{ mb: 2 }}>{emailError}</Alert>}
      {emailSuccess && <Alert severity='success' sx={{ mb: 2 }}>{emailSuccess}</Alert>}
      <Box component='form' onSubmit={onSubmit}>
        <Stack spacing={2}>
          <TextField
            label={t('me.newEmail')}
            type='email'
            value={emailNew}
            onChange={onEmailChange}
            required
            size='small'
            helperText={emailNew && validateEmail(emailNew) ? validateEmail(emailNew) : ''}
            error={!!emailNew && !!validateEmail(emailNew)}
          />
          <TextField
            label={t('me.confirmPassword')}
            type={showEmailPassword ? 'text' : 'password'}
            value={emailPassword}
            onChange={onPasswordChange}
            required
            size='small'
            slotProps={{
              input: {
                endAdornment: <PasswordAdornment visible={showEmailPassword} onToggle={onTogglePassword} />
              }
            }}
          />
          <Button
            type='submit'
            variant='contained'
            disabled={emailLoading || !!validateEmail(emailNew) || !emailPassword || !emailNew}
            sx={{ alignSelf: 'flex-start' }}
          >
            {emailLoading ? t('me.changing') : t('me.changeEmailAction')}
          </Button>
        </Stack>
      </Box>
    </Paper>
  );
}

EmailSection.propTypes = {
  emailNew: PropTypes.string.isRequired,
  emailPassword: PropTypes.string.isRequired,
  showEmailPassword: PropTypes.bool.isRequired,
  emailError: PropTypes.string.isRequired,
  emailSuccess: PropTypes.string.isRequired,
  emailLoading: PropTypes.bool.isRequired,
  onSubmit: PropTypes.func.isRequired,
  onEmailChange: PropTypes.func.isRequired,
  onPasswordChange: PropTypes.func.isRequired,
  onTogglePassword: PropTypes.func.isRequired
};

function SessionsSection({ sessions, sessionsLoading, sessionMessage, onRefresh, onRevokeOthers, onRevokeSession }) {
  const hasOtherSessions = sessions.some((session) => !session.current);
  return (
    <Paper sx={{ p: 3 }}>
      <Stack direction='row' spacing={2} alignItems='center' sx={{ mb: 2 }}>
        <Typography variant='h6' sx={{ flex: 1 }}>{t('me.sessionsTitle')}</Typography>
        <Button size='small' variant='outlined' onClick={onRefresh}>{t('common.refresh')}</Button>
        {hasOtherSessions && (
          <Button size='small' variant='contained' color='warning' onClick={onRevokeOthers}>
            {t('me.otherDevices')}
          </Button>
        )}
      </Stack>
      {sessionMessage && <Alert severity='info' sx={{ mb: 2 }}>{sessionMessage}</Alert>}
      {sessionsLoading ? (
        <Typography color='text.secondary'>{t('me.sessionsLoading')}</Typography>
      ) : (
        <Table size='small'>
          <TableHead>
            <TableRow>
              <TableCell>{t('me.status')}</TableCell>
              <TableCell>{t('me.lastSeen')}</TableCell>
              <TableCell>{t('me.expires')}</TableCell>
              <TableCell>{t('me.browser')}</TableCell>
              <TableCell>{t('me.ip')}</TableCell>
              <TableCell align='right'>{t('common.action')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sessions.map((session) => (
              <TableRow key={session.id}>
                <TableCell>
                  {session.current ? <Chip size='small' color='success' label={t('me.current')} /> : t('me.active')}
                </TableCell>
                <TableCell>{formatDateTime(session.lastSeenAt)}</TableCell>
                <TableCell>{formatDateTime(session.expiresAt)}</TableCell>
                <TableCell sx={{ maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {session.userAgent || t('common.dash')}
                </TableCell>
                <TableCell>{session.ipAddress || t('common.dash')}</TableCell>
                <TableCell align='right'>
                  <Button
                    size='small'
                    color={session.current ? 'warning' : 'error'}
                    variant={session.current ? 'outlined' : 'text'}
                    onClick={() => onRevokeSession(session.id, session.current)}
                  >
                    {session.current ? t('me.logout') : t('me.end')}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {sessions.length === 0 && (
              <TableRow>
                <TableCell colSpan={6}>
                  <Typography color='text.secondary'>{t('me.noSessions')}</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </Paper>
  );
}

SessionsSection.propTypes = {
  sessions: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    current: PropTypes.bool,
    lastSeenAt: PropTypes.string.isRequired,
    expiresAt: PropTypes.string.isRequired,
    userAgent: PropTypes.string,
    ipAddress: PropTypes.string
  })).isRequired,
  sessionsLoading: PropTypes.bool.isRequired,
  sessionMessage: PropTypes.string.isRequired,
  onRefresh: PropTypes.func.isRequired,
  onRevokeOthers: PropTypes.func.isRequired,
  onRevokeSession: PropTypes.func.isRequired
};

function validatePw(pw) {
  return validatePassword(pw);
}

function validateEmail(email) {
  return /^[A-Za-z0-9+_.-]+@([A-Za-z0-9.-]+)$/.test(email) ? '' : t('me.invalidEmail');
}

export default function UserData({ currentUser, refreshCurrentUser, onForcedLogout }) {
  const { t } = useI18n();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [emailNew, setEmailNew] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [showEmailPassword, setShowEmailPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [emailSuccess, setEmailSuccess] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionMessage, setSessionMessage] = useState('');

  const loadProfile = async () => {
    const payload = await apiGet('/api/me', {
      fallbackMessage: t('me.profileFailed')
    });
    setProfile(payload);
  };

  async function handleChangeEmail(e) {
    e.preventDefault();
    setEmailError('');
    setEmailSuccess('');
    if (!emailPassword) {
      setEmailError(t('me.passwordRequired'));
      return;
    }
    const emailValidationError = validateEmail(emailNew);
    if (emailValidationError) {
      setEmailError(emailValidationError);
      return;
    }
    setEmailLoading(true);
    try {
      await apiPost('/api/user/change-email', {
        currentPassword: emailPassword,
        newEmail: emailNew
      }, {
        fallbackMessage: t('me.emailChangeFailed')
      });
      setEmailSuccess(t('me.emailChanged'));
      setEmailNew('');
      setEmailPassword('');
      setTimeout(() => {
        const refreshProfile = refreshCurrentUser || loadProfile;
        refreshProfile().catch(() => {});
      }, 1000);
    } catch (error) {
      setEmailError(error.message || t('common.networkError'));
    } finally {
      setEmailLoading(false);
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');
    const validationError = validatePw(pwNew);
    if (validationError) {
      setPwError(validationError);
      return;
    }
    if (pwNew !== pwConfirm) {
      setPwError(t('auth.passwordMismatch'));
      return;
    }
    setPwLoading(true);
    try {
      await apiPost('/api/user/change-password', {
        currentPassword: pwCurrent,
        newPassword: pwNew
      }, {
        fallbackMessage: t('me.passwordChangeFailed')
      });
      setPwSuccess(t('me.passwordChanged'));
      setPwCurrent('');
      setPwNew('');
      setPwConfirm('');
      onForcedLogout?.();
    } catch (error) {
      setPwError(error.message || t('common.networkError'));
    } finally {
      setPwLoading(false);
    }
  }

  useEffect(() => {
    if (currentUser) {
      setProfile((previous) => ({
        ...previous,
        ...currentUser,
        emailVerified: previous?.emailVerified ?? currentUser.emailVerified
      }));
    }
  }, [currentUser]);

  useEffect(() => {
    loadProfile()
      .catch((loadError) => {
        setError(loadError?.message || t('me.profileFailed'));
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const loadSessions = async () => {
    setSessionsLoading(true);
    try {
      const data = await apiGet('/api/me/sessions', {
        fallbackMessage: t('me.sessionsFailed')
      });
      setSessions(Array.isArray(data) ? data : []);
    } catch {
      setSessions([]);
    } finally {
      setSessionsLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const revokeSession = async (sessionId, isCurrent) => {
    setSessionMessage('');
    try {
      await apiDelete(`/api/me/sessions/${encodeURIComponent(sessionId)}`, {
        fallbackMessage: t('me.sessionEndFailed')
      });
      if (isCurrent) {
        onForcedLogout?.();
        globalThis.location.hash = '#/login';
        return;
      }
      setSessionMessage(t('me.sessionEnded'));
      await loadSessions();
    } catch {
      setSessionMessage(t('me.sessionEndFailed'));
    }
  };

  const revokeOtherSessions = async () => {
    setSessionMessage('');
    try {
      await apiDelete('/api/me/sessions/others', {
        fallbackMessage: t('me.othersFailed')
      });
      setSessionMessage(t('me.othersEnded'));
      await loadSessions();
    } catch {
      setSessionMessage(t('me.othersFailed'));
    }
  };

  const clientData = useMemo(() => {
    if (globalThis.window === undefined) {
      return { sessionAuthenticated: t('common.dash'), sessionUsername: t('common.dash'), forceLoggedOut: t('common.dash') };
    }
    return {
      sessionAuthenticated: localStorage.getItem('sessionAuthenticated') || t('me.notSet'),
      sessionUsername: localStorage.getItem('sessionUsername') || t('me.notSet'),
      forceLoggedOut: localStorage.getItem('forceLoggedOut') || t('me.notSet')
    };
  }, []);

  if (isLoading) {
    return <Paper sx={{ p: 3 }}><Typography>{t('me.loading')}</Typography></Paper>;
  }

  if (error) {
    return (
      <Paper sx={{ p: 3 }}>
        <Alert severity='error' variant='filled' sx={{ borderRadius: 2 }}>{error}</Alert>
      </Paper>
    );
  }

  const passwordExpired = Boolean(profile?.passwordExpired || currentUser?.passwordExpired);
  const passwordExpiresSoon = Boolean(profile?.passwordExpiresSoon || currentUser?.passwordExpiresSoon);

  return (
    <Stack spacing={2}>
      {passwordExpired && (
        <Alert severity="error">
          {t('me.passwordExpired')}
        </Alert>
      )}
      {!passwordExpired && passwordExpiresSoon && (
        <Alert severity="warning">
          {t('me.passwordExpiresSoon')}
        </Alert>
      )}
      <ProfileDetailsSection profile={profile} />
      <ClientDataSection clientData={clientData} />
      <PasswordSection
        pwCurrent={pwCurrent}
        pwNew={pwNew}
        pwConfirm={pwConfirm}
        showCurrent={showCurrent}
        showNew={showNew}
        showConfirm={showConfirm}
        pwError={pwError}
        pwSuccess={pwSuccess}
        pwLoading={pwLoading}
        onSubmit={handleChangePassword}
        onCurrentChange={(event) => setPwCurrent(event.target.value)}
        onNewChange={(event) => {
          setPwNew(event.target.value);
          setPwError('');
        }}
        onConfirmChange={(event) => setPwConfirm(event.target.value)}
        onToggleCurrent={() => setShowCurrent((value) => !value)}
        onToggleNew={() => setShowNew((value) => !value)}
        onToggleConfirm={() => setShowConfirm((value) => !value)}
      />
      <EmailSection
        emailNew={emailNew}
        emailPassword={emailPassword}
        showEmailPassword={showEmailPassword}
        emailError={emailError}
        emailSuccess={emailSuccess}
        emailLoading={emailLoading}
        onSubmit={handleChangeEmail}
        onEmailChange={(event) => {
          setEmailNew(event.target.value);
          setEmailError('');
        }}
        onPasswordChange={(event) => setEmailPassword(event.target.value)}
        onTogglePassword={() => setShowEmailPassword((value) => !value)}
      />
      <SessionsSection
        sessions={sessions}
        sessionsLoading={sessionsLoading}
        sessionMessage={sessionMessage}
        onRefresh={loadSessions}
        onRevokeOthers={revokeOtherSessions}
        onRevokeSession={revokeSession}
      />
    </Stack>
  );
}

UserData.propTypes = {
  currentUser: PropTypes.shape({
    username: PropTypes.string,
    email: PropTypes.string,
    emailVerified: PropTypes.bool,
    passwordExpired: PropTypes.bool,
    passwordExpiresSoon: PropTypes.bool,
    roles: PropTypes.arrayOf(PropTypes.string)
  }),
  refreshCurrentUser: PropTypes.func,
  onForcedLogout: PropTypes.func
};
