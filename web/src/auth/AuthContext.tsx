import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { api, tokenStore, refreshTokens } from "../api/client";
import type { Role, UserOut, TokenPair, RegisterBody } from "../api/types";

export type AuthStatus = "loading" | "authenticated" | "anonymous";

export interface AuthValue {
  status: AuthStatus;
  user: UserOut | null;
  roles: ReadonlySet<Role>;
  login(email: string, password: string): Promise<void>;
  register(body: RegisterBody): Promise<UserOut>;
  logout(): Promise<void>;
  hasAnyRole(...r: Role[]): boolean;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<UserOut | null>(null);
  const [roles, setRoles] = useState<ReadonlySet<Role>>(new Set<Role>());
  const lastFetchedRef = useRef<number>(0);

  const fetchProfile = useCallback(async (): Promise<UserOut | null> => {
    try {
      const u = await api<UserOut>("/users/me");
      setUser(u);
      setRoles(new Set(u.roles));
      lastFetchedRef.current = Date.now();
      return u;
    } catch {
      return null;
    }
  }, []);

  // Bootstrap session on mount
  useEffect(() => {
    let mounted = true;
    async function bootstrap() {
      if (import.meta.env.DEV) {
        if (mounted) {
          setUser({
            id: "demo-admin",
            email: "admin@parksmart.demo",
            full_name: "Demo Admin",
            phone: null,
            status: "approved",
            roles: ["system_admin", "municipal_admin"],
            created_at: new Date().toISOString(),
          });
          setRoles(new Set<Role>(["system_admin", "municipal_admin"]));
          setStatus("authenticated");
        }
        return;
      }
      tokenStore.load();
      if (tokenStore.refresh) {
        const refreshed = await refreshTokens();
        if (refreshed && mounted) {
          const profile = await fetchProfile();
          if (profile && mounted) {
            setStatus("authenticated");
            return;
          }
        }
      }
      if (mounted) {
        setUser(null);
        setRoles(new Set());
        setStatus("anonymous");
      }
    }
    bootstrap();

    // Listen for auth loss
    function handleAuthLost() {
      if (mounted) {
        tokenStore.clear();
        setUser(null);
        setRoles(new Set());
        setStatus("anonymous");
      }
    }

    window.addEventListener("auth:lost", handleAuthLost);
    return () => {
      mounted = false;
      window.removeEventListener("auth:lost", handleAuthLost);
    };
  }, [fetchProfile]);

  // Window focus re-fetch after 60s
  useEffect(() => {
    function onFocus() {
      if (status === "authenticated" && Date.now() - lastFetchedRef.current > 60000) {
        fetchProfile();
      }
    }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [status, fetchProfile]);

  const login = useCallback(
    async (email: string, password: string): Promise<void> => {
      const pair = await api<TokenPair>("/auth/login", {
        method: "POST",
        body: { email, password },
        auth: false,
      });
      tokenStore.save(pair);
      const profile = await fetchProfile();
      if (!profile) {
        throw new Error("Failed to load user profile after login");
      }
      setStatus("authenticated");
    },
    [fetchProfile]
  );

  const register = useCallback(async (body: RegisterBody): Promise<UserOut> => {
    const created = await api<UserOut>("/auth/register", {
      method: "POST",
      body,
      auth: false,
    });
    return created;
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    const refreshToken = tokenStore.refresh;
    if (refreshToken) {
      try {
        await api<void>("/auth/logout", {
          method: "POST",
          body: { refresh_token: refreshToken },
          auth: false,
        });
      } catch {
        // Errors ignored on logout per spec
      }
    }
    tokenStore.clear();
    setUser(null);
    setRoles(new Set());
    setStatus("anonymous");
    window.dispatchEvent(new CustomEvent("auth:logout"));
  }, []);

  const hasAnyRole = useCallback(
    (...r: Role[]): boolean => {
      if (r.length === 0) return true;
      return r.some((role) => roles.has(role));
    },
    [roles]
  );

  const value: AuthValue = {
    status,
    user,
    roles,
    login,
    register,
    logout,
    hasAnyRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
