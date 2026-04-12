import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Chip,
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

export default function AdminSettings() {
  const [settings, setSettings] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLoading, setUserLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [fallbackEnabled, setFallbackEnabled] = useState("true");
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

  useEffect(() => {
    loadSettings();
    loadUsers();
  }, []);

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
    } catch (saveError) {
      setError(saveError?.message || "Fallback-Einstellung konnte nicht gespeichert werden.");
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
    } catch (aliasError) {
      setError(aliasError?.message || "Alias konnte nicht geloescht werden.");
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
            SelectProps={{ native: true }}
            label="Fallback Preise"
            size="small"
            value={fallbackEnabled}
            onChange={(event) => setFallbackEnabled(event.target.value)}
            sx={{ minWidth: 220 }}
          >
            <option value="true">Aktiviert (empfohlen)</option>
            <option value="false">Deaktiviert (strict live)</option>
          </TextField>
          <Button variant="contained" onClick={saveFallbackSetting}>
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
          />
          <TextField
            label="Zielsymbol (z.B. SXR8)"
            size="small"
            value={aliasTarget}
            onChange={(event) => setAliasTarget(event.target.value)}
          />
          <Button variant="contained" onClick={addAlias}>
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
                  <Button color="error" size="small" onClick={() => removeAlias(alias.base)}>
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
              <TableCell align="right">Aktion</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => {
              const roles = Array.isArray(user.roles) ? user.roles : [];
              const isAdmin = roles.includes("ADMIN");
              return (
                <TableRow key={user.id}>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.emailVerified ? "Ja" : "Nein"}</TableCell>
                  <TableCell>{roles.join(", ") || "-"}</TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      variant={isAdmin ? "outlined" : "contained"}
                      color={isAdmin ? "warning" : "primary"}
                      onClick={() => toggleAdminRole(user)}
                    >
                      {isAdmin ? "Admin entziehen" : "Admin geben"}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {!userLoading && users.length === 0 && (
              <TableRow>
                <TableCell colSpan={5}>
                  <Typography color="text.secondary">Keine Benutzer gefunden.</Typography>
                </TableCell>
              </TableRow>
            )}
            {userLoading && (
              <TableRow>
                <TableCell colSpan={5}>
                  <Typography color="text.secondary">Benutzer werden geladen...</Typography>
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
    </Stack>
  );
}
