import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, Send, Sparkles } from "lucide-react-native";
import { trpc } from "@/lib/trpc";
import { colors, radius } from "@/constants/tokens";

type ChatMessage = {
  role: "user" | "bot";
  text: string;
};

const QUICK_PROMPTS = [
  "What should I eat next?",
  "Explain my meal plan",
  "How can I avoid a glucose spike?",
  "Give me a low-carb snack idea",
];

function getFriendlyChatError(message?: string) {
  const text = message?.toLowerCase() ?? "";
  if (
    text.includes("network") ||
    text.includes("fetch") ||
    text.includes("transform response") ||
    text.includes("failed to fetch")
  ) {
    return "I can't reach the GlucoBot service right now. Check the backend URL or try again once the API is online.";
  }
  return "I couldn't complete that answer just now. Please try again in a moment.";
}

function getMockBotAnswer(question: string, context?: string) {
  const text = question.toLowerCase();
  const contextText = context ? ` For ${context.toLowerCase()},` : "";

  if (text.includes("meal plan")) {
    return `${contextText || "For your meal plan,"} focus on steady carbs across the day: pair each carb serving with protein, add vegetables first, and keep a backup snack ready for long gaps between meals.`;
  }

  if (text.includes("spike") || text.includes("glucose")) {
    return "To reduce a glucose spike, start with fiber or vegetables, add protein, keep the portion moderate, and take a short walk after eating if that is safe for you.";
  }

  if (text.includes("snack")) {
    return "A steady snack idea: plain Greek yogurt with nuts, boiled eggs with cucumber, or hummus with vegetable sticks. Keep fruit portions smaller and pair them with protein.";
  }

  if (text.includes("eat")) {
    return "A balanced next meal could be grilled chicken or beans, a generous non-starchy vegetable portion, and a measured low-GI carb like lentils, brown rice, or sweet potato.";
  }

  return "I would keep this practical: choose a protein, add high-fiber vegetables, measure the carb portion, and check how your body responds. This is mock mode, so no real AI/backend call was made.";
}

export default function CoachScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ context?: string }>();
  const context = typeof params.context === "string" ? params.context : undefined;
  const useMockBot =
    __DEV__ && process.env.EXPO_PUBLIC_MOCK_BOT === "true";
  const [input, setInput] = useState("");
  const [mockPending, setMockPending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      role: "bot",
      text: context
        ? `I'm here. Ask me about ${context.toLowerCase()}, or tell me what you ate and what your glucose did afterwards.`
        : "I'm here. Ask me about a food, glucose reading, meal plan, or habit you want to improve.",
    },
  ]);

  const askMutation = trpc.chat.ask.useMutation();

  const isPending = askMutation.isPending || mockPending;
  const canSend = input.trim().length > 0 && !isPending;

  const contextLine = useMemo(() => {
    if (!context) return "Personal diabetes food coach";
    return context.length > 46 ? `${context.slice(0, 43)}...` : context;
  }, [context]);

  const send = async (text = input) => {
    const question = text.trim();
    if (!question || isPending) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: question }]);

    if (useMockBot) {
      setMockPending(true);
      setTimeout(() => {
        setMessages((prev) => [...prev, { role: "bot", text: getMockBotAnswer(question, context) }]);
        setMockPending(false);
      }, 450);
      return;
    }

    try {
      const result = await askMutation.mutateAsync({ message: question, context });
      setMessages((prev) => [...prev, { role: "bot", text: result.answer }]);
    } catch (error) {
      const message = error instanceof Error ? error.message : undefined;
      setMessages((prev) => [...prev, { role: "bot", text: getFriendlyChatError(message) }]);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View
        style={{
          paddingTop: insets.top + 12,
          paddingHorizontal: 18,
          paddingBottom: 14,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          backgroundColor: colors.card,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        }}
      >
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
        <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}>
          <Sparkles size={18} color={colors.background} strokeWidth={2.4} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontWeight: "800", color: colors.textPrimary }}>GlucoBot</Text>
          <Text style={{ fontSize: 11, color: colors.textSecondary }} numberOfLines={1}>{contextLine}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((message, index) => {
          const isUser = message.role === "user";
          return (
            <View
              key={`${message.role}-${index}`}
              style={{
                alignSelf: isUser ? "flex-end" : "flex-start",
                maxWidth: "86%",
                backgroundColor: isUser ? colors.primary : colors.card,
                borderWidth: isUser ? 0 : 1,
                borderColor: colors.border,
                borderRadius: radius.lg,
                paddingHorizontal: 14,
                paddingVertical: 11,
                marginBottom: 10,
              }}
            >
              <Text style={{ fontSize: 13, lineHeight: 19, color: isUser ? colors.background : colors.textPrimary }}>
                {message.text}
              </Text>
            </View>
          );
        })}
        {isPending && (
          <View style={{ alignSelf: "flex-start", backgroundColor: colors.card, borderRadius: radius.lg, padding: 12, borderWidth: 1, borderColor: colors.border }}>
            <ActivityIndicator color={colors.primary} size="small" />
          </View>
        )}
      </ScrollView>

      <View style={{ paddingHorizontal: 14, paddingBottom: insets.bottom + 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 10 }}>
          {QUICK_PROMPTS.map((prompt) => (
            <Pressable
              key={prompt}
              onPress={() => send(prompt)}
              disabled={isPending}
              style={({ pressed }) => ({
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 999,
                backgroundColor: colors.card,
                borderWidth: 1,
                borderColor: colors.border,
                opacity: pressed || isPending ? 0.7 : 1,
              })}
            >
              <Text style={{ fontSize: 11, fontWeight: "700", color: colors.textSecondary }}>{prompt}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ask GlucoBot..."
            placeholderTextColor={colors.textMuted}
            multiline
            style={{
              flex: 1,
              maxHeight: 96,
              minHeight: 46,
              borderRadius: radius.lg,
              backgroundColor: colors.card,
              borderWidth: 1,
              borderColor: colors.border,
              color: colors.textPrimary,
              paddingHorizontal: 14,
              paddingVertical: 11,
              fontSize: 14,
            }}
          />
          <Pressable
            onPress={() => send()}
            disabled={!canSend}
            style={{
              width: 46,
              height: 46,
              borderRadius: 23,
              backgroundColor: canSend ? colors.primary : colors.border,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Send size={17} color={colors.background} strokeWidth={2.4} />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
