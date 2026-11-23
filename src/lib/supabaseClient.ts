import type { SupabaseClient } from '@supabase/supabase-js';

let clientPromise: Promise<SupabaseClient | null> | null = null;
let runtimeHydratePromise: Promise<boolean> | null = null;

export function isRealSupabaseConfig(url?: string | null, anonKey?: string | null): boolean {
  const cleanUrl = (url || '').trim();
  const cleanKey = (anonKey || '').trim();
  if (!cleanUrl || !cleanKey) return false;

  const lowerUrl = cleanUrl.toLowerCase();
  const lowerKey = cleanKey.toLowerCase();
  if (
    lowerUrl.includes('your-project') ||
    lowerUrl.includes('example.supabase.co') ||
    lowerUrl.includes('placeholder') ||
    lowerKey === 'your-anon-key' ||
    lowerKey === 'your_anon_key' ||
    lowerKey.startsWith('your-') ||
    lowerKey.includes('placeholder') ||
    cleanKey.length < 20
  ) {
    return false;
  }

  try {
    const parsed = new URL(cleanUrl);
    return parsed.protocol === 'https:' && parsed.hostname.includes('.');
  } catch {
    return false;
  }
}

const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
const initialUrl = env?.VITE_SUPABASE_URL?.trim() || '';
const initialKey = env?.VITE_SUPABASE_ANON_KEY?.trim() || '';
let resolvedSupabaseUrl = isRealSupabaseConfig(initialUrl, initialKey) ? initialUrl : '';
let resolvedSupabaseAnonKey = isRealSupabaseConfig(initialUrl, initialKey) ? initialKey : '';

export function isSupabaseConfigured(): boolean {
  return isRealSupabaseConfig(resolvedSupabaseUrl, resolvedSupabaseAnonKey);
}

/**
 * Hydrates public Supabase browser config from /api/public-config when running
 * behind server.ts with runtime Secrets, if not already embedded by Vite build.
 */
export async function hydrateSupabaseConfig(): Promise<boolean> {
  if (isSupabaseConfigured()) {
    return true;
  }
  if (typeof window === 'undefined' || typeof fetch !== 'function') {
    return false;
  }

  if (!runtimeHydratePromise) {
    runtimeHydratePromise = fetch('/api/public-config', {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    })
      .then(async (res) => {
        if (!res.ok) return false;
        const data = (await res.json()) as {
          supabaseUrl?: string;
          supabaseAnonKey?: string;
        };
        const url = typeof data.supabaseUrl === 'string' ? data.supabaseUrl.trim() : '';
        const key = typeof data.supabaseAnonKey === 'string' ? data.supabaseAnonKey.trim() : '';
        if (isRealSupabaseConfig(url, key)) {
          resolvedSupabaseUrl = url;
          resolvedSupabaseAnonKey = key;
          clientPromise = null;
          return true;
        }
        return false;
      })
      .catch(() => false);
  }

  return runtimeHydratePromise;
}

export async function getSupabaseClient(): Promise<SupabaseClient | null> {
  if (!isSupabaseConfigured()) {
    await hydrateSupabaseConfig();
  }
  if (!resolvedSupabaseUrl || !resolvedSupabaseAnonKey) {
    return null;
  }

  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js')
      .then(({ createClient }) =>
        createClient(resolvedSupabaseUrl, resolvedSupabaseAnonKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: false,
          },
          realtime: {
            params: {
              eventsPerSecond: 10,
            },
          },
        })
      )
      .catch((err) => {
        console.warn('Supabase initialization failed, falling back to localStorage:', err);
        clientPromise = null;
        return null;
      });
  }

  return clientPromise;
}
