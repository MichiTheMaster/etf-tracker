import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TextField, Button, Box, Typography, Paper, CircularProgress } from "@mui/material";
import LegalFooter from "./LegalFooter";
import { API_BASE } from "./apiBase";

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const hasSession = localStorage.getItem("sessionAuthenticated") === "1";
    const forceLoggedOut = localStorage.getItem("forceLoggedOut") === "1";

    if (hasSession && !forceLoggedOut) {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate]);

  const handleLogin = async () => {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password })
      });

      if (response.ok) {
        localStorage.setItem("sessionAuthenticated", "1");
        localStorage.setItem("sessionUsername", username.trim().toLowerCase());
        localStorage.removeItem("forceLoggedOut");
        navigate("/dashboard");
      } else {
        setMessage("Login fehlgeschlagen");
      }
    } catch (error) {
      console.error("Login error:", error);
      setMessage("Server nicht erreichbar");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    handleLogin();
  };

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
            Login
          </Typography>

          <TextField
            label="Benutzername"
            fullWidth
            margin="normal"
            disabled={isSubmitting}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <TextField
            label="Passwort"
            type="password"
            fullWidth
            margin="normal"
            disabled={isSubmitting}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <Button
            variant="contained"
            fullWidth
            sx={{ mt: 2 }}
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? <CircularProgress size={24} color="inherit" /> : "Login"}
          </Button>

          {isSubmitting && (
            <Typography sx={{ mt: 2, textAlign: "center" }}>
              Anmeldung laeuft...
            </Typography>
          )}

          {message && (
            <Typography color="error" sx={{ mt: 2, textAlign: "center" }}>
              {message}
            </Typography>
          )}
        </Box>

        <LegalFooter compact />
      </Paper>
    </Box>
  );
}
