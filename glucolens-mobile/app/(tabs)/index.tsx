/**
 * Home — single-scroll Today stack.
 *
 * Information architecture:
 *   1. Greeting + Lens Score hero (composite 0–100 dial)
 *   2. Pending check-in (Scan → Glucose loop) — only when due
 *   3. GlucoBot mentor card (one daily observation)
 *   4. Health metrics (estimated A1c + Time in Range)
 *   5. Today's meals strip
 *   6. Quick actions row (Water · Weight · Walk)
 *   7. Weekly review prompt (Sunday or on demand)
 *
 * No tile launcher. Anything secondary (planner, scan, coach, profile) is in
 * the bottom tabs; everything else is reachable from the cards on this page.
 */

import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useFocusEffect, type Href } from "expo-router";
import { useState, useCallback, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { trpc } from "@/lib/trpc";
import { useProfileStore } from "@/stores/profileStore";
import { usePendingChecksStore } from "@/stores/pendingChecksStore";
import {
  colors,
  radius,
  TAB_BAR_HEIGHT,
  TAB_BAR_TOP_GAP,
} from "@/constants/tokens";
import {
  Droplets,
  Scale,
  Footprints,
  CalendarRange,
  ChevronRight,
  Flame,
  type LucideIcon,
} from "lucide-react-native";
import { format } from "date-fns";
import { LensScoreHero } from "@/components/health/LensScoreHero";
import { MentorCard } from "@/components/health/MentorCard";
import { PendingCheckCard } from "@/components/health/PendingCheckCard";
import { HealthMetricsCard } from "@/components/health/HealthMetricsCard";
import { lensScore, mgFromMmol, timeInRange } from "@/lib/health/metrics";
import { generateMentorMessage } from "@/lib/health/mentor";
import { syncStepsToday } from "@/lib/health/sync";

const WATER_STORAGE_KEY = "@glucolens/water";
const STEPS_STORAGE_KEY = "@glucolens/steps-today";
const API_URL = process.env.EXPO_PUBLIC_API_URL;

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function todayKey(): string { return new Date().toISOString().slice(0, 10); }

// ─── Today meals strip ──────────────────────────────────────────────────────

interface MealLogItem {
  id: number;
  mealName: string | null;
  totalCarbs: number | null;
  ratingType2: string | null;
  loggedAt: string;
}

function MealsStrip({ logs }: { logs: MealLogItem[] | undefined }) {
  const router = useRouter();
  const items = (logs ?? []).slice(0, 4);

  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: radius.xl,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 16,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
        <Text
          style={{
            fontSize: 11,
            fontWeight: "700",
            color: colors.textMuted,
            letterSpacing: 1.1,
            textTransform: "uppercase",
            flex: 1,
          }}
        >
          Today's meals
        </Text>
        <Pressable onPress={() => router.push("/food-log")}>
          <Text style={{ fontSize: 12, fontWeight: "700", color: colors.primary }}>
            See all
          </Text>
        </Pressable>
      </View>

      {items.length === 0 ? (
        <Text style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 18 }}>
          No meals logged yet today. Tap the camera in the tab bar to scan one.
        </Text>
      ) : (
        items.map((m, idx) => {
          const tone =
            m.ratingType2 === "safe" ? colors.safe :
            m.ratingType2 === "moderate" ? colors.moderate :
            m.ratingType2 === "risky" ? colors.risky : colors.textMuted;
          return (
            <View
              key={m.id}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 10,
                borderTopWidth: idx === 0 ? 0 : 1,
                borderTopColor: colors.border,
                gap: 12,
              }}
            >
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: tone,
                }}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={{ fontSize: 14, fontWeight: "700", color: colors.textPrimary }}
                  numberOfLines={1}
                >
                  {m.mealName ?? "Meal"}
                </Text>
                <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 1 }}>
                  {format(new Date(m.loggedAt), "h:mm a")}
                  {m.totalCarbs != null ? ` · ${Math.round(m.totalCarbs)}g carbs` : ""}
                </Text>
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}

// ─── Quick action row ───────────────────────────────────────────────────────

