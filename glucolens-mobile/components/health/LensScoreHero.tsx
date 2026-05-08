/**
 * LensScoreHero — circular dial showing today's composite Lens Score (0–100).
 *
 * Drawn with react-native-svg so it renders cleanly on every Android density
 * without bitmap blur. The arc fills clockwise from the top, transitions
 * through coral → green as the score rises, and exposes a single tap target
 * for "see what makes this number."
 */

import { View, Text, Pressable } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import { colors, fonts, fontSize } from "@/constants/tokens";
import type { LensScore } from "@/lib/health/metrics";

const SIZE = 200;
const STROKE = 14;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface Props {
  score: LensScore;
  /** Greeting line displayed above the score (e.g. "Morning, Justin."). */
  greeting?: string;
  onPress?: () => void;
}

export function LensScoreHero({ score, greeting, onPress }: Props) {
  const safeScore = Math.max(0, Math.min(score.score, 100));
  const dash = (safeScore / 100) * CIRCUMFERENCE;
  const arcOffset = CIRCUMFERENCE - dash;

  const bandLabel: Record<LensScore["band"], string> = {
    "great": "Great day",
    "good": "On track",
    "fair": "Building it",
    "needs work": "Let's reset",
  };

  const Wrapper: typeof Pressable = onPress ? Pressable : View as never;

  return (
    <Wrapper
      {...(onPress ? { onPress } : {})}
      style={{
        backgroundColor: colors.card,
        borderRadius: 28,
        borderWidth: 1,
        borderColor: colors.border,
        paddingVertical: 24,
        paddingHorizontal: 18,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.05,
        shadowRadius: 14,
        elevation: 3,
      }}
    >
      {greeting && (
        <Text
          style={{
            fontSize: 12,
            color: colors.textMuted,
            fontWeight: "700",
            letterSpacing: 0.8,
            textTransform: "uppercase",
            marginBottom: 4,
          }}
        >
          {greeting}
        </Text>
      )}
      <Text
        style={{
          fontSize: 13,
          color: colors.textSecondary,
          fontWeight: "600",
          marginBottom: 14,
        }}
      >
        Lens Score · {bandLabel[score.band]}
      </Text>

      <View style={{ width: SIZE, height: SIZE, alignItems: "center", justifyContent: "center" }}>
        <Svg width={SIZE} height={SIZE} style={{ position: "absolute" }}>
          <Defs>
            <LinearGradient id="lens-grad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={colors.primary} stopOpacity={1} />
              <Stop offset="1" stopColor={colors.safe} stopOpacity={0.85} />
            </LinearGradient>
          </Defs>
          {/* Track */}
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            stroke={colors.borderLight}
            strokeWidth={STROKE}
            fill="none"
          />
          {/* Progress arc — rotated 270° so it fills from the top */}
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            stroke="url(#lens-grad)"
            strokeWidth={STROKE}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
            strokeDashoffset={arcOffset}
            transform={`rotate(-90, ${SIZE / 2}, ${SIZE / 2})`}
          />
        </Svg>

        <View style={{ alignItems: "center" }}>
          <Text
            style={{
              fontFamily: fonts.serifBold,
              fontSize: fontSize.score,
              color: colors.textPrimary,
              lineHeight: fontSize.score + 4,
              letterSpacing: -1.5,
            }}
          >
            {safeScore}
          </Text>
          <Text
            style={{
              fontSize: 11,
              fontWeight: "700",
              color: colors.textMuted,
              letterSpacing: 1.4,
              textTransform: "uppercase",
              marginTop: 2,
            }}
          >
            of 100
          </Text>
        </View>
      </View>

      <View
        style={{
          flexDirection: "row",
          marginTop: 18,
          gap: 16,
          paddingTop: 14,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          width: "100%",
          justifyContent: "center",
        }}
      >
        <Component label="Glucose" value={score.components.glucose} />
        <Component label="Carbs" value={score.components.carbs} />
        <Component label="Steps" value={score.components.steps} />
      </View>
    </Wrapper>
  );
}

function Component({ label, value }: { label: string; value?: number }) {
  return (
    <View style={{ alignItems: "center", minWidth: 64 }}>
      <Text
        style={{
          fontFamily: fonts.serifBold,
          fontSize: 18,
          color: value === undefined ? colors.textFaint : colors.textPrimary,
        }}
      >
        {value === undefined ? "—" : value}
      </Text>
      <Text
        style={{
          fontSize: 10,
          fontWeight: "700",
          color: colors.textMuted,
          letterSpacing: 0.6,
          textTransform: "uppercase",
          marginTop: 2,
        }}
      >
        {label}
      </Text>
    </View>
  );
}
