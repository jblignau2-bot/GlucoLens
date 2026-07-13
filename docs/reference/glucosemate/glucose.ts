import type { GlucoseUnit, ReadingBand, ReadingContext } from '../types';

// Convert mg/dL <-> mmol/L. 1 mmol/L ≈ 18 mg/dL.
export const toMmol = (value: number, unit: GlucoseUnit) =>
  unit === 'mmol/L' ? value : value / 18;

export const toMgdl = (value: number, unit: GlucoseUnit) =>
  unit === 'mg/dL' ? value : value * 18;

export const formatReading = (value: number, unit: GlucoseUnit) =>
  unit === 'mmol/L' ? value.toFixed(1) : Math.round(value).toString();

// General-population, non-medical, educational ranges.
// Always defer to the user's own clinician for personalised targets.
export interface BandRanges {
  low: number; // below this is "low"
  normalMax: number; // up to this is "normal"
  elevatedMax: number; // up to this is "elevated"; above is "high"
}

export const getRanges = (
  unit: GlucoseUnit,
  context: ReadingContext
): BandRanges => {
  // mmol/L thresholds, then convert if needed.
  let r: BandRanges;
  switch (context) {
    case 'fasting':
    case 'before-meal':
      r = { low: 4.0, normalMax: 7.0, elevatedMax: 10.0 };
      break;
    case 'after-meal':
      r = { low: 4.0, normalMax: 10.0, elevatedMax: 13.9 };
      break;
    case 'bedtime':
      r = { low: 5.0, normalMax: 8.5, elevatedMax: 12.0 };
      break;
    default:
      r = { low: 4.0, normalMax: 8.0, elevatedMax: 11.0 };
  }
  if (unit === 'mg/dL') {
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
  if (value < r.low) return 'low';
  if (value <= r.normalMax) return 'normal';
  if (value <= r.elevatedMax) return 'elevated';
  return 'high';
};

export const bandStyles: Record<
  ReadingBand,
  { bg: string; text: string; ring: string; label: string }
> = {
  low: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    ring: 'ring-amber-200',
    label: 'Low',
  },
  normal: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    ring: 'ring-emerald-200',
    label: 'In range',
  },
  elevated: {
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    ring: 'ring-orange-200',
    label: 'Elevated',
  },
  high: {
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    ring: 'ring-rose-200',
    label: 'High',
  },
};

// "Dangerous" thresholds for stronger warnings. Strictly educational.
export const isDangerous = (
  value: number,
  unit: GlucoseUnit
): { danger: boolean; kind: 'low' | 'high' | null } => {
  const mmol = toMmol(value, unit);
  if (mmol < 3.0) return { danger: true, kind: 'low' };
  if (mmol > 16.7) return { danger: true, kind: 'high' };
  return { danger: false, kind: null };
};
