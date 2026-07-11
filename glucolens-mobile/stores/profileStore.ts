/**
 * profileStore — caches the user's profile in memory so every screen
 * can access diabetesType, daily goals, and country without an extra
 * network round-trip. Hydrated once on app start; invalidated on save.
 *
 * Also mirrors the profile to AsyncStorage so onboarding survives even
 * when the backend is unreachable (offline-first).
 */

import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { defaultUnitForCountry, type GlucoseUnit } from "@/lib/glucose";

export type DiabetesType = "type1" | "type2" | "prediabetes" | "unsure" | "none";
export type ActivityLevel  = "sedentary" | "light" | "moderate" | "active" | "very_active";

export interface UserProfile {
  id: number;
  diabetesType: DiabetesType;
  dailyCalorieGoal: number;
  maxDailySugar: number;
  maxDailyCarbs: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  country?: string;
  countryCode?: string;
  countryFlag?: string;
  heightCm?: number;
  weightKg?: number;
  age?: number;
  gender?: "male" | "female" | "other";
  activityLevel: ActivityLevel;
  allergies?: string;
  medication?: string;
  dietaryPrefs?: string;
  onboarding_complete?: number;
  onboardingComplete?: boolean;
}

const STORAGE_KEY = "@glucolens/profile";
const UNIT_STORAGE_KEY = "@glucolens/glucose-unit";

interface ProfileStore {
  profile: UserProfile | null;
  hydrated: boolean;
  /**
   * Explicit glucose unit preference. `null` means "not chosen yet" — the
   * effective unit then falls back to the country default (mg/dL for US/IN,
   * mmol/L otherwise). Kept separate from `profile` so server profile
   * refreshes never wipe the preference. Use `useGlucoseUnit()` to read it.
   */
  glucoseUnit: GlucoseUnit | null;
  setProfile: (profile: UserProfile) => void;
  setGlucoseUnit: (unit: GlucoseUnit) => void;
  hydrate: () => Promise<void>;
  clear: () => Promise<void>;
}

export const useProfileStore = create<ProfileStore>((set) => ({
  profile: null,
  hydrated: false,
  glucoseUnit: null,
  setProfile: (profile) => {
    set({ profile });
    // fire-and-forget persist
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(profile)).catch(() => {});
  },
  setGlucoseUnit: (unit) => {
    set({ glucoseUnit: unit });
    AsyncStorage.setItem(UNIT_STORAGE_KEY, unit).catch(() => {});
  },
  hydrate: async () => {
    try {
      const storedUnit = await AsyncStorage.getItem(UNIT_STORAGE_KEY).catch(() => null);
      if (storedUnit === "mmol/L" || storedUnit === "mg/dL") {
        set({ glucoseUnit: storedUnit });
      }
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as UserProfile;
        // One-time migration: the legacy "unsure" diabetes type is now "prediabetes".
        if ((parsed.diabetesType as string) === "unsure") {
          parsed.diabetesType = "prediabetes";
          AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(parsed)).catch(() => {});
        }
        set({ profile: parsed, hydrated: true });
      } else {
        set({ hydrated: true });
      }
    } catch {
      set({ hydrated: true });
    }
  },
  clear: async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    await AsyncStorage.removeItem(UNIT_STORAGE_KEY).catch(() => {});
    set({ profile: null, glucoseUnit: null });
  },
}));

/**
 * Effective glucose display unit: the user's explicit choice, or the
 * default for their profile country (mg/dL for US/India, otherwise mmol/L).
 */
export function useGlucoseUnit(): GlucoseUnit {
  return useProfileStore(
    (s) => s.glucoseUnit ?? defaultUnitForCountry(s.profile?.countryCode, s.profile?.country)
  );
}
