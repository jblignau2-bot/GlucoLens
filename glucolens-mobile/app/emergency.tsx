/**
 * Emergency screen
 *
 * - Country-aware emergency number (from the profile country), tap to dial.
 * - Editable Medical ID card — persisted in AsyncStorage ONLY (offline-first,
 *   never synced to the backend).
 * - Short "when to seek help" education list. No dosing advice.
 *
 * Reached from the Profile tab and the Guide tab.
 */

import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import {
  ArrowLeft,
  Phone,
  HeartPulse,
  ShieldAlert,
  Lock,
} from "lucide-react-native";
import { colors, radius, shadow } from "@/constants/tokens";
import { useProfileStore } from "@/stores/profileStore";
import { getEmergencyCountry, GENERIC_EMERGENCY } from "@/constants/emergency";

const MEDICAL_ID_KEY = "@glucolens/medical-id";

interface MedicalId {
  name: string;
  diabetesType: string;
  medications: string;
  allergies: string;
  contactName: string;
  contactPhone: string;
}

const EMPTY_ID: MedicalId = {
  name: "",
  diabetesType: "",
  medications: "",
  allergies: "",
  contactName: "",
  contactPhone: "",
};

const DIABETES_LABELS: Record<string, string> = {
  type1: "Type 1 diabetes",
  type2: "Type 2 diabetes",
  prediabetes: "Pre-diabetes",
  none: "No diabetes",
};

// ─── Small building blocks ───────────────────────────────────────────────────

