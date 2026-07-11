import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { View, Text, Pressable } from "react-native";
import Toast from "react-native-toast-message";
import { getStoredCredentials, storeCredentials } from "@/lib/deviceCredentials";
import { trpc, createTRPCClient } from "@/lib/trpc";
import { colors, radius } from "@/constants/tokens";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { SplashScreen } from "@/components/SplashScreen";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 2, gcTime: 1000 * 60 * 10, retry: 1 },
  },
});
const trpcClient = createTRPCClient();
const skipRemoteBoot =
  __DEV__ && process.env.EXPO_PUBLIC_SKIP_ONBOARDING === "true";

// Warm up the Railway backend the instant the JS bundle loads.
// Railway sleeps after inactivity — this ping wakes it up before
// the user finishes the auth splash, so API calls feel instant.
// Skipped when no API URL is configured, and on web SSR (no fetch target).
if (!skipRemoteBoot && process.env.EXPO_PUBLIC_API_URL && typeof window !== "undefined") {
  fetch(`${process.env.EXPO_PUBLIC_API_URL}/health`).catch(() => {});
}

/**
 * Ensure a Supabase session exists.
 *
 * 1. Try to reuse a persisted session (AsyncStorage).
 * 2. If none, sign back in with the device credentials stored in
 *    SecureStore (recovers the account after token loss).
 * 3. If none stored (or sign-in fails), create a new account via signUp
 *    with a random email. Anonymous sign-ins are disabled on this Supabase
 *    project, so we generate a device-specific email+password pair instead.
 *    Email confirmation is disabled, so signUp returns a valid JWT
 *    immediately, and the session is auto-persisted for next launch.
 *
 * Returns an error message string on failure, or null on success.
 */
async function ensureSession(): Promise<string | null> {
  // 1️⃣ Check for an existing (persisted) session
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session) return null; // already authenticated

  // 2️⃣ No session — try to recover the device account from stored credentials
  const stored = await getStoredCredentials();
  if (stored) {
    const { error } = await supabase.auth.signInWithPassword(stored);
    if (!error) return null;
    console.warn("[auth] stored-credential sign-in failed:", error.message);
    // Fall through to creating a fresh account.
  }

  // 3️⃣ Create a new device account with a randomly generated password
  const id = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const email = `device_${id}@glucolens.app`;
  const password = `${Math.random().toString(36).slice(2)}${Math.random()
    .toString(36)
    .slice(2)}${Date.now().toString(36)}`;

  // Persist credentials BEFORE signUp so the account is always recoverable.
  await storeCredentials(email, password);

  const { error } = await supabase.auth.signUp({ email, password });
  if (error) {
    console.warn("[auth] signUp failed:", error.message);
    return error.message;
  }
  return null;
}

function AuthErrorScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={{
      flex: 1,
      backgroundColor: colors.background,
      alignItems: "center",
      justifyContent: "center",
      padding: 32,
      gap: 16,
    }}>
      <Text style={{ fontSize: 18, fontWeight: "800", color: colors.textPrimary, textAlign: "center" }}>
        Couldn't connect
      </Text>
      <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: "center", lineHeight: 20 }}>
        We couldn't set up your account.{"\n"}{message}
      </Text>
      <Pressable
        onPress={onRetry}
        style={({ pressed }) => ({
          backgroundColor: colors.primary,
          paddingHorizontal: 28,
          paddingVertical: 12,
          borderRadius: radius.lg,
          opacity: pressed ? 0.8 : 1,
        })}
      >
        <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>Try Again</Text>
      </Pressable>
    </View>
  );
}

export default function RootLayout() {
  // Block children from rendering until we have a confirmed Supabase
  // session. Without this gate, tRPC queries fire immediately on mount
  // with no Authorization header and get "not authenticated" errors.
  const [authReady, setAuthReady] = useState(skipRemoteBoot);
  const [authError, setAuthError] = useState<string | null>(null);
  const [splashDone, setSplashDone] = useState(false);

  const runAuth = useCallback(() => {
    setAuthError(null);
    ensureSession()
      .then((err) => {
        if (err) setAuthError(err);
        else setAuthReady(true);
      })
      .catch((e: any) => setAuthError(e?.message ?? "Unknown error"));
  }, []);

  useEffect(() => {
    if (skipRemoteBoot) return;
    runAuth();
  }, [runAuth]);

  if (authError && splashDone) {
    return <AuthErrorScreen message={authError} onRetry={runAuth} />;
  }

  if (!authReady || !splashDone) {
    return (
      <SplashScreen
        onFinish={() => setSplashDone(true)}
      />
    );
  }

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <SafeAreaProvider>
            <StatusBar style="light" />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.background },
              }}
            >
              <Stack.Screen name="onboarding" options={{}} />
              <Stack.Screen name="(tabs)" options={{}} />
              <Stack.Screen
                name="results"
                options={{ animation: "slide_from_bottom" }}
              />
              <Stack.Screen name="food-log" options={{}} />
              <Stack.Screen name="reminders" options={{}} />
              <Stack.Screen name="profile-edit" options={{}} />
              <Stack.Screen name="coach" options={{ animation: "slide_from_bottom" }} />
            </Stack>
            <Toast />
          </SafeAreaProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
