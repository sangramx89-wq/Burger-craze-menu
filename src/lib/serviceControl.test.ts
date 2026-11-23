import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ADMIN_AUTH_REMEMBER_KEY,
  REMEMBER_ME_DURATION_MS,
  SUPERADMIN_AUTH_REMEMBER_KEY,
  clearPortalSession,
  clearRememberedPortalEmail,
  getRememberedPortalEmail,
  hasActivePortalSession,
  savePortalSession,
} from './serviceControl.ts';

class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

function installMockWebStorage() {
  const session = new MemoryStorage();
  const local = new MemoryStorage();
  Object.defineProperty(globalThis, 'sessionStorage', {
    value: session,
    configurable: true,
    writable: true,
  });
  Object.defineProperty(globalThis, 'localStorage', {
    value: local,
    configurable: true,
    writable: true,
  });
  return { session, local };
}

test('Remember Me keeps session active across browser restarts for 30 days and saves email', () => {
  const { session, local } = installMockWebStorage();
  const loginTime = 1_700_000_000_000;

  savePortalSession('admin', '  sangramx89@gmail.com  ', true, loginTime);
  assert.equal(getRememberedPortalEmail('admin'), 'sangramx89@gmail.com');
  assert.equal(hasActivePortalSession('admin', loginTime + 1000), true);

  // Simulate closing browser (sessionStorage cleared, localStorage retained)
  session.clear();
  assert.equal(hasActivePortalSession('admin', loginTime + REMEMBER_ME_DURATION_MS - 1000), true);

  // At 30 days exact boundary, session expires and cleans up stale record
  assert.equal(hasActivePortalSession('admin', loginTime + REMEMBER_ME_DURATION_MS), false);
  assert.equal(local.getItem(ADMIN_AUTH_REMEMBER_KEY), null);
  // Email stays saved until explicitly forgotten or replaced without Remember Me
  assert.equal(getRememberedPortalEmail('admin'), 'sangramx89@gmail.com');
});

test('Signing in without Remember Me uses tab-only session and clears prior remembered state', () => {
  const { session } = installMockWebStorage();
  const t0 = 1_700_000_000_000;

  savePortalSession('superadmin', 'sangramroul100@gmail.com', true, t0);
  assert.equal(getRememberedPortalEmail('superadmin'), 'sangramroul100@gmail.com');

  // Re-authenticate with Remember Me unchecked
  savePortalSession('superadmin', 'sangramroul100@gmail.com', false, t0 + 5000);
  assert.equal(getRememberedPortalEmail('superadmin'), '');
  assert.equal(hasActivePortalSession('superadmin', t0 + 5000), true);

  // Closing tab ends session
  session.clear();
  assert.equal(hasActivePortalSession('superadmin', t0 + 6000), false);
});

test('Sign out revokes both tab and 30-day sessions while portals stay isolated', () => {
  installMockWebStorage();
  const t0 = 1_700_000_000_000;

  savePortalSession('admin', 'admin@example.com', true, t0);
  savePortalSession('superadmin', 'super@example.com', true, t0);

  clearPortalSession('admin');
  assert.equal(hasActivePortalSession('admin', t0 + 1000), false);
  assert.equal(hasActivePortalSession('superadmin', t0 + 1000), true);
  assert.equal(getRememberedPortalEmail('admin'), 'admin@example.com');

  clearRememberedPortalEmail('admin');
  assert.equal(getRememberedPortalEmail('admin'), '');
  assert.equal(getRememberedPortalEmail('superadmin'), 'super@example.com');
});

test('Malformed or tampered persistent session records fail closed', () => {
  const { local } = installMockWebStorage();
  local.setItem(SUPERADMIN_AUTH_REMEMBER_KEY, '{not-valid-json');
  assert.equal(hasActivePortalSession('superadmin'), false);
  assert.equal(local.getItem(SUPERADMIN_AUTH_REMEMBER_KEY), null);

  // Tampered far-future expiry exceeding 30-day cap is rejected
  const now = 1_700_000_000_000;
  local.setItem(
    SUPERADMIN_AUTH_REMEMBER_KEY,
    JSON.stringify({ authenticatedAt: now, expiresAt: now + REMEMBER_ME_DURATION_MS * 10 })
  );
  assert.equal(hasActivePortalSession('superadmin', now + 1000), false);
  assert.equal(local.getItem(SUPERADMIN_AUTH_REMEMBER_KEY), null);
});
