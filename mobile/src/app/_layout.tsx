import React, { useEffect } from "react";
import { ActivityIndicator, Platform, View } from "react-native";
import * as NavigationBar from "expo-navigation-bar";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { SessionProvider } from "../session";
import { GlobalStatus } from "../components/ui";
import { useReducedMotion } from "react-native-reanimated";
import { C } from "../theme";
export default function Layout() {
  const reducedMotion = useReducedMotion();
  const [loaded, error] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  useEffect(() => {
    if (loaded && Platform.OS === "android") NavigationBar.setStyle("light");
  }, [loaded]);
  if (!loaded && !error)
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: C.bg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color={C.lime} />
      </View>
    );
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            animation: reducedMotion ? "fade" : "default",
            contentStyle: { backgroundColor: C.bg },
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="welcome" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="upload" options={{ presentation: "modal" }} />
          <Stack.Screen name="profile" options={{ presentation: "modal" }} />
          <Stack.Screen name="guide" options={{ presentation: "modal" }} />
          <Stack.Screen name="statement-review" options={{ presentation: "modal" }} />
        </Stack>
        <GlobalStatus />
      </SessionProvider>
    </SafeAreaProvider>
  );
}
