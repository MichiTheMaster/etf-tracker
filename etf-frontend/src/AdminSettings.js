import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Chip,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography
} from "@mui/material";
import { apiDelete, apiGet, apiPost, apiRequest } from "./apiClient";
import { formatDateTime, useI18n } from "./i18n";

const FALLBACK_KEY = "market.fallbackPricesEnabled";
const ALIAS_PREFIX = "market.alias.";
const INACTIVITY_TIMEOUT_KEY = "app.session.inactivityTimeoutMinutes";
const INACTIVITY_WARNING_KEY = "app.session.inactivityWarningMinutes";
const MAX_FAILED_ATTEMPTS_KEY = "app.security.maxFailedLoginAttempts";
const LOCK_DURATION_MINUTES_KEY = "app.security.lockDurationMinutes";
const PASSWORD_MAX_AGE_DAYS_KEY = "app.security.passwordMaxAgeDays";
const PORTFOLIO_BENCHMARK_RATE_KEY = "app.portfolio.benchmarkAnnualRatePct";
const QUOTE_REFRESH_MINUTES_KEY = "market.quoteRefreshMinutes";

export default function AdminSettings({ currentUser, refreshCurrentUser }) {
  const { t } = useI18n();
  const [settings, setSettings] = useState([]);
  const [users, setUsers] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [auditPage, setAuditPage] = useState(0);
  const [auditTotalPages, setAuditTotalPages] = useState(0);
  const [auditLoading, setAuditLoading] = useState(false);
  const [securityOverview, setSecurityOverview] = useState(null);
  const [securityLoading, setSecurityLoading] = useState(false);
  const [settingsHistory, setSettingsHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [auditCategory, setAuditCategory] = useState("");
  const [auditUsername, setAuditUsername] = useState("");
  const [auditFromDate, setAuditFromDate] = useState("");
  const [auditToDate, setAuditToDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [userLoading, setUserLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [fallbackEnabled, setFallbackEnabled] = useState("true");
  const [inactivityTimeoutMinutes, setInactivityTimeoutMinutes] = useState("30");
  const [inactivityWarningMinutes, setInactivityWarningMinutes] = useState("28");
  const [maxFailedAttempts, setMaxFailedAttempts] = useState("5");
  const [lockDurationMinutes, setLockDurationMinutes] = useState("30");
  const [passwordMaxAgeDays, setPasswordMaxAgeDays] = useState("90");
  const [portfolioBenchmarkRatePct, setPortfolioBenchmarkRatePct] = useState("3.0");
  const [quoteRefreshMinutes, setQuoteRefreshMinutes] = useState("5");
  const [aliasBase, setAliasBase] = useState("");
  const [aliasTarget, setAliasTarget] = useState("");
  const roles = Array.isArray(currentUser?.roles) ? currentUser.roles : [];
  const canWriteAdmin = roles.includes("ADMIN");

  const loadSettings = async () => {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const data = await apiGet("/api/admin/settings", {
        fallbackMessage: t("admin.loadFailed")
      });
      const list = Array.isArray(data) ? data : [];
      setSettings(list);

      const fallbackEntry = list.find((entry) => entry.key === FALLBACK_KEY);
      if (fallbackEntry?.value) {
        setFallbackEnabled(fallbackEntry.value.toLowerCase() === "true" ? "true" : "false");
      }

      const timeoutEntry = list.find((entry) => entry.key === INACTIVITY_TIMEOUT_KEY);
      if (timeoutEntry?.value) {
        setInactivityTimeoutMinutes(timeoutEntry.value);
      }

      const warningEntry = list.find((entry) => entry.key === INACTIVITY_WARNING_KEY);
      if (warningEntry?.value) {
        setInactivityWarningMinutes(warningEntry.value);
      }

      const maxAttemptsEntry = list.find((entry) => entry.key === MAX_FAILED_ATTEMPTS_KEY);
      if (maxAttemptsEntry?.value) {
        setMaxFailedAttempts(maxAttemptsEntry.value);
      }

      const lockDurationEntry = list.find((entry) => entry.key === LOCK_DURATION_MINUTES_KEY);
      if (lockDurationEntry?.value) {
        setLockDurationMinutes(lockDurationEntry.value);
      }

      const passwordMaxAgeEntry = list.find((entry) => entry.key === PASSWORD_MAX_AGE_DAYS_KEY);
      if (passwordMaxAgeEntry?.value) {
        setPasswordMaxAgeDays(passwordMaxAgeEntry.value);
      }

      const portfolioBenchmarkRateEntry = list.find((entry) => entry.key === PORTFOLIO_BENCHMARK_RATE_KEY);
      if (portfolioBenchmarkRateEntry?.value) {
        setPortfolioBenchmarkRatePct(portfolioBenchmarkRateEntry.value);
      }

      const quoteRefreshEntry = list.find((entry) => entry.key === QUOTE_REFRESH_MINUTES_KEY);
      if (quoteRefreshEntry?.value) {
        setQuoteRefreshMinutes(quoteRefreshEntry.value);
      }
    } catch (loadError) {
      setError(loadError?.message || t("admin.loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    setUserLoading(true);

    try {
      const data = await apiGet("/api/admin/users", {
        fallbackMessage: t("admin.usersFailed")
      });
      setUsers(Array.isArray(data) ? data : []);
    } catch (loadError) {
      setError(loadError?.message || t("admin.usersFailed"));
    } finally {
      setUserLoading(false);
    }
  };

  const loadSecurityOverview = async () => {
    setSecurityLoading(true);
    try {
      const data = await apiGet("/api/admin/security/overview", {
        fallbackMessage: t("admin.securityFailed")
      });
      setSecurityOverview(data);
    } catch (loadError) {
      setError(loadError?.message || t("admin.securityFailed"));
    } finally {
      setSecurityLoading(false);
    }
  };

  const loadSettingsHistory = async () => {
    setHistoryLoading(true);
    try {
      const data = await apiGet("/api/admin/settings/history", {
        fallbackMessage: t("admin.historyFailed")
      });
      setSettingsHistory(Array.isArray(data) ? data : []);
    } catch (loadError) {
      setError(loadError?.message || t("admin.historyFailed"));
    } finally {
      setHistoryLoading(false);
    }
  };

  // Initial data load must run once on mount; audit filter updates are triggered by explicit actions.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    loadSettings();
    loadSettingsHistory();
    loadSecurityOverview();
    loadUsers();
    loadAuditLog(0);
  }, []);

  const formatDateInput = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const toStartOfDayIso = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(`${dateStr}T00:00:00`);
    return Number.isNaN(date.getTime()) ? "" : date.toISOString();
  };

  const toEndOfDayIso = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(`${dateStr}T23:59:59.999`);
    return Number.isNaN(date.getTime()) ? "" : date.toISOString();
  };

  const loadAuditLog = async (page, overrides = {}) => {
    setAuditLoading(true);
    try {
      const resolvedCategory = overrides.auditCategory ?? auditCategory;
      const resolvedUsername = overrides.auditUsername ?? auditUsername;
      const resolvedFromDate = overrides.auditFromDate ?? auditFromDate;
      const resolvedToDate = overrides.auditToDate ?? auditToDate;

      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("size", "50");
      if (resolvedCategory.trim()) params.set("category", resolvedCategory.trim());
      if (resolvedUsername.trim()) params.set("username", resolvedUsername.trim());
      const fromIso = toStartOfDayIso(resolvedFromDate);
      const toIso = toEndOfDayIso(resolvedToDate);
      if (fromIso) params.set("from", fromIso);
      if (toIso) params.set("to", toIso);

      const data = await apiGet(`/api/admin/audit-log?${params.toString()}`, {
        fallbackMessage: t("admin.auditFailed")
      });
      setAuditLog(Array.isArray(data.content) ? data.content : []);
      setAuditTotalPages(data.totalPages ?? 0);
      setAuditPage(data.page ?? 0);
    } catch (err) {
      setError(err?.message || t("admin.auditFailed"));
    } finally {
      setAuditLoading(false);
    }
  };

  const applyAuditPreset = (days) => {
    const now = new Date();
    const from = new Date(now);
    from.setDate(now.getDate() - days + 1);

    const preset = {
      auditFromDate: formatDateInput(from),
      auditToDate: formatDateInput(now)
    };

    setAuditFromDate(preset.auditFromDate);
    setAuditToDate(preset.auditToDate);
    loadAuditLog(0, preset);
  };

  const exportAuditCsv = async () => {
    setError("");
    setMessage("");

    try {
      const params = new URLSearchParams();
      params.set("limit", "5000");
      if (auditCategory.trim()) params.set("category", auditCategory.trim());
      if (auditUsername.trim()) params.set("username", auditUsername.trim());
      const fromIso = toStartOfDayIso(auditFromDate);
      const toIso = toEndOfDayIso(auditToDate);
      if (fromIso) params.set("from", fromIso);
      if (toIso) params.set("to", toIso);

      const csvText = await apiGet(`/api/admin/audit-log/export?${params.toString()}`, {
        fallbackMessage: t("admin.csvFailed")
      });
      const blob = new Blob([csvText], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "audit-log.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setMessage(t("admin.csvExported"));
    } catch (exportError) {
      setError(exportError?.message || t("admin.csvFailed"));
    }
  };

  const aliases = useMemo(() => {
    return settings
      .filter((entry) => typeof entry.key === "string" && entry.key.startsWith(ALIAS_PREFIX))
      .map((entry) => ({
        base: entry.key.substring(ALIAS_PREFIX.length),
        target: entry.value || ""
      }))
      .sort((a, b) => a.base.localeCompare(b.base));
  }, [settings]);

  const upsertSetting = async (key, value) => {
    await apiPost("/api/admin/settings", { key, value }, {
      fallbackMessage: t("admin.settingSaveFailed", { key })
    });
  };

  const deleteSetting = async (key) => {
    await apiDelete(`/api/admin/settings/${encodeURIComponent(key)}`, {
      fallbackMessage: t("admin.settingDeleteFailed", { key })
    });
  };

  const saveFallbackSetting = async () => {
    setError("");
    setMessage("");

    try {
      await upsertSetting(FALLBACK_KEY, fallbackEnabled);
      setMessage(t("admin.fallbackSaved"));
      await loadSettings();
      await loadSettingsHistory();
    } catch (saveError) {
      setError(saveError?.message || t("admin.fallbackSaveFailed"));
    }
  };

  const saveInactivitySettings = async () => {
    setError("");
    setMessage("");

    const timeout = Number.parseInt(inactivityTimeoutMinutes, 10);
    const warning = Number.parseInt(inactivityWarningMinutes, 10);

    if (Number.isNaN(timeout) || timeout < 5 || timeout > 240) {
      setError(t("admin.timeoutRange"));
      return;
    }

    if (Number.isNaN(warning) || warning < 1 || warning >= timeout) {
      setError(t("admin.warningRange"));
      return;
    }

    try {
      await upsertSetting(INACTIVITY_TIMEOUT_KEY, String(timeout));
      await upsertSetting(INACTIVITY_WARNING_KEY, String(warning));
      setMessage(t("admin.inactivitySaved"));
      await loadSettings();
      await loadSettingsHistory();
    } catch (saveError) {
      setError(saveError?.message || t("admin.inactivitySaveFailed"));
    }
  };

  const saveSecurityThresholds = async () => {
    setError("");
    setMessage("");

    const attempts = Number.parseInt(maxFailedAttempts, 10);
    const lockMinutes = Number.parseInt(lockDurationMinutes, 10);
    const maxAgeDays = Number.parseInt(passwordMaxAgeDays, 10);

    if (Number.isNaN(attempts) || attempts < 3 || attempts > 20) {
      setError(t("admin.failsRange"));
      return;
    }

    if (Number.isNaN(lockMinutes) || lockMinutes < 5 || lockMinutes > 1440) {
      setError(t("admin.lockRange"));
      return;
    }

    if (Number.isNaN(maxAgeDays) || maxAgeDays < 0 || maxAgeDays > 730) {
      setError(t("admin.ageRange"));
      return;
    }

    try {
      await upsertSetting(MAX_FAILED_ATTEMPTS_KEY, String(attempts));
      await upsertSetting(LOCK_DURATION_MINUTES_KEY, String(lockMinutes));
      await upsertSetting(PASSWORD_MAX_AGE_DAYS_KEY, String(maxAgeDays));
      setMessage(t("admin.securitySaved"));
      await loadSettings();
      await loadSettingsHistory();
    } catch (saveError) {
      setError(saveError?.message || t("admin.securitySaveFailed"));
    }
  };

  const savePortfolioBenchmarkRate = async () => {
    setError("");
    setMessage("");

    const annualRatePct = Number.parseFloat(portfolioBenchmarkRatePct);

    if (Number.isNaN(annualRatePct) || annualRatePct < 0 || annualRatePct > 20) {
      setError(t("admin.benchmarkRange"));
      return;
    }

    try {
      await upsertSetting(PORTFOLIO_BENCHMARK_RATE_KEY, String(annualRatePct));
      setMessage(t("admin.benchmarkSaved"));
      await loadSettings();
      await loadSettingsHistory();
    } catch (saveError) {
      setError(saveError?.message || t("admin.benchmarkSaveFailed"));
    }
  };

  const saveQuoteRefreshMinutes = async () => {
    setError("");
    setMessage("");

    const minutes = Number.parseInt(quoteRefreshMinutes, 10);
    if (Number.isNaN(minutes) || minutes < 1 || minutes > 15) {
      setError(t("admin.intervalRange"));
      return;
    }

    try {
      await upsertSetting(QUOTE_REFRESH_MINUTES_KEY, String(minutes));
      localStorage.setItem(QUOTE_REFRESH_MINUTES_KEY, String(minutes));
      setMessage(t("admin.quoteSaved"));
      await loadSettings();
      await loadSettingsHistory();
    } catch (saveError) {
      setError(saveError?.message || t("admin.quoteSaveFailed"));
    }
  };

  const addAlias = async () => {
    setError("");
    setMessage("");

    const base = aliasBase.trim().toUpperCase();
    const target = aliasTarget.trim().toUpperCase();

    if (!base || !target) {
      setError(t("admin.aliasNeedBoth"));
      return;
    }

    try {
      await upsertSetting(`${ALIAS_PREFIX}${base}`, target);
      setAliasBase("");
      setAliasTarget("");
      setMessage(t("admin.aliasSaved", { base, target }));
      await loadSettings();
      await loadSettingsHistory();
    } catch (aliasError) {
      setError(aliasError?.message || t("admin.aliasSaveFailed"));
    }
  };

  const removeAlias = async (base) => {
    setError("");
    setMessage("");

    try {
      await deleteSetting(`${ALIAS_PREFIX}${base}`);
      setMessage(t("admin.aliasDeleted", { base }));
      await loadSettings();
      await loadSettingsHistory();
    } catch (aliasError) {
      setError(aliasError?.message || t("admin.aliasDeleteFailed"));
    }
  };

  const getAuditCategoryColor = (category) => {
    if (category === "AUTH") return "info";
    if (category === "ADMIN") return "warning";
    return "default";
  };

  const formatAuditDetails = (details) => {
    if (details === null || details === undefined || details === "") {
      return t("common.dash");
    }
    return details;
  };

  const formatHistoryValue = (value) => {
    if (value === null || value === undefined || value === "") {
      return t("common.dash");
    }
    return value;
  };

  const unlockAccount = async (userId) => {
    setError("");
    setMessage("");
    try {
      await apiDelete(`/api/admin/security/locks/${encodeURIComponent(userId)}`, {
        fallbackMessage: t("admin.unlockFailed")
      });

      setMessage(t("admin.unlocked"));
      await Promise.all([loadUsers(), loadSecurityOverview(), loadAuditLog(0)]);
    } catch (unlockError) {
      setError(unlockError?.message || t("admin.unlockFailed"));
    }
  };

  const toggleAdminRole = async (user) => {
    setError("");
    setMessage("");

    const roles = Array.isArray(user?.roles) ? user.roles : [];
    const isAdmin = roles.includes("ADMIN");
    const method = isAdmin ? "DELETE" : "PUT";

    try {
      await apiRequest(`/api/admin/users/${encodeURIComponent(user.id)}/roles/admin`, {
        method,
        fallbackMessage: t("admin.roleFailed")
      });

      setMessage(isAdmin
        ? t("admin.roleRevoked", { role: "ADMIN", username: user.username })
        : t("admin.roleGranted", { role: "ADMIN", username: user.username }));

      await loadUsers();
    } catch (roleError) {
      setError(roleError?.message || t("admin.roleFailed"));
    }
  };

  const toggleReadonlyAdminRole = async (user) => {
    setError("");
    setMessage("");

    const roles = Array.isArray(user?.roles) ? user.roles : [];
    const isReadonlyAdmin = roles.includes("READONLY_ADMIN");
    const method = isReadonlyAdmin ? "DELETE" : "PUT";

    try {
      await apiRequest(`/api/admin/users/${encodeURIComponent(user.id)}/roles/readonly-admin`, {
        method,
        fallbackMessage: t("admin.roleFailed")
      });

      setMessage(isReadonlyAdmin
        ? t("admin.roleRevoked", { role: "READONLY_ADMIN", username: user.username })
        : t("admin.roleGranted", { role: "READONLY_ADMIN", username: user.username }));

      await loadUsers();
    } catch (roleError) {
      setError(roleError?.message || t("admin.roleFailed"));
    }
  };

  const restoreOwnAdminRole = async () => {
    setError("");
    setMessage("");

    try {
      await apiPost("/api/admin/security/self/restore-admin", null, {
        fallbackMessage: t("admin.restoreFailed")
      });

      setMessage(t("admin.restoreOk"));
      await Promise.all([
        refreshCurrentUser ? refreshCurrentUser() : Promise.resolve(null),
        loadUsers(),
        loadSecurityOverview(),
        loadAuditLog(0)
      ]);
    } catch (restoreError) {
      setError(restoreError?.message || t("admin.restoreFailed"));
    }
  };

  const toggleAccountLock = async (user) => {
    setError("");
    setMessage("");

    const isLocked = !!user.lockedUntil && new Date(user.lockedUntil).getTime() > Date.now();
    const method = isLocked ? "DELETE" : "POST";

    try {
      await apiRequest(`/api/admin/security/locks/${encodeURIComponent(user.id)}`, {
        method,
        fallbackMessage: t("admin.accountUpdatedFailed")
      });

      setMessage(isLocked
        ? t("admin.userUnlocked", { username: user.username })
        : t("admin.userLocked", { username: user.username }));
      await Promise.all([loadUsers(), loadSecurityOverview(), loadAuditLog(0)]);
    } catch (lockError) {
      setError(lockError?.message || t("admin.accountUpdatedFailed"));
    }
  };

  return (
    <Stack spacing={2}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" sx={{ mb: 1 }}>
          {t("admin.title")}
        </Typography>
        <Typography color="text.secondary">
          {t("admin.subtitle")}
        </Typography>
      </Paper>

      {loading && (
        <Paper sx={{ p: 2 }}>
          <Typography>{t("admin.loading")}</Typography>
        </Paper>
      )}

      {error && (
        <Alert severity="error" variant="filled">
          {error}
        </Alert>
      )}

      {message && (
        <Alert severity="success" variant="filled">
          {message}
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          {t("admin.sessionTitle")}
        </Typography>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          <TextField
            label={t("admin.autoLogout")}
            size="small"
            type="number"
            slotProps={{ htmlInput: { min: 5, max: 240, step: 1 } }}
            value={inactivityTimeoutMinutes}
            onChange={(event) => setInactivityTimeoutMinutes(event.target.value)}
            sx={{ width: 220 }}
            disabled={!canWriteAdmin}
          />
          <TextField
            label={t("admin.warningFrom")}
            size="small"
            type="number"
            slotProps={{ htmlInput: { min: 1, max: 239, step: 1 } }}
            value={inactivityWarningMinutes}
            onChange={(event) => setInactivityWarningMinutes(event.target.value)}
            sx={{ width: 220 }}
            disabled={!canWriteAdmin}
          />
          <Button variant="contained" onClick={saveInactivitySettings} disabled={!canWriteAdmin}>
            {t("common.save")}
          </Button>
        </Stack>
        {!canWriteAdmin && (
          <Typography variant="body2" color="warning.main" sx={{ mt: 1 }}>
            {t("admin.readonlyHint")}
          </Typography>
        )}
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          {t("admin.loginGuard")}
        </Typography>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          <TextField
            label={t("admin.maxFails")}
            size="small"
            type="number"
            slotProps={{ htmlInput: { min: 3, max: 20, step: 1 } }}
            value={maxFailedAttempts}
            onChange={(event) => setMaxFailedAttempts(event.target.value)}
            sx={{ width: 220 }}
            disabled={!canWriteAdmin}
          />
          <TextField
            label={t("admin.lockMinutes")}
            size="small"
            type="number"
            slotProps={{ htmlInput: { min: 5, max: 1440, step: 1 } }}
            value={lockDurationMinutes}
            onChange={(event) => setLockDurationMinutes(event.target.value)}
            sx={{ width: 220 }}
            disabled={!canWriteAdmin}
          />
          <TextField
            label={t("admin.passwordAge")}
            size="small"
            type="number"
            slotProps={{ htmlInput: { min: 0, max: 730, step: 1 } }}
            value={passwordMaxAgeDays}
            onChange={(event) => setPasswordMaxAgeDays(event.target.value)}
            sx={{ width: 240 }}
            helperText={t("admin.passwordAgeHelp")}
            disabled={!canWriteAdmin}
          />
          <Button variant="contained" onClick={saveSecurityThresholds} disabled={!canWriteAdmin}>
            {t("common.save")}
          </Button>
        </Stack>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          {t("admin.benchmarkTitle")}
        </Typography>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          <TextField
            label={t("admin.benchmarkRate")}
            size="small"
            type="number"
            slotProps={{ htmlInput: { min: 0, max: 20, step: 0.01 } }}
            value={portfolioBenchmarkRatePct}
            onChange={(event) => setPortfolioBenchmarkRatePct(event.target.value)}
            sx={{ width: 240 }}
            helperText={t("admin.benchmarkHelp")}
            disabled={!canWriteAdmin}
          />
          <Button variant="contained" onClick={savePortfolioBenchmarkRate} disabled={!canWriteAdmin}>
            {t("common.save")}
          </Button>
        </Stack>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          {t("admin.quoteTitle")}
        </Typography>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          <TextField
            label={t("admin.interval")}
            size="small"
            type="number"
            slotProps={{ htmlInput: { min: 1, max: 15, step: 1 } }}
            value={quoteRefreshMinutes}
            onChange={(event) => setQuoteRefreshMinutes(event.target.value)}
            sx={{ width: 220 }}
            helperText={t("admin.intervalHelp")}
            disabled={!canWriteAdmin}
          />
          <Button variant="contained" onClick={saveQuoteRefreshMinutes} disabled={!canWriteAdmin}>
            {t("common.save")}
          </Button>
        </Stack>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          {t("admin.fallbackTitle")}
        </Typography>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          <Chip
            label={fallbackEnabled === "true" ? t("admin.fallbackOn") : t("admin.fallbackOff")}
            color={fallbackEnabled === "true" ? "success" : "warning"}
            size="small"
          />
          <TextField
            select
            label={t("admin.fallbackTitle")}
            size="small"
            value={fallbackEnabled}
            onChange={(event) => setFallbackEnabled(event.target.value)}
            sx={{ minWidth: 220 }}
            disabled={!canWriteAdmin}
          >
            <MenuItem value="true">{t("admin.fallbackEnabled")}</MenuItem>
            <MenuItem value="false">{t("admin.fallbackDisabled")}</MenuItem>
          </TextField>
          <Button variant="contained" onClick={saveFallbackSetting} disabled={!canWriteAdmin}>
            {t("common.save")}
          </Button>
        </Stack>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          {t("admin.aliasTitle")}
        </Typography>

        <Stack direction="row" spacing={2} sx={{ mb: 2 }} flexWrap="wrap">
          <TextField
            label={t("admin.aliasBase")}
            size="small"
            value={aliasBase}
            onChange={(event) => setAliasBase(event.target.value)}
            disabled={!canWriteAdmin}
          />
          <TextField
            label={t("admin.aliasTarget")}
            size="small"
            value={aliasTarget}
            onChange={(event) => setAliasTarget(event.target.value)}
            disabled={!canWriteAdmin}
          />
          <Button variant="contained" onClick={addAlias} disabled={!canWriteAdmin}>
            {t("admin.aliasSave")}
          </Button>
        </Stack>

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t("admin.aliasBaseCol")}</TableCell>
              <TableCell>{t("admin.aliasTargetCol")}</TableCell>
              <TableCell align="right">{t("common.action")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {aliases.map((alias) => (
              <TableRow key={alias.base}>
                <TableCell>{alias.base}</TableCell>
                <TableCell>{alias.target}</TableCell>
                <TableCell align="right">
                  <Button color="error" size="small" onClick={() => removeAlias(alias.base)} disabled={!canWriteAdmin}>
                    {t("admin.delete")}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {aliases.length === 0 && (
              <TableRow>
                <TableCell colSpan={3}>
                  <Typography color="text.secondary">{t("admin.aliasEmpty")}</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ flex: 1 }}>
            {t("admin.securityPanel")}
          </Typography>
          {!canWriteAdmin && (
            <Button size="small" variant="contained" color="warning" onClick={restoreOwnAdminRole}>
              {t("admin.restoreRights")}
            </Button>
          )}
          <Button size="small" variant="outlined" onClick={loadSecurityOverview}>
            {t("common.refresh")}
          </Button>
        </Stack>

        <Stack direction="row" spacing={2} sx={{ mb: 2 }} flexWrap="wrap">
          <Chip
            color="error"
            label={t("admin.fails24h", { count: securityOverview?.failedLoginsLast24Hours ?? 0 })}
          />
          <Chip
            color="warning"
            label={t("admin.fails7d", { count: securityOverview?.failedLoginsLast7Days ?? 0 })}
          />
          <Chip
            color="info"
            label={t("admin.lockedAccounts", { count: securityOverview?.lockedAccounts?.length ?? 0 })}
          />
        </Stack>

        {securityLoading && <Typography color="text.secondary">{t("admin.securityLoading")}</Typography>}

        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          {t("admin.lockedTitle")}
        </Typography>
        <Table size="small" sx={{ mb: 3 }}>
          <TableHead>
            <TableRow>
              <TableCell>{t("admin.user")}</TableCell>
              <TableCell>{t("admin.email")}</TableCell>
              <TableCell>{t("admin.failCount")}</TableCell>
              <TableCell>{t("admin.lockedUntil")}</TableCell>
              <TableCell align="right">{t("common.action")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(securityOverview?.lockedAccounts || []).map((entry) => (
              <TableRow key={entry.userId}>
                <TableCell>{entry.username}</TableCell>
                <TableCell>{entry.email}</TableCell>
                <TableCell>{entry.failedLoginAttempts}</TableCell>
                <TableCell>{formatDateTime(entry.lockedUntil)}</TableCell>
                <TableCell align="right">
                  <Button size="small" color="warning" disabled={!canWriteAdmin} onClick={() => unlockAccount(entry.userId)}>
                    {t("admin.unlock")}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {!securityLoading && (securityOverview?.lockedAccounts?.length ?? 0) === 0 && (
              <TableRow>
                <TableCell colSpan={5}>
                  <Typography color="text.secondary">{t("admin.noLocked")}</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          {t("admin.unusual")}
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t("admin.timestamp")}</TableCell>
              <TableCell>{t("admin.user")}</TableCell>
              <TableCell>{t("admin.event")}</TableCell>
              <TableCell>{t("admin.details")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(securityOverview?.unusualActivities || []).map((entry) => (
              <TableRow key={entry.id}>
                <TableCell sx={{ whiteSpace: "nowrap" }}>{formatDateTime(entry.timestamp)}</TableCell>
                <TableCell>{entry.username}</TableCell>
                <TableCell>{entry.action}</TableCell>
                <TableCell sx={{ color: "text.secondary", fontFamily: "monospace", fontSize: "0.78rem" }}>
                  {formatAuditDetails(entry.details)}
                </TableCell>
              </TableRow>
            ))}
            {!securityLoading && (securityOverview?.unusualActivities?.length ?? 0) === 0 && (
              <TableRow>
                <TableCell colSpan={4}>
                  <Typography color="text.secondary">{t("admin.noUnusual")}</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          {t("admin.usersTitle")}
        </Typography>

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t("admin.user")}</TableCell>
              <TableCell>{t("admin.email")}</TableCell>
              <TableCell>{t("admin.verified")}</TableCell>
              <TableCell>{t("admin.roles")}</TableCell>
              <TableCell>{t("admin.security")}</TableCell>
              <TableCell align="right">{t("common.action")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => {
              const roles = Array.isArray(user.roles) ? user.roles : [];
              const isAdmin = roles.includes("ADMIN");
              const isLocked = !!user.lockedUntil && new Date(user.lockedUntil).getTime() > Date.now();
              return (
                <TableRow key={user.id}>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.emailVerified ? t("common.yes") : t("common.no")}</TableCell>
                  <TableCell>{roles.join(", ") || t("common.dash")}</TableCell>
                  <TableCell>
                    {isLocked ? t("admin.lockedUntilAt", { time: formatDateTime(user.lockedUntil) }) : t("common.ok")}
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      variant={isAdmin ? "outlined" : "contained"}
                      color={isAdmin ? "warning" : "primary"}
                      disabled={!canWriteAdmin}
                      onClick={() => toggleAdminRole(user)}
                    >
                      {isAdmin ? t("admin.revokeAdmin") : t("admin.grantAdmin")}
                    </Button>
                    <Button
                      size="small"
                      variant={roles.includes("READONLY_ADMIN") ? "outlined" : "contained"}
                      color={roles.includes("READONLY_ADMIN") ? "warning" : "secondary"}
                      disabled={!canWriteAdmin}
                      onClick={() => toggleReadonlyAdminRole(user)}
                      sx={{ ml: 1 }}
                    >
                      {roles.includes("READONLY_ADMIN") ? t("admin.revokeReadonly") : t("admin.grantReadonly")}
                    </Button>
                    <Button
                      size="small"
                      variant={isLocked ? "outlined" : "contained"}
                      color={isLocked ? "success" : "error"}
                      disabled={!canWriteAdmin}
                      onClick={() => toggleAccountLock(user)}
                      sx={{ ml: 1 }}
                    >
                      {isLocked ? t("admin.unlock") : t("admin.lock")}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {!userLoading && users.length === 0 && (
              <TableRow>
                <TableCell colSpan={6}>
                  <Typography color="text.secondary">{t("admin.noUsers")}</Typography>
                </TableCell>
              </TableRow>
            )}
            {userLoading && (
              <TableRow>
                <TableCell colSpan={6}>
                  <Typography color="text.secondary">{t("admin.usersLoading")}</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ flex: 1 }}>
            {t("admin.historyTitle")}
          </Typography>
          <Button size="small" variant="outlined" onClick={loadSettingsHistory}>
            {t("common.refresh")}
          </Button>
        </Stack>

        {historyLoading && <Typography color="text.secondary">{t("admin.historyLoading")}</Typography>}

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t("admin.timestamp")}</TableCell>
              <TableCell>{t("admin.user")}</TableCell>
              <TableCell>{t("admin.key")}</TableCell>
              <TableCell>{t("admin.type")}</TableCell>
              <TableCell>{t("admin.old")}</TableCell>
              <TableCell>{t("admin.neu")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {settingsHistory.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell sx={{ whiteSpace: "nowrap" }}>{formatDateTime(entry.changedAt)}</TableCell>
                <TableCell>{entry.changedBy}</TableCell>
                <TableCell sx={{ fontFamily: "monospace" }}>{entry.settingKey}</TableCell>
                <TableCell>{entry.changeType}</TableCell>
                <TableCell sx={{ fontFamily: "monospace", color: "text.secondary" }}>{formatHistoryValue(entry.oldValue)}</TableCell>
                <TableCell sx={{ fontFamily: "monospace" }}>{formatHistoryValue(entry.newValue)}</TableCell>
              </TableRow>
            ))}
            {!historyLoading && settingsHistory.length === 0 && (
              <TableRow>
                <TableCell colSpan={6}>
                  <Typography color="text.secondary">{t("admin.noHistory")}</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          {t("admin.rawTitle")}
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t("admin.key")}</TableCell>
              <TableCell>{t("admin.value")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {settings.map((entry) => (
              <TableRow key={entry.key}>
                <TableCell>{entry.key}</TableCell>
                <TableCell sx={{ fontFamily: "monospace" }}>{entry.value}</TableCell>
              </TableRow>
            ))}
            {!loading && settings.length === 0 && (
              <TableRow>
                <TableCell colSpan={2}>
                  <Typography color="text.secondary">{t("admin.noSettings")}</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary">
          {t("admin.refreshHint")}
        </Typography>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ flex: 1 }}>
            {t("admin.auditTitle")}
          </Typography>
          <Button size="small" variant="outlined" onClick={exportAuditCsv}>
            {t("admin.csvExport")}
          </Button>
          <Button size="small" variant="contained" onClick={() => loadAuditLog(0)}>
            {t("admin.applyFilter")}
          </Button>
          <Button size="small" variant="outlined" onClick={() => loadAuditLog(auditPage)}>
            {t("common.refresh")}
          </Button>
        </Stack>

        <Stack direction="row" spacing={2} sx={{ mb: 2 }} flexWrap="wrap">
          <TextField
            label={t("admin.user")}
            size="small"
            value={auditUsername}
            onChange={(event) => setAuditUsername(event.target.value)}
          />
          <TextField
            select
            label={t("admin.category")}
            size="small"
            value={auditCategory}
            onChange={(event) => setAuditCategory(event.target.value)}
            sx={{ minWidth: 170 }}
          >
            <MenuItem value="">{t("common.all")}</MenuItem>
            <MenuItem value="AUTH">{t("admin.catAuth")}</MenuItem>
            <MenuItem value="ADMIN">{t("admin.catAdmin")}</MenuItem>
            <MenuItem value="PORTFOLIO">{t("admin.catPortfolio")}</MenuItem>
          </TextField>
          <TextField
            label={t("admin.fromDate")}
            size="small"
            type="date"
            value={auditFromDate}
            onChange={(event) => setAuditFromDate(event.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            label={t("admin.toDate")}
            size="small"
            type="date"
            value={auditToDate}
            onChange={(event) => setAuditToDate(event.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <Button
            size="small"
            color="secondary"
            variant="text"
            onClick={() => {
              const cleared = {
                auditCategory: "",
                auditUsername: "",
                auditFromDate: "",
                auditToDate: ""
              };
              setAuditCategory(cleared.auditCategory);
              setAuditUsername(cleared.auditUsername);
              setAuditFromDate(cleared.auditFromDate);
              setAuditToDate(cleared.auditToDate);
              loadAuditLog(0, cleared);
            }}
          >
            {t("common.reset")}
          </Button>
          <Button
            size="small"
            variant="text"
            onClick={() => applyAuditPreset(1)}
          >
            {t("common.today")}
          </Button>
          <Button
            size="small"
            variant="text"
            onClick={() => applyAuditPreset(7)}
          >
            {t("common.days7")}
          </Button>
          <Button
            size="small"
            variant="text"
            onClick={() => applyAuditPreset(30)}
          >
            {t("common.days30")}
          </Button>
        </Stack>

        {auditLoading && <Typography color="text.secondary">{t("admin.auditLoading")}</Typography>}

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t("admin.timestamp")}</TableCell>
              <TableCell>{t("admin.user")}</TableCell>
              <TableCell>{t("admin.category")}</TableCell>
              <TableCell>{t("common.action")}</TableCell>
              <TableCell>{t("admin.details")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {auditLog.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell sx={{ whiteSpace: "nowrap" }}>
                  {formatDateTime(entry.timestamp)}
                </TableCell>
                <TableCell>{entry.username}</TableCell>
                <TableCell>
                  <Chip label={entry.category} size="small"
                    color={getAuditCategoryColor(entry.category)}
                  />
                </TableCell>
                <TableCell>{entry.action}</TableCell>
                <TableCell sx={{ color: "text.secondary", fontFamily: "monospace", fontSize: "0.78rem" }}>
                  {formatAuditDetails(entry.details)}
                </TableCell>
              </TableRow>
            ))}
            {!auditLoading && auditLog.length === 0 && (
              <TableRow>
                <TableCell colSpan={5}>
                  <Typography color="text.secondary">{t("admin.noEntries")}</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {auditTotalPages > 1 && (
          <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 1 }}>
            <Button size="small" disabled={auditPage === 0} onClick={() => loadAuditLog(auditPage - 1)}>
              {t("common.back")}
            </Button>
            <Typography variant="body2" sx={{ alignSelf: "center" }}>
              {t("admin.page", { current: auditPage + 1, total: auditTotalPages })}
            </Typography>
            <Button size="small" disabled={auditPage >= auditTotalPages - 1} onClick={() => loadAuditLog(auditPage + 1)}>
              {t("common.next")}
            </Button>
          </Stack>
        )}
      </Paper>
    </Stack>
  );
}
