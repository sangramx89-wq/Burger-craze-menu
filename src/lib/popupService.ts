import { MenuPopup } from '../types/popup.ts';
import { getSupabaseClient } from './supabaseClient.ts';
import { publishPopupsChangedSignal } from './realtimeMenuSync.ts';

export const POPUPS_STORAGE_KEY = 'the_good_table_popups';
const STORAGE_KEY = POPUPS_STORAGE_KEY;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function generatePopupUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Curated high quality food promotional poster images for convenience
export const PRESET_PROMO_BANNERS = [
  {
    name: 'Artisan Wood-Fired Pizza',
    category: 'Pizzas',
    url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80',
    title: 'Weekend Pizza Fiesta!',
    description: 'Flat 20% off all artisan wood-fired pizzas every Friday through Sunday.',
    cta_text: 'Explore Pizzas',
  },
  {
    name: 'Tandoori & Starters Platter',
    category: 'Starters',
    url: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&w=800&q=80',
    title: 'Smoky Flame Starters',
    description: 'Freshly grilled paneer tikka & savory bites seasoned with heritage clay-oven spices.',
    cta_text: 'View Starters',
  },
  {
    name: 'Gourmet Burger & Fries',
    category: 'Burgers',
    url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80',
    title: 'Chef Burger Combo Deal',
    description: 'Double cheese melt patty paired with crispy golden fries and house spiced garlic aioli.',
    cta_text: 'See Burgers',
  },
  {
    name: 'Steaming Artisan Soup',
    category: 'Soups',
    url: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=800&q=80',
    title: 'Winter Comfort Soups',
    description: 'Slow-simmered tomato basil & sweet corn bowls crafted with organic produce.',
    cta_text: 'Browse Soups',
  },
];

// Initial seed popups with time configuration
export const DEFAULT_POPUPS: MenuPopup[] = [
  {
    id: 'popup-1',
    title: 'Weekend Pizza Fiesta!',
    image_url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80',
    description: 'Enjoy 20% off all signature wood-fired pizzas every Friday to Sunday evening.',
    cta_text: 'Explore Pizzas',
    cta_link: 'Pizzas',
    is_active: true,
    priority: 1,
    display_duration: 6,
    is_scheduled: false,
    created_at: new Date().toISOString(),
  },
  {
    id: 'popup-2',
    title: 'Lunch Special: Tandoori Starters',
    image_url: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&w=800&q=80',
    description: 'Flame-roasted paneer tikka & golden crispy appetizers straight from clay tandoor (11:30 AM - 3:30 PM).',
    cta_text: 'View Starters',
    cta_link: 'Starters',
    is_active: true,
    priority: 2,
    display_duration: 5,
    is_scheduled: true,
    start_time: '11:30',
    end_time: '15:30',
    created_at: new Date().toISOString(),
  },
  {
    id: 'popup-3',
    title: 'Evening Gourmet Burger Combos',
    image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80',
    description: 'Double cheese melt patties layered with herb potato & house aioli (6:00 PM - 11:00 PM).',
    cta_text: 'See Burgers',
    cta_link: 'Burgers',
    is_active: true,
    priority: 3,
    display_duration: 7,
    is_scheduled: true,
    start_time: '18:00',
    end_time: '23:00',
    created_at: new Date().toISOString(),
  },
];

/**
 * Checks whether a popup banner is currently within its scheduled active hours
 */
export function isPopupInActiveSchedule(popup: MenuPopup, now = new Date()): boolean {
  if (!popup.is_active) return false;
  if (!popup.is_scheduled || !popup.start_time || !popup.end_time) {
    return true; // All-day active banner
  }

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [startH, startM] = popup.start_time.split(':').map((v) => parseInt(v, 10) || 0);
  const [endH, endM] = popup.end_time.split(':').map((v) => parseInt(v, 10) || 0);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  if (startMinutes <= endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  }
  // Overnight range (e.g. 21:00 to 02:00)
  return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
}

/**
 * Formats a 24h "HH:MM" string into friendly 12h "H:MM AM/PM"
 */
export function formatTime12Hour(timeStr?: string): string {
  if (!timeStr) return '';
  const [hStr, mStr] = timeStr.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr || '0', 10);
  if (isNaN(h)) return timeStr;
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  const displayM = m < 10 ? `0${m}` : `${m}`;
  return `${displayH}:${displayM} ${period}`;
}


/**
 * Persist popups to local cache
 */
export function setLocalPopups(popups: MenuPopup[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(popups));
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Get all popups from local cache (respecting empty [] once initialized),
 * seeding defaults only on the very first run when the key does not exist yet.
 */
function getLocalPopups(): MenuPopup[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed as MenuPopup[];
      }
    }
  } catch {
    // Ignore storage parse errors
  }
  setLocalPopups(DEFAULT_POPUPS);
  return DEFAULT_POPUPS;
}

/**
 * Synchronous getter for initial React state so deleted popups never flash on load.
 */
export function getInitialLocalPopups(): MenuPopup[] {
  return [...getLocalPopups()].sort((a, b) => a.priority - b.priority);
}

