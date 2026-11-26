import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatSupabaseAuthError,
  hasRoleAccess,
  isJsonResponse,
} from './portalAuth.ts';

test('hasRoleAccess enforces superadmin exclusivity while allowing superadmin into admin portal', () => {
  assert.equal(hasRoleAccess('admin', 'admin'), true);
  assert.equal(hasRoleAccess('admin', 'superadmin'), true);
  assert.equal(hasRoleAccess('admin', 'customer'), false);
  assert.equal(hasRoleAccess('superadmin', 'superadmin'), true);
  assert.equal(hasRoleAccess('superadmin', 'admin'), false);
  assert.equal(hasRoleAccess('superadmin', undefined), false);
});

test('formatSupabaseAuthError turns generic Supabase messages into actionable staff guidance', () => {
  const invalidMsg = formatSupabaseAuthError('Invalid login credentials');
  assert.ok(invalidMsg.includes('First-Time Setup'));
  assert.ok(invalidMsg.includes('Authentication → Users'));

  const unconfirmedMsg = formatSupabaseAuthError('Email not confirmed');
  assert.ok(unconfirmedMsg.toLowerCase().includes('confirmation'));

  const existingMsg = formatSupabaseAuthError('User already registered');
  assert.ok(existingMsg.includes('Sign In'));
});

test('isJsonResponse distinguishes JSON API responses from static HTML SPA fallbacks', () => {
  assert.equal(
    isJsonResponse({ headers: new Headers({ 'content-type': 'application/json; charset=utf-8' }) }),
    true
  );
  assert.equal(
    isJsonResponse({ headers: new Headers({ 'content-type': 'text/html; charset=utf-8' }) }),
    false
  );
  assert.equal(
    isJsonResponse({ headers: new Headers() }),
    false
  );
});
