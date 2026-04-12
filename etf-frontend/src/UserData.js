import { useEffect, useMemo, useState } from "react";
import { Alert, Chip, Paper, Stack, Typography } from "@mui/material";
import { API_BASE } from "./apiBase";

export default function UserData() {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

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
    </Stack>
  );
}