import { Box, Button, Container, Divider, Paper, Typography } from "@mui/material";
import { Link as RouterLink, useParams } from "react-router-dom";
import { LEGAL_CONTENT } from "./legalContent";
import LanguageToggle from "./LanguageToggle";
import { useI18n } from "./i18n";

export default function LegalPage() {
  const { t } = useI18n();
  const { slug } = useParams();
  const page = LEGAL_CONTENT[slug];
  const hasSession =
    localStorage.getItem("sessionAuthenticated") === "1" &&
    localStorage.getItem("forceLoggedOut") !== "1";

  if (!page) {
    return (
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Paper sx={{ p: 4 }}>
          <Typography variant="h4" sx={{ mb: 2 }}>
            {t("legal.notFoundTitle")}
          </Typography>
          <Typography color="text.secondary">
            {t("legal.notFoundText")}
          </Typography>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Paper sx={{ p: { xs: 3, md: 5 } }}>
        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", mb: 3, alignItems: "center" }}>
          <Button component={RouterLink} to="/" variant="outlined" size="small">
            {t("legal.home")}
          </Button>
          {!hasSession && (
            <Button component={RouterLink} to="/login" variant="outlined" size="small">
              {t("legal.toLogin")}
            </Button>
          )}
          {hasSession && (
            <Button component={RouterLink} to="/dashboard" variant="contained" size="small">
              {t("legal.toApp")}
            </Button>
          )}
          <Box sx={{ ml: { sm: "auto" } }}>
            <LanguageToggle />
          </Box>
        </Box>

        <Typography variant="h3" sx={{ mb: 1 }}>
          {page.title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {t("legal.asOf", { date: page.updatedAt })}
        </Typography>

        {page.sections.map((section, index) => (
          <Box key={section.heading} sx={{ mb: index === page.sections.length - 1 ? 0 : 4 }}>
            <Typography variant="h5" sx={{ mb: 1.5 }}>
              {section.heading}
            </Typography>
            {section.paragraphs?.map((paragraph) => (
              <Typography key={paragraph} sx={{ mb: 1.5 }}>
                {paragraph}
              </Typography>
            ))}
            {section.bullets?.map((bullet) => (
              <Typography key={bullet} sx={{ ml: 2, mb: 0.75 }}>
                - {bullet}
              </Typography>
            ))}
            {index < page.sections.length - 1 && <Divider sx={{ mt: 3 }} />}
          </Box>
        ))}

        <Divider sx={{ my: 4 }} />
        <Typography variant="body2" color="text.secondary">
          {t("legal.morePages")}
        </Typography>
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mt: 1 }}>
          <Typography component={RouterLink} to="/legal/impressum" sx={{ textDecoration: "none" }}>
            {t("nav.impressum")}
          </Typography>
          <Typography component={RouterLink} to="/legal/datenschutz" sx={{ textDecoration: "none" }}>
            {t("nav.privacy")}
          </Typography>
          <Typography component={RouterLink} to="/legal/cookies" sx={{ textDecoration: "none" }}>
            {t("nav.cookies")}
          </Typography>
          <Typography component={RouterLink} to="/legal/nutzungsbedingungen" sx={{ textDecoration: "none" }}>
            {t("nav.terms")}
          </Typography>
        </Box>

        <Divider sx={{ my: 4 }} />
        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
          <Button component={RouterLink} to="/" variant="text">
            {t("legal.homeShort")}
          </Button>
          {!hasSession && (
            <Button component={RouterLink} to="/login" variant="text">
              {t("legal.signIn")}
            </Button>
          )}
          {hasSession && (
            <Button component={RouterLink} to="/dashboard" variant="text">
              {t("nav.overview")}
            </Button>
          )}
        </Box>
      </Paper>
    </Container>
  );
}
