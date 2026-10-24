import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Box, Drawer, List, ListItemButton, ListItemIcon, ListItemText, AppBar, Toolbar, Typography, Button, Chip, Divider, Tooltip, IconButton, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { Link, useLocation, useNavigate } from "react-router-dom";
import DashboardIcon from "@mui/icons-material/Dashboard";
import PieChartIcon from "@mui/icons-material/PieChart";
import TableChartIcon from "@mui/icons-material/TableChart";
import PersonIcon from "@mui/icons-material/Person";
import LogoutIcon from "@mui/icons-material/Logout";
import SettingsIcon from "@mui/icons-material/Settings";
import MenuIcon from "@mui/icons-material/Menu";
import GavelIcon from "@mui/icons-material/Gavel";
import PrivacyTipIcon from "@mui/icons-material/PrivacyTip";
import DescriptionIcon from "@mui/icons-material/Description";
import { apiGet, apiPost } from "./apiClient";
import { useI18n } from "./i18n";
import LanguageToggle from "./LanguageToggle";

const drawerWidth = 240;
const DEFAULT_INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;
const DEFAULT_INACTIVITY_WARNING_MS = 28 * 60 * 1000;

const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"];

export default function DashboardLayout({ children, currentUser, onLogout }) {
  const { t } = useI18n();
  const theme = useTheme();
  const isCompact = useMediaQuery(theme.breakpoints.down("md"));
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [inactiveElapsedMs, setInactiveElapsedMs] = useState(0);
  const [inactivityTimeoutMs, setInactivityTimeoutMs] = useState(DEFAULT_INACTIVITY_TIMEOUT_MS);
  const [inactivityWarningMs, setInactivityWarningMs] = useState(DEFAULT_INACTIVITY_WARNING_MS);
  const logoutTimerRef = useRef(null);
  const tickerRef = useRef(null);
  const lastActivityAtRef = useRef(Date.now());

  const roles = Array.isArray(currentUser?.roles) ? currentUser.roles : [];
  const canAccessAdmin = roles.includes("ADMIN") || roles.includes("READONLY_ADMIN");
  const passwordExpired = Boolean(currentUser?.passwordExpired);
  const passwordExpiresSoon = Boolean(currentUser?.passwordExpiresSoon);

  const currentPath = location.pathname;
  const currentPageLabel =
    currentPath === "/dashboard"
      ? t("nav.overview")
      : currentPath === "/portfolio"
      ? t("nav.portfolio")
      : currentPath === "/etfs"
      ? t("nav.etfList")
      : currentPath === "/performance"
      ? t("nav.performance")
      : currentPath === "/me"
      ? t("nav.myData")
      : currentPath === "/admin"
      ? t("nav.admin")
      : t("nav.overview");

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const handleLogout = useCallback(async () => {
    clearTimeout(logoutTimerRef.current);
    clearInterval(tickerRef.current);
    try {
      await apiPost("/auth/logout", null, {
        fallbackMessage: t("nav.logoutFailed")
      });
    } finally {
      onLogout?.();
      navigate("/login", { replace: true });
    }
  }, [navigate, onLogout]);

  const resetInactivityTimer = useCallback(() => {
    lastActivityAtRef.current = Date.now();
    setInactiveElapsedMs(0);
    clearTimeout(logoutTimerRef.current);

    logoutTimerRef.current = setTimeout(() => {
      handleLogout();
    }, inactivityTimeoutMs);
  }, [handleLogout, inactivityTimeoutMs]);

  useEffect(() => {
    const loadInactivitySettings = async () => {
      try {
        const payload = await apiGet("/api/settings/inactivity", {
          fallbackMessage: t("nav.inactivityLoadFailed")
        });
        const timeoutMinutes = Number.parseInt(String(payload?.timeoutMinutes ?? ""), 10);
        const warningMinutes = Number.parseInt(String(payload?.warningMinutes ?? ""), 10);
        const hasValidTimeout = !Number.isNaN(timeoutMinutes) && timeoutMinutes >= 5 && timeoutMinutes <= 240;
        const effectiveTimeoutMinutes = hasValidTimeout ? timeoutMinutes : 30;

        setInactivityTimeoutMs(effectiveTimeoutMinutes * 60 * 1000);

        if (!Number.isNaN(warningMinutes) && warningMinutes >= 1 && warningMinutes < effectiveTimeoutMinutes) {
          setInactivityWarningMs(warningMinutes * 60 * 1000);
        } else {
          setInactivityWarningMs(Math.max(1, effectiveTimeoutMinutes - 2) * 60 * 1000);
        }
      } catch {
        // Keep local defaults when settings endpoint is unavailable.
      }
    };

    loadInactivitySettings();
  }, []);

  useEffect(() => {
    resetInactivityTimer();

    tickerRef.current = setInterval(() => {
      const elapsed = Date.now() - lastActivityAtRef.current;
      setInactiveElapsedMs(Math.max(0, elapsed));
    }, 1000);

    ACTIVITY_EVENTS.forEach((event) =>
      window.addEventListener(event, resetInactivityTimer, { passive: true })
    );

    return () => {
      clearTimeout(logoutTimerRef.current);
      clearInterval(tickerRef.current);
      ACTIVITY_EVENTS.forEach((event) =>
        window.removeEventListener(event, resetInactivityTimer)
      );
    };
  }, [resetInactivityTimer]);

  const warningActive = inactiveElapsedMs >= inactivityWarningMs;
  const remainingMs = Math.max(inactivityTimeoutMs - inactiveElapsedMs, 0);
  const elapsedMinutes = Math.floor(inactiveElapsedMs / 60000);
  const elapsedSeconds = Math.floor((inactiveElapsedMs % 60000) / 1000);
  const remainingMinutes = Math.floor(remainingMs / 60000);
  const remainingSeconds = Math.floor((remainingMs % 60000) / 1000);

  const pad2 = (value) => String(value).padStart(2, "0");
  const elapsedText = `${pad2(elapsedMinutes)}:${pad2(elapsedSeconds)}`;
  const remainingText = `${pad2(remainingMinutes)}:${pad2(remainingSeconds)}`;

  const drawerContent = (
    <>
      <Toolbar />
      <List>
        <ListItemButton
          component={Link}
          to="/dashboard"
          selected={currentPath === "/dashboard"}
          disabled={passwordExpired}
        >
          <ListItemIcon><DashboardIcon /></ListItemIcon>
          <ListItemText primary={t("nav.overview")} />
        </ListItemButton>

        <ListItemButton
          component={Link}
          to="/portfolio"
          selected={currentPath === "/portfolio"}
          disabled={passwordExpired}
        >
          <ListItemIcon><PieChartIcon /></ListItemIcon>
          <ListItemText primary={t("nav.portfolio")} />
        </ListItemButton>

        <ListItemButton
          component={Link}
          to="/etfs"
          selected={currentPath === "/etfs"}
          disabled={passwordExpired}
        >
          <ListItemIcon><TableChartIcon /></ListItemIcon>
          <ListItemText primary={t("nav.etfList")} />
        </ListItemButton>

        <ListItemButton
          component={Link}
          to="/performance"
          selected={currentPath === "/performance"}
          disabled={passwordExpired}
        >
          <ListItemIcon><DashboardIcon /></ListItemIcon>
          <ListItemText primary={t("nav.performance")} />
        </ListItemButton>

        {canAccessAdmin && (
          <ListItemButton
            component={Link}
            to="/admin"
            selected={currentPath === "/admin"}
            disabled={passwordExpired}
          >
            <ListItemIcon><SettingsIcon /></ListItemIcon>
            <ListItemText primary={t("nav.admin")} />
          </ListItemButton>
        )}
      </List>

      <Box sx={{ flexGrow: 1 }} />
      <Divider />
      <List sx={{ pb: 1 }}>
        <ListItemButton component={Link} to="/legal/impressum" selected={currentPath === "/legal/impressum"}>
          <ListItemIcon sx={{ minWidth: 34 }}><GavelIcon fontSize="small" /></ListItemIcon>
          <ListItemText primary={t("nav.impressum")} primaryTypographyProps={{ fontSize: "0.88rem" }} />
        </ListItemButton>

        <ListItemButton component={Link} to="/legal/datenschutz" selected={currentPath === "/legal/datenschutz"}>
          <ListItemIcon sx={{ minWidth: 34 }}><PrivacyTipIcon fontSize="small" /></ListItemIcon>
          <ListItemText primary={t("nav.privacy")} primaryTypographyProps={{ fontSize: "0.88rem" }} />
        </ListItemButton>

        <ListItemButton component={Link} to="/legal/cookies" selected={currentPath === "/legal/cookies"}>
          <ListItemIcon sx={{ minWidth: 34 }}><PrivacyTipIcon fontSize="small" /></ListItemIcon>
          <ListItemText primary={t("nav.cookies")} primaryTypographyProps={{ fontSize: "0.88rem" }} />
        </ListItemButton>

        <ListItemButton component={Link} to="/legal/nutzungsbedingungen" selected={currentPath === "/legal/nutzungsbedingungen"}>
          <ListItemIcon sx={{ minWidth: 34 }}><DescriptionIcon fontSize="small" /></ListItemIcon>
          <ListItemText primary={t("nav.termsShort")} primaryTypographyProps={{ fontSize: "0.88rem" }} />
        </ListItemButton>
      </List>
    </>
  );

  return (
    <Box sx={{ display: "flex" }}>
      <Drawer
        variant={isCompact ? "temporary" : "permanent"}
        open={isCompact ? mobileOpen : true}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          width: isCompact ? undefined : drawerWidth,
          [`& .MuiDrawer-paper`]: {
            width: drawerWidth,
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column"
          }
        }}
      >
        {drawerContent}
      </Drawer>

      <AppBar
        position="fixed"
        sx={{
          ml: { md: `${drawerWidth}px` },
          width: { xs: "100%", md: `calc(100% - ${drawerWidth}px)` },
          zIndex: (appTheme) => appTheme.zIndex.drawer + 1
        }}
      >
        <Toolbar>
          {isCompact && (
            <IconButton
              color="inherit"
              edge="start"
              aria-label={t("nav.openMenu")}
              onClick={() => setMobileOpen(true)}
              sx={{ mr: 1 }}
            >
              <MenuIcon />
            </IconButton>
          )}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexGrow: 1, minWidth: 0 }}>
            <Typography
              variant="h6"
              noWrap
              component={Link}
              to="/"
              sx={{
                display: { xs: "none", sm: "block" },
                color: "inherit",
                textDecoration: "none",
                fontWeight: 700,
                "&:hover": { textDecoration: "underline" }
              }}
            >
              {t("legal.brand")}
            </Typography>
            <Chip
              label={currentPageLabel}
              color="secondary"
              size="small"
              sx={{ fontWeight: 600 }}
            />
          </Box>
          <Box sx={{ display: { xs: "none", md: "flex" }, alignItems: "center", gap: 1, mr: 1.5 }}>
            <Typography
              variant="body2"
              sx={{
                opacity: warningActive ? 0.95 : 0.78,
                color: warningActive ? "#fff3e0" : "inherit",
                fontSize: "0.82rem",
                whiteSpace: "nowrap"
              }}
            >
              {warningActive
                ? t("nav.inactiveSince", { elapsed: elapsedText, time: remainingText })
                : t("nav.autoLogoutIn", { time: remainingText })}
            </Typography>
            {warningActive && (
              <Button
                color="inherit"
                size="small"
                variant="outlined"
                sx={{ borderColor: "rgba(255,255,255,0.5)", whiteSpace: "nowrap", fontSize: "0.78rem", py: 0.3 }}
                onClick={resetInactivityTimer}
              >
                {t("nav.staySignedIn")}
              </Button>
            )}
          </Box>
          <Box sx={{ mr: 1 }}>
            <LanguageToggle invert />
          </Box>
          <Tooltip title={t("nav.myData")} arrow>
            <IconButton
              color="inherit"
              component={Link}
              to="/me"
              sx={{ mr: 0.5 }}
            >
              <PersonIcon />
            </IconButton>
          </Tooltip>
          {canAccessAdmin && !passwordExpired && (
            <Tooltip title={t("nav.admin")} arrow>
              <IconButton
                color="inherit"
                component={Link}
                to="/admin"
                sx={{ mr: 0.5 }}
              >
                <SettingsIcon />
              </IconButton>
            </Tooltip>
          )}
          {isCompact && warningActive && (
            <Button
              color="inherit"
              size="small"
              variant="outlined"
              sx={{ mr: 0.5, borderColor: "rgba(255,255,255,0.5)", fontSize: "0.72rem", py: 0.2, minWidth: 0 }}
              onClick={resetInactivityTimer}
            >
              {t("nav.stay")}
            </Button>
          )}
          <Tooltip title={t("nav.logout")} arrow>
            <IconButton color="inherit" onClick={handleLogout}>
              <LogoutIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Box component="main" sx={{ flexGrow: 1, width: "100%", p: { xs: 2, md: 3 }, mt: 8 }}>
        {passwordExpired && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {t("nav.passwordExpired")}
          </Alert>
        )}
        {!passwordExpired && passwordExpiresSoon && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {t("nav.passwordExpiresSoon")}
          </Alert>
        )}
        {children}
      </Box>


    </Box>
  );
}