function SectionTitle({ title }: { title: string }) {
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

function IdField({ label, value, onChangeText, placeholder, keyboardType }: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "phone-pad";
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ fontSize: 12, fontWeight: "600", color: colors.textSecondary, marginBottom: 5 }}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? label}
        placeholderTextColor={colors.textMuted}
        keyboardType={keyboardType ?? "default"}
        style={{
          backgroundColor: colors.background,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radius.md,
          paddingHorizontal: 12,
          paddingVertical: 10,
          fontSize: 14,
          color: colors.textPrimary,
        }}
      />
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function EmergencyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const profile = useProfileStore((s) => s.profile);

  const country = getEmergencyCountry(profile?.countryCode, profile?.country);
  const isGeneric = country.code === GENERIC_EMERGENCY.code;

  const [medicalId, setMedicalId] = useState<MedicalId>(EMPTY_ID);
  const [loaded, setLoaded] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  // Load the stored medical ID; prefill from the profile on first use.
  useEffect(() => {
    AsyncStorage.getItem(MEDICAL_ID_KEY)
      .then((raw) => {
        if (raw) {
          setMedicalId({ ...EMPTY_ID, ...(JSON.parse(raw) as Partial<MedicalId>) });
        } else {
          setMedicalId({
            ...EMPTY_ID,
            name: [profile?.firstName, profile?.lastName].filter(Boolean).join(" "),
            diabetesType: DIABETES_LABELS[profile?.diabetesType ?? ""] ?? "",
            medications: profile?.medication ?? "",
            allergies: profile?.allergies ?? "",
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
    // Prefill only needs to run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateField = (key: keyof MedicalId) => (v: string) => {
    setMedicalId((m) => ({ ...m, [key]: v }));
    setDirty(true);
  };

  const saveMedicalId = () => {
    AsyncStorage.setItem(MEDICAL_ID_KEY, JSON.stringify(medicalId)).catch(() => {});
    setDirty(false);
    setSavedFlash(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => setSavedFlash(false), 2000);
  };

  const dial = (num: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Linking.openURL(`tel:${num}`).catch(() => {});
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header (root Stack hides native headers) */}
      <View style={{
        paddingTop: insets.top + 12,
        paddingHorizontal: 16,
        paddingBottom: 16,
        backgroundColor: colors.primary,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
      }}>
        <Pressable
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
        </Pressable>
        <Text style={{ fontSize: 22, fontWeight: "800", color: "#fff", flex: 1 }}>
          Emergency
        </Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Emergency number ─────────────────────────────────────────── */}
          <SectionTitle title="Emergency Services" />
          <View style={{
            backgroundColor: colors.card,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: colors.risky,
            padding: 16,
            ...shadow.card,
          }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <Text style={{ fontSize: 24 }}>{country.flag}</Text>
              <Text style={{ fontSize: 15, fontWeight: "700", color: colors.textPrimary, flex: 1 }}>
                {isGeneric ? "Emergency number" : country.name}
              </Text>
            </View>

            <Pressable
              onPress={() => dial(country.number)}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                height: 56,
                borderRadius: radius.lg,
                backgroundColor: colors.risky,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Phone size={20} color="#fff" />
              <Text style={{ fontSize: 22, fontWeight: "800", color: "#fff" }}>
                {country.number}
              </Text>
            </Pressable>

            {country.ambulance && (
              <Pressable
                onPress={() => dial(country.ambulance!)}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  height: 46,
                  borderRadius: radius.lg,
                  backgroundColor: colors.riskyBg,
                  borderWidth: 1,
                  borderColor: colors.risky,
                  marginTop: 10,
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <HeartPulse size={16} color={colors.risky} />
                <Text style={{ fontSize: 16, fontWeight: "700", color: colors.risky }}>
                  Ambulance: {country.ambulance}
                </Text>
              </Pressable>
            )}

            <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 10, lineHeight: 16 }}>
              {country.note ?? "112 works in many countries if this number doesn't connect."}
            </Text>
          </View>

          {/* ── Medical ID ───────────────────────────────────────────────── */}
          <SectionTitle title="Medical ID" />
          <View style={{
            backgroundColor: colors.card,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: colors.border,
            padding: 16,
            ...shadow.card,
          }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <Lock size={14} color={colors.primary} />
              <Text style={{ fontSize: 11, color: colors.textSecondary, flex: 1, lineHeight: 15 }}>
                Stored only on this device — never uploaded or synced.
              </Text>
            </View>

            {loaded && (
              <>
                <IdField label="Full name" value={medicalId.name} onChangeText={updateField("name")} />
                <IdField label="Diabetes type" value={medicalId.diabetesType} onChangeText={updateField("diabetesType")} placeholder="e.g. Type 2 diabetes" />
                <IdField label="Medications" value={medicalId.medications} onChangeText={updateField("medications")} placeholder="e.g. Metformin 500mg" />
                <IdField label="Allergies" value={medicalId.allergies} onChangeText={updateField("allergies")} placeholder="e.g. penicillin, peanuts" />
                <IdField label="Emergency contact name" value={medicalId.contactName} onChangeText={updateField("contactName")} />
                <IdField label="Emergency contact phone" value={medicalId.contactPhone} onChangeText={updateField("contactPhone")} keyboardType="phone-pad" />
              </>
            )}

            <Pressable
              onPress={saveMedicalId}
              disabled={!dirty}
              style={({ pressed }) => ({
                height: 46,
                borderRadius: radius.lg,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: dirty ? colors.primary : colors.cardAlt,
                borderWidth: dirty ? 0 : 1,
                borderColor: colors.border,
                opacity: pressed ? 0.85 : 1,
                marginTop: 4,
              })}
            >
              <Text style={{ fontWeight: "700", fontSize: 14, color: dirty ? "#fff" : colors.textSecondary }}>
                {savedFlash ? "Saved ✓" : "Save Medical ID"}
              </Text>
            </Pressable>
          </View>

          {/* ── When to seek help ────────────────────────────────────────── */}
          <SectionTitle title="When to Seek Help" />
          <View style={{
            backgroundColor: colors.card,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: colors.border,
            padding: 16,
            ...shadow.card,
          }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <ShieldAlert size={16} color={colors.moderate} />
              <Text style={{ fontSize: 14, fontWeight: "700", color: colors.textPrimary }}>
                Call emergency services if someone has:
              </Text>
            </View>
            {[
              "Severe low glucose with confusion, seizures, or loss of consciousness",
              "Low glucose that doesn't improve after fast-acting sugar",
              "Very high glucose with vomiting, deep/rapid breathing, or fruity-smelling breath (possible DKA)",
              "Drowsiness or confusion with very high readings",
              "Signs of severe dehydration — unable to keep fluids down",
            ].map((item) => (
              <View key={item} style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.risky, marginTop: 7 }} />
                <Text style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 20, flex: 1 }}>
                  {item}
                </Text>
              </View>
            ))}
            <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 8, fontStyle: "italic", lineHeight: 16 }}>
              Educational information only — not medical advice. Always follow the care plan agreed with your healthcare provider.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
