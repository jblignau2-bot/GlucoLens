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
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useState, useCallback, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAnalysisStore } from "@/stores/analysisStore";
import { useProfileStore } from "@/stores/profileStore";
import { colors, radius, shadow } from "@/constants/tokens";
import { ArrowLeft, Search, Utensils, ChevronRight, Filter, Pencil } from "lucide-react-native";
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

// ─── Edit meal modal ────────────────────────────────────────────────────────

interface MealEntry {
  id: number;
  mealName: string;
  calories: number | null;
  totalCarbs: number | null;
  totalSugar: number | null;
  glycemicIndex?: number | null;
  glycemicLoad?: number | null;
  protein?: number | null;
  fat?: number | null;
  fiber?: number | null;
  ratingType1: string | null;
  ratingType2: string | null;
  loggedAt: string;
}

function EditMealModal({
  meal,
  onClose,
  onSave,
  saving,
}: {
  meal: MealEntry | null;
  onClose: () => void;
  onSave: (id: number, updates: Record<string, number | string>) => void;
  saving: boolean;
}) {
  const [name, setName] = useState("");
  const [cal, setCal] = useState("");
  const [sugar, setSugar] = useState("");
  const [carbs, setCarbs] = useState("");
  const [protein, setProtein] = useState("");
  const [fat, setFat] = useState("");
  const [fiber, setFiber] = useState("");

  useEffect(() => {
    if (meal) {
      setName(meal.mealName ?? "");
      setCal(String(Math.round(meal.calories ?? 0)));
      setSugar(String(Math.round((meal.totalSugar ?? 0) * 10) / 10));
      setCarbs(String(Math.round((meal.totalCarbs ?? 0) * 10) / 10));
      setProtein(String(Math.round((meal.protein ?? 0) * 10) / 10));
      setFat(String(Math.round((meal.fat ?? 0) * 10) / 10));
      setFiber(String(Math.round((meal.fiber ?? 0) * 10) / 10));
    }
  }, [meal]);

  if (!meal) return null;

  const fields = [
    { label: "Meal name", value: name, set: setName, kbd: "default" as const },
    { label: "Calories (kcal)", value: cal, set: setCal, kbd: "numeric" as const },
    { label: "Sugar (g)", value: sugar, set: setSugar, kbd: "numeric" as const },
    { label: "Carbs (g)", value: carbs, set: setCarbs, kbd: "numeric" as const },
    { label: "Protein (g)", value: protein, set: setProtein, kbd: "numeric" as const },
    { label: "Fat (g)", value: fat, set: setFat, kbd: "numeric" as const },
    { label: "Fibre (g)", value: fiber, set: setFiber, kbd: "numeric" as const },
  ];

  return (
    <Modal visible={!!meal} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: colors.overlay }}>
          <View style={{
            backgroundColor: colors.card,
            borderTopLeftRadius: 24, borderTopRightRadius: 24,
            padding: 24, paddingBottom: 40, gap: 12,
            borderTopWidth: 1, borderTopColor: colors.border,
            maxHeight: "80%",
          }}>
            <Text style={{ fontSize: 18, fontWeight: "800", color: colors.textPrimary, marginBottom: 4 }}>
              Edit Meal
            </Text>
            <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 4 }}>
              Correct any values the AI got wrong — your daily summary will update automatically.
            </Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              {fields.map(({ label, value, set, kbd }) => (
                <View key={label} style={{ marginBottom: 10 }}>
                  <Text style={{ fontSize: 12, fontWeight: "600", color: colors.textSecondary, marginBottom: 4 }}>
                    {label}
                  </Text>
                  <TextInput
                    value={value}
                    onChangeText={set}
                    keyboardType={kbd}
                    style={{
                      backgroundColor: colors.background,
                      borderRadius: radius.md,
                      padding: 10, fontSize: 15, fontWeight: "600",
                      color: colors.textPrimary,
                      borderWidth: 1, borderColor: colors.border,
                    }}
                  />
                </View>
              ))}
            </ScrollView>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
              <Pressable onPress={onClose} style={{
                flex: 1, height: 48, borderRadius: radius.lg,
                alignItems: "center", justifyContent: "center",
                backgroundColor: colors.background,
                borderWidth: 1, borderColor: colors.border,
              }}>
                <Text style={{ fontWeight: "700", color: colors.textSecondary }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  onSave(meal.id, {
                    mealName: name.trim(),
                    calories: Number(cal) || 0,
                    totalSugar: Number(sugar) || 0,
                    totalCarbs: Number(carbs) || 0,
                    protein: Number(protein) || 0,
                    fat: Number(fat) || 0,
                    fiber: Number(fiber) || 0,
                  });
                }}
                disabled={saving}
                style={({ pressed }) => ({
                  flex: 2, height: 48, borderRadius: radius.lg,
                  alignItems: "center", justifyContent: "center",
                  backgroundColor: colors.primary,
                  opacity: pressed || saving ? 0.85 : 1,
                })}
              >
                {saving ? <ActivityIndicator color="#fff" /> : (
                  <Text style={{ fontWeight: "700", color: "#fff", fontSize: 15 }}>Save Changes</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Meal row ─────────────────────────────────────────────────────────────────

function MealRow({
  meal,
  diabetesType,
  onPress,
  onLongPress,
  onEdit,
}: {
  meal: MealEntry;
  diabetesType: string;
  onPress: () => void;
  onLongPress: () => void;
  onEdit: () => void;
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

      <Pressable
        onPress={(e) => { e.stopPropagation?.(); onEdit(); }}
        hitSlop={8}
        style={{ padding: 6 }}
      >
        <Pencil size={14} color={colors.textSecondary} />
      </Pressable>

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
  );
}

// ─── Summary bar ─────────────────────────────────────────────────────────────

function SummaryBar({
  meals,
  diabetesType,
}: {
  meals: MealEntry[];
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
        gap: 8,
        marginBottom: 16,
      }}
    >
      {[
        { label: "Safe", count: safe, color: colors.safe, bg: colors.safeBg },
        {
          label: "Moderate",
          count: moderate,
          color: colors.moderate,
          bg: colors.moderateBg,
        },
        { label: "Risky", count: risky, color: colors.risky, bg: colors.riskyBg },
        {
          label: "Total kcal",
          count: Math.round(totalCal),
          color: colors.primary,
          bg: colors.primaryLight,
        },
      ].map(({ label, count, color, bg }) => (
        <View
          key={label}
          style={{
            flex: 1,
            backgroundColor: bg,
            borderRadius: radius.md,
            padding: 10,
            alignItems: "center",
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: "800", color }}>{count}</Text>
          <Text
            style={{
              fontSize: 10,
              color: colors.textSecondary,
              textAlign: "center",
              marginTop: 1,
            }}
          >
            {label}
          </Text>
        </View>
      ))}
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function FoodLogScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const profile = useProfileStore((s) => s.profile);
  const setAnalysis = useAnalysisStore((s) => s.setResult);

  const [dateFilter, setDateFilter] = useState<DateFilter>("week");
  const [ratingFilter, setRatingFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [editingMeal, setEditingMeal] = useState<MealEntry | null>(null);

  const dateRange = getDateRange(dateFilter);
  const diabetesType = profile?.diabetesType ?? "type2";

  const { data: meals, refetch, isLoading } = trpc.food.list.useQuery({
    ...dateRange,
    limit: 100,
  });

  const updateMutation = trpc.food.update.useMutation({
    onSuccess: () => {
      refetch();
      setEditingMeal(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (e) => Alert.alert("Error", e.message || "Failed to update meal"),
  });

  const deleteMutation = trpc.food.delete.useMutation({
    onSuccess: () => {
      refetch();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    },
    onError: (e) =>
      Alert.alert("Error", e.message || "Failed to delete meal"),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const filtered = (meals ?? []).filter((m: any) => {
    const rating = diabetesType === "type1" ? m.ratingType1 : m.ratingType2;
    if (ratingFilter && rating !== ratingFilter) return false;
    if (
      search.trim() &&
      !m.mealName.toLowerCase().includes(search.toLowerCase())
    )
      return false;
    return true;
  });

  // Group by date
  const grouped = filtered.reduce<Record<string, MealEntry[]>>((acc, m: any) => {
    const key = format(new Date(m.loggedAt), "EEEE, d MMM yyyy");
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {});

  const openMeal = (meal: MealEntry) => {
    setAnalysis({
      mealName: meal.mealName,
      calories: meal.calories ?? 0,
      totalSugar: meal.totalSugar ?? 0,
      totalCarbs: meal.totalCarbs ?? 0,
      glycemicIndex: 0,
      glycemicLoad: 0,
      protein: 0,
      fat: 0,
      fiber: 0,
      ratingType1: (meal.ratingType1 as any) ?? "moderate",
      ratingType2: (meal.ratingType2 as any) ?? "moderate",
      reasonType1: "",
      reasonType2: "",
      whyRisky: [],
      healthierAlternatives: [],
      foodsToAvoid: [],
      identifiedFoods: [],
      itemBreakdown: [],
    });
    router.push({
      pathname: "/results",
      params: { logId: meal.id, from: "food-log" },
    });
  };

  const handleDeleteMeal = (meal: MealEntry) => {
    Alert.alert(
      "Delete meal",
      `Remove "${meal.mealName}"?\n\nThis action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteMutation.mutate({ id: meal.id }),
        },
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <EditMealModal
        meal={editingMeal}
        onClose={() => setEditingMeal(null)}
        onSave={(id, updates) => updateMutation.mutate({ id, ...updates } as any)}
        saving={updateMutation.isPending}
      />

      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 12,
          paddingHorizontal: 16,
          paddingBottom: 16,
          backgroundColor: colors.primary,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            marginBottom: 14,
          }}
        >
          <Pressable
            onPress={() => router.back()}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: "rgba(255,255,255,0.2)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ArrowLeft size={18} color="#fff" />
          </Pressable>
          <Text
            style={{
              fontSize: 22,
              fontWeight: "800",
              color: "#fff",
              flex: 1,
            }}
          >
            Food Log
          </Text>
          <Pressable
            onPress={() => setFiltersOpen((o) => !o)}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: filtersOpen
                ? "rgba(255,255,255,0.3)"
                : "rgba(255,255,255,0.15)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Filter size={16} color="#fff" />
          </Pressable>
        </View>

        {/* Search */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: colors.glass,
            borderRadius: radius.md,
            paddingHorizontal: 12,
            gap: 8,
            borderWidth: 1,
            borderColor: colors.glassBorder,
          }}
        >
          <Search size={15} color="rgba(255,255,255,0.7)" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search meals..."
            placeholderTextColor="rgba(255,255,255,0.6)"
            style={{
              flex: 1,
              height: 40,
              fontSize: 14,
              color: "#fff",
            }}
          />
        </View>
      </View>

      {/* Filter chips */}
      {filtersOpen && (
        <View
          style={{
            backgroundColor: colors.cardAlt,
            paddingHorizontal: 16,
            paddingVertical: 10,
            gap: 8,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          {/* Date filter */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {DATE_FILTERS.map(({ key, label }) => (
                <Pressable
                  key={key}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setDateFilter(key);
                  }}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 6,
                    borderRadius: 20,
                    backgroundColor:
                      dateFilter === key
                        ? colors.primary
                        : colors.background,
                    borderWidth: 1,
                    borderColor:
                      dateFilter === key
                        ? colors.primary
                        : colors.border,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "600",
                      color:
                        dateFilter === key
                          ? "#fff"
                          : colors.textSecondary,
                    }}
                  >
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          {/* Rating filter */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {[null, "safe", "moderate", "risky"].map((r) => (
                <Pressable
                  key={r ?? "all"}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setRatingFilter(r);
                  }}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 6,
                    borderRadius: 20,
                    backgroundColor:
                      ratingFilter === r
                        ? r === "safe"
                          ? colors.safe
                          : r === "risky"
                            ? colors.risky
                            : r === "moderate"
                              ? colors.moderate
                              : colors.primary
                        : colors.background,
                    borderWidth: 1,
                    borderColor:
                      ratingFilter === r
                        ? r === "safe"
                          ? colors.safe
                          : r === "risky"
                            ? colors.risky
                            : r === "moderate"
                              ? colors.moderate
                              : colors.primary
                        : colors.border,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "600",
                      color:
                        ratingFilter === r ? "#fff" : colors.textSecondary,
                      textTransform: "capitalize",
                    }}
                  >
                    {r ?? "All Ratings"}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      <ScrollView
        contentContainerStyle={{
          padding: 16,
          paddingBottom: insets.bottom + 40,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <ActivityIndicator
            color={colors.primary}
            style={{ marginTop: 40 }}
          />
        ) : filtered.length === 0 ? (
          <View style={{ alignItems: "center", paddingTop: 60 }}>
            <Utensils size={40} color={colors.border} />
            <Text
              style={{
                marginTop: 12,
                fontSize: 15,
                color: colors.textSecondary,
                textAlign: "center",
              }}
            >
              No meals found{search ? ` matching "${search}"` : ""}.
            </Text>
          </View>
        ) : (
          <>
            <SummaryBar
              meals={filtered as MealEntry[]}
              diabetesType={diabetesType}
            />
            {Object.entries(grouped).map(([date, dayMeals]) => (
              <View key={date}>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "700",
                    color: colors.textSecondary,
                    marginBottom: 8,
                    marginTop: 4,
                  }}
                >
                  {date}
                </Text>
                {dayMeals.map((m) => (
                  <MealRow
                    key={m.id}
                    meal={m}
                    diabetesType={diabetesType}
                    onPress={() => openMeal(m)}
                    onLongPress={() => handleDeleteMeal(m)}
                    onEdit={() => setEditingMeal(m)}
                  />
                ))}
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}
