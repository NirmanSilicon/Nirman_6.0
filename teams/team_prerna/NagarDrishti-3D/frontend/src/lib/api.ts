import { supabase } from './supabase';

const defaultApiBase = import.meta.env.DEV ? 'http://localhost:4000/api' : '/api';
const API_BASE = (import.meta.env.VITE_API_BASE_URL || defaultApiBase).replace(/\/$/, '');

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { isFormData?: boolean } = {}
): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!options.isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (supabase) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || payload.databaseError || `Request failed with status ${response.status}`);
  }
  return payload as T;
}
