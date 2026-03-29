/**
 * Profile screen
 *
 * Sections:
 *  - Personal info (name, age, height, weight)
 *  - Diabetes settings (type, activity level, goals)
 *  - Notifications (reminders)
 *  - Data & Privacy (CSV export, delete account)
 *  - Sign out
 */

import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Switch,
  Alert,
  ActivityIndicator,
  Modal,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useProfileStore } from "@/stores/profileStore";
import { supabase } from "@/lib/supabase";
import { colors, radius, shadow } from "@/constants/tokens";
import {
  User,
  Activity,
  Bell,
  Download,
  LogOut,
  ChevronRight,
  CheckCircle2,
  FileText,
  Edit2,
  Save,
  X,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <Text style={{
      fontSize: 11,
      fontWeight: "700",
      color: colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.6,
      marginTop: 24,
      marginBottom: 8,
      paddingHorizontal: 4,
    }}>
      {title}
    </Text>
  );
}

function SettingsRow({
  icon,
  label,
  value,
  onPress,
  danger,
  right,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
  right?: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 14,
        borderRadius: radius.md,
        marginBottom: 8,
        gap: 12,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <View style={{
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: danger ? colors.riskyBg : colors.primaryLight,
        alignItems: "center", justifyContent: "center",
      }}>
        {icon}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: "600", color: danger ? colors.risky : colors.textPrimary }}>
          {label}
        </Text>
        {value && (
          <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 1 }}>{value}</Text>
        )}
      </View>
      {right ?? (onPress && <ChevronRight size={16} color={colors.textSecondary} />)}
    </Pressable>
  );
}

// ─── Diabetes type picker ────────────────────────────────────────────────────

const DIABETES_OPTIONS = [
  { key: "type1", label: "Type 1", desc: "Insulin-dependent" },
  { key: "type2", label: "Type 2", desc: "Non-insulin dependent" },
  { key: "prediabetes", label: "Pre-Diabetes", desc: "At-risk" },
  { key: "unsure", label: "Pre-Diabetes / Unsure", desc: "Use general guidance" },
  { key: "none", label: "Health Conscious", desc: "No diabetes — general wellness" },
];

const ACTIVITY_OPTIONS = [
  { key: "sedentary", label: "Sedentary", desc: "Little or no exercise" },
  { key: "light", label: "Light", desc: "1–3 days/week" },
  { key: "moderate", label: "Moderate", desc: "3–5 days/week" },
  { key: "active", label: "Active", desc: "6–7 days/week" },
  { key: "very_active", label: "Very Active", desc: "Hard exercise daily" },
];

function PickerModal<T extends string>({
  visible,
  title,
  options,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: { key: T; label: string; desc: string }[];
  selected: T;
  onSelect: (k: T) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: colors.overlay }}>
        <View style={{
          backgroundColor: colors.card,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          borderWidth: 1,
          borderColor: colors.border,
          borderBottomWidth: 0,
          padding: 24,
          paddingBottom: 40,
        }}>
          <Text style={{ fontSize: 18, fontWeight: "800", color: colors.textPrimary, marginBottom: 16 }}>
            {title}
          </Text>
          {options.map((opt) => (
            <Pressable
              key={opt.key}
              onPress={() => { Haptics.selectionAsync(); onSelect(opt.key); onClose(); }}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                padding: 14,
                borderRadius: radius.md,
                marginBottom: 8,
                backgroundColor: selected === opt.key ? colors.primaryLight : colors.background,
                borderWidth: 1,
                borderColor: selected === opt.key ? colors.primary : colors.border,
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: "700", color: selected === opt.key ? colors.primary : colors.textPrimary }}>
                  {opt.label}
                </Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 1 }}>{opt.desc}</Text>
              </View>
              {selected === opt.key && <CheckCircle2 size={20} color={colors.primary} />}
            </Pressable>
          ))}
          <Pressable
            onPress={onClose}
            style={{ height: 48, borderRadius: radius.lg, alignItems: "center", justifyContent: "center", backgroundColor: colors.card, marginTop: 4, borderWidth: 1, borderColor: colors.border }}
          >
            <Text style={{ fontWeight: "700", color: colors.textSecondary }}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ─── Goals Edit Modal ────────────────────────────────────────────────────────

