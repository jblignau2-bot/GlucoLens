/**
 * profileStore — caches the user's profile in memory so every screen
 * can access diabetesType, daily goals, and country without an extra
 * network round-trip. Hydrated once on app start; invalidated on save.
 */

import { create } from "zustand";

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
  heightCm?: number;
  weightKg?: number;
  age?: number;
  gender?: "male" | "female" | "other";
  activityLevel: ActivityLevel;
  onboarding_complete?: number;
  onboardingComplete?: boolean;
}

interface ProfileStore {
  profile: UserProfile | null;
  setProfile: (profile: UserProfile) => void;
  clear: () => void;
}

export const useProfileStore = create<ProfileStore>((set) => ({
  profile: null,
  setProfile: (profile) => set({ profile }),
  clear: () => set({ profile: null }),
}));
