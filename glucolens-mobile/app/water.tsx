/**
 * Water tracker — local-only daily cup counter.
 *
 * Persists `{ date, cups }` in AsyncStorage. Resets automatically on a
 * new calendar day. Eight cups (≈ 2 L) is the default daily target.
 */

import {
  View,
  Text,
  Pressable,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useEffect, useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { ArrowLeft, Droplets, Minus, Plus, RotateCcw } from "lucide-react-native";
import { colors, radius, fonts } from "@/constants/tokens";

const STORAGE_KEY = "@glucolens/water";
const DAILY_GOAL = 8;
const ML_PER_CUP = 250;

interface WaterRecord {
  date: string; // YYYY-MM-DD
  cups: number;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function WaterScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [cups, setCups] = useState(0);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as WaterRecord;
          if (parsed.date === todayKey()) {
            setCups(parsed.cups);
          }
        }
      } catch {
        // ignore — start at 0
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  const persist = useCallback(async (next: number) => {
    try {
      const record: WaterRecord = { date: todayKey(), cups: next };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    } catch {
      // best-effort
    }
  }, []);

  const change = (delta: number) => {
    Haptics.selectionAsync().catch(() => {});
    setCups((c) => {
      const next = Math.max(0, Math.min(c + delta, 99));
      persist(next);
      return next;
    });
  };

  const reset = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setCups(0);
    persist(0);
  };

  const pct = Math.min(Math.round((cups / DAILY_GOAL) * 100), 100);
  const goalReached = cups >= DAILY_GOAL;

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
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 24 }}>
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
          <Text style={{
            fontFamily: fonts.serifBold,
            fontSize: 22,
            color: colors.textPrimary,
            marginLeft: 14,
          }}>
            Water
          </Text>
        </View>

        {/* Hero ring */}
        <View style={{
          backgroundColor: colors.card,
          borderRadius: radius.xl,
          borderWidth: 1, borderColor: colors.border,
          padding: 28,
          alignItems: "center",
          marginBottom: 18,
        }}>
          <View style={{
            width: 156, height: 156, borderRadius: 78,
            backgroundColor: colors.primaryLight,
            alignItems: "center", justifyContent: "center",
            borderWidth: 3, borderColor: goalReached ? colors.safe : colors.primary,
            marginBottom: 18,
          }}>
            <Droplets size={32} color={colors.primary} strokeWidth={1.6} />
            <Text style={{
              fontFamily: fonts.serifBold,
              fontSize: 38,
              color: colors.textPrimary,
              marginTop: 6,
              lineHeight: 42,
            }}>
              {cups}
            </Text>
            <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2, letterSpacing: 0.6 }}>
              of {DAILY_GOAL} cups
            </Text>
          </View>

          {/* Progress bar */}
          <View style={{
            width: "100%",
            height: 8,
            backgroundColor: "rgba(255,255,255,0.06)",
            borderRadius: 4,
            overflow: "hidden",
            marginBottom: 8,
          }}>
            <View style={{
              width: `${pct}%`,
              height: "100%",
              backgroundColor: goalReached ? colors.safe : colors.primary,
              borderRadius: 4,
            }} />
          </View>
          <Text style={{ fontSize: 12, color: colors.textSecondary }}>
            {(cups * ML_PER_CUP).toLocaleString()} ml · {pct}%
          </Text>
        </View>

        {/* +/- buttons */}
        <View style={{ flexDirection: "row", gap: 12, marginBottom: 12 }}>
          <Pressable
            onPress={() => change(-1)}
            disabled={!hydrated || cups === 0}
            style={({ pressed }) => ({
              flex: 1, height: 64, borderRadius: radius.lg,
              backgroundColor: colors.card,
              borderWidth: 1.5, borderColor: colors.border,
              alignItems: "center", justifyContent: "center",
              flexDirection: "row", gap: 8,
              opacity: !hydrated || cups === 0 ? 0.4 : pressed ? 0.7 : 1,
            })}
          >
            <Minus size={18} color={colors.textPrimary} />
            <Text style={{ fontSize: 15, fontWeight: "700", color: colors.textPrimary }}>
              Remove
            </Text>
          </Pressable>
          <Pressable
            onPress={() => change(1)}
            disabled={!hydrated}
            style={({ pressed }) => ({
              flex: 1, height: 64, borderRadius: radius.lg,
              backgroundColor: colors.primary,
              alignItems: "center", justifyContent: "center",
              flexDirection: "row", gap: 8,
              opacity: !hydrated ? 0.6 : pressed ? 0.85 : 1,
            })}
          >
            <Plus size={18} color={colors.background} strokeWidth={2.4} />
            <Text style={{ fontSize: 15, fontWeight: "800", color: colors.background }}>
              Add cup
            </Text>
          </Pressable>
        </View>

        <Pressable
          onPress={reset}
          disabled={!hydrated || cups === 0}
          style={({ pressed }) => ({
            height: 44, borderRadius: radius.md,
            alignItems: "center", justifyContent: "center",
            flexDirection: "row", gap: 6,
            opacity: !hydrated || cups === 0 ? 0.4 : pressed ? 0.7 : 1,
          })}
        >
          <RotateCcw size={14} color={colors.textSecondary} />
          <Text style={{ fontSize: 13, fontWeight: "600", color: colors.textSecondary }}>
            Reset today
          </Text>
        </Pressable>

        {/* Tip card */}
        <View style={{
          marginTop: 18,
          backgroundColor: colors.card,
          borderRadius: radius.lg,
          borderWidth: 1, borderColor: colors.border,
          padding: 14,
        }}>
          <Text style={{
            fontSize: 11,
            fontWeight: "700",
            color: colors.textMuted,
            letterSpacing: 1,
            marginBottom: 6,
          }}>
            WHY IT MATTERS
          </Text>
          <Text style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 19 }}>
            Steady hydration helps the kidneys flush excess glucose and supports
            stable blood sugar. Aim for {DAILY_GOAL} cups (~{(DAILY_GOAL * ML_PER_CUP) / 1000} L)
            spread across the day.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
