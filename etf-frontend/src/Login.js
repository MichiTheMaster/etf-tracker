import { useEffect, useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import {
  TextField,
  Button,
  Box,
  Typography,
  Paper,
  CircularProgress,
  Checkbox,
  FormControlLabel,
  Link
} from "@mui/material";
import LegalFooter from "./LegalFooter";
import LanguageToggle from "./LanguageToggle";
import { apiPost } from "./apiClient";
import { loadCurrentUser } from "./sessionClient";
import { validatePassword } from "./passwordPolicy";
import { useI18n } from "./i18n";

export default function Login({ onAuthenticated }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("error");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  useEffect(() => {
    const forceLoggedOut = localStorage.getItem("forceLoggedOut") === "1";

    if (localStorage.getItem("sessionAuthenticated") === "1" && !forceLoggedOut) {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate]);

  const loginAfterRegister = async () => {
    await apiPost(
      "/auth/login",
      { username: username.trim(), password },
      { fallbackMessage: t("auth.autoLoginFailed") }
    );

    const currentUser = await loadCurrentUser();
    onAuthenticated?.(currentUser);

    navigate("/dashboard");
  };

  const handleAuth = async () => {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setMessage("");
    setMessageType("error");

    try {
      if (mode === "forgot") {
        if (!email.trim()) {
          setMessage(t("auth.enterEmail"));
          return;
        }

        await apiPost(
          "/auth/forgot-password",
          { email: email.trim() },
          { fallbackMessage: t("auth.resetFailed") }
        );

        setMessageType("success");
        setMessage(t("auth.forgotSent"));
        return;
      }

      if (!username.trim() || !password) {
        setMessage(t("auth.enterUserPass"));
        return;
      }

      if (mode === "register") {
        if (!email.trim()) {
          setMessage(t("auth.enterEmail"));
          return;
        }

        if (password !== confirmPassword) {
          setMessage(t("auth.passwordMismatch"));
          return;
        }

        const passwordError = validatePassword(password);
        if (passwordError) {
          setMessage(passwordError);
          return;
        }

        if (!acceptedTerms) {
          setMessage(t("auth.acceptTermsRequired"));
          return;
        }

        const registerPayload = await apiPost(
          "/auth/register",
          {
            username: username.trim(),
            email: email.trim(),
            password,
            acceptedTerms: true
          },
          { fallbackMessage: t("auth.registerFailed") }
        );

        if (registerPayload.verificationRequired) {
          setMessageType("success");
          setMessage(registerPayload.message || t("auth.confirmEmail"));
          setMode("login");
          setPassword("");
          setConfirmPassword("");
          return;
        }

        await loginAfterRegister();
      } else {
        await apiPost(
          "/auth/login",
          { username: username.trim(), password },
          { fallbackMessage: t("auth.loginFailed") }
        );

        const currentUser = await loadCurrentUser();
        onAuthenticated?.(currentUser);

        navigate("/dashboard");
      }
    } catch (error) {
      console.error("Auth error:", error);
      setMessage(error.message || t("common.serverUnreachable"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    handleAuth();
  };

  const toggleMode = () => {
    if (isSubmitting) {
      return;
    }

    if (mode === "login") {
      setMode("register");
    } else if (mode === "register") {
      setMode("login");
    } else if (mode === "forgot") {
      setMode("login");
    }
    setMessage("");
    setMessageType("error");
    setAcceptedTerms(false);
  };

  const switchToForgot = () => {
    if (isSubmitting) {
      return;
    }
    setMode("forgot");
    setMessage("");
    setMessageType("error");
    setAcceptedTerms(false);
  };

  const isRegisterMode = mode === "register";
  const isForgotMode = mode === "forgot";
  let submitLabel = t("auth.signIn");
  if (isRegisterMode) {
    submitLabel = t("auth.register");
  } else if (isForgotMode) {
    submitLabel = t("auth.sendResetEmail");
  }
  if (isSubmitting) {
    submitLabel = <CircularProgress size={24} color="inherit" />;
  }

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        mt: 10
      }}
    >
      <Paper sx={{ p: 4, width: 420 }}>
        <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1 }}>
          <LanguageToggle />
        </Box>
        <Box component="form" onSubmit={handleSubmit}>
          <Typography variant="h5" sx={{ mb: 3, textAlign: "center" }}>
            {isRegisterMode ? t("auth.register") : isForgotMode ? t("auth.resetPassword") : t("auth.signIn")}
          </Typography>

          {!isForgotMode && (
            <TextField
              label={t("auth.username")}
              fullWidth
              margin="normal"
              disabled={isSubmitting}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          )}

          {(isRegisterMode || isForgotMode) && (
            <TextField
              label={t("auth.email")}
              type="email"
              fullWidth
              margin="normal"
              disabled={isSubmitting}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          )}

          {!isForgotMode && (
            <TextField
              label={t("auth.password")}
              type="password"
              fullWidth
              margin="normal"
              disabled={isSubmitting}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}

          {isRegisterMode && (
            <TextField
              label={t("auth.confirmPassword")}
              type="password"
              fullWidth
              margin="normal"
              disabled={isSubmitting}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          )}

          {isRegisterMode && (
            <Box sx={{ mt: 1.5, mb: 0.5 }}>
              <FormControlLabel
                sx={{ alignItems: "flex-start", mr: 0 }}
                control={
                  <Checkbox
                    checked={acceptedTerms}
                    disabled={isSubmitting}
                    onChange={(event) => setAcceptedTerms(event.target.checked)}
                    sx={{ pt: 0.25 }}
                  />
                }
                label={
                  <Typography variant="body2">
                    {t("auth.acceptTermsBefore")}{" "}
                    <Link
                      component={RouterLink}
                      to="/legal/nutzungsbedingungen"
                      onClick={(event) => event.stopPropagation()}
                    >
                      {t("nav.terms")}
                    </Link>{" "}
                    {t("auth.acceptTermsAfter")}
                  </Typography>
                }
              />
              <Typography variant="body2" color="text.secondary" sx={{ ml: 4 }}>
                {t("auth.privacyBefore")}{" "}
                <Link component={RouterLink} to="/legal/datenschutz">
                  {t("auth.privacyLink")}
                </Link>
                .
              </Typography>
            </Box>
          )}

          <Button
            variant="contained"
            fullWidth
            sx={{ mt: 2 }}
            type="submit"
            disabled={isSubmitting}
          >
            {submitLabel}
          </Button>

          <Button
            variant="text"
            fullWidth
            sx={{ mt: 1 }}
            type="button"
            disabled={isSubmitting}
            onClick={toggleMode}
          >
            {isRegisterMode
              ? t("auth.haveAccount")
              : isForgotMode
              ? t("auth.backToLogin")
              : t("auth.noAccount")}
          </Button>

          {!isRegisterMode && !isForgotMode && (
            <Button
              variant="text"
              fullWidth
              sx={{ mt: 1 }}
              type="button"
              disabled={isSubmitting}
              onClick={switchToForgot}
            >
              {t("auth.forgotPassword")}
            </Button>
          )}

          {isSubmitting && (
            <Typography sx={{ mt: 2, textAlign: "center" }}>
              {isRegisterMode ? t("auth.registering") : isForgotMode ? t("auth.sendingEmail") : t("auth.signingIn")}
            </Typography>
          )}

          {message && (
            <Typography color={messageType === "error" ? "error" : "success.main"} sx={{ mt: 2, textAlign: "center" }}>
              {message}
            </Typography>
          )}
        </Box>

        <LegalFooter compact />
      </Paper>
    </Box>
  );
}
