import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { TextField, Button, Box, Typography, Paper, CircularProgress, Alert } from "@mui/material";
import LegalFooter from "./LegalFooter";
import LanguageToggle from "./LanguageToggle";
import { apiPost } from "./apiClient";
import { validatePassword } from "./passwordPolicy";
import { useI18n } from "./i18n";

export default function ResetPassword() {
  const { t } = useI18n();
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
      setMessage(t("auth.invalidResetLink"));
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
      const passwordError = validatePassword(newPassword);
      if (passwordError) {
        setMessage(passwordError);
        return;
      }

      if (newPassword !== confirmPassword) {
        setMessage(t("auth.passwordMismatch"));
        return;
      }

      await apiPost(
        "/auth/reset-password",
        { token, newPassword },
        { fallbackMessage: t("auth.resetFailed") }
      );

      setMessageType("success");
      setMessage(t("auth.resetSuccess"));

      // Nach 3 Sekunden zur Login-Seite weiterleiten
      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 3000);

    } catch (error) {
      setMessage(error.message || t("common.networkError"));
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
          <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1 }}>
            <LanguageToggle />
          </Box>
          <Typography variant="h5" component="h1" gutterBottom align="center">
            {t("auth.resetPassword")}
          </Typography>
          <Alert severity="error" sx={{ mb: 2 }}>
            {t("auth.invalidResetLink")}
          </Alert>
          <Button
            fullWidth
            variant="outlined"
            onClick={() => navigate("/login")}
            sx={{ mt: 2 }}
          >
            {t("legal.toLogin")}
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
        <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1 }}>
          <LanguageToggle />
        </Box>
        <Typography variant="h5" component="h1" gutterBottom align="center">
          {t("auth.resetPassword")}
        </Typography>

        {message && (
          <Alert severity={messageType} sx={{ mb: 2 }}>
            {message}
          </Alert>
        )}

        <TextField
          fullWidth
          label={t("auth.newPassword")}
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          margin="normal"
          required
        />

        <TextField
          fullWidth
          label={t("auth.confirmPassword")}
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
          {isSubmitting ? <CircularProgress size={24} /> : t("auth.resetPassword")}
        </Button>

        <Button
          fullWidth
          variant="text"
          onClick={() => navigate("/login")}
        >
          {t("auth.backToLogin")}
        </Button>
      </Paper>
      <LegalFooter />
    </Box>
  );
}