/**
 * Fetch all active popups ordered by priority ASC for customer queue modal
 */
export async function fetchActivePopups(): Promise<MenuPopup[]> {
  const supabaseClient = await getSupabaseClient();
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('menu_popups')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: true })
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        return data as MenuPopup[];
      }
    } catch {
      // Fallback
    }
  }

  // Fallback to local storage (respecting [] if admin deleted all popups)
  const local = getLocalPopups();
  return local
    .filter((p) => p.is_active)
    .sort((a, b) => a.priority - b.priority);
}

/**
 * Fetch all popups (both active and inactive) for Admin Panel
 */
export async function fetchAllPopups(): Promise<MenuPopup[]> {
  const supabaseClient = await getSupabaseClient();
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('menu_popups')
        .select('*')
        .order('priority', { ascending: true })
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        setLocalPopups(data as MenuPopup[]);
        return data as MenuPopup[];
      }
    } catch {
      // Fallback
    }
  }

  // Fallback to local storage (respecting [] if admin deleted all popups)
  const local = getLocalPopups();
  return [...local].sort((a, b) => a.priority - b.priority);
}

/**
 * Save a new or updated popup
 */
export async function savePopup(popup: MenuPopup): Promise<MenuPopup[]> {
  const normalizedPopup: MenuPopup = UUID_REGEX.test(popup.id)
    ? popup
    : { ...popup, id: generatePopupUuid() };

  let currentList = getLocalPopups();
  const index = currentList.findIndex(
    (p) => p.id === popup.id || p.id === normalizedPopup.id
  );

  if (index >= 0) {
    currentList[index] = normalizedPopup;
  } else {
    currentList.push(normalizedPopup);
  }

  currentList.sort((a, b) => a.priority - b.priority);
  setLocalPopups(currentList);

  // Sync to Supabase if connected
  const supabaseClient = await getSupabaseClient();
  if (supabaseClient) {
    try {
      const { error } = await supabaseClient.from('menu_popups').upsert({
        id: normalizedPopup.id,
        title: normalizedPopup.title,
        image_url: normalizedPopup.image_url,
        description: normalizedPopup.description ?? null,
        cta_text: normalizedPopup.cta_text?.trim() || null,
        cta_link: normalizedPopup.cta_link?.trim() || null,
        is_active: normalizedPopup.is_active,
        priority: normalizedPopup.priority,
        display_duration: normalizedPopup.display_duration ?? 6,
        is_scheduled: normalizedPopup.is_scheduled ?? false,
        start_time: normalizedPopup.start_time ?? null,
        end_time: normalizedPopup.end_time ?? null,
      });
      if (error) {
        console.warn('Failed to upsert popup to Supabase:', error.message);
      }
    } catch (err) {
      console.warn('Failed to upsert to Supabase, local cache updated:', err);
    }
  }

  await publishPopupsChangedSignal();
  return currentList;
}

/**
 * Delete a popup by ID permanently
 */
export async function deletePopup(popupId: string): Promise<MenuPopup[]> {
  const currentList = getLocalPopups().filter((p) => p.id !== popupId);
  setLocalPopups(currentList);

  const supabaseClient = await getSupabaseClient();
  if (supabaseClient && UUID_REGEX.test(popupId)) {
    try {
      await supabaseClient.from('menu_popups').delete().eq('id', popupId);
    } catch (err) {
      console.warn('Failed to delete from Supabase, local cache updated:', err);
    }
  }

  await publishPopupsChangedSignal();
  return currentList;
}

/**
 * Toggle popup active status
 */
export async function togglePopupActive(popupId: string): Promise<MenuPopup[]> {
  const currentList = getLocalPopups().map((p) =>
    p.id === popupId ? { ...p, is_active: !p.is_active } : p
  );
  setLocalPopups(currentList);

  const updatedItem = currentList.find((p) => p.id === popupId);
  const supabaseClient = await getSupabaseClient();
  if (supabaseClient && updatedItem) {
    if (!UUID_REGEX.test(popupId)) {
      return savePopup(updatedItem);
    }
    try {
      const { error } = await supabaseClient
        .from('menu_popups')
        .update({ is_active: updatedItem.is_active })
        .eq('id', popupId);
      if (error) {
        console.warn('Failed to update popup status in Supabase:', error.message);
      }
    } catch (err) {
      console.warn('Failed to update status in Supabase, local cache updated:', err);
    }
  }

  await publishPopupsChangedSignal();
  return currentList;
}

/**
 * Reset popups to curated defaults
 */
export async function resetDefaultPopups(): Promise<MenuPopup[]> {
  setLocalPopups(DEFAULT_POPUPS);

  const supabaseClient = await getSupabaseClient();
  if (supabaseClient) {
    try {
      await supabaseClient
        .from('menu_popups')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
    } catch (err) {
      console.warn('Failed to clear custom popups in Supabase:', err);
    }
  }

  await publishPopupsChangedSignal();
  return DEFAULT_POPUPS;
}
