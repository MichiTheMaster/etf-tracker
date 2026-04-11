import { Box, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

export default function LegalFooter({ compact = false }) {
  return (
    <Box
      sx={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: compact ? "center" : "space-between",
        alignItems: "center",
        gap: 1.5,
        mt: compact ? 3 : 4,
        pt: 2,
        borderTop: "1px solid",
        borderColor: "divider"
      }}
    >
      <Typography variant="body2" color="text.secondary">
        ETF-Dashboard
      </Typography>
      <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
        <Typography component={RouterLink} to="/legal/impressum" variant="body2" sx={{ textDecoration: "none" }}>
          Impressum
        </Typography>
        <Typography component={RouterLink} to="/legal/datenschutz" variant="body2" sx={{ textDecoration: "none" }}>
          Datenschutz
        </Typography>
        <Typography component={RouterLink} to="/legal/cookies" variant="body2" sx={{ textDecoration: "none" }}>
          Cookies
        </Typography>
        <Typography component={RouterLink} to="/legal/nutzungsbedingungen" variant="body2" sx={{ textDecoration: "none" }}>
          Nutzungsbedingungen
        </Typography>
      </Box>
    </Box>
  );
}
