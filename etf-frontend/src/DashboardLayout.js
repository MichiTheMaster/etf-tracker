import { useCallback, useEffect, useRef, useState } from "react";
import { Box, Drawer, List, ListItemButton, ListItemIcon, ListItemText, AppBar, Toolbar, Typography, Button, Chip, Divider, Tooltip, IconButton } from "@mui/material";
import { Link, useLocation, useNavigate } from "react-router-dom";
import DashboardIcon from "@mui/icons-material/Dashboard";
import PieChartIcon from "@mui/icons-material/PieChart";
import TableChartIcon from "@mui/icons-material/TableChart";
import PersonIcon from "@mui/icons-material/Person";
import LogoutIcon from "@mui/icons-material/Logout";
import SettingsIcon from "@mui/icons-material/Settings";
import GavelIcon from "@mui/icons-material/Gavel";
import PrivacyTipIcon from "@mui/icons-material/PrivacyTip";
import DescriptionIcon from "@mui/icons-material/Description";
import { API_BASE } from "./apiBase";

const drawerWidth = 240;
const DEFAULT_INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;
const DEFAULT_INACTIVITY_WARNING_MS = 28 * 60 * 1000;

const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"];

export default function DashboardLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [canAccessAdmin, setCanAccessAdmin] = useState(() => {
    try {
      const raw = localStorage.getItem("sessionRoles");
      if (!raw) {
        return false;
      }
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed)
        && (parsed.includes("ADMIN") || parsed.includes("READONLY_ADMIN"));
    } catch {
      return false;
    }
  });
  const [inactiveElapsedMs, setInactiveElapsedMs] = useState(0);
  const [inactivityTimeoutMs, setInactivityTimeoutMs] = useState(DEFAULT_INACTIVITY_TIMEOUT_MS);
  const [inactivityWarningMs, setInactivityWarningMs] = useState(DEFAULT_INACTIVITY_WARNING_MS);
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
      : currentPath === "/admin"
      ? "Admin"
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
      localStorage.removeItem("sessionRoles");
      localStorage.removeItem("sessionUsername");
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
    }, inactivityTimeoutMs);
  }, [handleLogout, inactivityTimeoutMs]);

  useEffect(() => {
    const loadInactivitySettings = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/settings/inactivity`, {
          method: "GET",
          credentials: "include"
        });

        if (!response.ok) {
          return;
        }

        const payload = await response.json();
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

  useEffect(() => {
    let isMounted = true;

    const loadUserRoles = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/me`, {
          method: "GET",
          credentials: "include"
        });

        if (!response.ok) {
          if (isMounted) {
            setCanAccessAdmin(false);
          }
          return;
        }

        const payload = await response.json();
        const roles = Array.isArray(payload?.roles)
          ? payload.roles.map((role) => String(role).toUpperCase())
          : [];
        localStorage.setItem("sessionRoles", JSON.stringify(roles));

        if (isMounted) {
          setCanAccessAdmin(roles.includes("ADMIN") || roles.includes("READONLY_ADMIN"));
        }
      } catch {
        if (isMounted) {
          setCanAccessAdmin(false);
        }
      }
    };

    loadUserRoles();

    return () => {
      isMounted = false;
    };
  }, []);

  const warningActive = inactiveElapsedMs >= inactivityWarningMs;
  const remainingMs = Math.max(inactivityTimeoutMs - inactiveElapsedMs, 0);
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

          {canAccessAdmin && (
            <ListItemButton
              component={Link}
              to="/admin"
              selected={currentPath === "/admin"}
            >
              <ListItemIcon><SettingsIcon /></ListItemIcon>
              <ListItemText primary="Admin" />
            </ListItemButton>
          )}
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
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mr: 1.5 }}>
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
                ? `Inaktiv seit ${elapsedText} | Auto-Logout in ${remainingText}`
                : `Auto-Logout in ${remainingText}`}
            </Typography>
            {warningActive && (
              <Button
                color="inherit"
                size="small"
                variant="outlined"
                sx={{ borderColor: "rgba(255,255,255,0.5)", whiteSpace: "nowrap", fontSize: "0.78rem", py: 0.3 }}
                onClick={resetInactivityTimer}
              >
                Angemeldet bleiben
              </Button>
            )}
          </Box>
          <Tooltip title="Meine Daten" arrow>
            <IconButton
              color="inherit"
              component={Link}
              to="/me"
              sx={{ mr: 0.5 }}
            >
              <PersonIcon />
            </IconButton>
          </Tooltip>
          {canAccessAdmin && (
            <Tooltip title="Admin" arrow>
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
          <Tooltip title="Logout" arrow>
            <IconButton color="inherit" onClick={handleLogout}>
              <LogoutIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      {/* Content */}
      <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8 }}>
        {children}
      </Box>


    </Box>
  );
}
