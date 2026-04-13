import {
  View, Text, Pressable, TextInput, ScrollView, ActivityIndicator,
  StatusBar, KeyboardAvoidingView, Platform, Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useState, useMemo, useEffect, useRef } from "react";
import Toast from "react-native-toast-message";
import { CameraLensLogo } from "@/components/ui/GlucoLensLogo";
import { trpc } from "@/lib/trpc";
import { useProfileStore } from "@/stores/profileStore";
import { colors, radius, spacing } from "@/constants/tokens";
import {
  User, Globe, HeartPulse, Target, CheckCircle, Syringe, Activity,
  HelpCircle, ShieldCheck, Flame, Droplets, Wheat, ChevronRight, ChevronLeft,
  Info, AlertTriangle, Pill,
} from "lucide-react-native";

// ─── Local goal calculation (no backend needed) ───────────────────────────────
function calcGoals(
  heightCm: number, weightKg: number, age: number,
  gender: string, activityLevel: string, diabetesType: string
): GoalResult {
  const h = heightCm, w = weightKg;
  const bmiRaw = w / Math.pow(h / 100, 2);
  const bmi = Math.round(bmiRaw * 10) / 10;
  const bmiCategory =
    bmi < 18.5 ? "Underweight" :
    bmi < 25   ? "Normal weight" :
    bmi < 30   ? "Overweight" : "Obese";

  const bmr = gender === "female"
    ? 447.593 + 9.247 * w + 3.098 * h - 4.330 * age
    : 88.362  + 13.397 * w + 4.799 * h - 5.677 * age;

  const activityMultiplier =
    activityLevel === "sedentary" ? 1.2 :
    activityLevel === "light"     ? 1.375 :
    activityLevel === "moderate"  ? 1.55 : 1.725;

  let calories = Math.round(bmr * activityMultiplier);

  if ((diabetesType === "type2" || diabetesType === "unsure") && bmi >= 25) {
    calories = Math.round(calories * 0.85);
  }
  calories = Math.max(1200, Math.min(calories, 3500));

  let maxDailyCarbs: number;
  let maxDailySugar: number;

  if (diabetesType === "none") {
    maxDailyCarbs = 250;
    maxDailySugar = 50;
  } else {
    maxDailyCarbs =
      diabetesType === "type1"  ? 180 :
      diabetesType === "type2"  ? 130 : 150;
    maxDailySugar =
      diabetesType === "type1"  ? 30 :
      diabetesType === "type2"  ? 25 : 25;
  }

  const explanation =
    diabetesType === "none"
      ? `Based on your stats (BMI ${bmi} — ${bmiCategory}), your estimated daily calorie need is ${calories} kcal. Follow general healthy eating guidelines: limit added sugars, maintain balanced macronutrients, and focus on whole foods.`
      : diabetesType === "type1"
      ? `Based on your stats (BMI ${bmi} — ${bmiCategory}), your estimated daily calorie need is ${calories} kcal. Consistent carb intake helps with accurate insulin dosing.`
      : diabetesType === "type2"
      ? `Based on your stats (BMI ${bmi} — ${bmiCategory}), your estimated daily calorie need is ${calories} kcal. Low-GI, lower-carb eating supports blood sugar control for Type 2.`
      : `Based on your stats (BMI ${bmi} — ${bmiCategory}), your estimated daily calorie need is ${calories} kcal. A balanced diet low in refined sugar can help prevent progression to Type 2.`;

  return { dailyCalorieGoal: calories, maxDailySugar, maxDailyCarbs, bmi, bmiCategory, explanation };
}

