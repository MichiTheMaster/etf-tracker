import { Suspense, lazy, useCallback, useEffect, useState } from "react";
import PropTypes from "prop-types";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import DashboardLayout from "./DashboardLayout";
import { clearStoredSession, hasForcedLogout, loadCurrentUser, markForcedLogout, storeAuthenticatedSession } from "./sessionClient";

const Login = lazy(() => import("./Login"));
const Dashboard = lazy(() => import("./Dashboard"));
const Portfolio = lazy(() => import("./Portfolio"));
const Etfs = lazy(() => import("./Etfs"));
const Performance = lazy(() => import("./Performance"));
const LegalPage = lazy(() => import("./LegalPage"));
const LandingPage = lazy(() => import("./LandingPage"));
const VerifyEmail = lazy(() => import("./VerifyEmail"));
const ResetPassword = lazy(() => import("./ResetPassword"));
const UserData = lazy(() => import("./UserData"));
const AdminSettings = lazy(() => import("./AdminSettings"));

function PageFallback() {
	return <div>Seite wird geladen...</div>;
}

function LoginRoute({ authStatus, onAuthenticated }) {
	if (authStatus === "checking") {
		return <PageFallback />;
	}

	return authStatus === "authenticated"
		? <Navigate to="/dashboard" replace />
		: <Login onAuthenticated={onAuthenticated} />;
}

LoginRoute.propTypes = {
	authStatus: PropTypes.string.isRequired,
	onAuthenticated: PropTypes.func.isRequired
};

function ProtectedPage({ authStatus, currentUser, onLogout, requiredRole, children }) {
	return (
		<ProtectedRoute authStatus={authStatus} currentUser={currentUser} requiredRole={requiredRole}>
			<DashboardLayout currentUser={currentUser} onLogout={onLogout}>
				{children}
			</DashboardLayout>
		</ProtectedRoute>
	);
}

ProtectedPage.propTypes = {
	authStatus: PropTypes.string.isRequired,
	currentUser: PropTypes.shape({
		username: PropTypes.string,
		roles: PropTypes.arrayOf(PropTypes.string)
	}),
	onLogout: PropTypes.func.isRequired,
	requiredRole: PropTypes.oneOfType([
		PropTypes.string,
		PropTypes.arrayOf(PropTypes.string)
	]),
	children: PropTypes.node.isRequired
};

function App() {
	const [authState, setAuthState] = useState(() => ({
		status: hasForcedLogout() ? "unauthenticated" : "checking",
		currentUser: null
	}));

	const setAuthenticated = useCallback((user) => {
		const normalizedUser = storeAuthenticatedSession(user);
		setAuthState({ status: "authenticated", currentUser: normalizedUser });
	}, []);

	const refreshCurrentUser = useCallback(async () => {
		const user = await loadCurrentUser();
		setAuthenticated(user);
		return user;
	}, [setAuthenticated]);

	const setUnauthenticated = useCallback((forced) => {
		if (forced) {
			markForcedLogout();
		} else {
			clearStoredSession();
		}
		setAuthState({ status: "unauthenticated", currentUser: null });
	}, []);

	useEffect(() => {
		if (hasForcedLogout()) {
			setAuthState({ status: "unauthenticated", currentUser: null });
			return undefined;
		}

		let isMounted = true;

		loadCurrentUser()
			.then((user) => {
				if (isMounted) {
					setAuthenticated(user);
				}
			})
			.catch(() => {
				if (isMounted) {
					setUnauthenticated(false);
				}
			});

		return () => {
			isMounted = false;
		};
	}, [setAuthenticated, setUnauthenticated]);

  return (
    <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
			<Suspense fallback={<PageFallback />}>
				<Routes>
					<Route path="/" element={<LandingPage />} />
					<Route path="/login" element={<LoginRoute authStatus={authState.status} onAuthenticated={setAuthenticated} />} />
					<Route path="/verify-email" element={<VerifyEmail />} />
					<Route path="/reset-password" element={<ResetPassword />} />
					<Route path="/legal/:slug" element={<LegalPage />} />
					<Route
						path="/dashboard"
						element={
							<ProtectedPage authStatus={authState.status} currentUser={authState.currentUser} onLogout={() => setUnauthenticated(true)}>
								<Dashboard />
							</ProtectedPage>
						}
					/>
					<Route
						path="/portfolio"
						element={
							<ProtectedPage authStatus={authState.status} currentUser={authState.currentUser} onLogout={() => setUnauthenticated(true)}>
								<Portfolio />
							</ProtectedPage>
						}
					/>
					<Route
						path="/etfs"
						element={
							<ProtectedPage authStatus={authState.status} currentUser={authState.currentUser} onLogout={() => setUnauthenticated(true)}>
								<Etfs />
							</ProtectedPage>
						}
					/>
					<Route
						path="/performance"
						element={
							<ProtectedPage authStatus={authState.status} currentUser={authState.currentUser} onLogout={() => setUnauthenticated(true)}>
								<Performance />
							</ProtectedPage>
						}
					/>
					<Route
						path="/me"
						element={
							<ProtectedPage authStatus={authState.status} currentUser={authState.currentUser} onLogout={() => setUnauthenticated(true)}>
								<UserData
									currentUser={authState.currentUser}
									refreshCurrentUser={refreshCurrentUser}
									onForcedLogout={() => setUnauthenticated(true)}
								/>
							</ProtectedPage>
						}
					/>
					<Route
						path="/admin"
						element={
							<ProtectedPage
								authStatus={authState.status}
								currentUser={authState.currentUser}
								onLogout={() => setUnauthenticated(true)}
								requiredRole={["ADMIN", "READONLY_ADMIN"]}
							>
								<AdminSettings currentUser={authState.currentUser} refreshCurrentUser={refreshCurrentUser} />
							</ProtectedPage>
						}
					/>
					<Route path="*" element={<Navigate to="/" replace />} />
				</Routes>
			</Suspense>
    </HashRouter>
  );
}

export default App;
