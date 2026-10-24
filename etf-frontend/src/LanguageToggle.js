import { ToggleButton, ToggleButtonGroup } from "@mui/material";
import { useI18n } from "./i18n";

export default function LanguageToggle({ invert = false }) {
  const { language, setLanguage, t } = useI18n();
  const buttonSx = {
    px: 1,
    py: 0.2,
    fontSize: "0.75rem",
    lineHeight: 1.4,
    ...(invert
      ? {
          color: "inherit",
          borderColor: "rgba(255,255,255,0.45)",
          "&.Mui-selected": {
            bgcolor: "rgba(255,255,255,0.2)",
            color: "#fff"
          }
        }
      : {})
  };

  return (
    <ToggleButtonGroup
      exclusive
      size="small"
      value={language}
      onChange={(_event, next) => {
        if (next) {
          setLanguage(next);
        }
      }}
      aria-label={t("nav.language")}
      sx={invert ? { bgcolor: "transparent" } : undefined}
    >
      <ToggleButton value="de" sx={buttonSx}>DE</ToggleButton>
      <ToggleButton value="en" sx={buttonSx}>EN</ToggleButton>
    </ToggleButtonGroup>
  );
}
