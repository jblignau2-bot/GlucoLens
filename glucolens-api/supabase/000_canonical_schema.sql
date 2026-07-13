-- ============================================================================
-- GlucoLens — Canonical Supabase Schema
-- Source of truth generated from API code 2026-07-11; run in Supabase SQL editor.
--
-- Idempotent: safe to re-run. Every table/column here is exactly what the
-- glucolens-api routers read and write. Older migrations (including
-- glucolens-mobile/supabase/001_initial_schema.sql) are DEPRECATED — they
-- describe table/column names the API does not use.
--
-- Note: the API connects with the service-role key (bypasses RLS). RLS with
-- owner-only policies is still enabled on every table as defense in depth for
-- any anon/authenticated client access.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── helper: updated_at trigger function ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ── profiles (src/routers/profile.ts, chat.ts) ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name          TEXT,
  last_name           TEXT,
  country             TEXT,
  country_code        TEXT,
  country_flag        TEXT,
  height_cm           NUMERIC(5, 1),
  weight_kg           NUMERIC(5, 1),
  age                 INTEGER,
  gender              TEXT CHECK (gender IN ('male', 'female', 'other')),
  activity_level      TEXT DEFAULT 'light'
                      CHECK (activity_level IN ('sedentary', 'light', 'moderate', 'active', 'very_active')),
  diabetes_type       TEXT DEFAULT 'type2'
                      CHECK (diabetes_type IN ('type1', 'type2', 'prediabetes', 'unsure', 'none')),
  daily_calorie_goal  INTEGER,
  max_daily_sugar     NUMERIC(6, 1),
  max_daily_carbs     NUMERIC(6, 1),
  dietary_restrictions TEXT,
  allergies           TEXT,
  medication          TEXT,
  onboarding_complete SMALLINT NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country_code TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country_flag TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS daily_calorie_goal INTEGER;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS max_daily_sugar NUMERIC(6, 1);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS max_daily_carbs NUMERIC(6, 1);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS dietary_restrictions TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS allergies TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS medication TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_complete SMALLINT NOT NULL DEFAULT 0;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_owner" ON public.profiles;
