/**
 * Dashboard (Home) screen — matches mockup design
 *
 * Shows:
 *  - GlucoLens branding header
 *  - Personalised greeting with diabetes awareness ribbon
 *  - Today's Summary glass card (Calories / Sugar / Carbs with progress bars + %)
 *  - Large central "Scan Your Food" CTA
 *  - Horizontal "Recent Meals" carousel
 */

import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useProfileStore } from "@/stores/profileStore";
import { useAnalysisStore } from "@/stores/analysisStore";
import { colors, radius, shadow } from "@/constants/tokens";
import {
  Utensils,
  Flame,
  Droplets,
  ChevronRight,
  Camera,
  Wheat,
  Ribbon,
  Clock,
} from "lucide-react-native";
import { format, startOfDay, endOfDay } from "date-fns";

const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_WIDTH = SCREEN_WIDTH * 0.42;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ratingColor(
  rating: "safe" | "moderate" | "risky" | undefined,
): string {
  if (rating === "safe") return colors.safe;
  if (rating === "risky") return colors.risky;
  return colors.moderate;
}

function ratingBg(
  rating: "safe" | "moderate" | "risky" | undefined,
): string {
  if (rating === "safe") return colors.safeBg;
  if (rating === "risky") return colors.riskyBg;
  return colors.moderateBg;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

function getMealLabel(loggedAt: string): string {
  const h = new Date(loggedAt).getHours();
  if (h < 11) return "Breakfast";
  if (h < 14) return "Lunch";
  if (h < 17) return "Snack";
  return "Dinner";
}

// ─── Summary stat column ─────────────────────────────────────────────────────

interface SummaryStatProps {
  label: string;
  value: number;
  max: number;
  unit: string;
  barColor: string;
}

function SummaryStat({ label, value, max, unit, barColor }: SummaryStatProps) {
  const pct = Math.min(Math.round((value / Math.max(max, 1)) * 100), 100);
  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <View
        style={{
          backgroundColor: `${barColor}25`,
          paddingHorizontal: 14,
          paddingVertical: 6,
          borderRadius: 20,
          marginBottom: 10,
        }}
      >
        <Text
          style={{
            fontSize: 12,
            fontWeight: "700",
            color: barColor,
          }}
        >
          {label}
        </Text>
      </View>

      <Text
        style={{
          fontSize: 16,
          fontWeight: "800",
          color: colors.textPrimary,
        }}
      >
        {Math.round(value)}
        <Text style={{ fontWeight: "400", color: colors.textSecondary, fontSize: 12 }}>
          {" "},/ {max} {unit}
        </Text>
      </Text>

      {/* Progress bar */}
      <View
        style={{
          width: "85%",
          height: 6,
          backgroundColor: colors.border,
          borderRadius: 3,
          marginTop: 8,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            width: `${pct}%`,
            height: "100%",
            backgroundColor: barColor,
            borderRadius: 3,
          }}
        />
      </View>

      <Text
        style={{
          fontSize: 12,
          fontWeight: "600",
          color: colors.textSecondary,
          marginTop: 4,
        }}
      >
        {pct}%
      </Text>
  
  
   5�T���
  
    
    
    
      
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
      
    
  
��}
