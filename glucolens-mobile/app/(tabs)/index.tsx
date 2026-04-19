/**
 * Home (Dashboard) screen — matches glucolens-indigo-full.html mockup.
 *
 *  ┌─────────────────────────────────────┐
 *  │  Sunday, 19 April · 🔥 12-day streak│
 *  │  Morning, Jay.                 [J]  │
 *  ├─────────────────────────────────────┤
 *  │  Today · 560 kcal left              │
 *  │  Calories  59% · 1,240 / 2,100      │
 *  │  ▓▓▓▓▓▓░░░░ 860 kcal remaining      │
 *  │  Carbs     53% · 95g / 180g         │
 *  │  ▓▓▓▓▓░░░░░ 85g remaining           │
 *  │  Sugar     62% · 28g / 45g          │
 *  │  ▓▓▓▓▓▓░░░░ 17g remaining           │
 *  ├─────────────────────────────────────┤
 *  │  [Planner][Scan][Guide][Glucose]    │
 *  │  [Diary][Progress][Water][Foods]    │
 *  ├─────────────────────────────────────┤
 *  │  [G] GlucoBot · Beta           ›    │
 *  │      Ask about foods, readings, tips│
 *  └─────────────────────────────────────┘
 */

import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useProfileStore } from "@/stores/profileStore";
import { colors, radius, fonts, fontSize } from "@/constants/tokens";
import {
  Calendar,
  CalendarDays,
  Camera,
  BookOpen,
  LineChart,
  FileText,
  TrendingUp,
  Droplets,
  UtensilsCrossed,
  Flame,
  Sparkles,
  ChevronRight,
  type LucideIcon,
} from "lucide-react-native";
import { format } from "date-fns";

// ─── Greeting helpers ──────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Morning";
  if (h < 17) return "Afternoon";
  return "Evening";
}

// ─── Macro row ─────────────────────────────────────────────────────────────

interface MacroRowProps {
  label: string;
  value: number;
  max: number;
  unit: string;
  warn?: boolean;
}

function MacroRow({ label, value, max, unit, warn = false }: MacroRowProps) {
  const pct = Math.min(Math.round((value / Math.max(max, 1)) * 100), 100);
  const remaining = Math.max(max - value, 0);
  const fillColor = warn ? colors.moderate : colors.primary;

  return (
    <View style={{ marginBottom: 14 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
        <Text style={{ fontSize: 13, fontWeight: "600", color: colors.textPrimary }}>{label}</Text>
        <Text style={{ fontSize: 12, fontWeight: "700", color: colors.textSecondary }}>
          {pct}%
          <Text style={{ fontWeight: "400", color: colors.textMuted }}>
            {"  · "}
            {value.toLocaleString()} / {max.toLocaleString()}{unit === "kcal" ? "" : unit}
          </Text>
        </Text>
      </View>
      <View style={{
        height: 6,
        backgroundColor: "rgba(255,255,255,0.06)",
        borderRadius: 3,
        overflow: "hidden",
      }}>
        <View style={{
          width: `${pct}%`,
          height: "100%",
          backgroundColor: fillColor,
          borderRadius: 3,
        }} />
      </View>
      <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>
        {remaining.toLocaleString()}{unit === "kcal" ? " kcal" : unit} remaining
      </Text>
    </View>
  );
}

// ─── Launcher tile ─────────────────────────────────────────────────────────

interface TileProps {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
}

function Tile({ icon: Icon, label, onPress }: TileProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width: "23.5%",
        aspectRatio: 1,
        backgroundColor: colors.card,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        opacity: pressed ? 0.75 : 1,
      })}
    >
      <View style={{
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: colors.primaryLight,
        alignItems: "center", justifyContent: "center",
      }}>
        <Icon size={18} color={colors.primary} strokeWidth={1.75} />
      </View>
      <Text style={{
        fontSize: 10,
        fontWeight: "600",
        color: colors.textSecondary,
        textAlign: "center",
      }} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

