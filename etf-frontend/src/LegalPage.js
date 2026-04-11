import { Box, Button, Container, Divider, Paper, Typography } from "@mui/material";
import { Link as RouterLink, useParams } from "react-router-dom";
import { LEGAL_CONTENT } from "./legalContent";

export default function LegalPage() {
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
            Rechtliche Information nicht gefunden
          </Typography>
          <Typography color="text.secondary">
            Bitte nutze die bekannten Links zu Impressum, Datenschutzerklaerung oder Nutzungsbedingungen.
          </Typography>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Paper sx={{ p: { xs: 3, md: 5 } }}>
        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", mb: 3 }}>
          <Button component={RouterLink} to="/" variant="outlined" size="small">
            Zur Startseite
          </Button>
          {!hasSession && (
            <Button component={RouterLink} to="/login" variant="outlined" size="small">
              Zum Login
            </Button>
          )}
          {hasSession && (
            <Button component={RouterLink} to="/dashboard" variant="contained" size="small">
              Zur App
            </Button>
          )}
        </Box>

        <Typography variant="h3" sx={{ mb: 1 }}>
          {page.title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Stand: {page.updatedAt}
        </Typography>

        <Box sx={{ mb: 4, p: 2, borderRadius: 2, bgcolor: "grey.100" }}>
          <Typography variant="body2">
            Diese Inhalte sind als veroeffentlichungsnahe Vorlage gedacht und enthalten bewusst Platzhalter.
            Bitte lasse die finalen Texte vor einem Live-Gang rechtlich pruefen.
          </Typography>
        </Box>

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
          Weitere Rechtsseiten:
        </Typography>
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mt: 1 }}>
          <Typography component={RouterLink} to="/legal/impressum" sx={{ textDecoration: "none" }}>
            Impressum
          </Typography>
          <Typography component={RouterLink} to="/legal/datenschutz" sx={{ textDecoration: "none" }}>
            Datenschutz
          </Typography>
          <Typography component={RouterLink} to="/legal/cookies" sx={{ textDecoration: "none" }}>
            Cookies
          </Typography>
          <Typography component={RouterLink} to="/legal/nutzungsbedingungen" sx={{ textDecoration: "none" }}>
            Nutzungsbedingungen
          </Typography>
        </Box>

        <Divider sx={{ my: 4 }} />
        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
          <Button component={RouterLink} to="/" variant="text">
            Startseite
          </Button>
          {!hasSession && (
            <Button component={RouterLink} to="/login" variant="text">
              Login
            </Button>
          )}
          {hasSession && (
            <Button component={RouterLink} to="/dashboard" variant="text">
              Dashboard
            </Button>
          )}
        </Box>
      </Paper>
    </Container>
  );
}
