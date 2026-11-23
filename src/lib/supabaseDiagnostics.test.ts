import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { isRealSupabaseConfig } from './supabaseClient.ts';
import { formatSupabaseErrorHint, SUPABASE_SETUP_SQL } from './supabaseDiagnostics.ts';

test('supabase/schema.sql stays synchronized with in-app SUPABASE_SETUP_SQL', () => {
  const schemaPath = path.resolve(process.cwd(), 'supabase/schema.sql');
  const fileSql = fs.readFileSync(schemaPath, 'utf8');
  assert.equal(fileSql.trim(), SUPABASE_SETUP_SQL.trim());
});

test('SQL setup script defines strict read-only anon access and authorized_staff-only writes', () => {
  assert.match(SUPABASE_SETUP_SQL, /CREATE TABLE IF NOT EXISTS public\.authorized_staff/i);
  assert.match(SUPABASE_SETUP_SQL, /CREATE TABLE IF NOT EXISTS public\.storefront_state/i);
  assert.match(SUPABASE_SETUP_SQL, /CREATE TABLE IF NOT EXISTS public\.menu_popups/i);
  assert.match(SUPABASE_SETUP_SQL, /ALTER TABLE public\.authorized_staff ENABLE ROW LEVEL SECURITY/i);
  assert.match(SUPABASE_SETUP_SQL, /ALTER TABLE public\.storefront_state ENABLE ROW LEVEL SECURITY/i);
  assert.match(SUPABASE_SETUP_SQL, /ALTER TABLE public\.menu_popups ENABLE ROW LEVEL SECURITY/i);
  assert.match(SUPABASE_SETUP_SQL, /ALTER PUBLICATION supabase_realtime ADD TABLE public\.storefront_state/i);
  assert.match(SUPABASE_SETUP_SQL, /ALTER PUBLICATION supabase_realtime ADD TABLE public\.menu_popups/i);
  assert.match(SUPABASE_SETUP_SQL, /'menu-media'/);

  // Security assertion: check every CREATE POLICY statement individually — anonymous visitors never get write policies anywhere
  const policyStatements = SUPABASE_SETUP_SQL.split(';').filter((stmt) =>
    /\bCREATE\s+POLICY\b/i.test(stmt)
  );
  assert.ok(policyStatements.length >= 10);
  for (const stmt of policyStatements) {
    if (/\bTO\b[^\n]*\banon\b/i.test(stmt)) {
      assert.match(stmt, /\bFOR\s+SELECT\b/i);
      assert.doesNotMatch(stmt, /\bFOR\s+(ALL|INSERT|UPDATE|DELETE)\b/i);
    }
  }
  assert.match(SUPABASE_SETUP_SQL, /FOR INSERT\s+TO authenticated/i);
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

test('isRealSupabaseConfig rejects starter placeholders and malformed URLs', () => {
  assert.equal(
    isRealSupabaseConfig('https://your-project.supabase.co', 'your-anon-key'),
    false
  );
  assert.equal(isRealSupabaseConfig('https://demo.supabase.co', 'short'), false);
  assert.equal(
    isRealSupabaseConfig('http://demo.supabase.co', 'anon-key-with-sufficient-length'),
    false
  );
  assert.equal(
    isRealSupabaseConfig(
      'https://demo-project.supabase.co',
      'sb_publishable_demo_valid_length_key_123456'
    ),
    true
  );
});
