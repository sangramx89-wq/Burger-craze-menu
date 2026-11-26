-- Legacy per-feature file aligned with supabase/schema.sql strict RLS.
-- Run /supabase/schema.sql as the single complete setup script.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'menu-media',
  'menu-media',
  true,
  5242880,
  ARRAY['image/webp', 'image/png', 'image/jpeg', 'image/gif', 'image/svg+xml']
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
  TO authenticated
  WITH CHECK (
    bucket_id = 'menu-media'
    AND (storage.foldername(name))[1] IN ('dishes', 'popups', 'logos')
    AND EXISTS (
      SELECT 1 FROM public.authorized_staff s
      WHERE lower(s.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );

DROP POLICY IF EXISTS "Admin update menu-media" ON storage.objects;
CREATE POLICY "Admin update menu-media"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'menu-media'
    AND (storage.foldername(name))[1] IN ('dishes', 'popups', 'logos')
    AND EXISTS (
      SELECT 1 FROM public.authorized_staff s
      WHERE lower(s.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  )
  WITH CHECK (
    bucket_id = 'menu-media'
    AND (storage.foldername(name))[1] IN ('dishes', 'popups', 'logos')
    AND EXISTS (
      SELECT 1 FROM public.authorized_staff s
      WHERE lower(s.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );

DROP POLICY IF EXISTS "Admin delete menu-media" ON storage.objects;
CREATE POLICY "Admin delete menu-media"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'menu-media'
    AND (storage.foldername(name))[1] IN ('dishes', 'popups', 'logos')
    AND EXISTS (
      SELECT 1 FROM public.authorized_staff s
      WHERE lower(s.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );
