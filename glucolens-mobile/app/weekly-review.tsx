/**
 * Weekly review — last 7 days at a glance.
 *
 * Pulls glucose, meals, and water from the trailing week, then synthesises:
 *   • Time in Range bar
 *   • Estimated A1c (90-day) for context
 *   • Highest/lowest readings
 *   • Meal traffic-light totals
 *   • One nudge to try this week (cycles through generated mentor candidates)
 *
 * Designed as the "Sunday artefact" Lingo and Levels users say convinced
 * them the app was worth keeping.
 */

import { useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Award,
  Flame,
  Sparkles,
} from "lucide-react-native";
import { trpc } from "@/lib/trpc";
import { useProfileStore } from "@/stores/profileStore";
import { colors, radius, fonts } from "@/constants/tokens";
import {
  estimateA1c,
  timeInRange,
  mgFromMmol,
  type GlucoseReading,
} from "@/lib/health/metrics";
import { generateMentorMessage } from "@/lib/health/mentor";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function WeeklyReview() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const profile = useProfileStore((s) => s.profile);

  // The food-log API filters with .gte("logged_at", from) against a Postgres
  // timestamp column, so `from` must be an ISO string. Passing stringified
  // epoch ms (which Postgres can't cast) silently returns nothing.
  const sevenDaysAgoIso = useMemo(
    () => new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    [],
  );
  const sevenDaysAgoMs = useMemo(() => Date.now() - 7 * 24 * 60 * 60 * 1000, []);

  const glucoseQuery = trpc.glucose.list.useQuery(
    { limit: 200 },
    { retry: false, enabled: !!API_URL },
  );

  const mealsQuery = trpc.food.list.useQuery(
    { from: sevenDaysAgoIso, to: new Date().toISOString(), limit: 200 },
    { retry: false, enabled: !!API_URL },
  );

  const readings: GlucoseReading[] = useMemo(
    () =>
      (glucoseQuery.data ?? []).map((r) => ({
        value_mgdl: mgFromMmol(r.valueMmol),
        takenAt: new Date(r.loggedAt).getTime(),
      })),
    [glucoseQuery.data],
  );

  const tir = useMemo(() => timeInRange(readings, 7), [readings]);
  const a1c = useMemo(() => estimateA1c(readings, 90), [readings]);

  const weekReadings = readings.filter((r) => r.takenAt >= sevenDaysAgoMs);
  const high = weekReadings.length > 0 ? Math.max(...weekReadings.map((r) => r.value_mgdl)) : null;
  const low = weekReadings.length > 0 ? Math.min(...weekReadings.map((r) => r.value_mgdl)) : null;

  const ratingCounts = useMemo(() => {
    const counts = { safe: 0, moderate: 0, risky: 0, unrated: 0 };
    (mealsQuery.data ?? []).forEach((m) => {
      const r = (m.ratingType2 ?? "").toLowerCase();
      if (r === "safe") counts.safe++;
      else if (r === "moderate") counts.moderate++;
      else if (r === "risky") counts.risky++;
      else counts.unrated++;
    });
    return counts;
  }, [mealsQuery.data]);

  const nudge = useMemo(
    () =>
      generateMentorMessage({
        firstName: profile?.firstName,
        tir,
        readings,
        streakDays: undefined,
        carbsToday_g: undefined,
      }),
    [profile?.firstName, tir, readings],
  );

  const loading = glucoseQuery.isLoading || mealsQuery.isLoading;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 32,
          paddingHorizontal: 18,
          gap: 14,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={{
              width: 38, height: 38, borderRadius: 19,
              backgroundColor: colors.card,
              borderWidth: 1, borderColor: colors.border,
              alignItems: "center", justifyContent: "center",
            }}
          >
            <ArrowLeft size={18} color={colors.textPrimary} />
          </Pressable>
          <View style={{ marginLeft: 14, flex: 1 }}>
            <Text style={{ fontSize: 11, color: colors.textMuted, letterSpacing: 0.8, textTransform: "uppercase", fontWeight: "700" }}>
              Last 7 days
            </Text>
            <Text style={{ fontFamily: fonts.serifBold, fontSize: 24, color: colors.textPrimary }}>
              Your weekly review
            </Text>
          </View>
        </View>

        {loading && (
          <View style={{ paddingVertical: 24, alignItems: "center" }}>
            <ActivityIndicator color={colors.primary} />
          </View>
        )}

        {!loading && (
          <>
            {/* Time in Range hero */}
            <View
              style={{
                backgroundColor: colors.card,
                borderRadius: radius.xl,
                borderWidth: 1, borderColor: colors.border,
                padding: 18,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: "700", color: colors.textMuted, letterSpacing: 1, textTransform: "uppercase" }}>
                Time in Range
              </Text>
              <View style={{ flexDirection: "row", alignItems: "baseline", marginTop: 6 }}>
                <Text style={{ fontFamily: fonts.serifBold, fontSize: 44, color: colors.textPrimary, letterSpacing: -1 }}>
                  {tir.readingCount > 0 ? tir.inRangePct : "—"}
                </Text>
                {tir.readingCount > 0 && (
                  <Text style={{ fontSize: 16, fontWeight: "800", color: colors.textSecondary, marginLeft: 4 }}>%</Text>
                )}
              </View>
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>
                {tir.readingCount === 0
                  ? "No readings logged this week."
                  : `${tir.readingCount} readings · ADA target is 70%+`}
              </Text>

              {/* Bar */}
              <View
                style={{
                  flexDirection: "row",
                  marginTop: 14,
                  height: 12,
                  borderRadius: 6,
                  overflow: "hidden",
                  backgroundColor: colors.borderLight,
                }}
              >
                <View style={{ flex: tir.belowPct, backgroundColor: colors.risky }} />
                <View style={{ flex: tir.inRangePct, backgroundColor: colors.safe }} />
                <View style={{ flex: tir.abovePct, backgroundColor: colors.moderate }} />
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
                <Mini label="Below" pct={tir.belowPct} color={colors.risky} />
                <Mini label="In range" pct={tir.inRangePct} color={colors.safe} />
                <Mini label="Above" pct={tir.abovePct} color={colors.moderate} />
              </View>
            </View>

            {/* High / low */}
            <View style={{ flexDirection: "row", gap: 12 }}>
              <ExtremeCard
                label="Highest"
                value={high}
                icon={TrendingUp}
                tone={colors.moderate}
              />
              <ExtremeCard
                label="Lowest"
                value={low}
                icon={TrendingDown}
                tone={colors.risky}
              />
            </View>

            {/* A1c context */}
            <View
              style={{
                backgroundColor: colors.card,
                borderRadius: radius.xl,
                borderWidth: 1, borderColor: colors.border,
                padding: 16,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
              }}
            >
              <View style={{
                width: 40, height: 40, borderRadius: 12,
                backgroundColor: colors.primaryLight,
                alignItems: "center", justifyContent: "center",
              }}>
                <Award size={18} color={colors.primary} strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, fontWeight: "700", color: colors.textMuted, letterSpacing: 0.8, textTransform: "uppercase" }}>
                  90-day estimated A1c
                </Text>
                <Text style={{ fontSize: 16, fontWeight: "800", color: colors.textPrimary, marginTop: 2 }}>
                  {a1c.readingCount > 0 ? `${a1c.a1c}%` : "Not enough data yet"}
                </Text>
                <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
                  {a1c.readingCount > 0
                    ? `${a1c.confidence} confidence · ${a1c.readingCount} readings`
                    : "Aim for 14+ readings spread across 2 weeks."}
                </Text>
              </View>
            </View>

            {/* Meal mix */}
            <View
              style={{
                backgroundColor: colors.card,
                borderRadius: radius.xl,
                borderWidth: 1, borderColor: colors.border,
                padding: 16,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: "700", color: colors.textMuted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>
                Meal mix
              </Text>
              <Row label="Safe meals" count={ratingCounts.safe} color={colors.safe} />
              <Row label="Moderate" count={ratingCounts.moderate} color={colors.moderate} />
              <Row label="Risky" count={ratingCounts.risky} color={colors.risky} />
              {ratingCounts.unrated > 0 && (
                <Row label="Unrated" count={ratingCounts.unrated} color={colors.textMuted} />
              )}
            </View>

            {/* One nudge for next week */}
            <View
              style={{
                backgroundColor: colors.primaryLight,
                borderRadius: radius.xl,
                borderWidth: 1, borderColor: colors.glassBorder,
                padding: 18,
                gap: 8,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Sparkles size={14} color={colors.primary} />
                <Text style={{ fontSize: 11, fontWeight: "700", color: colors.primary, letterSpacing: 1, textTransform: "uppercase" }}>
                  Try this next week
                </Text>
              </View>
              <Text style={{ fontFamily: fonts.serifBold, fontSize: 18, color: colors.textPrimary, lineHeight: 23 }}>
                {nudge.title}
              </Text>
              {nudge.body && (
                <Text style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 18 }}>
                  {nudge.body}
                </Text>
              )}
            </View>

            {/* Footer */}
            <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6, marginTop: 8 }}>
              <Flame size={11} color={colors.accent2} />
              <Text style={{ fontSize: 11, color: colors.textMuted }}>
                Reviews refresh every Sunday at midnight.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Mini({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <View>
      <Text style={{ fontSize: 11, fontWeight: "700", color }}>{pct}%</Text>
      <Text style={{ fontSize: 10, color: colors.textMuted }}>{label}</Text>
    </View>
  );
}

function Row({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 6, gap: 10 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
      <Text style={{ fontSize: 13, color: colors.textPrimary, flex: 1 }}>{label}</Text>
      <Text style={{ fontSize: 13, fontWeight: "700", color }}>{count}</Text>
    </View>
  );
}

function ExtremeCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number | null;
  icon: typeof TrendingUp;
  tone: string;
}) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.card,
        borderRadius: radius.xl,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 16,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 }}>
        <Icon size={13} color={tone} />
        <Text style={{ fontSize: 10, fontWeight: "700", color: colors.textMuted, letterSpacing: 0.8, textTransform: "uppercase" }}>
          {label}
        </Text>
      </View>
      {value === null ? (
        <Text style={{ fontSize: 14, color: colors.textMuted }}>—</Text>
      ) : (
        <View style={{ flexDirection: "row", alignItems: "baseline" }}>
          <Text style={{ fontFamily: fonts.serifBold, fontSize: 24, color: colors.textPrimary, letterSpacing: -0.5 }}>
            {(value / 18.0182).toFixed(1)}
          </Text>
          <Text style={{ fontSize: 11, color: colors.textSecondary, marginLeft: 4 }}>mmol/L</Text>
        </View>
      )}
    </View>
  );
}
