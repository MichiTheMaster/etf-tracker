import { useEffect, useState } from "react";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import { Alert, Box, Button, CircularProgress, Paper, Typography } from "@mui/material";
import { apiGet } from "./apiClient";
import LanguageToggle from "./LanguageToggle";
import { useI18n } from "./i18n";

export default function VerifyEmail() {
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState(t("auth.verifying"));

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      setStatus("error");
      setMessage(t("auth.verifyIncomplete"));
      return;
    }

    const verify = async () => {
      try {
        const payload = await apiGet(`/auth/verify-email?token=${encodeURIComponent(token)}`, {
          fallbackMessage: t("auth.verifyFailed")
        });

        setStatus("success");
        setMessage(payload?.message || t("auth.verifySuccess"));
      } catch (error) {
        console.error("Email verification failed", error);
        setStatus("error");
        setMessage(error.message || t("common.serverUnreachable"));
      }
    };

    verify();
  }, [searchParams]);

  return (
    <Box sx={{ display: "flex", justifyContent: "center", mt: 10, px: 2 }}>
      <Paper sx={{ p: 4, width: 480, maxWidth: "100%" }}>
        <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1 }}>
          <LanguageToggle />
        </Box>
        <Typography variant="h5" sx={{ mb: 3, textAlign: "center" }}>
          {t("auth.verifyTitle")}
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
          {t("auth.backToLogin")}
        </Button>
      </Paper>
    </Box>
  );
}
