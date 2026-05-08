/**
 * Modal coach screen — slides from bottom, accepts a `context` query param.
 * Used when GlucoBot is opened from a specific surface (mentor card, meal,
 * glucose reading) so the chat starts with the right framing.
 */

import { Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { CoachChat } from "@/components/coach/CoachChat";
import { colors } from "@/constants/tokens";

export default function CoachModal() {
  const router = useRouter();
  const params = useLocalSearchParams<{ context?: string }>();
  const context = typeof params.context === "string" ? params.context : undefined;

  return (
    <CoachChat
      context={context}
      leadingHeader={
        <Pressable
          onPress={() => router.back()}
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: colors.glass,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ArrowLeft size={18} color={colors.textPrimary} />
        </Pressable>
      }
    />
  );
}
