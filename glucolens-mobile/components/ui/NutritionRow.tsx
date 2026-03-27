/**
 * NutritionRow
 *
 * A single labelled nutrition value row with an optional divider.
 * Used in Results screen nutrition card.
 */

import { View, Text } from "react-native";
import { colors } from "@/constants/tokens";

interface NutritionRowProps {
  label: string;
  value: number | string;
  unit?: string;
  highlight?: boolean;
  noBorder?: boolean;
}

export function NutritionRow({ label, value, unit = "", highlight = false, noBorder = false }: NutritionRowProps) {
  const displayValue = typeof value === "number"
    ? (value % 1 === 0 ? value.toString() : value.toFixed(1))
    : value;

  return (
    <View style={{
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 9,
      borderBottomWidth: noBorder ? 0 : 1,
      borderBottomColor: colors.border,
    }}>
      <Text style={{ fontSize: 14, color: colors.textSecondary, fontWeight: "500" }}>
        {label}
      </Text>
      <Text style={{
        fontSize: 14,
        fontWeight: highlight ? "800" : "700",
        color: highlight ? colors.primary : colors.textPrimary,
      }}>
        {displayValue}
        {unit ? (
          <Text style={{ fontWeight: "400", color: colors.textSecondary }}> {unit}</Text>
        ) : null}
      </Text>
    </View>
  );
}
