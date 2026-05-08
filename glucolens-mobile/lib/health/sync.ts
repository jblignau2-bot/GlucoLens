/**
 * Apple Health / Google Health Connect adapter.
 *
 * This is a documented stub. The native modules require an Expo dev client
 * (i.e. `eas build` or `expo prebuild`) — the managed Expo Go app cannot
 * load them. The adapter resolves to a no-op on Expo Go and on web, so the
 * rest of the app can call into it freely without crashing.
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
 *   4. Replace the dynamic imports below with static ones — TypeScript will
 *      then check types against the real native API instead of the local
 *      stub interface.
 */

import { Platform } from "react-native";

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

/**
 * Dynamically load an optional native module.
 *
 * The `Function` constructor sidesteps Metro's static-analysis pass, so the
 * bundler treats the module as absent (rather than failing at build time when
 * `react-native-health` isn't yet installed). Returns `null` if the module
 * doesn't exist on this build.
 */
async function loadOptional(name: string): Promise<unknown | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
    const dyn = new Function("name", "return import(name)") as (n: string) => Promise<unknown>;
    return await dyn(name);
  } catch {
    return null;
  }
}

/** Default no-op adapter for managed Expo / web / unsupported devices. */
const noopAdapter: HealthAdapter = {
  isAvailable: false,
  requestPermissions: async () => ({ granted: false }),
  getStepsToday: async () => null,
  getLatestWeightKg: async () => null,
  getGlucoseReadings: async () => [],
};

let cached: HealthAdapter | null = null;

/**
 * Resolves the right adapter for the current device. iOS → HealthKit via
 * `react-native-health`, Android → Health Connect via
 * `react-native-health-connect`. On platforms without those modules (Expo Go,
 * web, unsupported Android), returns the no-op adapter so callers don't have
 * to branch.
 */
export async function getHealthAdapter(): Promise<HealthAdapter> {
  if (cached) return cached;

  // We deliberately use dynamic imports wrapped in try/catch so the bundler
  // does not error in environments where the modules aren't installed yet.
  // The eslint-disable lines are because import/no-unresolved trips on these
  // optional native modules until the user runs `expo prebuild` and installs
  // them — see the file header for setup instructions.
  // TODO(ios): replace this block once react-native-health is installed.
  if (Platform.OS === "ios") {
    try {
      const _mod = await loadOptional("react-native-health");
      // void _mod -- replace with real adapter wiring once the module is wired.
      void _mod;
      cached = noopAdapter;
      return cached;
    } catch {
      cached = noopAdapter;
      return cached;
    }
  }

  // TODO(android): replace this block once react-native-health-connect is installed.
  if (Platform.OS === "android") {
    try {
      const _mod = await loadOptional("react-native-health-connect");
      void _mod;
      cached = noopAdapter;
      return cached;
    } catch {
      cached = noopAdapter;
      return cached;
    }
  }

  cached = noopAdapter;
  return cached;
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