// ─── Main screen ───────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const profile = useProfileStore((s) => s.profile);
  const [refreshing, setRefreshing] = useState(false);
  const [waterCups] = useState(4); // local-only placeholder (cups out of 8)
  const [streakDays] = useState(12); // local-only placeholder

  // Try the API, but fall back to local / defaults if the backend is dead.
  const { data: todayLogs, refetch, isLoading } = trpc.food.list.useQuery(
    { from: new Date().setHours(0, 0, 0, 0).toString(), to: new Date().toISOString(), limit: 20 },
    { retry: false, enabled: false }, // keep disabled for now — backend offline
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await refetch(); } catch {}
    setTimeout(() => setRefreshing(false), 500);
  }, [refetch]);

  // Totals — real when we have logs, zero when offline/empty.
  const totalCalories = todayLogs?.reduce((s, m) => s + (m.calories ?? 0), 0) ?? 0;
  const totalCarbs    = todayLogs?.reduce((s, m) => s + (m.totalCarbs ?? 0), 0) ?? 0;
  const totalSugar    = todayLogs?.reduce((s, m) => s + (m.totalSugar ?? 0), 0) ?? 0;

  // Goals come from the profile store (onboarding seed) or fall back to sane defaults.
  const maxCalories = profile?.dailyCalorieGoal ?? 2100;
  const maxCarbs    = profile?.maxDailyCarbs    ?? 180;
  const maxSugar    = profile?.maxDailySugar    ?? 45;

  const firstName = profile?.firstName ?? "there";
  const initial = firstName.charAt(0).toUpperCase();
  const dateLabel = format(new Date(), "EEEE, d MMMM");
  const caloriesLeft = Math.max(maxCalories - totalCalories, 0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 100, paddingHorizontal: 20, paddingTop: insets.top + 12 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Brand header (small, centered) ─── */}
        <Text style={{
          fontSize: 15, fontWeight: "700", letterSpacing: 0.6,
          textAlign: "center", color: colors.textPrimary, marginBottom: 16,
        }}>
          Gluco<Text style={{ color: colors.primary }}>Lens</Text>
        </Text>

        {/* ─── Greeting + streak + avatar ─── */}
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18 }}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <Text style={{ fontSize: 12, color: colors.textMuted }}>{dateLabel}</Text>
              <Text style={{ fontSize: 12, color: colors.textMuted }}>·</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                <Flame size={12} color={colors.primary} strokeWidth={2.25} />
                <Text style={{ fontSize: 12, color: colors.primary, fontWeight: "700" }}>
                  {streakDays}-day streak
                </Text>
              </View>
            </View>
            <Text style={{
              fontFamily: fonts.serifBold,
              fontSize: 24,
              color: colors.textPrimary,
              letterSpacing: -0.3,
            }}>
              {getGreeting()}, {firstName}.
            </Text>
          </View>
          <View style={{
            width: 44, height: 44, borderRadius: 22,
            backgroundColor: colors.primaryLight,
            borderWidth: 1, borderColor: colors.glassBorder,
            alignItems: "center", justifyContent: "center",
          }}>
            <Text style={{ fontSize: 17, fontWeight: "700", color: colors.primary }}>{initial}</Text>
          </View>
        </View>

        {/* ─── Macro panel ─── */}
        <View style={{
          backgroundColor: colors.card,
          borderRadius: radius.xl,
          borderWidth: 1, borderColor: colors.border,
          padding: 18, marginBottom: 16,
        }}>
          <Text style={{
            fontSize: 11,
            fontWeight: "700",
            letterSpacing: 1.2,
            color: colors.textMuted,
            textTransform: "uppercase",
            marginBottom: 14,
          }}>
            Today · {caloriesLeft.toLocaleString()} kcal left
          </Text>
          <MacroRow label="Calories" value={totalCalories} max={maxCalories} unit="kcal" />
          <MacroRow label="Carbs"    value={totalCarbs}    max={maxCarbs}    unit="g" />
          <MacroRow label="Sugar"    value={totalSugar}    max={maxSugar}    unit="g" warn />
        </View>

        {/* ─── Launcher grid (8 tiles, 4×2) ─── */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: "2%" as any, rowGap: 10, marginBottom: 16 }}>
          <Tile icon={CalendarDays}   label="Planner"    onPress={() => router.push("/(tabs)/planner")} />
          <Tile icon={Camera}         label="Scan"       onPress={() => router.push("/(tabs)/scan")} />
          <Tile icon={BookOpen}       label="Guide"      onPress={() => router.push("/(tabs)/reminders")} />
          <Tile icon={LineChart}      label="Glucose"    onPress={() => router.push("/glucose" as any)} />
          <Tile icon={FileText}       label="Diary"      onPress={() => router.push("/food-log" as any)} />
          <Tile icon={TrendingUp}     label="Progress"   onPress={() => router.push("/progress" as any)} />
          <Tile icon={Droplets}       label={`Water · ${waterCups}/8`} onPress={() => router.push("/water" as any)} />
          <Tile icon={UtensilsCrossed} label="Foods"     onPress={() => router.push("/foods" as any)} />
        </View>

        {/* ─── GlucoBot card ─── */}
        <Pressable
          onPress={() => router.push("/coach" as any)}
          style={({ pressed }) => ({
            flexDirection: "row", alignItems: "center", gap: 12,
            backgroundColor: colors.card,
            borderRadius: radius.lg,
            borderWidth: 1, borderColor: colors.border,
            padding: 14,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <View style={{
            width: 42, height: 42, borderRadius: 21,
            backgroundColor: colors.primary,
            alignItems: "center", justifyContent: "center",
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.5,
            shadowRadius: 10,
          }}>
            <Sparkles size={18} color={colors.background} strokeWidth={2.25} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={{ fontSize: 14, fontWeight: "800", color: colors.textPrimary }}>GlucoBot</Text>
              <View style={{
                backgroundColor: colors.primaryLight,
                borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1,
              }}>
                <Text style={{ fontSize: 9, fontWeight: "700", color: colors.primary, letterSpacing: 0.5 }}>BETA</Text>
              </View>
            </View>
            <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
              Ask about foods, readings, tips
            </Text>
          </View>
          <ChevronRight size={18} color={colors.textMuted} />
        </Pressable>
      </ScrollView>
    </View>
  );
}
