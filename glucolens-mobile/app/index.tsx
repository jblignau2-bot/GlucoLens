import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { Redirect } from "expo-router";
import { trpc } from "@/lib/trpc";
import { useProfileStore } from "@/stores/profileStore";
import { colors } from "@/constants/tokens";

export default function Index() {
  const skipOnboarding =
    __DEV__ && process.env.EXPO_PUBLIC_SKIP_ONBOARDING === "true";
  const setProfile = useProfileStore((s) => s.setProfile);
  const profile = useProfileStore((s) => s.profile);
  const hydrated = useProfileStore((s) => s.hydrated);
  const hydrate = useProfileStore((s) => s.hydrate);

  const [checked, setChecked] = useState(false);
  const [onboarded, setOnboarded] = useState(false);

  // 1. Hydrate from AsyncStorage immediately (offline source of truth)
  useEffect(() => {
    if (skipOnboarding) return;
    if (!hydrated) hydrate();
  }, [hydrated, hydrate, skipOnboarding]);

  // 2. Once hydrated, decide based on local data first
  useEffect(() => {
    if (skipOnboarding) return;
    if (!hydrated) return;
    if (profile && (profile.onboardingComplete || profile.onboarding_complete === 1)) {
      setOnboarded(true);
      setChecked(true);
    }
    // If no local profile, fall through to backend check (or hard timeout)
  }, [hydrated, profile, skipOnboarding]);

  // 3. Background backend probe — but only if we don't already have a local profile
  const profileQuery = trpc.profile.get.useQuery(undefined, {
    retry: false,
    enabled: !skipOnboarding && hydrated && !profile,
  });

  useEffect(() => {
    if (skipOnboarding) return;
    if (!hydrated) return;
    if (profileQuery.data) {
      setProfile(profileQuery.data as any);
      if ((profileQuery.data as any).onboarding_complete === 1) setOnboarded(true);
      setChecked(true);
    } else if (profileQuery.isError) {
      // Backend is down — go to onboarding
      setChecked(true);
    }
  }, [hydrated, profileQuery.data, profileQuery.isError, setProfile, skipOnboarding]);

  // 4. Hard timeout: if everything stalls for 2.5s, give up and route to onboarding.
  useEffect(() => {
    if (skipOnboarding) return;
    const t = setTimeout(() => setChecked(true), 2500);
    return () => clearTimeout(t);
  }, [skipOnboarding]);

  if (skipOnboarding) return <Redirect href="/(tabs)" />;

  if (!checked) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return <Redirect href={onboarded ? "/(tabs)" : "/onboarding"} />;
}
