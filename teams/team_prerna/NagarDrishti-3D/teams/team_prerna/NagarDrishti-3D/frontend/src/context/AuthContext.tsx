import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { apiFetch } from '../lib/api';
import { isFrontendSupabaseConfigured, supabase } from '../lib/supabase';
import type { UserProfile } from '../types/domain';

interface AuthContextValue {
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  authError: string | null;
  supabaseConfigured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (params: {
    email: string;
    password: string;
    fullName: string;
    requestedRole: 'citizen' | 'officer' | 'contractor';
  }) => Promise<{ needsEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const fetchProfile = useCallback(async (activeSession: Session | null) => {
    if (!activeSession) {
      setProfile(null);
      setAuthError(null);
      return;
    }
    try {
      const res = await apiFetch<{ user: UserProfile }>('/auth/me');
      setProfile(res.user);
      setAuthError(null);
    } catch (error) {
      setProfile(null);
      const message = error instanceof Error ? error.message : 'Unable to load the authenticated profile.';
      console.error('Failed to validate the Supabase session with the backend.', error);
      setAuthError(message);
    }
  }, []);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(async ({ data, error }) => {
      if (error) {
        setAuthError(error.message);
        setLoading(false);
        return;
      }
      setSession(data.session);
      await fetchProfile(data.session);
      setLoading(false);
    }).catch((error: unknown) => {
      setAuthError(error instanceof Error ? error.message : 'Unable to load the Supabase session.');
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      queueMicrotask(() => {
        void fetchProfile(nextSession);
      });
    });

    return () => {
      subscription.subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signIn = async (email: string, password: string) => {
    if (!supabase) throw new Error('Supabase Auth is not configured in frontend/.env.');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
  };

  const signUp = async (params: {
    email: string;
    password: string;
    fullName: string;
    requestedRole: 'citizen' | 'officer' | 'contractor';
  }) => {
    if (!supabase) throw new Error('Supabase Auth is not configured in frontend/.env.');
    const { data, error } = await supabase.auth.signUp({
      email: params.email,
      password: params.password,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
        data: {
          full_name: params.fullName,
          requested_role: params.requestedRole,
        },
      },
    });
    if (error) throw new Error(error.message);
    return { needsEmailConfirmation: !data.session };
  };

  const signOut = async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
    setSession(null);
    setProfile(null);
  };

  const requestPasswordReset = async (email: string) => {
    if (!supabase) throw new Error('Supabase Auth is not configured in frontend/.env.');
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw new Error(error.message);
  };

  const refreshProfile = async () => {
    await fetchProfile(session);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        loading,
        authError,
        supabaseConfigured: isFrontendSupabaseConfigured,
        signIn,
        signUp,
        signOut,
        requestPasswordReset,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
