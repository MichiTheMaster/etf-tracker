import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TextField, Button, Box, Typography, Paper, CircularProgress } from "@mui/material";
import LegalFooter from "./LegalFooter";
import { API_BASE } from "./apiBase";

export default function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("error");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const hasSession = localStorage.getItem("sessionAuthenticated") === "1";
    const forceLoggedOut = localStorage.getItem("forceLoggedOut") === "1";

    if (hasSession && !forceLoggedOut) {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate]);

  const loginAfterRegister = async () => {
    const loginResponse = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ username, password })
    });

    if (!loginResponse.ok) {
      throw new Error("Auto-login failed");
    }

    localStorage.setItem("sessionAuthenticated", "1");
    localStorage.setItem("sessionUsername", username.trim().toLowerCase());
    localStorage.removeItem("forceLoggedOut");
    navigate("/dashboard");
  };

  const getResponseMessage = async (response, fallbackMessage) => {
    try {
      const payload = await response.json();
      return payload.message || fallbackMessage;
    } catch {
      return fallbackMessage;
    }
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
          setMessage("Bitte eine E-Mail eingeben");
          return;
        }

        const response = await fetch(`${API_BASE}/auth/forgot-password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ email: email.trim() })
        });

        if (!response.ok) {
          setMessage(await getResponseMessage(response, "Passwort-Reset fehlgeschlagen"));
          return;
        }

        setMessageType("success");
        setMessage("Falls ein Account mit dieser E-Mail-Adresse existiert, wurde eine Reset-E-Mail versendet");
        return;
      }

      if (!username.trim() || !password) {
        setMessage("Bitte Benutzername und Passwort eingeben");
        return;
      }

      if (mode === "register") {
        if (!email.trim()) {
          setMessage("Bitte eine E-Mail eingeben");
          return;
        }

        if (password !== confirmPassword) {
          setMessage("Passwoerter stimmen nicht ueberein");
          return;
        }

        const registerResponse = await fetch(`${API_BASE}/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            username: username.trim(),
            email: email.trim(),
            password
          })
        });

        if (!registerResponse.ok) {
          setMessage(await getResponseMessage(registerResponse, "Registrierung fehlgeschlagen"));
          return;
        }

        const registerPayload = await registerResponse.json();

        if (registerPayload.verificationRequired) {
          setMessageType("success");
          setMessage(registerPayload.message || "Bitte bestaetige deine E-Mail-Adresse.");
          setMode("login");
          setPassword("");
          setConfirmPassword("");
          return;
        }

        await loginAfterRegister();
      } else {
        const response = await fetch(`${API_BASE}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ username: username.trim(), password })
        });

        if (response.ok) {
          localStorage.setItem("sessionAuthenticated", "1");
          localStorage.setItem("sessionUsername", username.trim().toLowerCase());
          localStorage.removeItem("forceLoggedOut");
          navigate("/dashboard");
        } else {
          setMessage(await getResponseMessage(response, "Login fehlgeschlagen"));
        }
      }
    } catch (error) {
      console.error("Auth error:", error);
      setMessage("Server nicht erreichbar");
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
  };

  const switchToForgot = () => {
    if (isSubmitting) {
      return;
    }
    setMode("forgot");
    setMessage("");
    setMessageType("error");
  };

  const isRegisterMode = mode === "register";
  const isForgotMode = mode === "forgot";
  let submitLabel = "Login";
  if (isRegisterMode) {
    submitLabel = "Registrieren";
  } else if (isForgotMode) {
    submitLabel = "Reset-E-Mail senden";
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
        <Box component="form" onSubmit={handleSubmit}>
          <Typography variant="h5" sx={{ mb: 3, textAlign: "center" }}>
            {isRegisterMode ? "Registrieren" : isForgotMode ? "Passwort zurücksetzen" : "Login"}
          </Typography>

          {!isForgotMode && (
            <TextField
              label="Benutzername"
              fullWidth
              margin="normal"
              disabled={isSubmitting}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          )}

          {(isRegisterMode || isForgotMode) && (
            <TextField
              label="E-Mail"
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
              label="Passwort"
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
              label="Passwort bestaetigen"
              type="password"
              fullWidth
              margin="normal"
              disabled={isSubmitting}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
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
              ? "Schon ein Konto? Zum Login"
              : isForgotMode
              ? "Zurück zum Login"
              : "Noch kein Konto? Jetzt registrieren"}
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
              Passwort vergessen?
            </Button>
          )}

          {isSubmitting && (
            <Typography sx={{ mt: 2, textAlign: "center" }}>
              {isRegisterMode ? "Registrierung laeuft..." : isForgotMode ? "E-Mail wird versendet..." : "Anmeldung laeuft..."}
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
