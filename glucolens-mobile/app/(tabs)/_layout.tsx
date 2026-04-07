import { Tabs } from "expo-router";
import { View, Animated } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useEffect, useRef } from "react";
import { Home, ClipboardList, Camera, BarChart3, User } from "lucide-react-native";
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

  const glowOpacity = glowAnim;
  const glowRadius = glowAnim.interpolate({ inputRange: [0.4, 1], outputRange: [10, 22] });

  return (
    <View style={{ alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
      {/* Outer glow ring */}
      <Animated.View
        style={{
          position: "absolute",
          width: 68,
          height: 68,
          borderRadius: 34,
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
          shadowRadius: 16,
          elevation: 16,
        }}
      >
        <Camera size={26} color="#fff" strokeWidth={2.5} />
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
    enabled: !existingProfile, // only fetch if store is empty
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
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 56 + insets.bottom,
          paddingBottom: insets.bottom,
        },
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
          title: "Log",
          tabBarIcon: ({ color, size }) => <ClipboardList size={size} color={color} strokeWidth={2} />,
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
          title: "Analytics",
          tabBarIcon: ({ color, size }) => <BarChart3 size={size} color={color} strokeWidth={2} />,
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
