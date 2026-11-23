import type { SupabaseClient } from '@supabase/supabase-js';

let clientPromise: Promise<SupabaseClient | null> | null = null;

const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
const rawUrl = env?.VITE_SUPABASE_URL?.trim() || '';
const rawAnonKey = env?.VITE_SUPABASE_ANON_KEY?.trim() || '';

const isPlaceholderConfig =
  !rawUrl ||
  !rawAnonKey ||
  rawUrl.includes('your-project.supabase.co') ||
  rawAnonKey === 'your-anon-key';

const supabaseUrl = isPlaceholderConfig ? '' : rawUrl;
const supabaseAnonKey = isPlaceholderConfig ? '' : rawAnonKey;

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

export async function getSupabaseClient(): Promise<SupabaseClient | null> {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js')
      .then(({ createClient }) =>
        createClient(supabaseUrl, supabaseAnonKey, {
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

