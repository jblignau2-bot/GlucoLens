/**
 * Profile Edit Screen
 *
 * Allows the user to update their personal details, diabetes type,
 * activity level, dietary preferences and country.
 * Accessible via router.push("/profile-edit") from the Profile tab.
 */

import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { ArrowLeft } from "lucide-react-native";
import { trpc } from "@/lib/trpc";
import { useProfileStore, useGlucoseUnit } from "@/stores/profileStore";
import { colors } from "@/constants/tokens";
import type { GlucoseUnit } from "@/lib/glucose";

// ── Option sets ──────────────────────────────────────────────────────────────

const DIABETES_OPTIONS = [
  { label: "Type 1",       value: "type1" },
  { label: "Type 2",       value: "type2" },
  { label: "Pre-Diabetes", value: "prediabetes" },
];

const GLUCOSE_UNIT_OPTIONS: { label: string; value: GlucoseUnit; desc: string }[] = [
  { label: "mmol/L", value: "mmol/L", desc: "e.g. 5.6" },
  { label: "mg/dL",  value: "mg/dL",  desc: "e.g. 100" },
];

const ACTIVITY_OPTIONS = [
  { label: "Sedentary",   value: "sedentary",   desc: "Little / no exercise" },
  { label: "Light",       value: "light",       desc: "1-3 days / week" },
  { label: "Moderate",    value: "moderate",    desc: "3-5 days / week" },
  { label: "Active",      value: "active",      desc: "6-7 days / week" },
  { label: "Very Active", value: "very_active", desc: "Twice daily / hard labour" },
];

// ── Reusable field ────────────────────────────────────────────────────────────

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "numeric" | "email-address";
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? label}
        placeholderTextColor={colors.textSecondary}
        keyboardType={keyboardType}
      />
    </View>
  );
}

// ── Chip row ──────────────────────────────────────────────────────────────────

