-- ==============================================================================
-- Migration: Real-Time Storefront & Menu Synchronization
-- Target Database: Supabase / PostgreSQL
-- Enables multi-device live updates for dishes, categories, stock, theme,
-- cafe info, service controls, and promotional pop-ups.
-- ==============================================================================

-- 1. Create storefront_state table for atomic real-time menu & theme sync
CREATE TABLE IF NOT EXISTS public.storefront_state (
  id TEXT PRIMARY KEY DEFAULT 'default',
  payload JSONB NOT NULL,
  revision BIGINT NOT NULL DEFAULT 0,
  updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Row Level Security (RLS)
ALTER TABLE public.storefront_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read storefront state" ON public.storefront_state;
CREATE POLICY "Public can read storefront state"
  ON public.storefront_state
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Admin portal can upsert storefront state" ON public.storefront_state;
CREATE POLICY "Admin portal can upsert storefront state"
  ON public.storefront_state
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 3. Ensure full row data is emitted for Realtime updates
ALTER TABLE public.storefront_state REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'menu_popups'
  ) THEN
    EXECUTE 'ALTER TABLE public.menu_popups REPLICA IDENTITY FULL';
  END IF;
END $$;

-- 4. Add tables to supabase_realtime publication safely (idempotent)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.storefront_state;
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;

    IF EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'menu_popups'
    ) THEN
      BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.menu_popups;
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END;
    END IF;
  END IF;
END $$;