function QuickAction({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: LucideIcon;
  label: string;
  value?: string;
  href: Href;
}) {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push(href)}
      style={({ pressed }) => ({
        flex: 1,
        backgroundColor: colors.card,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        paddingVertical: 12,
        paddingHorizontal: 10,
        alignItems: "center",
        opacity: pressed ? 0.9 : 1,
      })}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 12,
          backgroundColor: colors.primaryLight,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 8,
        }}
      >
        <Icon size={17} color={colors.primary} strokeWidth={2.2} />
      </View>
      <Text style={{ fontSize: 11, fontWeight: "700", color: colors.textPrimary }}>
        {label}
      </Text>
      {value && (
        <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 2 }}>{value}</Text>
      )}
    </Pressable>
  );
}

// ─── Weekly review prompt ───────────────────────────────────────────────────

function WeeklyReviewPrompt() {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push("/weekly-review")}
      style={({ pressed }) => ({
        backgroundColor: colors.cardAlt,
        borderRadius: radius.xl,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 16,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        opacity: pressed ? 0.92 : 1,
      })}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          backgroundColor: colors.accent3,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CalendarRange size={18} color={colors.accent2} strokeWidth={2.2} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: "800", color: colors.textPrimary }}>
          Your weekly review
        </Text>
        <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 1 }}>
          Last 7 days at a glance — wins, patterns, and one thing to try.
        </Text>
      </View>
      <ChevronRight size={16} color={colors.textMuted} />
    </Pressable>
  );
}

