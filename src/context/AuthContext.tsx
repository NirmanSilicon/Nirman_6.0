import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthUser, UserRole, GenderOption } from '../types';
import {
  syncUserRegistrationToSupabase,
  fetchRegisteredUsersFromSupabase,
} from '../utils/supabase';

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (email: string, password?: string, role?: UserRole, name?: string) => Promise<AuthUser>;
  register: (
    name: string,
    email: string,
    password?: string,
    role?: UserRole,
    needs?: string[],
    gender?: GenderOption | string
  ) => Promise<AuthUser>;
  logout: () => void;
  updateUser: (updates: Partial<AuthUser>) => void;
  toggleBookmark: (destinationId: string) => void;
  isBookmarked: (destinationId: string) => boolean;
  demoAccounts: AuthUser[];
  loginAsDemo: (demoId: string) => void;
  accountExists: (email: string) => boolean;
  getRegisteredUser: (email: string) => AuthUser | undefined;
  registeredUsers: AuthUser[];
  // Auth Required Modal & Prompt Interceptor
  isAuthPromptOpen: boolean;
  authPromptMessage: string;
  authModalInitialMode: 'LOGIN' | 'REGISTER';
  openAuthPrompt: (customMessage?: string, initialMode?: 'LOGIN' | 'REGISTER') => void;
  closeAuthPrompt: () => void;
}

