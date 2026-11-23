import { ServiceControlState } from '../types/index.ts';

export const SERVICE_CONTROL_STORAGE_KEY = 'the_burger_craze_service_control';
export const ADMIN_AUTH_SESSION_KEY = 'the_burger_craze_admin_auth';
export const SUPERADMIN_AUTH_SESSION_KEY = 'the_burger_craze_superadmin_auth';

export const ADMIN_AUTH_REMEMBER_KEY = 'the_burger_craze_admin_remember_session';
export const ADMIN_REMEMBER_EMAIL_KEY = 'the_burger_craze_admin_remember_email';
export const SUPERADMIN_AUTH_REMEMBER_KEY = 'the_burger_craze_superadmin_remember_session';
export const SUPERADMIN_REMEMBER_EMAIL_KEY = 'the_burger_craze_superadmin_remember_email';

export const REMEMBER_ME_DAYS = 30;
export const REMEMBER_ME_DURATION_MS = REMEMBER_ME_DAYS * 24 * 60 * 60 * 1000;

export type PortalAuthRole = 'admin' | 'superadmin';

interface StoredRememberSession {
  authenticatedAt: number;
  expiresAt: number;
}

function getSafeStorage(kind: 'session' | 'local'): Storage | null {
  try {
    if (typeof globalThis === 'undefined') return null;
    const storage =
      kind === 'session'
        ? (globalThis as { sessionStorage?: Storage }).sessionStorage
        : (globalThis as { localStorage?: Storage }).localStorage;
    return storage ?? null;
  } catch {
    return null;
  }
}

function getPortalAuthKeys(role: PortalAuthRole) {
  return role === 'admin'
    ? {
        session: ADMIN_AUTH_SESSION_KEY,
        rememberSession: ADMIN_AUTH_REMEMBER_KEY,
        rememberEmail: ADMIN_REMEMBER_EMAIL_KEY,
      }
    : {
        session: SUPERADMIN_AUTH_SESSION_KEY,
        rememberSession: SUPERADMIN_AUTH_REMEMBER_KEY,
        rememberEmail: SUPERADMIN_REMEMBER_EMAIL_KEY,
      };
}

export function hasActivePortalSession(
  role: PortalAuthRole,
  now: number = Date.now()
): boolean {
  const keys = getPortalAuthKeys(role);
  const session = getSafeStorage('session');
  try {
    if (session?.getItem(keys.session) === 'true') {
      return true;
    }
  } catch {
    // Ignore storage access errors
  }

  const local = getSafeStorage('local');
  if (!local) return false;
  try {
    const raw = local.getItem(keys.rememberSession);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as Partial<StoredRememberSession>;
    const isValid =
      typeof parsed.authenticatedAt === 'number' &&
      typeof parsed.expiresAt === 'number' &&
      Number.isFinite(parsed.authenticatedAt) &&
      Number.isFinite(parsed.expiresAt) &&
      parsed.expiresAt > parsed.authenticatedAt &&
      parsed.expiresAt - parsed.authenticatedAt <= REMEMBER_ME_DURATION_MS + 60_000 &&
      now < parsed.expiresAt;

    if (isValid) {
      return true;
    }
    local.removeItem(keys.rememberSession);
  } catch {
    try {
      local.removeItem(keys.rememberSession);
    } catch {
      // Ignore cleanup errors
    }
  }
  return false;
}

export function savePortalSession(
  role: PortalAuthRole,
  email: string,
  rememberMe: boolean,
  now: number = Date.now()
): void {
  const keys = getPortalAuthKeys(role);
  const session = getSafeStorage('session');
  try {
    session?.setItem(keys.session, 'true');
  } catch {
    // Ignore storage errors
  }

  const local = getSafeStorage('local');
  if (!local) return;
  try {
    if (rememberMe) {
      const record: StoredRememberSession = {
        authenticatedAt: now,
        expiresAt: now + REMEMBER_ME_DURATION_MS,
      };
      local.setItem(keys.rememberSession, JSON.stringify(record));
      const trimmedEmail = email.trim();
      if (trimmedEmail) {
        local.setItem(keys.rememberEmail, trimmedEmail);
      }
    } else {
      local.removeItem(keys.rememberSession);
      local.removeItem(keys.rememberEmail);
    }
  } catch {
    // Ignore storage errors
  }
}

export function clearPortalSession(role: PortalAuthRole): void {
  const keys = getPortalAuthKeys(role);
  try {
    getSafeStorage('session')?.removeItem(keys.session);
  } catch {
    // Ignore storage errors
  }
  try {
    getSafeStorage('local')?.removeItem(keys.rememberSession);
  } catch {
    // Ignore storage errors
  }
}

export function getRememberedPortalEmail(role: PortalAuthRole): string {
  const keys = getPortalAuthKeys(role);
  try {
    return getSafeStorage('local')?.getItem(keys.rememberEmail)?.trim() || '';
  } catch {
    return '';
  }
}

export function clearRememberedPortalEmail(role: PortalAuthRole): void {
  const keys = getPortalAuthKeys(role);
  try {
    getSafeStorage('local')?.removeItem(keys.rememberEmail);
  } catch {
    // Ignore storage errors
  }
}

export const ADMIN_CREDENTIALS = {
  id: 'sangramx89@gmail.com',
  password: 'burger_craze98',
};

export const SUPERADMIN_CREDENTIALS = {
  id: 'sangramroul100@gmail.com',
  password: 'Sangram@71',
};

export const DEFAULT_PAUSE_TITLE = 'Service Temporarily Paused';
export const DEFAULT_PAUSE_MESSAGE =
  'The Burger Craze is currently undergoing scheduled maintenance. Please check back shortly or call us directly for assistance.';

export const DEFAULT_SERVICE_CONTROL: ServiceControlState = {
  isPaused: false,
  pauseTitle: DEFAULT_PAUSE_TITLE,
  pauseMessage: DEFAULT_PAUSE_MESSAGE,
  isAdminLocked: false,
  suppressPopups: false,
  updatedAt: null,
  actionLog: [],
};

export function validateAdminCredentials(idInput: string, passwordInput: string): boolean {
  return (
    idInput.trim().toLowerCase() === ADMIN_CREDENTIALS.id.toLowerCase() &&
    passwordInput === ADMIN_CREDENTIALS.password
  );
}

export function validateSuperAdminCredentials(idInput: string, passwordInput: string): boolean {
  return (
    idInput.trim().toLowerCase() === SUPERADMIN_CREDENTIALS.id.toLowerCase() &&
    passwordInput === SUPERADMIN_CREDENTIALS.password
  );
}

export function loadServiceControl(): ServiceControlState {
  try {
    const raw = localStorage.getItem(SERVICE_CONTROL_STORAGE_KEY);
    if (!raw) return DEFAULT_SERVICE_CONTROL;
    const parsed = JSON.parse(raw) as Partial<ServiceControlState>;
    return {
      isPaused: Boolean(parsed.isPaused),
      pauseTitle: parsed.pauseTitle?.trim() || DEFAULT_PAUSE_TITLE,
      pauseMessage: parsed.pauseMessage?.trim() || DEFAULT_PAUSE_MESSAGE,
      isAdminLocked: Boolean(parsed.isAdminLocked),
      suppressPopups: Boolean(parsed.suppressPopups),
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : null,
      actionLog: Array.isArray(parsed.actionLog) ? parsed.actionLog : [],
    };
  } catch {
    return DEFAULT_SERVICE_CONTROL;
  }
}

export function saveServiceControl(state: ServiceControlState): void {
  try {
    localStorage.setItem(SERVICE_CONTROL_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors
  }
}
