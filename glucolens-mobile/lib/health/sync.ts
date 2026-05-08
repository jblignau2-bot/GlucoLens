/**
 * Apple Health / Google Health Connect adapter.
 *
 * This is a documented stub. The native modules require an Expo dev client
 * (i.e. `eas build` or `expo prebuild`) — Expo Go cannot load them. Until
 * those are installed, the adapter resolves to a no-op everywhere so the
 * rest of the app can call into it without crashing.
 *
 * To enable real sync:
 *
 *   1. Add the Expo config plugins to `app.json`:
 *
 *      "plugins": [
 *        "expo-router",
 *        ["react-native-health", {
 *          "isClinicalDataEnabled": false,
 *          "healthSharePermission": "Allow GlucoLens to read your glucose, weight and steps.",
 *          "healthUpdatePermission": "Allow GlucoLens to write glucose readings to Health."
 *        }],
 *        ["react-native-health-connect", {}]
 *      ]
 *
 *   2. Install the native modules:
 *
 *      npm i react-native-health react-native-health-connect
 *
 *   3. Run `eas build --profile development` (or `expo prebuild && expo run:ios|android`).
 *
 *   4. Replace the no-op block below with the real adapter wiring. Each
 *      platform branch should `require` the relevant package inside a
 *      try/catch so Expo Go fallback still works.
 */

export interface HealthAdapter {
  /** True if the native module is available (i.e. running in a dev client). */
  isAvailable: boolean;
  /** Request read permissions for the metrics we care about. */
  requestPermissions: () => Promise<{ granted: boolean }>;
  /** Today's step count. Returns null if unsupported / denied. */
  getStepsToday: () => Promise<number | null>;
  /** Most recent body weight (kg). Returns null if unsupported / denied. */
  getLatestWeightKg: () => Promise<number | null>;
  /** Recent glucose readings within the window. */
  getGlucoseReadings: (windowDays: number) => Promise<{ value_mgdl: number; takenAt: number }[]>;
}

/** Default no-op adapter for managed Expo / web / unsupported devices. */
const noopAdapter: HealthAdapter = {
  isAvailable: false,
  requestPermissions: async () => ({ granted: false }),
  getStepsToday: async () => null,
  getLatestWeightKg: async () => null,
  getGlucoseReadings: async () => [],
};

/**
 * Resolves the right adapter for the current device. Currently always returns
 * the no-op until `react-native-health` (iOS) and `react-native-health-connect`
 * (Android) are installed and a dev client is built. Replace the body of this
 * function with a try/catch require dance once those modules ship.
 */
export async function getHealthAdapter(): Promise<HealthAdapter> {
  return noopAdapter;
}

/** Convenience: try to refresh today's steps. Silent failure. */
export async function syncStepsToday(): Promise<number | null> {
  try {
    const adapter = await getHealthAdapter();
    if (!adapter.isAvailable) return null;
    return await adapter.getStepsToday();
  } catch {
    return null;
  }
}
