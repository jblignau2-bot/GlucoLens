/**
 * pendingChecksStore — tracks Scan→Glucose follow-up checks.
 *
 * After a successful meal scan we schedule a 90-minute follow-up: ask the
 * user to log a glucose reading, then attach a stoplight badge to the meal
 * based on the resulting value vs ADA post-meal thresholds.
 *
 * State is persisted to AsyncStorage so a closed app or reboot doesn't lose
 * the queue. Local notifications are scheduled separately via
 * `lib/health/notifications.ts`.
 */

import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Stoplight } from "@/lib/health/metrics";

const STORAGE_KEY = "@glucolens/pending-checks";

export interface PendingCheck {
  id: string;
  mealName: string;
  mealLoggedAt: number;          // ms epoch
  followUpAt: number;            // ms epoch (mealLoggedAt + 90 min)
  notificationId?: string;       // expo-notifications id, for cancellation
  /** Once filled in, marks this check as resolved. */
  resolved?: {
    glucose_mgdl: number;
    badge: Stoplight;
    recordedAt: number;
  };
}

interface State {
  checks: PendingCheck[];
  hydrated: boolean;
}

interface Actions {
  hydrate: () => Promise<void>;
  add: (check: PendingCheck) => Promise<void>;
  resolve: (id: string, glucose_mgdl: number, badge: Stoplight) => Promise<void>;
  remove: (id: string) => Promise<void>;
  /** Returns the oldest unresolved check whose followUpAt is in the past. */
  nextDue: () => PendingCheck | null;
}

export const usePendingChecksStore = create<State & Actions>((set, get) => ({
  checks: [],
  hydrated: false,

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as PendingCheck[]) : [];
      // Drop checks older than 7 days — beyond that the meal context is stale.
      const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const fresh = parsed.filter((c) => c.mealLoggedAt >= cutoff);
      set({ checks: fresh, hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },

  add: async (check) => {
    const next = [...get().checks, check];
    set({ checks: next });
    await persist(next);
  },

  resolve: async (id, glucose_mgdl, badge) => {
    const next = get().checks.map((c) =>
      c.id === id
        ? { ...c, resolved: { glucose_mgdl, badge, recordedAt: Date.now() } }
        : c,
    );
    set({ checks: next });
    await persist(next);
  },

  remove: async (id) => {
    const next = get().checks.filter((c) => c.id !== id);
    set({ checks: next });
    await persist(next);
  },

  nextDue: () => {
    const now = Date.now();
    return (
      get()
        .checks
        .filter((c) => !c.resolved && c.followUpAt <= now)
        .sort((a, b) => a.followUpAt - b.followUpAt)[0] ?? null
    );
  },
}));

async function persist(checks: PendingCheck[]) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(checks));
  } catch {
    // best-effort
  }
}
