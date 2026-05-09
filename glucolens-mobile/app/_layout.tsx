import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import Toast from "react-native-toast-message";
import { trpc, createTRPCClient } from "@/lib/trpc";
import { colors } from "@/constants/tokens";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { SplashScreen } from "@/components/SplashScreen";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useApiStatusStore } from "@/lib/api/status";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 2, gcTime: 1000 * 60 * 10, retry: 1 },
  },
});
const trpcClient = createTRPCClient();
const skipRemoteBoot =
  __DEV__ && process.env.EXPO_PUBLIC_SKIP_ONBOARDING === "true";

// Warm up the backend the instant the JS bundle loads. The host sleeps after
// inactivity — this ping wakes it before the user finishes the auth splash.
// Wrapped in a try/catch because some platforms (notably Hermes when fed an
// "undefined/health" URL) throw synchronously on `fetch(...)`, and a bare
// `.catch(() => {})` only handles promise rejections, not sync throws.
if (!skipRemoteBoot) {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL;
  if (apiUrl) {
    try {
      fetch(`${apiUrl}/health`).catch(() => {});
    } catch {
      // best-effort warm-up
    }
  }
}

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

/** Hard ceiling so the splash gate never hangs the whole app on auth. */
const AUTH_TIMEOUT_MS = 4000;

function timed<T>(promise: Promise<T>, ms: number): Promise<T | "timeout"> {
  return Promise.race([
    promise,
    new Promise<"timeout">((resolve) => setTimeout(() => resolve("timeout"), ms)),
  ]);
}

export default function RootLayout() {
  // Block children from rendering until we have a confirmed Supabase
  // session. Without this gate, tRPC queries fire immediately on mount
  // with no Authorization header and get "not authenticated" errors.
  // We use a hard timeout so a flaky network can never strand the user
  // on the splash screen — better to boot offline than to hang.
  const [authReady, setAuthReady] = useState(skipRemoteBoot);
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    if (skipRemoteBoot) return;
    let cancelled = false;
    timed(ensureSession(), AUTH_TIMEOUT_MS).then((result) => {
      if (cancelled) return;
      if (result === "timeout" && __DEV__) {
        console.warn("[auth] ensureSession timed out after " + AUTH_TIMEOUT_MS + "ms — booting offline");
      }
      setAuthReady(true);
    });
    // Kick off an API health probe in parallel — it populates the offline
    // banner and lets feature screens skip pointless mutation attempts.
    useApiStatusStore.getState().probe();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!authReady || !splashDone) {
    return (
      <SplashScreen
        onFinish={() => setSplashDone(true)}
      />
    );
  }

  return (
    <ErrorBoundary>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaProvider>
              <StatusBar style="dark" />
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
                <Stack.Screen name="water" options={{}} />
                <Stack.Screen name="foods" options={{}} />
                <Stack.Screen name="guide" options={{}} />
                <Stack.Screen name="weekly-review" options={{}} />
              </Stack>
              <Toast />
            </SafeAreaProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </trpc.Provider>
    </ErrorBoundary>
  );
}
