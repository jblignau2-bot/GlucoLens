/**
 * Scan → Glucose loop: schedule a 90-minute follow-up reminder asking the
 * user to log a glucose reading, then map it to a green/amber/red badge.
 *
 * IMPORTANT — `expo-notifications` is loaded LAZILY inside each function.
 * The package has a `DevicePushTokenAutoRegistration.fx` side-effect file
 * that auto-registers for a device push token at import time. In Expo Go
 * on SDK 53+, push registration is no longer supported, and the side
 * effect can crash the JS bundle before any UI renders.
 *
 * Lazy-requiring keeps the cost (and the breakage) confined to standalone
 * builds where notifications actually work, and makes Expo Go silently
 * skip scheduling instead of dying on import.
 */

import { Platform } from "react-native";

export const FOLLOW_UP_MINUTES = 90;

let permissionRequested = false;

/**
 * Lazy-load expo-notifications. Returns null on Expo Go / unsupported
 * environments so callers never throw on import-time failures.
 */
async function getNotificationsModule() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("expo-notifications") as typeof import("expo-notifications");
  } catch {
    return null;
  }
}

async function ensurePermission(): Promise<boolean> {
  const Notifications = await getNotificationsModule();
  if (!Notifications) return false;

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
  const Notifications = await getNotificationsModule();
  if (!Notifications) return;
  try {
    await Notifications.setNotificationChannelAsync("scan-followup", {
      name: "Meal follow-up",
      importance: Notifications.AndroidImportance.DEFAULT,
      description: "90-minute check-in after a meal scan",
      sound: undefined,
      vibrationPattern: [0, 200, 100, 200],
      lightColor: "#DC4D3E",
    });
  } catch {
    // best-effort
  }
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
    const Notifications = await getNotificationsModule();
    if (!Notifications) return null;

    const granted = await ensurePermission();
    if (!granted) return null;

    const fireAt = input.followUpAt ?? input.mealLoggedAt + FOLLOW_UP_MINUTES * 60 * 1000;
    const seconds = Math.max(60, Math.round((fireAt - Date.now()) / 1000));
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
    const Notifications = await getNotificationsModule();
    if (!Notifications) return;
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {
    // best-effort
  }
}
