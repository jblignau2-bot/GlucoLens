/**
 * Results screen (modal)
 *
 * Displays the full AI analysis for a scanned/typed meal.
 * Data source: analysisStore (set by ScanScreen before navigation).
 *
 * Features:
 *  - Safe / Moderate / Risky rating badge per diabetes type
 *  - Nutrition breakdown (calories, carbs, sugar, GI, GL, protein, fat, fibre)
 *  - Per-item breakdown accordion
 *  - "Why risky" bullet list (if applicable)
 *  - Healthier alternatives
 *  - Save to log button (auto-saves on mount for new scans)
 *  - Portion adjustment (±25% increments)
 *  - Add to Favourites
 *  - Share button (using expo-sharing)
 */

import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Share,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useAnalysisStore } from "@/stores/analysisStore";
import { useProfileStore } from "@/stores/profileStore";
import { colors, radius, shadow } from "@/constants/tokens";
import {
  X,
  Heart,
  HeartOff,
  Share2,
  ChevronDown,
  ChevronUp,
  Minus,
  Plus,
  AlertTriangle,
  Lightbulb,
  BarChart3,
  CheckCircle,
  XCircle,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";

// ─── Rating helpers ───────────────────────────────────────────────────────────

const RATINGS = {
  safe: { label: "Safe", icon: "check", color: colors.safe, bg: colors.safeBg, border: colors.safe },
  moderate: { label: "Moderate", icon: "alert", color: colors.moderate, bg: colors.moderateBg, border: colors.moderate },
  risky: { label: "Risky", icon: "x", color: colors.risky, bg: colors.riskyBg, border: colors.risky },
};

// Icon renderer
function RatingIcon({ icon, color }: { icon: string; color: string }) {
  if (icon === "check") return <CheckCircle size={18} color={color} />;
  if (icon === "alert") return <AlertTriangle size={18} color={color} />;
  if (icon === "x") return <XCircle size={18} color={color} />;
  return null;
}

// ─── Nutrition row ────────────────────────────────────────────────────────────

function NutritionRow({ label, value, unit, highlight }: { label: string; value: number; unit: string; highlight?: boolean }) {
  return (
    <View style={{
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 9,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    }}>
      <Text style={{ fontSize: 14, color: colors.textSecondary, fontWeight: "500" }}>{label}</Text>
      <Text style={{
        fontSize: 14,
        color: highlight ? colors.primary : colors.textPrimary,
        fontWeight: highlight ? "800" : "700",
      }}>
        {typeof value === "number" ? value.toFixed(value % 1 === 0 ? 0 : 1) : value} <Text style={{ fontWeight: "400", color: colors.textSecondary }}>{unit}</Text>
      </Text>
    </View>
  );
}

// ─── Per-item breakdown ───────────────────────────────────────────────────────

function ItemBreakdownSection({ items }: { items: any[] }) {
  const [open, setOpen] = useState(false);
  if (!items || items.length === 0) return null;
  return (
    <View style={{ marginTop: 8 }}>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingVertical: 12,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <BarChart3 size={16} color={colors.primary} />
          <Text style={{ fontSize: 15, fontWeight: "700", color: colors.textPrimary }}>
            Per-item Breakdown ({items.length})
          </Text>
        </View>
        {open ? <ChevronUp size={16} color={colors.textSecondary} /> : <ChevronDown size={16} color={colors.textSecondary} />}
      </Pressable>

      {open && items.map((item, i) => (
        <View key={i} style={{
          backgroundColor: colors.cardAlt,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 12,
          marginBottom: 8,
        }}>
          <Text style={{ fontSize: 14, fontWeight: "700", color: colors.textPrimary, marginBottom: 4 }}>
            {item.food ?? item.name ?? `Item ${i + 1}`}
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {[
              { l: "Cal", v: item.calories, u: "kcal" },
              { l: "Carbs", v: item.totalCarbs ?? item.carbs, u: "g" },
              { l: "Sugar", v: item.totalSugar ?? item.sugar, u: "g" },
              { l: "Protein", v: item.protein, u: "g" },
            ].filter((x) => x.v != null).map(({ l, v, u }) => (
              <View key={l} style={{
                backgroundColor: colors.card,
                borderRadius: 8,
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderWidth: 1,
                borderColor: colors.border,
              }}>
                <Text style={{ fontSize: 11, color: colors.textSecondary }}>{l}</Text>
                <Text style={{ fontSize: 13, fontWeight: "700", color: colors.textPrimary }}>{Math.round(v)}{u}</Text>
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ResultsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ logId?: string; from?: string }>();

  const result = useAnalysisStore((s) => s.result);
  const clearResult = useAnalysisStore((s) => s.clear);
  const profile = useProfileStore((s) => s.profile);

  const [portionMultiplier, setPortionMultiplier] = useState(1.0);
  const [isFavourite, setIsFavourite] = useState(false);
  const [saved, setSaved] = useState(!!params.logId); // Already saved if coming from dashboard
  const autoSavedRef = useRef(false);

  const diabetesType = profile?.diabetesType ?? "type2";
  const rating = diabetesType === "type1" ? result?.ratingType1 : result?.ratingType2;
  const ratingInfo = RATINGS[rating ?? "moderate"];
  const reason = diabetesType === "type1" ? result?.reasonType1 : result?.reasonType2;

  // Adjusted nutrition values
  const adj = (v: number) => Math.round(v * portionMultiplier * 10) / 10;

  const [splitCount, setSplitCount] = useState(0);

  const logMealMutation = trpc.food.log.useMutation({
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (e) => Alert.alert("Couldn't save", e.message),
  });

  // Build a single log payload from result
  function buildLogPayload(res: any) {
    return {
      mealName: res.mealName,
      identifiedFoods: res.identifiedFoods ?? [],
      nutrition: {
        calories: res.calories ?? 0,
        totalSugar_g: res.totalSugar ?? 0,
        totalCarbs_g: res.totalCarbs ?? 0,
        glycemicIndex: res.glycemicIndex ?? 0,
        glycemicLoad: res.glycemicLoad ?? 0,
        protein_g: res.protein ?? 0,
        fat_g: res.fat ?? 0,
        fiber_g: res.fiber ?? 0,
      },
      diabetesRating: {
        type1: { rating: res.ratingType1 ?? "moderate", reason: res.reasonType1 ?? "" },
        type2: { rating: res.ratingType2 ?? "moderate", reason: res.reasonType2 ?? "" },
      },
      whyRisky: res.whyRisky ?? [],
      healthierAlternatives: res.healthierAlternatives ?? [],
      foodsToAvoid: res.foodsToAvoid ?? [],
      itemBreakdown: res.itemBreakdown ?? [],
    } as any;
  }

  // Build individual log payloads from itemBreakdown entries
  function buildSplitPayloads(res: any) {
    const items = res.itemBreakdown ?? [];
    if (items.length <= 1) return null; // nothing to split

    return items.map((item: any) => {
      const cal = item.calories ?? 0;
      const sugar = item.sugar_g ?? item.totalSugar ?? 0;
      const carbs = item.carbs_g ?? item.totalCarbs ?? 0;
      const prot = item.protein_g ?? item.protein ?? 0;
      const fatVal = item.fat_g ?? item.fat ?? 0;
      const fib = item.fiber_g ?? item.fiber ?? 0;
      const gi = item.glycemicIndex ?? res.glycemicIndex ?? 0;
      // Rough GL estimate per item
      const gl = Math.round(carbs * gi / 100);
      // Rating heuristic per item
      const rating = sugar > 15 || carbs > 45 ? "risky" : sugar > 8 || carbs > 25 ? "moderate" : "safe";

      return {
        mealName: item.name ?? item.food ?? "Unknown item",
        identifiedFoods: [item.name ?? item.food ?? "Unknown"],
        nutrition: {
          calories: Math.round(cal),
          totalSugar_g: Math.round(sugar * 10) / 10,
          totalCarbs_g: Math.round(carbs * 10) / 10,
          glycemicIndex: gi,
          glycemicLoad: gl,
          protein_g: Math.round(prot * 10) / 10,
          fat_g: Math.round(fatVal * 10) / 10,
          fiber_g: Math.round(fib * 10) / 10,
        },
        diabetesRating: {
          type1: { rating, reason: `${Math.round(carbs)}g carbs — plan insulin accordingly.` },
          type2: { rating, reason: sugar > 15 ? `High sugar (${Math.round(sugar)}g).` : `${Math.round(sugar)}g sugar per serving.` },
        },
        whyRisky: sugar > 15 ? [`High sugar: ${Math.round(sugar)}g`] : [],
        healthierAlternatives: res.healthierAlternatives ?? [],
        foodsToAvoid: res.foodsToAvoid ?? [],
        itemBreakdown: [item],
      } as any;
    });
  }

  // Auto-save new scans — split multi-item meals into separate logs
  useEffect(() => {
    if (result && !params.logId && !autoSavedRef.current && !saved && !logMealMutation.isPending) {
      autoSavedRef.current = true;

      const splitPayloads = buildSplitPayloads(result);
      if (splitPayloads && splitPayloads.length > 1) {
        // Log each item separately
        setSplitCount(splitPayloads.length);
        let completed = 0;
        splitPayloads.forEach((payload: any) => {
          logMealMutation.mutate(payload, {
            onSuccess: () => {
              completed++;
              if (completed === splitPayloads.length) setSaved(true);
            },
          });
        });
      } else {
        // Single item — log as combined meal
        logMealMutation.mutate(buildLogPayload(result), {
          onSuccess: () => setSaved(true),
        });
      }
    }
  }, [result, params.logId, saved, logMealMutation.isPending]);

  const handleShare = async () => {
    if (!result) return;
    const text = [
      `${result.mealName}`,
      `${ratingInfo.label} for ${diabetesType === "type1" ? "Type 1" : "Type 2"} diabetes`,
      "",
      `Nutrition (per serving):`,
      `• Calories: ${adj(result.calories)} kcal`,
      `• Carbs: ${adj(result.totalCarbs)}g`,
      `• Sugar: ${adj(result.totalSugar)}g`,
      `• GI: ${result.glycemicIndex}`,
      "",
      reason ? `${reason}` : "",
      "",
      "Analysed with GlucoLens",
    ].filter(Boolean).join("\n");

    await Share.share({ message: text });
  };

  const handleClose = () => {
    if (params.from === "dashboard") {
      router.back();
    } else {
      clearResult();
      router.replace("/(tabs)");
    }
  };

  if (!result) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={{ marginTop: 12, color: colors.textSecondary }}>Loading analysis…</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero rating card with colored left border ── */}
        <View style={{
          backgroundColor: colors.card,
          paddingTop: insets.top + 16,
          paddingHorizontal: 20,
          paddingBottom: 24,
          borderBottomLeftRadius: 24,
          borderBottomRightRadius: 24,
          borderLeftWidth: 5,
          borderLeftColor: ratingInfo.border,
        }}>
          {/* Close + Share row */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <Pressable
              onPress={handleClose}
              style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.glass, alignItems: "center", justifyContent: "center" }}
            >
              <X size={18} color={colors.textPrimary} />
            </Pressable>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable
                onPress={() => { setIsFavourite((f) => !f); Haptics.selectionAsync(); }}
                style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.glass, alignItems: "center", justifyContent: "center" }}
              >
                {isFavourite
                  ? <Heart size={18} color={colors.accent3} fill={colors.accent3} />
                  : <HeartOff size={18} color={colors.textPrimary} />
                }
              </Pressable>
              <Pressable
                onPress={handleShare}
                style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.glass, alignItems: "center", justifyContent: "center" }}
              >
                <Share2 size={18} color={colors.textPrimary} />
              </Pressable>
            </View>
          </View>

          {/* Meal name */}
          <Text style={{ fontSize: 22, fontWeight: "800", color: colors.textPrimary, marginBottom: 10 }}>
            {result.mealName}
          </Text>

          {/* Rating pill with icon */}
          <View style={{
            alignSelf: "flex-start",
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            backgroundColor: colors.cardAlt,
            borderRadius: 24,
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderWidth: 1,
            borderColor: ratingInfo.border,
          }}>
            <RatingIcon icon={ratingInfo.icon} color={ratingInfo.color} />
            <View>
              <Text style={{ fontSize: 16, fontWeight: "800", color: ratingInfo.color }}>
                {ratingInfo.label}
              </Text>
              <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                for {diabetesType === "type1" ? "Type 1" : diabetesType === "prediabetes" ? "Pre-Diabetes" : "Type 2"}
              </Text>
            </View>
          </View>

          {/* Reason */}
          {reason && (
            <Text style={{ fontSize: 13, color: colors.textPrimary, marginTop: 12, lineHeight: 19, opacity: 0.85 }}>
              {reason}
            </Text>
          )}
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>

          {/* ── Portion adjuster with size labels ── */}
          <View style={{
            backgroundColor: colors.glass,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: colors.glassBorder,
            padding: 14,
            marginBottom: 16,
            ...shadow.card,
          }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Text style={{ flex: 1, fontSize: 14, fontWeight: "600", color: colors.textPrimary }}>
                Portion size
              </Text>
              <Pressable
                onPress={() => { if (portionMultiplier > 0.25) { setPortionMultiplier((p) => Math.round((p - 0.25) * 100) / 100); Haptics.selectionAsync(); } }}
                style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center" }}
              >
                <Minus size={14} color={colors.primary} />
              </Pressable>
              <Text style={{ fontSize: 16, fontWeight: "800", color: colors.primary, minWidth: 44, textAlign: "center" }}>
                {portionMultiplier === 1 ? "1×" : `${portionMultiplier}×`}
              </Text>
              <Pressable
                onPress={() => { if (portionMultiplier < 3) { setPortionMultiplier((p) => Math.round((p + 0.25) * 100) / 100); Haptics.selectionAsync(); } }}
                style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center" }}
              >
                <Plus size={14} color={colors.primary} />
              </Pressable>
            </View>
            <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 6 }}>
              {portionMultiplier <= 0.5 ? "Small — kids portion or side dish"
                : portionMultiplier <= 0.75 ? "Light — snack-sized or appetiser"
                : portionMultiplier <= 1 ? "Standard — typical restaurant serving"
                : portionMultiplier <= 1.5 ? "Large — generous home-cooked plate"
                : portionMultiplier <= 2 ? "Extra large — double serving"
                : "Sharing size — family or buffet portion"}
            </Text>
          </View>

          {/* ── Nutrition card ── */}
          <View style={{
            backgroundColor: colors.card,
            borderRadius: radius.lg,
            padding: 16,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: colors.border,
            ...shadow.card,
          }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: colors.textPrimary, marginBottom: 4 }}>
              Nutrition Facts
            </Text>
            {portionMultiplier !== 1 && (
              <Text style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 8 }}>
                Adjusted for {portionMultiplier}× portion
              </Text>
            )}
            <NutritionRow label="Calories" value={adj(result.calories)} unit="kcal" highlight />
            <NutritionRow label="Total Carbs" value={adj(result.totalCarbs)} unit="g" highlight />
            <NutritionRow label="Total Sugar" value={adj(result.totalSugar)} unit="g" />
            <NutritionRow label="Protein" value={adj(result.protein)} unit="g" />
            <NutritionRow label="Fat" value={adj(result.fat)} unit="g" />
            <NutritionRow label="Fibre" value={adj(result.fiber)} unit="g" />
            <NutritionRow label="Glycaemic Index (GI)" value={result.glycemicIndex} unit="" />
            <NutritionRow label="Glycaemic Load (GL)" value={adj(result.glycemicLoad)} unit="" />

            <ItemBreakdownSection items={result.itemBreakdown ?? []} />
          </View>

          {/* ── Why risky with dark background and colored left border ── */}
          {result.whyRisky && result.whyRisky.length > 0 && (
            <View style={{
              backgroundColor: colors.card,
              borderRadius: radius.lg,
              padding: 14,
              marginBottom: 16,
              borderLeftWidth: 4,
              borderLeftColor: colors.risky,
              borderWidth: 1,
              borderColor: colors.border,
            }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <AlertTriangle size={16} color={colors.risky} />
                <Text style={{ fontSize: 14, fontWeight: "700", color: colors.risky }}>Why it's risky</Text>
              </View>
              {result.whyRisky.map((r: any, i: number) => (
                <Text key={i} style={{ fontSize: 13, color: colors.textPrimary, lineHeight: 19, marginBottom: 4 }}>
                  • {typeof r === "string" ? r : String(r)}
                </Text>
              ))}
            </View>
          )}

          {/* ── Healthier alternatives with green accent ── */}
          {result.healthierAlternatives && result.healthierAlternatives.length > 0 && (
            <View style={{
              backgroundColor: colors.card,
              borderRadius: radius.lg,
              padding: 14,
              marginBottom: 16,
              borderLeftWidth: 4,
              borderLeftColor: colors.safe,
              borderWidth: 1,
              borderColor: colors.border,
            }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <Lightbulb size={16} color={colors.safe} />
                <Text style={{ fontSize: 14, fontWeight: "700", color: colors.safe }}>Healthier Alternatives</Text>
              </View>
              {result.healthierAlternatives.map((alt: any, i: number) => (
                <Text key={i} style={{ fontSize: 13, color: colors.textPrimary, lineHeight: 19, marginBottom: 4 }}>
                  • {typeof alt === "string" ? alt : alt?.name ? `${alt.name} — ${alt.benefit ?? ""}` : String(alt)}
                </Text>
              ))}
            </View>
          )}

          {/* ── Save button (shown only if not yet saved) ── */}
          {!saved ? (
            <Pressable
              onPress={() => {
                if (!autoSavedRef.current) {
                  autoSavedRef.current = true;
                  const splitPayloads = buildSplitPayloads(result);
                  if (splitPayloads && splitPayloads.length > 1) {
                    setSplitCount(splitPayloads.length);
                    let completed = 0;
                    splitPayloads.forEach((payload: any) => {
                      logMealMutation.mutate(payload, {
                        onSuccess: () => { completed++; if (completed === splitPayloads.length) setSaved(true); },
                      });
                    });
                  } else {
                    logMealMutation.mutate(buildLogPayload(result), {
                      onSuccess: () => setSaved(true),
                    });
                  }
                }
              }}
              disabled={logMealMutation.isPending}
              style={({ pressed }) => ({
                height: 54,
                borderRadius: radius.lg,
                backgroundColor: colors.primary,
                alignItems: "center",
                justifyContent: "center",
                marginTop: 4,
                opacity: pressed || logMealMutation.isPending ? 0.8 : 1,
              })}
            >
              {logMealMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>Save to Log</Text>
              )}
            </Pressable>
          ) : (
            <View style={{
              height: 54,
              borderRadius: radius.lg,
              backgroundColor: colors.safeBg,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: 8,
              marginTop: 4,
              borderWidth: 1,
              borderColor: colors.safe,
            }}>
              <CheckCircle size={18} color={colors.safe} />
              <Text style={{ color: colors.safe, fontWeight: "700", fontSize: 15 }}>
                {splitCount > 1 ? `Logged as ${splitCount} separate items` : "Saved to your log"}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
