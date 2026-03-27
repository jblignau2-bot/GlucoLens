/**
 * Dashboard (Home) screen — matches mockup design
 *
 * Shows:
 *  - GlucoLens branding header
 *  - Personalised greeting with diabetes awareness ribbon
 *  - Today's Summary glass card (Calories / Sugar / Carbs with progress bars + %)
 *  - Large central "Scan Your Food" CTA
 *  - Horizontal "Recent Meals" carousel
 */

import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useProfileStore } from "@/stores/profileStore";
import { useAnalysisStore } from "@/stores/analysisStore";
import { colors, radius, shadow } from "@/constants/tokens";
import {
  Utensils,
  Flame,
  Droplets,
  ChevronRight,
  Camera,
  Wheat,
  Ribbon,
  Clock,
} from "lucide-react-native";
import { format, startOfDay, endOfDay } from "date-fns";

const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_WIDTH = SCREEN_WIDTH * 0.42;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ratingColor(
  rating: "safe" | "moderate" | "risky" | undefined,
): string {
  if (rating === "safe") return colors.safe;
  if (rating === "risky") return colors.risky;
  return colors.moderate;
}

function ratingBg(
  rating: "safe" | "moderate" | "risky" | undefined,
): string {
  if (rating === "safe") return colors.safeBg;
  if (rating === "risky") return colors.riskyBg;
  return colors.moderateBg;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

function getMealLabel(loggedAt: string): string {
  const h = new Date(loggedAt).getHours();
  if (h < 11) return "Breakfast";
  if (h < 14) return "Lunch";
  if (h < 17) return "Snack";
  return "Dinner";
}

// ─── Summary stat column ─────────────────────────────────────────────────────

interface SummaryStatProps {
  label: string;
  value: number;
  max: number;
  unit: string;
  barColor: string;
}

function SummaryStat({ label, value, max, unit, barColor }: SummaryStatProps) {
  const pct = Math.min(Math.round((value / Math.max(max, 1)) * 100), 100);
  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <View
        style={{
          backgroundColor: `${barColor}25`,
          paddingHorizontal: 14,
          paddingVertical: 6,
          borderRadius: 20,
          marginBottom: 10,
        }}
      >
        <Text
          style={{
            fontSize: 12,
            fontWeight: "700",
            color: barColor,
          }}
        >
          {label}
        </Text>
      </View>

      <Text
        style={{
          fontSize: 16,
          fontWeight: "800",
          color: colors.textPrimary,
        }}
      >
        {Math.round(value)}
        <Text style={{ fontWeight: "400", color: colors.textSecondary, fontSize: 12 }}>
          {" "}/ {max} {unit}
        </Text>
      </Text>

      {/* Progress bar */}
      <View
        style={{
          width: "85%",
          height: 6,
          backgroundColor: colors.border,
          borderRadius: 3,
          marginTop: 8,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            width: `${pct}%`,
            height: "100%",
            backgroundColor: barColor,
            borderRadius: 3,
          }}
        />
      </View>

      <Text
        style={{
          fontSize: 12,
          fontWeight: "600",
          color: colors.textSecondary,
          marginTop: 4,
        }}
      >
        {pct}%
      </Text>
    </View>
  );
}

// ─── Recent meal card (horizontal carousel) ──────────────────────────────────

interface RecentMealCardProps {
  meal: {
    id: number;
    mealName: string;
    calories: number | null;
    totalCarbs: number | null;
    ratingType1: "safe" | "moderate" | "risky" | null;
    ratingType2: "safe" | "moderate" | "risky" | null;
    loggedAt: string;
  };
  diabetesType: string;
  onPress: () => void;
}

