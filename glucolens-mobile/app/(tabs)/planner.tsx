/**
 * Meal Planner screen
 *
 * Shows this week's AI-generated meal plan and a shopping list.
 * Users can regenerate the plan (triggers backend AI call).
 * Tapping a meal logs it immediately via "quick re-log".
 */

import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  SectionList,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useProfileStore } from "@/stores/profileStore";
import { colors, radius, shadow } from "@/constants/tokens";
import {
  RefreshCw,
  ShoppingCart,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Calendar,
  CheckCircle2,
  Sunrise,
  Sun,
  Cookie,
  Moon,
  Lightbulb,
} from "lucide-react-native";
import { format, startOfWeek, addDays } from "date-fns";
import * as Haptics from "expo-haptics";

// ─── Types ───────────────────────────────────────────────────────────────────

interface MealItem {
  name: string;
  calories?: number;
  carbs?: number;
  protein?: number;
  fat?: number;
  note?: string;
}

interface DayPlan {
  day: string;
  meals: {
    breakfast: MealItem;
    lunch: MealItem;
    dinner: MealItem;
    snack?: MealItem;
  };
}

interface MealPlanData {
  weekPlan: DayPlan[];
  tips?: string[];
}

// ─── Day accordion card ──────────────────────────────────────────────────────

