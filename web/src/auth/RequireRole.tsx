import React, { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import type { Role } from "../api/types";

export function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }): JSX.Element {
  const { status, hasAnyRole } = useAuth();
  const location = useLocation();

  if (status === "loading") {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", fontFamily: "system-ui, sans-serif" }}>
        <div>Loading session...</div>
      </div>
    );
  }

  if (status === "anonymous") {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!hasAnyRole(...roles)) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", fontFamily: "system-ui, sans-serif" }}>
        <h2>403 - Forbidden</h2>
        <p>You do not have access to this page.</p>
      </div>
    );
  }

  return <>{children}</>;
}
