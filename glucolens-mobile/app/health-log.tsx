/**
 * Glucose Tracker screen
 *
 * Dual functionality:
 *  1. Blood Glucose Log — manual BGL readings with timestamp, meal context, notes
 *  2. Weight Log         — bodyweight entries over time
 *
 * Charts rendered with Victory Native (line + scatter).
 * Segmented tabs switch between the two trackers.
 * Delete functionality with swipe-to-delete or long-press.
 */

import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  PanResponder,
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { colors, radius, shadow } from "@/constants/tokens";
import { LineChart } from "react-native-chart-kit";
import { Dimensions } from "react-native";
import { Plus, Droplets, Scale, TrendingDown, TrendingUp, Minus, Trash2 } from "lucide-react-native";
import { format } from "date-fns";
import * as Haptics from "expo-haptics";

const SCREEN_W = Dimensions.get("window").width;
const CHART_W = SCREEN_W - 40;

const chartConfig = {
  backgroundGradientFrom: colors.card,
  backgroundGradientTo: colors.card,
  color: (opacity = 1) => `rgba(20,184,166,${opacity})`,
  labelColor: () => colors.textSecondary,
  strokeWidth: 2,
  propsForDots: { r: "3", strokeWidth: "2", stroke: colors.primary },
  propsForBackgroundLines: { stroke: colors.border, strokeDasharray: "3,3" },
};

type Tracker = "glucose" | "weight";

// ─── Range badge ─────────────────────────────────────────────────────────────

function bglStatus(mmol: number): { label: string; color: string; bg: string } {
  if (mmol < 3.9) return { label: "Low", color: colors.risky, bg: colors.riskyBg };
  if (mmol <= 7.8) return { label: "Normal", color: colors.safe, bg: colors.safeBg };
  if (mmol <= 11.0) return { label: "High", color: colors.moderate, bg: colors.moderateBg };
  return { label: "Very High", color: colors.risky, bg: colors.riskyBg };
}

// ─── Stat tile ───────────────────────────────────────────────────────────────

function StatTile({ label, value, unit, trend }: { label: string; value: string; unit: string; trend?: "up" | "down" | "flat" }) {
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor = trend === "down" ? colors.safe : trend === "up" ? colors.risky : colors.textSecondary;
  return (
    <View style={{
      flex: 1,
      backgroundColor: colors.glass,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      borderRadius: radius.lg,
      padding: 14,
      ...shadow.card,
    }}>
      <Text style={{ fontSize: 11, color: colors.textSecondary, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.4 }}>
        {label}
      </Text>
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 4, marginTop: 6 }}>
        <Text style={{ fontSize: 22, fontWeight: "800", color: colors.textPrimary }}>{value}</Text>
        <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 2 }}>{unit}</Text>
      </View>
      {trend && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
          <TrendIcon size={12} color={trendColor} />
          <Text style={{ fontSize: 11, color: trendColor, fontWeight: "600" }}>
            vs last week
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── Log entry row ───────────────────────────────────────────────────────────

function GlucoseRow({ entry, onDelete }: { entry: { id: number; valueMmol: number; readingType: string; recordedAt: string; notes?: string | null }; onDelete: (id: number) => void }) {
  const s = bglStatus(entry.valueMmol);
  const [showDelete, setShowDelete] = useState(false);
  const panX = useRef(new Animated.Value(0)).current;
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, { dx }) => Math.abs(dx) > 5,
      onPanResponderMove: (_, { dx }) => {
        if (dx < 0) {
          panX.setValue(Math.max(dx, -80));
        }
      },
      onPanResponderRelease: (_, { dx, vx }) => {
        if (dx < -40 || vx < -0.5) {
          Animated.timing(panX, { toValue: -80, duration: 300, useNativeDriver: false }).start(() => setShowDelete(true));
        } else {
          Animated.timing(panX, { toValue: 0, duration: 300, useNativeDriver: false }).start();
        }
      },
    })
  ).current;

  const handleLongPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      "Delete Reading",
      `Remove this ${entry.valueMmol.toFixed(1)} mmol/L reading?`,
      [
        { text: "Cancel", onPress: () => {} },
        {
          text: "Delete",
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onDelete(entry.id);
          },
          style: "destructive",
        },
      ]
    );
  };

  return (
    <Animated.View style={{ transform: [{ translateX: panX }], marginBottom: 8 }} {...panResponder.panHandlers}>
      <Pressable onLongPress={handleLongPress} style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.card,
        borderRadius: radius.md,
        padding: 12,
        gap: 12,
        ...shadow.card,
      }}>
        <View style={{
          width: 42, height: 42, borderRadius: 12,
          backgroundColor: s.bg,
          alignItems: "center", justifyContent: "center",
        }}>
          <Droplets size={18} color={s.color} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={{ fontSize: 16, fontWeight: "800", color: colors.textPrimary }}>
              {entry.valueMmol.toFixed(1)}
            </Text>
            <Text style={{ fontSize: 13, color: colors.textSecondary }}>mmol/L</Text>
            <View style={{ backgroundColor: s.bg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
              <Text style={{ fontSize: 10, fontWeight: "700", color: s.color }}>{s.label}</Text>
            </View>
          </View>
          <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 1 }}>
            {entry.readingType} · {format(new Date(entry.recordedAt), "d MMM, h:mm a")}
          </Text>
          {entry.notes ? (
            <Text style={{ fontSize: 12, color: colors.textSecondary, fontStyle: "italic", marginTop: 2 }} numberOfLines={1}>
              {entry.notes}
            </Text>
          ) : null}
        </View>
      </Pressable>
      {showDelete && (
        <Pressable
          onPress={() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onDelete(entry.id);
          }}
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            bottom: 0,
            width: 80,
            backgroundColor: colors.risky,
            borderRadius: radius.md,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Trash2 size={20} color="#fff" />
        </Pressable>
      )}
    </Animated.View>
  );
}

