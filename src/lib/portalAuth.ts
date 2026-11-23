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
  email?: string;
  role?: PortalAuthRole;
}

export interface PortalAuthActionResult {
  ok: boolean;
  error?: string;
  email?: string;
}

// Ephemeral in-memory Bearer tokens for local Express server fallback (never persisted in Web Storage)
const inMemoryBearerTokens: Partial<Record<PortalAuthRole, string>> = {};

function hasRoleAccess(
  requiredRole: PortalAuthRole,
  assignedRole: string | undefined
): boolean {
  if (requiredRole === 'superadmin') {
    return assignedRole === 'superadmin';
  }
  return assignedRole === 'admin' || assignedRole === 'superadmin';
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
    if (client) {
      const { data } = await client.auth.getSession();
      const userEmail = data.session?.user?.email?.trim();
      if (userEmail) {
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
      if (meRes.ok) {
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
    if (statusRes.ok) {
      const st = (await statusRes.json()) as { configured?: boolean };
      return {
        mode: 'server',
        authenticated: false,
        needsFirstRunSetup: !st.configured,
      };
    }
  } catch {
    // Ignore transient fetch failure
  }

  return {
    mode: 'server',
    authenticated: false,
    needsFirstRunSetup: false,
  };
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
        error:
          error?.message === 'Invalid login credentials'
            ? 'Invalid email or password for Supabase Auth.'
            : error?.message || 'Sign-in failed.',
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
    const body = (await res.json().catch(() => ({}))) as {
      token?: string;
      email?: string;
      error?: string;
    };
    if (!res.ok || !body.token) {
      return { ok: false, error: body.error || 'Invalid credentials.' };
    }
    inMemoryBearerTokens[params.role] = body.token;
    savePortalSession(params.role, body.email || email, params.rememberMe);
    return { ok: true, email: body.email || email };
  } catch {
    return { ok: false, error: 'Unable to reach authentication server.' };
  }
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
