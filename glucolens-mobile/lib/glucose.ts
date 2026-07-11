/**
 * Glucose utilities — unit conversion, context-aware ranges, classification,
 * danger thresholds and estimated A1c (GMI).
 *
 * Ported from the GlucoseMate reference implementation, restyled for the
 * GlucoLens token palette. All ranges are general-population, non-medical,
 * educational values — users should always defer to their own clinician
 * for personalised targets.
 */

import { colors } from "@/constants/tokens";

export type GlucoseUnit = "mmol/L" | "mg/dL";
export type ReadingContext = "fasting" | "before-meal" | "after-meal" | "bedtime" | "random";
export type ReadingBand = "low" | "normal" | "elevated" | "high";

// ─── Unit conversion (1 mmol/L ≈ 18 mg/dL) ──────────────────────────────────

export const toMmol = (value: number, unit: GlucoseUnit): number =>
  unit === "mmol/L" ? value : value / 18;

export const toMgdl = (value: number, unit: GlucoseUnit): number =>
  unit === "mg/dL" ? value : value * 18;

/** Convert a value expressed in `from` units to `to` units. */
export const convert = (value: number, from: GlucoseUnit, to: GlucoseUnit): number =>
  to === "mmol/L" ? toMmol(value, from) : toMgdl(value, from);

/** 1 decimal for mmol/L, whole numbers for mg/dL. */
export const formatReading = (value: number, unit: GlucoseUnit): string =>
  unit === "mmol/L" ? value.toFixed(1) : Math.round(value).toString();

// ─── Context-aware ranges ────────────────────────────────────────────────────

export interface BandRanges {
  low: number;        // below this is "low"
  normalMax: number;  // up to this is "normal"
  elevatedMax: number; // up to this is "elevated"; above is "high"
}

export const getRanges = (unit: GlucoseUnit, context: ReadingContext): BandRanges => {
  // mmol/L thresholds first, then convert if needed.
  let r: BandRanges;
  switch (context) {
    case "fasting":
    case "before-meal":
      r = { low: 4.0, normalMax: 7.0, elevatedMax: 10.0 };
      break;
    case "after-meal":
      r = { low: 4.0, normalMax: 10.0, elevatedMax: 13.9 };
      break;
    case "bedtime":
      r = { low: 5.0, normalMax: 8.5, elevatedMax: 12.0 };
      break;
    default:
      r = { low: 4.0, normalMax: 8.0, elevatedMax: 11.0 };
  }
  if (unit === "mg/dL") {
    return {
      low: r.low * 18,
      normalMax: r.normalMax * 18,
      elevatedMax: r.elevatedMax * 18,
    };
  }
  return r;
};

export const classify = (
  value: number,
  unit: GlucoseUnit,
  context: ReadingContext
): ReadingBand => {
  const r = getRanges(unit, context);
  if (value < r.low) return "low";
  if (value <= r.normalMax) return "normal";
  if (value <= r.elevatedMax) return "elevated";
  return "high";
};

// ─── Band colours (tokens.ts palette) ────────────────────────────────────────
// Green in-range, amber for low, orange for elevated, rose for high.
// The strongest red is reserved for dangerous lows/highs (see dangerColors).

export const bandColors: Record<ReadingBand, { text: string; bg: string; label: string }> = {
  low:      { text: colors.moderate, bg: colors.moderateBg,          label: "Low" },
  normal:   { text: colors.safe,     bg: colors.safeBg,              label: "In range" },
  elevated: { text: "#FF9E57",       bg: "rgba(255,158,87,0.15)",    label: "Elevated" },
  high:     { text: colors.risky,    bg: colors.riskyBg,             label: "High" },
};

/** Strongest red — reserved for readings that pass the isDangerous check. */
export const dangerColors = { text: "#FF3B4E", bg: "rgba(255,59,78,0.18)" };

// ─── Danger thresholds (strictly educational) ────────────────────────────────

export const isDangerous = (
  value: number,
  unit: GlucoseUnit
): { danger: boolean; kind: "low" | "high" | null } => {
  const mmol = toMmol(value, unit);
  if (mmol < 3.0) return { danger: true, kind: "low" };
  if (mmol > 16.7) return { danger: true, kind: "high" };
  return { danger: false, kind: null };
};

// ─── Estimated A1c (Glucose Management Indicator) ────────────────────────────

/** GMI: 3.31 + 0.02392 × mean glucose (mg/dL). Returns %. Estimate only. */
export const estimateA1c = (meanMgdl: number): number => 3.31 + 0.02392 * meanMgdl;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Valid input bounds per unit for manual entry. */
export const inputBounds: Record<GlucoseUnit, { min: number; max: number }> = {
  "mmol/L": { min: 1, max: 33.3 },
  "mg/dL":  { min: 18, max: 600 },
};

const CONTEXT_LABELS: Record<ReadingContext, string> = {
  fasting: "Fasting",
  "before-meal": "Before meal",
  "after-meal": "After meal",
  bedtime: "Bedtime",
  random: "Random",
};

/**
 * Normalize a stored readingType (including legacy "pre-meal"/"post-meal"
 * values) to a ReadingContext. Unknown / missing values fall back to "random".
 */
export const normalizeContext = (readingType?: string | null): ReadingContext => {
  switch (readingType) {
    case "fasting":
      return "fasting";
    case "before-meal":
    case "pre-meal":
      return "before-meal";
    case "after-meal":
    case "post-meal":
      return "after-meal";
    case "bedtime":
      return "bedtime";
    default:
      return "random";
  }
};

/** Human-readable label for a stored readingType. */
export const contextLabel = (readingType?: string | null): string =>
  CONTEXT_LABELS[normalizeContext(readingType)];

/** Countries that conventionally use mg/dL. */
export const defaultUnitForCountry = (countryCode?: string, countryName?: string): GlucoseUnit => {
  const code = (countryCode ?? "").toUpperCase();
  if (code === "US" || code === "IN") return "mg/dL";
  const name = (countryName ?? "").toLowerCase();
  if (name.includes("united states") || name === "usa" || name === "india") return "mg/dL";
  return "mmol/L";
};
