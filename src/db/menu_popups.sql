-- ==============================================================================
-- Migration: Create menu_popups table for Announcement & Promotional Pop-up Queue
-- Target Database: Supabase / PostgreSQL
-- ==============================================================================

-- 1. Create menu_popups Table
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

-- Idempotent column alterations for existing deployments
ALTER TABLE public.menu_popups ALTER COLUMN cta_text DROP NOT NULL;
ALTER TABLE public.menu_popups ALTER COLUMN cta_text DROP DEFAULT;
ALTER TABLE public.menu_popups ADD COLUMN IF NOT EXISTS display_duration INTEGER NOT NULL DEFAULT 6;
ALTER TABLE public.menu_popups ADD COLUMN IF NOT EXISTS is_scheduled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.menu_popups ADD COLUMN IF NOT EXISTS start_time TEXT;
ALTER TABLE public.menu_popups ADD COLUMN IF NOT EXISTS end_time TEXT;

-- 2. Indexes for efficient queue resolution on customer menu load
CREATE INDEX IF NOT EXISTS idx_menu_popups_is_active_priority 
  ON public.menu_popups (is_active, priority ASC, created_at DESC);

-- 3. Row Level Security (RLS) Configuration
ALTER TABLE public.menu_popups ENABLE ROW LEVEL SECURITY;

-- Allow public read of active popups for customers opening digital menu
DROP POLICY IF EXISTS "Public can view active popups" ON public.menu_popups;
CREATE POLICY "Public can view active popups" 
  ON public.menu_popups 
  FOR SELECT 
  USING (is_active = true);

-- Allow Admin Portal (using VITE_SUPABASE_ANON_KEY) full management access
DROP POLICY IF EXISTS "Staff can manage all popups" ON public.menu_popups;
DROP POLICY IF EXISTS "Allow admin portal popup management" ON public.menu_popups;
CREATE POLICY "Allow admin portal popup management" 
  ON public.menu_popups 
  FOR ALL 
  TO anon, authenticated 
  USING (true) 
  WITH CHECK (true);

-- 4. Initial Curated Seed Announcements with Timing (only inserted when empty)
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
      'Weekend Feast Offer!',
      'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80',
      'Get 20% off on all signature wood-fired pizzas every Friday through Sunday.',
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
      'Flame-grilled paneer tikka & crispy appetizers fresh from clay oven (11:30 AM - 3:30 PM).',
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
      'Double cheese melt patties served with golden hand-cut fries and house dip (6:00 PM - 11:00 PM).',
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
