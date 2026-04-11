import { Box, Button, Chip, Container, Paper, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import LegalFooter from "./LegalFooter";

export default function LandingPage() {
  const hasSession =
    localStorage.getItem("sessionAuthenticated") === "1" &&
    localStorage.getItem("forceLoggedOut") !== "1";

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f6f8fb", py: { xs: 4, md: 8 } }}>
      <Container maxWidth="lg">
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, md: 6 },
            borderRadius: 4,
            border: "1px solid",
            borderColor: "divider",
            background: "linear-gradient(135deg, #ffffff 0%, #f3f7ff 100%)"
          }}
        >
          <Chip label="ETF-Dashboard" color="primary" sx={{ mb: 2, fontWeight: 700 }} />
          <Typography variant="h2" sx={{ fontSize: { xs: "2.2rem", md: "3.6rem" }, mb: 2 }}>
            ETF-Portfolio verwalten, simulieren und auswerten.
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 760, mb: 4, lineHeight: 1.6 }}>
            Diese Demo-App zeigt Portfolio-Werte, ETF-Kaeufe und Performance-Daten in einer geschuetzten Oberflaeche.
            Fuer eine spaetere Veroeffentlichung sind die wichtigsten Rechtsseiten bereits eingebunden.
          </Typography>

          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 5 }}>
            {hasSession ? (
              <Button component={RouterLink} to="/dashboard" variant="contained" size="large">
                Zur App
              </Button>
            ) : (
              <Button component={RouterLink} to="/login" variant="contained" size="large">
                Zum Login
              </Button>
            )}
            <Button component={RouterLink} to="/legal/datenschutz" variant="outlined" size="large">
              Datenschutz ansehen
            </Button>
          </Box>

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" }, gap: 2.5 }}>
            <Paper sx={{ p: 3, borderRadius: 3 }}>
              <Typography variant="h6" sx={{ mb: 1 }}>
                Portfolio und Trades
              </Typography>
              <Typography color="text.secondary">
                ETF-Kaeufe, Verkaeufe und Bewertungen werden serverseitig gespeichert und in mehreren Ansichten dargestellt.
              </Typography>
            </Paper>
            <Paper sx={{ p: 3, borderRadius: 3 }}>
              <Typography variant="h6" sx={{ mb: 1 }}>
                Rechtsseiten vorhanden
              </Typography>
              <Typography color="text.secondary">
                Impressum, Datenschutz, Nutzungsbedingungen und Cookie-Hinweise sind in die App integriert.
              </Typography>
            </Paper>
            <Paper sx={{ p: 3, borderRadius: 3 }}>
              <Typography variant="h6" sx={{ mb: 1 }}>
                Consent-Hinweis
              </Typography>
              <Typography color="text.secondary">
                Aktuell sind nur technische Cookies vorgesehen. Sobald Tracking oder Analytics dazukommen, sollte ein aktiver Consent-Banner aktiviert werden.
              </Typography>
            </Paper>
          </Box>

          <LegalFooter />
        </Paper>
      </Container>
    </Box>
  );
}
