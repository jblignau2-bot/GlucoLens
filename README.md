# GlucoLens

GlucoLens is an offline-first mobile app for Type 2 diabetes, prediabetes,
and prevention-focused users. The app helps people scan meals, understand
glucose-friendly choices, track nutrition and health logs, plan meals, and
use an AI coach through a mobile-first experience.

## Structure

- `glucolens-mobile/` - Expo React Native app using expo-router.
- `glucolens-api/` - Express + tRPC API for Supabase and OpenAI calls.
- `.github/workflows/` - Android APK/AAB build workflows.
- `docs/` - project handoff and planning notes.

## Local Development

```bash
cd glucolens-api
npm ci
npm run dev

cd ../glucolens-mobile
npm ci
npm run start
```

The mobile app expects Supabase public env vars and `EXPO_PUBLIC_API_URL`.
The API expects Supabase service role and OpenAI keys.
