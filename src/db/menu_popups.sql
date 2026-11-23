-- Legacy per-feature file aligned with supabase/schema.sql strict RLS.
-- Run /supabase/schema.sql as the single complete setup script.

CREATE TABLE IF NOT EXISTS public.menu_popups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  image_url TEXT NOT NULL,
  description TEXT,
  cta_text TEXT,
  cta_link TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 1,
  display_duration INTEGER NOT NULL DEFAULT 6,
  is_scheduled BOOLEAN NOT NULL DEFAULT false,
  start_time TEXT,
  end_time TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_menu_popups_is_active_priority
  ON public.menu_popups (is_active, priority ASC, created_at DESC);

ALTER TABLE public.menu_popups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active popups" ON public.menu_popups;
CREATE POLICY "Public can view active popups"
  ON public.menu_popups
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "Staff can manage all popups" ON public.menu_popups;
DROP POLICY IF EXISTS "Allow admin portal popup management" ON public.menu_popups;
DROP POLICY IF EXISTS "Authorized staff can read all popups" ON public.menu_popups;
CREATE POLICY "Authorized staff can read all popups"
  ON public.menu_popups
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.authorized_staff s
      WHERE lower(s.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );

DROP POLICY IF EXISTS "Authorized staff can insert popups" ON public.menu_popups;
CREATE POLICY "Authorized staff can insert popups"
  ON public.menu_popups
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.authorized_staff s
      WHERE lower(s.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );

DROP POLICY IF EXISTS "Authorized staff can update popups" ON public.menu_popups;
CREATE POLICY "Authorized staff can update popups"
  ON public.menu_popups
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.authorized_staff s
      WHERE lower(s.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.authorized_staff s
      WHERE lower(s.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );

DROP POLICY IF EXISTS "Authorized staff can delete popups" ON public.menu_popups;
CREATE POLICY "Authorized staff can delete popups"
  ON public.menu_popups
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.authorized_staff s
      WHERE lower(s.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );
