/**
 * MealCard
 *
 * Reusable card for a logged meal entry.
 * Used on Dashboard (today's meals) and Food Log (full history).
 *
 * Props:
 *  - meal      : food log entry
 *  - diabetesType : "type1" | "type2" | "prediabetes" | "unsure"
 *  - onPress   : navigation callback
 *  - compact   : reduces padding for dense lists
 */

import { View, Text, Pressable } from "react-native";
import { Utensils, ChevronRight } from "lucide-react-native";
import { RatingBadge, type Rating } from "./RatingBadge";
import { colors, radius, shadow } from "@/constants/tokens";
import { format } from "date-fns";

export interface MealLogEntry {
  id: number;
  mealName: string;
  calories: number | null;
  totalCarbs: number | null;
  totalSugar: number | null;
  ratingType1: string | null;
  ratingType2: string | null;
  loggedAt: string;
}

interface MealCardProps {
  meal: MealLogEntry;
  diabetesType?: string;
  onPress?: () => void;
  compact?: boolean;
}

export function MealCard({ meal, diabetesType = "type2", onPress, compact = false }: MealCardProps) {
  const rating = (
    diabetesType === "type1" ? meal.ratingType1 : meal.ratingType2
  ) as Rating | null;

  const ratingBg = rating === "safe"
    ? colors.safeBg
    : rating === "risky"
    ? colors.riskyBg
    : colors.moderateBg;

  const ratingColor = rating === "safe"
    ? colors.safe
    : rating === "risky"
    ? colors.risky
    : colors.moderate;

  const pad = compact ? 10 : 14;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.card,
        borderRadius: radius.lg,
        padding: pad,
        marginBottom: compact ? 6 : 10,
        gap: 12,
        opacity: pressed ? 0.82 : 1,
        ...shadow.card,
      })}
    >
      {/* Icon */}
      <View style={{
        width: compact ? 36 : 44,
        height: compact ? 36 : 44,
        borderRadius: compact ? 10 : 12,
        backgroundColor: ratingBg,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}>
        <Utensils size={compact ? 15 : 18} color={ratingColor} />
      </View>

      {/* Text */}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          style={{ fontSize: compact ? 13 : 14, fontWeight: "700", color: colors.textPrimary }}
          numberOfLines={1}
        >
          {meal.mealName}
        </Text>
        <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 1 }}>
          {Math.round(meal.calories ?? 0)} kcal
          {" · "}
          {Math.round(meal.totalCarbs ?? 0)}g carbs
          {" · "}
          {format(new Date(meal.loggedAt), "h:mm a")}
        </Text>
      </View>

      {/* Rating badge */}
      {rating && <RatingBadge rating={rating} size="sm" />}

      {onPress && <ChevronRight size={14} color={colors.textSecondary} style={{ flexShrink: 0 }} />}
    </Pressable>
  );
}
