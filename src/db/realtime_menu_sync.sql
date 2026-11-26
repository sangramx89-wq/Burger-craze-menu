-- Legacy per-feature file aligned with supabase/schema.sql strict RLS.
-- Run /supabase/schema.sql as the single complete setup script.

CREATE TABLE IF NOT EXISTS public.authorized_staff (
  email TEXT PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('admin', 'superadmin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.authorized_staff ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can verify own authorization" ON public.authorized_staff;
CREATE POLICY "Staff can verify own authorization"
  ON public.authorized_staff
  FOR SELECT
  TO authenticated
  USING (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

INSERT INTO public.authorized_staff (email, role)
VALUES
  ('sangramx89@gmail.com', 'admin'),
  ('sangramroul100@gmail.com', 'superadmin')
ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role;

CREATE TABLE IF NOT EXISTS public.storefront_state (
  id TEXT PRIMARY KEY DEFAULT 'default',
  payload JSONB NOT NULL,
  revision BIGINT NOT NULL DEFAULT 0,
  updated_by TEXT NOT NULL DEFAULT 'admin',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.storefront_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read storefront state" ON public.storefront_state;
CREATE POLICY "Public can read storefront state"
  ON public.storefront_state
  FOR SELECT
  TO anon, authenticated
  USING (id = 'default');

DROP POLICY IF EXISTS "Admin portal can upsert storefront state" ON public.storefront_state;
DROP POLICY IF EXISTS "Authorized staff can insert storefront state" ON public.storefront_state;
CREATE POLICY "Authorized staff can insert storefront state"
  ON public.storefront_state
  FOR INSERT
  TO authenticated
  WITH CHECK (
    id = 'default'
    AND EXISTS (
      SELECT 1 FROM public.authorized_staff s
      WHERE lower(s.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );

DROP POLICY IF EXISTS "Authorized staff can update storefront state" ON public.storefront_state;
CREATE POLICY "Authorized staff can update storefront state"
  ON public.storefront_state
  FOR UPDATE
  TO authenticated
  USING (
    id = 'default'
    AND EXISTS (
      SELECT 1 FROM public.authorized_staff s
      WHERE lower(s.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  )
  WITH CHECK (
    id = 'default'
    AND EXISTS (
      SELECT 1 FROM public.authorized_staff s
      WHERE lower(s.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );

DROP POLICY IF EXISTS "Authorized staff can delete storefront state" ON public.storefront_state;
CREATE POLICY "Authorized staff can delete storefront state"
  ON public.storefront_state
  FOR DELETE
  TO authenticated
  USING (
    id = 'default'
    AND EXISTS (
      SELECT 1 FROM public.authorized_staff s
      WHERE lower(s.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );

ALTER TABLE public.storefront_state REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.storefront_state;
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;
