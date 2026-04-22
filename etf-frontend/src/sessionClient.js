import { apiGet } from "./apiClient";

function normalizeRoles(roles) {
  return Array.isArray(roles)
    ? roles.map((role) => String(role).toUpperCase())
    : [];
}

export function normalizeCurrentUser(user) {
  if (!user || typeof user !== "object") {
    return null;
  }

  return {
    ...user,
    username: typeof user.username === "string" ? user.username : "",
    roles: normalizeRoles(user.roles)
  };
}

export function storeAuthenticatedSession(user) {
  const normalizedUser = normalizeCurrentUser(user);

  if (typeof window === "undefined" || !normalizedUser) {
    return normalizedUser;
  }

  localStorage.setItem("sessionAuthenticated", "1");
  localStorage.setItem("sessionUsername", normalizedUser.username.toLowerCase());
  localStorage.setItem("sessionRoles", JSON.stringify(normalizedUser.roles));
  localStorage.removeItem("forceLoggedOut");

  return normalizedUser;
}

export function clearStoredSession() {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem("sessionAuthenticated");
  localStorage.removeItem("sessionRoles");
  localStorage.removeItem("sessionUsername");
}

export function markForcedLogout() {
  if (typeof window === "undefined") {
    return;
  }

  clearStoredSession();
  localStorage.setItem("forceLoggedOut", "1");
}

export function hasForcedLogout() {
  if (typeof window === "undefined") {
    return false;
  }

  return localStorage.getItem("forceLoggedOut") === "1";
}

export async function loadCurrentUser(options) {
  const payload = await apiGet("/api/me", {
    fallbackMessage: "Sitzung konnte nicht geladen werden.",
    ...options
  });

  return normalizeCurrentUser(payload);
}