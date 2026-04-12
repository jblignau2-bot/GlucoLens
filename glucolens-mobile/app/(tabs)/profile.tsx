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
  Pill,
  AlertTriangle,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";
import * as Print from "expo-print";
import * as ImagePicker from "expo-image-picker";

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
  { key: "sedentary", label: "Mostly Sitting", desc: "Desk job, little movement" },
  { key: "light", label: "Lightly Active", desc: "Walking, light chores 1–3 days/week" },
  { key: "moderate", label: "Fairly Active", desc: "Regular exercise 3–5 days/week" },
  { key: "active", label: "Very Active", desc: "Hard exercise 6–7 days/week" },
  { key: "very_active", label: "Athlete Level", desc: "Intense training daily or physical job" },
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
  const [profileImage, setProfileImage] = useState<string | null>(null);

  // reminders query removed — reminders now has its own tab

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
      const { data: csvText } = await exportCsvQuery.refetch();
      if (!csvText) {
        Alert.alert("Export failed", "No food log data to export.");
        return;
      }
      const path = (FileSystem.cacheDirectory ?? "") + "glucolens_food_log.csv";
      // SDK 54: use File and Blob API instead of deprecated writeAsStringAsync
      try {
        await FileSystem.writeAsStringAsync(path, csvText);
      } catch {
        // Fallback for SDK 54+ where writeAsStringAsync is removed
        const { StorageAccessFramework } = FileSystem;
        // Write via base64 encoding as fallback
        const base64 = btoa(unescape(encodeURIComponent(csvText)));
        await FileSystem.writeAsStringAsync(path, base64, { encoding: FileSystem.EncodingType.Base64 });
      }
      await Sharing.shareAsync(path, { mimeType: "text/csv", dialogTitle: "Export Food Log CSV" });
    } catch (e: any) {
      Alert.alert("Export failed", e.message);
    } finally {
      setExporting(false);
    }
  };

  const reportQuery = trpc.reports.monthly.useQuery(
    { month: new Date().toISOString().slice(0, 7) },
    { enabled: false }
  );

  const handleGenerateReport = async () => {
    setGeneratingReport(true);
    try {
      const { data: stats } = await reportQuery.refetch();
      if (!stats || stats.totalMeals === 0) {
        Alert.alert("No data", "No meals logged this month to generate a report.");
        return;
      }
      // Generate PDF client-side from the stats
      const html = `<html><head><style>
        body { font-family: Helvetica; background: #0b1120; color: #f0f4f8; padding: 24px; }
        h1 { color: #14b8a6; font-size: 22px; margin-bottom: 4px; }
        h2 { color: #7b8fa3; font-size: 14px; font-weight: 400; margin-top: 0; }
        .card { background: #111c2e; border-radius: 12px; padding: 16px; margin-bottom: 12px; }
        .card h3 { color: #14b8a6; font-size: 14px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 1px; }
        .stat { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #1e2d40; }
        .stat .label { color: #7b8fa3; font-size: 13px; }
        .stat .val { color: #f0f4f8; font-size: 13px; font-weight: 700; }
        .safe { color: #34d399; } .moderate { color: #fbbf24; } .risky { color: #f87171; }
        .bar-row { display: flex; gap: 8px; margin-top: 8px; }
        .bar { height: 24px; border-radius: 6px; text-align: center; line-height: 24px; font-size: 11px; font-weight: 700; color: #fff; }
        .disclaimer { font-size: 10px; color: #7b8fa3; text-align: center; margin-top: 20px; }
      </style></head><body>
        <h1>GlucoLens Monthly Report</h1>
        <h2>${stats.month} — ${stats.totalMeals} meals logged</h2>

        <div class="card">
          <h3>Meal Safety Breakdown</h3>
          <div class="bar-row">
            ${stats.safeCount > 0 ? `<div class="bar" style="background:#34d399;flex:${stats.safeCount}">${stats.safeCount} Safe</div>` : ""}
            ${stats.moderateCount > 0 ? `<div class="bar" style="background:#fbbf24;flex:${stats.moderateCount}">${stats.moderateCount} Mod</div>` : ""}
            ${stats.riskyCount > 0 ? `<div class="bar" style="background:#f87171;flex:${stats.riskyCount}">${stats.riskyCount} Risky</div>` : ""}
          </div>
          <div class="stat" style="margin-top:12px"><span class="label">Safe meals</span><span class="val safe">${stats.safePercent}%</span></div>
        </div>

        <div class="card">
          <h3>Average Per Meal</h3>
          <div class="stat"><span class="label">Calories</span><span class="val">${stats.avgCaloriesPerMeal} kcal</span></div>
          <div class="stat"><span class="label">Carbs</span><span class="val">${stats.avgCarbsPerMeal}g</span></div>
          <div class="stat"><span class="label">Sugar</span><span class="val">${stats.avgSugarPerMeal}g</span></div>
        </div>

        <p class="disclaimer">This report is for informational purposes only and is not medical advice. Always consult your healthcare provider before making dietary changes.</p>
      </body></html>`;

      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: "Monthly Health Report" });
    } catch (e: any) {
      Alert.alert("Report failed", e.message);
    } finally {
      setGeneratingReport(false);
    }
  };

  const [allergies, setAllergies] = useState(profile?.allergies ?? "");
  const [medication, setMedication] = useState(profile?.medication ?? "");
  const [healthDirty, setHealthDirty] = useState(false);

  useEffect(() => {
    setAllergies(profile?.allergies ?? "");
    setMedication(profile?.medication ?? "");
  }, [profile?.allergies, profile?.medication]);

  const handleSaveHealth = () => {
    updateProfileMutation.mutate({ allergies, medication } as any);
    setHealthDirty(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
          <Pressable
            onPress={async () => {
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 0.7,
                maxWidth: 512,
                maxHeight: 512,
                allowsEditing: true,
                aspect: [1, 1],
              });
              if (!result.canceled && result.assets[0]) {
                setProfileImage(result.assets[0].uri);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
            }}
            style={{ marginBottom: 12 }}
          >
            <View style={{
              width: 80, height: 80, borderRadius: 40,
              backgroundColor: colors.primaryLight,
              alignItems: "center", justifyContent: "center",
              borderWidth: 2,
              borderColor: colors.primary,
              overflow: "hidden",
            }}>
              {profileImage ? (
                <View style={{ width: 80, height: 80 }}>
                  <View style={{ width: 80, height: 80, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontSize: 28, fontWeight: "800", color: "#fff" }}>{initials}</Text>
                  </View>
                </View>
              ) : (
                <Text style={{ fontSize: 28, fontWeight: "800", color: colors.primary }}>{initials}</Text>
              )}
            </View>
            <View style={{
              position: "absolute", bottom: 0, right: -2,
              width: 26, height: 26, borderRadius: 13,
              backgroundColor: colors.primary,
              alignItems: "center", justifyContent: "center",
              borderWidth: 2, borderColor: colors.card,
            }}>
              <Edit2 size={12} color="#fff" />
            </View>
          </Pressable>
          <Text style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 6 }}>
            Tap to upload photo (JPG/PNG, max 5MB)
          </Text>
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

          {/* ── Health Tracking ── */}
          <SectionHeader title="Health Tracking" />
          <SettingsRow
            icon={<Activity size={16} color={colors.primary} />}
            label="Glucose & Weight Log"
            value="Track your blood sugar and weight"
            onPress={() => router.push("/health-log")}
          />

          {/* ── Allergies & Medication (feeds into AI meal planning) ── */}
          <SectionHeader title="Allergies & Medication" />
          <Text style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 10, paddingHorizontal: 4, lineHeight: 16 }}>
            GlucoBot uses this info to personalise your meal plans and avoid harmful ingredients.
          </Text>
          <View style={{
            backgroundColor: colors.card,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: colors.border,
            padding: 14,
            marginBottom: 8,
          }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <AlertTriangle size={14} color="#f59e0b" />
              <Text style={{ fontSize: 13, fontWeight: "700", color: colors.textPrimary }}>Allergies & Intolerances</Text>
            </View>
            <TextInput
              value={allergies}
              onChangeText={(v) => { setAllergies(v); setHealthDirty(true); }}
              placeholder="e.g. peanuts, shellfish, lactose, gluten…"
              placeholderTextColor={colors.textSecondary}
              multiline
              style={{
                backgroundColor: colors.background,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: radius.md,
                padding: 12,
                color: colors.textPrimary,
                fontSize: 14,
                minHeight: 60,
                textAlignVertical: "top",
              }}
            />
          </View>
          <View style={{
            backgroundColor: colors.card,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: colors.border,
            padding: 14,
            marginBottom: 8,
          }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <Pill size={14} color={colors.primary} />
              <Text style={{ fontSize: 13, fontWeight: "700", color: colors.textPrimary }}>Current Medication</Text>
            </View>
            <TextInput
              value={medication}
              onChangeText={(v) => { setMedication(v); setHealthDirty(true); }}
              placeholder="e.g. Metformin 500mg, Insulin Lantus…"
              placeholderTextColor={colors.textSecondary}
              multiline
              style={{
                backgroundColor: colors.background,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: radius.md,
                padding: 12,
                color: colors.textPrimary,
                fontSize: 14,
                minHeight: 60,
                textAlignVertical: "top",
              }}
            />
          </View>
          {healthDirty && (
            <Pressable
              onPress={handleSaveHealth}
              style={({ pressed }) => ({
                backgroundColor: colors.primary,
                borderRadius: radius.md,
                paddingVertical: 12,
                alignItems: "center",
                opacity: pressed ? 0.8 : 1,
                marginBottom: 8,
              })}
            >
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#0b1120" }}>Save Health Info</Text>
            </Pressable>
          )}

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
