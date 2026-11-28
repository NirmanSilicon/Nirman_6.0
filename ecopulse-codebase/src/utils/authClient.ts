import { UserEcoState } from '../types/eco';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export interface AuthResult {
  ok: boolean;
  user?: AuthUser;
  error?: string;
  retryAfterSeconds?: number;
}

function parseRateLimitSeconds(resp: Response): number | undefined {
  const hdr = resp.headers.get('x-retry-after') || resp.headers.get('retry-after');
  if (!hdr) return undefined;
  const parsed = Number(hdr);
  return Number.isFinite(parsed) && parsed > 0 ? Math.ceil(parsed) : 10;
}

export async function fetchCurrentSession(): Promise<AuthUser | null> {
  try {
    const resp = await fetch('/api/auth/get-session', {
      method: 'GET',
      credentials: 'include',
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    if (data?.user?.id) {
      return {
        id: String(data.user.id),
        email: String(data.user.email || ''),
        name: String(data.user.name || data.user.email || 'EcoPulse User'),
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function signUpWithEmail(params: {
  name: string;
  email: string;
  password: string;
}): Promise<AuthResult> {
  try {
    const resp = await fetch('/api/auth/sign-up/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(params),
    });

    if (resp.status === 429) {
      const wait = parseRateLimitSeconds(resp) ?? 10;
      return {
        ok: false,
        retryAfterSeconds: wait,
        error: `Too many attempts right now. Please wait ${wait} seconds and try again.`,
      };
    }

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      return {
        ok: false,
        error: data?.message || data?.error || 'Could not create account. Check your email and password (min 8 chars).',
      };
    }

    const user = data?.user
      ? {
          id: String(data.user.id),
          email: String(data.user.email || params.email),
          name: String(data.user.name || params.name),
        }
      : await fetchCurrentSession();

    return { ok: true, user: user ?? undefined };
  } catch {
    return { ok: false, error: 'Network error while signing up. Please try again.' };
  }
}

export async function signInWithEmail(params: {
  email: string;
  password: string;
}): Promise<AuthResult> {
  try {
    const resp = await fetch('/api/auth/sign-in/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(params),
    });

    if (resp.status === 429) {
      const wait = parseRateLimitSeconds(resp) ?? 10;
      return {
        ok: false,
        retryAfterSeconds: wait,
        error: `Too many sign-in attempts. Please wait ${wait} seconds and try again.`,
      };
    }

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      return {
        ok: false,
        error: data?.message || data?.error || 'Invalid email or password.',
      };
    }

    const user = data?.user
      ? {
          id: String(data.user.id),
          email: String(data.user.email || params.email),
          name: String(data.user.name || params.email),
        }
      : await fetchCurrentSession();

    return { ok: true, user: user ?? undefined };
  } catch {
    return { ok: false, error: 'Network error while signing in. Please try again.' };
  }
}

export async function signOutSession(): Promise<void> {
  try {
    await fetch('/api/auth/sign-out', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: '{}',
    });
  } catch {
    // ignore
  }
}

export async function loadRemoteEcoState(): Promise<UserEcoState | null> {
  try {
    const resp = await fetch('/api/eco-state', {
      method: 'GET',
      credentials: 'include',
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return (data?.state as UserEcoState | null) ?? null;
  } catch {
    return null;
  }
}

export async function saveRemoteEcoState(state: UserEcoState): Promise<void> {
  try {
    await fetch('/api/eco-state', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ state }),
    });
  } catch {
    // non-blocking sync
  }
}
