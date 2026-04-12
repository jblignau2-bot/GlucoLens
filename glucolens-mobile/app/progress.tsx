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
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useState } from "react";
import { colors, radius } from "@/constants/tokens";
import {
  ArrowLeft,
  Camera,
  TrendingUp,
  TrendingDown,
  Minus,
  Ruler,
  Calendar,
} from "lucide-react-native";
import { format, startOfWeek, addWeeks } from "date-fns";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Measurements {
  arms: string;
  chest: string;
  stomach: string;
  hips: string;
  thighs: string;
  calves: string;
}

interface WeekData {
  weekLabel: string;
  weekStart: string;
  measurements: Measurements;
  photos: { front: boolean; side: boolean; back: boolean };
  saved: boolean;
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

// ─── Photo Slot ─────────────────────────────────────────────────────────────

function PhotoSlot({ label, taken, onPress }: { label: string; taken: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        aspectRatio: 0.75,
        backgroundColor: taken ? colors.primaryLight : colors.card,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: taken ? colors.primary : colors.border,
        borderStyle: taken ? "solid" : "dashed",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <Camera size={24} color={taken ? colors.primary : colors.textSecondary} />
      <Text style={{ fontSize: 11, fontWeight: "600", color: taken ? colors.primary : colors.textSecondary }}>{label}</Text>
      {taken && (
        <View style={{ backgroundColor: colors.primary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
          <Text style={{ fontSize: 9, fontWeight: "700", color: "#fff" }}>DONE</Text>
        </View>
      )}
    </Pressable>
  );
}

// ─── Main Screen ────────────────────────────────────────────────────────────

export default function ProgressScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const weeks = getWeeks();
  const [activeWeek, setActiveWeek] = useState(weeks.length - 1);
  const [measurements, setMeasurements] = useState<Measurements>({
    arms: "", chest: "", stomach: "", hips: "", thighs: "", calves: "",
  });
  const [photos, setPhotos] = useState({ front: false, side: false, back: false });

  const updateMeasurement = (key: keyof Measurements, value: string) => {
    setMeasurements((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    Alert.alert("Saved", "Your progress has been recorded for this week.");
  };

  const handlePhoto = (type: "front" | "side" | "back") => {
    // In production, this would open the camera
    setPhotos((prev) => ({ ...prev, [type]: true }));
    Alert.alert("Camera", `Take your ${type} photo. (Camera integration coming soon)`);
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

        {/* Progress Photos */}
        <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: colors.textPrimary, marginBottom: 12 }}>Weekly Photos</Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <PhotoSlot label="Front" taken={photos.front} onPress={() => handlePhoto("front")} />
            <PhotoSlot label="Side" taken={photos.side} onPress={() => handlePhoto("side")} />
            <PhotoSlot label="Back" taken={photos.back} onPress={() => handlePhoto("back")} />
          </View>
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
            <MeasurementRow label="Arms" value={measurements.arms} onChange={(v) => updateMeasurement("arms", v)} />
            <MeasurementRow label="Chest" value={measurements.chest} onChange={(v) => updateMeasurement("chest", v)} />
            <MeasurementRow label="Stomach" value={measurements.stomach} onChange={(v) => updateMeasurement("stomach", v)} />
            <MeasurementRow label="Hips" value={measurements.hips} onChange={(v) => updateMeasurement("hips", v)} />
            <MeasurementRow label="Thighs" value={measurements.thighs} onChange={(v) => updateMeasurement("thighs", v)} />
            <MeasurementRow label="Calves" value={measurements.calves} onChange={(v) => updateMeasurement("calves", v)} previousValue={undefined} />
          </View>
        </View>

        {/* Save Button */}
        <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
          <Pressable
            onPress={handleSave}
            style={({ pressed }) => ({
              backgroundColor: colors.primary,
              borderRadius: 16,
              paddingVertical: 16,
              alignItems: "center",
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#0b1120" }}>Save This Week</Text>
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
                <Text style={{ fontSize: 18 }}>🤖</Text>
              </View>
              <View>
                <Text style={{ fontSize: 14, fontWeight: "700", color: colors.primary }}>GlucoBot Coach</Text>
                <Text style={{ fontSize: 11, color: colors.textSecondary }}>Weekly Summary</Text>
              </View>
            </View>
            <Text style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 20 }}>
              Great work tracking your progress! Consistency is key — taking weekly measurements and photos helps you see changes that the scale can't show. Keep logging your meals and staying active. You're building habits that will serve you for life. 💪
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
