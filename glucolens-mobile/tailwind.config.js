/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // ── GlucoLens design tokens ──────────────────────────
        primary:     "#0d9488", // teal-600
        "primary-dark": "#0f766e", // teal-700 — press state
        "primary-light": "#ccfbf1", // teal-100 — safe badge bg

        background: "#ffffff",
        card:        "#f8fafc",
        border:      "#e2e8f0",

        "text-primary":   "#0f172a",
        "text-secondary": "#64748b",

        safe:        "#16a34a",
        "safe-bg":   "#dcfce7",
        moderate:    "#d97706",
        "moderate-bg": "#fef3c7",
        risky:       "#dc2626",
        "risky-bg":  "#fee2e2",

        // ── Dark mode overrides (used via .dark: prefix) ──────
        "dark-bg":     "#0d1117",
        "dark-card":   "#161b22",
        "dark-border": "#30363d",
        "dark-text":   "#f0f6fc",
        "dark-muted":  "#8b949e",
      },
      fontFamily: {
        // Expo uses system fonts by default; swap in Plus Jakarta Sans
        // once @expo-google-fonts/plus-jakarta-sans is installed
        sans: ["System"],
      },
      borderRadius: {
        "2xl": "16px",
        "3xl": "24px",
      },
    },
  },
  plugins: [],
};
