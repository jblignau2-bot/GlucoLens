/**
 * Foods explorer — quick-reference list of common foods grouped by
 * blood-sugar impact. Pure-static for now: a future iteration can swap
 * in user-specific picks driven by the AI coach.
 */

import {
  View,
  Text,
  Pressable,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, ThumbsUp, ThumbsDown, Minus, BookOpen } from "lucide-react-native";
import { colors, radius, fonts } from "@/constants/tokens";

type Category = "enjoy" | "moderate" | "avoid";

interface FoodEntry {
  name: string;
  note: string;
}

const SECTIONS: { key: Category; title: string; subtitle: string; items: FoodEntry[] }[] = [
  {
    key: "enjoy",
    title: "Enjoy freely",
    subtitle: "Low-GI, high-fibre, blood-sugar friendly",
    items: [
      { name: "Leafy greens", note: "Spinach, kale, rocket — minimal carbs" },
      { name: "Eggs", note: "Protein + fats with no glucose spike" },
      { name: "Berries", note: "Strawberries, blueberries — fibre-rich" },
      { name: "Avocado", note: "Healthy fats, slows glucose absorption" },
      { name: "Lentils & beans", note: "Slow-release carbs, plant protein" },
      { name: "Greek yogurt (plain)", note: "Protein-forward, low sugar" },
      { name: "Nuts & seeds", note: "Almonds, chia, flax — keep portions ~30 g" },
      { name: "Oily fish", note: "Salmon, sardines — omega-3, no carbs" },
    ],
  },
  {
    key: "moderate",
    title: "Eat in moderation",
    subtitle: "Watch portions and pair with protein or fat",
    items: [
      { name: "Whole-grain bread", note: "1 slice with protein, not 3 alone" },
      { name: "Brown rice", note: "Stick to ½ cup cooked, add veg" },
      { name: "Sweet potato", note: "Lower-GI than white potato — keep small" },
      { name: "Fruit (apples, pears)", note: "Whole fruit fine, juice spikes hard" },
      { name: "Pasta (whole-wheat)", note: "Cook al dente, pair with veg + protein" },
      { name: "Dark chocolate (70%+)", note: "1–2 squares, not the whole bar" },
    ],
  },
  {
    key: "avoid",
    title: "Best to avoid",
    subtitle: "Fast-acting carbs and added sugars",
    items: [
      { name: "Sugary drinks", note: "Sodas, sweet teas, energy drinks — instant spike" },
      { name: "White bread & rolls", note: "Refined flour, very high GI" },
      { name: "Sweets & candy", note: "Pure sugar, no fibre to slow it down" },
      { name: "Fruit juice", note: "Sugar without the fibre of whole fruit" },
      { name: "Pastries & doughnuts", note: "Refined carbs + sugar combo" },
      { name: "Sweetened breakfast cereals", note: "Often >12 g sugar per serving" },
    ],
  },
];

const CATEGORY_STYLE: Record<Category, { color: string; bg: string; icon: typeof ThumbsUp }> = {
  enjoy:    { color: colors.safe,     bg: colors.safeBg,     icon: ThumbsUp },
  moderate: { color: colors.moderate, bg: colors.moderateBg, icon: Minus },
  avoid:    { color: colors.risky,    bg: colors.riskyBg,    icon: ThumbsDown },
};

export default function FoodsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 32,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={{
              width: 36, height: 36, borderRadius: 18,
              backgroundColor: colors.card,
              borderWidth: 1, borderColor: colors.border,
              alignItems: "center", justifyContent: "center",
            }}
          >
            <ArrowLeft size={18} color={colors.textPrimary} />
          </Pressable>
          <View style={{ marginLeft: 14, flex: 1 }}>
            <Text style={{
              fontFamily: fonts.serifBold,
              fontSize: 22,
              color: colors.textPrimary,
            }}>
              Foods
            </Text>
            <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
              Quick-reference guide for blood-sugar impact
            </Text>
          </View>
        </View>

        {/* Sections */}
        {SECTIONS.map((section) => {
          const style = CATEGORY_STYLE[section.key];
          const Icon = style.icon;
          return (
            <View
              key={section.key}
              style={{
                backgroundColor: colors.card,
                borderRadius: radius.xl,
                borderWidth: 1, borderColor: colors.border,
                marginBottom: 14,
                overflow: "hidden",
              }}
            >
              <View style={{
                paddingHorizontal: 16,
                paddingVertical: 14,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              }}>
                <View style={{
                  width: 36, height: 36, borderRadius: 12,
                  backgroundColor: style.bg,
                  alignItems: "center", justifyContent: "center",
                }}>
                  <Icon size={18} color={style.color} strokeWidth={2.2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: "800", color: colors.textPrimary }}>
                    {section.title}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 1 }}>
                    {section.subtitle}
                  </Text>
                </View>
              </View>
              {section.items.map((item, idx) => (
                <View
                  key={item.name}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderTopWidth: idx === 0 ? 0 : 1,
                    borderTopColor: colors.border,
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: "700", color: colors.textPrimary }}>
                    {item.name}
                  </Text>
                  <Text
                    style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2, lineHeight: 17 }}
                    numberOfLines={2}
                  >
                    {item.note}
                  </Text>
                </View>
              ))}
            </View>
          );
        })}

        {/* Footer link to Guide */}
        <Pressable
          onPress={() => router.push("/(tabs)/reminders")}
          style={({ pressed }) => ({
            marginTop: 4,
            backgroundColor: colors.card,
            borderRadius: radius.lg,
            borderWidth: 1, borderColor: colors.glassBorder,
            padding: 14,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <View style={{
            width: 36, height: 36, borderRadius: 10,
            backgroundColor: colors.primaryLight,
            alignItems: "center", justifyContent: "center",
          }}>
            <BookOpen size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: colors.textPrimary }}>
              Read the full Guide
            </Text>
            <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 1 }}>
              Plate method, GI/GL, recipes
            </Text>
          </View>
        </Pressable>

        <Text style={{
          fontSize: 11,
          color: colors.textMuted,
          textAlign: "center",
          marginTop: 20,
          lineHeight: 16,
          paddingHorizontal: 16,
        }}>
          Educational only — not medical advice. Always follow your healthcare provider's plan.
        </Text>
      </ScrollView>
    </View>
  );
}
