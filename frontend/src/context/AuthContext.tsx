import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithCustomToken,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { Role, User } from '../types';
import { DEMO_ACCOUNTS, DEMO_WORKERS, DEMO_SUPERVISOR } from '../data/centralDemoData';
import { triggerBackgroundSync } from '../utils/syncManager';
import { setCompanionSessionToken, getCompanionSessionToken } from '../services/companionService';
import { unregisterDevicePushToken } from '../services/fcmService';

interface AuthContextType {
  role: Role | null;
  user: User | null;
  isAuthenticated: boolean;
  isFirebaseAuthenticated: boolean;
  firebaseUid: string | null;
  firebaseAuthError: string | null;
  isAuthLoading: boolean;
  login: (selectedRole: Role, identifier: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: (roleToAssume?: Role) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_FALLBACK_KEY = 'janmasaathi_auth_session_v3';

function readCachedUser(): User | null {
  try {
    const cached = localStorage.getItem(AUTH_FALLBACK_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed?.role && parsed?.id) {
        return parsed as User;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

function buildUserFromServerAndTemplate(selectedRole: Role, serverUser: any): User {
  const demoTemplate = DEMO_ACCOUNTS[selectedRole]?.user as Partial<User> | undefined;
  if (selectedRole === 'worker') {
    const staffId = String(serverUser?.staffId || serverUser?.id || 'HW-44120').toUpperCase();
    const matchedWorker = DEMO_WORKERS.find((w) => w.id === staffId);
    return {
      ...(demoTemplate || {}),
      id: staffId,
      staffId,
      name: serverUser?.name || matchedWorker?.name || demoTemplate?.name || 'Health Worker',
      role: 'worker',
      phone: serverUser?.phone || matchedWorker?.phone || demoTemplate?.phone || '',
      assignedSubCentre: serverUser?.assignedSubCentre || matchedWorker?.assignedSubCentre || demoTemplate?.assignedSubCentre,
      village: serverUser?.village || matchedWorker?.village || demoTemplate?.village,
      hamlet: serverUser?.hamlet || matchedWorker?.assignedHamlets?.[0] || demoTemplate?.hamlet,
    };
  }
  if (selectedRole === 'supervisor') {
    const staffId = String(serverUser?.staffId || serverUser?.id || DEMO_SUPERVISOR.id).toUpperCase();
    return {
      ...(demoTemplate || {}),
      id: staffId,
      staffId,
      name: serverUser?.name || DEMO_SUPERVISOR.name,
      role: 'supervisor',
      phone: serverUser?.phone || demoTemplate?.phone || '',
      assignedSubCentre: serverUser?.assignedSubCentre || demoTemplate?.assignedSubCentre,
      village: serverUser?.village || demoTemplate?.village,
    };
  }
  const motherId = String(serverUser?.motherId || serverUser?.mcpId || serverUser?.id || 'MCP-2026-0894');
  return {
    ...(demoTemplate || {}),
    id: motherId,
    mcpId: motherId,
    name: serverUser?.name || demoTemplate?.name || 'Verified Mother',
    role: 'mother',
    email: serverUser?.email || demoTemplate?.email,
    phone: serverUser?.phone || demoTemplate?.phone || '',
    assignedWorkerId: serverUser?.assignedWorkerId || demoTemplate?.assignedWorkerId || 'HW-44120',
    assignedWorkerName: serverUser?.assignedWorkerName || demoTemplate?.assignedWorkerName || 'Sunita Devi',
    assignedSubCentre: serverUser?.assignedSubCentre || demoTemplate?.assignedSubCentre,
    village: serverUser?.village || demoTemplate?.village,
    hamlet: serverUser?.hamlet || demoTemplate?.hamlet,
  };
}

async function linkMotherAuthUidIfMissing(motherId: string, uid: string): Promise<void> {
  try {
    const motherRef = doc(db, 'mothers', motherId);
    const snap = await getDoc(motherRef);
    if (snap.exists() && !snap.data()?.authUid) {
      await updateDoc(motherRef, {
        authUid: uid,
        updatedAt: serverTimestamp(),
      });
    }
  } catch {
    // Non-blocking if mother doc does not exist yet or rules disallow
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => readCachedUser());
  const [role, setRole] = useState<Role | null>(() => readCachedUser()?.role || null);
  const [firebaseUid, setFirebaseUid] = useState<string | null>(() => auth.currentUser?.uid || null);
  const [firebaseAuthError, setFirebaseAuthError] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Restore session from cache or Firebase Auth state observer and keep server session token synchronized
  useEffect(() => {
    let isMounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (!isMounted) return;
      setFirebaseUid(firebaseUser?.uid || null);

      if (firebaseUser) {
        setFirebaseAuthError(null);
        const cached = readCachedUser();
        let activeRole: Role = cached?.role || 'mother';
        let syncedUser: User | null = null;
        let resolvedMotherId: string | undefined = cached?.mcpId;
        let resolvedStaffId: string | undefined = cached?.staffId;

        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const snap = await getDoc(userDocRef);

          if (snap.exists()) {
            const data = snap.data();
            activeRole = (data.role as Role) || activeRole;
            resolvedMotherId =
              data.motherId || (activeRole === 'mother' ? cached?.mcpId || 'MCP-2026-0894' : undefined);
            resolvedStaffId =
              data.staffId ||
              (activeRole === 'worker'
                ? cached?.staffId || 'HW-44120'
                : activeRole === 'supervisor'
                ? cached?.staffId || 'SUP-2025-012'
                : undefined);

            syncedUser = buildUserFromServerAndTemplate(activeRole, {
              id: resolvedStaffId || resolvedMotherId || firebaseUser.uid,
              motherId: resolvedMotherId,
              staffId: resolvedStaffId,
              name: data.displayName || firebaseUser.displayName || firebaseUser.email,
              email: firebaseUser.email,
              phone: data.phone,
            });
          }
        } catch (err) {
          console.warn('User profile sync notice:', err);
        }

        if (syncedUser && isMounted) {
          setUser(syncedUser);
          setRole(activeRole);
          localStorage.setItem(AUTH_FALLBACK_KEY, JSON.stringify(syncedUser));
        }

        try {
          const idToken = await firebaseUser.getIdToken();
          const sessRes = await fetch('/api/auth/firebase-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              idToken,
              role: activeRole,
              requestedStaffId: resolvedStaffId,
              requestedMotherId: resolvedMotherId,
            }),
          });
          const sessData = await sessRes.json().catch(() => ({}));
          if (sessRes.ok && sessData?.token) {
            setCompanionSessionToken(sessData.token);
          }
        } catch {
          // ignore transient sync failure when offline
        }
      } else {
        // Logged-out Firebase state or Express credential session: verify existing server session token if cached user exists
        const cachedUser = readCachedUser();
        const existingToken = getCompanionSessionToken();
        if (cachedUser && existingToken) {
          try {
            const res = await fetch('/api/auth/verify-session', {
              method: 'POST',
              headers: { Authorization: `Bearer ${existingToken}` },
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok && data?.token) {
              setCompanionSessionToken(data.token);
            } else if (res.status === 401 && isMounted) {
              setCompanionSessionToken(null);
              setUser(null);
              setRole(null);
              localStorage.removeItem(AUTH_FALLBACK_KEY);
            }
          } catch {
            // Preserve local session when offline
          }
        } else if (cachedUser && !existingToken && isMounted) {
          setUser(null);
          setRole(null);
          localStorage.removeItem(AUTH_FALLBACK_KEY);
        }
      }

      if (isMounted) {
        setIsAuthLoading(false);
      }
    });

    if (typeof auth.authStateReady === 'function') {
      auth.authStateReady().catch(() => {});
    }

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const login = async (
    selectedRole: Role,
    identifier: string,
    pass: string
  ): Promise<{ success: boolean; error?: string }> => {
    const trimmedId = identifier.trim().toLowerCase();
    const trimmedPass = pass.trim();

    if (!trimmedId) {
      return { success: false, error: 'Please enter your registered identity credential.' };
    }
    if (!trimmedPass) {
      return { success: false, error: 'Please enter your secure password.' };
    }

    const demoAccount = DEMO_ACCOUNTS[selectedRole];
    let authEmail: string;
    let expectedStaffId: string | null = null;

    if (selectedRole === 'mother') {
      authEmail = trimmedId;
    } else if (selectedRole === 'worker') {
      expectedStaffId = trimmedId.toUpperCase();
      authEmail = `${trimmedId.replace(/[^a-z0-9]/g, '')}@staff.janmasaathi.gov.in`;
    } else {
      expectedStaffId = trimmedId.toUpperCase();
      authEmail = `${trimmedId.replace(/[^a-z0-9]/g, '')}@supervisor.janmasaathi.gov.in`;
    }

    try {
      // 1. Verify credentials with server auth endpoint & mint scoped session token (+ custom token when SA permits)
      const authEndpoint = selectedRole === 'mother' ? '/api/auth/mother-login' : '/api/auth/staff-login';
      const authPayload =
        selectedRole === 'mother'
          ? { email: trimmedId, password: trimmedPass }
          : { staffId: expectedStaffId, password: trimmedPass, role: selectedRole };

      const serverAuthRes = await fetch(authEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authPayload),
      });
      const serverAuthData = await serverAuthRes.json().catch(() => ({}));
      if (!serverAuthRes.ok || !serverAuthData?.success || !serverAuthData?.token) {
        setCompanionSessionToken(null);
        return {
          success: false,
          error:
            serverAuthData?.error ||
            'Invalid credential or password. Please verify your registered ID.',
        };
      }

      const activeUser = buildUserFromServerAndTemplate(selectedRole, serverAuthData.user);
      setCompanionSessionToken(serverAuthData.token);

      // 2. Establish Firebase Auth identity: prefer minted custom token, else Email/Password if enabled
      let firebaseUser: FirebaseUser | null = null;
      let fbAuthDiagnostic: string | null = null;

      if (serverAuthData.firebaseCustomToken) {
        try {
          const customCred = await signInWithCustomToken(auth, serverAuthData.firebaseCustomToken);
          firebaseUser = customCred.user;
        } catch (customErr: any) {
          fbAuthDiagnostic = customErr?.message || 'Firebase custom token sign-in failed.';
        }
      }

      if (!firebaseUser) {
        try {
          const userCred = await signInWithEmailAndPassword(auth, authEmail, trimmedPass);
          firebaseUser = userCred.user;
        } catch (authErr: any) {
          if (authErr.code === 'auth/user-not-found' || authErr.code === 'auth/invalid-credential') {
            const isKnownMother = selectedRole === 'mother' && trimmedId === demoAccount.identifier.toLowerCase();
            const isKnownWorker = selectedRole === 'worker' && (expectedStaffId === 'HW-44120' || expectedStaffId === 'HW-002');
            const isKnownSupervisor = selectedRole === 'supervisor' && expectedStaffId === 'SUP-2025-012';

            if ((isKnownMother || isKnownWorker || isKnownSupervisor) && trimmedPass === 'demo1234') {
              try {
                const newCred = await createUserWithEmailAndPassword(auth, authEmail, trimmedPass);
                firebaseUser = newCred.user;
              } catch (createErr: any) {
                fbAuthDiagnostic =
                  createErr?.code === 'auth/operation-not-allowed'
                    ? serverAuthData.firebaseCustomTokenUnavailableReason ||
                      'Firebase Email/Password sign-in is disabled and custom token signing is unavailable in this environment.'
                    : createErr?.message || 'Unable to provision Firebase Auth account.';
              }
            }
          } else if (authErr.code === 'auth/operation-not-allowed') {
            fbAuthDiagnostic =
              serverAuthData.firebaseCustomTokenUnavailableReason ||
              'Firebase Email/Password sign-in is disabled on project outr-janmasaathi; use Google Sign-In for direct Firebase Auth.';
          } else {
            fbAuthDiagnostic = authErr?.message || 'Firebase Auth unavailable.';
          }
        }
      }

      // 3. Sync Firestore /users/{uid} and link mothers/{motherId}.authUid if Firebase Auth succeeded
      if (firebaseUser) {
        setFirebaseUid(firebaseUser.uid);
        setFirebaseAuthError(null);
        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          await setDoc(
            userDocRef,
            {
              uid: firebaseUser.uid,
              email: firebaseUser.email || activeUser.email || null,
              role: selectedRole,
              displayName: activeUser.name,
              staffId: activeUser.staffId || null,
              motherId: selectedRole === 'mother' ? activeUser.mcpId || activeUser.id : null,
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
          if (selectedRole === 'mother' && (activeUser.mcpId || activeUser.id)) {
            await linkMotherAuthUidIfMissing(activeUser.mcpId || activeUser.id, firebaseUser.uid);
          }
        } catch (dbErr) {
          console.warn('Firestore user profile sync notice:', dbErr);
        }
      } else {
        // Sign out any lingering stale Firebase Auth session from a previously logged-in different account
        if (auth.currentUser) {
          try {
            await signOut(auth);
          } catch {
            // ignore
          }
        }
        setFirebaseUid(null);
        setFirebaseAuthError(fbAuthDiagnostic);
        if (fbAuthDiagnostic) {
          console.warn('Firebase Auth notice:', fbAuthDiagnostic);
        }
      }

      setUser(activeUser);
      setRole(selectedRole);
      localStorage.setItem(AUTH_FALLBACK_KEY, JSON.stringify(activeUser));
      triggerBackgroundSync(activeUser.id).catch(() => {});

      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Authentication failed. Please verify your credentials and network connection.',
      };
    }
  };

