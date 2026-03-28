import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import Toast from "react-native-toast-message";
import { trpc, createTRPCClient } from "@/lib/trpc";
import { colors } from "@/constants/tokens";
import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { supabase } from "@/lib/supabase";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 2, gcTime: 1000 * 60 * 10, retry: 1 },
  },
});
const trpcClient = createTRPCClient();

// Warm up the Railway backend the instant the JS bundle loads.
// Railway sleeps after inactivity — this ping wakes it up before
// the user finishes the auth splash, so API calls feel instant.
fetch(`${process.env.EXPO_PUBLIC_API_URL}/health`).catch(() => {});

/**
 * Ensure a Supabase session exists.
 *
 * 1. Try to reuse a persisted session (AsyncStorage).
 * 2. If none, create a new account via signUp with a random email.
 *    Anonymous sign-ins are disabled on this Supabase project, so we
 *    generate a device-specific email+password pair instead.
 *    Email confirmation is disabled, so signUp returns a valid JWT
 *    immediately, and the session is auto-persisted for next launch.
 */
async function ensureSession(): Promise<void> {
  // 1️⃣ Check for an existing (persisted) session
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session) return; // already authenticated

  // 2️⃣ No session — create a new device account
  const id = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const email = `device_${id}@glucolens.app`;
  const password = `GL!${id}`;

  const { error } = await supabase.auth.signUp({ email, password });
  if (error) {
    console.warn("[auth] signUp failed:", error.message);
  }
}

export default function RootLayout() {
  // Block children from rendering until we have a confirmed Supabase
  // session. Without this gate, tRPC queries fire immediately on mount
  // with no Authorization header and get "not authenticated" errors.
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    ensureSession().finally(() => setAuthReady(true));
  }, []);

  if (!authReady) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <SafeAreaProvider>
            <StatusBar barStyle="light-content" />
            <Stack
              screenOptions={{
                headerShown: false,
                backgroundColor: colors.background,
              }}
            >
              <Stack.Screen name="(auth)" options={{}} />
              <Stack.Screen name="onboarding" options={{}} />
              <Stack.Screen name="(tabs)" options={{}} />
              <Stack.Screen
                name="results"
                options={{ animation: "slide_from_bottom" }}
              />
              <Stack.Screen name="food-log" options={{}} />
              <Stack.Screen name="reminders" options={{}} />
              <Stack.Screen name="profile-edit" options={{}} />
            </Stack>
            <Toast />
          </SafeAreaProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
