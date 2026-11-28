import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export const ROLE_LABELS = {
  community: 'Community User',
  reporter: 'Reporter',
  verifier: 'Verifier',
  corrector: 'Corrector',
  admin: 'Admin',
}

export const ROLE_CAPS = {
  community: { canCorrect: false, canQueue: false, canAdmin: false },
  reporter:  { canCorrect: false, canQueue: false, canAdmin: false },
  verifier:  { canCorrect: false, canQueue: true,  canAdmin: false },
  corrector: { canCorrect: true,  canQueue: true,  canAdmin: false },
  admin:     { canCorrect: true,  canQueue: true,  canAdmin: true  },
}

const DEFAULT_PREFERENCES = {
  alertRole: 'citizen',
  distance: 15,
  severity: 1,
  quietHours: false,
  quietStart: '22:00',
  quietEnd: '07:00',
  highConfOnly: true,
  notifPush: true,
  notifSms: false,
  notifEmail: true,
  notifDigest: true,
  locationSubscriptions: ['Southbank', 'Westgate'],
  mutedHazardTypes: [],
  mutedAreas: [],
  persona: 'resident',
  language: 'English',
  notifMode: 'digest',
}

const SESSION_KEY = 'hl_session'
const PREFS_KEY = 'hl_preferences'

function loadJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function saveJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

function getInitials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'U'
}

function normalizeUser(raw) {
  if (!raw) return null
  const role = raw.role || 'community'
  return {
    ...raw,
    id: raw.id || raw._id,
    role,
    avatar: raw.avatarImage ? raw.avatarImage : (raw.avatar || getInitials(raw.name)),
    joinedAt: raw.joinedAt || raw.createdAt || null,
    caps: raw.caps || ROLE_CAPS[role] || ROLE_CAPS.community,
  }
}

function loadStoredSession() {
  const session = loadJson(SESSION_KEY, null)
  // Discard legacy mock sessions or pre-migration admin sessions without admin-collection flag
  if (!session?.token || !session?.user || (session.user.role === 'admin' && !session.user.isAdminAccount)) {
    if (session) localStorage.removeItem(SESSION_KEY)
    return { token: null, user: null }
  }
  return {
    token: session.token,
    user: normalizeUser(session.user),
  }
}

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [{ token, user }, setSession] = useState(loadStoredSession)

  const [preferences, setPreferences] = useState(() => {
    const all = loadJson(PREFS_KEY, {})
    const uid = user?.id
    return {
      ...DEFAULT_PREFERENCES,
      ...(user?.preferences || {}),
      ...(uid && all[uid] ? all[uid] : {}),
    }
  })

  const persistSession = useCallback((nextToken, nextUser) => {
    const normalized = normalizeUser(nextUser)
    if (nextToken && normalized) {
      saveJson(SESSION_KEY, { token: nextToken, user: normalized })
      setSession({ token: nextToken, user: normalized })
      const allPrefs = loadJson(PREFS_KEY, {})
      setPreferences({
        ...DEFAULT_PREFERENCES,
        ...(normalized.preferences || {}),
        ...(allPrefs[normalized.id] || {}),
      })
    } else {
      localStorage.removeItem(SESSION_KEY)
      setSession({ token: null, user: null })
    }
  }, [])

  // Validate stored JWT with backend when online; keep cached session when offline
  useEffect(() => {
    if (!token) return
    if (typeof navigator !== 'undefined' && !navigator.onLine) return

    let cancelled = false
    fetch(`${API_BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (cancelled) return
        if (res.status === 401) {
          persistSession(null, null)
          return
        }
        if (!res.ok) return
        const data = await res.json()
        if (data?.user && !cancelled) {
          persistSession(token, data.user)
        }
      })
      .catch(() => {
        // Keep cached session if server is temporarily unreachable
      })

    return () => {
      cancelled = true
    }
  }, [token, persistSession])

  const login = useCallback(async ({ email, password }) => {
    let res
    try {
      res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
    } catch {
      throw new Error('Unable to reach authentication server. Check that the backend is running.')
    }

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(data.error || 'Invalid email or password')
    }

    persistSession(data.token, data.user)
    return normalizeUser(data.user)
  }, [persistSession])

  const loginAdmin = useCallback(async ({ email, password }) => {
    let res
    try {
      res = await fetch(`${API_BASE_URL}/api/auth/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
    } catch {
      throw new Error('Unable to reach authentication server. Check that the backend is running.')
    }

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(data.error || 'Invalid admin credentials')
    }

    const normalized = normalizeUser(data.user)
    if (!normalized || normalized.role !== 'admin' || !normalized.isAdminAccount) {
      throw new Error('Access denied. Admin collection credentials required.')
    }

    persistSession(data.token, normalized)
    return normalized
  }, [persistSession])

  const register = useCallback(async ({ name, email, password }) => {
    let res
    try {
      res = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })
    } catch {
      throw new Error('Unable to reach authentication server. Check that the backend is running.')
    }

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(data.error || 'Registration failed')
    }

    persistSession(data.token, data.user)
    return normalizeUser(data.user)
  }, [persistSession])

  const logout = useCallback(() => {
    persistSession(null, null)
  }, [persistSession])

  const updateProfile = useCallback(async (updates) => {
    if (!user) return

    const localNext = normalizeUser({
      ...user,
      ...updates,
      avatar: updates.avatarImage ?? (updates.name ? getInitials(updates.name) : user.avatar),
    })
    persistSession(token, localNext)

    if (token && (typeof navigator === 'undefined' || navigator.onLine)) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/profile`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(updates),
        })
        if (res.ok) {
          const data = await res.json()
          if (data?.user) persistSession(token, data.user)
        }
      } catch {
        // Local update already applied
      }
    }
  }, [user, token, persistSession])

  const updatePreferences = useCallback(async (updates) => {
    if (!user) return
    const all = loadJson(PREFS_KEY, {})
    const next = { ...preferences, ...updates }
    all[user.id] = next
    saveJson(PREFS_KEY, all)
    setPreferences(next)

    if (token && (typeof navigator === 'undefined' || navigator.onLine)) {
      try {
        await fetch(`${API_BASE_URL}/api/auth/preferences`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(updates),
        })
      } catch {
        // Local update already applied
      }
    }
  }, [user, token, preferences])

  const incrementReportsCount = useCallback(() => {
    if (!user) return
    const nextUser = { ...user, reportsCount: (user.reportsCount ?? 0) + 1 }
    persistSession(token, nextUser)
  }, [user, token, persistSession])

  const caps = user ? (user.caps || ROLE_CAPS[user.role] || ROLE_CAPS.community) : {}

  return (
    <AuthContext.Provider value={{
      user,
      token,
      caps,
      preferences,
      login,
      loginAdmin,
      register,
      logout,
      updateProfile,
      updatePreferences,
      incrementReportsCount,
      getRoleLabel: (role) => ROLE_LABELS[role] || role,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
