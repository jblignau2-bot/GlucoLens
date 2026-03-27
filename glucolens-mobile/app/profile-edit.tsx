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
import { Stack, router } from "expo-router";
import { trpc } from "@/lib/trpc";
import { useProfileStore } from "@/stores/profileStore";
import { colors } from "@/constants/tokens";

// ── Option sets ──────────────────────────────────────────────────────────────

const DIABETES_OPTIONS = [
  { label: "Type 1",       value: "type1" },
  { label: "Type 2",       value: "type2" },
  { label: "Pre-Diabetes", value: "prediabetes" },
  { label: "Not Sure",     value: "unsure" },
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
  const { profile, setProfile } = useProfileStore();

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
      setProfile(data);
      router.back();
    },
    onError: (err) => {
      setSaving(false);
      Alert.alert("Save failed", err.message);
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
      <Stack.Screen
        options={{
          title: "Edit Profile",
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.primary,
          headerTitleStyle: { color: colors.textPrimary, fontWeight: "700" },
        }}
      />

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

          {/* ── Diabetes Type ────────────────────────────────────────────── */}
          <Text style={styles.sectionTitle}>Diabetes Type</Text>
          <ChipRow options={DIABETES_OPTIONS} selected={diabetesType} onSelect={setDiabetesType} />

          {/* ── Activity Level ───────────────────────────────────────────── */}
          <Text style={styles.sectionTitle}>Activity Level</Text>
          <ChipRow options={ACTIVITY_OPTIONS} selected={activityLevel} onSelect={setActivityLevel} />

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
