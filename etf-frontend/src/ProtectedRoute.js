import { Navigate, useLocation } from "react-router-dom";

export default function ProtectedRoute({ children, requiredRole, authStatus, currentUser }) {
  const location = useLocation();

  if (authStatus === "checking") {
    return <div>Authentifizierung wird geprueft...</div>;
  }

  if (authStatus !== "authenticated" || !currentUser) {
    return <Navigate to="/login" replace />;
  }

  const roles = Array.isArray(currentUser.roles) ? currentUser.roles : [];
  const requiredRoles = requiredRole
    ? (Array.isArray(requiredRole) ? requiredRole : [requiredRole]).map((role) => String(role).toUpperCase())
    : [];

  if (requiredRoles.length > 0 && !requiredRoles.some((role) => roles.includes(role))) {
    return <Navigate to="/dashboard" replace />;
  }

  if (currentUser.passwordExpired && location.pathname !== "/me") {
    return <Navigate to="/me" replace />;
  }

  return children;
}
