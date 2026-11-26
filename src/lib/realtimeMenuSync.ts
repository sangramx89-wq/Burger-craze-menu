import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import {
  CafeInfo,
  FoodItem,
  SavedDefaultMenuSnapshot,
  ServiceControlState,
  StorefrontTheme,
} from '../types/index.ts';
import { MenuPopup } from '../types/popup.ts';
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient.ts';
import { formatSupabaseErrorHint } from './supabaseDiagnostics.ts';

export const SYNC_REVISION_STORAGE_KEY = 'the_burger_craze_sync_revision';
const BROADCAST_CHANNEL_NAME = 'the_burger_craze_live_sync';
const SUPABASE_REALTIME_CHANNEL = 'storefront-live';
const STOREFRONT_ROW_ID = 'default';

export type RealtimeSyncStatus = 'live' | 'connecting' | 'local';

export interface StorefrontSyncPayload {
  menuItems: FoodItem[];
  customCategories: string[];
  categoryIcons: Record<string, string>;
  availabilityMap: Record<string, boolean>;
  storefrontTheme: StorefrontTheme;
  brandLogo: string | null;
  cafeInfo: CafeInfo;
  serviceControl: ServiceControlState;
  popups?: MenuPopup[];
  savedDefaultMenu?: SavedDefaultMenuSnapshot | null;
}

export interface StorefrontSyncEnvelope {
  payload: StorefrontSyncPayload;
  revision: number;
  updatedBy: string;
}

export interface PublishStorefrontResult {
  ok: boolean;
  revision: number;
  error?: string;
}

export const SESSION_CLIENT_ID = `tab-${Date.now().toString(36)}-${Math.random()
  .toString(36)
  .slice(2, 8)}`;

let latestKnownRevision = (() => {
  try {
    const raw = localStorage.getItem(SYNC_REVISION_STORAGE_KEY);
    const parsed = raw ? Number(raw) : 0;
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
})();

let lastAppliedRemoteRevision = -1;

export function getLatestKnownRevision(): number {
  return latestKnownRevision;
}

export function getLastAppliedRemoteRevision(): number {
  return lastAppliedRemoteRevision;
}

export function bumpRevision(incomingRevision?: number): number {
  const next = Math.max(Date.now(), latestKnownRevision + 1, incomingRevision ?? 0);
  latestKnownRevision = next;
  try {
    localStorage.setItem(SYNC_REVISION_STORAGE_KEY, String(next));
  } catch {
    // Ignore storage errors
  }
  return next;
}

export function recordIncomingRevision(revision: number, allowAnyDifferentRevision = false): boolean {
  if (!Number.isFinite(revision)) {
    return false;
  }
  if (allowAnyDifferentRevision) {
    if (revision === lastAppliedRemoteRevision) {
      return false;
    }
    lastAppliedRemoteRevision = revision;
    if (revision > latestKnownRevision) {
      latestKnownRevision = revision;
      try {
        localStorage.setItem(SYNC_REVISION_STORAGE_KEY, String(revision));
      } catch {
        // Ignore storage errors
      }
    }
    return true;
  }
  if (revision <= latestKnownRevision) {
    return false;
  }
  lastAppliedRemoteRevision = revision;
  latestKnownRevision = revision;
  try {
    localStorage.setItem(SYNC_REVISION_STORAGE_KEY, String(revision));
  } catch {
    // Ignore storage errors
  }
  return true;
}

let activeSupabaseChannel: RealtimeChannel | null = null;
let sharedBroadcastChannel: BroadcastChannel | null = null;

function getBroadcastChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') {
    return null;
  }
  if (!sharedBroadcastChannel) {
    try {
      sharedBroadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
    } catch {
      return null;
    }
  }
  return sharedBroadcastChannel;
}

/**
 * Fetches the authoritative storefront snapshot from Supabase (if configured).
 */
