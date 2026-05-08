/**
 * GlucoLens Design Tokens — Warm Clinical
 *
 * A wellness-not-illness palette: warm peach-cream surfaces, deep terracotta
 * for emphasis, coral as the single signature accent. Aimed at prediabetes /
 * T2 / prevention users who don't want their phone reminding them they're sick.
 *
 * Typography: Fraunces is reserved for the score number and section heads
 * (where its serif character earns its keep). Inter does everything else.
 *
 * The previous "Clinical Indigo" navy + lavender values are kept as legacy
 * aliases so any not-yet-migrated component still renders without crashing.
 */

// ── Brand palette ───────────────────────────────────────────────────────────
const palette = {
  // Light surfaces — warm peach cream
  cream100:    "#FFFBF7",
  cream95:     "#FDF5EC",
  cream90:     "#F8EBDC",
  cream85:     "#F2DFCB",

  // Dark / typography on light
  earth900:    "#2A1F18",   // primary text
  earth700:    "#5A4638",   // secondary text
  earth500:    "#8E7768",   // muted text
  earth300:    "#C4B3A4",   // faint text / borders on light
  earth200:    "#E2D5C7",

  // Signature accent (coral)
  coral500:    "#F26B5B",   // primary action
  coral400:    "#FF8674",   // hover / secondary
  coral100:    "#FCE3DD",   // tinted backgrounds

  // Secondary accent (warm amber) — for streaks, water, etc.
  amber500:    "#F4A261",
  amber100:    "#FDEBD7",

  // Status — keep the same hue family but pull warmer
  green500:    "#3FB68D",   // safe / in range
  green100:    "#D8EFE5",
  yellow500:   "#E0A93C",   // moderate
  yellow100:   "#F8E8C2",
  red500:      "#D9534F",   // risky
  red100:      "#F8D7D5",

  // Dark mode terracotta (for users who insist; matches accent)
  night900:    "#1C1410",
  night800:    "#2A1F18",
  night700:    "#3A2D24",
  night600:    "#4D3D32",
  pearl100:    "#F8EBDC",
  pearl90:     "#E2D5C7",
};

// Default to LIGHT theme — mid-range Android phones in SA render warm cream
// far better than navy on cheap LCD panels, and prevention users skew daytime.
export const colors = {
  // -- Primary accent --
  primary:      palette.coral500,
  primaryDark:  palette.coral400,
  primaryLight: palette.coral100,

  // -- Surfaces (light) --
  background:   palette.cream100,
  card:         palette.cream95,
  cardAlt:      palette.cream90,
  border:       palette.cream85,
  borderLight:  palette.earth200,

  // -- Text --
  textPrimary:   palette.earth900,
  textSecondary: palette.earth700,
  textMuted:     palette.earth500,
  textFaint:     palette.earth300,

  // -- Rating --
  safe:        palette.green500,
  safeBg:      palette.green100,
  moderate:    palette.yellow500,
  moderateBg:  palette.yellow100,
  risky:       palette.red500,
  riskyBg:     palette.red100,

  // -- Glass / overlay --
  glass:        "rgba(242,107,91,0.08)",
  glassBorder:  "rgba(242,107,91,0.18)",
  overlay:      "rgba(28,20,16,0.55)",

  // -- Utility --
  white:   "#ffffff",
  black:   "#000000",
  accent2: palette.amber500,    // streak / water / activity
  accent3: palette.amber100,
  inkOnPrimary: "#ffffff",      // text colour on coral fills
} as const;

// Same tokens, dark variant (terracotta night). Surface it later via context.
export const darkColors = {
  primary:      palette.coral400,
  primaryDark:  palette.coral500,
  primaryLight: "rgba(255,134,116,0.18)",

  background:   palette.night900,
  card:         palette.night800,
  cardAlt:      palette.night700,
  border:       palette.night600,
  borderLight:  palette.night600,

  textPrimary:   palette.cream100,
  textSecondary: palette.pearl100,
  textMuted:     palette.pearl90,
  textFaint:     palette.earth500,

  safe:        palette.green500,
  safeBg:      "rgba(63,182,141,0.14)",
  moderate:    palette.yellow500,
  moderateBg:  "rgba(224,169,60,0.14)",
  risky:       palette.red500,
  riskyBg:     "rgba(217,83,79,0.14)",

  glass:        "rgba(255,134,116,0.10)",
  glassBorder:  "rgba(255,134,116,0.24)",
  overlay:      "rgba(0,0,0,0.65)",

  white:   "#ffffff",
  black:   "#000000",
  accent2: palette.amber500,
  accent3: "rgba(244,162,97,0.20)",
  inkOnPrimary: palette.night900,
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
  xxl:  28,
  full: 9999,
} as const;

export const shadow = {
  card: {
    shadowColor: palette.earth900,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  button: {
    shadowColor: palette.coral500,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 5,
  },
  glow: {
    shadowColor: palette.coral500,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.20,
    shadowRadius: 22,
    elevation: 6,
  },
} as const;

// Typography — Fraunces is reserved for the Lens Score number and section heads
export const fonts = {
  serif:        "Fraunces_600SemiBold",
  serifBold:    "Fraunces_700Bold",
  sans:         "Inter_400Regular",
  sansMedium:   "Inter_500Medium",
  sansSemiBold: "Inter_600SemiBold",
  sansBold:     "Inter_700Bold",
} as const;

export const fontSize = {
  xs:   10,
  sm:   12,
  md:   14,
  lg:   16,
  xl:   18,
  xxl:  22,
  xxxl: 28,
  hero: 34,
  score: 56,    // Lens Score number
} as const;

export type Rating = "safe" | "moderate" | "risky";

export const ratingColors: Record<Rating, { text: string; bg: string; border: string }> = {
  safe:     { text: colors.safe,     bg: colors.safeBg,     border: colors.safe },
  moderate: { text: colors.moderate, bg: colors.moderateBg, border: colors.moderate },
  risky:    { text: colors.risky,    bg: colors.riskyBg,    border: colors.risky },
};

// Layout constants — keep in sync with app/(tabs)/_layout.tsx
export const TAB_BAR_HEIGHT = 72;
export const TAB_BAR_TOP_GAP = 14;

// Retailer metadata used across foods/shopping/planner
export type Retailer = "checkers" | "woolworths" | "picknpay" | "shoprite";
export const retailerInfo: Record<Retailer, { name: string; tier: string; accent: string }> = {
  checkers:   { name: "Checkers",   tier: "everyday",   accent: "#E6212A" },
  woolworths: { name: "Woolworths", tier: "premium",    accent: "#00A86B" },
  picknpay:   { name: "Pick n Pay", tier: "mid-range",  accent: "#0A4EA1" },
  shoprite:   { name: "Shoprite",   tier: "budget",     accent: "#E84E1B" },
};