function RecentMealCard({ meal, diabetesType, onPress }: RecentMealCardProps) {
  const rating = diabetesType === "type1" ? meal.ratingType1 : meal.ratingType2;
  const col = ratingColor(rating ?? undefined);
  const time = format(new Date(meal.loggedAt), "h:mm a");
  const label = getMealLabel(meal.loggedAt);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width: CARD_WIDTH,
        backgroundColor: colors.card,
        borderRadius: radius.lg,
        overflow: "hidden",
        marginRight: 12,
        opacity: pressed ? 0.85 : 1,
        borderWidth: 1,
        borderColor: colors.border,
        ...shadow.card,
      })}
    >
      {/* Thumbnail area */}
      <View
        style={{
          height: 100,
          backgroundColor: ratingBg(rating ?? undefined),
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Utensils size={32} color={col} />
      </View>

      {/* Info */}
      <View style={{ padding: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 }}>
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: col,
            }}
          />
          <Text
            style={{
              fontSize: 12,
              color: colors.textSecondary,
            }}
          >
            {time}
          </Text>
        </View>
        <Text
          style={{
            fontSize: 13,
            fontWeight: "700",
            color: colors.textPrimary,
          }}
          numberOfLines={1}
        >
          {meal.mealName}
        </Text>
        <Text
          style={{
            fontSize: 11,
            color: colors.textSecondary,
            marginTop: 2,
          }}
        >
          {label}: {Math.round(meal.calories ?? 0)} kcal
        </Text>
      </View>
    </Pressable>
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────────