  const loginWithGoogle = async (
    roleToAssume: Role = 'worker'
  ): Promise<{ success: boolean; error?: string }> => {
    setIsAuthLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const res = await signInWithPopup(auth, provider);
      const fbUser = res.user;

      // Respect existing Firestore users/{uid} mapping if already provisioned (e.g., HW-002 vs HW-44120)
      let existingUserDoc: Record<string, any> | null = null;
      try {
        const snap = await getDoc(doc(db, 'users', fbUser.uid));
        if (snap.exists()) {
          existingUserDoc = snap.data();
        }
      } catch {
        // ignore if unavailable
      }

      const resolvedRole: Role = (existingUserDoc?.role as Role) || roleToAssume;
      const staffId =
        existingUserDoc?.staffId ||
        (resolvedRole === 'worker' ? 'HW-44120' : resolvedRole === 'supervisor' ? 'SUP-2025-012' : null);
      const motherId =
        existingUserDoc?.motherId || (resolvedRole === 'mother' ? 'MCP-2026-0894' : null);

      const displayName =
        existingUserDoc?.displayName ||
        fbUser.displayName ||
        (resolvedRole === 'worker'
          ? DEMO_WORKERS.find((w) => w.id === staffId)?.name || 'Sunita Devi'
          : resolvedRole === 'supervisor'
          ? 'Dr. Rajesh Kumar'
          : 'Priya Sharma');

      const userDocRef = doc(db, 'users', fbUser.uid);
      await setDoc(
        userDocRef,
        {
          uid: fbUser.uid,
          email: fbUser.email,
          role: resolvedRole,
          displayName,
          staffId,
          motherId,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      if (resolvedRole === 'mother' && motherId) {
        await linkMotherAuthUidIfMissing(motherId, fbUser.uid);
      }

      const activeUser = buildUserFromServerAndTemplate(resolvedRole, {
        id: staffId || motherId || fbUser.uid,
        motherId,
        staffId,
        name: displayName,
        email: fbUser.email || undefined,
        phone: fbUser.phoneNumber || undefined,
      });

      try {
        const idToken = await fbUser.getIdToken();
        const sessRes = await fetch('/api/auth/firebase-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            idToken,
            role: resolvedRole,
            requestedStaffId: staffId,
            requestedMotherId: motherId,
          }),
        });
        const sessData = await sessRes.json().catch(() => ({}));
        if (sessRes.ok && sessData?.token) {
          setCompanionSessionToken(sessData.token);
        }
      } catch {
        // ignore transient exchange error
      }

      setFirebaseUid(fbUser.uid);
      setFirebaseAuthError(null);
      setUser(activeUser);
      setRole(resolvedRole);
      localStorage.setItem(AUTH_FALLBACK_KEY, JSON.stringify(activeUser));
      triggerBackgroundSync(activeUser.id).catch(() => {});
      return { success: true };
    } catch (err: any) {
      console.error('Google Sign-In error:', err);
      return {
        success: false,
        error: err.message || 'Google Sign-In was cancelled or failed.',
      };
    } finally {
      setIsAuthLoading(false);
    }
  };

  const logout = async () => {
    try {
      await unregisterDevicePushToken();
    } catch {
      // ignore
    }
    try {
      await signOut(auth);
    } catch {
      // ignore
    }
    setCompanionSessionToken(null);
    setFirebaseUid(null);
    setFirebaseAuthError(null);
    setUser(null);
    setRole(null);
    localStorage.removeItem(AUTH_FALLBACK_KEY);
  };

  return (
    <AuthContext.Provider
      value={{
        role,
        user,
        isAuthenticated: !!role && !!user,
        isFirebaseAuthenticated: !!firebaseUid,
        firebaseUid,
        firebaseAuthError,
        isAuthLoading,
        login,
        loginWithGoogle,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
