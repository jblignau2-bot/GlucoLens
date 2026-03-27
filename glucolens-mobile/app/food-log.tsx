/**
 * Food Log screen (push/modal)
 *
 * Full scrollable history of all logged meals, filterable by:
 *  - Date range (Today, Week, Month, All)
 *  - Rating (safe / moderate / risky)
 *
 * Each entry taps to open Results screen.
 * Long press to delete with confirmation.
 * Pull-to-refresh.
 */

import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useAnalysisStore } from "@/stores/analysisStore";
import { useProfileStore } from "@/stores/profileStore";
import { colors, radius, shadow } from "A/constants/tokens";
import { ArrowLeft, Search, Utensils, ChevronRight, Filter } from "lucide-react-native";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import * as Haptics from "expo-haptics";

// ─── Date filter ─────────────────────────────────────────────────────────────

type DateFilter = "today" | "week" | "month" | "all";

const DATE_FILTERS: { key: DateFilter; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "week", label: "7 Days" },
  { key: "month", label: "30 Days" },
  { key: "all", label: "All" },
];

function getDateRange(filter: DateFilter): { from?: string; to?: string } {
  const now = new Date();
  switch (filter) {
    case "today":
      return { from: startOfDay(now).toISOString(), to: endOfDay(now).toISOString() };
    case "week":
      return { from: startOfDay(subDays(now, 7)).toISOString() };
    case "month":
      return { from: startOfDay(subDays(now, 30)).toISOString() };
    default:
      return {};
  }
}

// ─── Rating helpers ───────────────────────────────────────────────────────────

function ratingColor(r?: string | null) {
  if (r === "safe") return colors.safe;
  if (r === "risky") return colors.risky;
  return colors.moderate;
}

function ratingBg(r?: string | null) {
  if (r === "safe") return colors.safeBg;
  if (r === "risky") return colors.riskyBg;
  return colors.moderateBg;
}

// ─── Meal row ─────────────────────────────────────────────────────────────────

interface MealEntry {
  id: number;
  mealName: string;
  calories: number | null;
  totalCarbs: number | null;
  totalSugar: number | null;
  ratingType1: string | null;
  ratingType2: string | null;
  loggedAt: string;
}

function MealRow({
  meal,
  diabetesType,
  onPress,
  onLongPress,
}: {
  meal: MealEntry;
  diabetesType: string;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const rating = diabetesType === "type1" ? meal.ratingType1 : meal.ratingType2;
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={500}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.card,
        borderRadius: radius.lg,
        padding: 13,
        marginBottom: 8,
        gap: 12,
        opacity: pressed ? 0.8 : 1,
        borderWidth: 1,
        borderColor: colors.border,
        ...shadow.card,
      })}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          backgroundColor: ratingBg(rating),
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Utensils size={18} color={ratingColor(rating)} />
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          style={{
            fontSize: 14,
            fontWeight: "700",
            color: colors.textPrimary,
          }}
          numberOfLines={1}
        >
          {meal.mealName}
        </Text>
        <Text
          style={{
            fontSize: 12,
            color: colors.textSecondary,
            marginTop: 1,
          }}
        >
          {Math.round(meal.calories ?? 0)} kcal · {Math.round(meal.totalCarbs ?? 0)}
          g carbs
        </Text>
        <Text
          style={{
            fontSize: 11,
            color: colors.textSecondary,
            marginTop: 1,
          }}
        >
          {format(new Date(meal.loggedAt), "EEE d MMM · h:mm a")}
        </Text>
      </View>

      <View
        style={{
          backgroundColor: ratingBg(rating),
          paddingHorizontal: 8,
          paddingVertical: 4,
          borderRadius: 8,
          flexShrink: 0,
        }}
      >
        <Text
          style={{
            fontSize: 11,
            fontWeight: "700",
            color: ratingColor(rating),
            textTransform: "capitalize",
          }}
        >
          {rating ?? "—"}
        </Text>
      </View>

      <ChevronRight size={16} color={colors.textSecondary} />
    </Pressable>
  
      
    
    
    
    
    
    
    
    
    
  
/Entry[];
  diabetesType: string;
}) {
  const safe = meals.filter(
    (m) =>
      (diabetesType === "type1" ? m.ratingType1 : m.ratingType2) === "safe"
  ).length;
  const moderate = meals.filter(
    (m) =>
      (diabetesType === "type1" ? m.ratingType1 : m.ratingType2) === "moderate"
  ).length;
  const risky = meals.filter(
    (m) =>
      (diabetesType === "type1" ? m.ratingType1 : m.ratingType2) === "risky"
  ).length;
  const totalCal = meals.reduce((s, m) => s + (m.calories ?? 0), 0);

  return (
    <View
      style={{
        flexDirection: "row",
        gap: 