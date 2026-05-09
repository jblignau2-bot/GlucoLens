/**
 * OfflineBanner — quiet, non-blocking notice when the backend is
 * unreachable. Sits at the top of Home so the user understands why
 * the AI features and remote sync don't work right now, instead of
 * staring at an empty dashboard wondering if the app is broken.
 *
 * Three render modes:
 *   - status === "online"     → renders nothing (returns null)
 *   - status === "checking"   → small "checking…" line
 *   - status === "offline" / "unreachable" → friendly amber banner
 */

import { Pressable, Text, View } from "react-native";
import { CloudOff, RefreshCw } from "lucide-react-native";
import { colors, radius } from "@/constants/tokens";
import { useApiStatus, useApiStatusStore } from "@/lib/api/status";

export function OfflineBanner() {
  const status = useApiStatus();
  const probe = useApiStatusStore((s) => s.probe);

  if (status === "online") return null;

  const isOffline = status === "offline" || status === "unreachable";
  const isChecking = status === "checking";

  return (
    <Pressable
      onPress={() => probe()}
      style={({ pressed }) => ({
        backgroundColor: isOffline ? colors.moderateBg : colors.glass,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: isOffline ? colors.moderate + "33" : colors.glassBorder,
        padding: 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      {isChecking ? (
        <RefreshCw size={14} color={colors.textMuted} />
      ) : (
        <CloudOff size={14} color={colors.moderate} />
      )}
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 12,
            fontWeight: "700",
            color: isOffline ? colors.moderate : colors.textMuted,
            letterSpacing: 0.4,
          }}
        >
          {isChecking
            ? "Checking the backend…"
            : status === "offline"
            ? "Working offline"
            : "Backend unreachable"}
        </Text>
        <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 1 }}>
          {isChecking
            ? "One moment"
            : status === "offline"
            ? "AI scan, coach, and sync need an API URL set in your build."
            : "Tap to retry · your local data is still safe."}
        </Text>
      </View>
    </Pressable>
  );
}
