import { useEffect, useState } from "react";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import { Alert, Box, Button, CircularProgress, Paper, Typography } from "@mui/material";
import { apiGet } from "./apiClient";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("E-Mail-Adresse wird bestaetigt...");

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      setStatus("error");
      setMessage("Der Verifizierungslink ist unvollstaendig.");
      return;
    }

    const verify = async () => {
      try {
        const payload = await apiGet(`/auth/verify-email?token=${encodeURIComponent(token)}`, {
          fallbackMessage: "Die E-Mail konnte nicht bestaetigt werden."
        });

        setStatus("success");
        setMessage(payload?.message || "E-Mail-Adresse erfolgreich bestaetigt.");
      } catch (error) {
        console.error("Email verification failed", error);
        setStatus("error");
        setMessage(error.message || "Server nicht erreichbar.");
      }
    };

    verify();
  }, [searchParams]);

  return (
    <Box sx={{ display: "flex", justifyContent: "center", mt: 10, px: 2 }}>
      <Paper sx={{ p: 4, width: 480, maxWidth: "100%" }}>
        <Typography variant="h5" sx={{ mb: 3, textAlign: "center" }}>
          E-Mail bestaetigen
        </Typography>

        {status === "loading" ? (
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <CircularProgress />
            <Typography>{message}</Typography>
          </Box>
        ) : (
          <Alert severity={status === "success" ? "success" : "error"} sx={{ mb: 3 }}>
            {message}
          </Alert>
        )}

        <Button component={RouterLink} to="/login" variant="contained" fullWidth>
          Zurueck zum Login
        </Button>
      </Paper>
    </Box>
  );
}