/**
 * Reminders tab screen
 *
 * Manage meal and water reminder notifications from the bottom tab bar.
 * Each reminder has: type (meal/water), label, time (HH:MM), enabled toggle.
 */

import {
  View,
  Text,
  ScrollView,
  Pressable,
  Switch,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { colors, radius, shadow } from "@/constants/tokens";
import {
  Plus,
  Trash2,
  Bell,
  Droplets,
  Sunrise,
  UtensilsCrossed,
  Moon,
  RotateCcw,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";

// Stub notifications (swap for real impl in dev build)
const Notifications = {
  requestPermissionsAsync: async () => ({ status: "granted" }),
  scheduleNotificationAsync: async (_: any) => "stub-id",
  cancelScheduledNotificationAsync: async (_: string) => {},
  setNotificationHandler: (_: any) => {},
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function requestNotificationPermission(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

function parseTime(hhmm: string | null | undefined): { hour: number; minute: number } {
  if (!hhmm || typeof hhmm !== "string") return { hour: 8, minute: 0 };
  const parts = hhmm.split(":");
  const [h, m] = parts.map(Number);
  return { hour: h ?? 8, minute: m ?? 0 };
}

async function scheduleReminder(label: string, time: string) {
  const { hour, minute } = parseTime(time);
  await Notifications.scheduleNotificationAsync({
    content: { title: "GlucoLens Reminder", body: label, sound: true },
    trigger: { hour, minute, repeats: true },
  });
}

// ─── Time input ──────────────────────────────────────────────────────────────

function TimeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [raw, setRaw] = useState(value);

  const handleChange = (text: string) => {
    const cleaned = text.replace(/[^0-9:]/g, "").slice(0, 5);
    setRaw(cleaned);
    if (/^\d{2}:\d{2}$/.test(cleaned)) {
      const [h, m] = cleaned.split(":").map(Number);
      if (h < 24 && m < 60) onChange(cleaned);
    }
  };

  return (
    <TextInput
      value={raw}
      onChangeText={handleChange}
      placeholder="08:00"
      keyboardType="numbers-and-punctuation"
      style={{
        backgroundColor: colors.background,
        borderRadius: radius.md,
        padding: 12,
        fontSize: 20,
        fontWeight: "700",
        color: colors.textPrimary,
        textAlign: "center",
        borderWidth: 1.5,
        borderColor: /^\d{2}:\d{2}$/.test(raw) ? colors.primary : colors.border,
        width: 100,
      }}
    />
  );
}

// ─── Add reminder modal ──────────────────────────────────────────────────────

function AddReminderModal({
  visible,
  onClose,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (data: { type: "meal" | "water"; label: string; time: string }) => void;
}) {
  const [type, setType] = useState<"meal" | "water">("meal");
  const [label, setLabel] = useState("");
  const [time, setTime] = useState("08:00");

  const mealPresets: { label: string; time: string }[] = [
    { label: "Breakfast", time: "07:30" },
    { label: "Lunch", time: "12:30" },
    { label: "Dinner", time: "18:30" },
    { label: "Snack", time: "15:00" },
    { label: "Pre-Meal Check", time: "07:00" },
  ];
  const waterPresets: { label: string; time: string }[] = [
    { label: "Morning Water", time: "08:00" },
    { label: "Midday Water", time: "12:00" },
    { label: "Evening Water", time: "18:00" },
  ];
  const presets = type === "meal" ? mealPresets : waterPresets;

  const submit = () => {
    if (!label.trim()) {
      Alert.alert("Label required", "Please enter a reminder label.");
      return;
    }
    if (!/^\d{2}:\d{2}$/.test(time)) {
      Alert.alert("Invalid time", "Please enter a valid time in HH:MM format.");
      return;
    }
    onSave({ type, label: label.trim(), time });
    setLabel("");
    setTime("08:00");
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: colors.overlay }}>
          <View
            style={{
              backgroundColor: colors.card,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 24,
              paddingBottom: 40,
              gap: 16,
              borderTopWidth: 1,
              borderTopColor: colors.border,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: "800", color: colors.textPrimary }}>
              New Reminder
            </Text>

            {/* Type selector */}
            <View style={{ flexDirection: "row", gap: 10 }}>
              {(["meal", "water"] as const).map((t) => (
                <Pressable
                  key={t}
                  onPress={() => { Haptics.selectionAsync(); setType(t); setLabel(""); }}
                  style={{
                    flex: 1,
                    height: 44,
                    borderRadius: radius.md,
                    backgroundColor: type === t ? colors.primary : colors.background,
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "row",
                    gap: 6,
                    borderWidth: 1.5,
                    borderColor: type === t ? colors.primary : colors.border,
                  }}
                >
                  {t === "meal" ? (
                    <UtensilsCrossed size={14} color={type === t ? "#fff" : colors.textSecondary} />
                  ) : (
                    <Droplets size={14} color={type === t ? "#fff" : colors.textSecondary} />
                  )}
                  <Text
                    style={{
                      fontWeight: "700",
                      color: type === t ? "#fff" : colors.textSecondary,
                      textTransform: "capitalize",
                    }}
                  >
                    {t}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Presets */}
            <View>
              <Text style={{ fontSize: 12, fontWeight: "600", color: colors.textSecondary, marginBottom: 8 }}>
                Quick pick:
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {presets.map((p) => (
                    <Pressable
                      key={p.label}
                      onPress={() => { Haptics.selectionAsync(); setLabel(p.label); setTime(p.time); }}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 20,
                        backgroundColor: label === p.label ? colors.primaryLight : colors.background,
                        borderWidth: 1,
                        borderColor: label === p.label ? colors.primary : colors.border,
                      }}
                    >
                      <Text style={{ fontSize: 13, color: label === p.label ? colors.primary : colors.textSecondary, fontWeight: "600" }}>
                        {p.label} · {p.time}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Custom label */}
            <TextInput
              value={label}
              onChangeText={setLabel}
              placeholder="Custom label..."
              placeholderTextColor={colors.textSecondary}
              style={{
                backgroundColor: colors.background,
                borderRadius: radius.md,
                padding: 12,
                fontSize: 15,
                color: colors.textPrimary,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            />

            {/* Time */}
            <View>
              <Text style={{ fontSize: 12, fontWeight: "600", color: colors.textSecondary, marginBottom: 8 }}>
                Reminder time (24h format):
              </Text>
              <View style={{ flexDirection: "row", justifyContent: "center" }}>
                <TimeInput value={time} onChange={setTime} />
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
              <Pressable
                onPress={onClose}
                style={{
                  flex: 1, height: 48, borderRadius: radius.lg,
                  alignItems: "center", justifyContent: "center",
                  backgroundColor: colors.background,
                  borderWidth: 1, borderColor: colors.border,
                }}
              >
                <Text style={{ fontWeight: "700", color: colors.textSecondary }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={submit}
                style={({ pressed }) => ({
                  flex: 2, height: 48, borderRadius: radius.lg,
                  alignItems: "center", justifyContent: "center",
                  backgroundColor: colors.primary,
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <Text style={{ fontWeight: "700", color: "#fff", fontSize: 15 }}>Add Reminder</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

const DEFAULT_REMINDERS = [
  { type: "meal" as const, label: "Breakfast", time: "07:30" },
  { type: "meal" as const, label: "Lunch", time: "12:30" },
  { type: "meal" as const, label: "Dinner", time: "18:30" },
  { type: "water" as const, label: "Morning Water", time: "08:00" },
  { type: "water" as const, label: "Midday Water", time: "12:00" },
  { type: "water" as const, label: "Evening Water", time: "18:00" },
];

export default function RemindersTabScreen() {
  const insets = useSafeAreaInsets();
  const [addOpen, setAddOpen] = useState(false);

  const { data: reminders, refetch, isLoading } = trpc.reminders.list.useQuery();

  const addMutation = trpc.reminders.add.useMutation({
    onSuccess: async (newReminder: any) => {
      refetch();
      const granted = await requestNotificationPermission();
      if (granted) await scheduleReminder(newReminder.label, newReminder.time);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (e) => Alert.alert("Error", e.message),
  });

  const toggleMutation = trpc.reminders.toggle.useMutation({
    onSuccess: () => refetch(),
  });

  const deleteMutation = trpc.reminders.delete.useMutation({
    onSuccess: () => {
      refetch();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    },
    onError: (e) => Alert.alert("Error", e.message),
  });

  const handleDelete = (id: number, label: string) => {
    Alert.alert("Delete reminder", `Remove "${label}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate({ id }) },
    ]);
  };

  const handleResetDefaults = () => {
    Alert.alert(
      "Reset to defaults",
      "This will delete all existing reminders and create the suggested set. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            // Delete all existing
            for (const r of (reminders ?? []) as any[]) {
              await deleteMutation.mutateAsync({ id: r.id }).catch(() => {});
            }
            // Add defaults
            for (const d of DEFAULT_REMINDERS) {
              await addMutation.mutateAsync(d).catch(() => {});
            }
            refetch();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  const mealReminders = (reminders ?? []).filter((r: any) => r.type === "meal");
  const waterReminders = (reminders ?? []).filter((r: any) => r.type === "water");

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AddReminderModal
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        onSave={(data) => addMutation.mutate(data)}
      />

      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 12,
          paddingHorizontal: 20,
          paddingBottom: 16,
          backgroundColor: colors.card,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <View>
          <Text style={{ fontSize: 24, fontWeight: "800", color: colors.textPrimary }}>
            Reminders
          </Text>
          <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>
            Stay on track with meals & water
          </Text>
        </View>
        <Pressable
          onPress={() => setAddOpen(true)}
          style={({ pressed }) => ({
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.primary,
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.8 : 1,
            ...shadow.button,
          })}
        >
          <Plus size={20} color="#fff" />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : (reminders ?? []).length === 0 ? (
          <View style={{ alignItems: "center", paddingTop: 60, gap: 12 }}>
            <Bell size={40} color={colors.border} />
            <Text style={{ fontSize: 16, fontWeight: "700", color: colors.textPrimary, textAlign: "center" }}>
              No reminders yet
            </Text>
            <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: "center", lineHeight: 20 }}>
              Add reminders for meals and water to stay on track with your diabetes management.
            </Text>
            <Pressable
              onPress={() => setAddOpen(true)}
              style={({ pressed }) => ({
                backgroundColor: colors.primary,
                paddingHorizontal: 28,
                paddingVertical: 12,
                borderRadius: 14,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Plus size={16} color="#fff" />
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>Add Reminder</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {[
              { title: "Meal Reminders", icon: <UtensilsCrossed size={14} color={colors.primary} />, items: mealReminders },
              { title: "Water Reminders", icon: <Droplets size={14} color={colors.primary} />, items: waterReminders },
            ]
              .filter(({ items }) => items.length > 0)
              .map(({ title, icon, items }) => (
                <View key={title} style={{ marginBottom: 20 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 }}>
                    {icon}
                    <Text style={{
                      fontSize: 13, fontWeight: "700", color: colors.textSecondary,
                      textTransform: "uppercase", letterSpacing: 0.5,
                    }}>
                      {title}
                    </Text>
                  </View>

                  {items.map((r: any) => (
                    <View
                      key={r.id}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        backgroundColor: colors.card,
                        borderRadius: radius.lg,
                        padding: 14,
                        marginBottom: 8,
                        gap: 12,
                        borderWidth: 1,
                        borderColor: colors.border,
                        ...shadow.card,
                        opacity: r.enabled ? 1 : 0.55,
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 15, fontWeight: "700", color: colors.textPrimary }}>
                          {r.label}
                        </Text>
                        <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>
                          {r.time} daily
                        </Text>
                      </View>
                      <Switch
                        value={!!r.enabled}
                        onValueChange={() => {
                          Haptics.selectionAsync();
                          toggleMutation.mutate({ id: r.id, enabled: !r.enabled });
                        }}
                        trackColor={{ false: colors.border, true: colors.primary }}
                        thumbColor="#fff"
                      />
                      <Pressable onPress={() => handleDelete(r.id, r.label)} style={{ padding: 4 }}>
                        <Trash2 size={16} color={colors.risky} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              ))}

            <Text style={{
              fontSize: 11, color: colors.textSecondary, textAlign: "center",
              marginTop: 8, lineHeight: 16,
            }}>
              Notifications repeat daily at the scheduled time.{"\n"}
              Ensure notifications are enabled in your device settings.
            </Text>

            <Pressable
              onPress={handleResetDefaults}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                marginTop: 16,
                paddingVertical: 10,
                paddingHorizontal: 20,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.background,
                alignSelf: "center",
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <RotateCcw size={14} color={colors.textSecondary} />
              <Text style={{ fontSize: 13, fontWeight: "600", color: colors.textSecondary }}>
                Reset to Suggested Times
              </Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </View>
  );
}
