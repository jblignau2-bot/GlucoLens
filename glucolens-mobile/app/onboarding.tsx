import {
  View, Text, Pressable, TextInput, ScrollView, ActivityIndicator,
  StatusBar, KeyboardAvoidingView, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useState, useMemo, useEffect } from "react";
import Toast from "react-native-toast-message";
import { CameraLensLogo } from "@/components/ui/GlucoLensLogo";
import { trpc } from "@/lib/trpc";
import { useProfileStore } from "@/stores/profileStore";
import { colors, radius, spacing } from "@/constants/tokens";
import {
  User, Globe, HeartPulse, Target, CheckCircle, Syringe, Activity,
  HelpCircle, ShieldCheck, Flame, Droplets, Wheat, ChevronRight, ChevronLeft,
  Info, AlertTriangle,
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

  // Harris-Benedict BMR
  const bmr = gender === "female"
    ? 447.593 + 9.247 * w + 3.098 * h - 4.330 * age
    : 88.362  + 13.397 * w + 4.799 * h - 5.677 * age;

  const activityMultiplier =
    activityLevel === "sedentary" ? 1.2 :
    activityLevel === "light"     ? 1.375 :
    activityLevel === "moderate"  ? 1.55 : 1.725;

  let calories = Math.round(bmr * activityMultiplier);

  // Type-2 / pre-diabetes: modest caloric deficit if overweight
  // Health-conscious (none): no deficit
  if ((diabetesType === "type2" || diabetesType === "unsure") && bmi >= 25) {
    calories = Math.round(calories * 0.85);
  }
  calories = Math.max(1200, Math.min(calories, 3500));

  // Carb/sugar limits by diabetes type
  let maxDailyCarbs: number;
  let maxDailySugar: number;

  if (diabetesType === "none") {
    // Health-conscious: general healthy eating guidelines
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
  { name: "Afghanistan", code: "AF", flag: "🇦🇫" },
  { name: "Australia", code: "AU", flag: "🇦🇺" },
  { name: "Brazil", code: "BR", flag: "🇧🇷" },
  { name: "Canada", code: "CA", flag: "🇨🇦" },
  { name: "China", code: "CN", flag: "🇨🇳" },
  { name: "Egypt", code: "EG", flag: "🇪🇬" },
  { name: "Ethiopia", code: "ET", flag: "🇪🇹" },
  { name: "France", code: "FR", flag: "🇫🇷" },
  { name: "Germany", code: "DE", flag: "🇩🇪" },
  { name: "Ghana", code: "GH", flag: "🇬🇭" },
  { name: "India", code: "IN", flag: "🇮🇳" },
  { name: "Indonesia", code: "ID", flag: "🇮🇩" },
  { name: "Iran", code: "IR", flag: "🇮🇷" },
  { name: "Italy", code: "IT", flag: "🇮🇹" },
  { name: "Japan", code: "JP", flag: "🇯🇵" },
  { name: "Kenya", code: "KE", flag: "🇰🇪" },
  { name: "Malaysia", code: "MY", flag: "🇲🇾" },
  { name: "Mexico", code: "MX", flag: "🇲🇽" },
  { name: "Morocco", code: "MA", flag: "🇲🇦" },
  { name: "Mozambique", code: "MZ", flag: "🇲🇿" },
  { name: "Netherlands", code: "NL", flag: "🇳🇱" },
  { name: "New Zealand", code: "NZ", flag: "🇳🇿" },
  { name: "Nigeria", code: "NG", flag: "🇳🇬" },
  { name: "Pakistan", code: "PK", flag: "🇵🇰" },
  { name: "Philippines", code: "PH", flag: "🇵🇭" },
  { name: "Poland", code: "PL", flag: "🇵🇱" },
  { name: "Portugal", code: "PT", flag: "🇵🇹" },
  { name: "Russia", code: "RU", flag: "🇷🇺" },
  { name: "Saudi Arabia", code: "SA", flag: "🇸🇦" },
  { name: "Senegal", code: "SN", flag: "🇸🇳" },
  { name: "Singapore", code: "SG", flag: "🇸🇬" },
  { name: "South Africa", code: "ZA", flag: "🇿🇦" },
  { name: "South Korea", code: "KR", flag: "🇰🇷" },
  { name: "Spain", code: "ES", flag: "🇪🇸" },
  { name: "Sri Lanka", code: "LK", flag: "🇱🇰" },
  { name: "Sweden", code: "SE", flag: "🇸🇪" },
  { name: "Tanzania", code: "TZ", flag: "🇹🇿" },
  { name: "Thailand", code: "TH", flag: "🇹🇭" },
  { name: "Turkey", code: "TR", flag: "🇹🇷" },
  { name: "Uganda", code: "UG", flag: "🇺🇬" },
  { name: "Ukraine", code: "UA", flag: "🇺🇦" },
  { name: "United Arab Emirates", code: "AE", flag: "🇦🇪" },
  { name: "United Kingdom", code: "GB", flag: "🇬🇧" },
  { name: "United States", code: "US", flag: "🇺🇸" },
  { name: "Vietnam", code: "VN", flag: "🇻🇳" },
  { name: "Zambia", code: "ZM", flag: "🇿🇲" },
  { name: "Zimbabwe", code: "ZW", flag: "🇿🇼" },
];

const STEPS = [
  { id: 1, title: "Personal Info", desc: "Tell us your name", icon: User },
  { id: 2, title: "Your Location", desc: "For regional food analysis", icon: Globe },
  { id: 3, title: "Health Details", desc: "Height, weight & age", icon: HeartPulse },
  { id: 4, title: "Diabetes Type", desc: "Your condition type", icon: Target },
  { id: 5, title: "Your Goals", desc: "AI-calculated daily targets", icon: CheckCircle },
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

  const [form, setForm] = useState<FormData>({
    firstName: "", lastName: "", email: "",
    country: "", countryCode: "", countryFlag: "",
    heightCm: "", weightKg: "", age: "",
    gender: "" as "male" | "female" | "other" | "",
    activityLevel: "light" as "sedentary" | "light" | "moderate" | "active",
    diabetesType: "" as "type1" | "type2" | "unsure" | "none" | "",
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
      Toast.show({
        type: "error",
        text1: "Invalid Height",
        text2: "Please enter a height between 100-250 cm",
      });
      return false;
    }

    if (isNaN(weight) || weight < 20 || weight > 300) {
      Toast.show({
        type: "error",
        text1: "Invalid Weight",
        text2: "Please enter a weight between 20-300 kg",
      });
      return false;
    }

    if (isNaN(age) || age < 10 || age > 120) {
      Toast.show({
        type: "error",
        text1: "Invalid Age",
        text2: "Please enter an age between 10-120 years",
      });
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
      setStep(5);
      runGoalCalculation();
    } else if (step < 5) {
      setStep(s => s + 1);
    }
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
        dietaryRestrictions: disclaimerAcceptedAt
          ? `disclaimer_accepted:${disclaimerAcceptedAt}`
          : undefined,
        onboardingComplete: 1,
      });

      // Persist to in-memory store so all screens have the profile immediately
      // API now returns camelCase so we can pass it directly
      if (savedData) {
        setProfile(savedData as any);
      }
    } catch (e: any) {
      // Profile save failed — still populate the store from form data so the
      // app is usable even without a successful backend write
      console.warn("Profile save failed:", e.message);
      setProfile({
        id: 0,
        firstName: form.firstName,
        lastName: form.lastName,
        country: form.country,
        countryCode: form.countryCode,
        diabetesType: (form.diabetesType || "type2") as any,
        dailyCalorieGoal: form.dailyCalorieGoal,
        maxDailySugar: form.maxDailySugar,
        maxDailyCarbs: form.maxDailyCarbs,
        activityLevel: form.activityLevel as any,
        heightCm: Number(form.heightCm),
        weightKg: Number(form.weightKg),
        age: Number(form.age),
        gender: form.gender as any,
        onboardingComplete: true,
      } as any);
    }
    router.replace("/(tabs)");
  }

  if (checkingProfile) return (
    <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={{ marginTop: 16, fontSize: 14, color: colors.textSecondary }}>
        Setting up your account…
      </Text>
    </View>
  );

  const StepIcon = STEPS[step - 1].icon;

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
          paddingTop: insets.top + spacing.md,
          paddingBottom: insets.bottom + spacing.xxxl,
          paddingHorizontal: spacing.xxl,
        }}>

          {/* Header */}
          <CameraLensLogo size={32} showText textSize={17} />
          <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 20 }}>
            Let's personalise your experience
          </Text>

          {/* Step indicators - sleek capsule progress dots */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
            {STEPS.map((s, idx) => (
              <View key={s.id} style={{ alignItems: "center" }}>
                <View style={{
                  width: step >= s.id ? 36 : 32,
                  height: 32,
                  borderRadius: 16,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: step > s.id ? colors.primary : step === s.id ? colors.primary : `${colors.textPrimary}10`,
                  shadowColor: step === s.id ? colors.primary : "transparent",
                  shadowOffset: { width: 0, height: step === s.id ? 8 : 0 },
                  shadowOpacity: step === s.id ? 0.3 : 0,
                  shadowRadius: step === s.id ? 12 : 0,
                  elevation: step === s.id ? 8 : 0,
                }}>
                  {step > s.id ? (
                    <CheckCircle size={16} color="#fff" strokeWidth={3} />
                  ) : (
                    <Text style={{
                      fontSize: 12,
                      fontWeight: "700",
                      color: step === s.id ? "#fff" : colors.textSecondary,
                    }}>
                      {s.id}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>

          {/* Progress bar */}
          <View style={{
            height: 4,
            backgroundColor: `${colors.textPrimary}10`,
            borderRadius: 2,
            marginBottom: 24,
            overflow: "hidden",
          }}>
            <View style={{
              height: "100%",
              width: `${progress}%`,
              backgroundColor: colors.primary,
              borderRadius: 2,
            }} />
          </View>

          {/* Card - glass-effect */}
          <View style={{
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: `${colors.textPrimary}10`,
            borderRadius: radius.xl,
            padding: spacing.xxl,
            flex: 1,
          }}>

            {/* Step header */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <View style={{
                width: 44,
                height: 44,
                borderRadius: radius.lg,
                backgroundColor: `${colors.primary}15`,
                alignItems: "center",
                justifyContent: "center",
              }}>
                <StepIcon size={22} color={colors.primary} strokeWidth={2} />
              </View>
              <View>
                <Text style={{ fontSize: 16, fontWeight: "800", color: colors.textPrimary }}>
                  {STEPS[step - 1].title}
                </Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                  {STEPS[step - 1].desc}
                </Text>
              </View>
            </View>

            {/* ── STEP 1: Personal Info ── */}
            {step === 1 && (
              <View style={{ gap: 14 }}>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={labelStyle}>FIRST NAME *</Text>
                    <TextInput
                      value={form.firstName}
                      onChangeText={v => update("firstName", v)}
                      placeholder="e.g. Justin"
                      placeholderTextColor={colors.textSecondary}
                      style={inputStyle}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={labelStyle}>LAST NAME *</Text>
                    <TextInput
                      value={form.lastName}
                      onChangeText={v => update("lastName", v)}
                      placeholder="e.g. Smith"
                      placeholderTextColor={colors.textSecondary}
                      style={inputStyle}
                    />
                  </View>
                </View>

                <View style={{
                  backgroundColor: `${colors.primary}10`,
                  borderWidth: 1,
                  borderColor: `${colors.primary}30`,
                  borderRadius: radius.md,
                  padding: 12,
                }}>
                  <Text style={{ fontSize: 12, color: colors.textPrimary, lineHeight: 18 }}>
                    Your name helps us personalise your dashboard and meal recommendations.
                  </Text>
                </View>
              </View>
            )}

            {/* ── STEP 2: Country ── */}
            {step === 2 && (
              <View style={{ gap: 14 }}>
                <View>
                  <Text style={labelStyle}>SELECT YOUR COUNTRY *</Text>
                  <TextInput
                    value={showCountries ? countrySearch : (form.countryFlag ? `${form.countryFlag}  ${form.country}` : "")}
                    onChangeText={v => { setCountrySearch(v); setShowCountries(true); }}
                    onFocus={() => { setShowCountries(true); setCountrySearch(""); }}
                    placeholder="Type or scroll to find your country..."
                    placeholderTextColor={colors.textSecondary}
                    style={inputStyle}
                  />
                </View>

                {showCountries && (
                  <View style={{
                    backgroundColor: colors.background,
                    borderWidth: 1,
                    borderColor: `${colors.textPrimary}15`,
                    borderRadius: radius.lg,
                    maxHeight: 220,
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
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 12,
                            paddingHorizontal: 16,
                            paddingVertical: 12,
                            backgroundColor: pressed ? `${colors.primary}10` : "transparent",
                          })}
                        >
                          <Text style={{ fontSize: 20 }}>{c.flag}</Text>
                          <Text style={{ fontSize: 14, color: colors.textPrimary }}>{c.name}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {form.country && !showCountries && (
                  <View style={{
                    backgroundColor: `${colors.primary}10`,
                    borderWidth: 1,
                    borderColor: `${colors.primary}30`,
                    borderRadius: radius.lg,
                    padding: 16,
                  }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 }}>
                      <Text style={{ fontSize: 32 }}>{form.countryFlag}</Text>
                      <View>
                        <Text style={{ fontWeight: "700", color: colors.textPrimary, fontSize: 15 }}>{form.country}</Text>
                        <Text style={{ fontSize: 12, color: colors.textSecondary }}>Selected country</Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 12, color: colors.textPrimary, lineHeight: 18 }}>
                      The AI will now recognise foods from {form.country}'s cuisine using local names and regional context.
                    </Text>
                  </View>
                )}

                <View style={{
                  backgroundColor: colors.card,
                  borderWidth: 1,
                  borderColor: `${colors.textPrimary}10`,
                  borderRadius: radius.md,
                  padding: 12,
                }}>
                  <Text style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 18 }}>
                    <Text style={{ fontWeight: "700", color: colors.textPrimary }}>Why this matters: </Text>
                    Foods like boerewors, jollof rice, biryani, or pho have unique nutritional profiles. We use your country for accurate, culturally-relevant analysis.
                  </Text>
                </View>
              </View>
            )}

            {/* ── STEP 3: Health Details ── */}
            {step === 3 && (
              <View style={{ gap: 14 }}>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={labelStyle}>HEIGHT (cm) *</Text>
                    <TextInput
                      value={form.heightCm}
                      onChangeText={v => update("heightCm", v)}
                      placeholder="e.g. 175"
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
                      placeholder="e.g. 75"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="numeric"
                      style={inputStyle}
                    />
                  </View>
                </View>

                <View>
                  <Text style={labelStyle}>AGE *</Text>
                  <TextInput
                    value={form.age}
                    onChangeText={v => update("age", v)}
                    placeholder="e.g. 35"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                    style={inputStyle}
                  />
                </View>

                <View>
                  <Text style={labelStyle}>GENDER *</Text>
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    {(["male", "female"] as const).map(g => (
                      <Pressable
                        key={g}
                        onPress={() => update("gender", g)}
                        style={{
                          flex: 1,
                          height: 48,
                          borderRadius: radius.md,
                          borderWidth: 1.5,
                          borderColor: form.gender === g ? colors.primary : `${colors.textPrimary}15`,
                          backgroundColor: form.gender === g ? `${colors.primary}15` : colors.background,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          {g === "male" ? (
                            <User size={16} color={form.gender === g ? colors.primary : colors.textSecondary} strokeWidth={2} />
                          ) : (
                            <User size={16} color={form.gender === g ? colors.primary : colors.textSecondary} strokeWidth={2} />
                          )}
                          <Text style={{
                            fontSize: 14,
                            fontWeight: "600",
                            color: form.gender === g ? colors.primary : colors.textSecondary,
                          }}>
                            {g === "male" ? "Male" : "Female"}
                          </Text>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                </View>

                <View>
                  <Text style={labelStyle}>ACTIVITY LEVEL</Text>
                  <View style={{
                    backgroundColor: `${colors.primary}10`,
                    borderWidth: 1,
                    borderColor: `${colors.primary}30`,
                    borderRadius: radius.md,
                    padding: 12,
                    marginBottom: 10,
                  }}>
                    <Text style={{ fontSize: 12, color: colors.textPrimary, lineHeight: 18 }}>
                      <Text style={{ fontWeight: "700" }}>Why does this matter? </Text>
                      Your activity level helps us calculate how many calories your body burns each day. More active people need more fuel — so we adjust your daily goals to match your lifestyle.
                    </Text>
                  </View>
                  <View style={{ gap: 8 }}>
                    {([
                      { value: "sedentary", label: "Sedentary", desc: "You sit most of the day (desk job, watching TV). Little to no exercise." },
                      { value: "light", label: "Lightly Active", desc: "You do light exercise 1–3 days a week, like casual walks or light housework." },
                      { value: "moderate", label: "Moderately Active", desc: "You exercise 3–5 days a week — gym sessions, jogging, cycling, or an active job." },
                      { value: "active", label: "Very Active", desc: "You exercise hard almost every day — sports, physical labour, or intense training." },
                    ] as const).map(a => (
                      <Pressable
                        key={a.value}
                        onPress={() => update("activityLevel", a.value)}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: 12,
                          borderRadius: radius.md,
                          borderWidth: 1.5,
                          borderLeftWidth: form.activityLevel === a.value ? 4 : 1.5,
                          borderColor: form.activityLevel === a.value ? colors.primary : `${colors.textPrimary}15`,
                          borderLeftColor: form.activityLevel === a.value ? colors.primary : `${colors.textPrimary}15`,
                          backgroundColor: form.activityLevel === a.value ? `${colors.primary}10` : colors.background,
                        }}
                      >
                        <View>
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
              </View>
            )}

            {/* ── STEP 4: Diabetes Type ── */}
            {step === 4 && (
              <View style={{ gap: 12 }}>
                {([
                  {
                    value: "type1",
                    icon: Syringe,
                    label: "Type 1 Diabetes",
                    desc: "Insulin-dependent. Body doesn't produce insulin. Focus on consistent carb intake for accurate insulin dosing.",
                  },
                  {
                    value: "type2",
                    icon: Activity,
                    label: "Type 2 Diabetes",
                    desc: "Insulin resistant. Body doesn't use insulin effectively. Focus on low sugar, low GI foods, and portion control.",
                  },
                  {
                    value: "unsure",
                    icon: HelpCircle,
                    label: "Pre-Diabetes / Unsure",
                    desc: "Blood sugar is higher than normal but not yet Type 2. Focus on prevention through diet and lifestyle.",
                  },
                  {
                    value: "none",
                    icon: ShieldCheck,
                    label: "Health Conscious",
                    desc: "No diabetes. I want to eat healthier, track nutrition, and manage my weight.",
                  },
                ] as const).map(t => {
                  const IconComponent = t.icon;
                  return (
                    <Pressable
                      key={t.value}
                      onPress={() => update("diabetesType", t.value)}
                      style={{
                        padding: 16,
                        borderRadius: radius.lg,
                        borderWidth: 2,
                        borderLeftWidth: form.diabetesType === t.value ? 4 : 2,
                        borderColor: form.diabetesType === t.value ? colors.primary : `${colors.textPrimary}15`,
                        borderLeftColor: form.diabetesType === t.value ? colors.primary : `${colors.textPrimary}15`,
                        backgroundColor: form.diabetesType === t.value ? `${colors.primary}10` : colors.background,
                      }}
                    >
                      <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
                        <View style={{
                          width: 40,
                          height: 40,
                          borderRadius: radius.md,
                          backgroundColor: form.diabetesType === t.value ? colors.primary : `${colors.primary}20`,
                          alignItems: "center",
                          justifyContent: "center",
                        }}>
                          <IconComponent
                            size={20}
                            color={form.diabetesType === t.value ? "#fff" : colors.primary}
                            strokeWidth={2}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 14, fontWeight: "700", color: colors.textPrimary, marginBottom: 4 }}>
                            {t.label}
                          </Text>
                          <Text style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 18 }}>
                            {t.desc}
                          </Text>
                        </View>
                        {form.diabetesType === t.value && (
                          <CheckCircle size={20} color={colors.primary} strokeWidth={2.5} />
                        )}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {/* ── STEP 5: Goals ── */}
            {step === 5 && (
              <View style={{ gap: 14 }}>
                {isCalculating ? (
                  <View style={{ alignItems: "center", paddingVertical: 40, gap: 12 }}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                      GlucoLens AI is calculating your personalised goals...
                    </Text>
                  </View>
                ) : calculatedGoals ? (
                  <>
                    {/* GlucoLens AI Specialist header */}
                    <View style={{
                      backgroundColor: `${colors.primary}15`,
                      borderWidth: 1.5,
                      borderColor: colors.primary,
                      borderRadius: radius.lg,
                      padding: 14,
                    }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <View style={{
                          width: 32, height: 32, borderRadius: 16,
                          backgroundColor: colors.primary,
                          alignItems: "center", justifyContent: "center",
                        }}>
                          <Target size={16} color="#fff" strokeWidth={2.5} />
                        </View>
                        <View>
                          <Text style={{ fontSize: 14, fontWeight: "800", color: colors.primary }}>
                            GlucoLens AI Specialist
                          </Text>
                          <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                            Your personalised daily targets
                          </Text>
                        </View>
                      </View>
                      <Text style={{ fontSize: 13, fontWeight: "700", color: colors.textPrimary, marginBottom: 4 }}>
                        Start your journey with GlucoLens
                        </Text>
                      </View>
                      <Text style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 18 }}>
                        {calculatedGoals.explanation}
                      </Text>
                    </View>

                    {/* Your Daily Goals */}
                    <View style={{ flexDirection: "row", gap: 10 }}>
                      {[
                        { Icon: Flame, value: `${calculatedGoals.dailyCalorieGoal}`, unit: "kcal/day" },
                        { Icon: Droplets, value: `${calculatedGoals.maxDailySugar}g`, unit: "max sugar" },
                        { Icon: Wheat, value: `${calculatedGoals.maxDailyCarbs}g`, unit: "max carbs" },
                      ].map((m, idx) => (
                        <View key={idx} style={{
                          flex: 1,
                          backgroundColor: colors.background,
                          borderWidth: 1,
                          borderColor: `${colors.textPrimary}15`,
                          borderRadius: radius.lg,
                          padding: 12,
                          alignItems: "center",
                        }}>
                          <m.Icon size={20} color={colors.primary} strokeWidth={1.5} style={{ marginBottom: 4 }} />
                          <Text style={{ fontSize: 16, fontWeight: "800", color: colors.textPrimary }}>{m.value}</Text>
                          <Text style={{ fontSize: 10, color: colors.textSecondary, textAlign: "center" }}>{m.unit}</Text>
                        </View>
                      ))}
                    </View>

                    {/* What these numbers mean */}
                    <View style={{
                      backgroundColor: colors.background,
                      borderWidth: 1,
                      borderColor: `${colors.textPrimary}10`,
                      borderRadius: radius.md,
                      padding: 12,
                    }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
                        <Info size={14} color={colors.primary} />
                        <Text style={{ fontSize: 12, fontWeight: "700", color: colors.textPrimary }}>
                          What do these numbers mean?
                        </Text>
                      </View>
                      <Text style={{ fontSize: 11, color: colors.textSecondary, lineHeight: 17, marginBottom: 6 }}>
                        <Text style={{ fontWeight: "700", color: colors.textPrimary }}>Calories </Text>
                        are the energy your body gets from food. Eating too many leads to weight gain; too few and you'll feel tired. Your target is based on your height, weight, age, and activity level.
                      </Text>
                      <Text style={{ fontSize: 11, color: colors.textSecondary, lineHeight: 17, marginBottom: 6 }}>
                        <Text style={{ fontWeight: "700", color: colors.textPrimary }}>Sugar </Text>
                        is what spikes your blood glucose the most. Keeping daily sugar intake low is critical for managing diabetes and preventing energy crashes.
                      </Text>
                      <Text style={{ fontSize: 11, color: colors.textSecondary, lineHeight: 17 }}>
                        <Text style={{ fontWeight: "700", color: colors.textPrimary }}>Carbs (Carbohydrates) </Text>
                        break down into glucose in your body. Monitoring carbs helps you predict blood sugar changes and keep levels stable throughout the day.
                      </Text>
                    </View>

                    {/* BMI section with explanation */}
                    <View style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                      backgroundColor: colors.card,
                      borderWidth: 1,
                      borderColor: `${colors.textPrimary}15`,
                      borderRadius: radius.md,
                      padding: 12,
                    }}>
                      <View style={{ alignItems: "center", minWidth: 48 }}>
                        <Text style={{ fontSize: 16, fontWeight: "800", color: colors.textPrimary }}>
                          {calculatedGoals.bmi}
                        </Text>
                        <Text style={{ fontSize: 10, color: colors.textSecondary }}>BMI</Text>
                      </View>
                      <View style={{ width: 1, height: 32, backgroundColor: `${colors.textPrimary}20` }} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: "700", color: colors.textPrimary }}>
                          {calculatedGoals.bmiCategory}
                        </Text>
                        <Text style={{ fontSize: 10, color: colors.textSecondary, lineHeight: 14 }}>
                          BMI (Body Mass Index) measures if your weight is healthy for your height. It helps us set the right calorie target for you.
                        </Text>
                      </View>
                    </View>

                    {/* Disclaimer */}
                    <View style={{
                      backgroundColor: "#1a1a2e",
                      borderWidth: 1.5,
                      borderColor: "#fbbf24",
                      borderRadius: radius.lg,
                      padding: 14,
                    }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <AlertTriangle size={16} color="#fbbf24" />
                        <Text style={{ fontSize: 12, fontWeight: "800", color: "#fbbf24" }}>
                          IMPORTANT DISCLAIMER
                        </Text>
                      </View>
                      <Text style={{ fontSize: 11, color: colors.textSecondary, lineHeight: 17, marginBottom: 8 }}>
                        GlucoLens was founded by Justin in South Africa, who lives with diabetes and needed an app to better understand his sugar intake for healthier daily decisions.
                      </Text>
                      <Text style={{ fontSize: 11, color: colors.textSecondary, lineHeight: 17, marginBottom: 8 }}>
                        This app is a <Text style={{ fontWeight: "700", color: colors.textPrimary }}>tool and guide</Text> powered by sophisticated AI technology. It is designed to help you make more informed food choices — but it is <Text style={{ fontWeight: "700", color: colors.textPrimary }}>not a substitute for professional medical advice</Text>.
                      </Text>
                      <Text style={{ fontSize: 11, color: "#fbbf24", lineHeight: 17, fontWeight: "600" }}>
                        Your GP or healthcare provider must be consulted at all times for medical decisions regarding your diabetes management.
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
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 12,
                        padding: 14,
                        borderRadius: radius.lg,
                        borderWidth: 2,
                        borderColor: acceptedDisclaimer ? colors.primary : `${colors.textPrimary}20`,
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
                        I understand that GlucoLens is an AI-powered guide and <Text style={{ fontWeight: "700" }}>not a replacement for my doctor</Text>. I will consult my GP for all medical decisions.
                      </Text>
                    </Pressable>

                    <Text style={{ textAlign: "center", fontSize: 11, color: colors.textSecondary }}>
                      You can adjust these goals anytime in your Profile settings.
                    </Text>
                  </>
                ) : (
                  <View style={{ alignItems: "center", paddingVertical: 24, gap: 12 }}>
                    <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: "center" }}>
                      Something went wrong calculating your goals.
                    </Text>
                    <Pressable
                      onPress={() => runGoalCalculation()}
                      style={{
                        paddingHorizontal: 20,
                        paddingVertical: 10,
                        borderRadius: radius.md,
                        borderWidth: 1,
                        borderColor: `${colors.textPrimary}15`,
                      }}
                    >
                      <Text style={{ fontSize: 13, color: colors.textPrimary, fontWeight: "600" }}>Try Again</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            )}

            {/* Navigation buttons */}
            <View style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 24,
              paddingTop: 20,
              borderTopWidth: 1,
              borderTopColor: `${colors.textPrimary}10`,
            }}>
              <Pressable
                onPress={() => step > 1 ? setStep(s => s - 1) : undefined}
                disabled={step === 1}
                style={({ pressed }) => ({
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderRadius: radius.md,
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
                    paddingHorizontal: 24,
                    paddingVertical: 12,
                    borderRadius: radius.lg,
                    backgroundColor: colors.primary,
                    opacity: !canProceed() ? 0.4 : pressed ? 0.8 : 1,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                  })}
                >
                  <Text style={{ fontSize: 15, color: "#fff", fontWeight: "700" }}>Continue</Text>
                  <ChevronRight size={16} color="#fff" strokeWidth={2} />
                </Pressable>
              ) : (
                <Pressable
                  onPress={handleFinish}
                  disabled={upsertProfile.isPending || !calculatedGoals || isCalculating}
                  style={({ pressed }) => ({
                    paddingHorizontal: 24,
                    paddingVertical: 12,
                    borderRadius: radius.lg,
                    backgroundColor: colors.primary,
                    opacity: (upsertProfile.isPending || !calculatedGoals || isCalculating) ? 0.4 : pressed ? 0.8 : 1,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                  })}
                >
                  {upsertProfile.isPending
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <>
                        <Text style={{ fontSize: 15, color: "#fff", fontWeight: "700" }}>Start GlucoLens</Text>
                        <CheckCircle size={16} color="#fff" strokeWidth={2} />
                      </>
                  }
                </Pressable>
              )}
            </View>
          </View>

          <Text style={{
            textAlign: "center",
            fontSize: 12,
            color: colors.textSecondary,
            marginTop: 12,
          }}>
            Step {step} of {STEPS.length} — {STEPS[step - 1].title}
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
