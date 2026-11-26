import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { resolveSupabaseConfig } from './supabaseClient.ts';
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

test('resolveSupabaseConfig trims quotes/slashes and rejects missing or malformed values', () => {
  const valid = resolveSupabaseConfig('  "https://abcxyz.supabase.co/"  ', " 'sb_publishable_123' ");
  assert.equal(valid.status.configured, true);
  assert.equal(valid.status.issue, 'ready');
  assert.equal(valid.status.url, 'https://abcxyz.supabase.co');
  assert.equal(valid.status.host, 'abcxyz.supabase.co');
  assert.equal(valid.anonKey, 'sb_publishable_123');

  const missingBoth = resolveSupabaseConfig('', undefined);
  assert.equal(missingBoth.status.configured, false);
  assert.equal(missingBoth.status.issue, 'missing-both');

  const missingUrl = resolveSupabaseConfig('', 'anon-key');
  assert.equal(missingUrl.status.configured, false);
  assert.equal(missingUrl.status.issue, 'missing-url');

  const missingKey = resolveSupabaseConfig('https://abcxyz.supabase.co', '');
  assert.equal(missingKey.status.configured, false);
  assert.equal(missingKey.status.issue, 'missing-key');

  const invalidUrl = resolveSupabaseConfig('abcxyz.supabase.co', 'anon-key');
  assert.equal(invalidUrl.status.configured, false);
  assert.equal(invalidUrl.status.issue, 'invalid-url');

  const placeholder = resolveSupabaseConfig('https://your-project.supabase.co', 'your-anon-key');
  assert.equal(placeholder.status.configured, false);
  assert.equal(placeholder.status.issue, 'missing-both');
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
  assert.match(formatSupabaseErrorHint('Invalid API key'), /VITE_SUPABASE_ANON_KEY/);
  assert.match(formatSupabaseErrorHint('TypeError: Failed to fetch'), /VITE_SUPABASE_URL/);
});