export async function fetchRemoteStorefrontState(): Promise<StorefrontSyncEnvelope | null> {
  if (!isSupabaseConfigured()) return null;
  const client = await getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('storefront_state')
      .select('payload, revision, updated_by')
      .eq('id', STOREFRONT_ROW_ID)
      .maybeSingle();

    if (error || !data || !data.payload) {
      return null;
    }

    return {
      payload: data.payload as StorefrontSyncPayload,
      revision: Number(data.revision) || 0,
      updatedBy: typeof data.updated_by === 'string' ? data.updated_by : 'remote',
    };
  } catch {
    return null;
  }
}

/**
 * Publishes an updated storefront snapshot to:
 * 1. Same-browser tabs via BroadcastChannel
 * 2. Remote customer phones/browsers via Supabase Realtime Broadcast + Postgres upsert
 */
export async function publishStorefrontState(
  payload: StorefrontSyncPayload
): Promise<PublishStorefrontResult> {
  const revision = bumpRevision();
  const envelope: StorefrontSyncEnvelope = {
    payload,
    revision,
    updatedBy: SESSION_CLIENT_ID,
  };

  // 1. Instant local cross-tab broadcast
  const bc = getBroadcastChannel();
  if (bc) {
    try {
      bc.postMessage({ type: 'STATE_UPDATE', envelope });
    } catch {
      // Ignore postMessage errors (e.g. closed channel)
    }
  }

  // 2. Supabase Realtime broadcast + persistent upsert
  const client = isSupabaseConfigured() ? await getSupabaseClient() : null;
  if (client) {
    if (activeSupabaseChannel) {
      try {
        await activeSupabaseChannel.send({
          type: 'broadcast',
          event: 'state_patch',
          payload: envelope,
        });
      } catch {
        // Ignore transient broadcast error; DB upsert still delivers via postgres_changes
      }
    }

    try {
      const { error } = await client.from('storefront_state').upsert(
        {
          id: STOREFRONT_ROW_ID,
          payload,
          revision,
          updated_by: SESSION_CLIENT_ID,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );
      if (error) {
        const hint = formatSupabaseErrorHint(error.message);
        console.warn('Failed to persist storefront state to Supabase:', hint);
        return { ok: false, revision, error: hint };
      }
    } catch (err) {
      const hint = formatSupabaseErrorHint(err instanceof Error ? err.message : String(err));
      console.warn('Failed to persist storefront state to Supabase:', hint);
      return { ok: false, revision, error: hint };
    }
  }

  return { ok: true, revision };
}

/**
 * Broadcasts a signal that promotional popups were modified so customer menus re-sync immediately.
 */
export async function publishPopupsChangedSignal(): Promise<void> {
  const signal = {
    type: 'POPUPS_UPDATE',
    updatedBy: SESSION_CLIENT_ID,
    revision: Date.now(),
  };

  const bc = getBroadcastChannel();
  if (bc) {
    try {
      bc.postMessage(signal);
    } catch {
      // Ignore
    }
  }

  if (activeSupabaseChannel) {
    try {
      await activeSupabaseChannel.send({
        type: 'broadcast',
        event: 'popups_changed',
        payload: signal,
      });
    } catch {
      // Ignore
    }
  }
}

interface SubscribeSyncHandlers {
  onStorefrontUpdate: (envelope: StorefrontSyncEnvelope) => void;
  onPopupsChanged: () => void;
  onStatusChange?: (status: RealtimeSyncStatus) => void;
  allowAnyDifferentRevision?: boolean;
}

/**
 * Subscribes to real-time menu, theme, availability, info, and popup updates
 * across Supabase Realtime and browser BroadcastChannel.
 */
export function subscribeRealtimeSync({
  onStorefrontUpdate,
  onPopupsChanged,
  onStatusChange,
  allowAnyDifferentRevision = false,
}: SubscribeSyncHandlers): () => void {
  const bc = getBroadcastChannel();

  const handleBroadcastMessage = (event: MessageEvent) => {
    const data = event.data;
    if (!data || typeof data !== 'object') return;
    if (data.type === 'STATE_UPDATE' && data.envelope) {
      const env = data.envelope as StorefrontSyncEnvelope;
      if (env.updatedBy === SESSION_CLIENT_ID) return;
      if (recordIncomingRevision(env.revision, allowAnyDifferentRevision)) {
        onStorefrontUpdate(env);
      }
    } else if (data.type === 'POPUPS_UPDATE') {
      if (data.updatedBy === SESSION_CLIENT_ID) return;
      onPopupsChanged();
    }
  };

  bc?.addEventListener('message', handleBroadcastMessage);

  let channel: RealtimeChannel | null = null;
  let activeClient: SupabaseClient | null = null;
  let disposed = false;

  if (isSupabaseConfigured()) {
    onStatusChange?.('connecting');

    void getSupabaseClient().then((client) => {
      if (disposed || !client) {
        if (!disposed) onStatusChange?.('local');
        return;
      }

      activeClient = client;
      channel = client
        .channel(SUPABASE_REALTIME_CHANNEL, {
          config: {
            broadcast: { self: false },
          },
        })
        .on('broadcast', { event: 'state_patch' }, ({ payload }) => {
          const env = payload as StorefrontSyncEnvelope | undefined;
          if (!env || !env.payload || env.updatedBy === SESSION_CLIENT_ID) return;
          if (recordIncomingRevision(env.revision, allowAnyDifferentRevision)) {
            onStorefrontUpdate(env);
          }
        })
        .on('broadcast', { event: 'popups_changed' }, ({ payload }) => {
          const meta = payload as { updatedBy?: string } | undefined;
          if (meta?.updatedBy === SESSION_CLIENT_ID) return;
          onPopupsChanged();
        })
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'storefront_state',
            filter: `id=eq.${STOREFRONT_ROW_ID}`,
          },
          (change) => {
            const record = change.new as
              | { payload?: StorefrontSyncPayload; revision?: number; updated_by?: string }
              | undefined;
            if (!record?.payload) return;
            if (record.updated_by === SESSION_CLIENT_ID) return;
            const rev = Number(record.revision) || Date.now();
            if (recordIncomingRevision(rev, allowAnyDifferentRevision)) {
              onStorefrontUpdate({
                payload: record.payload,
                revision: rev,
                updatedBy: record.updated_by || 'supabase',
              });
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'menu_popups',
          },
          () => {
            onPopupsChanged();
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            onStatusChange?.('live');
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            onStatusChange?.('local');
          }
        });

      activeSupabaseChannel = channel;
    });
  } else {
    onStatusChange?.('local');
  }

  return () => {
    disposed = true;
    bc?.removeEventListener('message', handleBroadcastMessage);
    if (channel && activeClient) {
      if (activeSupabaseChannel === channel) {
        activeSupabaseChannel = null;
      }
      activeClient.removeChannel(channel);
    }
  };
}

