/**
 * Account & Sign In screen
 *
 * The app silently creates a per-device Supabase account on first launch
 * (random device_*@glucolens.app email + password in SecureStore). This
 * screen lets the user optionally attach a real email + password to that
 * account so their data can be recovered on another phone.
 *
 * Two states, detected via supabase.auth.getUser():
 *  - Device account (email matches /^device_.*@glucolens\.app$/): show the
 *    "secure your account" form.
 *  - Secured account: show the linked email + a change-password form.
 *
 * Reached from the Profile tab.
 */

import { useEffect, useState } from "react";
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
import Toast from "react-native-toast-message";
import * as Haptics from "expo-haptics";
import {
  ArrowLeft,
  ShieldCheck,
  Smartphone,
  Mail,
  KeyRound,
  ChevronDown,
  ChevronUp,
} from "lucide-react-native";
import { colors, radius, shadow } from "@/constants/tokens";
import { supabase } from "@/lib/supabase";
import { storeCredentials, DEVICE_EMAIL_RE } from "@/lib/deviceCredentials";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Map raw Supabase auth errors to readable copy. */
function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("already registered") || m.includes("already been registered") || m.includes("already in use")) {
    return "That email is already registered to another account. Try signing in with it instead, or use a different email.";
  }
  if (m.includes("password") && (m.includes("at least") || m.includes("weak") || m.includes("short"))) {
    return "That password is too weak. Use at least 8 characters.";
  }
  if (m.includes("invalid") && m.includes("email")) {
    return "That doesn't look like a valid email address.";
  }
  if (m.includes("network") || m.includes("fetch") || m.includes("connection")) {
    return "Couldn't reach the server. Check your connection and try again.";
  }
  return message;
}

function isValidEmail(email: string): boolean {
  return /^\S+@\S+\.\S+$/.test(email.trim());
}

function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  secure,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  secure?: boolean;
  keyboardType?: "default" | "email-address";
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ fontSize: 12, fontWeight: "600", color: colors.textSecondary, marginBottom: 5 }}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? label}
        placeholderTextColor={colors.textMuted}
        secureTextEntry={secure}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType={keyboardType ?? "default"}
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
  );
}

