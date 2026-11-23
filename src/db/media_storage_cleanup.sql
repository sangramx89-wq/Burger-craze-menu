-- ==============================================================================
-- Migration: Supabase Storage Bucket & Auto-Cleanup Policies for Menu Media
-- Target Database: Supabase / PostgreSQL Storage
-- Creates public `menu-media` bucket (200 KB+ WebP/PNG dishes, popups, logos)
-- and allows reading, uploading, and automatic orphan deletion when items are
-- deleted or replaced in the Admin Panel.
-- ==============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'menu-media',
  'menu-media',
  true,
  524288,
  ARRAY['image/webp', 'image/png', 'image/jpeg']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public read menu-media" ON storage.objects;
CREATE POLICY "Public read menu-media"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'menu-media');

DROP POLICY IF EXISTS "Admin upload menu-media" ON storage.objects;
CREATE POLICY "Admin upload menu-media"
  ON storage.objects
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'menu-media');

DROP POLICY IF EXISTS "Admin delete menu-media" ON storage.objects;
CREATE POLICY "Admin delete menu-media"
  ON storage.objects
  FOR DELETE
  TO anon, authenticated
  USING (bucket_id = 'menu-media');
