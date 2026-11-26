import { getSupabaseClient, getSupabaseConfigStatus, isSupabaseConfigured } from './supabaseClient.ts';
import {
  PortalAuthRole,
  clearPortalSession,
  hasActivePortalSession,
  savePortalSession,
} from './serviceControl.ts';

export interface PortalAuthStatus {
  mode: 'supabase' | 'server';
  authenticated: boolean;
  needsFirstRunSetup: boolean;
  serverUnavailable?: boolean;
  needsPasswordRecovery?: boolean;
  email?: string;
}

export interface PortalAuthResult {
  ok: boolean;
  email?: string;
  error?: string;
  info?: string;
  pendingEmailConfirmation?: boolean;
}

interface AuthCredentialsInput {
  role: PortalAuthRole;
  email: string;
  password: string;
  rememberMe: boolean;
}

const PASSWORD_RECOVERY_HASH_RE = /type=recovery/i;

function isPasswordRecoveryUrl(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    PASSWORD_RECOVERY_HASH_RE.test(window.location.hash) ||
    PASSWORD_RECOVERY_HASH_RE.test(window.location.search)
  );
}

async function verifyAuthorizedStaffRole(
  email: string,
  requiredRole: PortalAuthRole
): Promise<{ allowed: boolean; error?: string }> {
  const client = await getSupabaseClient();
  if (!client) {
    return { allowed: false, error: 'Supabase client is not configured.' };
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    return { allowed: false, error: 'Account email is missing.' };
  }

  const { data, error } = await client
    .from('authorized_staff')
    .select('email, role')
    .ilike('email', normalizedEmail)
    .maybeSingle();

  if (error) {
    const msg = error.message || '';
    if (msg.toLowerCase().includes('does not exist')) {
      return {
        allowed: false,
        error: 'authorized_staff table missing. Run supabase/schema.sql in Supabase SQL Editor.',
      };
    }
    return { allowed: false, error: msg || 'Failed to verify staff authorization.' };
  }

  if (!data) {
    return {
      allowed: false,
      error: `Access denied: ${normalizedEmail} is not listed in authorized_staff.`,
    };
  }

  const staffRole = String(data.role || '').toLowerCase();
  const isRoleAllowed =
    requiredRole === 'admin'
      ? staffRole === 'admin' || staffRole === 'superadmin'
      : staffRole === 'superadmin';

  if (!isRoleAllowed) {
    return {
      allowed: false,
      error: `Access denied: ${normalizedEmail} does not have the ${requiredRole} role.`,
    };
  }

  return { allowed: true };
}

export async function getPortalAuthStatus(role: PortalAuthRole): Promise<PortalAuthStatus> {
  if (!isSupabaseConfigured()) {
    const config = getSupabaseConfigStatus();
    return {
      mode: 'server',
      authenticated: false,
      needsFirstRunSetup: false,
      serverUnavailable: true,
      email: config.errorMessage,
    };
  }

  const client = await getSupabaseClient();
  if (!client) {
    return {
      mode: 'server',
      authenticated: false,
      needsFirstRunSetup: false,
      serverUnavailable: true,
    };
  }

  try {
    const { data, error } = await client.auth.getSession();
    if (error || !data.session?.user?.email) {
      return {
        mode: 'supabase',
        authenticated: false,
        needsFirstRunSetup: false,
        needsPasswordRecovery: isPasswordRecoveryUrl(),
      };
    }

    const email = data.session.user.email;
    if (isPasswordRecoveryUrl()) {
      return {
        mode: 'supabase',
        authenticated: false,
        needsFirstRunSetup: false,
        needsPasswordRecovery: true,
        email,
      };
    }

    const authz = await verifyAuthorizedStaffRole(email, role);
    if (!authz.allowed) {
      return {
        mode: 'supabase',
        authenticated: false,
        needsFirstRunSetup: false,
        email,
      };
    }

    return {
      mode: 'supabase',
      authenticated: hasActivePortalSession(role) || Boolean(data.session),
      needsFirstRunSetup: false,
      email,
    };
  } catch {
    return {
      mode: 'supabase',
      authenticated: false,
      needsFirstRunSetup: false,
    };
  }
}

