import {
  PortalAuthRole,
  clearPortalSession,
  savePortalSession,
} from './serviceControl.ts';
import {
  getSupabaseClient,
  hydrateSupabaseConfig,
  isSupabaseConfigured,
} from './supabaseClient.ts';

export interface PortalAuthStatus {
  mode: 'supabase' | 'server';
  authenticated: boolean;
  needsFirstRunSetup: boolean;
  serverUnavailable?: boolean;
  needsPasswordRecovery?: boolean;
  email?: string;
  role?: PortalAuthRole;
}

export interface PortalAuthActionResult {
  ok: boolean;
  error?: string;
  info?: string;
  pendingEmailConfirmation?: boolean;
  email?: string;
}

// Ephemeral in-memory Bearer tokens for local Express server fallback (never persisted in Web Storage)
const inMemoryBearerTokens: Partial<Record<PortalAuthRole, string>> = {};

export function hasRoleAccess(
  requiredRole: PortalAuthRole,
  assignedRole: string | undefined
): boolean {
  if (requiredRole === 'superadmin') {
    return assignedRole === 'superadmin';
  }
  return assignedRole === 'admin' || assignedRole === 'superadmin';
}

export function isJsonResponse(res: Pick<Response, 'headers'>): boolean {
  const contentType = res.headers?.get?.('content-type') || '';
  return contentType.toLowerCase().includes('application/json');
}

export function formatSupabaseAuthError(message?: string | null): string {
  const msg = (message || '').trim();
  const lower = msg.toLowerCase();

  if (lower.includes('invalid login credentials')) {
    return 'Invalid email or password. If this is your first login on Supabase, switch to "First-Time Setup" below to set your password (or create the user in Supabase Dashboard → Authentication → Users).';
  }
  if (lower.includes('email not confirmed')) {
    return 'Email not verified yet. Open the Supabase confirmation link in your inbox, or confirm the user in Supabase Dashboard → Authentication → Users.';
  }
  if (lower.includes('user already registered')) {
    return 'This email already has a Supabase Auth account. Switch to "Sign In" or use "Forgot Password" to reset it.';
  }
  if (lower.includes('password should be at least') || lower.includes('weak password')) {
    return msg;
  }
  return msg || 'Authentication failed.';
}

function hasRecoveryParamsInUrl(): boolean {
  if (typeof window === 'undefined') return false;
  const hash = window.location.hash.toLowerCase();
  const search = window.location.search.toLowerCase();
  return hash.includes('type=recovery') || search.includes('type=recovery');
}

async function verifySupabaseStaffRole(
  email: string
): Promise<{ authorized: boolean; role?: PortalAuthRole; error?: string }> {
  const client = await getSupabaseClient();
  if (!client) {
    return { authorized: false, error: 'Supabase client unavailable.' };
  }

  const { data, error } = await client
    .from('authorized_staff')
    .select('role')
    .ilike('email', email.trim())
    .maybeSingle();

  if (error) {
    const lower = error.message.toLowerCase();
    if (lower.includes('does not exist')) {
      return {
        authorized: false,
        error: 'Staff authorization table missing — run supabase/schema.sql in SQL Editor first.',
      };
    }
    return { authorized: false, error: error.message };
  }

  if (data?.role === 'admin' || data?.role === 'superadmin') {
    return { authorized: true, role: data.role };
  }

  return {
    authorized: false,
    error: 'Access denied: this email is not listed in authorized_staff.',
  };
}

