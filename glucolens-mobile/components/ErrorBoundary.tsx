/**
 * Top-level error boundary for the app.
 *
 * Catches render-time exceptions in the tree below it and shows a calm
 * retry screen instead of a white crash. The "Try again" button resets
 * the boundary; if that re-throws, we fall through to the same UI.
 *
 * Async errors (promises, event handlers) are NOT caught here — those
 * still need their own try/catch or react-query error handlers.
 */

import { Component, type ReactNode } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { AlertCircle, RefreshCw } from "lucide-react-native";
import { colors, radius, fonts } from "@/constants/tokens";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    if (__DEV__) {
      // Surface the original error in dev tools while still showing the fallback.
      console.error("[ErrorBoundary]", error, info.componentStack);
    }
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            paddingHorizontal: 24,
            paddingVertical: 48,
          }}
        >
          <View style={{
            width: 64, height: 64, borderRadius: 32,
            backgroundColor: colors.riskyBg,
            alignItems: "center", justifyContent: "center",
            alignSelf: "center", marginBottom: 20,
          }}>
            <AlertCircle size={28} color={colors.risky} strokeWidth={1.8} />
          </View>
          <Text style={{
            fontFamily: fonts.serifBold,
            fontSize: 24,
            color: colors.textPrimary,
            textAlign: "center",
            marginBottom: 8,
          }}>
            Something went wrong
          </Text>
          <Text style={{
            fontSize: 14,
            color: colors.textSecondary,
            textAlign: "center",
            lineHeight: 20,
            marginBottom: 24,
          }}>
            GlucoLens hit an unexpected error. Your data is safe — try reloading
            the screen.
          </Text>

          {__DEV__ && (
            <View style={{
              backgroundColor: colors.card,
              borderRadius: radius.md,
              borderWidth: 1, borderColor: colors.border,
              padding: 12,
              marginBottom: 24,
            }}>
              <Text style={{ fontSize: 11, color: colors.textMuted, marginBottom: 4 }}>
                DEV ONLY
              </Text>
              <Text style={{ fontSize: 12, color: colors.risky, fontWeight: "600" }}>
                {this.state.error.name}: {this.state.error.message}
              </Text>
            </View>
          )}

          <Pressable
            onPress={this.reset}
            style={({ pressed }) => ({
              height: 52,
              borderRadius: radius.lg,
              backgroundColor: colors.primary,
              alignItems: "center", justifyContent: "center",
              flexDirection: "row", gap: 8,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <RefreshCw size={16} color={colors.background} strokeWidth={2.4} />
            <Text style={{ fontWeight: "800", color: colors.background, fontSize: 15 }}>
              Try again
            </Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }
}
