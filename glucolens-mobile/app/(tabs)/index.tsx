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
import { colors, radius, fonts } from "@/constants/tokens";
import { GlucoBotDock } from "@/components/GlucoBotDock";
import {
  CalendarDays,
  Camera,
  BookOpen,
  LineChart,
  FileText,
  TrendingUp,
  Droplets,
  UtensilsCrossed,
  Flame,
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
        width: "48%",
        minHeight: 96,
        backgroundColor: colors.card,
        borderRadius: radius.xl,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        paddingVertical: 14,
        paddingHorizontal: 10,
        opacity: pressed ? 0.75 : 1,
      })}
    >
      <View style={{
        width: 44, height: 44, borderRadius: 14,
        backgroundColor: colors.primaryLight,
        alignItems: "center", justifyContent: "center",
      }}>
        <Icon size={22} color={colors.primary} strokeWidth={1.9} />
      </View>
      <Text style={{
        fontSize: 13,
        fontWeight: "800",
        color: colors.textPrimary,
        textAlign: "center",
      }} numberOfLines={2}>
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
        contentContainerStyle={{ paddingBottom: insets.bottom + 176, paddingHorizontal: 20, paddingTop: insets.top + 12 }}
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

        {/* ─── Launcher grid ─── */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 12, marginBottom: 18 }}>
          <Tile icon={CalendarDays}   label="Planner"    onPress={() => router.push("/(tabs)/planner")} />
          <Tile icon={Camera}         label="Scan"       onPress={() => router.push("/(tabs)/scan")} />
          <Tile icon={BookOpen}       label="Guide"      onPress={() => router.push("/(tabs)/reminders")} />
          <Tile icon={LineChart}      label="Glucose"    onPress={() => router.push("/(tabs)/glucose")} />
          <Tile icon={FileText}       label="Diary"      onPress={() => router.push("/food-log" as any)} />
          <Tile icon={TrendingUp}     label="Progress"   onPress={() => router.push("/progress" as any)} />
          <Tile icon={Droplets}       label={`Water · ${waterCups}/8`} onPress={() => router.push("/water" as any)} />
          <Tile icon={UtensilsCrossed} label="Foods"     onPress={() => router.push("/foods" as any)} />
        </View>
      </ScrollView>
      <GlucoBotDock bottomOffset={insets.bottom + 86} />
    </View>
  );
}