// ─── Countries ──────────────────────────────────────────────────────────────
const COUNTRIES = [
  { name: "Afghanistan", code: "AF", flag: "\u{1F1E6}\u{1F1EB}" },
  { name: "Australia", code: "AU", flag: "\u{1F1E6}\u{1F1FA}" },
  { name: "Brazil", code: "BR", flag: "\u{1F1E7}\u{1F1F7}" },
  { name: "Canada", code: "CA", flag: "\u{1F1E8}\u{1F1E6}" },
  { name: "China", code: "CN", flag: "\u{1F1E8}\u{1F1F3}" },
  { name: "Egypt", code: "EG", flag: "\u{1F1EA}\u{1F1EC}" },
  { name: "Ethiopia", code: "ET", flag: "\u{1F1EA}\u{1F1F9}" },
  { name: "France", code: "FR", flag: "\u{1F1EB}\u{1F1F7}" },
  { name: "Germany", code: "DE", flag: "\u{1F1E9}\u{1F1EA}" },
  { name: "Ghana", code: "GH", flag: "\u{1F1EC}\u{1F1ED}" },
  { name: "India", code: "IN", flag: "\u{1F1EE}\u{1F1F3}" },
  { name: "Indonesia", code: "ID", flag: "\u{1F1EE}\u{1F1E9}" },
  { name: "Iran", code: "IR", flag: "\u{1F1EE}\u{1F1F7}" },
  { name: "Italy", code: "IT", flag: "\u{1F1EE}\u{1F1F9}" },
  { name: "Japan", code: "JP", flag: "\u{1F1EF}\u{1F1F5}" },
  { name: "Kenya", code: "KE", flag: "\u{1F1F0}\u{1F1EA}" },
  { name: "Malaysia", code: "MY", flag: "\u{1F1F2}\u{1F1FE}" },
  { name: "Mexico", code: "MX", flag: "\u{1F1F2}\u{1F1FD}" },
  { name: "Morocco", code: "MA", flag: "\u{1F1F2}\u{1F1E6}" },
  { name: "Mozambique", code: "MZ", flag: "\u{1F1F2}\u{1F1FF}" },
  { name: "Netherlands", code: "NL", flag: "\u{1F1F3}\u{1F1F1}" },
  { name: "New Zealand", code: "NZ", flag: "\u{1F1F3}\u{1F1FF}" },
  { name: "Nigeria", code: "NG", flag: "\u{1F1F3}\u{1F1EC}" },
  { name: "Pakistan", code: "PK", flag: "\u{1F1F5}\u{1F1F0}" },
  { name: "Philippines", code: "PH", flag: "\u{1F1F5}\u{1F1ED}" },
  { name: "Poland", code: "PL", flag: "\u{1F1F5}\u{1F1F1}" },
  { name: "Portugal", code: "PT", flag: "\u{1F1F5}\u{1F1F9}" },
  { name: "Russia", code: "RU", flag: "\u{1F1F7}\u{1F1FA}" },
  { name: "Saudi Arabia", code: "SA", flag: "\u{1F1F8}\u{1F1E6}" },
  { name: "Senegal", code: "SN", flag: "\u{1F1F8}\u{1F1F3}" },
  { name: "Singapore", code: "SG", flag: "\u{1F1F8}\u{1F1EC}" },
  { name: "South Africa", code: "ZA", flag: "\u{1F1FF}\u{1F1E6}" },
  { name: "South Korea", code: "KR", flag: "\u{1F1F0}\u{1F1F7}" },
  { name: "Spain", code: "ES", flag: "\u{1F1EA}\u{1F1F8}" },
  { name: "Sri Lanka", code: "LK", flag: "\u{1F1F1}\u{1F1F0}" },
  { name: "Sweden", code: "SE", flag: "\u{1F1F8}\u{1F1EA}" },
  { name: "Tanzania", code: "TZ", flag: "\u{1F1F9}\u{1F1FF}" },
  { name: "Thailand", code: "TH", flag: "\u{1F1F9}\u{1F1ED}" },
  { name: "Turkey", code: "TR", flag: "\u{1F1F9}\u{1F1F7}" },
  { name: "Uganda", code: "UG", flag: "\u{1F1FA}\u{1F1EC}" },
  { name: "Ukraine", code: "UA", flag: "\u{1F1FA}\u{1F1E6}" },
  { name: "United Arab Emirates", code: "AE", flag: "\u{1F1E6}\u{1F1EA}" },
  { name: "United Kingdom", code: "GB", flag: "\u{1F1EC}\u{1F1E7}" },
  { name: "United States", code: "US", flag: "\u{1F1FA}\u{1F1F8}" },
  { name: "Vietnam", code: "VN", flag: "\u{1F1FB}\u{1F1F3}" },
  { name: "Zambia", code: "ZM", flag: "\u{1F1FF}\u{1F1F2}" },
  { name: "Zimbabwe", code: "ZW", flag: "\u{1F1FF}\u{1F1FC}" },
];

// ─── Step config with hero emoji + subtitle ─────────────────────────────────
const STEPS = [
  { id: 1, title: "What's your name?", desc: "Let's make this personal", icon: User, hero: "\u{1F44B}", heroLabel: "Welcome to GlucoLens" },
  { id: 2, title: "Where are you based?", desc: "For local food recognition", icon: Globe, hero: "\u{1F30D}", heroLabel: "We'll tailor meals to your region" },
  { id: 3, title: "About you", desc: "Height, weight, age & health", icon: HeartPulse, hero: "\u{1F4AA}", heroLabel: "This powers your AI calculations" },
  { id: 4, title: "Your condition", desc: "So we know how to help", icon: Target, hero: "\u{1F3AF}", heroLabel: "Pick what matches you best" },
  { id: 5, title: "Your plan is ready", desc: "AI-calculated daily targets", icon: CheckCircle, hero: "\u{1F680}", heroLabel: "Let's go!" },
];

