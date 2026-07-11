/**
 * My Progress — Body measurements, progress photos, and AI coaching
 *
 * Features:
 *  - Week tabs (current week highlighted)
 *  - Body measurements: arms, chest, stomach, hips, thighs, calves (cm)
 *  - Photo slots: front, side, back
 *  - Weekly summary with change indicators
 *  - GlucoBot motivational message
 */

import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import Toast from "react-native-toast-message";
import { trpc } from "@/lib/trpc";
import { colors, radius } from "@/constants/tokens";
import {
  ArrowLeft,
  Camera,
  TrendingUp,
  TrendingDown,
  Ruler,
  Calendar,
  Sparkles,
  ChevronRight,
} from "lucide-react-native";
import { format, startOfWeek, addWeeks, getISOWeek, parseISO } from "date-fns";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Measurements {
  arms: string;
  chest: string;
  stomach: string;
  hips: string;
  thighs: string;
  calves: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getWeeks(): { label: string; start: string }[] {
  const now = new Date();
  const weeks = [];
  for (let i = -3; i <= 0; i++) {
    const ws = startOfWeek(addWeeks(now, i), { weekStartsOn: 1 });
    weeks.push({
      label: format(ws, "d MMM"),
      start: format(ws, "yyyy-MM-dd"),
    });
  }
  return weeks;
}

// ─── Measurement Input ──────────────────────────────────────────────────────

function MeasurementRow({ label, value, onChange, previousValue }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  previousValue?: string;
}) {
  const diff = value && previousValue ? parseFloat(value) - parseFloat(previousValue) : null;

  return (
    <View style={{
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    }}>
      <Text style={{ flex: 1, fontSize: 14, fontWeight: "600", color: colors.textPrimary }}>{label}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <TextInput
          value={value}
          onChangeText={onChange}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor={colors.textSecondary}
          style={{
            width: 70,
            height: 38,
            backgroundColor: colors.card,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: colors.border,
            textAlign: "center",
            color: colors.textPrimary,
            fontSize: 15,
            fontWeight: "700",
          }}
        />
        <Text style={{ fontSize: 12, color: colors.textSecondary, width: 24 }}>cm</Text>
        {diff != null && !isNaN(diff) && diff !== 0 && (
          <View style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 2,
            backgroundColor: diff < 0 ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: 6,
          }}>
            {diff < 0 ? (
              <TrendingDown size={10} color="#22c55e" />
            ) : (
              <TrendingUp size={10} color="#ef4444" />
            )}
            <Text style={{ fontSize: 10, fontWeight: "700", color: diff < 0 ? "#22c55e" : "#ef4444" }}>
              {Math.abs(diff).toFixed(1)}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Main Screen ────────────────────────────────────────────────────────────

const MEASUREMENT_FIELDS: { key: keyof Measurements; apiKey: string; label: string }[] = [
  { key: "arms", apiKey: "armsCm", label: "Arms" },
  { key: "chest", apiKey: "chestCm", label: "Chest" },
  { key: "stomach", apiKey: "stomachCm", label: "Stomach" },
  { key: "hips", apiKey: "hipsCm", label: "Hips" },
  { key: "thighs", apiKey: "thighsCm", label: "Thighs" },
  { key: "calves", apiKey: "calvesCm", label: "Calves" },
];

export default function ProgressScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const weeks = getWeeks();
  const [activeWeek, setActiveWeek] = useState(weeks.length - 1);
  const [measurements, setMeasurements] = useState<Measurements>({
    arms: "", chest: "", stomach: "", hips: "", thighs: "", calves: "",
  });

  // Calendar ISO week number for the selected week tab (API stores by week 1–52).
  const weekNum = Math.min(Math.max(getISOWeek(parseISO(weeks[activeWeek].start)), 1), 52);
  const prevWeekNum = Math.min(Math.max(getISOWeek(parseISO(weeks[Math.max(activeWeek - 1, 0)].start)), 1), 52);

  const { data: weekData } = trpc.bodyMeasurements.getWeek.useQuery({ week: weekNum });
  const { data: prevWeekData } = trpc.bodyMeasurements.getWeek.useQuery(
    { week: prevWeekNum },
    { enabled: activeWeek > 0 }
  );

  // Prefill the inputs from the saved measurements for the selected week.
  useEffect(() => {
    const next: Measurements = { arms: "", chest: "", stomach: "", hips: "", thighs: "", calves: "" };
    if (weekData) {
      MEASUREMENT_FIELDS.forEach(({ key, apiKey }) => {
        const v = (weekData as any)[apiKey];
        next[key] = v != null ? String(v) : "";
      });
    }
    setMeasurements(next);
  }, [weekData, weekNum]);

  const previousValueFor = (apiKey: string): string | undefined => {
    if (activeWeek === 0 || !prevWeekData) return undefined;
    const v = (prevWeekData as any)[apiKey];
    return v != null ? String(v) : undefined;
  };

  const saveMutation = trpc.bodyMeasurements.upsertWeek.useMutation({
    onSuccess: () => {
      Toast.show({ type: "success", text1: "Saved", text2: "Measurements recorded for this week." });
    },
    onError: (e) => {
      Toast.show({ type: "error", text1: "Save failed", text2: e.message });
    },
  });

  const updateMeasurement = (key: keyof Measurements, value: string) => {
    setMeasurements((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    const num = (v: string) => {
      const n = parseFloat(v);
      return isNaN(n) ? null : n;
    };
    saveMutation.mutate({
      week: weekNum,
      armsCm: num(measurements.arms),
      chestCm: num(measurements.chest),
      stomachCm: num(measurements.stomach),
      hipsCm: num(measurements.hips),
      thighsCm: num(measurements.thighs),
      calvesCm: num(measurements.calves),
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 16 }}>
          <Pressable onPress={() => router.back()} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 }}>
            <ArrowLeft size={20} color={colors.primary} />
            <Text style={{ fontSize: 14, fontWeight: "600", color: colors.primary }}>Back</Text>
          </Pressable>
          <Text style={{ fontSize: 11, fontWeight: "600", color: colors.primary, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 4 }}>My Progress</Text>
          <Text style={{ fontSize: 24, fontWeight: "800", color: colors.textPrimary }}>Track Your Journey</Text>
          <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4 }}>
            {format(new Date(), "EEEE, d MMMM yyyy  •  h:mm a")}
          </Text>
        </View>

        {/* Week Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {weeks.map((w, i) => (
              <Pressable
                key={w.start}
                onPress={() => setActiveWeek(i)}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 12,
                  backgroundColor: activeWeek === i ? colors.primary : colors.card,
                  borderWidth: 1,
                  borderColor: activeWeek === i ? colors.primary : colors.border,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Calendar size={12} color={activeWeek === i ? "#0b1120" : colors.textSecondary} />
                  <Text style={{
                    fontSize: 13,
                    fontWeight: "700",
                    color: activeWeek === i ? "#0b1120" : colors.textPrimary,
                  }}>
                    {w.label}
                  </Text>
                </View>
                {i === weeks.length - 1 && (
                  <Text style={{ fontSize: 9, fontWeight: "600", color: activeWeek === i ? "#0b1120" : colors.primary, marginTop: 2 }}>This Week</Text>
                )}
              </Pressable>
            ))}
          </View>
        </ScrollView>

        {/* Progress Photos — managed on the My Progress photos screen */}
        <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: colors.textPrimary, marginBottom: 12 }}>Weekly Photos</Text>
          <Pressable
            onPress={() => router.push("/goals" as any)}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              backgroundColor: colors.card,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: colors.border,
              padding: 14,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <View style={{
              width: 40, height: 40, borderRadius: 12,
              backgroundColor: colors.primaryLight,
              alignItems: "center", justifyContent: "center",
            }}>
              <Camera size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: "700", color: colors.textPrimary }}>
                Progress Photos
              </Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 1 }}>
                Take front, side and back photos each week
              </Text>
            </View>
            <ChevronRight size={16} color={colors.textSecondary} />
          </Pressable>
        </View>

        {/* Body Measurements */}
        <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Ruler size={18} color={colors.primary} />
            <Text style={{ fontSize: 16, fontWeight: "700", color: colors.textPrimary }}>Body Measurements</Text>
          </View>
          <View style={{
            backgroundColor: colors.card,
            borderRadius: radius.xl,
            padding: 16,
            borderWidth: 1,
            borderColor: colors.border,
          }}>
            {MEASUREMENT_FIELDS.map(({ key, apiKey, label }) => (
              <MeasurementRow
                key={key}
                label={label}
                value={measurements[key]}
                onChange={(v) => updateMeasurement(key, v)}
                previousValue={previousValueFor(apiKey)}
              />
            ))}
          </View>
        </View>

        {/* Save Button */}
        <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
          <Pressable
            onPress={handleSave}
            disabled={saveMutation.isPending}
            style={({ pressed }) => ({
              backgroundColor: colors.primary,
              borderRadius: 16,
              paddingVertical: 16,
              alignItems: "center",
              opacity: pressed || saveMutation.isPending ? 0.8 : 1,
            })}
          >
            {saveMutation.isPending ? (
              <ActivityIndicator color="#0b1120" />
            ) : (
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#0b1120" }}>Save This Week</Text>
            )}
          </Pressable>
        </View>

        {/* GlucoBot Coach Message */}
        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <View style={{
            backgroundColor: "rgba(20,184,166,0.08)",
            borderRadius: radius.xl,
            padding: 16,
            borderWidth: 1,
            borderColor: "rgba(20,184,166,0.2)",
          }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}>
                <Sparkles size={18} color={colors.background} strokeWidth={2.5} />
              </View>
              <View>
                <Text style={{ fontSize: 14, fontWeight: "700", color: colors.primary }}>GlucoBot Coach</Text>
                <Text style={{ fontSize: 11, color: colors.textSecondary }}>Weekly Summary</Text>
              </View>
            </View>
            <Text style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 20 }}>
              Great work tracking your progress. Consistency is what moves the needle — weekly measurements and photos show changes the scale hides. Keep logging your meals and staying active. You're building habits that will serve you for life.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
