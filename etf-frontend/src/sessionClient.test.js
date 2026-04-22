import {
  clearStoredSession,
  markForcedLogout,
  normalizeCurrentUser,
  storeAuthenticatedSession
} from "./sessionClient";

describe("sessionClient", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test("normalizes roles and username casing", () => {
    expect(normalizeCurrentUser({ username: "Micha", roles: ["admin", "Readonly_admin"] })).toEqual({
      username: "Micha",
      roles: ["ADMIN", "READONLY_ADMIN"]
    });
  });

  test("stores authenticated session details in localStorage", () => {
    storeAuthenticatedSession({ username: "Micha", roles: ["admin"] });

    expect(localStorage.getItem("sessionAuthenticated")).toBe("1");
    expect(localStorage.getItem("sessionUsername")).toBe("micha");
    expect(localStorage.getItem("sessionRoles")).toBe(JSON.stringify(["ADMIN"]));
  });

  test("marks forced logout and clears session fields", () => {
    storeAuthenticatedSession({ username: "Micha", roles: ["admin"] });

    clearStoredSession();
    expect(localStorage.getItem("sessionAuthenticated")).toBeNull();
    expect(localStorage.getItem("sessionUsername")).toBeNull();
    expect(localStorage.getItem("sessionRoles")).toBeNull();

    storeAuthenticatedSession({ username: "Micha", roles: ["admin"] });
    markForcedLogout();

    expect(localStorage.getItem("forceLoggedOut")).toBe("1");
    expect(localStorage.getItem("sessionAuthenticated")).toBeNull();
  });
});