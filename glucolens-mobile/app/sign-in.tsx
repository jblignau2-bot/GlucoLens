/**
 * Sign In screen
 *
 * For returning users who secured their account with an email + password
 * (see app/account.tsx). Signing in swaps this device over to that
 * account: stored device credentials are replaced, the local profile
 * cache is cleared, and all queries refetch against the new user.
 */

import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import Toast from "react-native-toast-message";
import * as Haptics from "expo-haptics";
import { ArrowLeft, LogIn, Info } from "lucide-react-native";
import { colors, radius, shadow } from "@/constants/tokens";
import { supabase } from "@/lib/supabase";
import { storeCredentials } from "@/lib/deviceCredentials";
import { useProfileStore } from "@/stores/profileStore";

function friendlySignInError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) {
    return "Email or password is incorrect. Double-check and try again.";
  }
  if (m.includes("invalid") && m.includes("email")) {
    return "That doesn't look like a valid email address.";
  }
  if (m.includes("network") || m.includes("fetch") || m.includes("connection")) {
    return "Couldn't reach the server. Check your connection and try again.";
  }
  return message;
}

export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const profileStore = useProfileStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSignIn = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: trimmed,
        password,
      });
      if (signInError) {
        setError(friendlySignInError(signInError.message));
        return;
      }
      // Device now belongs to this account: persist the credentials so the
      // boot sign-in flow (_layout.tsx ensureSession) keeps working.
      await storeCredentials(trimmed, password);
      // Drop the previous account's local caches so the signed-in user's
      // profile and data are fetched fresh from the backend.
      await profileStore.clear().catch(() => {});
      queryClient.clear();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: "success", text1: "Signed in", text2: trimmed });
      router.replace("/");
    } catch (e: any) {
      setError(friendlySignInError(e?.message ?? "Something went wrong. Please try again."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header (root Stack hides native headers) */}
      <View
        style={{
          paddingTop: insets.top + 12,
          paddingHorizontal: 16,
          paddingBottom: 16,
          backgroundColor: colors.primary,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: "rgba(255,255,255,0.2)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ArrowLeft size={18} color="#fff" />
        </Pressable>
        <Text style={{ fontSize: 22, fontWeight: "800", color: "#fff", flex: 1 }}>
          Sign In
        </Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: colors.border,
              padding: 16,
              ...shadow.card,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <LogIn size={18} color={colors.primary} />
              <Text style={{ fontSize: 15, fontWeight: "700", color: colors.textPrimary, flex: 1 }}>
                Welcome back
              </Text>
            </View>
            <Text style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 19, marginBottom: 16 }}>
              Sign in with the email and password you used to secure your account.
            </Text>

            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 12, fontWeight: "600", color: colors.textSecondary, marginBottom: 5 }}>
                Email
              </Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                style={{
                  backgroundColor: colors.background,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: radius.md,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  fontSize: 14,
                  color: colors.textPrimary,
                }}
              />
            </View>
            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 12, fontWeight: "600", color: colors.textSecondary, marginBottom: 5 }}>
                Password
              </Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Your password"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                style={{
                  backgroundColor: colors.background,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: radius.md,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  fontSize: 14,
                  color: colors.textPrimary,
                }}
              />
            </View>

            {error && (
              <Text style={{ fontSize: 12, color: colors.risky, lineHeight: 17, marginBottom: 10 }}>
                {error}
              </Text>
            )}

            <Pressable
              onPress={handleSignIn}
              disabled={busy}
              style={({ pressed }) => ({
                height: 48,
                borderRadius: radius.lg,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colors.primary,
                opacity: pressed ? 0.85 : 1,
                marginTop: 4,
              })}
            >
              {busy ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={{ fontWeight: "700", fontSize: 15, color: "#fff" }}>Sign in</Text>
              )}
            </Pressable>
          </View>

          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              gap: 8,
              marginTop: 16,
              paddingHorizontal: 4,
            }}
          >
            <Info size={14} color={colors.textMuted} style={{ marginTop: 2 }} />
            <Text style={{ fontSize: 12, color: colors.textMuted, lineHeight: 17, flex: 1 }}>
              Signing in replaces this device's current data connection. Anything logged under
              the account you're signing into will show up here instead.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
