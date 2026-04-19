/**
 * GlucoLens Design Tokens — Clinical Indigo
 * Deep navy surfaces with lavender accent. Serif headlines (Fraunces),
 * Inter body. Calm, clinical, modern.
 */

export const colors = {
  // -- Primary accent (lavender indigo) --
  primary:      "#A0B4FF",   // --accent
  primaryDark:  "#7A91F0",   // --accent-2
  primaryLight: "rgba(160,180,255,0.15)", // --accent-glow

  // -- Surfaces --
  background:   "#060814",   // --bg
  card:         "#0E1228",   // --surface
  cardAlt:      "#161B36",   // --surface-2
  border:       "#1F2547",   // --border
  borderLight:  "#2A3158",

  // -- Text --
  textPrimary:   "#FFFFFF",  // --ink
  textSecondary: "#C8CDE8",  // --ink-2
  textMuted:     "#8088B0",  // --ink-3
  textFaint:     "#4A5278",  // --ink-4

  // -- Rating --
  safe:        "#5FE3A8",
  safeBg:      "rgba(95,227,168,0.15)",
  moderate:    "#FFC857",
  moderateBg:  "rgba(255,200,87,0.15)",
  risky:       "#FF6B7A",
  riskyBg:     "rgba(255,107,122,0.15)",

  // -- Glass / overlay --
  glass:        "rgba(160,180,255,0.08)",
  glassBorder:  "rgba(160,180,255,0.2)",
  overlay:      "rgba(2,3,10,0.75)",

  // -- Utility --
  white:   "#ffffff",
  black:   "#000000",
  accent2: "#7A91F0",
  accent3: "#FFC857",
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
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  button: {
    shadowColor: "#A0B4FF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  glow: {
    shadowColor: "#A0B4FF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 18,
    elevation: 8,
  },
} as const;

// Typography
export const fonts = {
  serif: "Fraunces_600SemiBold",
  serifBold: "Fraunces_700Bold",
  sans: "Inter_400Regular",
  sansMedium: "Inter_500Medium",
  sansSemiBold: "Inter_600SemiBold",
  sansBold: "Inter_700Bold",
} as const;

export const fontSize = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 22,
  xxxl: 28,
  hero: 34,
} as const;

export type Rating = "safe" | "moderate" | "risky";

export const ratingColors: Record<Rating, { text: string; bg: string; border: string }> = {
  safe:     { text: colors.safe,     bg: colors.safeBg,     border: colors.safe },
  moderate: { text: colors.moderate, bg: colors.moderateBg, border: colors.moderate },
  risky:    { text: colors.risky,    bg: colors.riskyBg,    border: colors.risky },
};

// Retailer metadata used across foods/shopping/planner
export type Retailer = "checkers" | "woolworths" | "picknpay" | "shoprite";
export const retailerInfo: Record<Retailer, { name: string; tier: string; accent: string }> = {
  checkers:   { name: "Checkers",   tier: "everyday",   accent: "#E6212A" },
  woolworths: { name: "Woolworths", tier: "premium",    accent: "#00A86B" },
  picknpay:   { name: "Pick n Pay", tier: "mid-range",  accent: "#0A4EA1" },
  shoprite:   { name: "Shoprite",   tier: "budget",     accent: "#E84E1B" },
};
