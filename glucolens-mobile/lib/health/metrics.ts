/**
 * Glucose & metabolic-health math.
 *
 * All inputs assume mg/dL. If you store mmol/L upstream, convert with
 * `mgFromMmol()` before calling these. International T2 standards (ADA, IDF)
 * publish target ranges in mg/dL, and the formulas below are calibrated to
 * that unit.
 */

export const MMOL_TO_MGDL = 18.0182;

export function mgFromMmol(mmol: number): number { return mmol * MMOL_TO_MGDL; }
export function mmolFromMg(mgdl: number): number { return mgdl / MMOL_TO_MGDL; }

/** A single glucose reading. Time is ms since epoch. */
export interface GlucoseReading {
  value_mgdl: number;
  takenAt: number;
  context?: "fasting" | "before_meal" | "after_meal" | "bedtime" | "random";
}

// ── Estimated A1c (eAG → A1c) ───────────────────────────────────────────────
//
// Nathan et al. 2008 (ADAG study): A1c% = (mean_glucose_mgdl + 46.7) / 28.7
// This is the same formula every consumer diabetes app uses for "estimated A1c."
//
// Reasonable accuracy needs >= 14 days of readings; we surface a warning below
// that threshold so users don't over-trust a 3-reading estimate.

export interface A1cEstimate {
  a1c: number;            // % (e.g. 6.4)
  averageGlucose: number; // mg/dL
  windowDays: number;
  readingCount: number;
  confidence: "low" | "medium" | "high";
}

export function estimateA1c(readings: GlucoseReading[], windowDays = 90): A1cEstimate {
  const cutoff = Date.now() - windowDays * 24 * 60 * 60 * 1000;
  const window = readings.filter((r) => r.takenAt >= cutoff);

  if (window.length === 0) {
    return { a1c: 0, averageGlucose: 0, windowDays, readingCount: 0, confidence: "low" };
  }

  const avg = window.reduce((s, r) => s + r.value_mgdl, 0) / window.length;
  const a1c = (avg + 46.7) / 28.7;

  // Confidence heuristic: the ADAG study had >= 2,700 readings/person.
  // We can't get there with finger-pricks, so calibrate to consumer reality.
  let confidence: A1cEstimate["confidence"] = "low";
  if (window.length >= 60) confidence = "high";
  else if (window.length >= 14) confidence = "medium";

  return {
    a1c: Math.round(a1c * 10) / 10,
    averageGlucose: Math.round(avg),
    windowDays,
    readingCount: window.length,
    confidence,
  };
}

// ── Time in Range ───────────────────────────────────────────────────────────
//
// ADA 2024 standard targets for non-pregnant T1/T2 adults:
//   In range:  70–180 mg/dL (≥70%)
//   Below:     <70 mg/dL (<4%, of which <54 should be <1%)
//   Above:     >180 mg/dL (<25%)
//
// Pregnancy and frail-elderly targets differ; we surface only the standard band.

export const TIR_LOW = 70;
export const TIR_HIGH = 180;

export interface TimeInRange {
  inRangePct: number;      // 0–100
  belowPct: number;        // 0–100 (<70)
  abovePct: number;        // 0–100 (>180)
  windowDays: number;
  readingCount: number;
}

export function timeInRange(readings: GlucoseReading[], windowDays = 14): TimeInRange {
  const cutoff = Date.now() - windowDays * 24 * 60 * 60 * 1000;
  const window = readings.filter((r) => r.takenAt >= cutoff);
  const total = window.length;

  if (total === 0) {
    return { inRangePct: 0, belowPct: 0, abovePct: 0, windowDays, readingCount: 0 };
  }

  let inR = 0, below = 0, above = 0;
  for (const r of window) {
    if (r.value_mgdl < TIR_LOW) below++;
    else if (r.value_mgdl > TIR_HIGH) above++;
    else inR++;
  }

  return {
    inRangePct: Math.round((inR / total) * 100),
    belowPct:   Math.round((below / total) * 100),
    abovePct:   Math.round((above / total) * 100),
    windowDays,
    readingCount: total,
  };
}

