/**
 * Meal Planner screen — v2
 *
 * Swipeable day cards with cooking instructions, ingredient grams,
 * daily limit progress bars. Shopping list with 3-store price comparison
 * and PDF/CSV export.
 */

import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  FlatList,
  useWindowDimensions,
  Animated as RNAnimated,
  Share,
  Switch,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useProfileStore } from "@/stores/profileStore";
import { colors, radius, shadow } from "@/constants/tokens";
import {
  RefreshCw,
  ShoppingCart,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ChefHat,
  Sunrise,
  Sun,
  Cookie,
  Moon,
  Lightbulb,
  Flame,
  Wheat,
  Droplets,
  FileSpreadsheet,
  FileText,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  UtensilsCrossed,
  ListOrdered,
  LayoutGrid,
  Store,
  RotateCcw,
  Bell,
  Share2,
} from "lucide-react-native";
import { format, startOfWeek, addDays, parseISO } from "date-fns";
import * as Haptics from "expo-haptics";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Ingredient {
  name: string;
  amount: string;
  grams: number;
  calories?: number;
  carbs_g?: number;
  sugar_g?: number;
  fat_g?: number;
}

interface MealItem {
  name: string;
  description?: string;
  calories: number;
  carbs_g: number;
  protein_g: number;
  fat_g: number;
  sugar_g: number;
  fiber_g: number;
  ingredients: Ingredient[];
  cookingInstructions: string;
  cookingTime?: string;
  estimatedCost?: number;
  store?: string;
}

interface DailyTotals {
  calories: number;
  carbs_g: number;
  protein_g: number;
  fat_g: number;
  sugar_g: number;
  fiber_g: number;
}

interface DayPlan {
  day: string;
  date?: string; // e.g. "24 Mar"
  meals: {
    breakfast: MealItem;
    lunch: MealItem;
    dinner: MealItem;
    snack?: MealItem;
  };
  dailyTotals: DailyTotals;
}

interface UserLimits {
  dailyCalories: number;
  maxCarbs: number;
  maxSugar: number;
}

interface MealPlanData {
  days: DayPlan[];
  weeklyTip?: string;
  userLimits?: UserLimits;
}

interface StorePrice {
  [storeName: string]: number;
}

interface ShoppingItemData {
  name: string;
  quantity: string;
  unit?: string;
  prices: StorePrice;
}

interface ShoppingCategory {
  name: string;
  items: ShoppingItemData[];
}

