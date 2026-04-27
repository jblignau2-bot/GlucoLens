# GlucoLens — Handoff Brief

> Honest snapshot of where the project stands as of **27 April 2026**, written so a fresh agent (Codex or otherwise) can pick up without re-litigating decisions.

---

## 1. Product in one paragraph

GlucoLens is an offline-first mobile app for **Type 2 diabetes and prediabetes** users (with a "none/prevention" path) that helps them eat smarter, log glucose, and plan meals. Core flow: scan/photograph a food → get an Enjoy/Maybe/Avoid rating with macros → log it → see daily macro burn-down → optionally chat with **GlucoBot**, the AI coach. The home screen is the dashboard; the rest of the app is launchers from there. Theme is **Clinical Indigo** — dark navy (`#060814`) with lavender accent (`#A0B4FF`), Fraunces serif for headlines, Inter for body.

Repo layout is a monorepo with two packages:

- `glucolens-mobile/` — React Native + Expo (SDK 54), expo-router
- `glucolens-api/` — Express + tRPC v10, talks to Supabase (Postgres) + OpenAI

The standalone deploy of the API lives in a **separate** GitHub repo (`jblignau2-bot/glucolens-api`) which the monorepo's `glucolens-api/` is synced to. APK builds run on GitHub Actions in the monorepo.

---

## 2. Stack

| Layer        | Choice                                           | Notes |
|--------------|--------------------------------------------------|-------|
| Mobile       | React Native, Expo SDK 54, expo-router           | File-system routing, tabs at `app/(tabs)/`. |
| State        | Zustand + AsyncStorage                           | `profileStore`, `retailerStore`, `analysisStore`. Hydrate before anything else. |
| Network      | tRPC v11 client + React Query                    | All queries `retry: false`, gated on hydration so we don't hammer dead backend. |
| Auth         | Supabase Auth (JWT in headers)                   | Token attached automatically in `lib/trpc.ts`. |
| Backend      | Express + tRPC v10 + Supabase JS                 | Single `appRouter` aggregates 10 sub-routers. |
| DB           | Supabase Postgres (project `ixsfgkxuwkexeoxjfjpl`) | Alive. RLS configured. |
| AI           | OpenAI (vision for scans, chat for GlucoBot)     | Server-side only. Per-user 20 calls/min rate limit in `index.ts`. |
| Build        | GitHub Actions `build-apk.yml`                   | Gradle `assembleRelease`, ~9 min. |
| Deploy (api) | **Render free tier** (in progress)               | Was Railway; service evicted. `render.yaml` committed, awaiting account + env vars. |
| Icons        | `lucide-react-native`                            | **No emojis allowed anywhere.** |
| Fonts        | Fraunces (serif), Inter (sans)                   | Defined in `constants/tokens.ts`. |

---

## 3. Mobile app structure (current)

### Routes
```
app/
├── _layout.tsx                  Root stack + providers
├── index.tsx                    Splash + routing decision (hydrate → onboarded? → tabs/onboarding)
├── onboarding.tsx               4-step wizard: Name → Country → About+Condition → Plan
├── food-log.tsx                 Daily food log (legacy, partially redundant with diary)
├── goals.tsx                    Macro goals editor
├── health-log.tsx               Glucose + weight history
├── profile-edit.tsx             Edit profile + allergies + medication
├── progress.tsx                 Weight/A1C trends + GlucoBot coach card
├── reminders.tsx                Notification reminders CRUD
├── results.tsx                  Scan result detail (rating, macros, swap suggestions)
├── retailer-picker.tsx          Pick preferred retailer (Checkers/Woolies/PnP/Shoprite)
└── (tabs)/
    ├── _layout.tsx              Tab bar with floating Scan FAB
    ├── index.tsx                HOME / DASHBOARD ← rebuilt to match mockup
    ├── planner.tsx              Weekly meal plan + per-meal cost + WhatsApp shopping list
    ├── scan.tsx                 Camera capture
    ├── reminders.tsx            Guide articles tab (renamed from reminders in tab bar)
    ├── glucose.tsx              Hidden tab (href: null) — accessed via Profile
    └── profile.tsx              Profile + retailer + settings
```

### Stores (`stores/`)
- **`profileStore.ts`** — Zustand + AsyncStorage. `setProfile()` fires-and-forgets to storage. `hydrate()` runs on app start. Has `hydrated` boolean so screens can wait. STORAGE_KEY = `@glucolens/profile`.
- **`retailerStore.ts`** — same pattern for retailer choice.
- **`analysisStore.ts`** — last scan result cache.

