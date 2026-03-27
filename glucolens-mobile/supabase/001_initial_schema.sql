-- ============================================================
-- GlucoLens — Supabase PostgreSQL Schema
-- Migration 001: Initial schema
--
-- Run this in the Supabase SQL editor or via `supabase db push`.
-- All tables use Row Level Security (RLS) so each user can
-- only read and write their own rows.
-- ============================================================

-- ── Extensions ───────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── User Profiles ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name       TEXT,
  last_name        TEXT,
  email            TEXT,
  age              INTEGER,
  gender           TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
  height_cm        NUMERIC(5, 1),
  weight_kg        NUMERIC(5, 1),
  diabetes_type    TEXT NOT NULL DEFAULT 'type2'
                   CHECK (diabetes_type IN ('type1', 'type2', 'prediabetes', 'unsure')),
  activity_level   TEXT NOT NULL DEFAULT 'light'
                   CHECK (activity_level IN ('sedentary', 'light', 'moderate', 'active', 'very_active')),
  country          TEXT,
  dietary_prefs    TEXT,
  onboarding_complete SMALLINT NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

-- Trigger: auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own profile"
  ON public.user_profiles
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── Food Logs ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.food_logs (
  id                   BIGSERIAL PRIMARY KEY,
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  meal_name            TEXT NOT NULL,
  calories             NUMERIC(7, 1),
  total_sugar          NUMERIC(6, 1),
  total_carbs          NUMERIC(6, 1),
  glycemic_index       INTEGER,
  glycemic_load        NUMERIC(5, 1),
  protein              NUMERIC(6, 1),
  fat                  NUMERIC(6, 1),
  fiber                NUMERIC(6, 1),
  rating_type1         TEXT CHECK (rating_type1 IN ('safe', 'moderate', 'risky')),
  rating_type2         TEXT CHECK (rating_type2 IN ('safe', 'moderate', 'risky')),
  reason_type1         TEXT,
  reason_type2         TEXT,
  why_risky            JSONB DEFAULT '[]',
  healthier_alternatives JSONB DEFAULT '[]',
  foods_to_avoid       JSONB DEFAULT '[]',
  identified_foods     JSONB DEFAULT '[]',
  item_breakdown       JSONB DEFAULT '[]',
  country              TEXT,
  logged_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index: fast lookup of a user's recent meals
CREATE INDEX food_logs_user_logged_at ON public.food_logs (user_id, logged_at DESC);

-- RLS
ALTER TABLE public.food_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own food logs"
  ON public.food_logs
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── Glucose Logs ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.glucose_logs (
  id             BIGSERIAL PRIMARY KEY,
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  value_mmol     NUMERIC(4, 1) NOT NULL,
  reading_type   TEXT NOT NULL DEFAULT 'random'
                 CHECK (reading_type IN ('fasting', 'pre-meal', 'post-meal', 'bedtime', 'random')),
  notes          TEXT,
  recorded_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX glucose_logs_user_recorded ON public.glucose_logs (user_id, recorded_at DESC);

ALTER TABLE public.glucose_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own glucose logs"
  ON public.glucose_logs
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── Weight Logs ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.weight_logs (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  weight_kg   NUMERIC(5, 1) NOT NULL,
  notes       TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX weight_logs_user_recorded ON public.weight_logs (user_id, recorded_at DESC);

ALTER TABLE public.weight_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own weight logs"
  ON public.weight_logs
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── Reminders ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reminders (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('meal', 'water')),
  label       TEXT NOT NULL,
  time        TEXT NOT NULL,          -- HH:MM 24h format
  enabled     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own reminders"
  ON public.reminders
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── Meal Plans ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.meal_plans (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start  DATE NOT NULL,
  plan_json   TEXT NOT NULL,          -- Full AI-generated weekly plan as JSON string
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, week_start)
);

ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own meal plans"
  ON public.meal_plans
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── Shopping Lists ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.shopping_lists (
  id            BIGSERIAL PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  meal_plan_id  BIGINT REFERENCES public.meal_plans(id) ON DELETE CASCADE,
  list_json     TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.shopping_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own shopping lists"
  ON public.shopping_lists
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── Meal Favourites ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.meal_favourites (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  meal_name   TEXT NOT NULL,
  calories    NUMERIC(7, 1),
  total_carbs NUMERIC(6, 1),
  total_sugar NUMERIC(6, 1),
  snapshot_json TEXT,                 -- Full analysis JSON for quick re-log
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.meal_favourites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own favourites"
  ON public.meal_favourites
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- Done. Run migration 002 for any future schema changes.
-- ============================================================
