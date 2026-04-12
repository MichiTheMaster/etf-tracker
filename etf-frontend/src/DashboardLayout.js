import { useCallback, useEffect, useRef, useState } from "react";
import { Box, Drawer, List, ListItemButton, ListItemIcon, ListItemText, AppBar, Toolbar, Typography, Button, Chip, Divider, Snackbar, Alert } from "@mui/material";
import { Link, useLocation, useNavigate } from "react-router-dom";
import DashboardIcon from "@mui/icons-material/Dashboard";
import PieChartIcon from "@mui/icons-material/PieChart";
import TableChartIcon from "@mui/icons-material/TableChart";
import PersonIcon from "@mui/icons-material/Person";
import GavelIcon from "@mui/icons-material/Gavel";
import PrivacyTipIcon from "@mui/icons-material/PrivacyTip";
import DescriptionIcon from "@mui/icons-material/Description";
import { API_BASE } from "./apiBase";

const drawerWidth = 240;
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;   // 30 Minuten
const INACTIVITY_WARNING_MS = 28 * 60 * 1000;    // Vorwarnung nach 28 Minuten

const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"];

export default function DashboardLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [inactiveElapsedMs, setInactiveElapsedMs] = useState(0);
  const logoutTimerRef = useRef(null);
  const tickerRef = useRef(null);
  const lastActivityAtRef = useRef(Date.now());

  const currentPath = location.pathname;
  const currentPageLabel =
    currentPath === "/dashboard"
      ? "Uebersicht"
      : currentPath === "/portfolio"
      ? "Portfolio"
      : currentPath === "/etfs"
      ? "ETF-Liste"
      : currentPath === "/performance"
      ? "Performance"
      : currentPath === "/me"
      ? "Meine Daten"
      : "Dashboard";

  const handleLogout = useCallback(async () => {
    clearTimeout(logoutTimerRef.current);
    clearInterval(tickerRef.current);
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: "POST",
        credentials: "include"
      });
    } finally {
      localStorage.removeItem("sessionAuthenticated");
      localStorage.setItem("forceLoggedOut", "1");
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  const resetInactivityTimer = useCallback(() => {
    lastActivityAtRef.current = Date.now();
    setInactiveElapsedMs(0);
    clearTimeout(logoutTimerRef.current);

    logoutTimerRef.current = setTimeout(() => {
      handleLogout();
    }, INACTIVITY_TIMEOUT_MS);
  }, [handleLogout]);

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

  const warningActive = inactiveElapsedMs >= INACTIVITY_WARNING_MS;
  const remainingMs = Math.max(INACTIVITY_TIMEOUT_MS - inactiveElapsedMs, 0);
  const elapsedMinutes = Math.floor(inactiveElapsedMs / 60000);
  const elapsedSeconds = Math.floor((inactiveElapsedMs % 60000) / 1000);
  const remainingMinutes = Math.floor(remainingMs / 60000);
  const remainingSeconds = Math.floor((remainingMs % 60000) / 1000);

  const pad2 = (value) => String(value).padStart(2, "0");
  const elapsedText = `${pad2(elapsedMinutes)}:${pad2(elapsedSeconds)}`;
  const remainingText = `${pad2(remainingMinutes)}:${pad2(remainingSeconds)}`;

  return (
    <Box sx={{ display: "flex" }}>
      {/* Sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          [`& .MuiDrawer-paper`]: {
            width: drawerWidth,
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column"
          }
        }}
      >
        <Toolbar />
        <List>
          <ListItemButton
            component={Link}
            to="/dashboard"
            selected={currentPath === "/dashboard"}
          >
            <ListItemIcon><DashboardIcon /></ListItemIcon>
            <ListItemText primary="Uebersicht" />
          </ListItemButton>

          <ListItemButton
            component={Link}
            to="/portfolio"
            selected={currentPath === "/portfolio"}
          >
            <ListItemIcon><PieChartIcon /></ListItemIcon>
            <ListItemText primary="Portfolio" />
          </ListItemButton>

          <ListItemButton
            component={Link}
            to="/etfs"
            selected={currentPath === "/etfs"}
          >
            <ListItemIcon><TableChartIcon /></ListItemIcon>
            <ListItemText primary="ETF-Liste" />
          </ListItemButton>

          <ListItemButton
            component={Link}
            to="/performance"
            selected={currentPath === "/performance"}
          >
            <ListItemIcon><DashboardIcon /></ListItemIcon>
            <ListItemText primary="Performance" />
          </ListItemButton>

          <ListItemButton
            component={Link}
            to="/me"
            selected={currentPath === "/me"}
          >
            <ListItemIcon><PersonIcon /></ListItemIcon>
            <ListItemText primary="Meine Daten" />
          </ListItemButton>
        </List>

        <Box sx={{ flexGrow: 1 }} />
        <Divider />
        <List sx={{ pb: 1 }}>
          <ListItemButton component={Link} to="/legal/impressum" selected={currentPath === "/legal/impressum"}>
            <ListItemIcon sx={{ minWidth: 34 }}><GavelIcon fontSize="small" /></ListItemIcon>
            <ListItemText primary="Impressum" primaryTypographyProps={{ fontSize: "0.88rem" }} />
          </ListItemButton>

          <ListItemButton component={Link} to="/legal/datenschutz" selected={currentPath === "/legal/datenschutz"}>
            <ListItemIcon sx={{ minWidth: 34 }}><PrivacyTipIcon fontSize="small" /></ListItemIcon>
            <ListItemText primary="Datenschutz" primaryTypographyProps={{ fontSize: "0.88rem" }} />
          </ListItemButton>

          <ListItemButton component={Link} to="/legal/cookies" selected={currentPath === "/legal/cookies"}>
            <ListItemIcon sx={{ minWidth: 34 }}><PrivacyTipIcon fontSize="small" /></ListItemIcon>
            <ListItemText primary="Cookies" primaryTypographyProps={{ fontSize: "0.88rem" }} />
          </ListItemButton>

          <ListItemButton component={Link} to="/legal/nutzungsbedingungen" selected={currentPath === "/legal/nutzungsbedingungen"}>
            <ListItemIcon sx={{ minWidth: 34 }}><DescriptionIcon fontSize="small" /></ListItemIcon>
            <ListItemText primary="Nutzungsbed." primaryTypographyProps={{ fontSize: "0.88rem" }} />
          </ListItemButton>
        </List>
      </Drawer>

      {/* Top Bar */}
      <AppBar
        position="fixed"
        sx={{
          ml: `${drawerWidth}px`,
          width: `calc(100% - ${drawerWidth}px)`,
          zIndex: (theme) => theme.zIndex.drawer + 1
        }}
      >
        <Toolbar>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexGrow: 1 }}>
            <Typography
              variant="h6"
              noWrap
              component={Link}
              to="/"
              sx={{
                color: "inherit",
                textDecoration: "none",
                fontWeight: 700,
                "&:hover": { textDecoration: "underline" }
              }}
            >
              ETF-Dashboard
            </Typography>
            <Chip
              label={currentPageLabel}
              color="secondary"
              size="small"
              sx={{ fontWeight: 600 }}
            />
          </Box>
          <Button color="inherit" onClick={handleLogout}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      {/* Content */}
      <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8 }}>
        {children}
      </Box>

      <Snackbar
        open
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={warningActive ? "warning" : "success"}
          variant="filled"
          sx={{
            borderRadius: 2,
            boxShadow: warningActive
              ? "0 10px 24px rgba(237, 108, 2, 0.22)"
              : "0 10px 24px rgba(46, 125, 50, 0.22)"
          }}
          action={
            <Button color="inherit" size="small" onClick={resetInactivityTimer}>
              Angemeldet bleiben
            </Button>
          }
        >
          Inaktiv seit {elapsedText} | Auto-Logout in {remainingText}
        </Alert>
      </Snackbar>
    </Box>
  );
}