### Components (`components/`)
- `SplashScreen.tsx` — animated logo splash
- `GlucoLensLogo.tsx` — SVG mark
- `MealCard.tsx`, `NutritionRow.tsx`, `RatingBadge.tsx`, `StatCard.tsx` — core UI primitives in `components/ui/`
- `RatingBadge` was rewritten to use `CheckCircle2/AlertTriangle/Ban` lucide icons — **no emojis**.

### Design tokens (`constants/tokens.ts`)
Single source of truth. Don't hardcode colors. Includes `colors`, `spacing`, `radius`, `shadow`, `fonts`, `fontSize`, `ratingColors`, `retailerInfo`. If a screen looks off, check it's pulling from here.

---

## 4. Backend structure

### Routers (`glucolens-api/src/routers/`)
| Router            | Purpose |
|-------------------|---------|
| `profile`         | get/update profile, allergies, medication, onboarding flag |
| `food`            | Food scan + AI rating + log + history |
| `glucose`         | Glucose readings CRUD + trends |
| `weight`          | Weight log |
| `bodyMeasurements`| Waist/hip/neck etc. (newer, added with allergies migration) |
| `mealPlan`        | Weekly plan generation + per-day meals |
| `shoppingList`    | Aggregated ingredients + per-retailer pricing (currently bulk-priced, not per-item) |
| `reminders`       | Push notification scheduling |
| `reports`         | Weekly/monthly summaries |
| `goals`           | Macro goals + targets |

### Server entry (`src/index.ts`)
- Express + CORS (`ALLOWED_ORIGINS` env var, falls back to `*`)
- `/trpc` mounted with auth context
- `/health` for uptime checks
- Per-user AI rate limiter: **20 calls/min**, keyed on last 20 chars of bearer token
- Body limit raised to **20mb** for base64 scan images

### Database
Supabase project `ixsfgkxuwkexeoxjfjpl`. Tables include `profiles`, `food_logs`, `glucose_readings`, `weights`, `body_measurements`, `meal_plans`, `meals`, `shopping_lists`, `reminders`, `goals`. `profiles.diabetes_type` CHECK constraint allows `type1`, `type2`, `prediabetes`, `unsure`, `none`. Migrations were ad-hoc SQL during development — there is no migrations folder yet.

---

## 5. What's been done (chronological highlights)

1. **Initial build** — Auth, scan, log, glucose, meal plan, reminders, reports, profile.
2. **Bug audit pass** — `9faf19c` — security, error handling, mobile UX fixes across the board.
3. **Schema realignment** — `48e1fa9`, `18d6c0e` — multiple rounds of fixing routers vs actual Supabase columns. Several columns added/removed/restored.
4. **UI redesign v1** (gold/teal) — split nav bar, dashboard quick actions, glucose guide.
5. **Planner overhaul** — swipeable day cards, cooking instructions, priced shopping list, WhatsApp share, per-ingredient nutrition pills.
6. **Progress screen** — weight + A1C trends.
7. **Allergies + medication fields** — added to onboarding, profile-edit, profile schema, body_measurements router.
8. **Clinical Indigo theme** — `e95efbf` — full token rewrite to dark navy + lavender, Fraunces + Inter fonts. Retailer Picker added. Onboarding tips/intro.
9. **4-step onboarding** — `b93c6b5` — reduced from 5 steps. Merged diabetes type into "About you" step. Removed all hero emojis. Replaced activity-level emojis with lucide. Made `handleFinish` offline-tolerant: persist locally first, best-effort backend, route regardless.
10. **Offline-first profile store** — same commit. AsyncStorage mirror so dead backend doesn't freeze the app.
11. **Index.tsx rewrite** — same commit. 2.5s hard timeout fallback so splash can't hang forever.
12. **Home dashboard rebuild** — `d84a304` — replaced old motivation-quote / quick-action / recent-meals layout with mockup structure: greeting + streak + avatar / 3 macro bars / 4×2 launcher grid / GlucoBot card. Disabled tRPC food query, fell back to profile store + sane defaults.
13. **Render deploy prep** — synced standalone API repo, added `render.yaml`, pushed. Awaiting Render account + env vars.

---

## 6. What was removed / killed

- **Emoji UI everywhere.** Replaced with lucide. The mockup leans clinical-premium; emojis cheapened it.
- **Old "motivation quote of the day" + recent-meals carousel on home.** Drifted from the mockup. Replaced by the macro panel + launcher.
- **5th onboarding step.** Diabetes type was its own step; merged into the "About you" step to drop one screen.
- **Old hero emoji per onboarding step.** Replaced with the step's icon.
- **Tab name "Reminders".** Renamed to "Guide" in the tab bar; reminders CRUD lives elsewhere now.
- **`Glucose` tab.** Hidden via `href: null`. Still routable, just not in the bar.
- **Railway deployment.** Service was evicted ("Application not found" 404, not sleeping). Replaced (in progress) with Render.

---

