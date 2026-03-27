/**
 * StatCard
 *
 * A small metric tile showing a label, value, and unit.
 * Used on Dashboard and Glucose screen summary rows.
 */

import { View, Text } from "react-native";
import { colors, radius, shadow } from "@/constants/tokens";

interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  /** Optional accent color for the value */
  accent?: string;
  /** Optional sub-text below the value (e.g. trend) */
  sub?: string;
}

export function StatCard({ label, value, unit, accent, sub }: StatCardProps) {
  return (
    <View style={{
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      padding: 14,
      ...shadow.card,
    }}>
      <Text style={{
        fontSize: 11,
        fontWeight: "600",
        color: colors.textSecondary,
        textTransform: "uppercase",
        letterSpacing: 0.5,
        marginBottom: 6,
      }}>
        {label}
      </Text>

      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 3 }}>
        <Text style={{
          fontSize: 22,
          fontWeight: "800",
          color: accent ?? colors.textPrimary,
          lineHeight: 26,
        }}>
          {value}
        </Text>
        {unit && (
          <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 2 }}>
            {unit}
          </Text>
        )}
      </View>

      {sub && (
        <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 3 }}>
          {sub}
        </Text>
      )}
    </View>
  );
}
