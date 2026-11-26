import type { SupabaseClient } from '@supabase/supabase-js';

declare const __VITE_SUPABASE_URL__: string | undefined;
declare const __VITE_SUPABASE_ANON_KEY__: string | undefined;

export type SupabaseConfigIssue =
  | 'ready'
  | 'missing-both'
  | 'missing-url'
  | 'missing-key'
  | 'invalid-url';

export interface SupabaseConfigStatus {
  configured: boolean;
  issue: SupabaseConfigIssue;
  hasUrl: boolean;
  hasAnonKey: boolean;
  url: string | null;
  host: string | null;
  errorMessage?: string;
}

const PLACEHOLDER_RE = /^(your[_-]|https?:\/\/your[_-]|example\.supabase\.co|<|replace[_-])/i;

function cleanEnvValue(raw?: string | null): string {
  if (typeof raw !== 'string') return '';
  let trimmed = raw.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    trimmed = trimmed.slice(1, -1).trim();
  }
  if (!trimmed || trimmed === 'undefined' || trimmed === 'null' || PLACEHOLDER_RE.test(trimmed)) {
    return '';
  }
  return trimmed;
}

export function resolveSupabaseConfig(rawUrl?: string | null, rawAnonKey?: string | null): {
  status: SupabaseConfigStatus;
  anonKey: string | null;
} {
  const cleanedUrl = cleanEnvValue(rawUrl).replace(/\/+$/, '');
  const cleanedKey = cleanEnvValue(rawAnonKey);

  const hasUrl = cleanedUrl.length > 0;
  const hasAnonKey = cleanedKey.length > 0;

  if (!hasUrl && !hasAnonKey) {
    return {
      status: {
        configured: false,
        issue: 'missing-both',
        hasUrl: false,
        hasAnonKey: false,
        url: null,
        host: null,
        errorMessage: 'VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY were not found in this build.',
      },
      anonKey: null,
    };
  }

  if (!hasUrl) {
    return {
      status: {
        configured: false,
        issue: 'missing-url',
        hasUrl: false,
        hasAnonKey: true,
        url: null,
        host: null,
        errorMessage: 'VITE_SUPABASE_URL is missing in this build.',
      },
      anonKey: null,
    };
  }

  let parsedUrl: URL | null = null;
  try {
    parsedUrl = new URL(cleanedUrl);
  } catch {
    parsedUrl = null;
  }

  if (!parsedUrl || (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:')) {
    return {
      status: {
        configured: false,
        issue: 'invalid-url',
        hasUrl: true,
        hasAnonKey,
        url: null,
        host: null,
        errorMessage:
          'VITE_SUPABASE_URL must be a valid https://...supabase.co project URL (without extra quotes or spaces).',
      },
      anonKey: null,
    };
  }

  if (!hasAnonKey) {
    return {
      status: {
        configured: false,
        issue: 'missing-key',
        hasUrl: true,
        hasAnonKey: false,
        url: parsedUrl.origin,
        host: parsedUrl.host,
        errorMessage: 'VITE_SUPABASE_ANON_KEY is missing in this build.',
      },
      anonKey: null,
    };
  }

  return {
    status: {
      configured: true,
      issue: 'ready',
      hasUrl: true,
      hasAnonKey: true,
      url: parsedUrl.origin,
      host: parsedUrl.host,
    },
    anonKey: cleanedKey,
  };
}

// Read direct Vite static replacements first, with compile-time define & Node test safety
const rawBuildUrl =
  (typeof __VITE_SUPABASE_URL__ !== 'undefined' ? __VITE_SUPABASE_URL__ : undefined) ||
  (typeof import.meta !== 'undefined' && import.meta.env
    ? import.meta.env.VITE_SUPABASE_URL
    : undefined);

const rawBuildAnonKey =
  (typeof __VITE_SUPABASE_ANON_KEY__ !== 'undefined' ? __VITE_SUPABASE_ANON_KEY__ : undefined) ||
  (typeof import.meta !== 'undefined' && import.meta.env
    ? import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
    : undefined);

const resolved = resolveSupabaseConfig(rawBuildUrl, rawBuildAnonKey);

let clientPromise: Promise<SupabaseClient | null> | null = null;
let lastClientInitError: string | null = null;

export function getSupabaseConfigStatus(): SupabaseConfigStatus {
  return resolved.status;
}

export function getLastSupabaseClientError(): string | null {
  return lastClientInitError;
}

export function isSupabaseConfigured(): boolean {
  return resolved.status.configured;
}

export async function getSupabaseClient(): Promise<SupabaseClient | null> {
  if (!resolved.status.configured || !resolved.status.url || !resolved.anonKey) {
    return null;
  }

  const targetUrl = resolved.status.url;
  const targetKey = resolved.anonKey;

  if (!clientPromise) {
    lastClientInitError = null;
    clientPromise = import('@supabase/supabase-js')
      .then(({ createClient }) =>
        createClient(targetUrl, targetKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
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
        const message = err instanceof Error ? err.message : String(err);
        lastClientInitError = message;
        console.warn('Supabase initialization failed, falling back to localStorage:', message);
        clientPromise = null;
        return null;
      });
  }

  return clientPromise;
}
