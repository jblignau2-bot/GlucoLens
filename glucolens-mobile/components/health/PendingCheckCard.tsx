/**
 * PendingCheckCard — surfaces the "log a glucose reading for the meal you
 * scanned 90 min ago" prompt directly on Home.
 *
 * The Scan→Glucose loop is the differentiating feature: every meal scan
 * schedules a follow-up, and the resulting glucose reading is mapped to a
 * green/amber/red badge so the user learns cause and effect over time.
 */

import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Clock, ChevronRight } from "lucide-react-native";
import { colors, radius } from "@/constants/tokens";
import type { PendingCheck } from "@/stores/pendingChecksStore";

interface Props {
  check: PendingCheck;
}

export function PendingCheckCard({ check }: Props) {
  const router = useRouter();
  const minutesSinceMeal = Math.round((Date.now() - check.mealLoggedAt) / 60000);

  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: "/(tabs)/glucose",
          params: { pendingCheckId: check.id },
        })
      }
      style={({ pressed }) => ({
        backgroundColor: colors.primaryLight,
        borderRadius: radius.xl,
        borderWidth: 1,
        borderColor: colors.glassBorder,
        padding: 14,
        flexDirection: "row",
        gap: 12,
        alignItems: "center",
        opacity: pressed ? 0.92 : 1,
      })}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          backgroundColor: colors.primary,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Clock size={18} color={colors.inkOnPrimary} strokeWidth={2.4} />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 11,
            fontWeight: "700",
            color: colors.primary,
            letterSpacing: 1.1,
            textTransform: "uppercase",
          }}
        >
          Quick check-in
        </Text>
        <Text
          style={{
            fontSize: 14,
            fontWeight: "800",
            color: colors.textPrimary,
            marginTop: 2,
          }}
          numberOfLines={1}
        >
          How did "{check.mealName}" land?
        </Text>
        <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 1 }}>
          {minutesSinceMeal} min since the meal · log a reading to score it
        </Text>
      </View>
      <ChevronRight size={16} color={colors.primary} />
    </Pressable>
  );
}
