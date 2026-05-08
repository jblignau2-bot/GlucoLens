/**
 * Daily mentor message generator.
 *
 * Picks ONE observation per calendar day from the user's recent activity,
 * scored by importance and recency. The message lands on the home screen as
 * a single-line card; tapping it opens the full coach chat seeded with the
 * same context.
 *
 * This runs entirely client-side — no LLM round-trip — so the home screen
 * never blocks on a network call. The Coach chat is still LLM-backed for
 * follow-up Q&A.
 */

import type { GlucoseReading, LensScore, TimeInRange } from "./metrics";

export interface MentorContext {
  firstName?: string;
  /** Today's lens score, if available. */
  score?: LensScore;
  /** Recent TIR window (typically last 14 days). */
  tir?: TimeInRange;
  /** All glucose readings — caller passes the trailing window. */
  readings?: GlucoseReading[];
  /** Number of consecutive days with at least one log entry. */
  streakDays?: number;
  /** Today's carbs vs target. */
  carbsToday_g?: number;
  carbMaxToday_g?: number;
  /** Today's water cups (out of 8). */
  waterCups?: number;
  /** Did the user log a meal in the last 6 hours? */
  hasRecentMeal?: boolean;
}

export interface MentorMessage {
  /** Short headline shown on the card (≤ 60 chars). */
  title: string;
  /** Optional one-liner under the title (≤ 100 chars). */
  body?: string;
  /** Tone — controls accent colour on the card. */
  tone: "celebrate" | "nudge" | "concern" | "neutral";
  /** Internal id so we can avoid showing the same message two days running. */
  kind: string;
}

interface Candidate extends MentorMessage {
  weight: number; // higher = more likely to be picked
}