function EditGoalsModal({
  visible,
  onClose,
  initialCalories,
  initialCarbs,
  initialSugar,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  initialCalories: number;
  initialCarbs: number;
  initialSugar: number;
  onSave: (calories: number, carbs: number, sugar: number) => void;
}) {
  const [calories, setCalories] = useState(String(initialCalories));
  const [carbs, setCarbs] = useState(String(initialCarbs));
  const [sugar, setSugar] = useState(String(initialSugar));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setCalories(String(initialCalories));
      setCarbs(String(initialCarbs));
      setSugar(String(initialSugar));
    }
  }, [visible, initialCalories, initialCarbs, initialSugar]);

  const handleSave = async () => {
    const cal = parseInt(calories, 10) || initialCalories;
    const carb = parseInt(carbs, 10) || initialCarbs;
    const sug = parseInt(sugar, 10) || initialSugar;

    setSaving(true);
    try {
      await onSave(cal, carb, sug);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: colors.overlay }}>
        <View style={{
          backgroundColor: colors.card,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          borderWidth: 1,
          borderColor: colors.border,
          borderBottomWidth: 0,
          padding: 24,
          paddingBottom: 40,
        }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: "800", color: colors.textPrimary }}>
              Edit Daily Goals
            </Text>
            <Pressable onPress={onClose}>
              <X size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: colors.textSecondary, marginBottom: 6 }}>
              DAILY CALORIES
            </Text>
            <TextInput
              value={calories}
              onChangeText={setCalories}
              keyboardType="number-pad"
              placeholder="e.g., 1800"
              placeholderTextColor={colors.textSecondary}
              style={{
                backgroundColor: colors.background,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: radius.md,
                padding: 12,
                color: colors.textPrimary,
                fontSize: 15,
                fontWeight: "600",
              }}
            />
            <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4 }}>kcal</Text>
          </View>

          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: colors.textSecondary, marginBottom: 6 }}>
              MAX DAILY CARBS
            </Text>
            <TextInput
              value={carbs}
              onChangeText={setCarbs}
              keyboardType="number-pad"
              placeholder="e.g., 200"
              placeholderTextColor={colors.textSecondary}
              style={{
                backgroundColor: colors.background,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: radius.md,
                padding: 12,
                color: colors.textPrimary,
                fontSize: 15,
                fontWeight: "600",
              }}
            />
            <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4 }}>g</Text>
          </View>

          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: colors.textSecondary, marginBottom: 6 }}>
              MAX DAILY SUGAR
            </Text>
            <TextInput
              value={sugar}
              onChangeText={setSugar}
              keyboardType="number-pad"
              placeholder="e.g., 50"
              placeholderTextColor={colors.textSecondary}
              style={{
                backgroundColor: colors.background,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: radius.md,
                padding: 12,
                color: colors.textPrimary,
                fontSize: 15,
                fontWeight: "600",
              }}
            />
            <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4 }}>g</Text>
          </View>

          <View style={{ gap: 8 }}>
            <Pressable
              onPress={handleSave}
              disabled={saving}
              style={({ pressed }) => ({
                height: 48,
                borderRadius: radius.lg,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colors.primary,
                opacity: pressed ? 0.8 : 1,
              })}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={{ fontWeight: "700", color: "#fff", fontSize: 15 }}>Save Goals</Text>
              )}
            </Pressable>
            <Pressable
              onPress={onClose}
              disabled={saving}
              style={({ pressed }) => ({
                height: 48,
                borderRadius: radius.lg,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colors.card,
                borderWidth: 1,
                borderColor: colors.border,
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Text style={{ fontWeight: "700", color: colors.textSecondary, fontSize: 15 }}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const profileStore = useProfileStore();
  const profile = profileStore.profile;

  const [diabetesPickerOpen, setDiabetesPickerOpen] = useState(false);
  const [activityPickerOpen, setActivityPickerOpen] = useState(false);
  const [editGoalsOpen, setEditGoalsOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);

  const { data: reminders } = trpc.reminders.list.useQuery();

  const updateProfileMutation = trpc.profile.upsert.useMutation({
    onSuccess: (data) => profileStore.setProfile(data as any),
    onError: (e) => Alert.alert("Save failed", e.message),
  });

  const { data: goals } = trpc.profile.goals.useQuery();

  const handleSignOut = () => {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          await supabase.auth.signOut();
          // AuthGuard in _layout.tsx will redirect to sign-in
        },
      },
    ]);
  };

  const handleSaveGoals = async (dailyCalories: number, maxCarbs: number, maxSugar: number) => {
    updateProfileMutation.mutate({
      dailyCalorieGoal: dailyCalories,
      maxDailyCarbs: maxCarbs,
      maxDailySugar: maxSugar,
    });
  };

  const exportCsvQuery = trpc.food.exportCsv.useQuery(undefined, { enabled: false });

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        Alert.alert("Not available", "Sharing is not available on this device.");
        return;
      }
      // Use tRPC client to fetch the CSV string (avoids raw fetch + JSON wrapping issues)
      const { data: csvText } = await exportCsvQuery.refetch();
      if (!csvText) {
        Alert.alert("Export failed", "No food log data to export.");
        return;
      }
      const path = (FileSystem.cacheDirectory ?? "") + "glucolens_food_log.csv";
      await FileSystem.writeAsStringAsync(path, csvText);
      await Sharing.shareAsync(path, { mimeType: "text/csv", dialogTitle: "Export Food Log CSV" });
    } catch (e: any) {
      Alert.alert("Export failed", e.message);
    } finally {
      setExporting(false);
    }
  };

  const handleGenerateReport = async () => {
    setGeneratingReport(true);
    try {
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        Alert.alert("Not available", "Sharing is not available on this device.");
        return;
      }
      const result = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/trpc/reports.monthly`,
        { headers: { Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` } }
      );
      const blob = await result.blob();
      const path = FileSystem.cacheDirectory + "glucolens_monthly_report.pdf";
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1];
        await FileSystem.writeAsStringAsync(path, base64, { encoding: FileSystem.EncodingType.Base64 });
        await Sharing.shareAsync(path, { mimeType: "application/pdf", dialogTitle: "Monthly Health Report" });
        setGeneratingReport(false);
      };
      reader.readAsDataURL(blob);
    } catch (e: any) {
      Alert.alert("Report failed", e.message);
      setGeneratingReport(false);
    }
  };

  const diabetesLabel = DIABETES_OPTIONS.find((o) => o.key === profile?.diabetesType)?.label ?? "Not set";
  const activityLabel = ACTIVITY_OPTIONS.find((o) => o.key === profile?.activityLevel)?.label ?? "Not set";

  const initials = [profile?.firstName?.[0], profile?.lastName?.[0]].filter(Boolean).join("").toUpperCase() || "?";

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <PickerModal
        visible={diabetesPickerOpen}
        title="Diabetes Type"
        options={DIABETES_OPTIONS as any}
        selected={(profile?.diabetesType ?? "type2") as any}
        onSelect={(k) => updateProfileMutation.mutate({ diabetesType: k as any })}
        onClose={() => setDiabetesPickerOpen(false)}
      />
      <PickerModal
        visible={activityPickerOpen}
        title="Activity Level"
        options={ACTIVITY_OPTIONS as any}
        selected={(profile?.activityLevel ?? "light") as any}
        onSelect={(k) => updateProfileMutation.mutate({ activityLevel: k as any })}
        onClose={() => setActivityPickerOpen(false)}
      />
      <EditGoalsModal
        visible={editGoalsOpen}
        onClose={() => setEditGoalsOpen(false)}
        initialCalories={goals?.dailyCalorieGoal ?? 1800}
        initialCarbs={goals?.maxDailyCarbs ?? 200}
        initialSugar={goals?.maxDailySugar ?? 50}
        onSave={handleSaveGoals}
      />

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar + name header */}
        <View style={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 20,
          paddingBottom: 24,
          backgroundColor: colors.card,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          alignItems: "center",
        }}>
          <View style={{
            width: 72, height: 72, borderRadius: 36,
            backgroundColor: colors.primaryLight,
            alignItems: "center", justifyContent: "center",
            marginBottom: 12,
            borderWidth: 2,
            borderColor: colors.primary,
          }}>
            <Text style={{ fontSize: 28, fontWeight: "800", color: colors.primary }}>{initials}</Text>
          </View>
          <Text style={{ fontSize: 20, fontWeight: "800", color: colors.textPrimary }}>
            {profile?.firstName ? `${profile.firstName} ${profile.lastName ?? ""}`.trim() : "Your Profile"}
          </Text>
          <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 3 }}>
            {profile?.email ?? ""}
          </Text>
        </View>

        <View style={{ paddingHorizontal: 20 }}>
          {/* ── Personal info ── */}
          <SectionHeader title="Personal Info" />
          <SettingsRow
            icon={<User size={16} color={colors.primary} />}
            label="Edit Profile"
            value={profile?.country ?? "Tap to update"}
            onPress={() => router.push("/profile-edit")}
          />

          {/* ── Goals ── */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginTop: 24, marginBottom: 8 }}>
            <SectionHeader title="Daily Goals" />
            <Pressable
              onPress={() => setEditGoalsOpen(true)}
              style={({ pressed }) => ({
                opacity: pressed ? 0.6 : 1,
                paddingRight: 4,
              })}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Edit2 size={12} color={colors.primary} />
                <Text style={{ fontSize: 11, fontWeight: "700", color: colors.primary, textTransform: "uppercase", letterSpacing: 0.6 }}>
                  Edit
                </Text>
              </View>
            </Pressable>
          </View>
          <View style={{
            backgroundColor: colors.card,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: colors.border,
            padding: 14,
            marginBottom: 8,
          }}>
            {[
              { label: "Calories", value: `${goals?.dailyCalorieGoal ?? 1800} kcal` },
              { label: "Carbs", value: `${goals?.maxDailyCarbs ?? 200} g` },
              { label: "Sugar", value: `${goals?.maxDailySugar ?? 50} g` },
            ].map(({ label, value }) => (
              <View key={label} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 7 }}>
                <Text style={{ fontSize: 14, color: colors.textSecondary, fontWeight: "500" }}>{label}</Text>
                <Text style={{ fontSize: 14, color: colors.textPrimary, fontWeight: "700" }}>{value}</Text>
              </View>
            ))}
            <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4, fontStyle: "italic" }}>
              Calculated from your age, weight, height and activity level.
            </Text>
          </View>

          {/* ── Diabetes settings ── */}
          <SectionHeader title="Diabetes Settings" />
          <SettingsRow
            icon={<Activity size={16} color={colors.primary} />}
            label="Diabetes Type"
            value={diabetesLabel}
            onPress={() => setDiabetesPickerOpen(true)}
          />
          <SettingsRow
            icon={<Activity size={16} color={colors.primary} />}
            label="Activity Level"
            value={activityLabel}
            onPress={() => setActivityPickerOpen(true)}
          />

          {/* ── Notifications ── */}
          <SectionHeader title="Notifications" />
          <SettingsRow
            icon={<Bell size={16} color={colors.primary} />}
            label="Meal & Water Reminders"
            value={`${(reminders ?? []).filter((r: any) => r.enabled).length} active`}
            onPress={() => router.push("/reminders")}
          />

          {/* ── Data ── */}
          <SectionHeader title="Data & Reports" />
          <SettingsRow
            icon={<Download size={16} color={colors.primary} />}
            label="Export Food Log (CSV)"
            value="Download your full meal history"
            onPress={handleExportCSV}
            right={
              exporting
                ? <ActivityIndicator size="small" color={colors.primary} />
                : <ChevronRight size={16} color={colors.textSecondary} />
            }
          />
          <SettingsRow
            icon={<FileText size={16} color={colors.primary} />}
            label="Monthly Health Report (PDF)"
            value="AI-generated summary for your doctor"
            onPress={handleGenerateReport}
            right={
              generatingReport
                ? <ActivityIndicator size="small" color={colors.primary} />
                : <ChevronRight size={16} color={colors.textSecondary} />
            }
          />

          {/* ── Sign out ── */}
          <SectionHeader title="Account" />
          <SettingsRow
            icon={<LogOut size={16} color={colors.risky} />}
            label="Sign Out"
            onPress={handleSignOut}
            danger
          />

          <Text style={{ fontSize: 11, color: colors.textSecondary, textAlign: "center", marginTop: 24, lineHeight: 16 }}>
            GlucoLens is not a substitute for medical advice.{"\n"}Always consult your healthcare provider.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
