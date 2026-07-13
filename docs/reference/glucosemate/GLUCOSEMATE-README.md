# GlucoseMate

A modern, mobile-first diabetes management web app — built with React, TypeScript, Tailwind CSS and localStorage. Personalises meal ideas, tracks glucose readings, includes an educational chat bot, and provides offline emergency info.

> **Disclaimer:** GlucoseMate is for educational and tracking purposes only. It does **not** replace professional medical advice. Always follow your healthcare provider's guidance.

## Quick start

```bash
npm install
npm run dev
```

The app runs at http://localhost:5173

To build for production:

```bash
npm run build
npm run preview
```

## What's in v1

- **Onboarding** — name, age, diabetes type, country, currency, weight goal, dietary preference, allergies, meal budget, glucose unit (mmol/L or mg/dL).
- **Dashboard** — last reading, 7-day in-range %, 7-day average, quick-action tiles.
- **Glucose tracker** — log value with context (fasting / before / after meal / bedtime / random), notes, symptoms, medication. Trend line with in-range overlay. Severe-low/severe-high warnings.
- **Food planner** — country-personalised meals filtered by budget, diet, and allergies. Full South African meal library; placeholder data for US/UK/AU/IN/CA.
- **Food scan** — simulated computer-vision results with diabetes-friendly rating and guidance. Modular — swap `runMockScan` in `src/pages/FoodScan.tsx` for a real vision call.
- **Glucose Bot** — educational chat with hardcoded urgent-keyword guardrails. Replace `mockReply` in `src/pages/GlucoseBot.tsx` with an OpenAI/Anthropic call.
- **Guidance** — beginner explainers (what is diabetes, types, plate method, exercise, warning signs, myths vs facts, doctor questions).
- **Emergency** — country-aware emergency numbers (ZA, US, UK, AU, IN, CA), editable medical ID card.
- **Settings** — edit any profile field, re-run onboarding, full reset.

## File structure

```
src/
├── App.tsx                 # router + profile gate
├── main.tsx                # entry
├── index.css               # tailwind + component styles
├── types/index.ts          # core domain interfaces
├── data/
│   ├── countries.ts        # CountryConfig list — SA full, others placeholder
│   ├── meals.ts            # MealPlan library + filter helper
│   └── education.ts        # GUIDE_SECTIONS for the Learn tab
├── utils/
│   ├── storage.ts          # localStorage wrapper
│   ├── glucose.ts          # ranges, classification, mg/dL <-> mmol/L
│   └── format.ts           # money / date / id helpers
├── store/
│   ├── useProfile.ts       # hook for profile read/write/reset
│   └── useReadings.ts      # hook for readings list
├── components/
│   ├── Layout.tsx          # sidebar + bottom nav shell
│   ├── PageHeader.tsx
│   ├── Tile.tsx
│   └── Disclaimer.tsx
└── pages/
    ├── Onboarding.tsx
    ├── Dashboard.tsx
    ├── GlucoseTracker.tsx
    ├── FoodPlanner.tsx
    ├── FoodScan.tsx
    ├── GlucoseBot.tsx
    ├── Guidance.tsx
    ├── Emergency.tsx
    └── Settings.tsx
```

## Where to plug in real APIs

| Feature | File | Replace |
|---|---|---|
| Food vision | `src/pages/FoodScan.tsx` → `runMockScan` | Call your vision/LLM endpoint and return a `FoodScanResult`. |
| Chat bot | `src/pages/GlucoseBot.tsx` → `mockReply` | Call OpenAI/Anthropic. **Keep the urgent-keyword check** so emergencies always escalate. |
| Country data | `src/data/countries.ts` | Add full `commonFoods`, `groceryExamples`, and meal entries in `meals.ts` for new countries. |
| Auth + cloud sync | (not in v1) | Replace `useProfile` / `useReadings` storage layer with your backend. |

## Data model

All persistence is `localStorage`-only in v1. Keys are namespaced under `glucosemate:*`. See `src/types/index.ts` for the full type list:

- `UserProfile`
- `GlucoseReading`
- `MealPlan`
- `FoodScanResult`
- `CountryConfig`
- `ChatMessage`

## Tech

- React 18 + TypeScript
- Vite
- Tailwind CSS 3
- React Router 6
- Recharts (trend chart)
- lucide-react (icons)

## Honest v1 limitations

- Meal library has full South African data only — other countries fall back to placeholder budgets.
- Food scan returns one of five mock results — no real vision yet.
- Glucose Bot uses pattern-matched mock replies — no LLM yet.
- No backend, no auth, no cloud sync — clear browser data and it's gone.
- Glucose ranges are general educational defaults, not personalised clinical targets.

## License

MIT.