export function generateMentorMessage(ctx: MentorContext): MentorMessage {
  const candidates: Candidate[] = [];
  const name = ctx.firstName ? `${ctx.firstName}, ` : "";

  // ── Streak celebrations / nudges ──
  if (ctx.streakDays !== undefined) {
    if (ctx.streakDays >= 30) {
      candidates.push({
        kind: "streak-30",
        title: `${ctx.streakDays} days in a row`,
        body: "A month of consistency — your glucose data tells a clearer story now.",
        tone: "celebrate",
        weight: 80,
      });
    } else if (ctx.streakDays >= 7) {
      candidates.push({
        kind: "streak-week",
        title: `${ctx.streakDays}-day logging streak`,
        body: "Consistency is what makes the patterns visible.",
        tone: "celebrate",
        weight: 55,
      });
    } else if (ctx.streakDays === 0) {
      candidates.push({
        kind: "streak-broken",
        title: "Pick the streak back up",
        body: "Even one log today resets the counter and keeps the picture honest.",
        tone: "nudge",
        weight: 45,
      });
    }
  }

  // ── TIR observations ──
  if (ctx.tir && ctx.tir.readingCount >= 5) {
    if (ctx.tir.inRangePct >= 80) {
      candidates.push({
        kind: "tir-strong",
        title: `${ctx.tir.inRangePct}% time in range — ${ctx.tir.windowDays}-day high`,
        body: "ADA target is 70%. You're well above that.",
        tone: "celebrate",
        weight: 75,
      });
    } else if (ctx.tir.inRangePct < 50) {
      candidates.push({
        kind: "tir-low",
        title: `${ctx.tir.inRangePct}% time in range this week`,
        body: "Below 50% means more readings are landing outside the safe band — let's look at meals.",
        tone: "concern",
        weight: 90,
      });
    }
    if (ctx.tir.belowPct >= 4) {
      candidates.push({
        kind: "tir-lows",
        title: "Watch the lows",
        body: `${ctx.tir.belowPct}% of readings dropped below 70 mg/dL — worth flagging at your next check-in.`,
        tone: "concern",
        weight: 95,
      });
    }
  }

  // ── Lens score band ──
  if (ctx.score) {
    if (ctx.score.band === "great") {
      candidates.push({
        kind: "score-great",
        title: `${name}you're at ${ctx.score.score} today`,
        body: "Three for three — glucose, carbs, movement all on plan.",
        tone: "celebrate",
        weight: 60,
      });
    } else if (ctx.score.band === "needs work" && ctx.score.score < 40) {
      const weakest = pickWeakest(ctx.score);
      if (weakest) {
        candidates.push({
          kind: `score-weak-${weakest}`,
          title: `One thing to fix today: ${weakestLabel(weakest)}`,
          body: scoreNudgeBody(weakest),
          tone: "nudge",
          weight: 70,
        });
      }
    }
  }

  // ── Pattern from readings ──
  if (ctx.readings && ctx.readings.length >= 6) {
    const morning = ctx.readings.filter((r) => isMorning(r.takenAt));
    const evening = ctx.readings.filter((r) => isEvening(r.takenAt));
    if (morning.length >= 3 && evening.length >= 3) {
      const morningAvg = avg(morning.map((r) => r.value_mgdl));
      const eveningAvg = avg(evening.map((r) => r.value_mgdl));
      if (morningAvg - eveningAvg > 25) {
        candidates.push({
          kind: "dawn-effect",
          title: "Your mornings run higher than your evenings",
          body: "Could be the dawn phenomenon. A short walk before breakfast usually helps.",
          tone: "neutral",
          weight: 65,
        });
      }
    }
  }

  // ── Carbs over target ──
  if (
    ctx.carbsToday_g !== undefined &&
    ctx.carbMaxToday_g &&
    ctx.carbsToday_g > ctx.carbMaxToday_g * 1.15
  ) {
    candidates.push({
      kind: "carbs-over",
      title: "You're over today's carb target",
      body: `${ctx.carbsToday_g}g logged vs ${ctx.carbMaxToday_g}g goal — pair the next meal with protein and a walk.`,
      tone: "nudge",
      weight: 50,
    });
  }

  // ── Hydration nudge ──
  if (ctx.waterCups !== undefined && ctx.waterCups < 3 && new Date().getHours() >= 14) {
    candidates.push({
      kind: "water-low",
      title: "Low on water today",
      body: `${ctx.waterCups}/8 cups by mid-afternoon — steady hydration helps the kidneys clear excess glucose.`,
      tone: "nudge",
      weight: 35,
    });
  }

  // ── Default neutral fallbacks ──
  candidates.push({
    kind: "tip-fibre",
    title: "Pair carbs with fibre",
    body: "A handful of leafy greens before the carb-heavy bite blunts the spike.",
    tone: "neutral",
    weight: 10,
  });
  candidates.push({
    kind: "tip-walk",
    title: "A 10-minute walk after meals",
    body: "Most studies show it cuts the post-meal spike by 15–25%.",
    tone: "neutral",
    weight: 10,
  });
  candidates.push({
    kind: "tip-sleep",
    title: "Sleep is part of your glucose plan",
    body: "Short nights raise next-day fasting glucose by ~10%.",
    tone: "neutral",
    weight: 8,
  });

  return weightedPick(candidates);
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function weightedPick(candidates: Candidate[]): MentorMessage {
  // Deterministic-by-day picker so the user sees one message per calendar day,
  // not a different one every time they open the app.
  const seed = daySeed();
  const total = candidates.reduce((s, c) => s + c.weight, 0);
  if (total === 0) return candidates[0] ?? { title: "Welcome", tone: "neutral", kind: "default" };
  let r = (seed * 9301 + 49297) % total;
  for (const c of candidates) {
    if (r < c.weight) {
      const { weight: _w, ...msg } = c;
      return msg;
    }
    r -= c.weight;
  }
  const { weight: _w, ...msg } = candidates[0]!;
  return msg;
}

function daySeed(): number {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

function isMorning(ts: number) { const h = new Date(ts).getHours(); return h >= 5 && h < 11; }
function isEvening(ts: number) { const h = new Date(ts).getHours(); return h >= 17 && h < 23; }

function avg(xs: number[]): number {
  return xs.length === 0 ? 0 : xs.reduce((s, x) => s + x, 0) / xs.length;
}

function pickWeakest(score: LensScore): keyof LensScore["components"] | null {
  const c = score.components;
  let weakest: keyof LensScore["components"] | null = null;
  let weakestVal = Infinity;
  (Object.keys(c) as (keyof LensScore["components"])[]).forEach((k) => {
    const v = c[k];
    if (v !== undefined && v < weakestVal) { weakestVal = v; weakest = k; }
  });
  return weakest;
}

function weakestLabel(k: keyof LensScore["components"]): string {
  switch (k) {
    case "glucose": return "glucose stability";
    case "carbs":   return "carbs";
    case "steps":   return "movement";
  }
}

function scoreNudgeBody(k: keyof LensScore["components"]): string {
  switch (k) {
    case "glucose": return "Log a fasting reading first thing tomorrow — it's the most informative number you can take.";
    case "carbs":   return "A 250g portion of veg before the rest of the plate cuts the post-meal climb sharply.";
    case "steps":   return "A 20-minute walk after the biggest meal of the day is the highest-leverage move you have.";
  }
}
