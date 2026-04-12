import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Chip, IconButton, InputAdornment, Paper, Stack, TextField, Typography } from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { API_BASE } from "./apiBase";

export default function UserData() {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Password change state
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  function validatePw(pw) {
    if (!pw || pw.length < 8) return "Mindestens 8 Zeichen";
    if (!/[A-Z]/.test(pw)) return "Mindestens ein Großbuchstabe";
    if (!/[a-z]/.test(pw)) return "Mindestens ein Kleinbuchstabe";
    if (!/\d/.test(pw)) return "Mindestens eine Zahl";
    if (!/[!@#$%^&*()\-_=+[\]{}|;':",.<>/?]/.test(pw)) return "Mindestens ein Sonderzeichen";
    return "";
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setPwError("");
    setPwSuccess("");

    const validationError = validatePw(pwNew);
    if (validationError) { setPwError(validationError); return; }
    if (pwNew !== pwConfirm) { setPwError("Neues Passwort und Bestätigung stimmen nicht überein"); return; }

    setPwLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/user/change-password`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: pwCurrent, newPassword: pwNew })
      });
      const data = await res.json();
      if (!res.ok) {
        setPwError(data.error || "Fehler beim Ändern des Passworts");
      } else {
        setPwSuccess("Passwort erfolgreich geändert");
        setPwCurrent(""); setPwNew(""); setPwConfirm("");
      }
    } catch {
      setPwError("Netzwerkfehler");
    } finally {
      setPwLoading(false);
    }
  }

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/me`, {
          method: "GET",
          credentials: "include"
        });

        if (!response.ok) {
          throw new Error("Profildaten konnten nicht geladen werden.");
        }

        const payload = await response.json();
        setProfile(payload);
      } catch (loadError) {
        setError(loadError?.message || "Profildaten konnten nicht geladen werden.");
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, []);

  const clientData = useMemo(() => {
    if (typeof window === "undefined") {
      return {
        sessionAuthenticated: "-",
        sessionUsername: "-",
        forceLoggedOut: "-"
      };
    }

    return {
      sessionAuthenticated: localStorage.getItem("sessionAuthenticated") || "(nicht gesetzt)",
      sessionUsername: localStorage.getItem("sessionUsername") || "(nicht gesetzt)",
      forceLoggedOut: localStorage.getItem("forceLoggedOut") || "(nicht gesetzt)"
    };
  }, []);

  if (isLoading) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography>Meine Daten werden geladen...</Typography>
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper sx={{ p: 3 }}>
        <Alert severity="error" variant="filled" sx={{ borderRadius: 2 }}>
          {error}
        </Alert>
      </Paper>
    );
  }

  return (
    <Stack spacing={2}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Im Backend gespeicherte Daten
        </Typography>

        <Stack spacing={1}>
          <Typography><strong>Benutzername:</strong> {profile?.username || "-"}</Typography>
          <Typography><strong>E-Mail:</strong> {profile?.email || "-"}</Typography>
          <Typography>
            <strong>E-Mail verifiziert:</strong>{" "}
            {profile?.emailVerified ? "Ja" : "Nein"}
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Typography component="span"><strong>Rollen:</strong></Typography>
            {(profile?.roles || []).map((role) => (
              <Chip key={role} label={role} size="small" />
            ))}
          </Stack>
        </Stack>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Im Browser lokal gespeicherte Daten
        </Typography>

        <Stack spacing={1}>
          <Typography><strong>sessionAuthenticated:</strong> {clientData.sessionAuthenticated}</Typography>
          <Typography><strong>sessionUsername:</strong> {clientData.sessionUsername}</Typography>
          <Typography><strong>forceLoggedOut:</strong> {clientData.forceLoggedOut}</Typography>
        </Stack>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Passwort ändern
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Mindestens 8 Zeichen · Groß- &amp; Kleinbuchstaben · Zahl · Sonderzeichen
        </Typography>

        {pwError && <Alert severity="error" sx={{ mb: 2 }}>{pwError}</Alert>}
        {pwSuccess && <Alert severity="success" sx={{ mb: 2 }}>{pwSuccess}</Alert>}

        <Box component="form" onSubmit={handleChangePassword}>
          <Stack spacing={2}>
            <TextField
              label="Aktuelles Passwort"
              type={showCurrent ? "text" : "password"}
              value={pwCurrent}
              onChange={e => setPwCurrent(e.target.value)}
              required
              size="small"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setShowCurrent(v => !v)} edge="end">
                      {showCurrent ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
            <TextField
              label="Neues Passwort"
              type={showNew ? "text" : "password"}
              value={pwNew}
              onChange={e => { setPwNew(e.target.value); setPwError(""); }}
              required
              size="small"
              helperText={pwNew && validatePw(pwNew) ? validatePw(pwNew) : ""}
              error={!!pwNew && !!validatePw(pwNew)}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setShowNew(v => !v)} edge="end">
                      {showNew ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
            <TextField
              label="Neues Passwort bestätigen"
              type={showConfirm ? "text" : "password"}
              value={pwConfirm}
              onChange={e => setPwConfirm(e.target.value)}
              required
              size="small"
              helperText={pwConfirm && pwNew !== pwConfirm ? "Passwörter stimmen nicht überein" : ""}
              error={!!pwConfirm && pwNew !== pwConfirm}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setShowConfirm(v => !v)} edge="end">
                      {showConfirm ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
            <Button
              type="submit"
              variant="contained"
              disabled={pwLoading || !!validatePw(pwNew) || pwNew !== pwConfirm || !pwCurrent}
              sx={{ alignSelf: "flex-start" }}
            >
              {pwLoading ? "Wird geändert…" : "Passwort ändern"}
            </Button>
          </Stack>
        </Box>
      </Paper>
    </Stack>
  );
}