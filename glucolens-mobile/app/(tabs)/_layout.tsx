/**
 * Bottom tab bar — Home · Plan · Scan (FAB) · Coach · Profile.
 *
 * Glucose, Reminders, Foods, Diary etc. are no longer first-class tabs — they
 * surface from the new single-scroll Home or sit under Profile. See the
 * design notes in `app/(tabs)/index.tsx` for the rationale.
 */

import { Tabs } from "expo-router";
import { View, Animated, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useEffect, useRef } from "react";
import { Home, LayoutGrid, Camera, Sparkles, User } from "lucide-react-native";
import { colors, TAB_BAR_HEIGHT } from "@/constants/tokens";
import { trpc } from "@/lib/trpc";
import { useProfileStore, type UserProfile } from "@/stores/profileStore";
import { useRetailerStore } from "@/stores/retailerStore";
import { usePendingChecksStore } from "@/stores/pendingChecksStore";

// ── Floating Scan FAB in the centre of the tab bar with animated coral glow ──
function ScanTabIcon() {
  const glowAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1200, useNativeDriver: false }),
        Animated.timing(glowAnim, { toValue: 0.4, duration: 1200, useNativeDriver: false }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [glowAnim]);

  return (
    <View style={{ alignItems: "center", justifyContent: "center", marginBottom: 22 }}>
      <Animated.View
        style={{
          position: "absolute",
          width: 70,
          height: 70,
          borderRadius: 35,
          backgroundColor: colors.primary,
          opacity: glowAnim.interpolate({ inputRange: [0.4, 1], outputRange: [0.18, 0.36] }),
        }}
      />
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: colors.primary,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.4,
          shadowRadius: 14,
          elevation: 12,
        }}
      >
        <Camera size={26} color={colors.inkOnPrimary} strokeWidth={2.4} />
      </View>
    </View>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const setProfile = useProfileStore((s) => s.setProfile);
  const existingProfile = useProfileStore((s) => s.profile);
  const profileHydrated = useProfileStore((s) => s.hydrated);
  const hydrateProfile = useProfileStore((s) => s.hydrate);
  const retailerHydrated = useRetailerStore((s) => s.hydrated);
  const hydrateRetailer = useRetailerStore((s) => s.hydrate);
  const pendingHydrated = usePendingChecksStore((s) => s.hydrated);
  const hydratePending = usePendingChecksStore((s) => s.hydrate);

  // 1. Hydrate from AsyncStorage first (offline-friendly, instant)
  useEffect(() => {
    if (!profileHydrated) hydrateProfile();
    if (!retailerHydrated) hydrateRetailer();
    if (!pendingHydrated) hydratePending();
  }, [profileHydrated, retailerHydrated, pendingHydrated, hydrateProfile, hydrateRetailer, hydratePending]);

  // 2. Then try to refresh from API in the background (best-effort).
  const { data: profileData } = trpc.profile.get.useQuery(undefined, {
    enabled: profileHydrated && !existingProfile,
    retry: false,
  });

  useEffect(() => {
    if (profileData && !existingProfile) {
      setProfile(profileData as UserProfile);
    }
  }, [profileData, existingProfile, setProfile]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: "transparent",
          borderTopWidth: 0,
          elevation: 0,
          height: TAB_BAR_HEIGHT + insets.bottom,
          paddingBottom: insets.bottom,
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
        },
        tabBarBackground: () => (
          <View style={StyleSheet.absoluteFill}>
            <View
              style={{
                position: "absolute",
                left: 12,
                right: 12,
                bottom: insets.bottom + 8,
                height: 56,
                backgroundColor: colors.card,
                borderRadius: 28,
                borderWidth: 1,
                borderColor: colors.border,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.06,
                shadowRadius: 14,
                elevation: 4,
              }}
            />
          </View>
        ),
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600",
          marginTop: -2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="planner"
        options={{
          title: "Plan",
          tabBarIcon: ({ color, size }) => <LayoutGrid size={size} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: "",
          tabBarIcon: () => <ScanTabIcon />,
        }}
      />
      <Tabs.Screen
        name="coach"
        options={{
          title: "Coach",
          tabBarIcon: ({ color, size }) => <Sparkles size={size} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <User size={size} color={color} strokeWidth={2} />,
        }}
      />
      {/* Hidden — accessible via Home cards or Profile, not as a tab */}
      <Tabs.Screen name="glucose" options={{ href: null }} />
    </Tabs>
  );
}
