/**
 * Glucose Tracker (hidden tab) — renders the shared GlucoseScreen.
 * The same screen is also reachable as /health-log (pushed, with back button).
 */

import { GlucoseScreen } from "@/components/GlucoseScreen";

export default function GlucoseTab() {
  return <GlucoseScreen />;
}
