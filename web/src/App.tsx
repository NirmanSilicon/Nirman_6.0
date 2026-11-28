import React, { useState, useContext, Suspense, lazy } from "react";
import { Routes, Route, Navigate, Outlet, NavLink, useLocation, useSearchParams } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import { RequireRole } from "./auth/RequireRole";
import { SimulatedContext } from "./components/DataBadge";
import { describeApiError } from "./api/client";
import OverviewPage from "./municipal/OverviewPage";
import LiveZonesPage from "./municipal/LiveZonesPage";
import CrowdAnalyticsPage from "./municipal/CrowdAnalyticsPage";
import PredictivePage from "./municipal/PredictivePage";
import OperationsPage from "./municipal/OperationsPage";
import ReportsPage from "./municipal/ReportsPage";
import ZoneAdminPage from "./municipal/ZoneAdminPage";
import DevicesPage from "./field/DevicesPage";
import MaintenancePage from "./field/MaintenancePage";
import BookingsPage from "./business/BookingsPage";
import LoadingZonesPage from "./business/LoadingZonesPage";
import { LoginShell } from "./login/LoginShell";
import { SHOW_DEMO_LOGINS } from "./login/config";
import { IntroGate } from "./intro/IntroGate";
import type { Role, RegisterBody } from "./api/types";

const LandingPage = lazy(() => import("./landing/LandingPage"));

// --- Root Landing / Home Handler ---
function RootRoute(): JSX.Element | null {
  const { status, roles } = useAuth();

  if (status === "loading") {
    return null;
  }

  if (status === "authenticated") {
    if (roles.has("driver")) {
      return (
        <div style={{ padding: "3rem", textAlign: "center" }}>
          <h2>Driver Account</h2>
          <p>This web dashboard is for municipal, operational, and commercial staff. Drivers should use the ParkSMART mobile app.</p>
        </div>
      );
    }
    return <Navigate to={getHomePath(roles)} replace />;
  }

  return (
    <IntroGate>
      <Suspense fallback={null}>
        <LandingPage />
      </Suspense>
    </IntroGate>
  );
}

