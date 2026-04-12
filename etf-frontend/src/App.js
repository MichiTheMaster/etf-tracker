import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./Login";
import Dashboard from "./Dashboard";
import ProtectedRoute from "./ProtectedRoute";
import DashboardLayout from "./DashboardLayout";
import Portfolio from "./Portfolio";
import Etfs from "./Etfs";
import Performance from "./Performance";
import LegalPage from "./LegalPage";
import LandingPage from "./LandingPage";
import VerifyEmail from "./VerifyEmail";
import UserData from "./UserData";
import AdminSettings from "./AdminSettings";

function hasActiveSession() {
	if (typeof window === "undefined") {
		return false;
	}

	return (
		localStorage.getItem("sessionAuthenticated") === "1" &&
		localStorage.getItem("forceLoggedOut") !== "1"
	);
}

function LoginRoute() {
	return hasActiveSession() ? <Navigate to="/dashboard" replace /> : <Login />;
}

function App() {
  return (
    <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
				<Route path="/" element={<LandingPage />} />
				<Route path="/login" element={<LoginRoute />} />
				<Route path="/verify-email" element={<VerifyEmail />} />
				<Route path="/legal/:slug" element={<LegalPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Dashboard />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

				<Route
					path="/portfolio"
					element={
						<ProtectedRoute>
							<DashboardLayout>
								<Portfolio />
							</DashboardLayout>
						</ProtectedRoute>
					}
				/>

				<Route
					path="/etfs"
					element={
						<ProtectedRoute>
							<DashboardLayout>
								<Etfs />
							</DashboardLayout>
						</ProtectedRoute>
					}
				/>

				<Route
					path="/performance"
					element={
						<ProtectedRoute>
							<DashboardLayout>
								<Performance />
							</DashboardLayout>
						</ProtectedRoute>
					}
				/>

				<Route
					path="/me"
					element={
						<ProtectedRoute>
							<DashboardLayout>
								<UserData />
							</DashboardLayout>
						</ProtectedRoute>
					}
				/>

				<Route
					path="/admin"
					element={
						<ProtectedRoute requiredRole="ADMIN">
							<DashboardLayout>
								<AdminSettings />
							</DashboardLayout>
						</ProtectedRoute>
					}
				/>

				<Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
