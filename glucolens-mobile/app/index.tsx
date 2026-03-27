import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { Redirect } from "expo-router";
import { trpc } from "@/lib/trpc";
import { useProfileStore } from "@/stores/profileStore";
import { colors } from "@/constants/tokens";

export default function Index() {
  const setProfile = useProfileStore((s) => s.setProfile);
  const [checked, setChecked] = useState(false);
  const [onboarded, setOnboarded] = useState(false);

  const profileQuery = trpc.profile.get.useQuery(undefined, { retry: false });

  useEffect(() => {
    if (profileQuery.data) {
      setProfile(profileQuery.data as any);
      if (profileQuery.data.onboarding_complete === 1) {
        setOnboarded(true);
      }
      setChecked(true);
    } else if (profileQuery.isError || profileQuery.fetchStatus === "idle") {
      setChecked(true);
    }
  }, [profileQuery.data, profileQuery.isError, profileQuery.fetchStatus, setProfile]);

  if (!checked) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return <Redirect href={onboarded ? "/(tabs)" : "/onboarding"} />;
}
