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
  onboarding_complete?: number;
  onboardingComplete?: boolean;
}

const STORAGE_KEY = "@glucolens/profile";

interface ProfileStore {
  profile: UserProfile | null;
  hydrated: boolean;
  setProfile: (profile: UserProfile) => void;
  hydrate: () => Promise<void>;
  clear: () => Promise<void>;
}

export const useProfileStore = create<ProfileStore>((set) => ({
  profile: null,
  hydrated: false,
  setProfile: (profile) => {
    set({ profile });
    // fire-and-forget persist
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(profile)).catch(() => {});
  },
  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as UserProfile;
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
    set({ profile: null });
  },
}));