export async function signInToPortal({
  role,
  email,
  password,
  rememberMe,
}: AuthCredentialsInput): Promise<PortalAuthResult> {
  const client = await getSupabaseClient();
  if (!client) {
    const config = getSupabaseConfigStatus();
    return {
      ok: false,
      error: config.errorMessage || 'Supabase is not configured.',
    };
  }

  const cleanEmail = email.trim().toLowerCase();
  const { data, error } = await client.auth.signInWithPassword({
    email: cleanEmail,
    password,
  });

  if (error || !data.user?.email) {
    return {
      ok: false,
      error: error?.message || 'Invalid email or password.',
    };
  }

  const authz = await verifyAuthorizedStaffRole(data.user.email, role);
  if (!authz.allowed) {
    await client.auth.signOut();
    clearPortalSession(role);
    return {
      ok: false,
      error: authz.error || 'Account is not authorized for this portal.',
    };
  }

  savePortalSession(role, data.user.email, rememberMe);
  return { ok: true, email: data.user.email };
}

export async function signUpSupabaseStaffAccount({
  role,
  email,
  password,
  rememberMe,
}: AuthCredentialsInput): Promise<PortalAuthResult> {
  const client = await getSupabaseClient();
  if (!client) {
    const config = getSupabaseConfigStatus();
    return {
      ok: false,
      error: config.errorMessage || 'Supabase is not configured.',
    };
  }

  const cleanEmail = email.trim().toLowerCase();
  const { data, error } = await client.auth.signUp({
    email: cleanEmail,
    password,
    options: {
      emailRedirectTo: typeof window !== 'undefined' ? window.location.href : undefined,
    },
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  if (data.session && data.user?.email) {
    const authz = await verifyAuthorizedStaffRole(data.user.email, role);
    if (!authz.allowed) {
      await client.auth.signOut();
      return {
        ok: false,
        error: authz.error || 'Account created, but email is not in authorized_staff.',
      };
    }
    savePortalSession(role, data.user.email, rememberMe);
    return { ok: true, email: data.user.email };
  }

  return {
    ok: false,
    pendingEmailConfirmation: true,
    info: `Confirmation email sent to ${cleanEmail}. Verify your inbox, then sign in.`,
  };
}

export async function sendSupabasePasswordReset({
  email,
}: {
  role: PortalAuthRole;
  email: string;
}): Promise<PortalAuthResult> {
  const client = await getSupabaseClient();
  if (!client) {
    return { ok: false, error: 'Supabase is not configured.' };
  }

  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) {
    return { ok: false, error: 'Enter your email address first.' };
  }

  const redirectTo =
    typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : undefined;

  const { error } = await client.auth.resetPasswordForEmail(cleanEmail, { redirectTo });
  if (error) {
    return { ok: false, error: error.message };
  }

  return {
    ok: true,
    info: `Password reset link sent to ${cleanEmail}.`,
  };
}

export async function completeSupabasePasswordRecovery({
  role,
  newPassword,
  rememberMe,
}: {
  role: PortalAuthRole;
  newPassword: string;
  rememberMe: boolean;
}): Promise<PortalAuthResult> {
  const client = await getSupabaseClient();
  if (!client) {
    return { ok: false, error: 'Supabase is not configured.' };
  }

  const { data, error } = await client.auth.updateUser({ password: newPassword });
  if (error || !data.user?.email) {
    return { ok: false, error: error?.message || 'Could not update password.' };
  }

  const authz = await verifyAuthorizedStaffRole(data.user.email, role);
  if (!authz.allowed) {
    await client.auth.signOut();
    return { ok: false, error: authz.error };
  }

  savePortalSession(role, data.user.email, rememberMe);
  if (typeof window !== 'undefined' && window.location.hash) {
    window.history.replaceState({}, '', `${window.location.pathname}${window.location.search}`);
  }
  return { ok: true, email: data.user.email };
}

export async function claimFirstRunPortalAccount(
  input: AuthCredentialsInput
): Promise<PortalAuthResult> {
  return signUpSupabaseStaffAccount(input);
}

export async function signOutFromPortal(role: PortalAuthRole): Promise<void> {
  clearPortalSession(role);
  const client = await getSupabaseClient();
  if (client) {
    try {
      await client.auth.signOut();
    } catch {
      // Ignore signOut errors
    }
  }
}
