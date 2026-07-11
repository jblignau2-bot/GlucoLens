/**
 * Home dashboard with summary metrics, a honeycomb launcher, and the GlucoBot dock.
 */

import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useState, useCallback, useEffect } from "react";
import Svg, { Polygon } from "react-native-svg";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
  type LucideIcon,
} from "lucide-react-native";
import { format } from "date-fns";

// Greeting helpers

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Morning";
  if (h < 17) return "Afternoon";
  return "Evening";
}

// Macro row

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
            {"  - "}
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

// Launcher tile

interface TileProps {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  accent?: string;
  size: number;
}

function Tile({ icon: Icon, label, onPress, accent = colors.primary, size }: TileProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width: size,
        height: size * 0.95,
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed ? 0.78 : 1,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
    >
      <Svg
        viewBox="0 0 100 104"
        preserveAspectRatio="none"
        style={{ position: "absolute", width: "100%", height: "100%" }}
      >
        <Polygon
          points="50,0 98,27 98,77 50,104 2,77 2,27"
          fill="rgba(9,23,42,0.94)"
          stroke={colors.glassBorder}
          strokeWidth="1.6"
        />
        <Polygon
          points="50,8 89,30 89,74 50,96 11,74 11,30"
          fill={colors.card}
          stroke="rgba(160,180,255,0.08)"
          strokeWidth="1"
        />
      </Svg>
      <View style={{ alignItems: "center", justifyContent: "center", paddingHorizontal: 10 }}>
        <View style={{
          width: 40, height: 40, borderRadius: 14,
          backgroundColor: `${accent}22`,
          alignItems: "center", justifyContent: "center",
          marginBottom: 6,
        }}>
          <Icon size={20} color={accent} strokeWidth={2.1} />
        </View>
        <Text style={{
          fontSize: 12,
          fontWeight: "800",
          color: colors.textPrimary,
          textAlign: "center",
          lineHeight: 14,
        }} numberOfLines={2}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

// Main screen

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const profile = useProfileStore((s) => s.profile);
  const [refreshing, setRefreshing] = useState(false);

  // Local per-day water counter, persisted in AsyncStorage.
  const waterKey = `@glucolens/water/${format(new Date(), "yyyy-MM-dd")}`;
  const [waterCups, setWaterCups] = useState(0);
  useEffect(() => {
    AsyncStorage.getItem(waterKey)
      .then((v) => setWaterCups(v ? Number(v) || 0 : 0))
      .catch(() => {});
  }, [waterKey]);
  const incrementWater = () => {
    setWaterCups((prev) => {
      const next = prev >= 8 ? 0 : prev + 1;
      AsyncStorage.setItem(waterKey, String(next)).catch(() => {});
      return next;
    });
  };

  // Today's meals from the API. On error (offline) we silently show zeros.
  const { data: todayLogs, refetch } = trpc.food.list.useQuery(
    {
      from: new Date(new Date().setHours(0, 0, 0, 0)).toISOString(),
      to: new Date().toISOString(),
      limit: 20,
    },
    { retry: false },
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
  const tiles = [
    { icon: CalendarDays, label: "Planner", accent: colors.primary, onPress: () => router.push("/(tabs)/planner") },
    { icon: Camera, label: "Scan", accent: "#9BE7D8", onPress: () => router.push("/(tabs)/scan") },
    { icon: BookOpen, label: "Guide", accent: colors.primary, onPress: () => router.push("/(tabs)/reminders") },
    { icon: LineChart, label: "Glucose", accent: "#B6F09C", onPress: () => router.push("/(tabs)/glucose") },
    { icon: FileText, label: "Diary", accent: colors.primary, onPress: () => router.push("/food-log" as any) },
    { icon: TrendingUp, label: "Progress", accent: "#FFC857", onPress: () => router.push("/goals" as any) },
    { icon: Droplets, label: `Water ${waterCups}/8`, accent: "#72D7FF", onPress: incrementWater },
    { icon: UtensilsCrossed, label: "Foods", accent: "#FFB58A", onPress: () => router.push("/food-log" as any) },
  ];
  const contentWidth = Math.max(width - 40, 300);
  const tileGap = 8;
  const tileSize = Math.min((contentWidth - tileGap * 2) / 3, 118);
  const honeycombRows = [tiles.slice(0, 3), tiles.slice(3, 5), tiles.slice(5, 8)];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 146, paddingHorizontal: 20, paddingTop: insets.top + 12 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Brand header */}
        <Text style={{
          fontSize: 15, fontWeight: "700", letterSpacing: 0.6,
          textAlign: "center", color: colors.textPrimary, marginBottom: 16,
        }}>
          Gluco<Text style={{ color: colors.primary }}>Lens</Text>
        </Text>

        {/* Greeting, streak, and avatar */}
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <Text style={{ fontSize: 12, color: colors.textMuted }}>{dateLabel}</Text>
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

        {/* Macro panel */}
        <View style={{
          backgroundColor: colors.card,
          borderRadius: radius.xl,
          borderWidth: 1, borderColor: colors.border,
          padding: 18, marginBottom: 14,
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

        {/* Honeycomb launcher */}
        <View style={{ marginBottom: 12, alignItems: "center" }}>
          {honeycombRows.map((row, rowIndex) => (
            <View
              key={rowIndex}
              style={{
                flexDirection: "row",
                gap: tileGap,
                marginTop: rowIndex === 0 ? 0 : -16,
              }}
            >
              {row.map((tile) => (
                <Tile key={tile.label} {...tile} size={tileSize} />
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
      <GlucoBotDock bottomOffset={insets.bottom + 74} />
    </View>
  );
}
