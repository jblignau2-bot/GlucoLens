-- ─────────────────────────────────────────────────────────────────────────────
-- 001_progress_photos_storage.sql
--
-- Migrate progress photos from base64-in-Postgres to Supabase Storage.
--   1. Create a private `progress-photos` storage bucket.
--   2. Owner-only RLS policies on storage.objects: users may only touch
--      objects whose path starts with their own auth.uid() || '/'.
--   3. Add `storage_path` column to public.progress_photos and make the
--      legacy `photo_base64` column nullable (new rows store a path instead).
--
-- Idempotent — safe to run multiple times.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Private bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('progress-photos', 'progress-photos', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Owner-only RLS policies on storage.objects for this bucket
DROP POLICY IF EXISTS "progress_photos_select_own" ON storage.objects;
CREATE POLICY "progress_photos_select_own" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'progress-photos'
    AND name LIKE auth.uid()::text || '/%'
  );

DROP POLICY IF EXISTS "progress_photos_insert_own" ON storage.objects;
CREATE POLICY "progress_photos_insert_own" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'progress-photos'
    AND name LIKE auth.uid()::text || '/%'
  );

DROP POLICY IF EXISTS "progress_photos_update_own" ON storage.objects;
CREATE POLICY "progress_photos_update_own" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'progress-photos'
    AND name LIKE auth.uid()::text || '/%'
  )
  WITH CHECK (
    bucket_id = 'progress-photos'
    AND name LIKE auth.uid()::text || '/%'
  );

DROP POLICY IF EXISTS "progress_photos_delete_own" ON storage.objects;
CREATE POLICY "progress_photos_delete_own" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'progress-photos'
    AND name LIKE auth.uid()::text || '/%'
  );

-- 3. Table changes: add storage_path, relax legacy photo_base64
ALTER TABLE public.progress_photos
  ADD COLUMN IF NOT EXISTS storage_path TEXT;

ALTER TABLE public.progress_photos
  ALTER COLUMN photo_base64 DROP NOT NULL;