// --- Role-based Home Path Helper ---
export function getHomePath(roles: ReadonlySet<Role>): string {
  if (roles.has("municipal_admin") || roles.has("system_admin")) {
    return "/municipal/overview";
  }
  if (roles.has("field_operator")) {
    return "/field/devices";
  }
  if (roles.has("business_operator")) {
    return "/business/bookings";
  }
  return "/login";
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  override render() {
    if (this.state.error) {
      return (
        <div style={{ padding: "2rem", backgroundColor: "#fef2f2", color: "#991b1b", borderRadius: "8px", margin: "1rem" }}>
          <h3>Something went wrong</h3>
          <p>{this.state.error.message}</p>
          <button type="button" onClick={() => this.setState({ error: null })} style={{ padding: "0.4rem 0.8rem" }}>
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- Layout with Role-based Navigation & Simulated Data Banner ---
function Layout(): JSX.Element {
  const { user, roles, logout } = useAuth();
  const { simulatedCount } = useContext(SimulatedContext);

  const homePath = getHomePath(roles);
  const isMunicipal = roles.has("municipal_admin") || roles.has("system_admin");
  const isField = roles.has("field_operator") || roles.has("municipal_admin") || roles.has("system_admin");
  const isBusiness = roles.has("business_operator");

  const isDemoMode = import.meta.env.VITE_DEMO_MODE === "true";

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {isDemoMode && (
        <div
          role="status"
          style={{
            backgroundColor: "#0284c7",
            color: "#ffffff",
            padding: "4px 16px",
            textAlign: "center",
            fontWeight: 700,
            fontSize: "0.75rem",
            letterSpacing: "0.08em",
          }}
        >
          DEMO MODE — Synthetic demo environment
        </div>
      )}
      {/* Persistent Simulated Data Banner */}
      {simulatedCount > 0 && (
        <div
          role="status"
          style={{
            backgroundColor: "#7c3aed",
            color: "#ffffff",
            padding: "8px 16px",
            textAlign: "center",
            fontWeight: 700,
            letterSpacing: "0.05em",
            fontSize: "0.85rem",
          }}
        >
          SIMULATED DATA — Active elements are displaying simulated demo telemetry
        </div>
      )}

      {/* Top Header */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0.75rem 1.5rem",
          backgroundColor: "#1e293b",
          color: "#ffffff",
          borderBottom: "1px solid #334155",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
          <NavLink
            to={homePath}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1.5rem",
              textDecoration: "none",
              color: "inherit",
              cursor: "pointer",
            }}
          >
            <span style={{ fontSize: "1.25rem", fontWeight: 800, letterSpacing: "-0.025em" }}>ParkSMART</span>
            <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>Web Dashboard</span>
          </NavLink>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span style={{ fontSize: "0.85rem", color: "#cbd5e1" }}>
            {user?.full_name} ({user?.roles.join(", ")})
          </span>
          <button
            type="button"
            onClick={() => logout()}
            style={{
              padding: "0.35rem 0.75rem",
              borderRadius: "4px",
              backgroundColor: "#ef4444",
              color: "#ffffff",
              border: "none",
              fontSize: "0.8rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Logout
          </button>
        </div>
      </header>

      {/* Body with Sidebar and Main Content */}
      <div style={{ display: "flex", flex: 1 }}>
        <aside
          style={{
            width: "240px",
            backgroundColor: "#f8fafc",
            borderRight: "1px solid #e2e8f0",
            padding: "1rem 0.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.25rem",
          }}
        >
          {isMunicipal && (
            <>
              <div style={{ padding: "0.5rem 0.75rem", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                Municipal Portal
              </div>
              <NavLink to="/municipal/overview" style={({ isActive }) => navStyle(isActive)}>Overview</NavLink>
              <NavLink to="/municipal/live" style={({ isActive }) => navStyle(isActive)}>Live Zones</NavLink>
              <NavLink to="/municipal/crowd" style={({ isActive }) => navStyle(isActive)}>Crowd Analytics</NavLink>
              <NavLink to="/municipal/predictive" style={({ isActive }) => navStyle(isActive)}>Predictive</NavLink>
              <NavLink to="/municipal/operations" style={({ isActive }) => navStyle(isActive)}>Operations</NavLink>
              <NavLink to="/municipal/reports" style={({ isActive }) => navStyle(isActive)}>Reports</NavLink>
              <NavLink to="/municipal/zones" style={({ isActive }) => navStyle(isActive)}>Zone Admin</NavLink>
            </>
          )}

          {isField && (
            <>
              <div style={{ padding: "0.5rem 0.75rem", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginTop: "0.5rem" }}>
                Field Operations
              </div>
              <NavLink to="/field/devices" style={({ isActive }) => navStyle(isActive)}>Devices</NavLink>
              <NavLink to="/field/maintenance" style={({ isActive }) => navStyle(isActive)}>Maintenance</NavLink>
            </>
          )}

          {isBusiness && (
            <>
              <div style={{ padding: "0.5rem 0.75rem", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginTop: "0.5rem" }}>
                Business Portal
              </div>
              <NavLink to="/business/bookings" style={({ isActive }) => navStyle(isActive)}>Bookings</NavLink>
              <NavLink to="/business/loading-zones" style={({ isActive }) => navStyle(isActive)}>Loading Zones</NavLink>
            </>
          )}
        </aside>

        <main style={{ flex: 1, padding: "1.5rem", backgroundColor: "#ffffff", overflowY: "auto" }}>
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}

function navStyle(isActive: boolean): React.CSSProperties {
  return {
    display: "block",
    padding: "0.5rem 0.75rem",
    borderRadius: "6px",
    textDecoration: "none",
    fontSize: "0.9rem",
    fontWeight: isActive ? 700 : 500,
    backgroundColor: isActive ? "#e2e8f0" : "transparent",
    color: isActive ? "#0f172a" : "#475569",
  };
}

// --- Login / Register Page ---
function LoginPage(): JSX.Element {
  const { login, register, status, roles } = useAuth();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const isRegister = searchParams.get("mode") === "register";

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname;
  const target = from && from !== "/" ? from : getHomePath(roles);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<Role>("municipal_admin");
  const [businessName, setBusinessName] = useState("");
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const demoPassword = typeof import.meta.env !== "undefined" ? import.meta.env.VITE_DEMO_PASSWORD : "";
  const canShowDemo = SHOW_DEMO_LOGINS && import.meta.env.DEV && Boolean(demoPassword);

  if (status === "authenticated") {
    return <Navigate to={target} replace />;
  }

  const switchMode = (mode: "login" | "register") => {
    setErrorMessage(null);
    setNotice(null);
    if (mode === "register") {
      setSearchParams({ mode: "register" });
    } else {
      setSearchParams({});
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setErrorMessage(null);
    try {
      await login(email, password);
    } catch (err) {
      setErrorMessage(describeApiError(err));
    } finally {
      setPending(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 10 || password.length > 128) {
      setErrorMessage("Password must be between 10 and 128 characters");
      return;
    }
    if (role === "business_operator" && !businessName.trim()) {
      setErrorMessage("Business name is required for Business Operators");
      return;
    }

    setPending(true);
    setErrorMessage(null);
    try {
      const payload: RegisterBody = {
        email: email.trim().toLowerCase(),
        password,
        full_name: fullName.trim(),
        role,
        business_name: role === "business_operator" ? businessName.trim() : null,
      };
      const user = await register(payload);
      if (user.status === "pending") {
        setNotice("Registration submitted! Your account is awaiting administrator approval before you can sign in.");
      } else {
        setNotice("Account created successfully. You can now sign in.");
      }
    } catch (err) {
      setErrorMessage(describeApiError(err));
    } finally {
      setPending(false);
    }
  };

  const handleDemoLogin = async (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setPending(true);
    setErrorMessage(null);
    try {
      await login(demoEmail, demoPass);
    } catch (err) {
      setErrorMessage(describeApiError(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <LoginShell>
      <div>
        <h2 style={{ marginTop: 0, marginBottom: "0.35rem" }}>
          {isRegister ? "Register for ParkSMART" : "Sign In to ParkSMART"}
        </h2>
        <p style={{ fontSize: "0.875rem" }}>
          Municipal, Operator &amp; Business Portal
        </p>

        {notice && (
          <div style={{ background: "rgba(34,197,94,0.18)", color: "#D0FFD8", padding: "0.6rem 0.75rem", borderRadius: "10px", marginBottom: "0.75rem", fontSize: "0.85rem" }}>
            {notice}
            <div style={{ marginTop: "0.5rem" }}>
              <button
                type="button"
                onClick={() => switchMode("login")}
                style={{ background: "none", border: "none", padding: 0, color: "#D0FFD8", fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}
              >
                Proceed to Login →
              </button>
            </div>
          </div>
        )}

        {errorMessage && (
          <div style={{ background: "rgba(255,80,80,0.18)", color: "#FFD0D0", padding: "0.6rem 0.75rem", borderRadius: "10px", marginBottom: "0.75rem", fontSize: "0.85rem" }}>
            {errorMessage}
          </div>
        )}

        {isRegister ? (
          !notice && (
            <form onSubmit={handleRegisterSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, marginBottom: "0.25rem" }}>
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={pending}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, marginBottom: "0.25rem" }}>
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={pending}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, marginBottom: "0.25rem" }}>
                  Password (10-128 chars)
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={pending}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, marginBottom: "0.25rem" }}>
                  Account Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as Role)}
                  disabled={pending}
                >
                  <option value="municipal_admin">Municipal admin</option>
                  <option value="business_operator">Business operator</option>
                </select>
              </div>

              {role === "business_operator" && (
                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, marginBottom: "0.25rem" }}>
                    Business Name
                  </label>
                  <input
                    type="text"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    disabled={pending}
                    placeholder="e.g. Acme Logistics"
                  />
                </div>
              )}

              <button type="submit" disabled={pending}>
                {pending ? "Registering..." : "Register"}
              </button>
            </form>
          )
        ) : (
          <>
            <form onSubmit={handleLoginSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, marginBottom: "0.25rem" }}>
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={pending}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, marginBottom: "0.25rem" }}>
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={pending}
                />
              </div>

              <button type="submit" disabled={pending}>
                {pending ? "Signing in..." : "Sign In"}
              </button>
            </form>

            {canShowDemo && (
              <div style={{ marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid rgba(255, 255, 255, 0.15)" }}>
                <p style={{ margin: "0 0 0.4rem 0", fontSize: "0.78rem", fontWeight: 600 }}>
                  One-Click Demo Login (Dev/Mock Mode):
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  {[
                    { label: "Login as Admin", email: import.meta.env.VITE_DEMO_ADMIN_EMAIL, pass: import.meta.env.VITE_DEMO_ADMIN_PASSWORD },
                    { label: "Login as Municipal", email: import.meta.env.VITE_DEMO_MUNICIPAL_EMAIL, pass: import.meta.env.VITE_DEMO_MUNICIPAL_PASSWORD },
                    { label: "Login as Business", email: import.meta.env.VITE_DEMO_BUSINESS_EMAIL, pass: import.meta.env.VITE_DEMO_BUSINESS_PASSWORD },
                    { label: "Login as Driver", email: import.meta.env.VITE_DEMO_DRIVER_EMAIL, pass: import.meta.env.VITE_DEMO_DRIVER_PASSWORD },
                  ]
                    .filter((a) => Boolean(a.email && a.pass))
                    .map((acc) => (
                      <button
                        key={acc.label}
                        type="button"
                        disabled={pending}
                        onClick={() => void handleDemoLogin(acc.email, acc.pass)}
                        style={{ textAlign: "left" }}
                      >
                        {acc.label}
                      </button>
                    ))}
                </div>
              </div>
            )}
          </>
        )}

        <div style={{ marginTop: "0.75rem", textAlign: "center", fontSize: "0.85rem" }}>
          {isRegister ? (
            <>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => switchMode("login")}
                style={{ background: "none", border: "none", padding: 0, color: "inherit", fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}
              >
                Sign In
              </button>
            </>
          ) : (
            <>
              Don't have an account?{" "}
              <button
                type="button"
                onClick={() => switchMode("register")}
                style={{ background: "none", border: "none", padding: 0, color: "inherit", fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}
              >
                Register
              </button>
            </>
          )}
        </div>
      </div>
    </LoginShell>
  );
}

// --- Placeholder & View Pages for Testing ---
function ForbiddenPage(): JSX.Element {
  return (
    <div style={{ padding: "3rem", textAlign: "center" }}>
      <h2>403 - Forbidden</h2>
      <p>You do not have access to this page.</p>
    </div>
  );
}

function NotFoundPage(): JSX.Element {
  const { roles } = useAuth();
  const homePath = getHomePath(roles);

  return (
    <div style={{ padding: "3rem", textAlign: "center" }}>
      <h2>404 - Page Not Found</h2>
      <p>The page you requested does not exist.</p>
      <NavLink to={homePath}>Return Home</NavLink>
    </div>
  );
}

// --- Main App Route Table ---
export default function App(): JSX.Element {
  return (
    <Routes>
      <Route path="/" element={<RootRoute />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<Navigate to="/login?mode=register" replace />} />

      {/* Role-Protected Layout */}
      <Route element={<Layout />}>

        {/* Municipal Routes */}
        <Route
          path="/municipal/overview"
          element={
            <RequireRole roles={["municipal_admin", "system_admin"]}>
              <OverviewPage />
            </RequireRole>
          }
        />
        <Route
          path="/municipal/live"
          element={
            <RequireRole roles={["municipal_admin", "system_admin"]}>
              <LiveZonesPage />
            </RequireRole>
          }
        />
        <Route
          path="/municipal/crowd"
          element={
            <RequireRole roles={["municipal_admin", "system_admin"]}>
              <CrowdAnalyticsPage />
            </RequireRole>
          }
        />
        <Route
          path="/municipal/predictive"
          element={
            <RequireRole roles={["municipal_admin", "system_admin"]}>
              <PredictivePage />
            </RequireRole>
          }
        />
        <Route
          path="/municipal/operations"
          element={
            <RequireRole roles={["municipal_admin", "system_admin"]}>
              <OperationsPage />
            </RequireRole>
          }
        />
        <Route
          path="/municipal/reports"
          element={
            <RequireRole roles={["municipal_admin", "system_admin"]}>
              <ReportsPage />
            </RequireRole>
          }
        />
        <Route
          path="/municipal/zones"
          element={
            <RequireRole roles={["municipal_admin", "system_admin"]}>
              <ZoneAdminPage />
            </RequireRole>
          }
        />

        {/* Field Operator Routes */}
        <Route
          path="/field/devices"
          element={
            <RequireRole roles={["field_operator", "municipal_admin", "system_admin"]}>
              <DevicesPage />
            </RequireRole>
          }
        />
        <Route
          path="/field/maintenance"
          element={
            <RequireRole roles={["field_operator", "municipal_admin", "system_admin"]}>
              <MaintenancePage />
            </RequireRole>
          }
        />

        {/* Business Operator Routes */}
        <Route
          path="/business/bookings"
          element={
            <RequireRole roles={["business_operator"]}>
              <BookingsPage />
            </RequireRole>
          }
        />
        <Route
          path="/business/loading-zones"
          element={
            <RequireRole roles={["business_operator"]}>
              <LoadingZonesPage />
            </RequireRole>
          }
        />
      </Route>

      <Route path="/forbidden" element={<ForbiddenPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