function WeightRow({ entry, onDelete }: { entry: { id: number; weightKg: number; recordedAt: string; notes?: string | null }; onDelete: (id: number) => void }) {
  const [showDelete, setShowDelete] = useState(false);
  const panX = useRef(new Animated.Value(0)).current;
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, { dx }) => Math.abs(dx) > 5,
      onPanResponderMove: (_, { dx }) => {
        if (dx < 0) {
          panX.setValue(Math.max(dx, -80));
        }
      },
      onPanResponderRelease: (_, { dx, vx }) => {
        if (dx < -40 || vx < -0.5) {
          Animated.timing(panX, { toValue: -80, duration: 300, useNativeDriver: false }).start(() => setShowDelete(true));
        } else {
          Animated.timing(panX, { toValue: 0, duration: 300, useNativeDriver: false }).start();
        }
      },
    })
  ).current;

  const handleLongPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      "Delete Entry",
      `Remove this ${entry.weightKg.toFixed(1)} kg entry?`,
      [
        { text: "Cancel", onPress: () => {} },
        {
          text: "Delete",
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onDelete(entry.id);
          },
          style: "destructive",
        },
      ]
    );
  };

  return (
    <Animated.View style={{ transform: [{ translateX: panX }], marginBottom: 8 }} {...panResponder.panHandlers}>
      <Pressable onLongPress={handleLongPress} style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.card,
        borderRadius: radius.md,
        padding: 12,
        gap: 12,
        ...shadow.card,
      }}>
        <View style={{
          width: 42, height: 42, borderRadius: 12,
          backgroundColor: colors.primaryLight,
          alignItems: "center", justifyContent: "center",
        }}>
          <Scale size={18} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={{ fontSize: 16, fontWeight: "800", color: colors.textPrimary }}>
              {entry.weightKg.toFixed(1)}
            </Text>
            <Text style={{ fontSize: 13, color: colors.textSecondary }}>kg</Text>
          </View>
          <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 1 }}>
            {format(new Date(entry.recordedAt), "d MMM yyyy, h:mm a")}
          </Text>
          {entry.notes ? (
            <Text style={{ fontSize: 12, color: colors.textSecondary, fontStyle: "italic", marginTop: 2 }} numberOfLines={1}>
              {entry.notes}
            </Text>
          ) : null}
        </View>
      </Pressable>
      {showDelete && (
        <Pressable
          onPress={() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onDelete(entry.id);
          }}
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            bottom: 0,
            width: 80,
            backgroundColor: colors.risky,
            borderRadius: radius.md,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Trash2 size={20} color="#fff" />
        </Pressable>
      )}
    </Animated.View>
  );
}

