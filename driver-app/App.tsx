import React, { createContext, useContext, useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { api, API_BASE, describeApiError, onAuthLost, refreshTokens, setAccessToken } from "./src/api/client";
import { TokenPair, UserOut } from "./src/api/types";
import { SessionStore } from "./src/auth/SessionStore";
import { SimulatedProvider, useSimulatedValue } from "./src/components/DataBadge";
import { MapScreen } from "./src/screens/MapScreen";
import { ZoneDetailScreen } from "./src/screens/ZoneDetailScreen";
import { InsightsScreen } from "./src/screens/InsightsScreen";
import { BookingsScreen } from "./src/screens/BookingsScreen";

// -------------------------------------------------------------
// Auth & Session Context
// -------------------------------------------------------------

interface SessionContextType {
  status: "loading" | "anonymous" | "authenticated";
  user: UserOut | null;
  login: (email: string, pass: string) => Promise<void>;
  register: (fullName: string, email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
}

const SessionContext = createContext<SessionContextType>({
  status: "loading",
  user: null,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
});

export const useSession = () => useContext(SessionContext);

// -------------------------------------------------------------
// Global Simulated Data Banner Component
// -------------------------------------------------------------

function SimulatedDataBanner(): JSX.Element | null {
  const simulatedCount = useSimulatedValue();

  if (simulatedCount <= 0) return null;

  return (
    <View style={styles.simulatedBanner}>
      <Text style={styles.simulatedBannerText}>
        ⚠️ SIMULATED DATA — Model estimates & synthetic sensor observations
      </Text>
    </View>
  );
}

// -------------------------------------------------------------
// Login Screen (with Demo Driver button)
// -------------------------------------------------------------

function LoginScreen({ onSwitchToRegister }: { onSwitchToRegister: () => void }) {
  const { login } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [slowConnect, setSlowConnect] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading) {
      setSlowConnect(false);
      return;
    }
    const t = setTimeout(() => setSlowConnect(true), 5000);
    return () => clearTimeout(t);
  }, [loading]);

  const handleLogin = async (eUser?: string, ePass?: string) => {
    setError(null);
    setLoading(true);
    try {
      await login(eUser || email, ePass || password);
    } catch (err) {
      setError(describeApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    const demoEmail = process.env.EXPO_PUBLIC_DEMO_DRIVER_EMAIL || "driver@parksmart.demo";
    setEmail(demoEmail);
    setError(null);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.authContainer}
    >
      <View style={styles.authCard}>
        <View style={styles.authLogoBox}>
          <Text style={styles.authLogoText}>🅿️ ParkSMART</Text>
          <Text style={styles.authTagline}>Predictive Smart Parking for Bhubaneswar</Text>
        </View>

        {error && (
          <View style={styles.authErrorBox}>
            <Text style={styles.authErrorText}>⚠️ {error}</Text>
          </View>
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
          <TextInput
            style={styles.textInput}
            placeholder="driver@example.com"
            placeholderTextColor="#64748B"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>PASSWORD</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Min. 10 characters"
            placeholderTextColor="#64748B"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>

        <TouchableOpacity
          style={[styles.authSubmitBtn, loading && styles.btnDisabled]}
          onPress={() => handleLogin()}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <ActivityIndicator color="#FFFFFF" />
              {slowConnect && <Text style={styles.authSubmitBtnText}>Still connecting...</Text>}
            </View>
          ) : (
            <Text style={styles.authSubmitBtnText}>Sign In as Driver</Text>
          )}
        </TouchableOpacity>

        {/* Demo Driver Prefill Button (Dev mode only) */}
        {__DEV__ && (
          <>
            <TouchableOpacity
              style={styles.demoBtn}
              onPress={handleDemoLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={styles.demoBtnText}>⚡ Prefill Demo Driver Email</Text>
            </TouchableOpacity>
            <Text style={{ color: "#64748B", fontSize: 11, textAlign: "center", marginTop: 8 }}>
              API: {API_BASE}
            </Text>
          </>
        )}

        <View style={styles.switchAuthRow}>
          <Text style={styles.switchAuthPrompt}>New to ParkSMART? </Text>
          <TouchableOpacity onPress={onSwitchToRegister}>
            <Text style={styles.switchAuthLink}>Create Driver Account</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// -------------------------------------------------------------
// Register Screen
// -------------------------------------------------------------

function RegisterScreen({ onSwitchToLogin }: { onSwitchToLogin: () => void }) {
  const { register } = useSession();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [slowConnect, setSlowConnect] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading) {
      setSlowConnect(false);
      return;
    }
    const t = setTimeout(() => setSlowConnect(true), 5000);
    return () => clearTimeout(t);
  }, [loading]);

  const handleRegister = async () => {
    if (!fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (password.length < 10 || password.length > 128) {
      setError("Password must be between 10 and 128 characters.");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await register(fullName, email, password);
    } catch (err) {
      setError(describeApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.authContainer}
    >
      <View style={styles.authCard}>
        <View style={styles.authLogoBox}>
          <Text style={styles.authLogoText}>🅿️ ParkSMART</Text>
          <Text style={styles.authTagline}>Register Legal Driver Account</Text>
        </View>

        {error && (
          <View style={styles.authErrorBox}>
            <Text style={styles.authErrorText}>⚠️ {error}</Text>
          </View>
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>FULL NAME</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. Biswanath Mohapatra"
            placeholderTextColor="#64748B"
            value={fullName}
            onChangeText={setFullName}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
          <TextInput
            style={styles.textInput}
            placeholder="driver@example.com"
            placeholderTextColor="#64748B"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>PASSWORD (MIN 10 CHARS)</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Secure password"
            placeholderTextColor="#64748B"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>

        <TouchableOpacity
          style={[styles.authSubmitBtn, loading && styles.btnDisabled]}
          onPress={handleRegister}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.authSubmitBtnText}>Complete Registration</Text>
          )}
        </TouchableOpacity>

        <View style={styles.switchAuthRow}>
          <Text style={styles.switchAuthPrompt}>Already registered? </Text>
          <TouchableOpacity onPress={onSwitchToLogin}>
            <Text style={styles.switchAuthLink}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// -------------------------------------------------------------
// Navigation Param Types (Typed Navigation)
// -------------------------------------------------------------

export type RootStackParamList = {
  MainTabs: undefined;
  ZoneDetail: { zoneId: string };
};

export type TabParamList = {
  Map: undefined;
  Insights: undefined;
  Bookings: undefined;
};

// -------------------------------------------------------------
// Navigation Navigators (Bottom Tabs + Stack)
// -------------------------------------------------------------

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: "#0F172A" },
        headerTintColor: "#F8FAFC",
        headerTitleStyle: { fontWeight: "800", fontSize: 18 },
        tabBarStyle: {
          backgroundColor: "#0F172A",
          borderTopColor: "#1E293B",
          height: Platform.OS === "ios" ? 84 : 64,
          paddingBottom: Platform.OS === "ios" ? 24 : 10,
          paddingTop: 8,
        },
        tabBarActiveTintColor: "#38BDF8",
        tabBarInactiveTintColor: "#64748B",
        tabBarLabelStyle: { fontSize: 11, fontWeight: "700" },
      }}
    >
      <Tab.Screen
        name="Map"
        component={MapScreen}
        options={{
          title: "Explore Parking",
          tabBarLabel: "Map",
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>🗺️</Text>,
        }}
      />
      <Tab.Screen
        name="Insights"
        component={InsightsScreen}
        options={{
          title: "AI Availability Insights",
          tabBarLabel: "Insights",
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>📈</Text>,
        }}
      />
      <Tab.Screen
        name="Bookings"
        component={BookingsScreen}
        options={{
          title: "My Reservations",
          tabBarLabel: "Bookings",
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>🎟️</Text>,
        }}
      />
    </Tab.Navigator>
  );
}

