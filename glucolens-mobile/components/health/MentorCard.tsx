/**
 * MentorCard — One human-toned daily observation. Tap → opens the Coach
 * modal pre-seeded with the message context, so the user can ask a follow-up.
 */

import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Sparkles, ChevronRight } from "lucide-react-native";
import { colors, radius } from "@/constants/tokens";
import type { MentorMessage } from "@/lib/health/mentor";

const TONE_STYLE: Record<MentorMessage["tone"], { accent: string; tint: string }> = {
  celebrate: { accent: colors.safe,     tint: colors.safeBg },
  nudge:     { accent: colors.primary,  tint: colors.primaryLight },
  concern:   { accent: colors.risky,    tint: colors.riskyBg },
  neutral:   { accent: colors.textMuted, tint: colors.cardAlt },
};

interface Props {
  message: MentorMessage;
}

export function MentorCard({ message }: Props) {
  const router = useRouter();
  const { accent, tint } = TONE_STYLE[message.tone];

  return (
    <Pressable
      onPress={() => router.push({ pathname: "/coach", params: { context: message.title } })}
      style={({ pressed }) => ({
        backgroundColor: colors.card,
        borderRadius: radius.xl,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 16,
        flexDirection: "row",
        gap: 14,
        alignItems: "center",
        opacity: pressed ? 0.92 : 1,
      })}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 14,
          backgroundColor: tint,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          borderColor: accent + "33",
        }}
      >
        <Sparkles size={20} color={accent} strokeWidth={2.2} />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 10,
            fontWeight: "700",
            color: accent,
            letterSpacing: 1.2,
            textTransform: "uppercase",
          }}
        >
          GlucoBot · today
        </Text>
        <Text
          style={{
            fontSize: 15,
            fontWeight: "800",
            color: colors.textPrimary,
            marginTop: 2,
            lineHeight: 19,
          }}
          numberOfLines={2}
        >
          {message.title}
        </Text>
        {message.body && (
          <Text
            style={{
              fontSize: 12,
              color: colors.textSecondary,
              marginTop: 3,
              lineHeight: 16,
            }}
            numberOfLines={2}
          >
            {message.body}
          </Text>
        )}
      </View>
      <ChevronRight size={16} color={colors.textMuted} />
    </Pressable>
  );
}
