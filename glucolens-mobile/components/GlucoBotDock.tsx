import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { ChevronRight, Sparkles } from "lucide-react-native";
import { colors, radius } from "@/constants/tokens";

interface GlucoBotDockProps {
  context?: string;
  bottomOffset?: number;
}

export function GlucoBotDock({ context, bottomOffset = 88 }: GlucoBotDockProps) {
  const router = useRouter();

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        left: 16,
        right: 16,
        bottom: bottomOffset,
      }}
    >
      <Pressable
        onPress={() => router.push({ pathname: "/coach", params: context ? { context } : {} })}
        style={({ pressed }) => ({
          minHeight: 58,
          borderRadius: radius.lg,
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.glassBorder,
          paddingHorizontal: 14,
          paddingVertical: 10,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          opacity: pressed ? 0.86 : 1,
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.18,
          shadowRadius: 18,
          elevation: 10,
        })}
      >
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: colors.primary,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Sparkles size={17} color={colors.inkOnPrimary} strokeWidth={2.4} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, fontWeight: "800", color: colors.textPrimary }}>
            Ask GlucoBot
          </Text>
          <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }} numberOfLines={1}>
            Food, glucose, meal plans, and quick advice
          </Text>
        </View>
        <ChevronRight size={18} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}
