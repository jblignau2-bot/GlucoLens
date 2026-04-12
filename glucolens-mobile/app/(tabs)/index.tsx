/**
 * Dashboard (Home) screen — matches v3 mockup design
 *
 * Shows:
 *  - GlucoLens branding header with greeting
 *  - Daily motivation quote
 *  - Quick-action grid linking to all sections
 *  - Today's Summary (Calories / Sugar / Carbs with progress bars)
 *  - Recent Meals carousel
 *  - Streak/motivation card
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
import { useState, useCallback, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useProfileStore } from "@/stores/profileStore";
import { useAnalysisStore } from "@/stores/analysisStore";
import { colors, radius, shadow } from "@/constants/tokens";
import {
  Flame,
  ChevronRight,
  Camera,
  Ribbon,
  LayoutGrid,
  BookOpen,
  MessageCircle,
  UtensilsCrossed,
  ShoppingCart,
  TrendingUp,
  User,
  Droplets,
} from "lucide-react-native";
import { format, startOfDay, endOfDay } from "date-fns";

const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_WIDTH = SCREEN_WIDTH * 0.42;

// ─── Daily motivation quotes ────────────────────────────────────────────────

const MOTIVATION_QUOTES = [
  { text: "Every healthy meal is a step toward a better you.", author: "GlucoLens" },
  { text: "Your body is a temple. Feed it wisely.", author: "GlucoLens" },
  { text: "Small changes today lead to big results tomorrow.", author: "GlucoLens" },
  { text: "You don't have to be perfect, just consistent.", author: "GlucoLens" },
  { text: "Managing diabetes is not a sprint, it's a marathon.", author: "GlucoLens" },
  { text: "Knowledge is power. Know your food, control your sugar.", author: "GlucoLens" },
  { text: "One meal at a time. One step at a time.", author: "GlucoLens" },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function ratingColor(rating: "safe" | "moderate" | "risky" | undefined): string {
  if (rating === "safe") return colors.safe;
  if (rating === "risky") return colors.risky;
  return colors.moderate;
}

function ratingBg(rating: "safe" | "moderate" | "risky" | undefined): string {
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

function getFoodEmoji(name: string): string {
  const n = name.toLowerCase();
  if (/salad|greens|lettuce|spinach/.test(n)) return "🥗";
  if (/wrap|burrito|taco|tortilla/.test(n)) return "🌯";
  if (/rice|pilaf|risotto/.test(n)) return "🍚";
  if (/pasta|spaghetti|noodle|linguine/.test(n)) return "🍝";
  if (/chicken|poultry|turkey/.test(n)) return "🍗";
  if (/beef|steak|burger/.test(n)) return "🥩";
  if (/fish|salmon|tuna|seafood|prawn/.test(n)) return "🐟";
  if (/egg|omelette|frittata/.test(n)) return "🍳";
  if (/soup|stew|broth/.test(n)) return "🍲";
  if (/sandwich|toast|bread/.test(n)) return "🥪";
  if (/pizza/.test(n)) return "🍕";
  if (/sushi|roll/.test(n)) return "🍱";
  if (/fruit|apple|banana|berry|mango/.test(n)) return "🍎";
  if (/smoothie|juice|shake|drink/.test(n)) return "🥤";
  if (/yogurt|oats|cereal|porridge/.test(n)) return "🥣";
  if (/curry|dal|lentil/.test(n)) return "🍛";
  if (/snack|nut|almond|cashew/.test(n)) return "🥜";
  if (/sweet|cake|dessert|chocolate|cookie/.test(n)) return "🍰";
  return "🍽️";
}

// ─── Summary stat column ────────────────────────────────────────────────────

function SummaryStat({ label, value, max, unit }: { label: string; value: number; max: number; unit: string }) {
  const pct = Math.min(Math.round((value / Math.max(max, 1)) * 100), 100);
  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <Text style={{ fontSize: 11, fontWeight: "600", color: colors.textSecondary, marginBottom: 6 }}>{label}</Text>
      <Text style={{ fontSize: 18, fontWeight: "800", color: colors.textPrimary }}>
        {Math.round(value)}
        <Text style={{ fontWeight: "400", color: colors.textSecondary, fontSize: 11 }}> {unit}</Text>
      </Text>
      <View style={{ width: "85%", height: 6, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 3, marginTop: 8, overflow: "hidden" }}>
        <View style={{ width: `${pct}%`, height: "100%", backgroundColor: colors.primary, borderRadius: 3 }} />
      </View>
      <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4 }}>{pct}%</Text>
    </View>
  );
}

// ─── Quick Action Button ────────────────────────────────────────────────────

const QA_WIDTH = (SCREEN_WIDTH - 42 - 10) / 2;

function QuickAction({ icon: Icon, label, onPress, iconColor }: {
  icon: any;
  label: string;
  onPress: () => void;
  iconColor?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width: QA_WIDTH,
        height: QA_WIDTH * 0.75,
        backgroundColor: colors.card,
        borderRadius: radius.xl,
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        borderWidth: 1,
        borderColor: colors.border,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center" }}>
        <Icon size={24} color={iconColor || colors.primary} strokeWidth={2} />
      </View>
      <Text style={{ fontSize: 13, fontWeight: "700", color: colors.textPrimary, textAlign: "center" }}>{label}</Text>
    </Pressable>
  );
}

// ─── Recent meal card ───────────────────────────────────────────────────────

function RecentMealCard({ meal, diabetesType, onPress }: {
  meal: { id: number; mealName: string; calories: number | null; totalCarbs: number | null; ratingType1: "safe" | "moderate" | "risky" | null; ratingType2: "safe" | "moderate" | "risky" | null; loggedAt: string };
  diabetesType: string;
  onPress: () => void;
}) {
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
      <View style={{ height: 90, backgroundColor: ratingBg(rating ?? undefined), alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontSize: 42 }}>{getFoodEmoji(meal.mealName)}</Text>
      </View>
      <View style={{ padding: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: col }} />
          <Text style={{ fontSize: 11, color: colors.textSecondary }}>{time}</Text>
        </View>
        <Text style={{ fontSize: 13, fontWeight: "700", color: colors.textPrimary }} numberOfLines={1}>{meal.mealName}</Text>
        <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>{label}: {Math.round(meal.calories ?? 0)} kcal</Text>
      </View>
    </Pressable>
  );
}

// ─── Main screen ────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const profile = useProfileStore((s) => s.profile);
  const setAnalysis = useAnalysisStore((s) => s.setResult);
  const [refreshing, setRefreshing] = useState(false);

  const todayStart = startOfDay(new Date()).toISOString();
  const todayEnd = endOfDay(new Date()).toISOString();

  const { data: todayLogs, refetch, isLoading } = trpc.food.list.useQuery({ from: todayStart, to: todayEnd, limit: 20 });
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
    router.push({ pathname: "/results", params: { logId: meal.id, from: "dashboard" } });
  };

  const totalCalories = todayLogs?.reduce((s, m) => s + (m.calories ?? 0), 0) ?? 0;
  const totalCarbs = todayLogs?.reduce((s, m) => s + (m.totalCarbs ?? 0), 0) ?? 0;
  const totalSugar = todayLogs?.reduce((s, m) => s + (m.totalSugar ?? 0), 0) ?? 0;

  const maxCalories = goals?.dailyCalorieGoal ?? 1800;
  const maxCarbs = goals?.maxDailyCarbs ?? 200;
  const maxSugar = goals?.maxDailySugar ?? 50;

  const diabetesType = profile?.diabetesType ?? "type2";
  const firstName = profile?.firstName ?? "there";

  // Daily quote based on day of year
  const quote = useMemo(() => {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    return MOTIVATION_QUOTES[dayOfYear % MOTIVATION_QUOTES.length];
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 16 }}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: colors.textPrimary, textAlign: "center", marginBottom: 14, letterSpacing: 0.5 }}>
            Gluco<Text style={{ color: colors.primary }}>Lens</Text>
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 26, fontWeight: "800", color: colors.textPrimary, lineHeight: 32 }}>
                {getGreeting()},{"\n"}{firstName}
              </Text>
            </View>
            <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center" }}>
              <Ribbon size={26} color={colors.primary} />
            </View>
          </View>
        </View>

        {/* Daily Motivation Quote */}
        <View style={{ marginHorizontal: 20, marginBottom: 20 }}>
          <View style={{
            backgroundColor: colors.card,
            borderRadius: radius.lg,
            padding: 16,
            borderWidth: 1,
            borderColor: colors.border,
            borderLeftWidth: 3,
            borderLeftColor: colors.primary,
          }}>
            <Text style={{ fontSize: 13, fontStyle: "italic", color: colors.textSecondary, lineHeight: 20 }}>
              "{quote.text}"
            </Text>
          </View>
        </View>

        {/* Quick Actions Grid */}
        <View style={{ marginHorizontal: 16, marginBottom: 20 }}>
          <Text style={{ fontSize: 11, fontWeight: "700", color: colors.primary, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12 }}>Quick Actions</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            <QuickAction icon={LayoutGrid} label="Meal Planner" onPress={() => router.push("/(tabs)/planner")} />
            <QuickAction icon={Camera} label="Scan Meal" onPress={() => router.push("/(tabs)/scan")} />
            <QuickAction icon={BookOpen} label="Glucose Guide" onPress={() => router.push("/(tabs)/reminders")} />
            <QuickAction icon={UtensilsCrossed} label="Food Diary" onPress={() => router.push("/food-log")} />
            <QuickAction icon={TrendingUp} label="My Progress" onPress={() => router.push("/progress")} />
          </View>
        </View>

        {/* Today's Summary */}
        <View style={{ marginHorizontal: 20, marginBottom: 20 }}>
          <View style={{
            backgroundColor: colors.card,
            borderRadius: radius.xl,
            padding: 18,
            borderWidth: 1,
            borderColor: colors.glassBorder,
            ...shadow.card,
          }}>
            <Text style={{ fontSize: 16, fontWeight: "800", color: colors.textPrimary, marginBottom: 14 }}>Today's Nutrition</Text>
            <View style={{ flexDirection: "row", gap: 6 }}>
              <SummaryStat label="Calories" value={totalCalories} max={maxCalories} unit="kcal" />
              <View style={{ width: 1, backgroundColor: colors.border, marginVertical: 8 }} />
              <SummaryStat label="Sugar" value={totalSugar} max={maxSugar} unit="g" />
              <View style={{ width: 1, backgroundColor: colors.border, marginVertical: 8 }} />
              <SummaryStat label="Carbs" value={totalCarbs} max={maxCarbs} unit="g" />
            </View>
          </View>
        </View>

        {/* Recent Meals */}
        <View style={{ paddingLeft: 20 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14, paddingRight: 20 }}>
            <Text style={{ fontSize: 16, fontWeight: "800", color: colors.textPrimary }}>Recent Meals</Text>
            <Pressable onPress={() => router.push("/food-log")} style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
              <Text style={{ fontSize: 13, color: colors.primary, fontWeight: "600" }}>See All</Text>
              <ChevronRight size={14} color={colors.primary} />
            </Pressable>
          </View>

          {isLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 20, marginBottom: 20 }} />
          ) : !todayLogs || todayLogs.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 20, paddingHorizontal: 24 }}>
              <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: "center", lineHeight: 22 }}>
                No meals logged yet today.{"\n"}Scan your first meal to get started!
              </Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 20 }}>
              {todayLogs.map((meal) => (
                <RecentMealCard key={meal.id} meal={meal} diabetesType={diabetesType} onPress={() => openMeal(meal)} />
              ))}
            </ScrollView>
          )}
        </View>

        {/* Streak card */}
        {!isLoading && (todayLogs?.length ?? 0) > 0 && (
          <View style={{
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
          }}>
            <Flame size={28} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: "700", color: colors.primary }}>Keep it up!</Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                You've logged {todayLogs?.length} meal{(todayLogs?.length ?? 0) !== 1 ? "s" : ""} today.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
