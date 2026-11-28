import type { NextFunction, Request, Response } from 'express';
import { getSupabaseAdmin, getSupabaseAnon } from '../config/supabase.js';

export type UserRole = 'citizen' | 'officer' | 'contractor' | 'admin';

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  requestedRole: string | null;
  accountStatus: 'active' | 'pending_approval' | 'suspended';
  departmentId: string | null;
  contractorId: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required. Missing Bearer token.' });
    return;
  }

  const token = authHeader.slice('Bearer '.length).trim();
  const anon = getSupabaseAnon();
  const admin = getSupabaseAdmin();

  if (!anon || !admin) {
    res.status(503).json({
      error: 'Supabase authentication is not configured on the backend yet.',
      code: 'SUPABASE_NOT_CONFIGURED',
    });
    return;
  }

  const { data: userData, error: authError } = await anon.auth.getUser(token);
  if (authError) {
    const status = authError.status === 401 ? 401 : 503;
    res.status(status).json({
      error: status === 401 ? 'Invalid or expired authentication session.' : 'Supabase Auth is temporarily unavailable.',
      code: status === 401 ? 'INVALID_SESSION' : 'AUTH_SERVICE_UNAVAILABLE',
    });
    return;
  }
  if (!userData.user) {
    res.status(401).json({ error: 'Invalid or expired authentication session.' });
    return;
  }

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('id, email, full_name, role, requested_role, account_status, department_id, contractor_id')
    .eq('id', userData.user.id)
    .single();

  if (profileError?.code === 'PGRST205') {
    res.status(503).json({
      error: 'Supabase profile tables are not available. Apply database migrations 001-005.',
      code: 'DATABASE_SCHEMA_NOT_READY',
    });
    return;
  }
  if (profileError && profileError.code !== 'PGRST116') {
    res.status(500).json({
      error: 'Failed to load the authenticated user profile from Supabase.',
      code: 'PROFILE_QUERY_FAILED',
    });
    return;
  }
  if (!profile) {
    res.status(403).json({ error: 'User profile not found.' });
    return;
  }

  if (profile.account_status === 'suspended') {
    res.status(403).json({ error: 'Account is suspended. Contact an administrator.' });
    return;
  }

  req.user = {
    id: profile.id,
    email: profile.email,
    fullName: profile.full_name,
    role: profile.role as UserRole,
    requestedRole: profile.requested_role,
    accountStatus: profile.account_status,
    departmentId: profile.department_id,
    contractorId: profile.contractor_id,
  };

  next();
}

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    if (req.user.accountStatus !== 'active') {
      res.status(403).json({
        error: 'Your account is pending administrator approval before privileged actions are permitted.',
      });
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: `Insufficient permissions. Required role: ${allowedRoles.join(' or ')}.`,
      });
      return;
    }
    next();
  };
}