## 7. What's currently broken / unfinished

| Area | State | Notes |
|------|-------|-------|
| **Backend deploy** | In progress | `render.yaml` committed, awaiting user to sign up for Render and paste `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`. |
| **`EXPO_PUBLIC_API_URL`** | Unset | Mobile tRPC calls all 404. App runs offline-only on cached profile. Set after Render is live. |
| **Foods screen** | Not built | Mockup defines Enjoy/Maybe/Avoid tabs with searchable food list. Currently just a placeholder route. |
| **Guide deep-dive articles** | Not built | Inline GlucoBot prompts inside articles is the differentiator. |
| **Weekly Review screen** | Not built | A1C trend, macro adherence, glucose stability score. |
| **Per-item shopping cart pricing** | Bulk only | Currently shopping list shows total per retailer; per-item prices need scraping or static dataset. |
| **3D glucose chart** | Mockup only | The mockup HTML shows a 3D bar chart. Real RN version would need a Three.js/Skia rebuild. |
| **Meal plan generation** | Works but slow | OpenAI roundtrip blocks UI. Needs streaming or background job. |
| **No DB migrations folder** | Tech debt | Schema is whatever's in Supabase. Drift between dev/prod is a real risk if you ever need a second environment. |
| **Auth screens** | Minimal | Sign up / sign in / password reset are functional but ugly relative to the rest of the app. |
| **No automated tests** | Zero | No unit, integration, or E2E. Validation happens via Gradle build + manual sideload. |

---

## 8. What failed (and what we learned)

- **Railway free trial expired silently.** The app started failing in the field before we noticed. Lesson: the API needs a `/health` ping from somewhere (UptimeRobot, GitHub Action, Better Uptime) so we hear about death from infra, not users.
- **First APK download timed out** — `curl` defaults to no max time. Workaround: `--max-time 300`. Doesn't matter long-term but it's worth knowing the artifact is ~43 MB zipped, ~98 MB extracted.
- **Workflow polling exceeded 10-min Bash cap** twice. Split into consecutive loops both times. If you automate this, use `gh run watch` or a webhook instead.
- **`gh` CLI not installed in sandbox.** Fell back to `curl` against GitHub REST API. Works but verbose. Consider installing `gh` in the dev environment.
- **TypeScript wasn't installed in mobile node_modules** for typecheck. Skipped client-side typecheck and relied on Gradle to catch errors. Worked but it's a slow feedback loop. Add `tsc --noEmit` to a pre-push hook or CI step.
- **"Save failed" during onboarding** when backend was dead. Fixed by going offline-first: local persistence first, backend best-effort, route regardless.
- **Mockup drift.** I (Claude) updated styling/tokens for the home screen but didn't restructure the layout, so the emulator still showed the old design. Lesson: when the user says "match the mockup", read the mockup HTML and match its **structure**, not just the palette.
- **Per-tab tRPC queries firing on cold start** caused jank when the backend was dead. Fixed by gating queries on `enabled: hydrated && !existingProfile` + `retry: false`.

---

## 9. Suggested improvements (ranked)

### Must-do before any real users
1. **Stand up the backend on Render.** Currently the entire app is offline-cached. Synced data, cross-device, AI scans — none of it works without this.
2. **Wire `EXPO_PUBLIC_API_URL`** into mobile build via EAS secrets or `app.json` `extra.apiUrl`. Don't ship `localhost`.
3. **Add a migrations system.** `supabase/migrations/*.sql` checked into git. Without this, you can't reproduce the schema.
4. **Crash + error reporting.** Sentry or PostHog. Today, if a release crashes on a user, you only know if they tell you.
5. **Auth screens redesign.** The flow into the app is ugly compared to onboarding/home. Match the Clinical Indigo polish.

### Big product wins
6. **Build the Foods screen (Enjoy/Maybe/Avoid).** It's the single most-aligned screen with the diabetes brand. Static dataset + search is enough for v1.
7. **GlucoBot inline in Guide articles.** "Ask about this" button next to relevant paragraphs. The differentiator vs every other diabetes app on the App Store.
8. **Streaming AI scan results.** Show macro estimate the moment it's parsed, then rating, then swap suggestions. Today it's all-or-nothing after a 5-8s wait.
9. **Glucose CGM integration.** Dexcom or Libre. Manual entry is a long-term UX dead end for serious users.
10. **Weekly Review.** End-of-week digest with A1C trend, macro adherence, top wins, and a coach summary. Great push notification opportunity.

### Tech debt
11. **Add `tsc --noEmit` to CI.** Catch type errors before Gradle.
12. **Replace `react-native-chart-kit`** — it's barely maintained. Victory Native or Skia is the modern path.
13. **Move from tRPC v10 (api) ↔ v11 (mobile) version split** — pin both to v11 to avoid type mismatches.
14. **Split the home screen into smaller components.** It's currently ~500 lines in one file. Extract `MacroRow`, `Tile`, `GlucoBotCard`.
15. **Drop the second Reminders entry-point** — having it in the tab bar (now Guide) and as a standalone route is confusing.