/**
 * Resolves the clean Customer Storefront URL from the current host,
 * stripping admin/superadmin subdomains or portal paths, and optionally
 * appending a dine-in table query parameter (?table=N).
 */
export function getCustomerStorefrontUrl(tableNumber?: string, baseOverride?: string): string {
  const cleanOverride = baseOverride?.trim();
  let originUrl = '';

  if (cleanOverride) {
    try {
      const parsed = new URL(cleanOverride);
      originUrl = `${parsed.protocol}//${parsed.host}`;
    } catch {
      originUrl = cleanOverride.replace(/\/+$/, '');
    }
  } else if (typeof window !== 'undefined') {
    const { protocol, host } = window.location;
    const cleanHost = host.replace(/^(superadmin|admin)[.-]/i, '');
    originUrl = `${protocol}//${cleanHost}`;
  }

  if (!originUrl) return '/';

  const trimmedTable = tableNumber?.trim();
  if (!trimmedTable) {
    return `${originUrl}/`;
  }

  const url = new URL(`${originUrl}/`);
  url.searchParams.set('table', trimmedTable);
  return url.toString();
}

/**
 * Reads optional table number/label from the scanned QR query string (?table=...).
 */
export function getTableNumberFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const raw = (params.get('table') || params.get('t') || '').trim();
    if (!raw) return null;
    return raw.slice(0, 24);
  } catch {
    return null;
  }
}
