import type { SupabaseClient } from '@supabase/supabase-js';

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
  missingVars: Array<'VITE_SUPABASE_URL' | 'VITE_SUPABASE_ANON_KEY'>;
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
  const missingVars: Array<'VITE_SUPABASE_URL' | 'VITE_SUPABASE_ANON_KEY'> = [];
  if (!hasUrl) missingVars.push('VITE_SUPABASE_URL');
  if (!hasAnonKey) missingVars.push('VITE_SUPABASE_ANON_KEY');

  if (!hasUrl && !hasAnonKey) {
    return {
      status: {
        configured: false,
        issue: 'missing-both',
        hasUrl: false,
        hasAnonKey: false,
        missingVars,
        url: null,
        host: null,
        errorMessage: 'Missing VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in this build.',
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
        missingVars,
        url: null,
        host: null,
        errorMessage: 'Missing VITE_SUPABASE_URL in this build.',
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
        missingVars,
        url: null,
        host: null,
        errorMessage:
          'VITE_SUPABASE_URL is invalid. Expected a full https://<project-ref>.supabase.co URL.',
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
        missingVars,
        url: parsedUrl.origin,
        host: parsedUrl.host,
        errorMessage: 'Missing VITE_SUPABASE_ANON_KEY in this build.',
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
      missingVars: [],
      url: parsedUrl.origin,
      host: parsedUrl.host,
    },
    anonKey: cleanedKey,
  };
}

// Direct static Vite env property access so Vite statically replaces both values at build time,
// guarded with typeof import.meta !== 'undefined' && import.meta.env for Node test compatibility.
const rawBuildUrl =
  typeof import.meta !== 'undefined' && import.meta.env
    ? import.meta.env.VITE_SUPABASE_URL
    : undefined;

const rawBuildAnonKey =
  typeof import.meta !== 'undefined' && import.meta.env
    ? import.meta.env.VITE_SUPABASE_ANON_KEY
    : undefined;

const resolved = resolveSupabaseConfig(rawBuildUrl, rawBuildAnonKey);

let singletonClient: SupabaseClient | null = null;
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

  if (singletonClient) {
    return singletonClient;
  }

  const targetUrl = resolved.status.url;
  const targetKey = resolved.anonKey;

  if (!clientPromise) {
    lastClientInitError = null;
    clientPromise = import('@supabase/supabase-js')
      .then(({ createClient }) => {
        const client = createClient(targetUrl, targetKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
          },
          realtime: {
            params: {
              eventsPerSecond: 10,
            },
          },
        });
        singletonClient = client;
        return client;
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : String(err);
        lastClientInitError = message;
        console.warn('Supabase initialization failed:', message);
        clientPromise = null;
        return null;
      });
  }

  return clientPromise;
}