// ─── Main screen ────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const profile = useProfileStore((s) => s.profile);
  const profileHydrated = useProfileStore((s) => s.hydrated);
  const pendingChecks = usePendingChecksStore((s) => s.checks);
  const nextDuePending = usePendingChecksStore((s) => s.nextDue());

  const [refreshing, setRefreshing] = useState(false);
  const [waterCups, setWaterCups] = useState(0);
  const [stepsToday, setStepsToday] = useState<number | null>(null);

  const queryEnabled = profileHydrated && !!profile && !!API_URL;

  // Today's meals (range query)
  const startOfDay = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime().toString();
  }, []);
  const todayMealsQuery = trpc.food.list.useQuery(
    { from: startOfDay, to: new Date().toISOString(), limit: 20 },
    { retry: false, enabled: queryEnabled },
  );

  // Trailing 14 days of glucose for TIR / mentor
  const glucoseQuery = trpc.glucose.list.useQuery(
    { limit: 200 },
    { retry: false, enabled: queryEnabled, staleTime: 1000 * 60 * 5 },
  );

  const loadLocal = useCallback(async () => {
    // Water
    try {
      const raw = await AsyncStorage.getItem(WATER_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { date: string; cups: number };
        setWaterCups(parsed.date === todayKey() ? parsed.cups : 0);
      } else {
        setWaterCups(0);
      }
    } catch { setWaterCups(0); }

    // Steps — best-effort, opportunistic Health sync, falls back to cached
    try {
      const fresh = await syncStepsToday();
      if (fresh != null) {
        setStepsToday(fresh);
        await AsyncStorage.setItem(STEPS_STORAGE_KEY, JSON.stringify({ date: todayKey(), steps: fresh }));
      } else {
        const cached = await AsyncStorage.getItem(STEPS_STORAGE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached) as { date: string; steps: number };
          setStepsToday(parsed.date === todayKey() ? parsed.steps : null);
        }
      }
    } catch {
      setStepsToday(null);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadLocal(); }, [loadLocal]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        loadLocal(),
        queryEnabled ? todayMealsQuery.refetch() : Promise.resolve(),
        queryEnabled ? glucoseQuery.refetch() : Promise.resolve(),
      ]);
    } catch { /* best-effort */ }
    setTimeout(() => setRefreshing(false), 400);
  }, [loadLocal, queryEnabled, todayMealsQuery, glucoseQuery]);

  // ── Derived metrics ──
  const todayCarbs = useMemo(() => {
    return (todayMealsQuery.data ?? []).reduce((s, m) => s + (m.totalCarbs ?? 0), 0);
  }, [todayMealsQuery.data]);

  const tir = useMemo(() => {
    const readings = (glucoseQuery.data ?? []).map((r) => ({
      value_mgdl: mgFromMmol(r.valueMmol),
      takenAt: new Date(r.loggedAt).getTime(),
    }));
    return timeInRange(readings, 14);
  }, [glucoseQuery.data]);

  const score = useMemo(
    () =>
      lensScore({
        tirPct: tir.readingCount > 0 ? tir.inRangePct : undefined,
        carbsToday_g: todayCarbs,
        carbMaxToday_g: profile?.maxDailyCarbs ?? 200,
        stepsToday: stepsToday ?? undefined,
        stepGoal: 7500,
      }),
    [tir, todayCarbs, profile?.maxDailyCarbs, stepsToday],
  );

  const streakDays = useMemo(() => {
    // Simple proxy: count consecutive days with at least one glucose reading,
    // walking back from today. Tops out at 60 days for performance.
    const days = new Set<string>();
    (glucoseQuery.data ?? []).forEach((r) => {
      days.add(new Date(r.loggedAt).toISOString().slice(0, 10));
    });
    let count = 0;
    for (let i = 0; i < 60; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const k = d.toISOString().slice(0, 10);
      if (days.has(k)) count++;
      else if (i === 0) continue; // today not yet logged is fine
      else break;
    }
    return count;
  }, [glucoseQuery.data]);

  const mentorMessage = useMemo(() => {
    return generateMentorMessage({
      firstName: profile?.firstName,
      score,
      tir,
      readings: (glucoseQuery.data ?? []).map((r) => ({
        value_mgdl: mgFromMmol(r.valueMmol),
        takenAt: new Date(r.loggedAt).getTime(),
      })),
      streakDays,
      carbsToday_g: todayCarbs,
      carbMaxToday_g: profile?.maxDailyCarbs ?? undefined,
      waterCups,
      hasRecentMeal: (todayMealsQuery.data ?? []).length > 0,
    });
  }, [profile, score, tir, glucoseQuery.data, streakDays, todayCarbs, waterCups, todayMealsQuery.data]);

  const dateLabel = format(new Date(), "EEEE, d MMMM");
  const firstName = profile?.firstName ?? "there";
  const greeting = `${getGreeting()}, ${firstName}`;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 8,
          paddingBottom: insets.bottom + TAB_BAR_HEIGHT + TAB_BAR_TOP_GAP + 24,
          paddingHorizontal: 18,
          gap: 14,
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
        {/* Top meta row */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 4,
            paddingTop: 6,
            paddingBottom: 4,
          }}
        >
          <Text style={{ fontSize: 12, color: colors.textMuted, flex: 1 }}>
            {dateLabel}
          </Text>
          {streakDays > 0 && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Flame size={12} color={colors.accent2} strokeWidth={2.4} />
              <Text style={{ fontSize: 12, color: colors.accent2, fontWeight: "700" }}>
                {streakDays}-day streak
              </Text>
            </View>
          )}
        </View>

        {/* 1) Lens Score hero */}
        <LensScoreHero score={score} greeting={greeting} />

        {/* 2) Pending check-in (only when one is due) */}
        {nextDuePending && <PendingCheckCard check={nextDuePending} />}

        {/* 3) Mentor card */}
        <MentorCard message={mentorMessage} />

        {/* 4) A1c + TIR */}
        <HealthMetricsCard />

        {/* 5) Today's meals */}
        <MealsStrip logs={todayMealsQuery.data as MealLogItem[] | undefined} />

        {/* 6) Quick actions */}
        <View style={{ flexDirection: "row", gap: 10 }}>
          <QuickAction icon={Droplets} label="Water" value={`${waterCups}/8`} href="/water" />
          <QuickAction icon={Scale} label="Weight" value="Log" href="/health-log" />
          <QuickAction
            icon={Footprints}
            label="Steps"
            value={stepsToday != null ? `${stepsToday.toLocaleString()}` : "Sync"}
            href="/health-log"
          />
        </View>

        {/* 7) Weekly review */}
        <WeeklyReviewPrompt />

        {/* Resolved-checks summary footer */}
        {pendingChecks.some((c) => c.resolved) && (
          <Text
            style={{
              fontSize: 11,
              color: colors.textMuted,
              textAlign: "center",
              marginTop: 6,
            }}
          >
            {pendingChecks.filter((c) => c.resolved).length} meal checks completed this week
          </Text>
        )}
      </ScrollView>
    </View>
  );
}
