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
// Railway free tier sleeps after inactivity — this ping wakes it up
// before the user finishes the auth splash, so the first real API
// call feels instant instead of waiting 5-10s for a cold start.
fetch(`${process.env.EXPO_PUBLIC_API_URL}/health`).catch(() => {});

export default function RootLayout() {
  // Block children from rendering until we have a confirmed Supabase
  // session. Without this gate, tRPC queries fire immediately on mount
  // with no Authorization header and get "not authenticated" errors.
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        const { error } = await supabase.auth.signInAnonymously();
        if (error) console.warn("[auth] anonymous sign-in failed:", error.message);
      }
      setAuthReady(true);
    })();
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