export async function getPortalAuthStatus(
  requiredRole: PortalAuthRole
): Promise<PortalAuthStatus> {
  await hydrateSupabaseConfig();

  if (isSupabaseConfigured()) {
    const client = await getSupabaseClient();
    const isRecovery = hasRecoveryParamsInUrl();
    if (client) {
      const { data } = await client.auth.getSession();
      const userEmail = data.session?.user?.email?.trim();
      if (userEmail) {
        if (isRecovery) {
          return {
            mode: 'supabase',
            authenticated: false,
            needsFirstRunSetup: false,
            needsPasswordRecovery: true,
            email: userEmail,
          };
        }
        const staff = await verifySupabaseStaffRole(userEmail);
        if (staff.authorized && hasRoleAccess(requiredRole, staff.role)) {
          return {
            mode: 'supabase',
            authenticated: true,
            needsFirstRunSetup: false,
            email: userEmail,
            role: staff.role,
          };
        }
        await client.auth.signOut();
      }
    }

    return {
      mode: 'supabase',
      authenticated: false,
      needsFirstRunSetup: false,
      needsPasswordRecovery: isRecovery,
    };
  }

  // Fallback to server-side /api/auth/* routes
  const token = inMemoryBearerTokens[requiredRole];
  if (token) {
    try {
      const meRes = await fetch(`/api/auth/me?role=${encodeURIComponent(requiredRole)}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      if (meRes.ok && isJsonResponse(meRes)) {
        const me = (await meRes.json()) as { email?: string; role?: PortalAuthRole };
        return {
          mode: 'server',
          authenticated: true,
          needsFirstRunSetup: false,
          email: me.email,
          role: me.role,
        };
      }
      delete inMemoryBearerTokens[requiredRole];
    } catch {
      delete inMemoryBearerTokens[requiredRole];
    }
  }

  try {
    const statusRes = await fetch(`/api/auth/status?role=${encodeURIComponent(requiredRole)}`, {
      cache: 'no-store',
    });
    if (statusRes.ok && isJsonResponse(statusRes)) {
      const st = (await statusRes.json()) as { configured?: boolean };
      return {
        mode: 'server',
        authenticated: false,
        needsFirstRunSetup: !st.configured,
        serverUnavailable: false,
      };
    }
    return {
      mode: 'server',
      authenticated: false,
      needsFirstRunSetup: false,
      serverUnavailable: true,
    };
  } catch {
    return {
      mode: 'server',
      authenticated: false,
      needsFirstRunSetup: false,
      serverUnavailable: true,
    };
  }
}

export async function signInToPortal(params: {
  role: PortalAuthRole;
  email: string;
  password: string;
  rememberMe: boolean;
}): Promise<PortalAuthActionResult> {
  const email = params.email.trim();
  const password = params.password;

  if (!email || !password) {
    return { ok: false, error: 'Email and password are required.' };
  }

  await hydrateSupabaseConfig();

  if (isSupabaseConfigured()) {
    const client = await getSupabaseClient();
    if (!client) {
      return { ok: false, error: 'Unable to initialize Supabase authentication.' };
    }

    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error || !data.user?.email) {
      return {
        ok: false,
        error: formatSupabaseAuthError(error?.message),
      };
    }

    const staff = await verifySupabaseStaffRole(data.user.email);
    if (!staff.authorized || !hasRoleAccess(params.role, staff.role)) {
      await client.auth.signOut();
      return {
        ok: false,
        error:
          staff.error ||
          `Access denied: your account does not have ${params.role} permission.`,
      };
    }

    savePortalSession(params.role, data.user.email, params.rememberMe);
    return { ok: true, email: data.user.email };
  }

  // Express server verification
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: params.role,
        email,
        password,
      }),
    });
    if (!isJsonResponse(res)) {
      return {
        ok: false,
        error:
          'Authentication backend is unavailable on this static host. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel Environment Variables and redeploy.',
      };
    }
    const body = (await res.json().catch(() => ({}))) as {
      token?: string;
      email?: string;
      error?: string;
    };
    if (!res.ok || !body.token) {
      return { ok: false, error: body.error || 'Invalid portal ID or password.' };
    }
    inMemoryBearerTokens[params.role] = body.token;
    savePortalSession(params.role, body.email || email, params.rememberMe);
    return { ok: true, email: body.email || email };
  } catch {
    return { ok: false, error: 'Unable to reach authentication server.' };
  }
}

export async function signUpSupabaseStaffAccount(params: {
  role: PortalAuthRole;
  email: string;
  password: string;
  rememberMe: boolean;
}): Promise<PortalAuthActionResult> {
  const email = params.email.trim();
  const password = params.password;

  if (!email || !password) {
    return { ok: false, error: 'Email and password are required.' };
  }
  if (password.length < 8) {
    return { ok: false, error: 'Password must be at least 8 characters.' };
  }

  await hydrateSupabaseConfig();
  if (!isSupabaseConfigured()) {
    return { ok: false, error: 'Supabase is not configured on this deployment.' };
  }

  const client = await getSupabaseClient();
  if (!client) {
    return { ok: false, error: 'Unable to initialize Supabase authentication.' };
  }

  const redirectPath = params.role === 'superadmin' ? '/superadmin' : '/admin';
  const emailRedirectTo =
    typeof window !== 'undefined' ? `${window.location.origin}${redirectPath}` : undefined;

  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: emailRedirectTo ? { emailRedirectTo } : undefined,
  });

  if (error) {
    return {
      ok: false,
      error: formatSupabaseAuthError(error.message),
    };
  }

  // If Supabase returned an immediate active session (email confirmation disabled), verify allowlist role right away
  if (data.session && data.user?.email) {
    const staff = await verifySupabaseStaffRole(data.user.email);
    if (!staff.authorized || !hasRoleAccess(params.role, staff.role)) {
      await client.auth.signOut();
      return {
        ok: false,
        error:
          staff.error ||
          `Access denied: ${data.user.email} does not have ${params.role} permission in authorized_staff.`,
      };
    }

    savePortalSession(params.role, data.user.email, params.rememberMe);
    return { ok: true, email: data.user.email };
  }

  // Otherwise Supabase sent a confirmation email
  return {
    ok: false,
    pendingEmailConfirmation: true,
    info: `Verification email sent to ${email}. Confirm your email from your inbox (make sure your email is listed in authorized_staff), then sign in.`,
  };
}

export async function sendSupabasePasswordReset(params: {
  role: PortalAuthRole;
  email: string;
}): Promise<PortalAuthActionResult> {
  const email = params.email.trim();
  if (!email) {
    return { ok: false, error: 'Enter your staff email address first to reset your password.' };
  }

  await hydrateSupabaseConfig();
  if (!isSupabaseConfigured()) {
    return { ok: false, error: 'Supabase password reset is only available when Supabase is connected.' };
  }

  const client = await getSupabaseClient();
  if (!client) {
    return { ok: false, error: 'Unable to initialize Supabase authentication.' };
  }

  const redirectPath = params.role === 'superadmin' ? '/superadmin' : '/admin';
  const redirectTo =
    typeof window !== 'undefined' ? `${window.location.origin}${redirectPath}` : undefined;

  const { error } = await client.auth.resetPasswordForEmail(
    email,
    redirectTo ? { redirectTo } : undefined
  );

  if (error) {
    return { ok: false, error: formatSupabaseAuthError(error.message) };
  }

  return {
    ok: true,
    info: `Password reset email sent to ${email}. Open the link in your inbox to set a new password.`,
  };
}

export async function completeSupabasePasswordRecovery(params: {
  role: PortalAuthRole;
  newPassword: string;
  rememberMe: boolean;
}): Promise<PortalAuthActionResult> {
  if (params.newPassword.length < 8) {
    return { ok: false, error: 'New password must be at least 8 characters.' };
  }

  await hydrateSupabaseConfig();
  const client = await getSupabaseClient();
  if (!client) {
    return { ok: false, error: 'Unable to initialize Supabase authentication.' };
  }

  const { data, error } = await client.auth.updateUser({ password: params.newPassword });
  if (error || !data.user?.email) {
    return { ok: false, error: formatSupabaseAuthError(error?.message) };
  }

  const staff = await verifySupabaseStaffRole(data.user.email);
  if (!staff.authorized || !hasRoleAccess(params.role, staff.role)) {
    await client.auth.signOut();
    return {
      ok: false,
      error:
        staff.error ||
        `Access denied: your account does not have ${params.role} permission.`,
    };
  }

  if (typeof window !== 'undefined') {
    const cleanPath = params.role === 'superadmin' ? '/superadmin' : '/admin';
    window.history.replaceState({}, '', cleanPath);
  }

  savePortalSession(params.role, data.user.email, params.rememberMe);
  return { ok: true, email: data.user.email };
}

export async function claimFirstRunPortalAccount(params: {
  role: PortalAuthRole;
  email: string;
  password: string;
  rememberMe: boolean;
}): Promise<PortalAuthActionResult> {
  const email = params.email.trim();
  const password = params.password;

  try {
    const res = await fetch('/api/auth/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: params.role,
        email,
        password,
      }),
    });
    if (!isJsonResponse(res)) {
      return {
        ok: false,
        error:
          'Authentication backend is unavailable on this static host. Configure Supabase environment variables to sign in.',
      };
    }
    const body = (await res.json().catch(() => ({}))) as {
      token?: string;
      email?: string;
      error?: string;
    };
    if (!res.ok || !body.token) {
      return { ok: false, error: body.error || 'Unable to set up portal account.' };
    }
    inMemoryBearerTokens[params.role] = body.token;
    savePortalSession(params.role, body.email || email, params.rememberMe);
    return { ok: true, email: body.email || email };
  } catch {
    return { ok: false, error: 'Unable to reach authentication server.' };
  }
}

export async function signOutFromPortal(role: PortalAuthRole): Promise<void> {
  clearPortalSession(role);

  const token = inMemoryBearerTokens[role];
  delete inMemoryBearerTokens[role];

  if (token) {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // Ignore network error on logout
    }
  }

  if (isSupabaseConfigured()) {
    const client = await getSupabaseClient();
    try {
      await client?.auth.signOut();
    } catch {
      // Ignore network error on sign out
    }
  }
}
