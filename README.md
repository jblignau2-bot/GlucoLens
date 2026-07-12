# GlucoLens

GlucoLens is an offline-first mobile app for Type 2 diabetes, prediabetes, and
prevention-focused users. Scan meals with the camera for AI glucose-friendliness
ratings, log glucose (mmol/L or mg/dL) with context tags, see time-in-range and
an estimated A1c, plan meals with priced shopping lists, chat with the GlucoBot
coach, and keep an offline emergency Medical ID.

## Folder map

| Folder | What it is |
|---|---|
| `glucolens-mobile/` | The app — Expo / React Native (expo-router, Zustand, tRPC client). |
| `glucolens-api/` | The backend — Express + tRPC, talks to Supabase (data) and OpenAI (AI features). Deployed on Railway. |
| `docs/` | Guides (`LOCAL-TESTING.md`, `HANDOFF-BRIEF.md`), design mockups, and `reference/glucosemate/` (salvaged code from an earlier prototype). |
| `archive/` | Old backups, screenshots, logs. Not used by anything — safe to delete. See its README. |
| `.github/workflows/` | CI: Android APK/AAB build pipelines. |
| `.claude/` | Claude Code config (`launch.json` defines the web dev server). |

## Requirements

- **Node.js 20+** (installed at `C:\Program Files\nodejs` on this machine)
- **Supabase project** — currently `glucolens` (`qogaslzfiabwppukwasi`, eu-west-2).
  Schema source of truth: `glucolens-api/supabase/000_canonical_schema.sql`
  (idempotent — re-run it in the SQL editor after schema changes).
  ⚠️ Authentication → Email → **"Confirm email" must be OFF** (the app creates
  silent device accounts and needs a session immediately on sign-up).
- **OpenAI API key** — server-side only, lives in `glucolens-api/.env`, never in the mobile app.

## Environment variables

`glucolens-mobile/.env` (client — all values here are public):

```env
EXPO_PUBLIC_SUPABASE_URL=https://qogaslzfiabwppukwasi.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key from Supabase dashboard>
EXPO_PUBLIC_API_URL=<backend URL — Railway prod or http://localhost:3000>
# Dev-only conveniences (ignored in production builds):
EXPO_PUBLIC_SKIP_ONBOARDING=true   # skip auth/onboarding, open straight into tabs
EXPO_PUBLIC_MOCK_BOT=true          # GlucoBot answers with canned replies, no API needed
```

`glucolens-api/.env` (server — secrets, never commit):

```env
SUPABASE_URL=https://qogaslzfiabwppukwasi.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service role key — Supabase dashboard → Settings → API>
OPENAI_API_KEY=sk-...
ALLOWED_ORIGINS=*
PORT=3000
```

## Day-to-day development (no APK needed)

**See UI changes instantly in a browser:**

```powershell
cd glucolens-mobile
npx expo start --web --offline
# open http://localhost:8081 — hot-reloads on every file save
```

**Test on your real phone:** install the **Expo Go** app, run `npx expo start`
on the same Wi-Fi, scan the QR code. Also hot-reloads.

**Run the backend locally:**

```powershell
cd glucolens-api
npm ci
npm run dev   # http://localhost:3000; point EXPO_PUBLIC_API_URL at it
```

**Type-check before pushing** (CI will also do this):

```powershell
cd glucolens-mobile ; npx tsc --noEmit
cd ../glucolens-api ; npx tsc --noEmit
```

**Build an APK** only for release candidates — push to GitHub and use the
workflows in `.github/workflows/`. Never build APKs to iterate on UI.

More detail in [docs/LOCAL-TESTING.md](docs/LOCAL-TESTING.md).

## Deployment

- **API**: Railway (`glucolens-api-production.up.railway.app`). After changing
  Supabase projects or keys, update the env vars in the Railway dashboard.
- **Database**: Supabase. Apply `glucolens-api/supabase/000_canonical_schema.sql`
  via the SQL editor; it is safe to re-run.
- **App**: GitHub Actions builds APK/AAB from `main`.

## Things to know

- **Auth model**: the app silently creates a per-device Supabase account
  (credentials kept in the device's secure storage so the account survives
  reinstalls). There is no email/password login yet — signing out disconnects
  that device's data.
- **Units**: glucose is stored with its entry unit and converted via
  `glucolens-mobile/lib/glucose.ts`; user preference lives in the profile store.
- **The old Supabase project** (`ixsfgkxuwkexeoxjfjpl`, different account) still
  holds pre-July-2026 data; nothing was migrated from it.
- Medical guidance shown by the app is educational only and is labelled as such —
  keep it that way (no dosing advice).
