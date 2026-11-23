import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient.ts';
import { MEDIA_BUCKET_NAME } from './mediaStorage.ts';

export interface TableCheckResult {
  ok: boolean;
  error?: string;
  hasSeedRow?: boolean;
  revision?: number;
  updatedAt?: string;
  rowCount?: number;
}

export interface StaffAuthCheckResult {
  signedIn: boolean;
  email?: string;
  authorized: boolean;
  role?: 'admin' | 'superadmin';
  error?: string;
}

export interface SupabaseDiagnosticsReport {
  configured: boolean;
  checkedAt: string;
  storefrontTable: TableCheckResult;
  popupsTable: TableCheckResult;
  storageBucket: TableCheckResult;
  staffAuth: StaffAuthCheckResult;
}

export const SUPABASE_SETUP_SQL = `-- ==============================================================================
-- The Burger Craze — Hardened Idempotent Supabase Backend Setup Script
-- Paste and run this entire script once in:
--   Supabase Dashboard -> SQL Editor -> New query -> Run
--
-- Security Model:
--   • Customer phones (anon) have STRICTLY READ-ONLY access to menu & active banners.
--   • Only verified staff signed in via Supabase Auth (listed in authorized_staff)
--     can write/update/delete dishes, availability, pop-ups, branding, or media.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. AUTHORIZED STAFF ALLOWLIST (Controls who can write to menu & media)
-- ------------------------------------------------------------------------------
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

-- Seed owner accounts (manage additional staff emails directly in Supabase Table Editor)
INSERT INTO public.authorized_staff (email, role)
VALUES
  ('sangramx89@gmail.com', 'admin'),
  ('sangramroul100@gmail.com', 'superadmin')
ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role;

-- ------------------------------------------------------------------------------
-- 2. STOREFRONT LIVE SNAPSHOT TABLE
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

-- ------------------------------------------------------------------------------
-- 3. ANNOUNCEMENT & PROMOTIONAL POP-UPS TABLE
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
-- 4. REALTIME REPLICATION & PUBLICATION
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
-- 5. PUBLIC READ / STAFF-ONLY WRITE MEDIA STORAGE BUCKET
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
`;

export function formatSupabaseErrorHint(rawMessage?: string | null): string {
  const msg = (rawMessage || '').trim();
  if (!msg) return 'Unknown connection error';

  const lower = msg.toLowerCase();
  if (lower.includes('does not exist') || lower.includes('could not find the table')) {
    return 'Table not created yet — run the SQL Setup Script in Supabase SQL Editor.';
  }
  if (lower.includes('permission denied') || lower.includes('row-level security')) {
    return 'Blocked by RLS policy — sign in as verified staff via Supabase Auth or re-run the SQL Setup Script.';
  }
  if (lower.includes('bucket not found')) {
    return `Storage bucket "${MEDIA_BUCKET_NAME}" missing — run the SQL Setup Script.`;
  }
  return msg;
}

export async function runSupabaseDiagnostics(): Promise<SupabaseDiagnosticsReport> {
  const configured = isSupabaseConfigured();
  const checkedAt = new Date().toISOString();

  if (!configured) {
    return {
      configured: false,
      checkedAt,
      storefrontTable: { ok: false, error: 'Environment variables not configured.' },
      popupsTable: { ok: false, error: 'Environment variables not configured.' },
      storageBucket: { ok: false, error: 'Environment variables not configured.' },
      staffAuth: { signedIn: false, authorized: false, error: 'Supabase not configured.' },
    };
  }

  const client = await getSupabaseClient();
  if (!client) {
    return {
      configured: false,
      checkedAt,
      storefrontTable: { ok: false, error: 'Failed to initialize Supabase client.' },
      popupsTable: { ok: false, error: 'Failed to initialize Supabase client.' },
      storageBucket: { ok: false, error: 'Failed to initialize Supabase client.' },
      staffAuth: { signedIn: false, authorized: false, error: 'Supabase client unavailable.' },
    };
  }

  const [storefrontRes, popupsRes, storageRes, sessionRes] = await Promise.all([
    client
      .from('storefront_state')
      .select('id, revision, updated_at')
      .eq('id', 'default')
      .maybeSingle(),
    client
      .from('menu_popups')
      .select('id', { count: 'exact', head: true }),
    client.storage.from(MEDIA_BUCKET_NAME).list('', { limit: 1 }),
    client.auth.getSession(),
  ]);

  const storefrontTable: TableCheckResult = storefrontRes.error
    ? { ok: false, error: formatSupabaseErrorHint(storefrontRes.error.message) }
    : {
        ok: true,
        hasSeedRow: Boolean(storefrontRes.data),
        revision: storefrontRes.data?.revision ? Number(storefrontRes.data.revision) : undefined,
        updatedAt: typeof storefrontRes.data?.updated_at === 'string' ? storefrontRes.data.updated_at : undefined,
      };

  const popupsTable: TableCheckResult = popupsRes.error
    ? { ok: false, error: formatSupabaseErrorHint(popupsRes.error.message) }
    : {
        ok: true,
        rowCount: popupsRes.count ?? 0,
      };

  const storageBucket: TableCheckResult = storageRes.error
    ? { ok: false, error: formatSupabaseErrorHint(storageRes.error.message) }
    : { ok: true };

  let staffAuth: StaffAuthCheckResult = {
    signedIn: false,
    authorized: false,
  };

  const sessionUser = sessionRes.data.session?.user;
  if (sessionUser?.email) {
    const { data: staffRow, error: staffErr } = await client
      .from('authorized_staff')
      .select('role')
      .ilike('email', sessionUser.email)
      .maybeSingle();

    if (staffErr) {
      staffAuth = {
        signedIn: true,
        email: sessionUser.email,
        authorized: false,
        error: formatSupabaseErrorHint(staffErr.message),
      };
    } else if (staffRow?.role === 'admin' || staffRow?.role === 'superadmin') {
      staffAuth = {
        signedIn: true,
        email: sessionUser.email,
        authorized: true,
        role: staffRow.role,
      };
    } else {
      staffAuth = {
        signedIn: true,
        email: sessionUser.email,
        authorized: false,
        error: 'Signed-in email is not in public.authorized_staff.',
      };
    }
  }

  return {
    configured: true,
    checkedAt,
    storefrontTable,
    popupsTable,
    storageBucket,
    staffAuth,
  };
}
