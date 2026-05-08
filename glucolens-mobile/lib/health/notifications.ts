/**
 * Scan → Glucose loop: schedule a 90-minute follow-up reminder asking the
 * user to log a glucose reading, then map it to a green/amber/red badge.
 *
 * Uses expo-notifications. Permission is requested lazily — first scan will
 * prompt the user, subsequent scans are silent. If permission is denied we
 * fall back to in-app prompts only (the pending check still lives in the
 * store and shows up on Home).
 */

import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export const FOLLOW_UP_MINUTES = 90;

let permissionRequested = false;

async function ensurePermission(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  if (status === "granted") return true;
  if (permissionRequested) return false;
  permissionRequested = true;
  const req = await Notifications.requestPermissionsAsync();
  return req.status === "granted";
}

/** One-time channel setup for Android. Safe to call multiple times. */
export async function setupNotificationChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("scan-followup", {
    name: "Meal follow-up",
    importance: Notifications.AndroidImportance.DEFAULT,
    description: "90-minute check-in after a meal scan",
    sound: undefined,
    vibrationPattern: [0, 200, 100, 200],
    lightColor: "#F26B5B",
  });
}

export interface ScheduleFollowUpInput {
  mealName: string;
  mealLoggedAt: number;
  /** Defaults to 90 minutes after the meal. */
  followUpAt?: number;
}

/** Schedule a single check-in notification. Returns the id, or null on failure. */
export async function scheduleFollowUp(input: ScheduleFollowUpInput): Promise<string | null> {
  try {
    const granted = await ensurePermission();
    if (!granted) return null;

    const fireAt = input.followUpAt ?? input.mealLoggedAt + FOLLOW_UP_MINUTES * 60 * 1000;
    const seconds = Math.max(60, Math.round((fireAt - Date.now()) / 1000)); // never < 1 min
    await setupNotificationChannel();

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "How did the meal go?",
        body: `Log a glucose reading for "${input.mealName}" — it takes 5 seconds and powers your patterns.`,
        data: { type: "scan-followup", mealName: input.mealName, mealLoggedAt: input.mealLoggedAt },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds,
        repeats: false,
        channelId: "scan-followup",
      },
    });

    return id;
  } catch (e) {
    if (__DEV__) console.warn("[notifications] scheduleFollowUp failed:", e);
    return null;
  }
}

export async function cancelFollowUp(notificationId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {
    // best-effort
  }
}