// ── Lens Score ──────────────────────────────────────────────────────────────
//
// Composite 0–100 score, designed to feel like Lingo Count or a "ring you can
// close." The score blends three signals the user actually controls:
//
//   1. Glucose stability    (50% weight, derived from TIR-in-range %)
//   2. Carb adherence       (30%, today's carbs ÷ daily max, penalty if over)
//   3. Movement / steps     (20%, today's steps ÷ 7,500 cap)
//
// Each signal contributes 0–100 of its weighted slice; the total is rounded.
// Missing inputs are skipped and the remaining weights re-normalised so a user
// with no CGM data still gets a meaningful score from carbs + steps alone.

export interface LensScoreInput {
  tirPct?: number;              // 0–100, last 14 days; omit if no glucose data
  carbsToday_g?: number;        // grams logged today
  carbMaxToday_g?: number;      // user's daily max (from profile)
  stepsToday?: number;          // step count today (Health Connect / HealthKit)
  stepGoal?: number;            // default 7,500
}

export interface LensScore {
  score: number;          // 0–100
  band: "needs work" | "fair" | "good" | "great";
  components: {
    glucose?: number;     // 0–100 contribution
    carbs?:   number;
    steps?:   number;
  };
}

export function lensScore(input: LensScoreInput): LensScore {
  const components: LensScore["components"] = {};
  const weighted: { weight: number; value: number }[] = [];

  // 1) Glucose stability
  if (input.tirPct !== undefined) {
    const v = clamp(input.tirPct, 0, 100);
    components.glucose = Math.round(v);
    weighted.push({ weight: 0.5, value: v });
  }

  // 2) Carb adherence — full marks if at-or-under target, soft penalty for overshoot
  if (input.carbsToday_g !== undefined && input.carbMaxToday_g && input.carbMaxToday_g > 0) {
    const ratio = input.carbsToday_g / input.carbMaxToday_g;
    let v: number;
    if (ratio <= 1) v = 100 * (1 - Math.max(0, 1 - ratio) * 0); // 100 if at-or-under
    else            v = clamp(100 - (ratio - 1) * 120, 0, 100); // -1.2pt per 1% overshoot
    // Penalise being too low too — eating nothing is not winning the day.
    if (ratio < 0.25) v = clamp(v - 10, 0, 100);
    components.carbs = Math.round(v);
    weighted.push({ weight: 0.3, value: v });
  }

  // 3) Movement
  if (input.stepsToday !== undefined) {
    const goal = input.stepGoal ?? 7500;
    const v = clamp((input.stepsToday / goal) * 100, 0, 100);
    components.steps = Math.round(v);
    weighted.push({ weight: 0.2, value: v });
  }

  // Re-normalise weights (so a user missing one signal still gets 0–100).
  const totalWeight = weighted.reduce((s, w) => s + w.weight, 0);
  const score = totalWeight === 0
    ? 0
    : Math.round(weighted.reduce((s, w) => s + (w.weight / totalWeight) * w.value, 0));

  const band: LensScore["band"] =
    score >= 85 ? "great" :
    score >= 70 ? "good"  :
    score >= 50 ? "fair"  : "needs work";

  return { score, band, components };
}

// ── Stoplight rating for a single glucose reading after a meal ──────────────

export type Stoplight = "green" | "amber" | "red";

/**
 * Classify a post-meal reading using ADA-aligned thresholds.
 * Caller decides which window (60 min, 90 min, 2 h post-meal); this just maps
 * a value to a colour.
 */
export function postMealStoplight(value_mgdl: number): Stoplight {
  if (value_mgdl <= 140) return "green";
  if (value_mgdl <= 180) return "amber";
  return "red";
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(Math.max(v, lo), hi);
}