CREATE POLICY "profiles_owner" ON public.profiles
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── food_logs (src/routers/food.ts, reports.ts) ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.food_logs (
  id                     BIGSERIAL PRIMARY KEY,
  user_id                UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  meal_name              TEXT NOT NULL,
  identified_foods       JSONB DEFAULT '[]',
  calories               NUMERIC(7, 1),
  total_sugar            NUMERIC(6, 1),
  total_carbs            NUMERIC(6, 1),
  glycemic_index         NUMERIC(5, 1),
  glycemic_load          NUMERIC(5, 1),
  protein                NUMERIC(6, 1),
  fat                    NUMERIC(6, 1),
  fiber                  NUMERIC(6, 1),
  rating_type1           TEXT CHECK (rating_type1 IN ('safe', 'moderate', 'risky')),
  rating_type2           TEXT CHECK (rating_type2 IN ('safe', 'moderate', 'risky')),
  reason_type1           TEXT,
  reason_type2           TEXT,
  why_risky              JSONB DEFAULT '[]',
  healthier_alternatives JSONB DEFAULT '[]',
  foods_to_avoid         JSONB DEFAULT '[]',
  item_breakdown         JSONB DEFAULT '[]',
  country                TEXT,
  logged_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.food_logs ADD COLUMN IF NOT EXISTS item_breakdown JSONB DEFAULT '[]';
ALTER TABLE public.food_logs ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE public.food_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS food_logs_user_logged_at ON public.food_logs (user_id, logged_at DESC);

ALTER TABLE public.food_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "food_logs_owner" ON public.food_logs;
CREATE POLICY "food_logs_owner" ON public.food_logs
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── glucose_readings (src/routers/glucose.ts) ───────────────────────────────
-- API stores the raw value plus its unit ('mmol' | 'mgdl') and converts to
-- mmol/L on read.
CREATE TABLE IF NOT EXISTS public.glucose_readings (
  id           BIGSERIAL PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  value        NUMERIC(6, 1) NOT NULL,
  unit         TEXT NOT NULL DEFAULT 'mmol' CHECK (unit IN ('mmol', 'mgdl')),
  reading_type TEXT,
  notes        TEXT,
  logged_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.glucose_readings ADD COLUMN IF NOT EXISTS reading_type TEXT;
ALTER TABLE public.glucose_readings ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.glucose_readings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS glucose_readings_user_logged_at ON public.glucose_readings (user_id, logged_at DESC);

ALTER TABLE public.glucose_readings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "glucose_readings_owner" ON public.glucose_readings;
CREATE POLICY "glucose_readings_owner" ON public.glucose_readings
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── weight_entries (src/routers/weight.ts) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.weight_entries (
  id         BIGSERIAL PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  value_kg   NUMERIC(5, 1) NOT NULL,
  notes      TEXT,
  logged_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.weight_entries ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.weight_entries ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS weight_entries_user_logged_at ON public.weight_entries (user_id, logged_at DESC);

ALTER TABLE public.weight_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "weight_entries_owner" ON public.weight_entries;
CREATE POLICY "weight_entries_owner" ON public.weight_entries
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── reminders (src/routers/reminders.ts) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reminders (
  id         BIGSERIAL PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL CHECK (type IN ('meal', 'water')),
  label      TEXT NOT NULL,
  time       TEXT NOT NULL, -- HH:MM 24h format
  enabled    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "reminders_owner" ON public.reminders;
CREATE POLICY "reminders_owner" ON public.reminders
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── meal_plans (src/routers/mealPlan.ts) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.meal_plans (
  id         BIGSERIAL PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  plan_json  TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, week_start)
);

ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "meal_plans_owner" ON public.meal_plans;
CREATE POLICY "meal_plans_owner" ON public.meal_plans
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── shopping_lists (src/routers/shoppingList.ts) ────────────────────────────
CREATE TABLE IF NOT EXISTS public.shopping_lists (
  id           BIGSERIAL PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  meal_plan_id BIGINT REFERENCES public.meal_plans(id) ON DELETE CASCADE,
  list_json    TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.shopping_lists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "shopping_lists_owner" ON public.shopping_lists;
CREATE POLICY "shopping_lists_owner" ON public.shopping_lists
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── progress_photos (src/routers/goals.ts) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.progress_photos (
  id           BIGSERIAL PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week         INTEGER NOT NULL CHECK (week BETWEEN 1 AND 4),
  angle        TEXT NOT NULL CHECK (angle IN ('front', 'side', 'back')),
  photo_base64 TEXT NOT NULL,
  note         TEXT DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, week, angle)
);

ALTER TABLE public.progress_photos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "progress_photos_owner" ON public.progress_photos;
CREATE POLICY "progress_photos_owner" ON public.progress_photos
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── body_measurements (src/routers/bodyMeasurements.ts) ─────────────────────
CREATE TABLE IF NOT EXISTS public.body_measurements (
  id         BIGSERIAL PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week       INTEGER NOT NULL CHECK (week BETWEEN 1 AND 52),
  arms_cm    NUMERIC(5, 1),
  chest_cm   NUMERIC(5, 1),
  stomach_cm NUMERIC(5, 1),
  hips_cm    NUMERIC(5, 1),
  thighs_cm  NUMERIC(5, 1),
  calves_cm  NUMERIC(5, 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, week)
);

DROP TRIGGER IF EXISTS body_measurements_updated_at ON public.body_measurements;
CREATE TRIGGER body_measurements_updated_at
  BEFORE UPDATE ON public.body_measurements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.body_measurements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "body_measurements_owner" ON public.body_measurements;
CREATE POLICY "body_measurements_owner" ON public.body_measurements
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- Done.
-- ============================================================================
