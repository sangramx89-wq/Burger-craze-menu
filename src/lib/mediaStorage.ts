import { FoodItem, SavedDefaultMenuSnapshot } from '../types/index.ts';
import { MenuPopup } from '../types/popup.ts';
import { getSupabaseClient } from './supabaseClient.ts';

export const MEDIA_BUCKET_NAME = 'menu-media';
export type MediaFolder = 'dishes' | 'popups' | 'logos';

const PUBLIC_BUCKET_MARKER = `/storage/v1/object/public/${MEDIA_BUCKET_NAME}/`;

/**
 * Checks whether a URL points to an uploaded asset in our Supabase Storage bucket.
 */
export function isSupabaseStorageUrl(url?: string | null): url is string {
  if (!url || typeof url !== 'string') return false;
  return url.includes(PUBLIC_BUCKET_MARKER);
}

/**
 * Extracts the bucket-relative object path (e.g. "dishes/173...-abc.webp")
 * from a public Supabase Storage URL.
 */
export function extractStorageObjectPath(url: string): string | null {
  if (!isSupabaseStorageUrl(url)) return null;
  const idx = url.indexOf(PUBLIC_BUCKET_MARKER);
  if (idx === -1) return null;
  const rawPath = url.slice(idx + PUBLIC_BUCKET_MARKER.length).split('?')[0];
  try {
    return decodeURIComponent(rawPath).replace(/^\/+/, '') || null;
  } catch {
    return rawPath.replace(/^\/+/, '') || null;
  }
}

/**
 * Converts a Base64 data URL into a Blob synchronously without network fetch().
 */
function dataUrlToBlob(dataUrl: string): { blob: Blob; ext: string; contentType: string } | null {
  const commaIndex = dataUrl.indexOf(',');
  if (commaIndex === -1) return null;

  const header = dataUrl.slice(0, commaIndex);
  const base64Data = dataUrl.slice(commaIndex + 1);
  const mimeMatch = header.match(/data:([^;]+);base64/i);
  const contentType = mimeMatch?.[1] || 'image/webp';

  const ext =
    contentType === 'image/png'
      ? 'png'
      : contentType === 'image/jpeg'
      ? 'jpg'
      : contentType === 'image/webp'
      ? 'webp'
      : 'bin';

  const binaryStr = atob(base64Data);
  const len = binaryStr.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }

  return {
    blob: new Blob([bytes], { type: contentType }),
    ext,
    contentType,
  };
}

/**
 * Uploads an already-compressed image data URL to Supabase Storage so Postgres
 * rows and Realtime snapshots stay lightweight. Gracefully returns the original
 * data URL if Supabase Storage is not configured or the bucket is unavailable.
 */
export async function uploadCompressedMediaToStorage(
  sourceUrl: string,
  folder: MediaFolder
): Promise<string> {
  if (!sourceUrl || !sourceUrl.startsWith('data:image/')) {
    return sourceUrl;
  }

  const client = await getSupabaseClient();
  if (!client) {
    return sourceUrl;
  }

  const converted = dataUrlToBlob(sourceUrl);
  if (!converted) {
    return sourceUrl;
  }

  const uniqueSuffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const objectPath = `${folder}/${uniqueSuffix}.${converted.ext}`;

  try {
    const { error } = await client.storage
      .from(MEDIA_BUCKET_NAME)
      .upload(objectPath, converted.blob, {
        contentType: converted.contentType,
        cacheControl: '31536000',
        upsert: false,
      });

    if (error) {
      return sourceUrl;
    }

    const { data } = client.storage.from(MEDIA_BUCKET_NAME).getPublicUrl(objectPath);
    return data?.publicUrl || sourceUrl;
  } catch {
    return sourceUrl;
  }
}

/**
 * Collects all image URLs currently referenced across the menu, pop-ups, brand logo, category logos, and saved Default Menu snapshot.
 */
export function collectActiveMediaUrls(params: {
  menuItems: FoodItem[];
  popups: MenuPopup[];
  brandLogo: string | null;
  categoryIcons?: Record<string, string>;
  savedDefaultMenu?: SavedDefaultMenuSnapshot | null;
}): Set<string> {
  const active = new Set<string>();
  for (const item of params.menuItems) {
    if (item.image) active.add(item.image);
  }
  for (const popup of params.popups) {
    if (popup.image_url) active.add(popup.image_url);
  }
  if (params.brandLogo) {
    active.add(params.brandLogo);
  }
  if (params.categoryIcons) {
    for (const val of Object.values(params.categoryIcons)) {
      if (val && typeof val === 'string') {
        active.add(val);
      }
    }
  }
  if (params.savedDefaultMenu) {
    for (const item of params.savedDefaultMenu.menuItems) {
      if (item.image) active.add(item.image);
    }
    for (const val of Object.values(params.savedDefaultMenu.categoryIcons || {})) {
      if (val && typeof val === 'string') {
        active.add(val);
      }
    }
  }
  return active;
}

/**
 * Automatically deletes any candidate Supabase Storage image URLs that are no
 * longer referenced anywhere in the menu, pop-ups, brand logo, category logos, or saved Default Menu.
 */
export async function cleanupOrphanStorageImages(params: {
  candidateUrls: Array<string | null | undefined>;
  activeMenuItems: FoodItem[];
  activePopups: MenuPopup[];
  activeBrandLogo: string | null;
  activeCategoryIcons?: Record<string, string>;
  activeSavedDefaultMenu?: SavedDefaultMenuSnapshot | null;
}): Promise<string[]> {
  const activeUrls = collectActiveMediaUrls({
    menuItems: params.activeMenuItems,
    popups: params.activePopups,
    brandLogo: params.activeBrandLogo,
    categoryIcons: params.activeCategoryIcons,
    savedDefaultMenu: params.activeSavedDefaultMenu,
  });

  const pathsToRemove = Array.from(
    new Set(
      params.candidateUrls
        .filter((url): url is string => isSupabaseStorageUrl(url) && !activeUrls.has(url))
        .map((url) => extractStorageObjectPath(url))
        .filter((path): path is string => Boolean(path))
    )
  );

  if (pathsToRemove.length === 0) {
    return [];
  }

  const client = await getSupabaseClient();
  if (!client) {
    return [];
  }

  try {
    const { error } = await client.storage.from(MEDIA_BUCKET_NAME).remove(pathsToRemove);
    if (error) {
      console.warn('Storage orphan cleanup skipped:', error.message);
      return [];
    }
    return pathsToRemove;
  } catch (err) {
    console.warn('Storage orphan cleanup error:', err);
    return [];
  }
}