// ─── Add reading modal ───────────────────────────────────────────────────────

function AddGlucoseModal({ visible, onClose, onSave }: {
  visible: boolean;
  onClose: () => void;
  onSave: (data: { valueMmol: number; readingType: string; notes?: string }) => void;
}) {
  const [value, setValue] = useState("");
  const [readingType, setReadingType] = useState("fasting");
  const [notes, setNotes] = useState("");
  const types = ["fasting", "pre-meal", "post-meal", "bedtime", "random"];

  const submit = () => {
    const n = parseFloat(value);
    if (isNaN(n) || n < 1 || n > 33.3) {
      Alert.alert("Invalid value", "Please enter a value between 1.0 and 33.3 mmol/L");
      return;
    }
    onSave({ valueMmol: n, readingType, notes: notes.trim() || undefined });
    setValue(""); setNotes("");
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1, justifyContent: "flex-end" }}
        >
          <View style={{
            backgroundColor: colors.card,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 24,
            paddingBottom: 40,
            gap: 16,
            borderWidth: 1,
            borderColor: colors.border,
          }}>
            <Text style={{ fontSize: 18, fontWeight: "800", color: colors.textPrimary }}>
              Log Blood Glucose
            </Text>

            <View>
              <Text style={{ fontSize: 13, fontWeight: "600", color: colors.textSecondary, marginBottom: 6 }}>
                Reading (mmol/L)
              </Text>
              <TextInput
                value={value}
                onChangeText={setValue}
                placeholder="e.g. 5.6"
                placeholderTextColor={colors.textSecondary}
                keyboardType="decimal-pad"
                style={{
                  backgroundColor: colors.cardAlt,
                  borderRadius: radius.md,
                  padding: 14,
                  fontSize: 20,
                  fontWeight: "700",
                  color: colors.textPrimary,
                  borderWidth: 1.5,
                  borderColor: value ? colors.primary : colors.border,
                }}
              />
            </View>

            <View>
              <Text style={{ fontSize: 13, fontWeight: "600", color: colors.textSecondary, marginBottom: 8 }}>
                Reading type
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4 }}>
                <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 4 }}>
                  {types.map((t) => (
                    <Pressable
                      key={t}
                      onPress={() => { Haptics.selectionAsync(); setReadingType(t); }}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: 20,
                        backgroundColor: readingType === t ? colors.primary : colors.cardAlt,
                        borderWidth: 1,
                        borderColor: readingType === t ? colors.primary : colors.border,
                      }}
                    >
                      <Text style={{
                        fontSize: 13,
                        fontWeight: "600",
                        color: readingType === t ? "#fff" : colors.textSecondary,
                        textTransform: "capitalize",
                      }}>
                        {t}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View>
              <Text style={{ fontSize: 13, fontWeight: "600", color: colors.textSecondary, marginBottom: 6 }}>
                Notes (optional)
              </Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="After dinner, felt tired..."
                placeholderTextColor={colors.textSecondary}
                style={{
                  backgroundColor: colors.cardAlt,
                  borderRadius: radius.md,
                  padding: 12,
                  fontSize: 14,
                  color: colors.textPrimary,
                  borderWidth: 1,
                  borderColor: colors.border,
                  minHeight: 80,
                  textAlignVertical: "top",
                }}
                multiline
              />
            </View>

            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable
                onPress={onClose}
                style={{ flex: 1, height: 50, borderRadius: radius.lg, alignItems: "center", justifyContent: "center", backgroundColor: colors.cardAlt, borderWidth: 1, borderColor: colors.border }}
              >
                <Text style={{ fontWeight: "700", color: colors.textSecondary }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={submit}
                style={({ pressed }) => ({ flex: 2, height: 50, borderRadius: radius.lg, alignItems: "center", justifyContent: "center", backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1, shadowColor: colors.primary, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 })}
              >
                <Text style={{ fontWeight: "700", color: "#fff", fontSize: 15 }}>Save Reading</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function AddWeightModal({ visible, onClose, onSave }: {
  visible: boolean;
  onClose: () => void;
  onSave: (data: { weightKg: number; notes?: string }) => void;
}) {
  const [value, setValue] = useState("");
  const [notes, setNotes] = useState("");

  const submit = () => {
    const n = parseFloat(value);
    if (isNaN(n) || n < 20 || n > 500) {
      Alert.alert("Invalid value", "Please enter a valid weight in kg.");
      return;
    }
    onSave({ weightKg: n, notes: notes.trim() || undefined });
    setValue(""); setNotes("");
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1, justifyContent: "flex-end" }}
        >
          <View style={{
            backgroundColor: colors.card,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 24,
            paddingBottom: 40,
            gap: 16,
            borderWidth: 1,
            borderColor: colors.border,
          }}>
            <Text style={{ fontSize: 18, fontWeight: "800", color: colors.textPrimary }}>
              Log Weight
            </Text>

            <View>
              <Text style={{ fontSize: 13, fontWeight: "600", color: colors.textSecondary, marginBottom: 6 }}>
                Weight (kg)
              </Text>
              <TextInput
                value={value}
                onChangeText={setValue}
                placeholder="e.g. 82.5"
                placeholderTextColor={colors.textSecondary}
                keyboardType="decimal-pad"
                style={{
                  backgroundColor: colors.cardAlt,
                  borderRadius: radius.md,
                  padding: 14,
                  fontSize: 20,
                  fontWeight: "700",
                  color: colors.textPrimary,
                  borderWidth: 1.5,
                  borderColor: value ? colors.primary : colors.border,
                }}
              />
            </View>

            <View>
              <Text style={{ fontSize: 13, fontWeight: "600", color: colors.textSecondary, marginBottom: 6 }}>
                Notes (optional)
              </Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Morning weigh-in, after workout..."
                placeholderTextColor={colors.textSecondary}
                style={{
                  backgroundColor: colors.cardAlt,
                  borderRadius: radius.md,
                  padding: 12,
                  fontSize: 14,
                  color: colors.textPrimary,
                  borderWidth: 1,
                  borderColor: colors.border,
                  minHeight: 80,
                  textAlignVertical: "top",
                }}
                multiline
              />
            </View>

            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable
                onPress={onClose}
                style={{ flex: 1, height: 50, borderRadius: radius.lg, alignItems: "center", justifyContent: "center", backgroundColor: colors.cardAlt, borderWidth: 1, borderColor: colors.border }}
              >
                <Text style={{ fontWeight: "700", color: colors.textSecondary }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={submit}
                style={({ pressed }) => ({ flex: 2, height: 50, borderRadius: radius.lg, alignItems: "center", justifyContent: "center", backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1, shadowColor: colors.primary, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 })}
              >
                <Text style={{ fontWeight: "700", color: "#fff", fontSize: 15 }}>Save Weight</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function GlucoseScreen() {
  const insets = useSafeAreaInsets();
  const [tracker, setTracker] = useState<Tracker>("glucose");
  const [addGlucoseOpen, setAddGlucoseOpen] = useState(false);
  const [addWeightOpen, setAddWeightOpen] = useState(false);

  const { data: glucoseLogs, refetch: refetchGlucose, isLoading: glucoseLoading } =
    trpc.glucose.list.useQuery({ limit: 30 });

  const { data: weightLogs, refetch: refetchWeight, isLoading: weightLoading } =
    trpc.weight.list.useQuery({ limit: 30 });

  const addGlucoseMutation = trpc.glucose.add.useMutation({
    onSuccess: () => { refetchGlucose(); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); },
    onError: (e) => Alert.alert("Error", e.message),
  });

  const addWeightMutation = trpc.weight.add.useMutation({
    onSuccess: () => { refetchWeight(); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); },
    onError: (e) => Alert.alert("Error", e.message),
  });

  const deleteGlucoseMutation = trpc.glucose.delete.useMutation({
    onSuccess: () => { refetchGlucose(); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); },
    onError: (e) => Alert.alert("Error", e.message),
  });

  const deleteWeightMutation = trpc.weight.delete.useMutation({
    onSuccess: () => { refetchWeight(); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); },
    onError: (e) => Alert.alert("Error", e.message),
  });

  // Chart data
  const glucosePoints = (glucoseLogs ?? []).slice(0, 20).reverse();
  const weightPoints  = (weightLogs  ?? []).slice(0, 20).reverse();
  const glucoseChartData = { labels: glucosePoints.map(() => ""), datasets: [{ data: glucosePoints.length > 0 ? glucosePoints.map(e => e.valueMmol) : [0] }] };
  const weightChartData  = { labels: weightPoints.map(() => ""),  datasets: [{ data: weightPoints.length > 0  ? weightPoints.map(e => e.weightKg)  : [0] }] };

  // Stats
  const recentGlucose = glucoseLogs?.[0]?.valueMmol;
  const avgGlucose = glucoseLogs && glucoseLogs.length > 0
    ? glucoseLogs.slice(0, 7).reduce((s, e) => s + e.valueMmol, 0) / Math.min(glucoseLogs.length, 7)
    : null;
  const recentWeight = weightLogs?.[0]?.weightKg;
  const prevWeight = weightLogs?.[1]?.weightKg;
  const weightTrend = recentWeight && prevWeight
    ? recentWeight > prevWeight ? "up" : recentWeight < prevWeight ? "down" : "flat"
    : undefined;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AddGlucoseModal
        visible={addGlucoseOpen}
        onClose={() => setAddGlucoseOpen(false)}
        onSave={(d) => addGlucoseMutation.mutate(d)}
      />
      <AddWeightModal
        visible={addWeightOpen}
        onClose={() => setAddWeightOpen(false)}
        onSave={(d) => addWeightMutation.mutate(d)}
      />

      {/* Header */}
      <View style={{
        paddingTop: insets.top + 16,
        paddingHorizontal: 20,
        paddingBottom: 16,
        backgroundColor: colors.primary,
      }}>
        <Text style={{ fontSize: 26, fontWeight: "800", color: "#fff" }}>Health Log</Text>

        {/* Tab toggle */}
        <View style={{
          flexDirection: "row",
          backgroundColor: colors.glass,
          borderWidth: 1,
          borderColor: colors.glassBorder,
          borderRadius: radius.lg,
          marginTop: 14,
          padding: 4,
        }}>
          {([["glucose", "Blood Glucose", Droplets], ["weight", "Weight", Scale]] as const).map(([key, label, Icon]) => (
            <Pressable
              key={key}
              onPress={() => { Haptics.selectionAsync(); setTracker(key); }}
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                paddingVertical: 8,
                borderRadius: 10,
                backgroundColor: tracker === key ? colors.primary : "transparent",
              }}
            >
              <Icon size={14} color={tracker === key ? "#fff" : "rgba(255,255,255,0.6)"} />
              <Text style={{
                fontSize: 13,
                fontWeight: "700",
                color: tracker === key ? "#fff" : "rgba(255,255,255,0.6)",
              }}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {tracker === "glucose" ? (
          <>
            {/* Stats row */}
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
              <StatTile
                label="Latest"
                value={recentGlucose ? recentGlucose.toFixed(1) : "—"}
                unit="mmol/L"
              />
              <StatTile
                label="7-Day Avg"
                value={avgGlucose ? avgGlucose.toFixed(1) : "—"}
                unit="mmol/L"
              />
            </View>

            {/* Chart */}
            {glucosePoints.length > 1 && (
              <View style={{ backgroundColor: colors.card, borderRadius: radius.lg, paddingTop: 12, marginBottom: 16, overflow: "hidden", ...shadow.card }}>
                <Text style={{ paddingHorizontal: 16, fontSize: 13, fontWeight: "700", color: colors.textSecondary, marginBottom: 4 }}>
                  Last {glucosePoints.length} Readings
                </Text>
                <LineChart data={glucoseChartData} width={CHART_W} height={160} chartConfig={chartConfig} bezier withDots withInnerLines withOuterLines={false} withVerticalLabels={false} style={{ borderRadius: radius.lg }} />
              </View>
            )}

            {/* Add button */}
            <Pressable
              onPress={() => setAddGlucoseOpen(true)}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                height: 50,
                borderRadius: radius.lg,
                backgroundColor: colors.primary,
                marginBottom: 16,
                opacity: pressed ? 0.85 : 1,
                shadowColor: colors.primary,
                shadowOpacity: 0.4,
                shadowRadius: 12,
                elevation: 8,
              })}
            >
              <Plus size={18} color="#fff" />
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>Log Reading</Text>
            </Pressable>

            {/* List */}
            {glucoseLoading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (glucoseLogs ?? []).length === 0 ? (
              <View style={{ alignItems: "center", paddingTop: 20 }}>
                <Droplets size={40} color={colors.border} />
                <Text style={{ marginTop: 12, color: colors.textSecondary, textAlign: "center" }}>
                  No readings yet.{"\n"}Log your first blood glucose reading above.
                </Text>
              </View>
            ) : (
              (glucoseLogs ?? []).map((e) => (
                <GlucoseRow
                  key={e.id}
                  entry={e as any}
                  onDelete={(id) => deleteGlucoseMutation.mutate({ id })}
                />
              ))
            )}
          </>
        ) : (
          <>
            {/* Weight stats */}
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
              <StatTile
                label="Latest"
                value={recentWeight ? recentWeight.toFixed(1) : "—"}
                unit="kg"
                trend={weightTrend}
              />
              <StatTile
                label="Logged"
                value={String(weightLogs?.length ?? 0)}
                unit="entries"
              />
            </View>

            {/* Chart */}
            {weightPoints.length > 1 && (
              <View style={{ backgroundColor: colors.card, borderRadius: radius.lg, paddingTop: 12, marginBottom: 16, overflow: "hidden", ...shadow.card }}>
                <Text style={{ paddingHorizontal: 16, fontSize: 13, fontWeight: "700", color: colors.textSecondary, marginBottom: 4 }}>Weight Trend</Text>
                <LineChart data={weightChartData} width={CHART_W} height={160} chartConfig={chartConfig} bezier withDots withInnerLines withOuterLines={false} withVerticalLabels={false} style={{ borderRadius: radius.lg }} />
              </View>
            )}

            {/* Add button */}
            <Pressable
              onPress={() => setAddWeightOpen(true)}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                height: 50,
                borderRadius: radius.lg,
                backgroundColor: colors.primary,
                marginBottom: 16,
                opacity: pressed ? 0.85 : 1,
                shadowColor: colors.primary,
                shadowOpacity: 0.4,
                shadowRadius: 12,
                elevation: 8,
              })}
            >
              <Plus size={18} color="#fff" />
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>Log Weight</Text>
            </Pressable>

            {/* List */}
            {weightLoading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (weightLogs ?? []).length === 0 ? (
              <View style={{ alignItems: "center", paddingTop: 20 }}>
                <Scale size={40} color={colors.border} />
                <Text style={{ marginTop: 12, color: colors.textSecondary, textAlign: "center" }}>
                  No weight entries yet.{"\n"}Log your first weigh-in above.
                </Text>
              </View>
            ) : (
              (weightLogs ?? []).map((e) => (
                <WeightRow
                  key={e.id}
                  entry={e as any}
                  onDelete={(id) => deleteWeightMutation.mutate({ id })}
                />
              ))
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
