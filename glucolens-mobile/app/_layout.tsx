import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import Toast from "react-native-toast-message";
import { trpc, createTRPCClient } from "@/lib/trpc";
import { colors } from "@/constants/tokens";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 2, gcTime: 1000 * 60 * 10, retry: 2 },
  },
});
const trpcClient = createTRPCClient();

export default function RootLayout() {
  // Ensure a Supabase session exists so all protected API calls work.
  // If the user has never signed in we create an anonymous session.
  // This runs once on mount; subsequent launches reuse the persisted session.
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        const { error } = await supabase.auth.signInAnonymously();
        if (error) console.warn("[auth] anonymous sign-in failed:", error.message);
      }
    })();
  }, []);

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <SafeAreaProvider>
            <StatusBar barStyle="light-content" />
            <Stack screenOptions={{ headerShown: false, backgroundColor: colors.background }}>
              <Stack.Screen name="(auth)" options={{}} />
              <Stack.Screen name="onboarding" options={{}} />
              <Stack.Screen name="(tabs)" options={{}} />
              <Stack.Screen name="results" options={{ animation: "slide_from_bottom" }} />
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
