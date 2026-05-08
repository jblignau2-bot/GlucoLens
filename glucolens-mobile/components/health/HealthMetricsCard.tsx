/**
 * Compact A1c + Time-in-Range card.
 *
 * Reads recent glucose readings from the API (with retry off so it's safe on
 * a dead backend) and renders the two consensus diabetes metrics every
 * competitor shows: estimated A1c (90 days) and Time in Range (14 days).
 *
 * Designed to slot into either the Home today-stack or the Glucose screen
 * header. Tapping the card pushes to the full Glucose surface.
 */

import { useMemo } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Activity, ChevronRight, TrendingUp } from "lucide-react-native";
import { trpc } from "@/lib/trpc";
import { colors, radius, fonts } from "@/constants/tokens";
import {
  estimateA1c,
  timeInRange,
  mgFromMmol,
  type GlucoseReading,
} from "@/lib/health/metrics";

interface ApiReading {
  id: number;
  valueMmol: number;
  loggedAt: string;
}

function toMetricsReading(api: ApiReading): GlucoseReading {
  return {
    value_mgdl: mgFromMmol(api.valueMmol),
    takenAt: new Date(api.loggedAt).getTime(),
    context: undefined,
  };
}

export interface HealthMetricsCardProps {
  /** Show a compact one-line layout instead of the two-tile grid. */
  compact?: boolean;
}

export function HealthMetricsCard({ compact = false }: HealthMetricsCardProps) {
  const router = useRouter();
  const apiUrl = process.env.EXPO_PUBLIC_API_URL;

  const { data, isLoading } = trpc.glucose.list.useQuery(
    { limit: 200 },
    { retry: false, enabled: !!apiUrl, staleTime: 1000 * 60 * 5 },
  );

  const { a1c, tir, hasData } = useMemo(() => {
    const readings = (data ?? []).map(toMetricsReading);
    return {
      a1c: estimateA1c(readings, 90),
      tir: timeInRange(readings, 14),
      hasData: readings.length > 0,
    };
  }, [data]);

  return (
    <Pressable
      onPress={() => router.push("/(tabs)/glucose")}
      style={({ pressed }) => ({
        backgroundColor: colors.card,
        borderRadius: radius.xl,
        borderWidth: 1,
        borderColor: colors.border,
        padding: compact ? 14 : 18,
        opacity: pressed ? 0.92 : 1,
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
        <View
          style={{
            width: 30,
            height: 30,
            borderRadius: 9,
            backgroundColor: colors.primaryLight,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Activity size={16} color={colors.primary} strokeWidth={2.2} />
        </View>
        <Text
          style={{
            marginLeft: 10,
            fontSize: 11,
            fontWeight: "700",
            color: colors.textMuted,
            letterSpacing: 1.1,
            textTransform: "uppercase",
            flex: 1,
          }}
        >
          Glucose health
        </Text>
        <ChevronRight size={16} color={colors.textMuted} />
      </View>

      {isLoading ? (
        <View style={{ paddingVertical: 12, alignItems: "center" }}>
          <ActivityIndicator color={colors.primary} size="small" />
        </View>
      ) : !hasData ? (
        <Text style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 18 }}>
          Log your first glucose reading to see your estimated A1c and time in
          range. Aim for 14+ readings to unlock confident estimates.
        </Text>
      ) : (
        <View style={{ flexDirection: "row", gap: 12 }}>
          <Metric
            label="Est. A1c"
            value={a1c.a1c > 0 ? a1c.a1c.toFixed(1) : "—"}
            unit="%"
            sub={
              a1c.readingCount === 0
                ? "no data"
                : a1c.confidence === "low"
                ? `${a1c.readingCount} reading${a1c.readingCount === 1 ? "" : "s"} · low confidence`
                : `${a1c.readingCount} readings · ${a1c.windowDays}d`
            }
            tone="primary"
          />
          <Metric
            label="Time in range"
            value={`${tir.inRangePct}`}
            unit="%"
            sub={`${tir.readingCount} readings · ${tir.windowDays}d`}
            tone={tir.inRangePct >= 70 ? "safe" : tir.inRangePct >= 50 ? "warn" : "risk"}
          />
        </View>
      )}

      {hasData && (
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 10, gap: 6 }}>
          <TrendingUp size={11} color={colors.textMuted} />
          <Text style={{ fontSize: 11, color: colors.textMuted }}>
            Tap for the full glucose log, trend chart, and add a reading.
          </Text>
        </View>
      )}
    </Pressable>
  );
}

function Metric({
  label,
  value,
  unit,
  sub,
  tone,
}: {
  label: string;
  value: string;
  unit: string;
  sub: string;
  tone: "primary" | "safe" | "warn" | "risk";
}) {
  const toneColor =
    tone === "safe" ? colors.safe :
    tone === "warn" ? colors.moderate :
    tone === "risk" ? colors.risky : colors.primary;
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 12,
      }}
    >
      <Text
        style={{
          fontSize: 10,
          fontWeight: "700",
          color: colors.textMuted,
          letterSpacing: 0.6,
          textTransform: "uppercase",
        }}
      >
        {label}
      </Text>
      <View style={{ flexDirection: "row", alignItems: "baseline", marginTop: 4 }}>
        <Text
          style={{
            fontFamily: fonts.serifBold,
            fontSize: 28,
            color: toneColor,
            letterSpacing: -0.5,
          }}
        >
          {value}
        </Text>
        <Text style={{ fontSize: 13, fontWeight: "700", color: toneColor, marginLeft: 3 }}>
          {unit}
        </Text>
      </View>
      <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 2 }}>{sub}</Text>
    </View>
  );
}
