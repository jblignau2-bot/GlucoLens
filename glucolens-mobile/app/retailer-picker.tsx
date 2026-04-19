/**
 * Retailer Picker — lets the user pick a preferred SA supermarket.
 * The choice propagates to Foods, Shopping, and Planner for consistent pricing.
 */

import { useEffect } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { Stack, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, Check, Store } from "lucide-react-native";
import { colors, radius, spacing, retailerInfo, type Retailer } from "@/constants/tokens";
import { useRetailerStore } from "@/stores/retailerStore";

const retailers: {
  key: Retailer;
  tagline: string;
  estPerWeek: string;
}[] = [
  { key: "checkers",   tagline: "Everyday low — wide range, strong on fresh", estPerWeek: "Est. R 685 / week" },
  { key: "woolworths", tagline: "Premium quality, great private label",       estPerWeek: "Est. R 890 / week" },
  { key: "picknpay",   tagline: "Mid-range, Smart Shopper rewards",           estPerWeek: "Est. R 720 / week" },
  { key: "shoprite",   tagline: "Budget-friendly staples",                    estPerWeek: "Est. R 625 / week" },
];

export default function RetailerPickerScreen() {
  const { retailer, setRetailer, hydrate, hydrated } = useRetailerStore();

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrated, hydrate]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
          <ChevronLeft size={22} color={colors.textSecondary} strokeWidth={2} />
        </Pressable>
        <Text style={styles.title}>Preferred Retailer</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}>
        <View style={styles.intro}>
          <Store size={18} color={colors.primary} strokeWidth={2} />
          <Text style={styles.introText}>
            Pick where you normally shop. GlucoLens uses this to price your planner, show
            local product suggestions, and estimate your weekly cost.
          </Text>
        </View>

        {retailers.map((r) => {
          const info = retailerInfo[r.key];
          const selected = retailer === r.key;
          return (
            <Pressable
              key={r.key}
              onPress={() => setRetailer(r.key)}
              style={({ pressed }) => [
                styles.card,
                selected && styles.cardSelected,
                pressed && { opacity: 0.85 },
              ]}
            >
              <View style={[styles.dot, { backgroundColor: info.accent }]} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
                  <Text style={styles.name}>{info.name}</Text>
                  <Text style={styles.tier}>· {info.tier}</Text>
                </View>
                <Text style={styles.tagline}>{r.tagline}</Text>
                <Text style={styles.est}>{r.estPerWeek}</Text>
              </View>
              <View style={[styles.radio, selected && styles.radioSelected]}>
                {selected && <Check size={14} color={colors.background} strokeWidth={3} />}
              </View>
            </Pressable>
          );
        })}

        <View style={styles.hint}>
          <Text style={styles.hintText}>
            Prices are estimates based on your current plan. Availability and actual prices vary by store and week.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.border,
    alignItems: "center", justifyContent: "center",
  },
  title: { fontSize: 16, fontWeight: "700", color: colors.textPrimary },
  intro: {
    flexDirection: "row", gap: 10, alignItems: "flex-start",
    backgroundColor: colors.primaryLight,
    borderWidth: 1, borderColor: colors.glassBorder,
    borderRadius: radius.lg, padding: 14, marginBottom: 14,
  },
  introText: { flex: 1, fontSize: 12, color: colors.textSecondary, lineHeight: 17 },
  card: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 14, marginBottom: 10,
  },
  cardSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  dot: { width: 12, height: 12, borderRadius: 6 },
  name: { fontSize: 15, fontWeight: "700", color: colors.textPrimary },
  tier: { fontSize: 11, color: colors.textMuted, textTransform: "capitalize" },
  tagline: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  est: { fontSize: 10, color: colors.textMuted, marginTop: 4, letterSpacing: 0.3 },
  radio: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 1.5, borderColor: colors.border,
    alignItems: "center", justifyContent: "center",
  },
  radioSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  hint: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderLeftWidth: 3, borderLeftColor: colors.primary,
    borderRadius: radius.md, padding: 12, marginTop: 6,
  },
  hintText: { fontSize: 11, color: colors.textSecondary, lineHeight: 16 },
});