function PrimaryButton({
  label,
  onPress,
  busy,
  disabled,
}: {
  label: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={busy || disabled}
      style={({ pressed }) => ({
        height: 48,
        borderRadius: radius.lg,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: disabled ? colors.cardAlt : colors.primary,
        borderWidth: disabled ? 1 : 0,
        borderColor: colors.border,
        opacity: pressed ? 0.85 : 1,
        marginTop: 4,
      })}
    >
      {busy ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : (
        <Text style={{ fontWeight: "700", fontSize: 15, color: disabled ? colors.textSecondary : "#fff" }}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

function ErrorText({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <Text style={{ fontSize: 12, color: colors.risky, lineHeight: 17, marginBottom: 10 }}>
      {message}
    </Text>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

type AccountState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "device"; email: string }
  | { kind: "pending"; email: string; newEmail: string }
  | { kind: "secured"; email: string };

export default function AccountScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [state, setState] = useState<AccountState>({ kind: "loading" });

  // Secure-account form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Change-password form (secured state)
  const [pwOpen, setPwOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [newConfirm, setNewConfirm] = useState("");
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSaving, setPwSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    supabase.auth
      .getUser()
      .then(({ data, error }) => {
        if (cancelled) return;
        const user = data?.user;
        if (error || !user?.email) {
          setState({ kind: "error", message: error?.message ?? "No account found on this device." });
          return;
        }
        if ((user as any).new_email) {
          setState({ kind: "pending", email: user.email, newEmail: (user as any).new_email });
        } else if (DEVICE_EMAIL_RE.test(user.email)) {
          setState({ kind: "device", email: user.email });
        } else {
          setState({ kind: "secured", email: user.email });
        }
      })
      .catch((e: any) => {
        if (!cancelled) setState({ kind: "error", message: e?.message ?? "Something went wrong." });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSecure = async () => {
    if (state.kind !== "device") return;
    const trimmed = email.trim().toLowerCase();
    if (!isValidEmail(trimmed)) {
      setFormError("Please enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      setFormError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setFormError("Passwords don't match.");
      return;
    }
    setFormError(null);
    setSaving(true);
    try {
      const { data, error } = await supabase.auth.updateUser({
        email: trimmed,
        password,
      });
      if (error) {
        setFormError(friendlyAuthError(error.message));
        return;
      }
      const user = data.user;
      if ((user as any)?.new_email) {
        // "Secure email change" is enabled on the project — the email swap
        // is pending confirmation, but the password change applied. Keep
        // boot sign-in working with the OLD email + NEW password.
        await storeCredentials(state.email, password);
        setState({ kind: "pending", email: state.email, newEmail: trimmed });
        Toast.show({
          type: "info",
          text1: "Almost there",
          text2: "Check your email to confirm the change.",
        });
      } else {
        // Email applied instantly — store the new pair for boot sign-in.
        await storeCredentials(trimmed, password);
        setState({ kind: "secured", email: trimmed });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Toast.show({
          type: "success",
          text1: "Account secured",
          text2: "You can now sign in with this email on any phone.",
        });
      }
    } catch (e: any) {
      setFormError(friendlyAuthError(e?.message ?? "Something went wrong. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (state.kind !== "secured") return;
    if (newPassword.length < 8) {
      setPwError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== newConfirm) {
      setPwError("Passwords don't match.");
      return;
    }
    setPwError(null);
    setPwSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setPwError(friendlyAuthError(error.message));
        return;
      }
      // Keep boot sign-in working with the new password.
      await storeCredentials(state.email, newPassword);
      setNewPassword("");
      setNewConfirm("");
      setPwOpen(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: "success", text1: "Password updated" });
    } catch (e: any) {
      setPwError(friendlyAuthError(e?.message ?? "Something went wrong. Please try again."));
    } finally {
      setPwSaving(false);
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
          Account & Sign In
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
          {state.kind === "loading" && (
            <View style={{ paddingTop: 60, alignItems: "center" }}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          )}

          {state.kind === "error" && (
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
              <Text style={{ fontSize: 14, fontWeight: "700", color: colors.textPrimary, marginBottom: 6 }}>
                Couldn't load your account
              </Text>
              <Text style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 19 }}>
                {friendlyAuthError(state.message)}
              </Text>
            </View>
          )}

          {/* ── Device account: secure-my-account form ─────────────────────── */}
          {state.kind === "device" && (
            <>
              <View
                style={{
                  backgroundColor: colors.card,
                  borderRadius: radius.lg,
                  borderWidth: 1,
                  borderColor: colors.border,
                  padding: 16,
                  marginBottom: 20,
                  ...shadow.card,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <Smartphone size={18} color={colors.moderate} />
                  <Text style={{ fontSize: 15, fontWeight: "700", color: colors.textPrimary, flex: 1 }}>
                    Your data lives on this device
                  </Text>
                </View>
                <Text style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 19 }}>
                  Right now your account is tied to this phone only. If you lose it or switch phones,
                  there's no way to get your logs back. Add an email and password to secure your
                  account — then you can sign in anywhere.
                </Text>
              </View>

              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "700",
                  color: colors.textSecondary,
                  textTransform: "uppercase",
                  letterSpacing: 0.6,
                  marginBottom: 8,
                  paddingHorizontal: 4,
                }}
              >
                Secure Your Account
              </Text>
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
                <FormField
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  keyboardType="email-address"
                />
                <FormField
                  label="Password (min 8 characters)"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Choose a password"
                  secure
                />
                <FormField
                  label="Confirm password"
                  value={confirm}
                  onChangeText={setConfirm}
                  placeholder="Repeat the password"
                  secure
                />
                <ErrorText message={formError} />
                <PrimaryButton label="Secure my account" onPress={handleSecure} busy={saving} />
                <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 10, lineHeight: 16 }}>
                  Your existing logs and settings stay exactly as they are — this only adds a way
                  to sign back in.
                </Text>
              </View>
            </>
          )}

          {/* ── Pending email confirmation ─────────────────────────────────── */}
          {state.kind === "pending" && (
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
                <Mail size={18} color={colors.primary} />
                <Text style={{ fontSize: 15, fontWeight: "700", color: colors.textPrimary, flex: 1 }}>
                  Check your email
                </Text>
              </View>
              <Text style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 19 }}>
                We've sent a confirmation link to{" "}
                <Text style={{ color: colors.textPrimary, fontWeight: "700" }}>{state.newEmail}</Text>.
                Tap it to finish linking your email. Until then, your account keeps working on this
                device as before.
              </Text>
            </View>
          )}

          {/* ── Secured account ────────────────────────────────────────────── */}
          {state.kind === "secured" && (
            <>
              <View
                style={{
                  backgroundColor: colors.card,
                  borderRadius: radius.lg,
                  borderWidth: 1,
                  borderColor: colors.primary,
                  padding: 16,
                  marginBottom: 20,
                  ...shadow.card,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <ShieldCheck size={18} color={colors.primary} />
                  <Text style={{ fontSize: 15, fontWeight: "700", color: colors.textPrimary, flex: 1 }}>
                    Account secured
                  </Text>
                </View>
                <Text style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 19, marginBottom: 10 }}>
                  You can sign in with this email on any phone.
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    backgroundColor: colors.background,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: radius.md,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                  }}
                >
                  <Mail size={14} color={colors.textSecondary} />
                  <Text style={{ fontSize: 14, fontWeight: "600", color: colors.textPrimary, flex: 1 }}>
                    {state.email}
                  </Text>
                </View>
              </View>

              {/* Change password (collapsible) */}
              <Pressable
                onPress={() => setPwOpen((o) => !o)}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: colors.card,
                  borderWidth: 1,
                  borderColor: colors.border,
                  padding: 14,
                  borderRadius: radius.md,
                  gap: 12,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: colors.primaryLight,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <KeyRound size={16} color={colors.primary} />
                </View>
                <Text style={{ fontSize: 14, fontWeight: "600", color: colors.textPrimary, flex: 1 }}>
                  Change password
                </Text>
                {pwOpen ? (
                  <ChevronUp size={16} color={colors.textSecondary} />
                ) : (
                  <ChevronDown size={16} color={colors.textSecondary} />
                )}
              </Pressable>

              {pwOpen && (
                <View
                  style={{
                    backgroundColor: colors.card,
                    borderRadius: radius.lg,
                    borderWidth: 1,
                    borderColor: colors.border,
                    padding: 16,
                    marginTop: 8,
                    ...shadow.card,
                  }}
                >
                  <FormField
                    label="New password (min 8 characters)"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="Choose a new password"
                    secure
                  />
                  <FormField
                    label="Confirm new password"
                    value={newConfirm}
                    onChangeText={setNewConfirm}
                    placeholder="Repeat the new password"
                    secure
                  />
                  <ErrorText message={pwError} />
                  <PrimaryButton
                    label="Update password"
                    onPress={handleChangePassword}
                    busy={pwSaving}
                  />
                </View>
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