interface GoalResult {
  dailyCalorieGoal: number;
  maxDailySugar: number;
  maxDailyCarbs: number;
  bmi: number;
  bmiCategory: string;
  explanation: string;
}

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  country: string;
  countryCode: string;
  countryFlag: string;
  heightCm: string;
  weightKg: string;
  age: string;
  gender: "male" | "female" | "other" | "";
  activityLevel: "sedentary" | "light" | "moderate" | "active";
  diabetesType: "type1" | "type2" | "unsure" | "none" | "";
  allergies: string;
  medication: string;
  dailyCalorieGoal: number;
  maxDailySugar: number;
  maxDailyCarbs: number;
}

const inputStyle = {
  height: 52, borderRadius: radius.lg, paddingHorizontal: 16,
  backgroundColor: colors.card, borderWidth: 1, borderColor: `${colors.textPrimary}15`,
  fontSize: 15, color: colors.textPrimary, marginBottom: 0,
};

const labelStyle = {
  fontSize: 11, fontWeight: "600" as const, color: colors.textSecondary,
  marginBottom: 6, letterSpacing: 0.5,
};

// ─── Pill selector component ────────────────────────────────────────────────
function PillOption({ selected, label, onPress }: { selected: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1, height: 48, borderRadius: radius.lg,
        borderWidth: 2,
        borderColor: selected ? colors.primary : `${colors.textPrimary}15`,
        backgroundColor: selected ? `${colors.primary}15` : colors.background,
        alignItems: "center", justifyContent: "center",
      }}
    >
      <Text style={{
        fontSize: 14, fontWeight: "700",
        color: selected ? colors.primary : colors.textSecondary,
      }}>{label}</Text>
    </Pressable>
  );
}

