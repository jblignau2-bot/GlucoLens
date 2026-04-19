/**
 * RatingBadge
 *
 * Renders a coloured pill for safe / moderate / risky ratings.
 * Uses lucide-react-native icons (no emojis).
 * Accepts size="sm" | "md" | "lg".
 */

import { View, Text } from "react-native";
import { CheckCircle2, AlertTriangle, Ban, type LucideIcon } from "lucide-react-native";
import { colors, radius } from "@/constants/tokens";

export type Rating = "safe" | "moderate" | "risky";

const CONFIG: Record<Rating, { label: string; Icon: LucideIcon; color: string; bg: string }> = {
  safe:     { label: "Safe",     Icon: CheckCircle2,  color: colors.safe,     bg: colors.safeBg },
  moderate: { label: "Moderate", Icon: AlertTriangle, color: colors.moderate, bg: colors.moderateBg },
  risky:    { label: "Risky",    Icon: Ban,           color: colors.risky,    bg: colors.riskyBg },
};

const SIZE = {
  sm: { px: 6,  py: 2, text: 10, icon: 11 },
  md: { px: 8,  py: 3, text: 11, icon: 13 },
  lg: { px: 12, py: 5, text: 13, icon: 15 },
};

interface RatingBadgeProps {
  rating: Rating;
  size?: "sm" | "md" | "lg";
  /** kept for back-compat; renders the icon when true */
  showEmoji?: boolean;
  showIcon?: boolean;
}

export function RatingBadge({ rating, size = "md", showEmoji = false, showIcon }: RatingBadgeProps) {
  const c = CONFIG[rating];
  const s = SIZE[size];
  const withIcon = showIcon ?? showEmoji;

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
      {withIcon && <c.Icon size={s.icon} color={c.color} strokeWidth={2.25} />}
      <Text style={{ fontSize: s.text, fontWeight: "700", color: c.color }}>
        {c.label}
      </Text>
    </View>
  );
}
