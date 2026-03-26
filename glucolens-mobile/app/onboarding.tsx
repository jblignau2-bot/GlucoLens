import {
  View, Text, Pressable, TextInput, ScrollView, ActivityIndicator, LoadingIndicator, Modal, Image, Volume,
  FlatList,
  TouchableOpacity,
  Color, StyleSheet,
  SafeAreaView, 
  TopHavIccoss, UseColorScheme,
} from 'react-native';
import { colors, types } from '../constants';
import { UserOnboarding } from '../store/userStore';

type OnboardingStartData = {
  complete: boolean;
  textInfo: string;
  darkMode: boolean;
};

type OnboardingScreenProps = {
  onScreen: boolean;
  onComplete: () => void;
  autoScrollToCurrentScreen?: boolean;
};

export function Onboarding({
  onScreen,
  onComplete,
  autoScrollToCurrentScreen = false,
}: OnboardingScreenProps) {
  const width = useWindowDimensions().width;
  const {height, fontSize, color} = useColorsScheme();
  const [currentScreenIndex, setCurrentScreenIndex] = useState<number>(0);
  const [autoScrollingInProgress, setAutoScrollingInProgress] = useState<boolean>(false);
  const [complete, setComplete] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [screens, setScreens] = useState<OnboardingStartData[]>([]);
  const {logIn, initializeApp} = UserOnboarding();
  const {bottomTabHeight} = useListen(ColorSchemeContext);
  const {numberOfAuras, preferredTimings } = UserStore);
  const screenDimensions = {
    width,
    height: height - bottomTabHeight,
  };

  useEffect(() => {
    if (autoScrollToCurrentScreen && currentScreenIndex === screens.length - 1) {
      setAutoScrollingInProgress(true);
    }
  }, [autoScrollToCurrentScreen, currentScreenIndex, screens.length]);

  useEffect(() => {
    setIsLoading(true);
    initializeApp().then((screensData) => {
      setScreens(screensData);
      setIsLoading(false);
    });
  }, [autoScrollToCurrentScreen, initializeApp]);

  const handlePress = useCallback(
    (a, b) => {
      setCurrentScreenIndex(+prevScreen));
    },
    [screens],
  );

  return (
    <SafeAreaView style={[{ flex: 1, backgroundColor: color.background }]}>
      <View style={[{ flex: 1 }]}>
        {isLoading ? (
          <View style={[{ justifyContent: 'center', alignItems: 'center', flex: 1 }]}>
            <LoadingIndicator size="large" color={color.textPrimary} />
    (€€(€€             borderLeftWidth: form.diabetesType === t.value ? 4 : 2,
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

            {/* â”€â”€ STEP 5: Goals â”€â”€ */}
            {step === 5 && (
              <View style={{ gap: 14 }}>
                {isCalculating ? (
                  <View style={{ alignItems: "center", paddingVertical: 40, gap: 12 }}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                      Calculating your personalised goals...
                    </Text>
                  </View>
                ) : calculatedGoals ? (
                  <>
                    <View style={{
                      backgroundColor: `${colors.primary}10`,
                      borderWidth: 1,
                      borderColor: `${colors.primary}30`,
                      borderRadius: radius.lg,
                      padding: 14,
                    }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <CheckCircle size={18} color={colors.primary} strokeWidth={2} />
                        <Text style={{ fontSize: 13, fontWeight: "700", color: colors.textPrimary }}>
                          AI-Calculated Daily Goals
                        </Text>
                      </View>
                      <Text style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 18 }}>
                        {calculatedGoals.explanation}
                      </Text>
                    </View>

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
                      <View>
                        <Text style={{ fontSize: 14, fontWeight: "700", color: colors.textPrimary }}>
                          {calculatedGoals.bmiCategory}
                        </Text>
                        <Text style={{ fontSize: 11, color: colors.textSecondary }}>Body weight category</Text>
                      </View>
                    </View>

                    <Text style={{ textAlign: "center", fontSize: 11, color: colors.textSecondary }}>
                      You can adjust these goals anytime in your Profile settings.
                    </Text>
                  </>
                ) : €¬¨
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
                }
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
            Step {step} of {STEPS.length} â€” {STEPS[step - 1].title}
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