function EmptyDay({ onScan }: { onScan: () => void }) {
  return (
    <View style={{ alignItems: "center", paddingVertical: 20, paddingHorizontal: 24 }}>
      <Text
        style={{
          fontSize: 15,
          color: colors.textSecondary,
          textAlign: "center",
          lineHeight: 22,
        }}
      >
        No meals logged yet today.{"\n"}Scan your first meal to get started!
      </Text>
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const profile = useProfileStore((s) => s.profile);
  const setAnalysis = useAnalysisStore((s) => s.setResult);
  const [refreshing, setRefreshing] = useState(false);

  const todayStart = startOfDay(new Date()).toISOString();
  const todayEnd = endOfDay(new Date()).toISOString();

  const {
    data: todayLogs,
    refetch,
    isLoading,
  } = trpc.food.list.useQuery({
    from: todayStart,
    to: todayEnd,
    limit: 20,
  });

  const { data: goals } = trpc.profile.goals.useQuery();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const openMeal = (meal: NonNullable<typeof todayLogs>[number]) => {
    setAnalysis({
      mealName: meal.mealName,
      calories: meal.calories ?? 0,
      totalSugar: meal.totalSugar ?? 0,
      totalCarbs: meal.totalCarbs ?? 0,
      glycemicIndex: meal.glycemicIndex ?? 0,
      glycemicLoad: meal.glycemicLoad ?? 0,
      protein: meal.protein ?? 0,
      fat: meal.fat ?? 0,
      fiber: meal.fiber ?? 0,
      ratingType1: meal.ratingType1 ?? "moderate",
      ratingType2: meal.ratingType2 ?? "moderate",
      reasonType1: meal.reasonType1 ?? "",
      reasonType2: meal.reasonType2 ?? "",
      whyRisky: [],
      healthierAlternatives: [],
      foodsToAvoid: [],
      identifiedFoods: [],
      itemBreakdown: [],
    });
    router.push({
      pathname: "/results",
      params: { logId: meal.id, from: "dashboard" },
    });
  };

  const totalCalories =
    todayLogs?.reduce((s, m) => s + (m.calories ?? 0), 0) ?? 0;
  const totalCarbs =
    todayLogs?.reduce((s, m) => s + (m.totalCarbs ?? 0), 0) ?? 0;
  const totalSugar =
    todayLogs?.reduce((s, m) => s + (m.totalSugar ?? 0), 0) ?? 0;

  const maxCalories = goals?.dailyCalorieGoal ?? 1800;
  const maxCarbs = goals?.maxDailyCarbs ?? 200;
  const maxSugar = goals?.maxDailySugar ?? 50;

  const diabetesType = profile?.diabetesType ?? "type2";
  const firstName = profile?.firstName ?? "there";

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header with GlucoLens branding ── */}
        <View
          style={{
            paddingTop: insets.top + 12,
            paddingHorizontal: 20,
            paddingBottom: 20,
          }}
        >
          {/* App name */}
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: colors.primary,
              textAlign: "center",
              marginBottom: 16,
              letterSpacing: 1,
            }}
          >
            Gluco
            <Text style={{ color: colors.textPrimary }}>Lens</Text>
          </Text>

          {/* Greeting row */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 28,
                  fontWeight: "800",
                  color: colors.textPrimary,
                  lineHeight: 34,
                }}
              >
                {getGreeting()},{"\n"}
                {firstName}
              </Text>
            </View>

            {/* Diabetes awareness ribbon */}
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 16,
                backgroundColor: colors.primaryLight,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ribbon size={28} color={colors.primary} />
            </View>
          </View>
        </View>

        {/* ── Today's Summary card ── */}
        <View style={{ marginHorizontal: 20, marginBottom: 24 }}>
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: radius.xl,
              padding: 18,
              borderWidth: 1,
              borderColor: colors.glassBorder,
              ...shadow.card,
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: "800",
                color: colors.textPrimary,
                marginBottom: 16,
              }}
            >
              Today's Summary
            </Text>

            <View style={{ flexDirection: "row", gap: 6 }}>
              <SummaryStat
                label="Calories"
                value={totalCalories}
                max={maxCalories}
                unit="kcal"
                barColor={colors.primary}
              />
              <View
                style={{
                  width: 1,
                  backgroundColor: colors.border,
                  marginVertical: 8,
                }}
              />
              <SummaryStat
                label="Sugar"
                value={totalSugar}
                max={maxSugar}
                unit="g"
                barColor={colors.moderate}
              />
              <View
                style={{
                  width: 1,
                  backgroundColor: colors.border,
                  marginVertical: 8,
                }}
              />
              <SummaryStat
                label="Carbs"
                value={totalCarbs}
                max={maxCarbs}
                unit="g"
                barColor={colors.safe}
              />
            </View>
          </View>
        </View>

        {/* ── Scan Your Food CTA ── */}
        <View style={{ alignItems: "center", marginBottom: 28 }}>
          <Pressable
            onPress={() => router.push("/(tabs)/scan")}
            style={({ pressed }) => ({
              width: 110,
              height: 110,
              borderRadius: 55,
              backgroundColor: colors.primaryLight,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 3,
              borderColor: colors.primary,
              opacity: pressed ? 0.85 : 1,
              shadowColor: colors.primary,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.4,
              shadowRadius: 20,
              elevation: 8,
            })}
          >
            <Camera size={40} color={colors.primary} />
          </Pressable>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "700",
              color: colors.textPrimary,
              marginTop: 12,
            }}
          >
            Scan Your Food
          </Text>
        </View>

        {/* ── Recent Meals ── */}
        <View style={{ paddingLeft: 20 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 14,
              paddingRight: 20,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: "800",
                color: colors.textPrimary,
              }}
            >
              Recent Meals
            </Text>
            <Pressable
              onPress={() => router.push("/food-log")}
              style={{ flexDirection: "row", alignItems: "center", gap: 2 }}
            >
              <Text
                style={{
                  fontSize: 13,
                  color: colors.primary,
                  fontWeight: "600",
                }}
              >
                See All
              </Text>
              <ChevronRight size={14} color={colors.primary} />
            </Pressable>
          </View>

          {isLoading ? (
            <ActivityIndicator
              color={colors.primary}
              style={{ marginTop: 20, marginBottom: 20 }}
            />
          ) : !todayLogs || todayLogs.length === 0 ? (
            <EmptyDay onScan={() => router.push("/(tabs)/scan")} />
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: 20 }}
            >
              {todayLogs.map((meal) => (
                <RecentMealCard
                  key={meal.id}
                  meal={meal}
                  diabetesType={diabetesType}
                  onPress={() => openMeal(meal)}
                />
              ))}
            </ScrollView>
          )}
        </View>

        {/* ── Streak / motivation card ── */}
        {!isLoading && (todayLogs?.length ?? 0) > 0 && (
          <View
            style={{
              marginHorizontal: 20,
              marginTop: 20,
              backgroundColor: colors.primaryLight,
              borderRadius: radius.lg,
              padding: 16,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Flame size={28} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "700",
                  color: colors.primary,
                }}
              >
                Keep it up!
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: colors.textSecondary,
                  marginTop: 2,
                }}
              >
                You've logged {todayLogs?.length} meal
                {(todayLogs?.length ?? 0) !== 1 ? "s" : ""} today.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
