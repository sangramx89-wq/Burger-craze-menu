import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { formatSupabaseErrorHint, SUPABASE_SETUP_SQL } from './supabaseDiagnostics.ts';

test('supabase/schema.sql stays synchronized with in-app SUPABASE_SETUP_SQL', () => {
  const schemaPath = path.resolve(process.cwd(), 'supabase/schema.sql');
  const fileSql = fs.readFileSync(schemaPath, 'utf8');
  assert.equal(fileSql.trim(), SUPABASE_SETUP_SQL.trim());
});

test('SQL setup script defines required tables, RLS, realtime publication, and storage bucket', () => {
  assert.match(SUPABASE_SETUP_SQL, /CREATE TABLE IF NOT EXISTS public\.storefront_state/i);
  assert.match(SUPABASE_SETUP_SQL, /CREATE TABLE IF NOT EXISTS public\.menu_popups/i);
  assert.match(SUPABASE_SETUP_SQL, /ALTER TABLE public\.storefront_state ENABLE ROW LEVEL SECURITY/i);
  assert.match(SUPABASE_SETUP_SQL, /ALTER TABLE public\.menu_popups ENABLE ROW LEVEL SECURITY/i);
  assert.match(SUPABASE_SETUP_SQL, /ALTER PUBLICATION supabase_realtime ADD TABLE public\.storefront_state/i);
  assert.match(SUPABASE_SETUP_SQL, /ALTER PUBLICATION supabase_realtime ADD TABLE public\.menu_popups/i);
  assert.match(SUPABASE_SETUP_SQL, /'menu-media'/);
});

test('formatSupabaseErrorHint produces actionable owner guidance', () => {
  assert.match(
    formatSupabaseErrorHint('relation "public.storefront_state" does not exist'),
    /run the SQL Setup Script/i
  );
  assert.match(
    formatSupabaseErrorHint('new row violates row-level security policy'),
    /Blocked by RLS policy/i
  );
  assert.match(formatSupabaseErrorHint('Bucket not found'), /menu-media/);
});
