import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { API_BASE } from "./apiBase";

export default function ProtectedRoute({ children, requiredRole }) {
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    let isMounted = true;
    const hasClientSession = localStorage.getItem("sessionAuthenticated") === "1";

    if (localStorage.getItem("forceLoggedOut") === "1") {
      setStatus("unauthenticated");
      return () => {
        isMounted = false;
      };
    }

    if (!hasClientSession) {
      setStatus("unauthenticated");
      return () => {
        isMounted = false;
      };
    }

    const checkAuth = async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);

      try {
        const response = await fetch(`${API_BASE}/api/me`, {
          method: "GET",
          credentials: "include",
          signal: controller.signal
        });

        if (!response.ok) {
          localStorage.removeItem("sessionAuthenticated");
          localStorage.removeItem("sessionRoles");
          if (isMounted) {
            setStatus("unauthenticated");
          }
          return;
        }

        const payload = await response.json();
        const roles = Array.isArray(payload?.roles)
          ? payload.roles.map((role) => String(role).toUpperCase())
          : [];
        localStorage.setItem("sessionRoles", JSON.stringify(roles));

        if (!requiredRole) {
          if (isMounted) {
            setStatus("authorized");
          }
          return;
        }

        const hasRequiredRole = roles.includes(String(requiredRole).toUpperCase());
        if (isMounted) {
          setStatus(hasRequiredRole ? "authorized" : "forbidden");
        }
      } catch (error) {
        localStorage.removeItem("sessionAuthenticated");
        localStorage.removeItem("sessionRoles");

        if (isMounted) {
          setStatus("unauthenticated");
        }
      } finally {
        clearTimeout(timeoutId);
      }
    };

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, [requiredRole]);

  if (status === "checking") {
    return <div>Authentifizierung wird geprueft...</div>;
  }

  if (status === "unauthenticated") {
    return <Navigate to="/login" replace />;
  }

  if (status === "forbidden") {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