function ChipRow({
  options,
  selected,
  onSelect,
}: {
  options: { label: string; value: string; desc?: string }[];
  selected: string;
  onSelect: (v: string) => void;
}) {
  return (
    <View style={styles.chipRow}>
      {options.map((o) => {
        const active = o.value === selected;
        return (
          <TouchableOpacity
            key={o.value}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => onSelect(o.value)}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>
              {o.label}
            </Text>
            {o.desc ? (
              <Text style={[styles.chipDesc, active && styles.chipDescActive]}>
                {o.desc}
              </Text>
            ) : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function ProfileEditScreen() {
  const insets = useSafeAreaInsets();
  const { profile, setProfile, setGlucoseUnit } = useProfileStore();
  const glucoseUnit = useGlucoseUnit();

  const [firstName,      setFirstName]      = useState(profile?.firstName      ?? "");
  const [lastName,       setLastName]        = useState(profile?.lastName       ?? "");
  const [age,            setAge]             = useState(String(profile?.age     ?? ""));
  const [heightCm,       setHeightCm]        = useState(String(profile?.heightCm ?? ""));
  const [weightKg,       setWeightKg]        = useState(String(profile?.weightKg ?? ""));
  const [country,        setCountry]         = useState(profile?.country        ?? "");
  const [dietaryPrefs,   setDietaryPrefs]    = useState(profile?.dietaryPrefs   ?? "");
  const [diabetesType,   setDiabetesType]    = useState(profile?.diabetesType   ?? "type2");
  const [activityLevel,  setActivityLevel]   = useState(profile?.activityLevel  ?? "light");
  const [saving,         setSaving]          = useState(false);

  const upsertMutation = trpc.profile.upsert.useMutation({
    onSuccess: (data) => {
      setProfile(data as any);
      router.back();
    },
    onError: (err) => {
      setSaving(false);
      // Offline-first: still apply the changes locally (like onboarding does),
      // and let the user know the backend sync failed.
      setProfile({
        ...(profile ?? { id: 0, dailyCalorieGoal: 1800, maxDailySugar: 50, maxDailyCarbs: 200 }),
        firstName:     firstName.trim(),
        lastName:      lastName.trim(),
        age:           age      ? parseInt(age, 10)    : profile?.age,
        heightCm:      heightCm ? parseFloat(heightCm) : profile?.heightCm,
        weightKg:      weightKg ? parseFloat(weightKg) : profile?.weightKg,
        country:       country.trim()      || profile?.country,
        dietaryPrefs:  dietaryPrefs.trim() || profile?.dietaryPrefs,
        diabetesType:  diabetesType as any,
        activityLevel: activityLevel as any,
      } as any);
      Toast.show({
        type: "info",
        text1: "Saved on this device",
        text2: `Sync to server failed: ${err.message}`,
      });
      router.back();
    },
  });

  function handleSave() {
    if (!firstName.trim()) {
      Alert.alert("Required", "Please enter your first name.");
      return;
    }
    setSaving(true);
    upsertMutation.mutate({
      firstName:     firstName.trim(),
      lastName:      lastName.trim(),
      age:           age           ? parseInt(age, 10)            : undefined,
      heightCm:      heightCm      ? parseFloat(heightCm)         : undefined,
      weightKg:      weightKg      ? parseFloat(weightKg)         : undefined,
      country:       country.trim()       || undefined,
      dietaryPrefs:  dietaryPrefs.trim()  || undefined,
      diabetesType:  diabetesType  as any,
      activityLevel: activityLevel as any,
    });
  }

  return (
    <>
      {/* In-screen header (the root Stack hides native headers) */}
      <View
        style={{
          paddingTop: insets.top + 12,
          paddingHorizontal: 16,
          paddingBottom: 16,
          backgroundColor: colors.primary,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: "rgba(255,255,255,0.2)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ArrowLeft size={18} color="#fff" />
        </TouchableOpacity>
        <Text style={{ fontSize: 22, fontWeight: "800", color: "#fff", flex: 1 }}>
          Edit Profile
        </Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: colors.background }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

          {/* ── Personal Details ─────────────────────────────────────────── */}
          <Text style={styles.sectionTitle}>Personal Details</Text>

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Field label="First Name" value={firstName} onChangeText={setFirstName} />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Last Name" value={lastName} onChangeText={setLastName} />
            </View>
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Field label="Age" value={age} onChangeText={setAge} keyboardType="numeric" placeholder="e.g. 35" />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Country" value={country} onChangeText={setCountry} placeholder="e.g. South Africa" />
            </View>
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Field label="Height (cm)" value={heightCm} onChangeText={setHeightCm} keyboardType="numeric" placeholder="e.g. 175" />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Weight (kg)" value={weightKg} onChangeText={setWeightKg} keyboardType="numeric" placeholder="e.g. 80" />
            </View>
          </View>

          <Field
            label="Dietary Preferences"
            value={dietaryPrefs}
            onChangeText={setDietaryPrefs}
            placeholder="e.g. vegetarian, low-carb…"
          />

          {/* ── Glucose Unit ─────────────────────────────────────────────── */}
          <Text style={styles.sectionTitle}>Glucose Unit</Text>
          <ChipRow
            options={GLUCOSE_UNIT_OPTIONS}
            selected={glucoseUnit}
            onSelect={(v) => setGlucoseUnit(v as GlucoseUnit)}
          />
          <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 6, marginBottom: 4 }}>
            Applies immediately to all glucose readings, stats and charts.
          </Text>

          {/* ── Diabetes Type ────────────────────────────────────────────── */}
          <Text style={styles.sectionTitle}>Diabetes Type</Text>
          <ChipRow options={DIABETES_OPTIONS} selected={diabetesType} onSelect={(v) => setDiabetesType(v as typeof diabetesType)} />

          {/* ── Activity Level ───────────────────────────────────────────── */}
          <Text style={styles.sectionTitle}>Activity Level</Text>
          <ChipRow options={ACTIVITY_OPTIONS} selected={activityLevel} onSelect={(v) => setActivityLevel(v as typeof activityLevel)} />

          {/* ── Save button ──────────────────────────────────────────────── */}
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.saveBtnText}>Save Changes</Text>
            }
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
    marginTop: 24,
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
  },
  fieldWrap: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: 5,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.textPrimary,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 4,
  },
  chip: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.card,
    alignItems: "center",
    minWidth: 80,
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + "18",
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.primary,
  },
  chipDesc: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  chipDescActive: {
    color: colors.primary + "cc",
  },
  saveBtn: {
    marginTop: 32,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
