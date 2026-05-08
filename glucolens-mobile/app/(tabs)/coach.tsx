/**
 * Coach tab — GlucoBot landing.
 *
 * Same chat as the modal coach, but always-on at the bottom of the tab bar.
 * No "back" button (this is a tab, not a modal).
 */

import { View } from "react-native";
import { CoachChat } from "@/components/coach/CoachChat";
import { TAB_BAR_HEIGHT } from "@/constants/tokens";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TOPIC_PROMPTS = [
  "What should I eat next?",
  "Best snack for low energy",
  "How do I avoid dawn highs?",
  "Plan a low-carb dinner",
  "Walking or weights for glucose?",
  "Read a meal label for me",
];

export default function CoachTab() {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        flex: 1,
        // Reserve room for the floating tab bar so the input doesn't sit
        // underneath it.
        paddingBottom: TAB_BAR_HEIGHT + insets.bottom - 12,
      }}
    >
      <CoachChat
        applyTopInset
        subtitle="Daily food, glucose, and habit coach"
        quickPrompts={TOPIC_PROMPTS}
      />
    </View>
  );
}