interface ShoppingListData {
  currency: string;
  stores: string[];
  categories: ShoppingCategory[];
  byDay?: { day: string; items: string[] }[];
  totalByStore: StorePrice;
  totalItems: number;
  diabetesTip?: string;
  cheapestStore?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const MEAL_ICONS = {
  breakfast: Sunrise,
  lunch: Sun,
  dinner: Moon,
  snack: Cookie,
};

const MEAL_LABELS = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

const GEN_STATUSES = [
  "Analysing your profile…",
  "Crafting breakfast recipes…",
  "Planning lunch menus…",
  "Designing dinner meals…",
  "Adding healthy snacks…",
  "Calculating macros…",
  "Checking ingredients…",
  "Writing cooking instructions…",
  "Balancing weekly nutrition…",
  "Finalising your plan…",
];

function parseMeal(raw: any): MealItem {
  const ingredients: Ingredient[] = Array.isArray(raw?.ingredients)
    ? raw.ingredients.map((ing: any) => ({
        name: ing.name ?? "",
        amount: ing.amount ?? "",
        grams: ing.grams ?? 0,
        calories: ing.calories ?? undefined,
        carbs_g: ing.carbs_g ?? ing.carbs ?? undefined,
        sugar_g: ing.sugar_g ?? ing.sugar ?? undefined,
        fat_g: ing.fat_g ?? ing.fat ?? undefined,
      }))
    : [];
  return {
    name: raw?.name ?? "Meal",
    description: raw?.description,
    calories: raw?.calories ?? 0,
    carbs_g: raw?.carbs_g ?? raw?.carbs ?? 0,
    protein_g: raw?.protein_g ?? raw?.protein ?? 0,
    fat_g: raw?.fat_g ?? raw?.fat ?? 0,
    sugar_g: raw?.sugar_g ?? raw?.sugar ?? 0,
    fiber_g: raw?.fiber_g ?? raw?.fiber ?? 0,
    ingredients,
    cookingInstructions:
      raw?.cookingInstructions ?? raw?.cooking_instructions ?? "",
    cookingTime: raw?.cookingTime ?? raw?.cooking_time ?? undefined,
    estimatedCost: raw?.estimatedCost ?? raw?.estimated_cost ?? undefined,
    store: raw?.store ?? undefined,
  };
}

function parsePlanJson(json: string, weekStartStr: string): MealPlanData | null {
  try {
    const raw = JSON.parse(json);
    const weekDate = parseISO(weekStartStr);
    const daysArr = raw.weekPlan ?? raw.days ?? [];
    const days: DayPlan[] = daysArr.map((d: any, i: number) => ({
      day: d.day ?? "Day",
      date: format(addDays(weekDate, i), "d MMM"),
      meals: {
        breakfast: parseMeal(d.meals?.breakfast),
        lunch: parseMeal(d.meals?.lunch),
        dinner: parseMeal(d.meals?.dinner),
        ...(d.meals?.snack ? { snack: parseMeal(d.meals.snack) } : {}),
      },
      dailyTotals: d.dailyTotals ?? d.daily_totals ?? {
        calories: 0, carbs_g: 0, protein_g: 0, fat_g: 0, sugar_g: 0, fiber_g: 0,
      },
    }));
    return {
      days,
      weeklyTip: raw.weeklyTip ?? raw.weekly_tip,
      userLimits: raw.userLimits ?? raw.user_limits,
    };
  } catch {
    return null;
  }
}

function parseShoppingJson(json: string): ShoppingListData | null {
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

// ─── Animated Progress Overlay ──────────────────────────────────────────────

function GeneratingOverlay({ visible }: { visible: boolean }) {
  const progressAnim = useRef(new RNAnimated.Value(0)).current;
  const [statusIdx, setStatusIdx] = useState(0);
  const [displayPct, setDisplayPct] = useState(0);

  useEffect(() => {
    if (visible) {
      progressAnim.setValue(0);
      setStatusIdx(0);
      setDisplayPct(0);

      // Animate progress: 0 → 92% over ~40 seconds (ease-out so it slows down)
      RNAnimated.timing(progressAnim, {
        toValue: 92,
        duration: 40000,
        useNativeDriver: false,
      }).start();

      // Update display percentage via animation listener
      const listener = progressAnim.addListener(({ value }) => {
        setDisplayPct(Math.round(value));
      });

      // Cycle through status messages
      const msgTimer = setInterval(() => {
        setStatusIdx((prev) => {
          const next = prev + 1;
          return next < GEN_STATUSES.length ? next : prev;
        });
      }, 4000);

      return () => {
        clearInterval(msgTimer);
        progressAnim.removeListener(listener);
        progressAnim.stopAnimation();
      };
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <View
      style={{
        position: "absolute",
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: colors.overlay,
        justifyContent: "center",
        alignItems: "center",
        zIndex: 100,
      }}
    >
      <View
        style={{
          backgroundColor: colors.card,
          borderRadius: radius.xl,
          padding: 32,
          width: 280,
          alignItems: "center",
          gap: 16,
          ...shadow.card,
        }}
      >
        <Sparkles size={32} color={colors.primary} />
        <Text style={{ fontSize: 17, fontWeight: "800", color: colors.textPrimary }}>
          Generating Your Plan
        </Text>

        {/* Progress bar */}
        <View style={{ width: "100%", gap: 8 }}>
          <View
            style={{
              height: 8,
              borderRadius: 4,
              backgroundColor: colors.border,
              overflow: "hidden",
            }}
          >
            <RNAnimated.View
              style={{
                height: 8,
                borderRadius: 4,
                backgroundColor: colors.primary,
                width: progressAnim.interpolate({
                  inputRange: [0, 100],
                  outputRange: ["0%", "100%"],
                }),
              }}
            />
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text
              style={{
                fontSize: 12,
                color: colors.textSecondary,
                flex: 1,
              }}
              numberOfLines={1}
            >
              {GEN_STATUSES[statusIdx]}
            </Text>
            <Text
              style={{
                fontSize: 13,
                fontWeight: "700",
                color: colors.primary,
                marginLeft: 8,
              }}
            >
              {displayPct}%
            </Text>
          </View>
        </View>

        {/* Pulsing dot row */}
        <View style={{ flexDirection: "row", gap: 6 }}>
          {[0, 1, 2].map((i) => (
            <PulsingDot key={i} delay={i * 300} />
          ))}
        </View>
      </View>
    </View>
  );
}

function PulsingDot({ delay }: { delay: number }) {
  const anim = useRef(new RNAnimated.Value(0.3)).current;

  useEffect(() => {
    const loop = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(anim, {
          toValue: 1,
          duration: 600,
          delay,
          useNativeDriver: true,
        }),
        RNAnimated.timing(anim, {
          toValue: 0.3,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <RNAnimated.View
      style={{
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.primary,
        opacity: anim,
      }}
    />
  );
}

// ─── Progress bar for macros ────────────────────────────────────────────────

function MacroBar({
  label,
  value,
  max,
  unit,
  color: barColor,
  icon: IconComp,
}: {
  label: string;
  value: number;
  max: number;
  unit: string;
  color: string;
  icon: any;
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const over = value > max;

  return (
    <View style={{ flex: 1, gap: 4 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
        <IconComp size={12} color={barColor} />
        <Text
          style={{
            fontSize: 10,
            fontWeight: "600",
            color: colors.textSecondary,
            textTransform: "uppercase",
            letterSpacing: 0.3,
          }}
        >
          {label}
        </Text>
      </View>
      <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.border }}>
        <View
          style={{
            height: 6,
            borderRadius: 3,
            width: `${pct}%`,
            backgroundColor: over ? colors.risky : barColor,
          }}
        />
      </View>
      <Text
        style={{
          fontSize: 11,
          fontWeight: "700",
          color: over ? colors.risky : colors.textPrimary,
        }}
      >
        {Math.round(value)}
        {unit}{" "}
        <Text style={{ fontWeight: "400", color: colors.textSecondary }}>
          / {max}
          {unit}
        </Text>
      </Text>
    </View>
  );
}

// ─── Meal card with expandable sections ─────────────────────────────────────

function MealCard({ slot, meal }: { slot: keyof typeof MEAL_ICONS; meal: MealItem }) {
  const [showIngredients, setShowIngredients] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const IconComp = MEAL_ICONS[slot];

  return (
    <View
      style={{
        backgroundColor: colors.background,
        borderRadius: radius.md,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      {/* Header */}
      <View style={{ padding: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              backgroundColor: colors.primaryLight,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <IconComp size={14} color={colors.primary} />
          </View>
          <Text
            style={{
              fontSize: 11,
              fontWeight: "700",
              color: colors.textSecondary,
              textTransform: "uppercase",
              letterSpacing: 0.6,
            }}
          >
            {MEAL_LABELS[slot]}
          </Text>
        </View>

        <Text
          style={{
            fontSize: 15,
            fontWeight: "700",
            color: colors.textPrimary,
            marginBottom: 2,
          }}
        >
          {meal.name}
        </Text>
        {meal.description ? (
          <Text
            style={{
              fontSize: 12,
              color: colors.textSecondary,
              marginBottom: 6,
              lineHeight: 17,
            }}
          >
            {meal.description}
          </Text>
        ) : null}

        {/* Macro chips */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {[
            { label: `${meal.calories} kcal`, color: colors.primary },
            { label: `${meal.carbs_g}g carbs`, color: "#f59e0b" },
            { label: `${meal.protein_g}g protein`, color: "#6366f1" },
            { label: `${meal.fat_g}g fat`, color: "#ec4899" },
            { label: `${meal.sugar_g}g sugar`, color: colors.risky },
          ].map((chip) => (
            <View
              key={chip.label}
              style={{
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 6,
                backgroundColor: `${chip.color}18`,
                borderWidth: 1,
                borderColor: `${chip.color}30`,
              }}
            >
              <Text style={{ fontSize: 10, fontWeight: "700", color: chip.color }}>
                {chip.label}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Expandable: Ingredients */}
      {meal.ingredients.length > 0 && (
        <>
          <Pressable
            onPress={() => {
              setShowIngredients((v) => !v);
              Haptics.selectionAsync();
            }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderTopWidth: 1,
              borderTopColor: colors.border,
              backgroundColor: colors.cardAlt,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <UtensilsCrossed size={13} color={colors.primary} />
              <Text style={{ fontSize: 12, fontWeight: "600", color: colors.textPrimary }}>
                Ingredients ({meal.ingredients.length})
              </Text>
            </View>
            {showIngredients ? (
              <ChevronUp size={14} color={colors.textSecondary} />
            ) : (
              <ChevronDown size={14} color={colors.textSecondary} />
            )}
          </Pressable>
          {showIngredients && (
            <View style={{ paddingHorizontal: 14, paddingBottom: 10, backgroundColor: colors.cardAlt }}>
              {meal.ingredients.map((ing, i) => (
                <View
                  key={i}
                  style={{
                    paddingVertical: 8,
                    borderBottomWidth: i < meal.ingredients.length - 1 ? 1 : 0,
                    borderBottomColor: colors.border,
                  }}
                >
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={{ fontSize: 13, color: colors.textPrimary, flex: 1, fontWeight: "600" }}>
                      {ing.name}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.textSecondary, marginLeft: 8 }}>
                      {ing.amount}
                    </Text>
                    <View style={{ backgroundColor: colors.primaryLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 8 }}>
                      <Text style={{ fontSize: 10, fontWeight: "700", color: colors.primary }}>{ing.grams}g</Text>
                    </View>
                  </View>
                  {/* Per-ingredient nutrition pills */}
                  {(ing.calories != null || ing.carbs_g != null || ing.sugar_g != null || ing.fat_g != null) && (
                    <View style={{ flexDirection: "row", gap: 6, marginTop: 5, flexWrap: "wrap" }}>
                      {ing.calories != null && (
                        <View style={{ backgroundColor: "rgba(34,197,94,0.15)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                          <Text style={{ fontSize: 9, fontWeight: "700", color: "#22c55e" }}>{Math.round(ing.calories)} cal</Text>
                        </View>
                      )}
                      {ing.carbs_g != null && (
                        <View style={{ backgroundColor: "rgba(59,130,246,0.15)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                          <Text style={{ fontSize: 9, fontWeight: "700", color: "#3b82f6" }}>{Math.round(ing.carbs_g)}g carbs</Text>
                        </View>
                      )}
                      {ing.sugar_g != null && (
                        <View style={{ backgroundColor: "rgba(245,158,11,0.15)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                          <Text style={{ fontSize: 9, fontWeight: "700", color: "#f59e0b" }}>{Math.round(ing.sugar_g)}g sugar</Text>
                        </View>
                      )}
                      {ing.fat_g != null && (
                        <View style={{ backgroundColor: "rgba(239,68,68,0.15)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                          <Text style={{ fontSize: 9, fontWeight: "700", color: "#ef4444" }}>{Math.round(ing.fat_g)}g fat</Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </>
      )}

      {/* Estimated Cost & Store */}
      {(meal.estimatedCost != null || meal.store) && (
        <View style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 14,
          paddingVertical: 8,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          backgroundColor: colors.cardAlt,
        }}>
          {meal.estimatedCost != null && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>Est. cost:</Text>
              <Text style={{ fontSize: 13, fontWeight: "700", color: colors.primary }}>R{meal.estimatedCost.toFixed(0)}</Text>
            </View>
          )}
          {meal.store && (
            <View style={{ backgroundColor: colors.primaryLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
              <Text style={{ fontSize: 10, fontWeight: "700", color: colors.primary }}>{meal.store}</Text>
            </View>
          )}
        </View>
      )}

      {/* Expandable: Cooking Instructions */}
      {meal.cookingInstructions ? (
        <>
          <Pressable
            onPress={() => {
              setShowInstructions((v) => !v);
              Haptics.selectionAsync();
            }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderTopWidth: 1,
              borderTopColor: colors.border,
              backgroundColor: colors.cardAlt,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <ChefHat size={13} color={colors.primary} />
              <Text style={{ fontSize: 12, fontWeight: "600", color: colors.textPrimary }}>
                Cooking Instructions
              </Text>
              {meal.cookingTime && (
                <View style={{ backgroundColor: "rgba(245,158,11,0.15)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                  <Text style={{ fontSize: 9, fontWeight: "700", color: "#f59e0b" }}>{meal.cookingTime}</Text>
                </View>
              )}
            </View>
            {showInstructions ? (
              <ChevronUp size={14} color={colors.textSecondary} />
            ) : (
              <ChevronDown size={14} color={colors.textSecondary} />
            )}
          </Pressable>
          {showInstructions && (
            <View style={{ paddingHorizontal: 14, paddingBottom: 12, backgroundColor: colors.cardAlt }}>
              {meal.cookingInstructions
                .split(/(?:\r?\n)+|(?:\d+\.\s)/)
                .filter((s: string) => s.trim().length > 0)
                .map((step: string, idx: number) => (
                  <View key={idx} style={{ flexDirection: "row", marginBottom: 8, gap: 8 }}>
                    <View style={{
                      width: 22, height: 22, borderRadius: 11,
                      backgroundColor: colors.primaryLight,
                      alignItems: "center", justifyContent: "center",
                      marginTop: 1,
                    }}>
                      <Text style={{ fontSize: 10, fontWeight: "800", color: colors.primary }}>{idx + 1}</Text>
                    </View>
                    <Text style={{ fontSize: 13, color: colors.textPrimary, lineHeight: 20, flex: 1 }}>
                      {step.trim()}
                    </Text>
                  </View>
                ))}
            </View>
          )}
        </>
      ) : null}
    </View>
  );
}

// ─── Swipeable Day Card ─────────────────────────────────────────────────────

function SwipeableDayCard({
  dayPlan,
  isToday,
  limits,
  cardWidth,
}: {
  dayPlan: DayPlan;
  isToday: boolean;
  limits: UserLimits;
  cardWidth: number;
}) {
  const totals = dayPlan.dailyTotals;
  const slots = (["breakfast", "lunch", "dinner", "snack"] as const).filter(
    (s) => dayPlan.meals[s]
  );

  return (
    <View style={{ width: cardWidth }}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100, gap: 12 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Day header with date */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 }}>
          <View
            style={{
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 12,
              backgroundColor: isToday ? colors.primary : colors.cardAlt,
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: "800",
                color: isToday ? colors.background : colors.textPrimary,
              }}
            >
              {dayPlan.day}
            </Text>
            {dayPlan.date ? (
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "600",
                  color: isToday ? `${colors.background}cc` : colors.textSecondary,
                  marginTop: 1,
                }}
              >
                {dayPlan.date}
              </Text>
            ) : null}
          </View>
          {isToday && (
            <View
              style={{
                backgroundColor: colors.primaryLight,
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: colors.primary,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: "700", color: colors.primary }}>
                TODAY
              </Text>
            </View>
          )}
        </View>

        {/* Daily limits progress bars */}
        <View
          style={{
            backgroundColor: colors.card,
            borderRadius: radius.lg,
            padding: 14,
            borderWidth: 1,
            borderColor: colors.border,
            gap: 10,
          }}
        >
          <Text
            style={{
              fontSize: 11,
              fontWeight: "700",
              color: colors.textSecondary,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              marginBottom: 2,
            }}
          >
            Daily Targets
          </Text>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <MacroBar
              label="Calories"
              value={totals.calories}
              max={limits.dailyCalories}
              unit=" kcal"
              color={colors.primary}
              icon={Flame}
            />
            <MacroBar
              label="Carbs"
              value={totals.carbs_g}
              max={limits.maxCarbs}
              unit="g"
              color="#f59e0b"
              icon={Wheat}
            />
            <MacroBar
              label="Sugar"
              value={totals.sugar_g}
              max={limits.maxSugar}
              unit="g"
              color={colors.risky}
              icon={Droplets}
            />
          </View>
        </View>

        {/* Meal cards */}
        {slots.map((slot) => (
          <MealCard key={slot} slot={slot} meal={dayPlan.meals[slot]!} />
        ))}
      </ScrollView>
    </View>
  );
}

// ─── Shopping List Tab ──────────────────────────────────────────────────────

function ShoppingListTab({
  data,
  onExportPdf,
  onExportCsv,
  onShareWhatsApp,
}: {
  data: ShoppingListData;
  onExportPdf: () => void;
  onExportCsv: () => void;
  onShareWhatsApp: () => void;
}) {
  const [selectedStore, setSelectedStore] = useState(0);
  const [viewMode, setViewMode] = useState<"category" | "day">("category");
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const store = data.stores?.[selectedStore] ?? "Store";
  const currency = data.currency ?? "USD";

  const toggle = (name: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
    Haptics.selectionAsync();
  };

  const formatPrice = (n: number) => {
    if (typeof n !== "number" || isNaN(n)) return "—";
    return `${currency} ${n.toFixed(2)}`;
  };

  return (
    <View style={{ gap: 12 }}>
      {/* Store selector */}
      {data.stores && data.stores.length > 0 && (
        <View style={{ gap: 6 }}>
          <Text
            style={{
              fontSize: 11,
              fontWeight: "700",
              color: colors.textSecondary,
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            Compare Stores
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {data.stores.map((s, i) => {
                const isCheapest = s === data.cheapestStore;
                const active = i === selectedStore;
                return (
                  <Pressable
                    key={s}
                    onPress={() => {
                      setSelectedStore(i);
                      Haptics.selectionAsync();
                    }}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      borderRadius: radius.md,
                      backgroundColor: active ? colors.primary : colors.card,
                      borderWidth: 1,
                      borderColor: active ? colors.primary : colors.border,
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Store
                        size={13}
                        color={active ? colors.background : colors.textSecondary}
                      />
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: "700",
                          color: active ? colors.background : colors.textPrimary,
                        }}
                      >
                        {s}
                      </Text>
                    </View>
                    {data.totalByStore?.[s] != null && (
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: "600",
                          color: active ? colors.background : colors.textSecondary,
                          marginTop: 2,
                        }}
                      >
                        Total: {formatPrice(data.totalByStore[s])}
                        {isCheapest ? " ★" : ""}
                      </Text>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </View>
      )}

      {/* View toggle */}
      <View style={{ flexDirection: "row", gap: 8 }}>
        {(["category", "day"] as const).map((mode) => (
          <Pressable
            key={mode}
            onPress={() => {
              setViewMode(mode);
              Haptics.selectionAsync();
            }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 5,
              paddingHorizontal: 12,
              paddingVertical: 7,
              borderRadius: 8,
              backgroundColor: viewMode === mode ? colors.primaryLight : colors.card,
              borderWidth: 1,
              borderColor: viewMode === mode ? colors.primary : colors.border,
            }}
          >
            {mode === "category" ? (
              <LayoutGrid
                size={12}
                color={viewMode === mode ? colors.primary : colors.textSecondary}
              />
            ) : (
              <ListOrdered
                size={12}
                color={viewMode === mode ? colors.primary : colors.textSecondary}
              />
            )}
            <Text
              style={{
                fontSize: 12,
                fontWeight: "600",
                color: viewMode === mode ? colors.primary : colors.textSecondary,
              }}
            >
              {mode === "category" ? "By Category" : "By Day"}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Items: by category */}
      {viewMode === "category" &&
        data.categories?.map((cat) => (
          <View
            key={cat.name}
            style={{
              backgroundColor: colors.card,
              borderRadius: radius.lg,
              overflow: "hidden",
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <View
              style={{
                padding: 12,
                backgroundColor: colors.cardAlt,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "700",
                  color: colors.textPrimary,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                {cat.name}
              </Text>
            </View>
            {cat.items?.map((item, idx) => {
              const done = checked.has(item.name);
              const price = item.prices?.[store];
              return (
                <Pressable
                  key={`${item.name}-${idx}`}
                  onPress={() => toggle(item.name)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    borderBottomWidth: idx < cat.items.length - 1 ? 1 : 0,
                    borderBottomColor: colors.border,
                    gap: 10,
                  }}
                >
                  <CheckCircle2 size={18} color={done ? colors.primary : colors.border} />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "500",
                        color: done ? colors.textSecondary : colors.textPrimary,
                        textDecorationLine: done ? "line-through" : "none",
                      }}
                    >
                      {item.name}
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                      Qty: {item.quantity}
                      {item.unit ? ` ${item.unit}` : ""}
                    </Text>
                  </View>
                  {price != null && (
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "700",
                        color: done ? colors.textSecondary : colors.primary,
                      }}
                    >
                      {formatPrice(price)}
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        ))}

      {/* Items: by day */}
      {viewMode === "day" &&
        data.byDay?.map((dayGroup) => (
          <View
            key={dayGroup.day}
            style={{
              backgroundColor: colors.card,
              borderRadius: radius.lg,
              padding: 14,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: "700", color: colors.primary, marginBottom: 8 }}>
              {dayGroup.day}
            </Text>
            {dayGroup.items?.map((item, i) => (
              <Text
                key={i}
                style={{
                  fontSize: 13,
                  color: colors.textPrimary,
                  paddingVertical: 3,
                  paddingLeft: 8,
                  borderLeftWidth: 2,
                  borderLeftColor: colors.border,
                  marginBottom: 4,
                }}
              >
                {item}
              </Text>
            ))}
          </View>
        ))}

      {/* Diabetes tip */}
      {data.diabetesTip ? (
        <View
          style={{
            backgroundColor: colors.primaryLight,
            borderRadius: radius.lg,
            padding: 14,
            borderLeftWidth: 4,
            borderLeftColor: colors.primary,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <Lightbulb size={14} color={colors.primary} />
            <Text style={{ fontSize: 12, fontWeight: "700", color: colors.primary }}>
              Shopping Tip
            </Text>
          </View>
          <Text style={{ fontSize: 13, color: colors.textPrimary, lineHeight: 19 }}>
            {data.diabetesTip}
          </Text>
        </View>
      ) : null}

      {/* Export buttons */}
      <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
        <Pressable
          onPress={onExportPdf}
          style={({ pressed }) => ({
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            paddingVertical: 12,
            borderRadius: radius.md,
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.primary,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <FileText size={16} color={colors.primary} />
          <Text style={{ fontSize: 13, fontWeight: "700", color: colors.primary }}>Export PDF</Text>
        </Pressable>
        <Pressable
          onPress={onExportCsv}
          style={({ pressed }) => ({
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            paddingVertical: 12,
            borderRadius: radius.md,
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.safe,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <FileSpreadsheet size={16} color={colors.safe} />
          <Text style={{ fontSize: 13, fontWeight: "700", color: colors.safe }}>Export CSV</Text>
        </Pressable>
      </View>

      {/* WhatsApp / Share button */}
      <Pressable
        onPress={onShareWhatsApp}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          paddingVertical: 12,
          borderRadius: radius.md,
          backgroundColor: "#25D366",
          opacity: pressed ? 0.7 : 1,
          marginTop: 6,
        })}
      >
        <Share2 size={16} color="#fff" />
        <Text style={{ fontSize: 13, fontWeight: "700", color: "#fff" }}>Share via WhatsApp</Text>
      </Pressable>
    </View>
  );
}

// ─── Empty / Generate CTA ───────────────────────────────────────────────────

// ─── Quick Meal Reminder Toggle ─────────────────────────────────────────────

function MealReminderToggle() {
  const { data: reminders, refetch } = trpc.reminders.list.useQuery();
  const addMutation = trpc.reminders.add.useMutation({ onSuccess: () => refetch() });
  const toggleMutation = trpc.reminders.toggle.useMutation({ onSuccess: () => refetch() });
  const deleteMutation = trpc.reminders.delete.useMutation({ onSuccess: () => refetch() });

  const [showModal, setShowModal] = useState(false);
  const [reminderTime, setReminderTime] = useState("12:00");
  const [reminderLabel, setReminderLabel] = useState("Meal Reminder");

  const mealReminders = (reminders ?? []).filter((r: any) => r.type === "meal");
  const hasActive = mealReminders.some((r: any) => r.enabled);

  const handleQuickToggle = () => {
    if (mealReminders.length === 0) {
      // No reminders exist — open the modal to create one
      setShowModal(true);
      return;
    }
    // Toggle all meal reminders
    Haptics.selectionAsync();
    mealReminders.forEach((r: any) => {
      toggleMutation.mutate({ id: r.id, enabled: !hasActive });
    });
  };

  const handleAddReminder = () => {
    if (!/^\d{2}:\d{2}$/.test(reminderTime)) {
      Alert.alert("Invalid time", "Use HH:MM format (e.g. 12:00).");
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addMutation.mutate({ type: "meal", label: reminderLabel.trim() || "Meal Reminder", time: reminderTime });
    setShowModal(false);
  };

  return (
    <>
      <Pressable
        onPress={handleQuickToggle}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          paddingVertical: 8,
          paddingHorizontal: 12,
          borderRadius: radius.md,
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: hasActive ? colors.primary : colors.border,
        }}
      >
        <Bell size={14} color={hasActive ? colors.primary : colors.textSecondary} />
        <Text style={{ flex: 1, fontSize: 13, fontWeight: "600", color: colors.textPrimary }}>
          Meal Reminders
        </Text>
        {mealReminders.length > 0 ? (
          <Switch
            value={hasActive}
            onValueChange={handleQuickToggle}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor="#fff"
            style={{ transform: [{ scale: 0.8 }] }}
          />
        ) : (
          <Text style={{ fontSize: 12, color: colors.primary, fontWeight: "700" }}>Set up</Text>
        )}
      </Pressable>

      {/* Quick-add modal */}
      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" }}>
            <View style={{
              backgroundColor: colors.card,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 24,
              paddingBottom: 40,
              gap: 16,
            }}>
              <Text style={{ fontSize: 17, fontWeight: "800", color: colors.textPrimary }}>
                Set Meal Reminder
              </Text>

              {/* Quick presets */}
              <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                {["Breakfast", "Lunch", "Dinner", "Snack"].map((label) => (
                  <Pressable
                    key={label}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setReminderLabel(label);
                      // Set sensible default times
                      if (label === "Breakfast") setReminderTime("07:30");
                      else if (label === "Lunch") setReminderTime("12:00");
                      else if (label === "Dinner") setReminderTime("18:30");
                      else setReminderTime("15:00");
                    }}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 20,
                      backgroundColor: reminderLabel === label ? colors.primaryLight : colors.background,
                      borderWidth: 1,
                      borderColor: reminderLabel === label ? colors.primary : colors.border,
                    }}
                  >
                    <Text style={{
                      fontSize: 13,
                      fontWeight: "600",
                      color: reminderLabel === label ? colors.primary : colors.textSecondary,
                    }}>
                      {label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Time input */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <Text style={{ fontSize: 14, fontWeight: "600", color: colors.textSecondary }}>Time:</Text>
                <TextInput
                  value={reminderTime}
                  onChangeText={(t) => setReminderTime(t.replace(/[^0-9:]/g, "").slice(0, 5))}
                  placeholder="12:00"
                  keyboardType="numbers-and-punctuation"
                  style={{
                    backgroundColor: colors.background,
                    borderRadius: radius.md,
                    padding: 10,
                    fontSize: 18,
                    fontWeight: "700",
                    color: colors.textPrimary,
                    textAlign: "center",
                    borderWidth: 1.5,
                    borderColor: /^\d{2}:\d{2}$/.test(reminderTime) ? colors.primary : colors.border,
                    width: 90,
                  }}
                />
              </View>

              <View style={{ flexDirection: "row", gap: 10 }}>
                <Pressable
                  onPress={() => setShowModal(false)}
                  style={{
                    flex: 1, height: 46, borderRadius: radius.lg,
                    alignItems: "center", justifyContent: "center",
                    backgroundColor: colors.background,
                    borderWidth: 1, borderColor: colors.border,
                  }}
                >
                  <Text style={{ fontWeight: "700", color: colors.textSecondary }}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={handleAddReminder}
                  style={({ pressed }) => ({
                    flex: 2, height: 46, borderRadius: radius.lg,
                    alignItems: "center", justifyContent: "center",
                    backgroundColor: colors.primary,
                    opacity: pressed ? 0.85 : 1,
                  })}
                >
                  <Text style={{ fontWeight: "700", color: "#fff", fontSize: 15 }}>
                    {addMutation.isPending ? "Saving…" : "Add Reminder"}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyPlan({ onGenerate, loading }: { onGenerate: () => void; loading: boolean }) {
  return (
    <View style={{ alignItems: "center", paddingTop: 60, paddingHorizontal: 32 }}>
      <View
        style={{
          width: 80,
          height: 80,
          borderRadius: 24,
          backgroundColor: colors.primaryLight,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 20,
        }}
      >
        <Sparkles size={36} color={colors.primary} />
      </View>
      <Text
        style={{ fontSize: 20, fontWeight: "800", color: colors.textPrimary, textAlign: "center" }}
      >
        No meal plan yet
      </Text>
      <Text
        style={{
          fontSize: 14,
          color: colors.textSecondary,
          textAlign: "center",
          marginTop: 8,
          lineHeight: 21,
        }}
      >
        Generate a personalised weekly plan with cooking instructions, ingredients, and a priced
        shopping list.
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
        {loading ? (
          <ActivityIndicator color={colors.background} size="small" />
        ) : (
          <Sparkles size={16} color={colors.background} />
        )}
        <Text style={{ color: colors.background, fontWeight: "700", fontSize: 15 }}>
          {loading ? "Generating…" : "Generate My Plan"}
        </Text>
      </Pressable>
    </View>
  );
}

// ─── Main screen ────────────────────────────────────────────────────────────

export default function PlannerScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const profile = useProfileStore((s) => s.profile);
  const [activeTab, setActiveTab] = useState<"plan" | "shopping">("plan");
  const [currentDayIdx, setCurrentDayIdx] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const todayName = format(new Date(), "EEEE");

  // ── tRPC queries ──
  const { data: mealPlan, refetch, isLoading } = trpc.mealPlan.getCurrent.useQuery({ weekStart });

  const generateMutation = trpc.mealPlan.generate.useMutation({
    onSuccess: () => refetch(),
    onError: (e: any) => Alert.alert("Generation failed", e.message),
  });

  const { data: shoppingList, refetch: refetchShopping } = trpc.shoppingList.getCurrent.useQuery(
    { mealPlanId: mealPlan?.id ?? 0 },
    { enabled: !!mealPlan?.id }
  );

  const shoppingMutation = trpc.shoppingList.generate.useMutation({
    onSuccess: () => refetchShopping(),
    onError: (e: any) => Alert.alert("Error", e.message),
  });

  // ── Handlers ──
  const handleGenerate = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    generateMutation.mutate({
      weekStart,
      diabetesType: profile?.diabetesType ?? "type2",
      country: profile?.country,
      dailyCalorieGoal: profile?.dailyCalorieGoal,
      maxDailyCarbs: profile?.maxDailyCarbs,
      maxDailySugar: profile?.maxDailySugar,
    });
  };

  const handleReset = () => {
    Alert.alert(
      "Reset Meal Plan",
      "This will clear your current meal plan and shopping list. You can generate a new one afterwards.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            // Generate a fresh plan immediately
            handleGenerate();
          },
        },
      ]
    );
  };

  const handleGenerateShopping = () => {
    if (!mealPlan) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    shoppingMutation.mutate({
      mealPlanId: String(mealPlan.id),
      planJson: mealPlan.planJson,
      country: profile?.country,
    });
  };

  // ── Parse data ──
  const planData = useMemo(
    () => (mealPlan?.planJson ? parsePlanJson(mealPlan.planJson, weekStart) : null),
    [mealPlan?.planJson, weekStart]
  );

  const shoppingData = useMemo(
    () => (shoppingList?.listJson ? parseShoppingJson(shoppingList.listJson) : null),
    [shoppingList?.listJson]
  );

  const limits: UserLimits = planData?.userLimits ?? {
    dailyCalories: profile?.dailyCalorieGoal ?? 1800,
    maxCarbs: profile?.maxDailyCarbs ?? 130,
    maxSugar: profile?.maxDailySugar ?? 25,
  };

  // ── Day navigation ──
  const goToDay = useCallback((idx: number) => {
    if (idx < 0 || idx >= (planData?.days?.length ?? 0)) return;
    setCurrentDayIdx(idx);
    flatListRef.current?.scrollToIndex({ index: idx, animated: true });
  }, [planData?.days?.length]);

  // ── Export: PDF ──
  const exportPdf = async () => {
    if (!shoppingData) return;
    const store = shoppingData.stores?.[0] ?? "Store";
    const currency = shoppingData.currency ?? "";

    let rows = "";
    shoppingData.categories?.forEach((cat) => {
      rows += `<tr style="background:#162033"><td colspan="3" style="padding:8px;font-weight:bold;color:#14b8a6">${cat.name}</td></tr>`;
      cat.items?.forEach((item) => {
        const price = item.prices?.[store];
        rows += `<tr><td style="padding:6px 8px">${item.name}</td><td style="padding:6px 8px;text-align:center">${item.quantity}${item.unit ? " " + item.unit : ""}</td><td style="padding:6px 8px;text-align:right">${price != null ? `${currency} ${price.toFixed(2)}` : "—"}</td></tr>`;
      });
    });

    const total = shoppingData.totalByStore?.[store];
    const html = `<html><head><style>body{font-family:Helvetica;background:#0b1120;color:#f0f4f8;padding:20px}h1{color:#14b8a6;font-size:22px}h2{color:#7b8fa3;font-size:14px;margin-top:4px}table{width:100%;border-collapse:collapse;margin-top:10px}th{background:#111c2e;padding:8px;text-align:left;color:#7b8fa3;font-size:12px;text-transform:uppercase}td{border-bottom:1px solid #1e2d40;font-size:13px}tfoot td{font-weight:bold;padding:10px 8px;color:#14b8a6;border-top:2px solid #14b8a6}</style></head><body><h1>GlucoLens Shopping List</h1><h2>Week of ${weekStart} — ${store}</h2><table><thead><tr><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Price</th></tr></thead><tbody>${rows}</tbody>${total ? `<tfoot><tr><td colspan="2">TOTAL</td><td style="text-align:right">${currency} ${total.toFixed(2)}</td></tr></tfoot>` : ""}</table><p style="margin-top:20px;font-size:10px;color:#7b8fa3;text-align:center">This is a guide only, not medical advice. Always consult your healthcare provider before making dietary changes.</p></body></html>`;

    try {
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: "Shopping List PDF",
      });
    } catch {
      Alert.alert("Export failed", "Could not generate PDF.");
    }
  };

  // ── Export: CSV ──
  const exportCsv = async () => {
    if (!shoppingData) return;

    if (!shoppingData?.stores?.length || !shoppingData?.categories?.length) {
      Alert.alert("Export failed", "Shopping list data is incomplete.");
      return;
    }

    const headers = [
      "Category",
      "Item",
      "Quantity",
      ...shoppingData.stores.map((s) => `Price (${s})`),
    ];
    let csvRows = [headers.join(",")];

    shoppingData.categories?.forEach((cat) => {
      cat.items?.forEach((item) => {
        const prices = shoppingData.stores.map((s) => item.prices?.[s]?.toFixed(2) ?? "");
        csvRows.push(
          [
            `"${cat.name?.replace(/"/g, '""') ?? ""}"`,
            `"${item.name?.replace(/"/g, '""') ?? ""}"`,
            `"${item.quantity}${item.unit ? " " + item.unit : ""}"`,
            ...prices,
          ].join(",")
        );
      });
    });

    const totals = shoppingData.stores.map(
      (s) => shoppingData.totalByStore?.[s]?.toFixed(2) ?? ""
    );
    csvRows.push(["", "TOTAL", "", ...totals].join(","));

    const csv = csvRows.join("\n");
    const fileUri = FileSystem.documentDirectory + "GlucoLens_Shopping_List.csv";
    try {
      await FileSystem.writeAsStringAsync(fileUri, csv, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      await Sharing.shareAsync(fileUri, { mimeType: "text/csv", dialogTitle: "Shopping List CSV" });
    } catch {
      Alert.alert("Export failed", "Could not generate CSV.");
    }
  };

  // ── Export: WhatsApp formatted text ──
  const exportWhatsApp = async () => {
    if (!shoppingData) return;
    const store = shoppingData.stores?.[0] ?? "Store";
    const currency = shoppingData.currency ?? "R";
    let msg = `*GlucoLens Shopping List*\nWeek of ${weekStart}\nStore: ${store}\n\n`;

    shoppingData.categories?.forEach((cat) => {
      msg += `*${cat.name?.toUpperCase()}*\n`;
      cat.items?.forEach((item) => {
        const price = item.prices?.[store];
        msg += `  - ${item.name} — ${item.quantity}${item.unit ? " " + item.unit : ""}`;
        if (price != null) msg += ` — ${currency} ${price.toFixed(2)}`;
        msg += "\n";
      });
      msg += "\n";
    });

    const total = shoppingData.totalByStore?.[store];
    if (total != null) msg += `*TOTAL: ${currency} ${total.toFixed(2)}*\n\n`;
    msg += `_Generated by GlucoLens_`;

    try {
      await Share.share({ message: msg });
    } catch {
      Alert.alert("Share failed", "Could not share shopping list.");
    }
  };

  // ── Render ──
  const cardWidth = width;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 12,
          paddingHorizontal: 20,
          paddingBottom: 12,
          backgroundColor: colors.card,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View>
            <Text style={{ fontSize: 24, fontWeight: "800", color: colors.textPrimary }}>
              Meal Planner
            </Text>
            <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 1 }}>
              Week of {format(startOfWeek(new Date(), { weekStartsOn: 1 }), "d MMM yyyy")}
            </Text>
          </View>

          {/* Header action buttons */}
          {planData && (
            <View style={{ flexDirection: "row", gap: 8 }}>
              {/* Reset button */}
              <Pressable
                onPress={handleReset}
                accessibilityLabel="Reset meal plan"
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                  borderRadius: 10,
                  backgroundColor: colors.riskyBg,
                  borderWidth: 1,
                  borderColor: colors.risky,
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <RotateCcw size={13} color={colors.risky} />
                <Text style={{ fontSize: 11, fontWeight: "700", color: colors.risky }}>Reset</Text>
              </Pressable>

              {/* Regen button */}
              <Pressable
                onPress={handleGenerate}
                disabled={generateMutation.isPending}
                accessibilityLabel="Regenerate meal plan"
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                  borderRadius: 10,
                  backgroundColor: colors.primaryLight,
                  borderWidth: 1,
                  borderColor: colors.primary,
                  opacity: pressed || generateMutation.isPending ? 0.6 : 1,
                })}
              >
                {generateMutation.isPending ? (
                  <ActivityIndicator color={colors.primary} size={12} />
                ) : (
                  <RefreshCw size={13} color={colors.primary} />
                )}
                <Text style={{ fontSize: 11, fontWeight: "700", color: colors.primary }}>
                  {generateMutation.isPending ? "..." : "Regen"}
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Tab bar */}
        <View
          style={{
            flexDirection: "row",
            backgroundColor: colors.glass,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: colors.glassBorder,
            marginTop: 12,
            padding: 3,
            gap: 3,
          }}
        >
          {(["plan", "shopping"] as const).map((tab) => (
            <Pressable
              key={tab}
              onPress={() => {
                Haptics.selectionAsync();
                setActiveTab(tab);
              }}
              style={{
                flex: 1,
                paddingVertical: 8,
                borderRadius: 12,
                alignItems: "center",
                backgroundColor: activeTab === tab ? colors.primary : "transparent",
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "700",
                  color: activeTab === tab ? colors.background : colors.textSecondary,
                }}
              >
                {tab === "shopping" ? "Shopping List" : "Meal Plan"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Body */}
      {isLoading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : !planData ? (
        <EmptyPlan onGenerate={handleGenerate} loading={generateMutation.isPending} />
      ) : activeTab === "plan" ? (
        <View style={{ flex: 1 }}>
          {/* Day indicator dots + arrows */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              paddingVertical: 12,
              paddingHorizontal: 16,
            }}
          >
            <Pressable
              onPress={() => goToDay(currentDayIdx - 1)}
              style={{ padding: 6, opacity: currentDayIdx > 0 ? 1 : 0.3 }}
            >
              <ChevronLeft size={18} color={colors.textSecondary} />
            </Pressable>
            {planData.days.map((d, i) => {
              const isToday = d.day === todayName;
              const active = i === currentDayIdx;
              return (
                <Pressable
                  key={i}
                  onPress={() => goToDay(i)}
                  style={{ alignItems: "center", paddingHorizontal: 2 }}
                >
                  <Text
                    style={{
                      fontSize: 9,
                      fontWeight: "700",
                      color: active ? colors.primary : isToday ? colors.primaryDark : colors.textMuted,
                      marginBottom: 3,
                    }}
                  >
                    {d.day.slice(0, 3)}
                  </Text>
                  <View
                    style={{
                      width: active ? 20 : 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: active
                        ? colors.primary
                        : isToday
                        ? colors.primaryDark
                        : colors.border,
                    }}
                  />
                </Pressable>
              );
            })}
            <Pressable
              onPress={() => goToDay(currentDayIdx + 1)}
              style={{
                padding: 6,
                opacity: currentDayIdx < planData.days.length - 1 ? 1 : 0.3,
              }}
            >
              <ChevronRight size={18} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* Swipeable day cards */}
          <FlatList
            ref={flatListRef}
            data={planData.days}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item, i) => `${item.day}-${i}`}
            snapToInterval={cardWidth}
            decelerationRate="fast"
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / cardWidth);
              setCurrentDayIdx(idx);
            }}
            getItemLayout={(_, index) => ({
              length: cardWidth,
              offset: cardWidth * index,
              index,
            })}
            renderItem={({ item }) => (
              <SwipeableDayCard
                dayPlan={item}
                isToday={item.day === todayName}
                limits={limits}
                cardWidth={cardWidth}
              />
            )}
          />

          {/* Sticky bottom: Meal reminder + Shopping List */}
          <View
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              paddingHorizontal: 20,
              paddingBottom: insets.bottom + 16,
              paddingTop: 10,
              backgroundColor: colors.background,
              borderTopWidth: 1,
              borderTopColor: colors.border,
              gap: 8,
            }}
          >
            {/* Quick meal reminder toggle */}
            <MealReminderToggle />

            <Pressable
              onPress={handleGenerateShopping}
              disabled={shoppingMutation.isPending}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                paddingVertical: 14,
                borderRadius: radius.lg,
                backgroundColor: colors.primary,
                opacity: pressed || shoppingMutation.isPending ? 0.7 : 1,
                ...shadow.button,
              })}
            >
              {shoppingMutation.isPending ? (
                <ActivityIndicator color={colors.background} size="small" />
              ) : (
                <ShoppingCart size={16} color={colors.background} />
              )}
              <Text style={{ color: colors.background, fontWeight: "700", fontSize: 14 }}>
                {shoppingMutation.isPending
                  ? "Generating Shopping List…"
                  : shoppingData
                  ? "Regenerate Shopping List"
                  : "Generate Shopping List"}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : (
        /* Shopping list tab */
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 100 }}
          showsVerticalScrollIndicator={false}
        >
          {shoppingData ? (
            <ShoppingListTab data={shoppingData} onExportPdf={exportPdf} onExportCsv={exportCsv} onShareWhatsApp={exportWhatsApp} />
          ) : (
            <View style={{ alignItems: "center", paddingTop: 60 }}>
              <ShoppingCart size={40} color={colors.border} />
              <Text
                style={{
                  marginTop: 16,
                  fontSize: 15,
                  color: colors.textSecondary,
                  textAlign: "center",
                  lineHeight: 22,
                }}
              >
                No shopping list yet.{"\n"}Go to Meal Plan tab and tap{"\n"}"Generate Shopping List".
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Generating overlay with progress bar */}
      <GeneratingOverlay visible={generateMutation.isPending} />
    </View>
  );
}
