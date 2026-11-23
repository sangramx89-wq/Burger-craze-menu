import { FoodItem, SavedDefaultMenuSnapshot } from '../types/index.ts';

export const SAVED_DEFAULT_MENU_STORAGE_KEY = 'the_burger_craze_saved_default_menu';

function cloneFoodItem(
  item: FoodItem,
  normalizeImage?: (src: string) => string
): FoodItem {
  return {
    ...item,
    image: normalizeImage ? normalizeImage(item.image) : item.image,
    tags: Array.isArray(item.tags) ? [...item.tags] : [],
    ingredients: Array.isArray(item.ingredients) ? [...item.ingredients] : [],
    allergens: Array.isArray(item.allergens) ? [...item.allergens] : undefined,
    sizes: item.sizes
      ? {
          small: { ...item.sizes.small },
          medium: { ...item.sizes.medium },
          large: { ...item.sizes.large },
        }
      : undefined,
  };
}

export function createSavedDefaultMenuSnapshot(params: {
  menuItems: FoodItem[];
  customCategories: string[];
  categoryIcons: Record<string, string>;
  normalizeImage?: (src: string) => string;
  savedAt?: string;
}): SavedDefaultMenuSnapshot {
  const seenCats = new Set<string>();
  const cleanCustomCategories: string[] = [];
  for (const cat of params.customCategories) {
    if (typeof cat !== 'string') continue;
    const trimmed = cat.trim();
    if (!trimmed || trimmed.toLowerCase() === 'all') continue;
    const lower = trimmed.toLowerCase();
    if (!seenCats.has(lower)) {
      seenCats.add(lower);
      cleanCustomCategories.push(trimmed);
    }
  }

  const cleanCategoryIcons: Record<string, string> = {};
  for (const [key, val] of Object.entries(params.categoryIcons || {})) {
    if (typeof key === 'string' && typeof val === 'string' && key.trim() && val.trim()) {
      cleanCategoryIcons[key.trim()] = val.trim();
    }
  }

  return {
    menuItems: params.menuItems.map((item) => cloneFoodItem(item, params.normalizeImage)),
    customCategories: cleanCustomCategories,
    categoryIcons: cleanCategoryIcons,
    savedAt: params.savedAt || new Date().toISOString(),
  };
}

export function parseSavedDefaultMenuSnapshot(
  input: unknown,
  normalizeImage?: (src: string) => string
): SavedDefaultMenuSnapshot | null {
  if (!input || typeof input !== 'object') return null;
  const candidate = input as Partial<SavedDefaultMenuSnapshot>;
  if (!Array.isArray(candidate.menuItems) || candidate.menuItems.length === 0) {
    return null;
  }

  const validItems = candidate.menuItems.filter(
    (item): item is FoodItem =>
      Boolean(item) &&
      typeof item === 'object' &&
      typeof item.id === 'string' &&
      typeof item.name === 'string' &&
      item.name.trim().length > 0
  );
  if (validItems.length === 0) {
    return null;
  }

  return createSavedDefaultMenuSnapshot({
    menuItems: validItems,
    customCategories: Array.isArray(candidate.customCategories) ? candidate.customCategories : [],
    categoryIcons:
      candidate.categoryIcons && typeof candidate.categoryIcons === 'object'
        ? candidate.categoryIcons
        : {},
    normalizeImage,
    savedAt:
      typeof candidate.savedAt === 'string' && candidate.savedAt.trim()
        ? candidate.savedAt
        : new Date().toISOString(),
  });
}

export function extractSnapshotMediaUrls(
  snapshot: SavedDefaultMenuSnapshot | null | undefined
): string[] {
  if (!snapshot) return [];
  const urls: string[] = [];
  for (const item of snapshot.menuItems) {
    if (item.image) urls.push(item.image);
  }
  for (const val of Object.values(snapshot.categoryIcons || {})) {
    if (val) urls.push(val);
  }
  return urls;
}
