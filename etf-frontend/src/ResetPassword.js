import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { TextField, Button, Box, Typography, Paper, CircularProgress, Alert } from "@mui/material";
import LegalFooter from "./LegalFooter";
import { API_BASE } from "./apiBase";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("error");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setMessage("Ungültiger Reset-Link");
      setMessageType("error");
    }
  }, [token]);

  const handleReset = async () => {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setMessage("");
    setMessageType("error");

    try {
      if (!newPassword || newPassword.length < 6) {
        setMessage("Passwort muss mindestens 6 Zeichen lang sein");
        return;
      }

      if (newPassword !== confirmPassword) {
        setMessage("Passwörter stimmen nicht überein");
        return;
      }

      const response = await fetch(`${API_BASE}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token, newPassword })
      });

      if (!response.ok) {
        const payload = await response.json();
        setMessage(payload.message || "Passwort-Reset fehlgeschlagen");
        return;
      }

      setMessageType("success");
      setMessage("Passwort erfolgreich zurückgesetzt. Du kannst dich jetzt anmelden.");

      // Nach 3 Sekunden zur Login-Seite weiterleiten
      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 3000);

    } catch (error) {
      setMessage("Netzwerkfehler. Bitte versuche es später erneut.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f5f5f5",
          p: 2,
        }}
      >
        <Paper elevation={3} sx={{ p: 4, maxWidth: 400, width: "100%" }}>
          <Typography variant="h5" component="h1" gutterBottom align="center">
            Passwort zurücksetzen
          </Typography>
          <Alert severity="error" sx={{ mb: 2 }}>
            Ungültiger Reset-Link
          </Alert>
          <Button
            fullWidth
            variant="outlined"
            onClick={() => navigate("/login")}
            sx={{ mt: 2 }}
          >
            Zur Anmeldung
          </Button>
        </Paper>
        <LegalFooter />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f5f5f5",
        p: 2,
      }}
    >
      <Paper elevation={3} sx={{ p: 4, maxWidth: 400, width: "100%" }}>
        <Typography variant="h5" component="h1" gutterBottom align="center">
          Passwort zurücksetzen
        </Typography>

        {message && (
          <Alert severity={messageType} sx={{ mb: 2 }}>
            {message}
          </Alert>
        )}

        <TextField
          fullWidth
          label="Neues Passwort"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          margin="normal"
          required
        />

        <TextField
          fullWidth
          label="Passwort bestätigen"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          margin="normal"
          required
        />

        <Button
          fullWidth
          variant="contained"
          onClick={handleReset}
          disabled={isSubmitting}
          sx={{ mt: 3, mb: 2 }}
        >
          {isSubmitting ? <CircularProgress size={24} /> : "Passwort zurücksetzen"}
        </Button>

        <Button
          fullWidth
          variant="text"
          onClick={() => navigate("/login")}
        >
          Zurück zur Anmeldung
        </Button>
      </Paper>
      <LegalFooter />
    </Box>
  );
}