### Nice to have
16. **OTA updates via expo-updates** — push JS-only fixes without rebuilding the APK.
17. **Dark/light theme toggle** — Clinical Indigo is dark-only today. iOS users will ask.
18. **Per-item shopping pricing.** Either scrape (fragile) or partner with retailer APIs (slow).
19. **Apple Health / Health Connect import** — auto-pull weight, glucose, steps.
20. **Localization scaffolding** — strings are hardcoded. South African English is fine for v1 but plan for it.

---

## 10. How to build / run

```bash
# Install
cd glucolens-mobile && npm install
cd ../glucolens-api && npm install

# Run mobile (needs API running OR will use offline cache)
cd glucolens-mobile && npx expo start

# Run API locally
cd glucolens-api && npm run dev   # tsx watch on :3000

# Build APK
# Push to main → GitHub Actions build-apk.yml runs
# Or manually:
curl -X POST -H "Authorization: Bearer $GH_PAT" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/repos/jblignau2-bot/GlucoLens/actions/workflows/build-apk.yml/dispatches \
  -d '{"ref":"main"}'

# Deploy API (once Render is connected)
git push origin main → Render auto-deploys
```

### Environment variables
**Mobile (`.env` in `glucolens-mobile/`):**
```
EXPO_PUBLIC_SUPABASE_URL=https://ixsfgkxuwkexeoxjfjpl.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
EXPO_PUBLIC_API_URL=https://glucolens-api.onrender.com   # once Render is live
```

**API (Render dashboard):**
```
SUPABASE_URL=https://ixsfgkxuwkexeoxjfjpl.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
OPENAI_API_KEY=sk-...
ALLOWED_ORIGINS=*    # tighten when there's a real frontend domain
```

---

## 11. Key files to read first

If you only have 30 minutes:

1. `glucolens-mobile/constants/tokens.ts` — design system
2. `glucolens-mobile/app/(tabs)/index.tsx` — home screen (latest layout)
3. `glucolens-mobile/app/onboarding.tsx` — 4-step wizard
4. `glucolens-mobile/stores/profileStore.ts` — state pattern
5. `glucolens-mobile/lib/trpc.ts` — network layer
6. `glucolens-api/src/router.ts` — backend surface area
7. `glucolens-api/src/index.ts` — server config + rate limit
8. `mnt/GlucosLens/glucolens-indigo-full.html` — design source of truth (the mockup the home screen now matches)

Older mockup files (`glucolens-mockup*.html`, `glucolens-premium*.html`, `glucolens-mockup-gold.html`) are previous design iterations — **do not follow them**. The current direction is `glucolens-indigo-full.html` and `glucolens-indigo-system.html`.

---

## 12. Conventions worth preserving

- **No emojis in product UI.** Use lucide icons.
- **Tokens, not hardcoded colors.** Anything not in `constants/tokens.ts` is a bug.
- **Offline-first stores hydrate before queries fire.** Don't undo this — the app feels instant because of it.
- **tRPC queries always `retry: false`.** Dead backend shouldn't trigger backoff loops.
- **Profile is the source of truth for goals.** Don't recompute macro goals in components — pull `dailyCalorieGoal`, `maxDailyCarbs`, `maxDailySugar` from the store with sensible defaults (2100 / 180 / 45).
- **Push to BOTH repos when API changes.** Monorepo `glucolens-api/` is source of truth; standalone `jblignau2-bot/glucolens-api` is the deploy target.
- **Commit messages follow Conventional Commits-ish:** `feat:`, `fix:`, `chore:`, scoped where useful (`feat(home):`).

---

## 13. Open questions for product

- **Pricing model.** No subscription wired. Stripe? RevenueCat? Free with ads? Decide before you ship to App Store, because the auth flow leans into it.
- **Geographic scope.** Retailer integration is South Africa-only (Checkers/Woolies/PnP/Shoprite). What's v2 — UK, US, both?
- **Clinical claims.** The competitor (mydiabetes.diet) leans on "reverse diabetes without meds" claims. We deliberately don't. But we need legal review before launch on what we *do* say, especially around A1C and meal recommendations.
- **GlucoBot scope.** Coach? Educator? Triage agent? Defining the boundary affects system prompt and what we let it answer.
- **CGM partnership** — Dexcom and Libre have very different integration paths. Picking one early de-risks the integration.

---

*Written 27 April 2026, based on commit `d84a304` + uncommitted Render config in `jblignau2-bot/glucolens-api`.*
