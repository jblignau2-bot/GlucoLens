import { Tabs } from "expo-router";
import { View, Animated, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useEffect, useRef } from "react";
import { Home, LayoutGrid, Camera, BookOpen, User } from "lucide-react-native";
import { colors } from "@/constants/tokens";
import { trpc } from "@/lib/trpc";
import { useProfileStore } from "@/stores/profileStore";

// ── Floating Scan FAB in the centre of the tab bar with animated teal glow ───
function ScanTabIcon({ focused }: { focused: boolean }) {
  const glowAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1200, useNativeDriver: false }),
        Animated.timing(glowAnim, { toValue: 0.4, duration: 1200, useNativeDriver: false }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [glowAnim]);

  return (
    <View style={{ alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
      {/* Outer glow ring */}
      <Animated.View
        style={{
          position: "absolute",
          width: 70,
          height: 70,
          borderRadius: 35,
          backgroundColor: colors.primary,
          opacity: glowAnim.interpolate({ inputRange: [0.4, 1], outputRange: [0.15, 0.35] }),
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
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.8,
          shadowRadius: 20,
          elevation: 16,
        }}
      >
        <Camera size={26} color={colors.background} strokeWidth={2.5} />
      </View>
    </View>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const setProfile = useProfileStore((s) => s.setProfile);
  const existingProfile = useProfileStore((s) => s.profile);

  // Hydrate profile store from API on mount (covers app restart)
  const { data: profileData } = trpc.profile.get.useQuery(undefined, {
    enabled: !existingProfile,
  });

  useEffect(() => {
    if (profileData && !existingProfile) {
      setProfile(profileData as any);
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
          height: 72 + insets.bottom,
          paddingBottom: insets.bottom,
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
        },
        tabBarBackground: () => (
          <View style={StyleSheet.absoluteFill}>
            {/* Left panel */}
            <View
              style={{
                position: "absolute",
                left: 10,
                right: "55%",
                bottom: insets.bottom + 8,
                height: 56,
                backgroundColor: colors.card,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            />
            {/* Right panel */}
            <View
              style={{
                position: "absolute",
                left: "55%",
                right: 10,
                bottom: insets.bottom + 8,
                height: 56,
                backgroundColor: colors.card,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: colors.border,
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
          title: "Planner",
          tabBarIcon: ({ color, size }) => <LayoutGrid size={size} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: "",
          tabBarIcon: ({ focused }) => <ScanTabIcon focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="reminders"
        options={{
          title: "Guide",
          tabBarIcon: ({ color, size }) => <BookOpen size={size} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="glucose"
        options={{
          href: null, // Hide from tab bar — accessible via Profile > Health Log
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <User size={size} color={color} strokeWidth={2} />,
        }}
      />
    </Tabs>
  );
}
