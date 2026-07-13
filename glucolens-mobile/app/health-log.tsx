/**
 * Health Log (pushed from Profile) — renders the shared GlucoseScreen
 * with a back button. Same screen as the hidden "glucose" tab.
 */

import { GlucoseScreen } from "@/components/GlucoseScreen";

export default function HealthLogScreen() {
  return <GlucoseScreen showBackButton />;
}
