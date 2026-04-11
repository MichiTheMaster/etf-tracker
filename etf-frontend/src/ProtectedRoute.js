import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { API_BASE } from "./apiBase";

export default function ProtectedRoute({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const hasClientSession = localStorage.getItem("sessionAuthenticated") === "1";

    if (localStorage.getItem("forceLoggedOut") === "1") {
      setIsAuthenticated(false);
      return () => {
        isMounted = false;
      };
    }

    if (!hasClientSession) {
      setIsAuthenticated(false);
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

        if (isMounted) {
          setIsAuthenticated(response.ok);
        }

        if (!response.ok) {
          localStorage.removeItem("sessionAuthenticated");
        }
      } catch (error) {
        localStorage.removeItem("sessionAuthenticated");

        if (isMounted) {
          setIsAuthenticated(false);
        }
      } finally {
        clearTimeout(timeoutId);
      }
    };

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  if (isAuthenticated === null) {
    return <div>Authentifizierung wird geprueft...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
