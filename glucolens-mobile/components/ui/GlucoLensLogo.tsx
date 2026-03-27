/**
 * GlucoLens brand logo — a digital camera lens with optional wordmark.
 * Uses react-native-svg (already in package.json).
 */
import { View, Text } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { colors } from "@/constants/tokens";

interface Props {
  /** Overall size of the lens icon in px */
  size?: number;
  /** Show "GlucoLens" text next to the icon */
  showText?: boolean;
  /** Font size for the wordmark (defaults to size * 0.45) */
  textSize?: number;
}

export function CameraLensLogo({ size = 40, showText = false, textSize }: Props) {
  const fs = textSize ?? Math.round(size * 0.45);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <Svg width={size} height={size} viewBox="0 0 40 40">
        {/* ── Outer body ring ── */}
        <Circle
          cx="20" cy="20" r="19"
          fill={colors.primaryLight}
          stroke={colors.primary}
          strokeWidth="2"
        />
        {/* ── Lens-mount ring ── */}
        <Circle
          cx="20" cy="20" r="13.5"
          fill="none"
          stroke={colors.primary}
          strokeWidth="1.5"
          strokeOpacity="0.45"
        />
        {/* ── Lens glass body ── */}
        <Circle cx="20" cy="20" r="9.5" fill={colors.primaryDark} />
        {/* ── Iris ring ── */}
        <Circle cx="20" cy="20" r="5.5" fill="#0a5c56" />
        {/* ── Aperture ── */}
        <Circle cx="20" cy="20" r="2.5" fill="#041f1d" />
        {/* ── Glass reflections ── */}
        <Circle cx="16.5" cy="16.5" r="1.8" fill="white" fillOpacity="0.45" />
        <Circle cx="23.5" cy="15.5" r="0.8" fill="white" fillOpacity="0.25" />
      </Svg>

      {showText && (
        <Text style={{
          fontSize: fs,
          fontWeight: "700",
          color: colors.textPrimary,
          letterSpacing: -0.3,
        }}>
          GlucoLens
        </Text>
      )}
    </View>
  );
}
