import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

export default function CoachScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ context?: string }>();
  const context = typeof params.context === "string" ? params.context : undefined;
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      role: "bot",
      text: context
        ? `I'm here. Ask me about ${context.toLowerCase()}, or tell me what you ate and what your glucose did afterwards.`
        : "I'm here. Ask me about a food, glucose reading, meal plan, or habit you want to improve.",
    },
  ]);

  const askMutation = trpc.chat.ask.useMutation({
    onError: (error) => Alert.alert("GlucoBot error", error.message),
  });

  const canSend = input.trim().length > 0 && !askMutation.isPending;

  const contextLine = useMemo(() => {
    if (!context) return "Personal diabetes food coach";
    return context.length > 46 ? `${context.slice(0, 43)}...` : context;
  }, [context]);

  const send = async (text = input) => {
    const question = text.trim();
    if (!question || askMutation.isPending) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: question }]);
    try {
      const result = await askMutation.mutateAsync({ message: question, context });
      setMessages((prev) => [...prev, { role: "bot", text: result.answer }]);
    } catch {
      // handled by mutation onError
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
        {askMutation.isPending && (
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
              disabled={askMutation.isPending}
              style={({ pressed }) => ({
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 999,
                backgroundColor: colors.card,
                borderWidth: 1,
                borderColor: colors.border,
                opacity: pressed || askMutation.isPending ? 0.7 : 1,
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