// -------------------------------------------------------------
// Main App Component with Lifecycle Bootstrap
// -------------------------------------------------------------

export default function App(): JSX.Element {
  const [authStatus, setAuthStatus] = useState<"loading" | "anonymous" | "authenticated">("loading");
  const [user, setUser] = useState<UserOut | null>(null);
  const [showRegister, setShowRegister] = useState<boolean>(false);

  // Bootstrap session from SecureStore on mount
  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Bootstrap timeout")), 5000)
        );

        await Promise.race([
          (async () => {
            const storedRefresh = await SessionStore.load();
            if (storedRefresh) {
              const success = await refreshTokens();
              if (success) {
                const me = await api<UserOut>("/users/me");
                if (!me.roles.includes("driver")) {
                  await SessionStore.clear();
                  setAccessToken(null);
                } else if (isMounted) {
                  setUser(me);
                  setAuthStatus("authenticated");
                  return;
                }
              }
            }
          })(),
          timeoutPromise,
        ]);
      } catch {
        // Fall back to anonymous on storage error or timeout
      }
      if (isMounted) setAuthStatus("anonymous");
    };

    bootstrap();

    const unsub = onAuthLost(() => {
      if (isMounted) {
        setUser(null);
        setAuthStatus("anonymous");
      }
    });

    return () => {
      isMounted = false;
      unsub();
    };
  }, []);

  const login = async (email: string, pass: string) => {
    const tokens = await api<TokenPair>("/auth/login", {
      method: "POST",
      body: { email, password: pass },
      auth: false,
      timeoutMs: 25000,
      retries: 1,
    });
    setAccessToken(tokens.access_token, tokens.expires_in);
    await SessionStore.save(tokens.refresh_token);
    const me = await api<UserOut>("/users/me");
    if (!me.roles.includes("driver")) {
      await SessionStore.clear();
      setAccessToken(null);
      throw new Error("This app is for drivers only. Non-driver accounts cannot sign in here.");
    }
    setUser(me);
    setAuthStatus("authenticated");
  };

  const register = async (fullName: string, email: string, pass: string) => {
    await api<UserOut>("/auth/register", {
      method: "POST",
      body: { full_name: fullName, email, password: pass, role: "driver" },
      auth: false,
    });
    // Auto-login driver after registration
    await login(email, pass);
  };

  const logout = async () => {
    try {
      const stored = await SessionStore.load();
      if (stored) {
        await api("/auth/logout", {
          method: "POST",
          body: { refresh_token: stored },
          auth: false,
        });
      }
    } catch {
      // Swallowed
    }
    await SessionStore.clear();
    setUser(null);
    setAuthStatus("anonymous");
  };

  if (authStatus === "loading") {
    return (
      <View style={styles.splashContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
        <Text style={styles.splashLogo}>🅿️</Text>
        <Text style={styles.splashTitle}>ParkSMART</Text>
        <Text style={styles.splashSub}>Intelligent Parking Platform • Bhubaneswar</Text>
        <ActivityIndicator size="large" color="#0284C7" style={{ marginTop: 24 }} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <SimulatedProvider>
        <SessionContext.Provider value={{ status: authStatus, user, login, register, logout }}>
          <SafeAreaView style={styles.rootSafeArea}>
            <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

            {/* Global Simulated Data Environment Banner */}
            <SimulatedDataBanner />

            {authStatus === "anonymous" ? (
              showRegister ? (
                <RegisterScreen onSwitchToLogin={() => setShowRegister(false)} />
              ) : (
                <LoginScreen onSwitchToRegister={() => setShowRegister(true)} />
              )
            ) : (
              <NavigationContainer>
                <Stack.Navigator
                  screenOptions={{
                    headerStyle: { backgroundColor: "#0F172A" },
                    headerTintColor: "#F8FAFC",
                    headerTitleStyle: { fontWeight: "800" },
                  }}
                >
                  <Stack.Screen
                    name="MainTabs"
                    component={MainTabs}
                    options={{ headerShown: false }}
                  />
                  <Stack.Screen
                    name="ZoneDetail"
                    component={ZoneDetailScreen}
                    options={{
                      title: "Zone Live Status",
                      headerBackTitle: "Back",
                    }}
                  />
                </Stack.Navigator>
              </NavigationContainer>
            )}
          </SafeAreaView>
        </SessionContext.Provider>
      </SimulatedProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  rootSafeArea: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  simulatedBanner: {
    backgroundColor: "#1D4ED8",
    paddingVertical: 5,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  simulatedBannerText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  splashContainer: {
    flex: 1,
    backgroundColor: "#0F172A",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  splashLogo: {
    fontSize: 54,
    marginBottom: 8,
  },
  splashTitle: {
    fontSize: 32,
    fontWeight: "900",
    color: "#F8FAFC",
    letterSpacing: 1,
  },
  splashSub: {
    fontSize: 13,
    color: "#94A3B8",
    marginTop: 6,
    textAlign: "center",
  },
  authContainer: {
    flex: 1,
    backgroundColor: "#0F172A",
    justifyContent: "center",
    padding: 20,
  },
  authCard: {
    backgroundColor: "#1E293B",
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: "#334155",
  },
  authLogoBox: {
    alignItems: "center",
    marginBottom: 20,
  },
  authLogoText: {
    fontSize: 26,
    fontWeight: "900",
    color: "#F8FAFC",
  },
  authTagline: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 4,
    textAlign: "center",
  },
  authErrorBox: {
    backgroundColor: "#450A0A",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#991B1B",
    padding: 10,
    marginBottom: 14,
  },
  authErrorText: {
    color: "#FCA5A5",
    fontSize: 12,
    fontWeight: "600",
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94A3B8",
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: "#0F172A",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#334155",
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#F8FAFC",
    fontSize: 14,
  },
  authSubmitBtn: {
    backgroundColor: "#0284C7",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#0284C7",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  authSubmitBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  demoBtn: {
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "#38BDF8",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  demoBtnText: {
    color: "#38BDF8",
    fontSize: 13,
    fontWeight: "700",
  },
  btnDisabled: {
    opacity: 0.6,
  },
  switchAuthRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 18,
  },
  switchAuthPrompt: {
    color: "#94A3B8",
    fontSize: 13,
  },
  switchAuthLink: {
    color: "#38BDF8",
    fontSize: 13,
    fontWeight: "700",
  },
});
