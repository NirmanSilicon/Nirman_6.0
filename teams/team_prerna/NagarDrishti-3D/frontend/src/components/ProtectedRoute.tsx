import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types/domain';

export function ProtectedRoute({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles?: UserRole[];
}) {
  const { session, profile, loading, authError, supabaseConfigured } = useAuth();

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-charcoal/10 p-8 text-center text-sm text-dark-blue-grey">
        Verifying session...
      </div>
    );
  }

  if (!supabaseConfigured) {
    return (
      <div className="bg-white rounded-xl border border-champagne p-6 space-y-2">
        <h2 className="text-lg font-semibold text-forest-green">Authentication Requires Supabase Configuration</h2>
        <p className="text-sm text-charcoal/80">
          Configure the public Supabase URL and publishable key in{' '}
          <code className="px-1.5 py-0.5 bg-warm-ivory rounded">frontend/.env</code> to enable sign-in.
          Protected data workflows also require the backend secret key and database migrations.
        </p>
      </div>
    );
  }

  if (session && !profile && authError) {
    return (
      <div className="bg-white rounded-xl border border-terracotta/40 p-6 space-y-2">
        <h2 className="text-lg font-semibold text-terracotta">Backend Authentication Check Failed</h2>
        <p className="text-sm text-charcoal/80">
          Supabase has an active session, but the backend could not validate its profile. Check the backend Supabase
          environment variables, API URL, and database migrations. Details: {authError}
        </p>
      </div>
    );
  }

  if (!session || !profile) {
    return <Navigate to="/login" replace />;
  }

  if (roles && (!roles.includes(profile.role) || profile.accountStatus !== 'active')) {
    return (
      <div className="bg-white rounded-xl border border-terracotta/40 p-6 space-y-2">
        <h2 className="text-lg font-semibold text-terracotta">Access Restricted</h2>
        <p className="text-sm text-charcoal/80">
          This workspace requires an active <strong>{roles.join(' or ')}</strong> role.
          {profile.accountStatus === 'pending_approval'
            ? ' Your account is currently awaiting administrator approval.'
            : ''}
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
