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
import { API_BASE } from "./apiBase";

const FALLBACK_KEY = "market.fallbackPricesEnabled";
const ALIAS_PREFIX = "market.alias.";
const INACTIVITY_TIMEOUT_KEY = "app.session.inactivityTimeoutMinutes";
const INACTIVITY_WARNING_KEY = "app.session.inactivityWarningMinutes";
const MAX_FAILED_ATTEMPTS_KEY = "app.security.maxFailedLoginAttempts";
const LOCK_DURATION_MINUTES_KEY = "app.security.lockDurationMinutes";

export default function AdminSettings() {
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
  const [canWriteAdmin, setCanWriteAdmin] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [fallbackEnabled, setFallbackEnabled] = useState("true");
  const [inactivityTimeoutMinutes, setInactivityTimeoutMinutes] = useState("30");
  const [inactivityWarningMinutes, setInactivityWarningMinutes] = useState("28");
  const [maxFailedAttempts, setMaxFailedAttempts] = useState("5");
  const [lockDurationMinutes, setLockDurationMinutes] = useState("30");
  const [aliasBase, setAliasBase] = useState("");
  const [aliasTarget, setAliasTarget] = useState("");

  const loadSettings = async () => {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${API_BASE}/api/admin/settings`, {
        method: "GET",
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error(`Settings konnten nicht geladen werden (${response.status})`);
      }

      const data = await response.json();
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
    } catch (loadError) {
      setError(loadError?.message || "Settings konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    setUserLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/admin/users`, {
        method: "GET",
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error(`Benutzer konnten nicht geladen werden (${response.status})`);
      }

      const data = await response.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (loadError) {
      setError(loadError?.message || "Benutzer konnten nicht geladen werden.");
    } finally {
      setUserLoading(false);
    }
  };

  const loadSecurityOverview = async () => {
    setSecurityLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/admin/security/overview`, {
        method: "GET",
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error(`Sicherheitsdaten konnten nicht geladen werden (${response.status})`);
      }

      const data = await response.json();
      setSecurityOverview(data);
    } catch (loadError) {
      setError(loadError?.message || "Sicherheitsdaten konnten nicht geladen werden.");
    } finally {
      setSecurityLoading(false);
    }
  };

  const loadSettingsHistory = async () => {
    setHistoryLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/admin/settings/history`, {
        method: "GET",
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error(`Setting-Historie konnte nicht geladen werden (${response.status})`);
      }

      const data = await response.json();
      setSettingsHistory(Array.isArray(data) ? data : []);
    } catch (loadError) {
      setError(loadError?.message || "Setting-Historie konnte nicht geladen werden.");
    } finally {
      setHistoryLoading(false);
    }
  };

  const loadCurrentUserPermissions = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/me`, {
        method: "GET",
        credentials: "include"
      });

      if (!response.ok) {
        setCanWriteAdmin(false);
        return;
      }

      const data = await response.json();
      const roles = Array.isArray(data?.roles)
        ? data.roles.map((role) => String(role).toUpperCase())
        : [];
      setCanWriteAdmin(roles.includes("ADMIN"));
    } catch {
      setCanWriteAdmin(false);
    }
  };

  useEffect(() => {
    loadCurrentUserPermissions();
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

      const response = await fetch(`${API_BASE}/api/admin/audit-log?${params.toString()}`, {
        method: "GET",
        credentials: "include"
      });
      if (!response.ok) throw new Error(`Audit-Log konnte nicht geladen werden (${response.status})`);
      const data = await response.json();
      setAuditLog(Array.isArray(data.content) ? data.content : []);
      setAuditTotalPages(data.totalPages ?? 0);
      setAuditPage(data.page ?? 0);
    } catch (err) {
      setError(err?.message || "Audit-Log konnte nicht geladen werden.");
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

      const response = await fetch(`${API_BASE}/api/admin/audit-log/export?${params.toString()}`, {
        method: "GET",
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error(`CSV-Export fehlgeschlagen (${response.status})`);
      }

      const csvText = await response.text();
      const blob = new Blob([csvText], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "audit-log.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setMessage("Audit-Log als CSV exportiert.");
    } catch (exportError) {
      setError(exportError?.message || "CSV-Export fehlgeschlagen.");
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
    const response = await fetch(`${API_BASE}/api/admin/settings`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value })
    });

    if (!response.ok) {
      throw new Error(`Setting ${key} konnte nicht gespeichert werden.`);
    }
  };

  const deleteSetting = async (key) => {
    const response = await fetch(`${API_BASE}/api/admin/settings/${encodeURIComponent(key)}`, {
      method: "DELETE",
      credentials: "include"
    });

    if (!response.ok && response.status !== 204) {
      throw new Error(`Setting ${key} konnte nicht geloescht werden.`);
    }
  };

  const saveFallbackSetting = async () => {
    setError("");
    setMessage("");

    try {
      await upsertSetting(FALLBACK_KEY, fallbackEnabled);
      setMessage("Fallback-Einstellung gespeichert.");
      await loadSettings();
      await loadSettingsHistory();
    } catch (saveError) {
      setError(saveError?.message || "Fallback-Einstellung konnte nicht gespeichert werden.");
    }
  };

  const saveInactivitySettings = async () => {
    setError("");
    setMessage("");

    const timeout = Number.parseInt(inactivityTimeoutMinutes, 10);
    const warning = Number.parseInt(inactivityWarningMinutes, 10);

    if (Number.isNaN(timeout) || timeout < 5 || timeout > 240) {
      setError("Timeout muss zwischen 5 und 240 Minuten liegen.");
      return;
    }

    if (Number.isNaN(warning) || warning < 1 || warning >= timeout) {
      setError("Warnung muss mindestens 1 Minute sein und kleiner als Timeout.");
      return;
    }

    try {
      await upsertSetting(INACTIVITY_TIMEOUT_KEY, String(timeout));
      await upsertSetting(INACTIVITY_WARNING_KEY, String(warning));
      setMessage("Inaktivitaets-Timer gespeichert.");
      await loadSettings();
      await loadSettingsHistory();
    } catch (saveError) {
      setError(saveError?.message || "Inaktivitaets-Timer konnte nicht gespeichert werden.");
    }
  };

  const saveSecurityThresholds = async () => {
    setError("");
    setMessage("");

    const attempts = Number.parseInt(maxFailedAttempts, 10);
    const lockMinutes = Number.parseInt(lockDurationMinutes, 10);

    if (Number.isNaN(attempts) || attempts < 3 || attempts > 20) {
      setError("Maximale Fehlversuche muessen zwischen 3 und 20 liegen.");
      return;
    }

    if (Number.isNaN(lockMinutes) || lockMinutes < 5 || lockMinutes > 1440) {
      setError("Sperrdauer muss zwischen 5 und 1440 Minuten liegen.");
      return;
    }

    try {
      await upsertSetting(MAX_FAILED_ATTEMPTS_KEY, String(attempts));
      await upsertSetting(LOCK_DURATION_MINUTES_KEY, String(lockMinutes));
      setMessage("Sicherheits-Schwellwerte gespeichert.");
      await loadSettings();
      await loadSettingsHistory();
    } catch (saveError) {
      setError(saveError?.message || "Sicherheits-Schwellwerte konnten nicht gespeichert werden.");
    }
  };

  const addAlias = async () => {
    setError("");
    setMessage("");

    const base = aliasBase.trim().toUpperCase();
    const target = aliasTarget.trim().toUpperCase();

    if (!base || !target) {
      setError("Bitte Alias-Basis und Zielsymbol eingeben.");
      return;
    }

    try {
      await upsertSetting(`${ALIAS_PREFIX}${base}`, target);
      setAliasBase("");
      setAliasTarget("");
      setMessage(`Alias ${base} -> ${target} gespeichert.`);
      await loadSettings();
      await loadSettingsHistory();
    } catch (aliasError) {
      setError(aliasError?.message || "Alias konnte nicht gespeichert werden.");
    }
  };

  const removeAlias = async (base) => {
    setError("");
    setMessage("");

    try {
      await deleteSetting(`${ALIAS_PREFIX}${base}`);
      setMessage(`Alias ${base} geloescht.`);
      await loadSettings();
      await loadSettingsHistory();
    } catch (aliasError) {
      setError(aliasError?.message || "Alias konnte nicht geloescht werden.");
    }
  };

  const getAuditCategoryColor = (category) => {
    if (category === "AUTH") return "info";
    if (category === "ADMIN") return "warning";
    return "default";
  };

  const formatAuditDetails = (details) => {
    if (details === null || details === undefined || details === "") {
      return "-";
    }
    return details;
  };

  const formatHistoryValue = (value) => {
    if (value === null || value === undefined || value === "") {
      return "-";
    }
    return value;
  };

  const unlockAccount = async (userId) => {
    setError("");
    setMessage("");
    try {
      const response = await fetch(`${API_BASE}/api/admin/security/locks/${encodeURIComponent(userId)}`, {
        method: "DELETE",
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error(`Konto konnte nicht entsperrt werden (${response.status})`);
      }

      setMessage("Konto entsperrt.");
      await Promise.all([loadUsers(), loadSecurityOverview(), loadAuditLog(0)]);
    } catch (unlockError) {
      setError(unlockError?.message || "Konto konnte nicht entsperrt werden.");
    }
  };

  const toggleAdminRole = async (user) => {
    setError("");
    setMessage("");

    const roles = Array.isArray(user?.roles) ? user.roles : [];
    const isAdmin = roles.includes("ADMIN");
    const method = isAdmin ? "DELETE" : "PUT";

    try {
      const response = await fetch(`${API_BASE}/api/admin/users/${encodeURIComponent(user.id)}/roles/admin`, {
        method,
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error(`Rolle konnte nicht aktualisiert werden (${response.status})`);
      }

      setMessage(isAdmin
        ? `ADMIN-Rolle fuer ${user.username} entfernt.`
        : `ADMIN-Rolle fuer ${user.username} vergeben.`);

      await loadUsers();
    } catch (roleError) {
      setError(roleError?.message || "Rolle konnte nicht aktualisiert werden.");
    }
  };

  const toggleReadonlyAdminRole = async (user) => {
    setError("");
    setMessage("");

    const roles = Array.isArray(user?.roles) ? user.roles : [];
    const isReadonlyAdmin = roles.includes("READONLY_ADMIN");
    const method = isReadonlyAdmin ? "DELETE" : "PUT";

    try {
      const response = await fetch(`${API_BASE}/api/admin/users/${encodeURIComponent(user.id)}/roles/readonly-admin`, {
        method,
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error(`Rolle konnte nicht aktualisiert werden (${response.status})`);
      }

      setMessage(isReadonlyAdmin
        ? `READONLY_ADMIN-Rolle fuer ${user.username} entfernt.`
        : `READONLY_ADMIN-Rolle fuer ${user.username} vergeben.`);

      await loadUsers();
    } catch (roleError) {
      setError(roleError?.message || "Rolle konnte nicht aktualisiert werden.");
    }
  };

  const restoreOwnAdminRole = async () => {
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${API_BASE}/api/admin/security/self/restore-admin`, {
        method: "POST",
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error(`Admin-Rechte konnten nicht wiederhergestellt werden (${response.status})`);
      }

      setMessage("Admin-Rechte wiederhergestellt. Seite wird aktualisiert...");
      await Promise.all([loadCurrentUserPermissions(), loadUsers(), loadSecurityOverview(), loadAuditLog(0)]);
    } catch (restoreError) {
      setError(restoreError?.message || "Admin-Rechte konnten nicht wiederhergestellt werden.");
    }
  };

  const toggleAccountLock = async (user) => {
    setError("");
    setMessage("");

    const isLocked = !!user.lockedUntil && new Date(user.lockedUntil).getTime() > Date.now();
    const method = isLocked ? "DELETE" : "POST";

    try {
      const response = await fetch(`${API_BASE}/api/admin/security/locks/${encodeURIComponent(user.id)}`, {
        method,
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error(`Konto konnte nicht aktualisiert werden (${response.status})`);
      }

      setMessage(isLocked
        ? `Konto von ${user.username} entsperrt.`
        : `Konto von ${user.username} gesperrt.`);
      await Promise.all([loadUsers(), loadSecurityOverview(), loadAuditLog(0)]);
    } catch (lockError) {
      setError(lockError?.message || "Konto konnte nicht aktualisiert werden.");
    }
  };

  return (
    <Stack spacing={2}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" sx={{ mb: 1 }}>
          Admin Einstellungen
        </Typography>
        <Typography color="text.secondary">
          Diese Tabelle speichert Laufzeit-Konfigurationen in der Datenbank (nicht in application.properties).
        </Typography>
      </Paper>

      {loading && (
        <Paper sx={{ p: 2 }}>
          <Typography>Settings werden geladen...</Typography>
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
          Session Timeout
        </Typography>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          <TextField
            label="Auto-Logout (Minuten)"
            size="small"
            type="number"
            slotProps={{ htmlInput: { min: 5, max: 240, step: 1 } }}
            value={inactivityTimeoutMinutes}
            onChange={(event) => setInactivityTimeoutMinutes(event.target.value)}
            sx={{ width: 220 }}
            disabled={!canWriteAdmin}
          />
          <TextField
            label="Warnung ab (Minuten)"
            size="small"
            type="number"
            slotProps={{ htmlInput: { min: 1, max: 239, step: 1 } }}
            value={inactivityWarningMinutes}
            onChange={(event) => setInactivityWarningMinutes(event.target.value)}
            sx={{ width: 220 }}
            disabled={!canWriteAdmin}
          />
          <Button variant="contained" onClick={saveInactivitySettings} disabled={!canWriteAdmin}>
            Speichern
          </Button>
        </Stack>
        {!canWriteAdmin && (
          <Typography variant="body2" color="warning.main" sx={{ mt: 1 }}>
            READONLY_ADMIN: Nur Ansicht, keine Aenderungen erlaubt.
          </Typography>
        )}
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Login-Schutz
        </Typography>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          <TextField
            label="Max. Fehlversuche"
            size="small"
            type="number"
            slotProps={{ htmlInput: { min: 3, max: 20, step: 1 } }}
            value={maxFailedAttempts}
            onChange={(event) => setMaxFailedAttempts(event.target.value)}
            sx={{ width: 220 }}
            disabled={!canWriteAdmin}
          />
          <TextField
            label="Sperrdauer (Minuten)"
            size="small"
            type="number"
            slotProps={{ htmlInput: { min: 5, max: 1440, step: 1 } }}
            value={lockDurationMinutes}
            onChange={(event) => setLockDurationMinutes(event.target.value)}
            sx={{ width: 220 }}
            disabled={!canWriteAdmin}
          />
          <Button variant="contained" onClick={saveSecurityThresholds} disabled={!canWriteAdmin}>
            Speichern
          </Button>
        </Stack>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Preis-Fallback
        </Typography>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          <Chip
            label={fallbackEnabled === "true" ? "Fallback aktiv" : "Fallback deaktiviert"}
            color={fallbackEnabled === "true" ? "success" : "warning"}
            size="small"
          />
          <TextField
            select
            label="Fallback Preise"
            size="small"
            value={fallbackEnabled}
            onChange={(event) => setFallbackEnabled(event.target.value)}
            sx={{ minWidth: 220 }}
            disabled={!canWriteAdmin}
          >
            <MenuItem value="true">Aktiviert (empfohlen)</MenuItem>
            <MenuItem value="false">Deaktiviert (strict live)</MenuItem>
          </TextField>
          <Button variant="contained" onClick={saveFallbackSetting} disabled={!canWriteAdmin}>
            Speichern
          </Button>
        </Stack>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Symbol Aliase
        </Typography>

        <Stack direction="row" spacing={2} sx={{ mb: 2 }} flexWrap="wrap">
          <TextField
            label="Basis (z.B. SXRS)"
            size="small"
            value={aliasBase}
            onChange={(event) => setAliasBase(event.target.value)}
            disabled={!canWriteAdmin}
          />
          <TextField
            label="Zielsymbol (z.B. SXR8)"
            size="small"
            value={aliasTarget}
            onChange={(event) => setAliasTarget(event.target.value)}
            disabled={!canWriteAdmin}
          />
          <Button variant="contained" onClick={addAlias} disabled={!canWriteAdmin}>
            Alias speichern
          </Button>
        </Stack>

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Basis</TableCell>
              <TableCell>Zielsymbol</TableCell>
              <TableCell align="right">Aktion</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {aliases.map((alias) => (
              <TableRow key={alias.base}>
                <TableCell>{alias.base}</TableCell>
                <TableCell>{alias.target}</TableCell>
                <TableCell align="right">
                  <Button color="error" size="small" onClick={() => removeAlias(alias.base)} disabled={!canWriteAdmin}>
                    Loeschen
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {aliases.length === 0 && (
              <TableRow>
                <TableCell colSpan={3}>
                  <Typography color="text.secondary">Keine Aliase hinterlegt.</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ flex: 1 }}>
            Sicherheits-Panel
          </Typography>
          {!canWriteAdmin && (
            <Button size="small" variant="contained" color="warning" onClick={restoreOwnAdminRole}>
              Admin-Rechte wiederherstellen
            </Button>
          )}
          <Button size="small" variant="outlined" onClick={loadSecurityOverview}>
            Aktualisieren
          </Button>
        </Stack>

        <Stack direction="row" spacing={2} sx={{ mb: 2 }} flexWrap="wrap">
          <Chip
            color="error"
            label={`Fehlgeschlagene Logins 24h: ${securityOverview?.failedLoginsLast24Hours ?? 0}`}
          />
          <Chip
            color="warning"
            label={`Fehlgeschlagene Logins 7 Tage: ${securityOverview?.failedLoginsLast7Days ?? 0}`}
          />
          <Chip
            color="info"
            label={`Gesperrte Accounts: ${securityOverview?.lockedAccounts?.length ?? 0}`}
          />
        </Stack>

        {securityLoading && <Typography color="text.secondary">Sicherheitsdaten werden geladen...</Typography>}

        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          Gesperrte Accounts
        </Typography>
        <Table size="small" sx={{ mb: 3 }}>
          <TableHead>
            <TableRow>
              <TableCell>Benutzer</TableCell>
              <TableCell>E-Mail</TableCell>
              <TableCell>Fehlversuche</TableCell>
              <TableCell>Gesperrt bis</TableCell>
              <TableCell align="right">Aktion</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(securityOverview?.lockedAccounts || []).map((entry) => (
              <TableRow key={entry.userId}>
                <TableCell>{entry.username}</TableCell>
                <TableCell>{entry.email}</TableCell>
                <TableCell>{entry.failedLoginAttempts}</TableCell>
                <TableCell>{entry.lockedUntil ? new Date(entry.lockedUntil).toLocaleString("de-DE") : "-"}</TableCell>
                <TableCell align="right">
                  <Button size="small" color="warning" disabled={!canWriteAdmin} onClick={() => unlockAccount(entry.userId)}>
                    Entsperren
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {!securityLoading && (securityOverview?.lockedAccounts?.length ?? 0) === 0 && (
              <TableRow>
                <TableCell colSpan={5}>
                  <Typography color="text.secondary">Keine gesperrten Accounts.</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          Auffällige Aktivität
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Zeitpunkt</TableCell>
              <TableCell>Benutzer</TableCell>
              <TableCell>Ereignis</TableCell>
              <TableCell>Details</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(securityOverview?.unusualActivities || []).map((entry) => (
              <TableRow key={entry.id}>
                <TableCell sx={{ whiteSpace: "nowrap" }}>{new Date(entry.timestamp).toLocaleString("de-DE")}</TableCell>
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
                  <Typography color="text.secondary">Keine auffälligen Ereignisse gefunden.</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Benutzerverwaltung
        </Typography>

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Benutzer</TableCell>
              <TableCell>E-Mail</TableCell>
              <TableCell>Verifiziert</TableCell>
              <TableCell>Rollen</TableCell>
              <TableCell>Security</TableCell>
              <TableCell align="right">Aktion</TableCell>
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
                  <TableCell>{user.emailVerified ? "Ja" : "Nein"}</TableCell>
                  <TableCell>{roles.join(", ") || "-"}</TableCell>
                  <TableCell>
                    {isLocked ? `Gesperrt bis ${new Date(user.lockedUntil).toLocaleString("de-DE")}` : "OK"}
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      variant={isAdmin ? "outlined" : "contained"}
                      color={isAdmin ? "warning" : "primary"}
                      disabled={!canWriteAdmin}
                      onClick={() => toggleAdminRole(user)}
                    >
                      {isAdmin ? "Admin entziehen" : "Admin geben"}
                    </Button>
                    <Button
                      size="small"
                      variant={roles.includes("READONLY_ADMIN") ? "outlined" : "contained"}
                      color={roles.includes("READONLY_ADMIN") ? "warning" : "secondary"}
                      disabled={!canWriteAdmin}
                      onClick={() => toggleReadonlyAdminRole(user)}
                      sx={{ ml: 1 }}
                    >
                      {roles.includes("READONLY_ADMIN") ? "Readonly entziehen" : "Readonly geben"}
                    </Button>
                    <Button
                      size="small"
                      variant={isLocked ? "outlined" : "contained"}
                      color={isLocked ? "success" : "error"}
                      disabled={!canWriteAdmin}
                      onClick={() => toggleAccountLock(user)}
                      sx={{ ml: 1 }}
                    >
                      {isLocked ? "Entsperren" : "Sperren"}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {!userLoading && users.length === 0 && (
              <TableRow>
                <TableCell colSpan={6}>
                  <Typography color="text.secondary">Keine Benutzer gefunden.</Typography>
                </TableCell>
              </TableRow>
            )}
            {userLoading && (
              <TableRow>
                <TableCell colSpan={6}>
                  <Typography color="text.secondary">Benutzer werden geladen...</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ flex: 1 }}>
            Konfigurations-Historie
          </Typography>
          <Button size="small" variant="outlined" onClick={loadSettingsHistory}>
            Aktualisieren
          </Button>
        </Stack>

        {historyLoading && <Typography color="text.secondary">Historie wird geladen...</Typography>}

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Zeitpunkt</TableCell>
              <TableCell>Benutzer</TableCell>
              <TableCell>Key</TableCell>
              <TableCell>Typ</TableCell>
              <TableCell>Alt</TableCell>
              <TableCell>Neu</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {settingsHistory.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell sx={{ whiteSpace: "nowrap" }}>{new Date(entry.changedAt).toLocaleString("de-DE")}</TableCell>
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
                  <Typography color="text.secondary">Noch keine Konfigurations-Historie vorhanden.</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Rohe Settings-Tabelle
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Key</TableCell>
              <TableCell>Value</TableCell>
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
                  <Typography color="text.secondary">Noch keine Einstellungen gespeichert.</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Hinweis: Aenderungen wirken nach dem naechsten Kurs-Refresh. Ein kompletter Deploy ist dafuer nicht noetig.
        </Typography>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ flex: 1 }}>
            Audit-Log
          </Typography>
          <Button size="small" variant="outlined" onClick={exportAuditCsv}>
            CSV Export
          </Button>
          <Button size="small" variant="contained" onClick={() => loadAuditLog(0)}>
            Filter anwenden
          </Button>
          <Button size="small" variant="outlined" onClick={() => loadAuditLog(auditPage)}>
            Aktualisieren
          </Button>
        </Stack>

        <Stack direction="row" spacing={2} sx={{ mb: 2 }} flexWrap="wrap">
          <TextField
            label="Benutzer"
            size="small"
            value={auditUsername}
            onChange={(event) => setAuditUsername(event.target.value)}
          />
          <TextField
            select
            label="Kategorie"
            size="small"
            value={auditCategory}
            onChange={(event) => setAuditCategory(event.target.value)}
            sx={{ minWidth: 170 }}
          >
            <MenuItem value="">Alle</MenuItem>
            <MenuItem value="AUTH">AUTH</MenuItem>
            <MenuItem value="ADMIN">ADMIN</MenuItem>
            <MenuItem value="PORTFOLIO">PORTFOLIO</MenuItem>
          </TextField>
          <TextField
            label="Von (Datum)"
            size="small"
            type="date"
            value={auditFromDate}
            onChange={(event) => setAuditFromDate(event.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            label="Bis (Datum)"
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
            Zurücksetzen
          </Button>
          <Button
            size="small"
            variant="text"
            onClick={() => applyAuditPreset(1)}
          >
            Heute
          </Button>
          <Button
            size="small"
            variant="text"
            onClick={() => applyAuditPreset(7)}
          >
            7 Tage
          </Button>
          <Button
            size="small"
            variant="text"
            onClick={() => applyAuditPreset(30)}
          >
            30 Tage
          </Button>
        </Stack>

        {auditLoading && <Typography color="text.secondary">Wird geladen...</Typography>}

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Zeitpunkt</TableCell>
              <TableCell>Benutzer</TableCell>
              <TableCell>Kategorie</TableCell>
              <TableCell>Aktion</TableCell>
              <TableCell>Details</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {auditLog.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell sx={{ whiteSpace: "nowrap" }}>
                  {new Date(entry.timestamp).toLocaleString("de-DE")}
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
                  <Typography color="text.secondary">Noch keine Einträge vorhanden.</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {auditTotalPages > 1 && (
          <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 1 }}>
            <Button size="small" disabled={auditPage === 0} onClick={() => loadAuditLog(auditPage - 1)}>
              Zurück
            </Button>
            <Typography variant="body2" sx={{ alignSelf: "center" }}>
              Seite {auditPage + 1} / {auditTotalPages}
            </Typography>
            <Button size="small" disabled={auditPage >= auditTotalPages - 1} onClick={() => loadAuditLog(auditPage + 1)}>
              Vor
            </Button>
          </Stack>
        )}
      </Paper>
    </Stack>
  );
}
