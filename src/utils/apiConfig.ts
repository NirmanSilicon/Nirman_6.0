/**
 * Production-Safe API Configuration & Endpoint Resolver
 * Automatically resolves the backend server URL across AI Studio preview,
 * custom domains, static hosting proxies, and containerized deployments.
 */

export function getApiBaseUrl(): string {
  // Check client-side environment variables if frontend is separated from backend
  const metaEnv = typeof import.meta !== 'undefined' ? (import.meta as Record<string, any>).env : undefined;
  const envUrl =
    (metaEnv?.VITE_API_URL as string | undefined) ||
    (metaEnv?.VITE_BACKEND_URL as string | undefined) ||
    '';

  return envUrl.trim().replace(/\/$/, '');
}

export function getApiEndpoint(endpointPath: string): string {
  const base = getApiBaseUrl();
  const cleanPath = endpointPath.startsWith('/') ? endpointPath : `/${endpointPath}`;
  return `${base}${cleanPath}`;
}

export const API_ENDPOINTS = {
  SUGAMYA_CHAT: '/api/sugamya/chat',
  GEMINI_CHAT: '/api/gemini/chat',
  CHAT_FALLBACK: '/api/chat',
  ANALYZE_BARRIER: '/api/gemini/analyze-barrier',
  DESTINATIONS: '/api/destinations',
  BARRIERS: '/api/barriers',
  HOTELS_SEARCH: '/api/hotels/search',
  BOOKINGS: '/api/bookings',
  ROUTE_PLAN: '/api/routes/plan',
  ROUTE_RECALCULATE: '/api/routes/recalculate',
  ADMIN_ANALYTICS: '/api/admin/analytics',
  HEALTH: '/api/health',
  PAYMENTS_RAZORPAY_CONFIG: '/api/payments/razorpay/config',
  PAYMENTS_RAZORPAY_CREATE_ORDER: '/api/payments/razorpay/create-order',
  PAYMENTS_RAZORPAY_VERIFY: '/api/payments/razorpay/verify',
  SUPABASE_STATUS: '/api/supabase/status',
  SUPABASE_SYNC: '/api/supabase/sync-all',
  AUTH_USERS: '/api/auth/users',
  TRIPS: '/api/trips',
  OFFLINE_DOCS: '/api/offline-documents',
};