export default function Onboarding() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [countrySearch, setCountrySearch] = useState("");
  const [showCountries, setShowCountries] = useState(false);
  const [calculatedGoals, setCalculatedGoals] = useState<GoalResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(false);
  const [acceptedDisclaimer, setAcceptedDisclaimer] = useState(false);
  const [disclaimerAcceptedAt, setDisclaimerAcceptedAt] = useState<string | null>(null);

  // Fade animation for step transitions
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const animateStep = (newStep: number) => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 120, useNativeDriver: true }).start(() => {
      setStep(newStep);
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    });
  };

  const [form, setForm] = useState<FormData>({
    firstName: "", lastName: "", email: "",
    country: "", countryCode: "", countryFlag: "",
    heightCm: "", weightKg: "", age: "",
    gender: "" as "male" | "female" | "other" | "",
    activityLevel: "light" as "sedentary" | "light" | "moderate" | "active",
    diabetesType: "" as "type1" | "type2" | "unsure" | "none" | "",
    allergies: "",
    medication: "",
    dailyCalorieGoal: 1800, maxDailySugar: 50, maxDailyCarbs: 200,
  });

  const setProfile = useProfileStore((s) => s.setProfile);
  const upsertProfile = trpc.profile.upsert.useMutation();

  const update = (key: keyof FormData, value: any) =>
    setForm(f => ({ ...f, [key]: value }));

  const filteredCountries = useMemo(() =>
    COUNTRIES.filter(c => c.name.toLowerCase().includes(countrySearch.toLowerCase())).slice(0, 50),
    [countrySearch]
  );

  const progress = ((step - 1) / (STEPS.length - 1)) * 100;

  const canProceed = () => {
    if (step === 1) return form.firstName.trim().length > 0 && form.lastName.trim().length > 0;
    if (step === 2) return form.country.length > 0;
    if (step === 3) return form.heightCm.length > 0 && form.weightKg.length > 0 && form.age.length > 0 && form.gender.length > 0;
    if (step === 4) return form.diabetesType.length > 0;
    if (step === 5) return !!calculatedGoals && acceptedDisclaimer;
    return true;
  };

  function validateInputs(): boolean {
    const height = Number(form.heightCm);
    const weight = Number(form.weightKg);
    const age = Number(form.age);

    if (isNaN(height) || height < 100 || height > 250) {
      Toast.show({ type: "error", text1: "Invalid Height", text2: "Please enter a height between 100-250 cm" });
      return false;
    }
    if (isNaN(weight) || weight < 20 || weight > 300) {
      Toast.show({ type: "error", text1: "Invalid Weight", text2: "Please enter a weight between 20-300 kg" });
      return false;
    }
    if (isNaN(age) || age < 10 || age > 120) {
      Toast.show({ type: "error", text1: "Invalid Age", text2: "Please enter an age between 10-120 years" });
      return false;
    }
    return true;
  }

  function runGoalCalculation() {
    if (!validateInputs()) return;
    setIsCalculating(true);
    try {
      const result = calcGoals(
        Number(form.heightCm), Number(form.weightKg), Number(form.age),
        form.gender, form.activityLevel, form.diabetesType,
      );
      setCalculatedGoals(result);
      update("dailyCalorieGoal", result.dailyCalorieGoal);
      update("maxDailySugar", result.maxDailySugar);
      update("maxDailyCarbs", result.maxDailyCarbs);
    } catch (e: any) {
      Toast.show({ type: "error", text1: "Goal calculation failed", text2: e.message });
    } finally {
      setIsCalculating(false);
    }
  }

  function handleNext() {
    if (step === 4) {
      animateStep(5);
      setTimeout(() => runGoalCalculation(), 150);
    } else if (step < 5) {
      animateStep(step + 1);
    }
  }

  function handleBack() {
    if (step > 1) animateStep(step - 1);
  }

  async function handleFinish() {
    try {
      const diabetesTypeToSend = form.diabetesType || "type2";
      const savedData = await upsertProfile.mutateAsync({
        firstName: form.firstName,
        lastName: form.lastName,
        country: form.country,
        countryCode: form.countryCode,
        countryFlag: form.countryFlag,
        heightCm: Number(form.heightCm),
        weightKg: Number(form.weightKg),
        age: Number(form.age),
        gender: form.gender as any,
        activityLevel: form.activityLevel,
        diabetesType: diabetesTypeToSend as any,
        dailyCalorieGoal: form.dailyCalorieGoal,
        maxDailySugar: form.maxDailySugar,
        maxDailyCarbs: form.maxDailyCarbs,
        allergies: form.allergies || undefined,
        medication: form.medication || undefined,
        dietaryRestrictions: disclaimerAcceptedAt
          ? `disclaimer_accepted:${disclaimerAcceptedAt}`
          : undefined,
        onboardingComplete: 1,
      } as any);

      if (savedData) setProfile(savedData as any);
      router.replace("/(tabs)");
    } catch (e: any) {
      console.warn("Profile save failed:", e.message);
      Toast.show({
        type: "error", text1: "Save failed",
        text2: "Your profile could not be saved. Please check your connection and try again.",
        visibilityTime: 4000,
      });
    }
  }

  if (checkingProfile) return (
    <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={{ marginTop: 16, fontSize: 14, color: colors.textSecondary }}>Setting up your account...</Text>
    </View>
  );

  const currentStep = STEPS[step - 1];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={{
          flex: 1,
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 24,
          paddingHorizontal: 20,
        }}>

          {/* ── Top bar: Logo + step counter ── */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <CameraLensLogo size={28} showText textSize={15} />
            <View style={{
              backgroundColor: `${colors.primary}15`,
              paddingHorizontal: 12, paddingVertical: 6,
              borderRadius: 20,
            }}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: colors.primary }}>
                {step} of {STEPS.length}
              </Text>
            </View>
          </View>

          {/* ── Progress bar ── */}
          <View style={{
            height: 4,
            backgroundColor: `${colors.textPrimary}08`,
            borderRadius: 2,
            marginBottom: 28,
            overflow: "hidden",
          }}>
            <View style={{
              height: "100%",
              width: `${progress}%`,
              backgroundColor: colors.primary,
              borderRadius: 2,
            }} />
          </View>

          {/* ── Hero section ── */}
          <Animated.View style={{ opacity: fadeAnim }}>
            <View style={{ alignItems: "center", marginBottom: 24 }}>
              <View style={{
                width: 80, height: 80, borderRadius: 40,
                backgroundColor: `${colors.primary}12`,
                alignItems: "center", justifyContent: "center",
                marginBottom: 16,
              }}>
                <Text style={{ fontSize: 40 }}>{currentStep.hero}</Text>
              </View>
              <Text style={{
                fontSize: 24, fontWeight: "800", color: colors.textPrimary,
                textAlign: "center", marginBottom: 6,
              }}>
                {currentStep.title}
              </Text>
              <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: "center" }}>
                {currentStep.heroLabel}
              </Text>
            </View>

            {/* ── Content card ── */}
            <View style={{
              backgroundColor: colors.card,
              borderWidth: 1,
              borderColor: `${colors.textPrimary}08`,
              borderRadius: 20,
              padding: 20,
            }}>

              {/* ── STEP 1: Name ── */}
              {step === 1 && (
                <View style={{ gap: 14 }}>
                  <View>
                    <Text style={labelStyle}>FIRST NAME *</Text>
                    <TextInput
                      value={form.firstName}
                      onChangeText={v => update("firstName", v)}
                      placeholder="e.g. Justin"
                      placeholderTextColor={colors.textSecondary}
                      style={inputStyle}
                      autoFocus
                    />
                  </View>
                  <View>
                    <Text style={labelStyle}>LAST NAME *</Text>
                    <TextInput
                      value={form.lastName}
                      onChangeText={v => update("lastName", v)}
                      placeholder="e.g. Smith"
                      placeholderTextColor={colors.textSecondary}
                      style={inputStyle}
                    />
                  </View>
                  <View style={{
                    backgroundColor: `${colors.primary}08`,
                    borderRadius: radius.md,
                    padding: 12,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                  }}>
                    <Info size={14} color={colors.primary} />
                    <Text style={{ fontSize: 12, color: colors.textSecondary, flex: 1, lineHeight: 18 }}>
                      We use your name to personalise your dashboard and meal plans.
                    </Text>
                  </View>
                </View>
              )}

              {/* ── STEP 2: Country ── */}
              {step === 2 && (
                <View style={{ gap: 14 }}>
                  <View>
                    <Text style={labelStyle}>YOUR COUNTRY *</Text>
                    <TextInput
                      value={showCountries ? countrySearch : (form.countryFlag ? `${form.countryFlag}  ${form.country}` : "")}
                      onChangeText={v => { setCountrySearch(v); setShowCountries(true); }}
                      onFocus={() => { setShowCountries(true); setCountrySearch(""); }}
                      placeholder="Search for your country..."
                      placeholderTextColor={colors.textSecondary}
                      style={inputStyle}
                    />
                  </View>

                  {showCountries && (
                    <View style={{
                      backgroundColor: colors.background,
                      borderWidth: 1,
                      borderColor: `${colors.textPrimary}12`,
                      borderRadius: radius.lg,
                      maxHeight: 200,
                      overflow: "hidden",
                    }}>
                      <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="always">
                        {filteredCountries.length === 0 ? (
                          <Text style={{ textAlign: "center", padding: 16, color: colors.textSecondary, fontSize: 13 }}>
                            No countries found
                          </Text>
                        ) : filteredCountries.map(c => (
                          <Pressable
                            key={c.code}
                            onPress={() => {
                              update("country", c.name);
                              update("countryCode", c.code);
                              update("countryFlag", c.flag);
                              setShowCountries(false);
                              setCountrySearch("");
                            }}
                            style={({ pressed }) => ({
                              flexDirection: "row", alignItems: "center", gap: 12,
                              paddingHorizontal: 16, paddingVertical: 12,
                              backgroundColor: pressed ? `${colors.primary}10` : "transparent",
                            })}
                          >
                            <Text style={{ fontSize: 22 }}>{c.flag}</Text>
                            <Text style={{ fontSize: 14, color: colors.textPrimary, fontWeight: "500" }}>{c.name}</Text>
                          </Pressable>
                        ))}
                      </ScrollView>
                    </View>
                  )}

                  {form.country && !showCountries && (
                    <View style={{
                      backgroundColor: `${colors.primary}10`,
                      borderRadius: radius.lg,
                      padding: 16,
                      flexDirection: "row", alignItems: "center", gap: 14,
                    }}>
                      <Text style={{ fontSize: 36 }}>{form.countryFlag}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: "700", color: colors.textPrimary, fontSize: 15 }}>{form.country}</Text>
                        <Text style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 18, marginTop: 2 }}>
                          AI will recognise {form.country}'s local foods, stores, and cuisines.
                        </Text>
                      </View>
                    </View>
                  )}

                  <View style={{
                    backgroundColor: `${colors.primary}08`,
                    borderRadius: radius.md,
                    padding: 12,
                    flexDirection: "row", alignItems: "flex-start", gap: 10,
                  }}>
                    <Info size={14} color={colors.primary} style={{ marginTop: 2 }} />
                    <Text style={{ fontSize: 12, color: colors.textSecondary, flex: 1, lineHeight: 18 }}>
                      <Text style={{ fontWeight: "700", color: colors.textPrimary }}>Why this matters: </Text>
                      Foods like boerewors, jollof rice, biryani, or pho have unique nutritional profiles. We tailor analysis to your region.
                    </Text>
                  </View>
                </View>
              )}

              {/* ── STEP 3: Health Details ── */}
              {step === 3 && (
                <View style={{ gap: 14 }}>
                  {/* Height + Weight row */}
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={labelStyle}>HEIGHT (cm) *</Text>
                      <TextInput
                        value={form.heightCm}
                        onChangeText={v => update("heightCm", v)}
                        placeholder="175"
                        placeholderTextColor={colors.textSecondary}
                        keyboardType="numeric"
                        style={inputStyle}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={labelStyle}>WEIGHT (kg) *</Text>
                      <TextInput
                        value={form.weightKg}
                        onChangeText={v => update("weightKg", v)}
                        placeholder="75"
                        placeholderTextColor={colors.textSecondary}
                        keyboardType="numeric"
                        style={inputStyle}
                      />
                    </View>
                  </View>

                  {/* Age + Gender row */}
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={labelStyle}>AGE *</Text>
                      <TextInput
                        value={form.age}
                        onChangeText={v => update("age", v)}
                        placeholder="35"
                        placeholderTextColor={colors.textSecondary}
                        keyboardType="numeric"
                        style={inputStyle}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={labelStyle}>GENDER *</Text>
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        <PillOption selected={form.gender === "male"} label="Male" onPress={() => update("gender", "male")} />
                        <PillOption selected={form.gender === "female"} label="Female" onPress={() => update("gender", "female")} />
                      </View>
                    </View>
                  </View>

                  {/* Activity Level */}
                  <View>
                    <Text style={labelStyle}>ACTIVITY LEVEL</Text>
                    <View style={{ gap: 6 }}>
                      {([
                        { value: "sedentary", label: "Sedentary", emoji: "\u{1F6CB}\u{FE0F}", desc: "Desk job, little movement" },
                        { value: "light", label: "Lightly Active", emoji: "\u{1F6B6}", desc: "Walking 1-3 days/week" },
                        { value: "moderate", label: "Fairly Active", emoji: "\u{1F3C3}", desc: "Exercise 3-5 days/week" },
                        { value: "active", label: "Very Active", emoji: "\u{1F3CB}\u{FE0F}", desc: "Hard exercise 6-7 days/week" },
                      ] as const).map(a => (
                        <Pressable
                          key={a.value}
                          onPress={() => update("activityLevel", a.value)}
                          style={{
                            flexDirection: "row", alignItems: "center", gap: 12,
                            padding: 12, borderRadius: radius.md,
                            borderWidth: 1.5,
                            borderColor: form.activityLevel === a.value ? colors.primary : `${colors.textPrimary}10`,
                            backgroundColor: form.activityLevel === a.value ? `${colors.primary}10` : colors.background,
                          }}
                        >
                          <Text style={{ fontSize: 20 }}>{a.emoji}</Text>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 13, fontWeight: "600", color: colors.textPrimary }}>{a.label}</Text>
                            <Text style={{ fontSize: 11, color: colors.textSecondary }}>{a.desc}</Text>
                          </View>
                          {form.activityLevel === a.value && (
                            <CheckCircle size={18} color={colors.primary} strokeWidth={2.5} />
                          )}
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  {/* Allergies (optional) */}
                  <View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 }}>
                      <AlertTriangle size={12} color="#f59e0b" />
                      <Text style={labelStyle}>ALLERGIES / INTOLERANCES</Text>
                    </View>
                    <TextInput
                      value={form.allergies}
                      onChangeText={v => update("allergies", v)}
                      placeholder="e.g. peanuts, lactose, gluten (optional)"
                      placeholderTextColor={colors.textSecondary}
                      style={inputStyle}
                    />
                  </View>

                  {/* Medication (optional) */}
                  <View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 }}>
                      <Pill size={12} color={colors.primary} />
                      <Text style={labelStyle}>CURRENT MEDICATION</Text>
                    </View>
                    <TextInput
                      value={form.medication}
                      onChangeText={v => update("medication", v)}
                      placeholder="e.g. Metformin 500mg (optional)"
                      placeholderTextColor={colors.textSecondary}
                      style={inputStyle}
                    />
                  </View>

                  <View style={{
                    backgroundColor: `${colors.primary}08`,
                    borderRadius: radius.md,
                    padding: 12,
                    flexDirection: "row", alignItems: "flex-start", gap: 10,
                  }}>
                    <Info size={14} color={colors.primary} style={{ marginTop: 2 }} />
                    <Text style={{ fontSize: 12, color: colors.textSecondary, flex: 1, lineHeight: 18 }}>
                      Allergies and medication help GlucoBot avoid harmful ingredients and tailor your meal plans safely.
                    </Text>
                  </View>
                </View>
              )}

              {/* ── STEP 4: Diabetes Type ── */}
              {step === 4 && (
                <View style={{ gap: 10 }}>
                  {([
                    {
                      value: "type1", icon: Syringe, emoji: "\u{1F489}",
                      label: "Type 1 Diabetes",
                      desc: "Insulin-dependent. Focus on consistent carb intake for accurate insulin dosing.",
                    },
                    {
                      value: "type2", icon: Activity, emoji: "\u{1F4C9}",
                      label: "Type 2 Diabetes",
                      desc: "Insulin resistant. Focus on low sugar, low GI foods, and portion control.",
                    },
                    {
                      value: "unsure", icon: HelpCircle, emoji: "\u{26A0}\u{FE0F}",
                      label: "Pre-Diabetes / Unsure",
                      desc: "Blood sugar higher than normal. Focus on prevention through diet.",
                    },
                    {
                      value: "none", icon: ShieldCheck, emoji: "\u{1F49A}",
                      label: "Health Conscious",
                      desc: "No diabetes. I want to eat healthier and manage my weight.",
                    },
                  ] as const).map(t => (
                    <Pressable
                      key={t.value}
                      onPress={() => update("diabetesType", t.value)}
                      style={{
                        flexDirection: "row", alignItems: "center", gap: 14,
                        padding: 16, borderRadius: radius.lg,
                        borderWidth: 2,
                        borderColor: form.diabetesType === t.value ? colors.primary : `${colors.textPrimary}10`,
                        backgroundColor: form.diabetesType === t.value ? `${colors.primary}10` : colors.background,
                      }}
                    >
                      <Text style={{ fontSize: 28 }}>{t.emoji}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: "700", color: colors.textPrimary, marginBottom: 2 }}>
                          {t.label}
                        </Text>
                        <Text style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 17 }}>
                          {t.desc}
                        </Text>
                      </View>
                      {form.diabetesType === t.value && (
                        <CheckCircle size={22} color={colors.primary} strokeWidth={2.5} />
                      )}
                    </Pressable>
                  ))}
                </View>
              )}

              {/* ── STEP 5: Goals ── */}
              {step === 5 && (
                <View style={{ gap: 14 }}>
                  {isCalculating ? (
                    <View style={{ alignItems: "center", paddingVertical: 40, gap: 12 }}>
                      <ActivityIndicator size="large" color={colors.primary} />
                      <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                        Calculating your personalised plan...
                      </Text>
                    </View>
                  ) : calculatedGoals ? (
                    <>
                      {/* AI explanation */}
                      <View style={{
                        backgroundColor: `${colors.primary}12`,
                        borderWidth: 1.5, borderColor: colors.primary,
                        borderRadius: radius.lg, padding: 14,
                      }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                          <View style={{
                            width: 32, height: 32, borderRadius: 16,
                            backgroundColor: colors.primary,
                            alignItems: "center", justifyContent: "center",
                          }}>
                            <Target size={16} color="#fff" strokeWidth={2.5} />
                          </View>
                          <Text style={{ fontSize: 14, fontWeight: "800", color: colors.primary }}>
                            GlucoLens AI
                          </Text>
                        </View>
                        <Text style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 18 }}>
                          {calculatedGoals.explanation}
                        </Text>
                      </View>

                      {/* Goal cards */}
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        {[
                          { Icon: Flame, value: `${calculatedGoals.dailyCalorieGoal}`, unit: "kcal/day", color: "#f59e0b" },
                          { Icon: Droplets, value: `${calculatedGoals.maxDailySugar}g`, unit: "max sugar", color: "#ef4444" },
                          { Icon: Wheat, value: `${calculatedGoals.maxDailyCarbs}g`, unit: "max carbs", color: colors.primary },
                        ].map((m, idx) => (
                          <View key={idx} style={{
                            flex: 1,
                            backgroundColor: colors.background,
                            borderWidth: 1,
                            borderColor: `${colors.textPrimary}10`,
                            borderRadius: radius.lg,
                            padding: 12,
                            alignItems: "center",
                          }}>
                            <m.Icon size={20} color={m.color} strokeWidth={1.5} style={{ marginBottom: 6 }} />
                            <Text style={{ fontSize: 18, fontWeight: "800", color: colors.textPrimary }}>{m.value}</Text>
                            <Text style={{ fontSize: 10, color: colors.textSecondary, textAlign: "center" }}>{m.unit}</Text>
                          </View>
                        ))}
                      </View>

                      {/* BMI */}
                      <View style={{
                        flexDirection: "row", alignItems: "center", gap: 12,
                        backgroundColor: colors.background,
                        borderWidth: 1, borderColor: `${colors.textPrimary}10`,
                        borderRadius: radius.md, padding: 12,
                      }}>
                        <View style={{ alignItems: "center", minWidth: 48 }}>
                          <Text style={{ fontSize: 20, fontWeight: "800", color: colors.textPrimary }}>{calculatedGoals.bmi}</Text>
                          <Text style={{ fontSize: 10, color: colors.textSecondary }}>BMI</Text>
                        </View>
                        <View style={{ width: 1, height: 28, backgroundColor: `${colors.textPrimary}15` }} />
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 14, fontWeight: "700", color: colors.textPrimary }}>{calculatedGoals.bmiCategory}</Text>
                          <Text style={{ fontSize: 11, color: colors.textSecondary, lineHeight: 15 }}>
                            Based on your height and weight
                          </Text>
                        </View>
                      </View>

                      {/* Disclaimer */}
                      <View style={{
                        backgroundColor: "#1a1a2e",
                        borderWidth: 1.5, borderColor: "#fbbf24",
                        borderRadius: radius.lg, padding: 14,
                      }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                          <AlertTriangle size={16} color="#fbbf24" />
                          <Text style={{ fontSize: 12, fontWeight: "800", color: "#fbbf24" }}>IMPORTANT DISCLAIMER</Text>
                        </View>
                        <Text style={{ fontSize: 11, color: colors.textSecondary, lineHeight: 17, marginBottom: 6 }}>
                          GlucoLens is a <Text style={{ fontWeight: "700", color: colors.textPrimary }}>tool and guide</Text> powered by AI. It is designed to help you make informed food choices but is <Text style={{ fontWeight: "700", color: colors.textPrimary }}>not a substitute for professional medical advice</Text>.
                        </Text>
                        <Text style={{ fontSize: 11, color: "#fbbf24", lineHeight: 17, fontWeight: "600" }}>
                          Your GP must be consulted for all medical decisions.
                        </Text>
                      </View>

                      {/* Accept checkbox */}
                      <Pressable
                        onPress={() => {
                          const now = new Date().toISOString();
                          setAcceptedDisclaimer(!acceptedDisclaimer);
                          setDisclaimerAcceptedAt(acceptedDisclaimer ? null : now);
                        }}
                        style={{
                          flexDirection: "row", alignItems: "center", gap: 12,
                          padding: 14, borderRadius: radius.lg,
                          borderWidth: 2,
                          borderColor: acceptedDisclaimer ? colors.primary : `${colors.textPrimary}15`,
                          backgroundColor: acceptedDisclaimer ? `${colors.primary}10` : colors.background,
                        }}
                      >
                        <View style={{
                          width: 24, height: 24, borderRadius: 6,
                          borderWidth: 2,
                          borderColor: acceptedDisclaimer ? colors.primary : colors.textSecondary,
                          backgroundColor: acceptedDisclaimer ? colors.primary : "transparent",
                          alignItems: "center", justifyContent: "center",
                        }}>
                          {acceptedDisclaimer && <CheckCircle size={14} color="#fff" strokeWidth={3} />}
                        </View>
                        <Text style={{ flex: 1, fontSize: 12, color: colors.textPrimary, lineHeight: 17 }}>
                          I understand GlucoLens is an AI guide and <Text style={{ fontWeight: "700" }}>not a replacement for my doctor</Text>.
                        </Text>
                      </Pressable>
                    </>
                  ) : (
                    <View style={{ alignItems: "center", paddingVertical: 24, gap: 12 }}>
                      <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: "center" }}>
                        Something went wrong calculating your goals.
                      </Text>
                      <Pressable
                        onPress={() => runGoalCalculation()}
                        style={{
                          paddingHorizontal: 20, paddingVertical: 10,
                          borderRadius: radius.md,
                          borderWidth: 1, borderColor: `${colors.textPrimary}15`,
                        }}
                      >
                        <Text style={{ fontSize: 13, color: colors.textPrimary, fontWeight: "600" }}>Try Again</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* ── Navigation buttons ── */}
            <View style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 24,
            }}>
              <Pressable
                onPress={handleBack}
                disabled={step === 1}
                style={({ pressed }) => ({
                  paddingHorizontal: 16, paddingVertical: 14,
                  borderRadius: radius.lg,
                  opacity: step === 1 ? 0.3 : pressed ? 0.6 : 1,
                })}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <ChevronLeft size={16} color={colors.textSecondary} strokeWidth={2} />
                  <Text style={{ fontSize: 15, color: colors.textSecondary, fontWeight: "600" }}>Back</Text>
                </View>
              </Pressable>

              {step < 5 ? (
                <Pressable
                  onPress={handleNext}
                  disabled={!canProceed()}
                  style={({ pressed }) => ({
                    paddingHorizontal: 28, paddingVertical: 14,
                    borderRadius: radius.lg,
                    backgroundColor: colors.primary,
                    opacity: !canProceed() ? 0.4 : pressed ? 0.8 : 1,
                    flexDirection: "row", alignItems: "center", gap: 6,
                    shadowColor: colors.primary,
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: canProceed() ? 0.3 : 0,
                    shadowRadius: 12,
                    elevation: canProceed() ? 6 : 0,
                  })}
                >
                  <Text style={{ fontSize: 15, color: "#fff", fontWeight: "700" }}>Continue</Text>
                  <ChevronRight size={16} color="#fff" strokeWidth={2} />
                </Pressable>
              ) : (
                <Pressable
                  onPress={handleFinish}
                  disabled={upsertProfile.isPending || !calculatedGoals || isCalculating || !acceptedDisclaimer}
                  style={({ pressed }) => ({
                    paddingHorizontal: 28, paddingVertical: 14,
                    borderRadius: radius.lg,
                    backgroundColor: colors.primary,
                    opacity: (upsertProfile.isPending || !calculatedGoals || isCalculating || !acceptedDisclaimer) ? 0.4 : pressed ? 0.8 : 1,
                    flexDirection: "row", alignItems: "center", gap: 6,
                    shadowColor: colors.primary,
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.3,
                    shadowRadius: 12,
                    elevation: 6,
                  })}
                >
                  {upsertProfile.isPending
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <>
                        <Text style={{ fontSize: 15, color: "#fff", fontWeight: "700" }}>Start GlucoLens</Text>
                        <ChevronRight size={16} color="#fff" strokeWidth={2} />
                      </>
                  }
                </Pressable>
              )}
            </View>
          </Animated.View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
