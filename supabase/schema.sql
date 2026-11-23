-- ==============================================================================
-- The Burger Craze — Complete Idempotent Supabase Backend Setup Script
-- Paste and run this entire script once in:
--   Supabase Dashboard -> SQL Editor -> New query -> Run
--
-- Includes:
--   1. storefront_state table (menus, categories, logos, availability, theme, info)
--   2. menu_popups table (scheduled & priority announcement banners)
--   3. Scoped Row Level Security (RLS) policies
--   4. Realtime WebSocket publication (storefront_state + menu_popups)
--   5. Public menu-media Storage bucket + folder-scoped policies
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. STOREFRONT LIVE SNAPSHOT TABLE
-- ------------------------------------------------------------------------------
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
CREATE POLICY "Admin portal can upsert storefront state"
  ON public.storefront_state
  FOR ALL
  TO anon, authenticated
  USING (id = 'default')
  WITH CHECK (id = 'default');

-- Note: If you enable Supabase Auth login for staff accounts later, replace
-- "TO anon, authenticated" on the write policy above with "TO authenticated"
-- so only signed-in staff can publish menu changes.

-- ------------------------------------------------------------------------------
-- 2. ANNOUNCEMENT & PROMOTIONAL POP-UPS TABLE
-- ------------------------------------------------------------------------------
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

ALTER TABLE public.menu_popups ALTER COLUMN cta_text DROP NOT NULL;
ALTER TABLE public.menu_popups ALTER COLUMN cta_text DROP DEFAULT;
ALTER TABLE public.menu_popups ADD COLUMN IF NOT EXISTS display_duration INTEGER NOT NULL DEFAULT 6;
ALTER TABLE public.menu_popups ADD COLUMN IF NOT EXISTS is_scheduled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.menu_popups ADD COLUMN IF NOT EXISTS start_time TEXT;
ALTER TABLE public.menu_popups ADD COLUMN IF NOT EXISTS end_time TEXT;

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
CREATE POLICY "Allow admin portal popup management"
  ON public.menu_popups
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Seed starter pop-up banners only when menu_popups is completely empty
INSERT INTO public.menu_popups (
  title,
  image_url,
  description,
  cta_text,
  cta_link,
  is_active,
  priority,
  display_duration,
  is_scheduled,
  start_time,
  end_time
)
SELECT * FROM (
  VALUES
    (
      'Weekend Pizza Fiesta!',
      'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80',
      'Enjoy 20% off all signature wood-fired pizzas every Friday to Sunday evening.',
      'Explore Pizzas',
      'Pizzas',
      true,
      1,
      6,
      false,
      NULL,
      NULL
    ),
    (
      'Lunch Special: Tandoori Starters',
      'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&w=800&q=80',
      'Flame-roasted paneer tikka & golden crispy appetizers straight from clay tandoor (11:30 AM - 3:30 PM).',
      'View Starters',
      'Starters',
      true,
      2,
      5,
      true,
      '11:30',
      '15:30'
    ),
    (
      'Evening Gourmet Burger Combos',
      'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80',
      'Double cheese melt patties layered with herb potato & house aioli (6:00 PM - 11:00 PM).',
      'See Burgers',
      'Burgers',
      true,
      3,
      7,
      true,
      '18:00',
      '23:00'
    )
) AS seed (
  title, image_url, description, cta_text, cta_link,
  is_active, priority, display_duration, is_scheduled, start_time, end_time
)
WHERE NOT EXISTS (SELECT 1 FROM public.menu_popups LIMIT 1);

-- ------------------------------------------------------------------------------
-- 3. REALTIME REPLICATION & PUBLICATION
-- ------------------------------------------------------------------------------
ALTER TABLE public.storefront_state REPLICA IDENTITY FULL;
ALTER TABLE public.menu_popups REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.storefront_state;
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;

    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.menu_popups;
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 4. PUBLIC MENU MEDIA STORAGE BUCKET & FOLDER-SCOPED POLICIES
-- ------------------------------------------------------------------------------
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
  TO anon, authenticated
  WITH CHECK (
    bucket_id = 'menu-media'
    AND (storage.foldername(name))[1] IN ('dishes', 'popups', 'logos')
  );

DROP POLICY IF EXISTS "Admin update menu-media" ON storage.objects;
CREATE POLICY "Admin update menu-media"
  ON storage.objects
  FOR UPDATE
  TO anon, authenticated
  USING (
    bucket_id = 'menu-media'
    AND (storage.foldername(name))[1] IN ('dishes', 'popups', 'logos')
  )
  WITH CHECK (
    bucket_id = 'menu-media'
    AND (storage.foldername(name))[1] IN ('dishes', 'popups', 'logos')
  );

DROP POLICY IF EXISTS "Admin delete menu-media" ON storage.objects;
CREATE POLICY "Admin delete menu-media"
  ON storage.objects
  FOR DELETE
  TO anon, authenticated
  USING (
    bucket_id = 'menu-media'
    AND (storage.foldername(name))[1] IN ('dishes', 'popups', 'logos')
  );
