/**
 * GlucoLens Design Tokens — Dark Theme
 * Sleek, modern, professional dark UI with teal accents.
 */

export const colors = {
  // -- Primary accent (teal/cyan) --
  primary:      "#14b8a6",
  primaryDark:  "#0d9488",
  primaryLight: "#0d3d38",    // muted teal for dark bg highlights

  // -- Surfaces --
  background:   "#0b1120",    // deep navy
  card:         "#111c2e",    // slightly lighter card
  cardAlt:      "#162033",    // alternate card shade
  border:       "#1e2d40",    // subtle borders
  borderLight:  "#2a3f55",    // lighter border variant

  // -- Text --
  textPrimary:   "#f0f4f8",
  textSecondary: "#7b8fa3",
  textMuted:     "#4a5c6f",

  // -- Rating --
  safe:        "#22c55e",
  safeBg:      "#0a2915",
  moderate:    "#f59e0b",
  moderateBg:  "#2a1f06",
  risky:       "#ef4444",
  riskyBg:     "#2a0a0a",

  // -- Glass / overlay --
  glass:        "rgba(255,255,255,0.06)",
  glassBorder:  "rgba(255,255,255,0.08)",
  overlay:      "rgba(0,0,0,0.6)",

  // -- Utility --
  white:   "#ffffff",
  black:   "#000000",
  accent2: "#6366f1", // indigo accent for variety
  accent3: "#ec4899", // pink for favourites
} as const;

export const spacing = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  xxl:  24,
  xxxl: 32,
} as const;

export const radius = {
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  xxl:  24,
  full: 9999,
} as const;

export const shadow = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  button: {
    shadowColor: "#14b8a6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  glow: {
    shadowColor: "#14b8a6",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

export type Rating = "safe" | "moderate" | "risky";

export const ratingColors: Record<Rating, { text: string; bg: string; border: string }> = {
  safe:     { text: colors.safe,     bg: colors.safeBg,     border: "#22c55e" },
  moderate: { text: colors.moderate, bg: colors.moderateBg, border: "#f59e0b" },
  risky:    { text: colors.risky,    bg: colors.riskyBg,    border: "#ef4444" },
};