function DayCard({ day, dayPlan, today }: { day: string; dayPlan: DayPlan; today: string }) {
  const [open, setOpen] = useState(day === today);
  const slots = [
    { label: "Breakfast", icon: Sunrise, meal: dayPlan.meals.breakfast },
    { label: "Lunch", icon: Sun, meal: dayPlan.meals.lunch },
    { label: "Dinner", icon: Moon, meal: dayPlan.meals.dinner },
    ...(dayPlan.meals.snack ? [{ label: "Snack", icon: Cookie, meal: dayPlan.meals.snack }] : []),
  ];

  return (
    <View style={{
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      marginBottom: 10,
      overflow: "hidden",
      borderLeftWidth: 4,
      borderLeftColor: day === today ? colors.primary : colors.border,
      ...shadow.card,
    }}>
      <Pressable
        onPress={() => { Haptics.selectionAsync(); setOpen((o) => !o); }}
        style={{
          flexDirection: "row",
          alignItems: "center",
          padding: 14,
          backgroundColor: day === today ? colors.cardAlt : colors.card,
        }}
      >
        <View style={{
          width: 36, height: 36, borderRadius: 10,
          backgroundColor: day === today ? colors.primary : colors.border,
          alignItems: "center", justifyContent: "center",
          marginRight: 12,
        }}>
          <Calendar size={16} color={day === today ? colors.background : colors.textSecondary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{
            fontSize: 15,
            fontWeight: "700",
            color: day === today ? colors.primary : colors.textPrimary,
          }}>
            {day === today ? `Today · ${dayPlan.day}` : dayPlan.day}
          </Text>
          {!open && (
            <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 1 }} numberOfLines={1}>
              {dayPlan.meals.breakfast.name} · {dayPlan.meals.lunch.name}
            </Text>
          )}
        </View>
        {open ? (
          <ChevronUp size={18} color={colors.textSecondary} />
        ) : (
          <ChevronDown size={18} color={colors.textSecondary} />
        )}
      </Pressable>

      {open && (
        <View style={{ paddingHorizontal: 14, paddingBottom: 14, gap: 10 }}>
          {slots.map(({ label, icon: IconComponent, meal }) => (
            <View key={label} style={{
              backgroundColor: colors.background,
              borderRadius: radius.md,
              padding: 12,
              borderLeftWidth: 3,
              borderLeftColor: colors.primary,
            }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <IconComponent size={18} color={colors.primary} />
                <Text style={{ fontSize: 12, fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  {label}
                </Text>
              </View>
              <Text style={{ fontSize: 14, fontWeight: "600", color: colors.textPrimary }}>
                {meal.name}
              </Text>
              {(meal.calories || meal.carbs) && (
                <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 3 }}>
                  {meal.calories ? `${meal.calories} kcal` : ""}
                  {meal.calories && meal.carbs ? " · " : ""}
                  {meal.carbs ? `${meal.carbs}g carbs` : ""}
                  {meal.protein ? ` · ${meal.protein}g protein` : ""}
                </Text>
              )}
              {meal.note && (
                <Text style={{ fontSize: 12, color: colors.primary, marginTop: 3, fontStyle: "italic" }}>
                  {meal.note}
                </Text>
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Shopping list pill ──────────────────────────────────────────────────────

interface ShoppingItem {
  name: string;
  quantity?: string;
  category?: string;
}

function ShoppingListCard({ items }: { items: ShoppingItem[] }) {
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const toggle = (name: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
    Haptics.selectionAsync();
  };

  // Group by category
  const grouped = items.reduce<Record<string, ShoppingItem[]>>((acc, item) => {
    const cat = item.category ?? "Other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  return (
    <View style={{
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      padding: 16,
      marginTop: 8,
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
      ...shadow.card,
    }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <ShoppingCart size={18} color={colors.primary} />
        <Text style={{ fontSize: 16, fontWeight: "700", color: colors.textPrimary }}>
          Shopping List
        </Text>
        <View style={{ marginLeft: "auto" }}>
          <Text style={{ fontSize: 12, color: colors.textSecondary }}>
            {checked.size}/{items.length} items
          </Text>
        </View>
      </View>

      {Object.entries(grouped).map(([cat, catItems]) => (
        <View key={cat} style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 11, fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6 }}>
            {cat}
          </Text>
          {catItems.map((item) => {
            const done = checked.has(item.name);
            return (
              <Pressable
                key={item.name}
                onPress={() => toggle(item.name)}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  paddingVertical: 6,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <CheckCircle2 size={18} color={done ? colors.primary : colors.border} />
                <Text style={{
                  flex: 1,
                  fontSize: 14,
                  color: done ? colors.textSecondary : colors.textPrimary,
                  textDecorationLine: done ? "line-through" : "none",
                }}>
                  {item.name}
                </Text>
                {item.quantity && (
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>{item.quantity}</Text>
                )}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

// ─── Empty / Generate CTA ────────────────────────────────────────────────────

function EmptyPlan({ onGenerate, loading }: { onGenerate: () => void; loading: boolean }) {
  return (
    <View style={{ alignItems: "center", paddingTop: 60, paddingHorizontal: 32 }}>
      <View style={{
        width: 80, height: 80, borderRadius: 24,
        backgroundColor: colors.primaryLight,
        alignItems: "center", justifyContent: "center",
        marginBottom: 20,
      }}>
        <Sparkles size={36} color={colors.primary} />
      </View>
      <Text style={{ fontSize: 20, fontWeight: "800", color: colors.textPrimary, textAlign: "center" }}>
        No meal plan yet
      </Text>
      <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: "center", marginTop: 8, lineHeight: 21 }}>
        Generate a personalised weekly plan based on your diabetes type, goals, and dietary preferences.
      </Text>
      <Pressable
        onPress={onGenerate}
        disabled={loading}
        style={({ pressed }) => ({
          marginTop: 28,
          backgroundColor: colors.primary,
          paddingHorizontal: 32,
          paddingVertical: 14,
          borderRadius: 16,
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          opacity: pressed || loading ? 0.8 : 1,
          ...shadow.button,
        })}
      >
        {loading ? <ActivityIndicator color={colors.background} size="small" /> : <Sparkles size={16} color={colors.background} />}
        <Text style={{ color: colors.background, fontWeight: "700", fontSize: 15 }}>
          {loading ? "Generating…" : "Generate My Plan"}
        </Text>
      </Pressable>
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function PlannerScreen() {
  const insets = useSafeAreaInsets();
  const profile = useProfileStore((s) => s.profile);
  const [activeTab, setActiveTab] = useState<"plan" | "shopping">("plan");

  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const todayName = format(new Date(), "EEEE"); // e.g. "Monday"

  const { data: mealPlan, refetch, isLoading } = trpc.mealPlan.getCurrent.useQuery({ weekStart });

  const generateMutation = trpc.mealPlan.generate.useMutation({
    onSuccess: () => refetch(),
    onError: (e) => Alert.alert("Generation failed", e.message),
  });

  const { data: shoppingList } = trpc.shoppingList.getCurrent.useQuery(
    { mealPlanId: mealPlan?.id ?? 0 },
    { enabled: !!mealPlan?.id }
  );

  const handleGenerate = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    generateMutation.mutate({
      weekStart,
      diabetesType: profile?.diabetesType ?? "type2",
      country: profile?.country,
    });
  };

  const planData: MealPlanData | null = mealPlan?.planJson
    ? (() => {
        try {
          const raw = JSON.parse(mealPlan.planJson);
          // AI returns { days: [...], weeklyTip } but UI expects { weekPlan, tips }
          const weekPlan = (raw.weekPlan ?? raw.days ?? []).map((d: any) => ({
            day: d.day,
            meals: {
              breakfast: { name: d.meals?.breakfast?.name ?? "Breakfast", calories: d.meals?.breakfast?.calories, carbs: d.meals?.breakfast?.carbs_g ?? d.meals?.breakfast?.carbs, protein: d.meals?.breakfast?.protein_g ?? d.meals?.breakfast?.protein, note: d.meals?.breakfast?.description },
              lunch: { name: d.meals?.lunch?.name ?? "Lunch", calories: d.meals?.lunch?.calories, carbs: d.meals?.lunch?.carbs_g ?? d.meals?.lunch?.carbs, protein: d.meals?.lunch?.protein_g ?? d.meals?.lunch?.protein, note: d.meals?.lunch?.description },
              dinner: { name: d.meals?.dinner?.name ?? "Dinner", calories: d.meals?.dinner?.calories, carbs: d.meals?.dinner?.carbs_g ?? d.meals?.dinner?.carbs, protein: d.meals?.dinner?.protein_g ?? d.meals?.dinner?.protein, note: d.meals?.dinner?.description },
              ...(d.meals?.snack ? { snack: { name: d.meals.snack.name ?? "Snack", calories: d.meals.snack.calories, carbs: d.meals.snack.carbs_g ?? d.meals.snack.carbs, protein: d.meals.snack.protein_g ?? d.meals.snack.protein, note: d.meals.snack.description } } : {}),
            },
          }));
          const tips = raw.tips ?? (raw.weeklyTip ? [raw.weeklyTip] : []);
          return { weekPlan, tips } as MealPlanData;
        } catch { return null; }
      })()
    : null;

  const shoppingItems: ShoppingItem[] = shoppingList?.listJson
    ? (() => {
        try {
          const parsed = JSON.parse(shoppingList.listJson);
          // Flatten categories array → flat list
          if (Array.isArray(parsed.categories)) {
            return parsed.categories.flatMap((cat: any) =>
              (cat.items ?? []).map((item: any) => ({
                name: item.name ?? item,
                quantity: item.quantity,
                category: cat.name,
              }))
            );
          }
          return Array.isArray(parsed) ? parsed : [];
        } catch { return []; }
      })()
    : [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{
        paddingTop: insets.top + 16,
        paddingHorizontal: 20,
        paddingBottom: 16,
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}>
        <Text style={{ fontSize: 26, fontWeight: "800", color: colors.textPrimary }}>Meal Planner</Text>
        <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 2 }}>
          Week of {format(startOfWeek(new Date(), { weekStartsOn: 1 }), "d MMM")}
        </Text>

        {/* Tab bar */}
        <View style={{
          flexDirection: "row",
          backgroundColor: colors.glass,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.glassBorder,
          marginTop: 14,
          padding: 4,
          gap: 4,
        }}>
          {(["plan", "shopping"] as const).map((tab) => (
            <Pressable
              key={tab}
              onPress={() => { Haptics.selectionAsync(); setActiveTab(tab); }}
              style={{
                flex: 1,
                paddingVertical: 8,
                borderRadius: 10,
                alignItems: "center",
                backgroundColor: activeTab === tab ? colors.primary : "transparent",
              }}
            >
              <Text style={{
                fontSize: 13,
                fontWeight: "700",
                color: activeTab === tab ? colors.background : colors.textSecondary,
                textTransform: "capitalize",
              }}>
                {tab === "shopping" ? "Shopping List" : "Meal Plan"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 60 }} />
        ) : !planData ? (
          <EmptyPlan onGenerate={handleGenerate} loading={generateMutation.isPending} />
        ) : activeTab === "plan" ? (
          <>
            {/* Regenerate button */}
            <Pressable
              onPress={handleGenerate}
              disabled={generateMutation.isPending}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                paddingVertical: 10,
                borderRadius: radius.lg,
                backgroundColor: colors.primary,
                marginBottom: 16,
                opacity: pressed || generateMutation.isPending ? 0.7 : 1,
                ...shadow.button,
              })}
            >
              {generateMutation.isPending ? (
                <ActivityIndicator color={colors.background} size="small" />
              ) : (
                <RefreshCw size={14} color={colors.background} />
              )}
              <Text style={{ color: colors.background, fontWeight: "700", fontSize: 13 }}>
                {generateMutation.isPending ? "Regenerating…" : "Regenerate Plan"}
              </Text>
            </Pressable>

            {/* Day cards */}
            {planData.weekPlan?.map((dp, i) => {
              const dayDate = format(addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), i), "EEEE");
              return (
                <DayCard
                  key={dp.day ?? i}
                  day={todayName}
                  dayPlan={{ ...dp, day: dp.day ?? dayDate }}
                  today={todayName}
                />
              );
            })}

            {/* Tips banner */}
            {planData.tips && planData.tips.length > 0 && (
              <View style={{
                backgroundColor: colors.primaryLight,
                borderRadius: radius.lg,
                padding: 14,
                marginTop: 8,
                borderLeftWidth: 4,
                borderLeftColor: colors.primary,
              }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <Lightbulb size={16} color={colors.primary} />
                  <Text style={{ fontSize: 13, fontWeight: "700", color: colors.primary }}>
                    Dietitian Tips
                  </Text>
                </View>
                {planData.tips.map((tip, i) => (
                  <Text key={i} style={{ fontSize: 13, color: colors.textPrimary, lineHeight: 19, marginBottom: 4 }}>
                    • {tip}
                  </Text>
                ))}
              </View>
            )}
          </>
        ) : (
          /* Shopping list tab */
          shoppingItems.length > 0 ? (
            <ShoppingListCard items={shoppingItems} />
          ) : (
            <View style={{ alignItems: "center", paddingTop: 60 }}>
              <ShoppingCart size={40} color={colors.border} />
              <Text style={{ marginTop: 16, fontSize: 15, color: colors.textSecondary, textAlign: "center" }}>
                No shopping list yet.{"\n"}Generate a meal plan first.
              </Text>
            </View>
          )
        )}
      </ScrollView>
    </View>
  );
}