export const DEMO_ACCOUNTS: AuthUser[] = [
  {
    id: 'usr-alex',
    name: 'Alex Rivera',
    email: 'alex.rivera@accessway.org',
    password: 'Alex@AccessWay2026!',
    role: 'USER',
    gender: 'NON_BINARY',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    badge: 'Power Wheelchair Explorer',
    joinedDate: 'January 2026',
    savedDestinations: ['dest-taj-mahal', 'dest-louvre', 'dest-gardens-bay', 'dest-sagrada-familia'],
    offlineTripsCount: 4,
    accessibilityNeeds: ['Wheelchair (0-Stairs)', '1:12 Ramp Slope', 'Accessible Restroom'],
  },
  {
    id: 'usr-dr-rajesh',
    name: 'Dr. Rajesh Das',
    email: 'rajesh.das@accessibility-board.gov.in',
    password: 'Rajesh@Auditor2026!',
    role: 'AUDITOR',
    gender: 'MALE',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    badge: 'Senior Certified Accessibility Auditor',
    certificationId: 'AUD-ASI-704 / UN-HABITAT',
    joinedDate: 'October 2025',
    savedDestinations: ['dest-konark', 'dest-taj-mahal', 'dest-golden-temple', 'dest-delhi-airport'],
    offlineTripsCount: 6,
    accessibilityNeeds: ['Auditor Inspection Tools', 'Tactile Verification', 'Slope Inclinometer'],
  },
  {
    id: 'usr-elena',
    name: 'Elena Rostova',
    email: 'elena.rostova@tourism-access.eu',
    password: 'Elena@Admin2026!',
    role: 'ADMIN',
    gender: 'FEMALE',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
    badge: 'Municipal Tourism & Transit Lead',
    certificationId: 'ADM-PARIS-2026',
    joinedDate: 'June 2025',
    savedDestinations: ['dest-eiffel-tower', 'dest-louvre', 'dest-british-museum', 'dest-colosseum'],
    offlineTripsCount: 8,
    accessibilityNeeds: ['Admin Analytics Access', 'Citywide Real-time Dispatch'],
  },
  {
    id: 'usr-maya',
    name: 'Maya Sharma',
    email: 'maya.sharma@traveler.net',
    password: 'Maya@Traveler2026!',
    role: 'USER',
    gender: 'FEMALE',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
    badge: 'Audio Guide & Tactile Travel Enthusiast',
    joinedDate: 'March 2026',
    savedDestinations: ['dest-sensoji', 'dest-smithsonian', 'dest-central-park'],
    offlineTripsCount: 3,
    accessibilityNeeds: ['Audio Navigation', 'Tactile Paving', 'High Contrast Text'],
  },
];

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [registeredUsers, setRegisteredUsers] = useState<AuthUser[]>(() => {
    const saved = localStorage.getItem('accessway_registered_users');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.error(e);
      }
    }
    return DEMO_ACCOUNTS;
  });

  const [user, setUser] = useState<AuthUser | null>(() => {
    const saved = localStorage.getItem('accessway_auth_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return null;
  });

  // Compulsory Auth Prompt Interceptor State
  const [isAuthPromptOpen, setIsAuthPromptOpen] = useState(false);
  const [authPromptMessage, setAuthPromptMessage] = useState(
    'Please sign in or register to book your trip and calculate verified accessible routes.'
  );
  const [authModalInitialMode, setAuthModalInitialMode] = useState<'LOGIN' | 'REGISTER'>('REGISTER');

  const openAuthPrompt = (
    customMessage = 'Please sign in or register to book your trip and plan accessible routes.',
    initialMode: 'LOGIN' | 'REGISTER' = 'REGISTER'
  ) => {
    setAuthPromptMessage(customMessage);
    setAuthModalInitialMode(initialMode);
    setIsAuthPromptOpen(true);
  };

  const closeAuthPrompt = () => {
    setIsAuthPromptOpen(false);
  };

  // Hydrate registered users from Supabase and Server on load
  useEffect(() => {
    const loadSupabaseUsers = async () => {
      try {
        const users = await fetchRegisteredUsersFromSupabase();
        if (users && users.length > 0) {
          setRegisteredUsers((prev) => {
            const merged = [...prev];
            for (const u of users) {
              const idx = merged.findIndex(
                (m) => m.email.trim().toLowerCase() === u.email.trim().toLowerCase()
              );
              if (idx >= 0) {
                merged[idx] = {
                  ...merged[idx],
                  ...u,
                  password: u.password || merged[idx].password,
                };
              } else {
                merged.push(u);
              }
            }
            return merged;
          });
        }
      } catch (err) {
        console.warn('Initial Supabase user hydration error:', err);
      }
    };
    loadSupabaseUsers();
  }, []);

  useEffect(() => {
    localStorage.setItem('accessway_registered_users', JSON.stringify(registeredUsers));
  }, [registeredUsers]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('accessway_auth_user', JSON.stringify(user));
      localStorage.setItem('accessway_role', user.role);
    } else {
      localStorage.removeItem('accessway_auth_user');
    }
  }, [user]);

  const accountExists = (email: string): boolean => {
    if (!email || !email.trim()) return false;
    const cleanEmail = email.trim().toLowerCase();
    return registeredUsers.some((u) => u.email.trim().toLowerCase() === cleanEmail);
  };

  const getRegisteredUser = (email: string): AuthUser | undefined => {
    if (!email || !email.trim()) return undefined;
    const cleanEmail = email.trim().toLowerCase();
    return registeredUsers.find((u) => u.email.trim().toLowerCase() === cleanEmail);
  };

  const login = async (
    email: string,
    password?: string,
    role?: UserRole,
    name?: string
  ): Promise<AuthUser> => {
    await new Promise((res) => setTimeout(res, 400));
    const cleanEmail = email.trim().toLowerCase();
    const existing = registeredUsers.find((d) => d.email.trim().toLowerCase() === cleanEmail);

    if (!existing) {
      throw new Error(
        `NO_ACCOUNT_FOUND: No registered account found with email "${email}". Please register first.`
      );
    }

    // Strictly validate password against registered password
    if (existing.password) {
      if (!password || !password.trim()) {
        throw new Error(`PASSWORD_REQUIRED: Please enter the password for "${email}".`);
      }
      if (password !== existing.password) {
        throw new Error(
          `INVALID_PASSWORD: Incorrect password for "${email}". Please enter the registered password.`
        );
      }
    } else if (password && password.trim()) {
      // For any existing account without password, save provided password
      existing.password = password;
      setRegisteredUsers((users) =>
        users.map((u) => (u.id === existing.id ? { ...u, password } : u))
      );
    }

    // If role changed upon login, update it
    const updatedUser: AuthUser = role && role !== existing.role ? { ...existing, role } : existing;
    setUser(updatedUser);
    return updatedUser;
  };

  const register = async (
    name: string,
    email: string,
    password?: string,
    role: UserRole = 'USER',
    needs: string[] = [],
    gender?: GenderOption | string
  ): Promise<AuthUser> => {
    await new Promise((res) => setTimeout(res, 500));
    const cleanEmail = email.trim().toLowerCase();
    const existingIndex = registeredUsers.findIndex(
      (u) => u.email.trim().toLowerCase() === cleanEmail
    );

    const savedPassword =
      password?.trim() ||
      (existingIndex >= 0 ? registeredUsers[existingIndex].password : undefined);

    if (!savedPassword) {
      throw new Error('PASSWORD_REQUIRED: Please enter your chosen password to register.');
    }

    const newUser: AuthUser = {
      id: existingIndex >= 0 ? registeredUsers[existingIndex].id : `usr-${Date.now()}`,
      name: name.trim(),
      email: cleanEmail,
      password: savedPassword,
      role: role || (existingIndex >= 0 ? registeredUsers[existingIndex].role : 'USER'),
      gender: gender || (existingIndex >= 0 ? registeredUsers[existingIndex].gender : 'PREFER_NOT_TO_SAY'),
      joinedDate: existingIndex >= 0 ? registeredUsers[existingIndex].joinedDate : 'August 2026',
      badge:
        role === 'AUDITOR'
          ? 'Certified Accessibility Auditor'
          : role === 'ADMIN'
          ? 'System Administrator'
          : 'Accessible Explorer',
      savedDestinations: existingIndex >= 0 ? registeredUsers[existingIndex].savedDestinations : [],
      offlineTripsCount: existingIndex >= 0 ? registeredUsers[existingIndex].offlineTripsCount : 0,
      accessibilityNeeds:
        needs.length > 0
          ? needs
          : existingIndex >= 0 && registeredUsers[existingIndex].accessibilityNeeds?.length > 0
          ? registeredUsers[existingIndex].accessibilityNeeds
          : ['Step-Free Access', 'Audio Guidance'],
    };

    setRegisteredUsers((prev) => {
      const filtered = prev.filter((u) => u.email.trim().toLowerCase() !== cleanEmail);
      return [newUser, ...filtered];
    });

    setUser(newUser);

    // Save to Supabase Cloud Database
    try {
      syncUserRegistrationToSupabase(newUser);
    } catch (e) {
      console.warn('Background Supabase registration sync:', e);
    }

    return newUser;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('accessway_auth_user');
  };

  const updateUser = (updates: Partial<AuthUser>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...updates };
      try {
        localStorage.setItem('accessway_auth_user', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to persist user profile updates:', e);
      }
      setRegisteredUsers((users) =>
        users.map((u) => (u.id === updated.id ? updated : u))
      );
      // Sync update to Supabase
      try {
        syncUserRegistrationToSupabase(updated);
      } catch (_) {}
      return updated;
    });
  };

  const toggleBookmark = (destinationId: string) => {
    setUser((prev) => {
      if (!prev) return prev;
      const isSaved = prev.savedDestinations.includes(destinationId);
      const updatedDestinations = isSaved
        ? prev.savedDestinations.filter((id) => id !== destinationId)
        : [...prev.savedDestinations, destinationId];
      const updatedUser = { ...prev, savedDestinations: updatedDestinations };
      setRegisteredUsers((users) =>
        users.map((u) => (u.id === updatedUser.id ? updatedUser : u))
      );
      // Sync bookmark update to Supabase
      try {
        syncUserRegistrationToSupabase(updatedUser);
      } catch (_) {}
      return updatedUser;
    });
  };

  const isBookmarked = (destinationId: string): boolean => {
    return user ? user.savedDestinations.includes(destinationId) : false;
  };

  const loginAsDemo = (demoId: string) => {
    const account = DEMO_ACCOUNTS.find((a) => a.id === demoId);
    if (account) {
      setUser(account);
      // Ensure in registered users
      setRegisteredUsers((prev) => {
        if (!prev.some((u) => u.id === account.id)) {
          return [account, ...prev];
        }
        return prev;
      });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        updateUser,
        toggleBookmark,
        isBookmarked,
        demoAccounts: DEMO_ACCOUNTS,
        loginAsDemo,
        accountExists,
        getRegisteredUser,
        registeredUsers,
        isAuthPromptOpen,
        authPromptMessage,
        authModalInitialMode,
        openAuthPrompt,
        closeAuthPrompt,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
