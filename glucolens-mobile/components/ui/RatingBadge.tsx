/**
 * RatingBadge
 *
 * Renders a coloured pill for safe / moderate / risky ratings.
 * Accepts size="sm" | "md" | "lg".
 */

import { View, Text } from "react-native";
import { colors, radius } from "@/constants/tokens";

export type Rating = "safe" | "moderate" | "risky";

const CONFIG: Record<Rating, { label: string; emoji: string; color: string; bg: string }> = {
  safe:     { label: "Safe",     emoji: "✅", color: colors.safe,     bg: colors.safeBg },
  moderate: { label: "Moderate", emoji: "⚠️", color: colors.moderate, bg: colors.moderateBg },
  risky:    { label: "Risky",    emoji: "🚨", color: colors.risky,    bg: colors.riskyBg },
};

const SIZE = {
  sm: { px: 6, py: 2, text: 10 },
  md: { px: 8, py: 3, text: 11 },
  lg: { px: 12, py: 5, text: 13 },
};

interface RatingBadgeProps {
  rating: Rating;
  size?: "sm" | "md" | "lg";
  showEmoji?: boolean;
}

export function RatingBadge({ rating, size = "md", showEmoji = false }: RatingBadgeProps) {
  const c = CONFIG[rating];
  const s = SIZE[size];

  return (
    <View style={{
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: c.bg,
      paddingHorizontal: s.px,
      paddingVertical: s.py,
      borderRadius: radius.full,
      alignSelf: "flex-start",
    }}>
      {showEmoji && <Text style={{ fontSize: s.text + 2 }}>{c.emoji}</Text>}
      <Text style={{ fontSize: s.text, fontWeight: "700", color: c.color }}>
        {c.label}
      </Text>
    </View>
  );
}
