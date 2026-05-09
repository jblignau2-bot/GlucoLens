/**
 * Backend reachability — single source of truth.
 *
 * Three states:
 *   - "offline"   → no EXPO_PUBLIC_API_URL configured at build time
 *   - "checking"  → URL is configured but we haven't probed yet
 *   - "online"    → /health responded 2xx within the last probe window
 *   - "unreachable" → URL configured but /health failed or timed out
 *
 * The status feeds the offline banner on Home and lets feature screens
 * (scan, coach, log) show useful empty states instead of scary network
 * errors. Probe is cheap (a single HEAD/GET to /health) and cached for
 * 60s so we don't hammer Render's free tier.
 */

import { create } from "zustand";

export type ApiStatus = "offline" | "checking" | "online" | "unreachable";

const PROBE_TTL_MS = 60_000;
const PROBE_TIMEOUT_MS = 4_000;

interface State {
  status: ApiStatus;
  lastProbedAt: number;
  /** Last error message if unreachable. Used in dev banners. */
  lastError?: string;
  probe: () => Promise<ApiStatus>;
  /** Convenience selector — true only when status is "online". */
  isOnline: () => boolean;
}

const apiUrl = process.env.EXPO_PUBLIC_API_URL;

export const useApiStatusStore = create<State>((set, get) => ({
  status: apiUrl ? "checking" : "offline",
  lastProbedAt: 0,

  isOnline: () => get().status === "online",

  probe: async () => {
    if (!apiUrl) {
      set({ status: "offline", lastProbedAt: Date.now() });
      return "offline";
    }

    // Cached?
    const since = Date.now() - get().lastProbedAt;
    if (since < PROBE_TTL_MS && get().status !== "checking") {
      return get().status;
    }

    set({ status: "checking" });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
    try {
      const res = await fetch(`${apiUrl}/health`, { signal: controller.signal });
      clearTimeout(timer);
      if (res.ok) {
        set({ status: "online", lastProbedAt: Date.now(), lastError: undefined });
        return "online";
      }
      set({
        status: "unreachable",
        lastProbedAt: Date.now(),
        lastError: `${res.status} ${res.statusText}`,
      });
      return "unreachable";
    } catch (e) {
      clearTimeout(timer);
      set({
        status: "unreachable",
        lastProbedAt: Date.now(),
        lastError: e instanceof Error ? e.message : "network error",
      });
      return "unreachable";
    }
  },
}));

/** Stable selector hooks for components. */
export function useApiStatus(): ApiStatus {
  return useApiStatusStore((s) => s.status);
}

export function useIsOnline(): boolean {
  return useApiStatusStore((s) => s.status === "online");
}
