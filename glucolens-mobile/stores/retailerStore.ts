/**
 * retailerStore — persists the user's selected SA retailer so foods,
 * shopping, and planner can price everything consistently.
 */

import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Retailer } from "@/constants/tokens";

const STORAGE_KEY = "@glucolens/retailer";

interface RetailerStore {
  retailer: Retailer | null;
  hydrated: boolean;
  setRetailer: (r: Retailer) => Promise<void>;
  hydrate: () => Promise<void>;
  clear: () => Promise<void>;
}

export const useRetailerStore = create<RetailerStore>((set) => ({
  retailer: null,
  hydrated: false,
  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const VALID_RETAILERS: Retailer[] = ["checkers", "woolworths", "picknpay", "shoprite"];
      if (raw && VALID_RETAILERS.includes(raw as Retailer)) {
        set({ retailer: raw as Retailer, hydrated: true });
      } else {
        // Unknown / corrupted value — fall back to default (none selected)
        if (raw) await AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
        set({ retailer: null, hydrated: true });
      }
    } catch {
      set({ hydrated: true });
    }
  },
  setRetailer: async (r) => {
    await AsyncStorage.setItem(STORAGE_KEY, r);
    set({ retailer: r });
  },
  clear: async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    set({ retailer: null });
  },
}));
