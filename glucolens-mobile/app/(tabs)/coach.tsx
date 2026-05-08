/**
 * Coach tab — GlucoBot landing.
 *
 * Same chat as the modal coach, but always-on at the bottom of the tab bar.
 * No "back" button (this is a tab, not a modal).
 */

import { View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { CoachChat } from "@/components/coach/CoachChat";
import { TAB_BAR_HEIGHT } from "@/constants/tokens";

const TOPIC_PROMPTS = [
  "What should I eat next?",
  "Best snack for low energy",
  "How do I avoid dawn highs?",
  "Plan a low-carb dinner",
  "Walking or weights for glucose?",
  "Read a meal label for me",
];

export default function CoachTab() {
  // Optional context param — when navigating from the home Mentor card we
  // pass the headline so the chat opens with the right framing.
  const params = useLocalSearchParams<{ context?: string }>();
  const context = typeof params.context === "string" ? params.context : undefined;

  // Reserve room for the floating tab bar above the chat input.
  // CoachChat already pads its own input by `insets.bottom + 12`, so we add
  // exactly TAB_BAR_HEIGHT here to avoid double-padding the safe area.
  return (
    <View style={{ flex: 1, paddingBottom: TAB_BAR_HEIGHT }}>
      <CoachChat
        applyTopInset
        context={context}
        subtitle={context ?? "Daily food, glucose, and habit coach"}
        quickPrompts={TOPIC_PROMPTS}
      />
    </View>
  );
}
