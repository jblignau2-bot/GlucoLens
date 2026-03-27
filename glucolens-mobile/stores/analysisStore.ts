/**
 * analysisStore — holds the current AI scan result in memory.
 *
 * Replaces the web prototype's pattern of passing the full JSON through the
 * URL query string (which breaks in React Native and leaks data into navigation
 * history). The Scanner screen writes here; the Results screen reads here.
 *
 * Cleared automatically once the Results screen confirms the meal has been saved.
 */

import { create } from "zustand";

export interface ItemBreakdown {
  name: string;
  portion: string;
  calories: number;
  sugar_g: number;
  carbs_g: number;
  protein_g: number;
  fat_g: number;
  fiber_g: number;
  glycemicIndex: number;
  note: string;
}

export interface AnalysisResult {
  mealName: string;
  identifiedFoods: string[];
  imageUri?: string;   // local file URI (before S3 upload)
  imageUrl?: string;   // S3 URL (after upload)
  itemBreakdown?: ItemBreakdown[];
  nutrition: {
    calories: number;
    totalSugar_g: number;
    totalCarbs_g: number;
    glycemicIndex: number;
    glycemicLoad: number;
    protein_g: number;
    fat_g: number;
    fiber_g: number;
  };
  diabetesRating: {
    type1: { rating: "safe" | "moderate" | "risky"; reason: string };
    type2: { rating: "safe" | "moderate" | "risky"; reason: string };
  };
  whyRisky: string[];
  healthierAlternatives: Array<{ name: string; benefit: string }>;
  foodsToAvoid: string[];
}

interface AnalysisStore {
  result: AnalysisResult | null;
  setResult: (result: AnalysisResult) => void;
  clear: () => void;
}

export const useAnalysisStore = create<AnalysisStore>((set) => ({
  result: null,
  setResult: (result) => set({ result }),
  clear: () => set({ result: null }),
}));
