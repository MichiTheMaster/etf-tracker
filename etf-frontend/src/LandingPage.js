import { Box, Button, Chip, Container, Paper, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import LegalFooter from "./LegalFooter";
import LanguageToggle from "./LanguageToggle";
import { useI18n } from "./i18n";

export default function LandingPage() {
  const { t } = useI18n();
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
          <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1 }}>
            <LanguageToggle />
          </Box>
          <Chip label={t("legal.chip")} color="primary" sx={{ mb: 2, fontWeight: 700 }} />
          <Typography variant="h2" sx={{ fontSize: { xs: "2.2rem", md: "3.6rem" }, mb: 2 }}>
            {t("legal.headline")}
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 760, mb: 4, lineHeight: 1.6 }}>
            {t("legal.intro")}
          </Typography>

          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 5 }}>
            {hasSession ? (
              <Button component={RouterLink} to="/dashboard" variant="contained" size="large">
                {t("legal.toApp")}
              </Button>
            ) : (
              <Button component={RouterLink} to="/login" variant="contained" size="large">
                {t("legal.toLogin")}
              </Button>
            )}
            <Button component={RouterLink} to="/legal/datenschutz" variant="outlined" size="large">
              {t("legal.viewPrivacy")}
            </Button>
          </Box>

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" }, gap: 2.5 }}>
            <Paper sx={{ p: 3, borderRadius: 3 }}>
              <Typography variant="h6" sx={{ mb: 1 }}>
                {t("legal.cardPortfolioTitle")}
              </Typography>
              <Typography color="text.secondary">
                {t("legal.cardPortfolioText")}
              </Typography>
            </Paper>
            <Paper sx={{ p: 3, borderRadius: 3 }}>
              <Typography variant="h6" sx={{ mb: 1 }}>
                {t("legal.cardLegalTitle")}
              </Typography>
              <Typography color="text.secondary">
                {t("legal.cardLegalText")}
              </Typography>
            </Paper>
            <Paper sx={{ p: 3, borderRadius: 3 }}>
              <Typography variant="h6" sx={{ mb: 1 }}>
                {t("legal.cardCookiesTitle")}
              </Typography>
              <Typography color="text.secondary">
                {t("legal.cardCookiesText")}
              </Typography>
            </Paper>
          </Box>

          <LegalFooter />
        </Paper>
      </Container>
    </Box>
  );
}
