import { render, screen } from "@testing-library/react";
import App from "./App";
import {
  clearStoredSession,
  hasForcedLogout,
  loadCurrentUser,
  markForcedLogout,
  storeAuthenticatedSession
} from "./sessionClient";

jest.mock("./sessionClient", () => ({
  clearStoredSession: jest.fn(),
  hasForcedLogout: jest.fn(),
  loadCurrentUser: jest.fn(),
  markForcedLogout: jest.fn(),
  storeAuthenticatedSession: jest.fn((user) => user)
}));

jest.mock("./Login", () => ({
  __esModule: true,
  default: () => <h1>Login</h1>
}));

jest.mock("./LandingPage", () => ({
  __esModule: true,
  default: () => <div>Landing Page</div>
}));

jest.mock("./DashboardLayout", () => ({
  __esModule: true,
  default: ({ children }) => <div data-testid="layout">{children}</div>
}));

jest.mock("./Dashboard", () => ({
  __esModule: true,
  default: () => <div>Dashboard Page</div>
}));

jest.mock("./Portfolio", () => ({
  __esModule: true,
  default: () => <div>Portfolio Page</div>
}));

jest.mock("./Etfs", () => ({
  __esModule: true,
  default: () => <div>ETF Page</div>
}));

jest.mock("./Performance", () => ({
  __esModule: true,
  default: () => <div>Performance Page</div>
}));

jest.mock("./LegalPage", () => ({
  __esModule: true,
  default: () => <div>Legal Page</div>
}));

jest.mock("./VerifyEmail", () => ({
  __esModule: true,
  default: () => <div>Verify Email Page</div>
}));

jest.mock("./ResetPassword", () => ({
  __esModule: true,
  default: () => <div>Reset Password Page</div>
}));

jest.mock("./UserData", () => ({
  __esModule: true,
  default: () => <div>User Data Page</div>
}));

jest.mock("./AdminSettings", () => ({
  __esModule: true,
  default: () => <div>Admin Settings Page</div>
}));

describe("App auth routing", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    globalThis.location.hash = "#/login";
    hasForcedLogout.mockReturnValue(false);
    storeAuthenticatedSession.mockImplementation((user) => user);
  });

  test("renders login route when session lookup fails", async () => {
    loadCurrentUser.mockRejectedValue(new Error("not authenticated"));

    render(<App />);

    expect(await screen.findByRole("heading", { name: /login/i })).toBeInTheDocument();
    expect(clearStoredSession).toHaveBeenCalled();
  });

  test("renders admin route for authenticated admin user", async () => {
    globalThis.location.hash = "#/admin";
    loadCurrentUser.mockResolvedValue({ username: "admin", roles: ["ADMIN"] });

    render(<App />);

    expect(await screen.findByText("Admin Settings Page")).toBeInTheDocument();
    expect(storeAuthenticatedSession).toHaveBeenCalledWith({ username: "admin", roles: ["ADMIN"] });
    expect(markForcedLogout).not.toHaveBeenCalled();
  });
});
