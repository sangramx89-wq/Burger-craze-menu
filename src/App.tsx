import React, { Suspense, lazy, useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence, LazyMotion, domAnimation, m, MotionConfig } from 'motion/react';
import { Header } from './components/Header.tsx';
import { PromoHero } from './components/PromoHero.tsx';
import { CafeInfoStrip } from './components/CafeInfoStrip.tsx';
import { CategoryNav } from './components/CategoryNav.tsx';
import { MenuSectionCard } from './components/MenuSectionCard.tsx';
import { BottomNav, BottomTab } from './components/BottomNav.tsx';

const FoodDetailModal = lazy(() =>
  import('./components/FoodDetailModal.tsx').then((m) => ({ default: m.FoodDetailModal }))
);
const FavoritesView = lazy(() =>
  import('./components/FavoritesView.tsx').then((m) => ({ default: m.FavoritesView }))
);
const ProfileView = lazy(() =>
  import('./components/ProfileView.tsx').then((m) => ({ default: m.ProfileView }))
);
const SearchModal = lazy(() =>
  import('./components/SearchModal.tsx').then((m) => ({ default: m.SearchModal }))
);
const HamburgerDrawer = lazy(() =>
  import('./components/HamburgerDrawer.tsx').then((m) => ({ default: m.HamburgerDrawer }))
);
const AdminPanel = lazy(() =>
  import('./components/AdminPanel.tsx').then((m) => ({ default: m.AdminPanel }))
);
const SuperAdminPortal = lazy(() =>
  import('./components/SuperAdminPortal.tsx').then((m) => ({ default: m.SuperAdminPortal }))
);
const ServicePausedScreen = lazy(() =>
  import('./components/ServicePausedScreen.tsx').then((m) => ({ default: m.ServicePausedScreen }))
);
const PromotionalModalQueue = lazy(() =>
  import('./components/PromotionalModalQueue.tsx').then((m) => ({ default: m.PromotionalModalQueue }))
);
import {
  MENU_ITEMS,
  DEFAULT_CATEGORIES,
  DEFAULT_CAFE_INFO,
  getCategoryMeta,
  normalizeBundledAssetPath,
} from './data/menuData.ts';
import { DEFAULT_CUSTOM_ICON_ID, renderCategoryLogo } from './data/categoryIcons.tsx';
import { Category, FoodItem, PortionSizeKey, CafeInfo, PortalTarget, ServiceControlState, StorefrontTheme, SavedDefaultMenuSnapshot } from './types/index.ts';
import { applyBulkAvailability, resolveItemAvailability } from './lib/availability.ts';
import { MenuPopup } from './types/popup.ts';
import {
  fetchAllPopups,
  savePopup,
  deletePopup,
  togglePopupActive,
  resetDefaultPopups,
  getInitialLocalPopups,
  setLocalPopups,
  POPUPS_STORAGE_KEY,
} from './lib/popupService.ts';
import { cleanupOrphanStorageImages } from './lib/mediaStorage.ts';
import {
  SAVED_DEFAULT_MENU_STORAGE_KEY,
  createSavedDefaultMenuSnapshot,
  extractSnapshotMediaUrls,
  parseSavedDefaultMenuSnapshot,
} from './lib/defaultMenuSnapshot.ts';
import { hydrateSupabaseConfig, isSupabaseConfigured } from './lib/supabaseClient.ts';
import { usePerformanceProfile } from './lib/performanceProfile.ts';
import { detectPortalTarget, navigateToPortal } from './lib/portalRouting.ts';
import {
  loadServiceControl,
  saveServiceControl,
  SERVICE_CONTROL_STORAGE_KEY,
} from './lib/serviceControl.ts';
import {
  fetchRemoteStorefrontState,
  getTableNumberFromUrl,
  publishStorefrontState,
  RealtimeSyncStatus,
  recordIncomingRevision,
  StorefrontSyncEnvelope,
  StorefrontSyncPayload,
  subscribeRealtimeSync,
} from './lib/realtimeMenuSync.ts';
import { ArrowLeft, RefreshCw } from 'lucide-react';

const AVAILABILITY_STORAGE_KEY = 'the_good_table_availability';
const CUSTOM_MENU_STORAGE_KEY = 'the_good_table_custom_menu';
const CUSTOM_CATEGORIES_STORAGE_KEY = 'the_good_table_custom_categories';
const CATEGORY_ICONS_STORAGE_KEY = 'the_good_table_category_icons';
const PURE_VEG_STORAGE_KEY = 'the_good_table_pure_veg';
const BRAND_LOGO_STORAGE_KEY = 'the_burger_craze_brand_logo';
const CAFE_INFO_STORAGE_KEY = 'the_burger_craze_cafe_info';
const STOREFRONT_THEME_STORAGE_KEY = 'the_burger_craze_storefront_theme';
const FAVORITES_STORAGE_KEY = 'the_burger_craze_customer_favorites';

const getCategorySectionIcon = (category: string, customIconId?: string): React.ReactNode => {
  return renderCategoryLogo(category, {
    color: 'currentColor',
    sizeClass: 'w-5 h-5',
    imageClassName: 'w-full h-full rounded-full object-cover',
    strokeWidth: 2,
    customIconId,
  });
};

const PortalLoadingFallback: React.FC = () => (
  <div className="min-h-screen bg-[#F8EBDD] text-[#2D1B12] flex items-center justify-center p-6">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 rounded-full border-2 border-[#B94F2E] border-t-transparent animate-spin" />
      <span className="text-xs font-semibold text-[#7A5C48]">Loading portal...</span>
    </div>
  </div>
);

const TabLoadingSkeleton: React.FC<{ isNeu: boolean }> = ({ isNeu }) => (
  <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
    <div className={`h-8 w-44 rounded-xl ${isNeu ? 'shimmer-amber' : 'shimmer-warm'}`} />
    <div className={`h-44 w-full rounded-3xl ${isNeu ? 'shimmer-amber' : 'shimmer-warm'}`} />
  </div>
);

export default function App() {
  const { isLiteMode, shouldPrefetchSecondary } = usePerformanceProfile();

  // Portal Routing: Customer Storefront vs Admin (/admin path) vs Super Admin (superadmin.* / /superadmin)
  const [portalTarget, setPortalTarget] = useState<PortalTarget>(() => detectPortalTarget());

  useEffect(() => {
    const syncPortal = () => setPortalTarget(detectPortalTarget());
    window.addEventListener('popstate', syncPortal);
    window.addEventListener('hashchange', syncPortal);
    return () => {
      window.removeEventListener('popstate', syncPortal);
      window.removeEventListener('hashchange', syncPortal);
    };
  }, []);

  const handleNavigatePortal = useCallback((nextTarget: PortalTarget) => {
    const resolved = navigateToPortal(nextTarget);
    setPortalTarget(resolved);
    window.scrollTo(0, 0);
  }, []);

  // Super Admin Service Availability & Governance state (persisted in localStorage)
  const [serviceControl, setServiceControl] = useState<ServiceControlState>(() =>
    loadServiceControl()
  );

  useEffect(() => {
    saveServiceControl(serviceControl);
  }, [serviceControl]);

  // Navigation & View state
  const [activeTab, setActiveTab] = useState<BottomTab>('menu');
  const [activeCategory, setActiveCategory] = useState<Category>('All');
  const [pureVegFilter, setPureVegFilter] = useState<boolean>(() => {
    try {
      return localStorage.getItem(PURE_VEG_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(PURE_VEG_STORAGE_KEY, String(pureVegFilter));
    } catch {
      // Ignore storage errors
    }
  }, [pureVegFilter]);

  // Custom brand logo managed by Admin Panel (persisted in localStorage)
  const [brandLogo, setBrandLogo] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem(BRAND_LOGO_STORAGE_KEY);
      return saved && saved.trim() ? saved : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    try {
      if (brandLogo) {
        localStorage.setItem(BRAND_LOGO_STORAGE_KEY, brandLogo);
      } else {
        localStorage.removeItem(BRAND_LOGO_STORAGE_KEY);
      }
    } catch {
      // Ignore storage quota errors
    }
  }, [brandLogo]);

  // Storefront name, tagline, hours, location, contact number & Wi-Fi password (persisted in localStorage)
  const [cafeInfo, setCafeInfo] = useState<CafeInfo>(() => {
    try {
      const saved = localStorage.getItem(CAFE_INFO_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<CafeInfo>;
        return {
          cafeName: parsed.cafeName?.trim() || DEFAULT_CAFE_INFO.cafeName,
          tagline: parsed.tagline?.trim() || DEFAULT_CAFE_INFO.tagline,
          openingHours: parsed.openingHours?.trim() || DEFAULT_CAFE_INFO.openingHours,
          location: parsed.location?.trim() || DEFAULT_CAFE_INFO.location,
          contactNumber: parsed.contactNumber?.trim() || DEFAULT_CAFE_INFO.contactNumber,
          wifiPassword: parsed.wifiPassword?.trim() || DEFAULT_CAFE_INFO.wifiPassword,
        };
      }
    } catch {
      // Fallback to defaults
    }
    return DEFAULT_CAFE_INFO;
  });

  useEffect(() => {
    try {
      localStorage.setItem(CAFE_INFO_STORAGE_KEY, JSON.stringify(cafeInfo));
    } catch {
      // Ignore storage quota errors
    }
  }, [cafeInfo]);

  useEffect(() => {
    const resolvedName = cafeInfo.cafeName?.trim() || DEFAULT_CAFE_INFO.cafeName || 'The Burger Craze';
    const resolvedTagline = cafeInfo.tagline?.trim() || DEFAULT_CAFE_INFO.tagline || 'Gourmet Burgers & Café';
    document.title = `${resolvedName} - ${resolvedTagline}`;
  }, [cafeInfo.cafeName, cafeInfo.tagline]);

  // Storefront theme managed by Admin Panel (persisted in localStorage)
  const [storefrontTheme, setStorefrontTheme] = useState<StorefrontTheme>(() => {
    try {
      const saved = localStorage.getItem(STOREFRONT_THEME_STORAGE_KEY);
      return saved === 'warm-amber-neumorphism' ? 'warm-amber-neumorphism' : 'classic';
    } catch {
      return 'classic';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STOREFRONT_THEME_STORAGE_KEY, storefrontTheme);
    } catch {
      // Ignore storage quota errors
    }
  }, [storefrontTheme]);

  const tableLabel = useMemo(() => getTableNumberFromUrl(), []);
  const [syncStatus, setSyncStatus] = useState<RealtimeSyncStatus>('local');
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [liveUpdateNotice, setLiveUpdateNotice] = useState<string | null>(null);
  const [localEditTick, setLocalEditTick] = useState<number>(0);

  const triggerLocalPublish = useCallback(() => {
    setLocalEditTick((t) => t + 1);
  }, []);

  const handleUpdateServiceControlLocal = useCallback(
    (next: ServiceControlState) => {
      setServiceControl(next);
      triggerLocalPublish();
    },
    [triggerLocalPublish]
  );

  const handleUpdateBrandLogoLocal = useCallback(
    (nextLogo: string | null) => {
      const previousLogo = latestSnapshotRef.current.brandLogo;
      setBrandLogo(nextLogo);
      latestSnapshotRef.current = { ...latestSnapshotRef.current, brandLogo: nextLogo };
      triggerLocalPublish();
      if (previousLogo && previousLogo !== nextLogo) {
        void cleanupOrphanStorageImages({
          candidateUrls: [previousLogo],
          activeMenuItems: latestSnapshotRef.current.menuItems,
          activePopups: latestSnapshotRef.current.popups ?? [],
          activeBrandLogo: nextLogo,
          activeCategoryIcons: latestSnapshotRef.current.categoryIcons,
          activeSavedDefaultMenu: latestSnapshotRef.current.savedDefaultMenu,
        });
      }
    },
    [triggerLocalPublish]
  );

  const handleUpdateCafeInfoLocal = useCallback(
    (nextInfo: CafeInfo) => {
      setCafeInfo(nextInfo);
      triggerLocalPublish();
    },
    [triggerLocalPublish]
  );

  const handleUpdateStorefrontThemeLocal = useCallback(
    (nextTheme: StorefrontTheme) => {
      setStorefrontTheme(nextTheme);
      triggerLocalPublish();
    },
    [triggerLocalPublish]
  );

  // Cross-tab synchronization when Super Admin or Admin updates settings in another tab
  useEffect(() => {
    const handleStorageSync = (e: StorageEvent) => {
      if (e.key === SERVICE_CONTROL_STORAGE_KEY) {
        setServiceControl(loadServiceControl());
      } else if (e.key === BRAND_LOGO_STORAGE_KEY) {
        setBrandLogo(e.newValue && e.newValue.trim() ? e.newValue : null);
      } else if (e.key === STOREFRONT_THEME_STORAGE_KEY) {
        setStorefrontTheme(
          e.newValue === 'warm-amber-neumorphism' ? 'warm-amber-neumorphism' : 'classic'
        );
      } else if (e.key === CAFE_INFO_STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue) as Partial<CafeInfo>;
          setCafeInfo({
            cafeName: parsed.cafeName?.trim() || DEFAULT_CAFE_INFO.cafeName,
            tagline: parsed.tagline?.trim() || DEFAULT_CAFE_INFO.tagline,
            openingHours: parsed.openingHours?.trim() || DEFAULT_CAFE_INFO.openingHours,
            location: parsed.location?.trim() || DEFAULT_CAFE_INFO.location,
            contactNumber: parsed.contactNumber?.trim() || DEFAULT_CAFE_INFO.contactNumber,
            wifiPassword: parsed.wifiPassword?.trim() || DEFAULT_CAFE_INFO.wifiPassword,
          });
        } catch {
          // Ignore malformed JSON
        }
      } else if (e.key === CUSTOM_MENU_STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMenuItems(
              parsed.map((item: FoodItem) => ({
                ...item,
                image: normalizeBundledAssetPath(item.image),
              }))
            );
          }
        } catch {
          // Ignore malformed JSON
        }
      } else if (e.key === CUSTOM_CATEGORIES_STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setCustomCategories(
              parsed.filter((c): c is string => typeof c === 'string' && c.trim().length > 0)
            );
          }
        } catch {
          // Ignore malformed JSON
        }
      } else if (e.key === CATEGORY_ICONS_STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed && typeof parsed === 'object') {
            setCategoryIcons(parsed as Record<string, string>);
          }
        } catch {
          // Ignore malformed JSON
        }
      } else if (e.key === AVAILABILITY_STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed && typeof parsed === 'object') {
            setAvailabilityMap(parsed as Record<string, boolean>);
          }
        } catch {
          // Ignore malformed JSON
        }
      } else if (e.key === POPUPS_STORAGE_KEY && e.newValue !== null) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setPopups(parsed as MenuPopup[]);
          }
        } catch {
          // Ignore malformed JSON
        }
      } else if (e.key === FAVORITES_STORAGE_KEY && e.newValue !== null) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setFavoriteIds(parsed.filter((id): id is string => typeof id === 'string'));
          }
        } catch {
          // Ignore malformed JSON
        }
      } else if (e.key === SAVED_DEFAULT_MENU_STORAGE_KEY) {
        if (!e.newValue) {
          setSavedDefaultMenu(null);
        } else {
          try {
            const parsed = JSON.parse(e.newValue);
            setSavedDefaultMenu(
              parseSavedDefaultMenuSnapshot(parsed, normalizeBundledAssetPath)
            );
          } catch {
            // Ignore malformed JSON
          }
        }
      }
    };
    window.addEventListener('storage', handleStorageSync);
    return () => window.removeEventListener('storage', handleStorageSync);
  }, []);

  // Dynamic menu items managed by Admin Panel (persisted in localStorage)
  const [menuItems, setMenuItems] = useState<FoodItem[]>(() => {
    try {
      const saved = localStorage.getItem(CUSTOM_MENU_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((item: FoodItem) => ({
            ...item,
            image: normalizeBundledAssetPath(item.image),
          }));
        }
      }
    } catch {
      // Fallback to initial seed items
    }
    return MENU_ITEMS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(CUSTOM_MENU_STORAGE_KEY, JSON.stringify(menuItems));
    } catch {
      // Ignore quota errors
    }
  }, [menuItems]);

  // Custom categories created by Admin (persisted in localStorage)
  const [customCategories, setCustomCategories] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(CUSTOM_CATEGORIES_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((c): c is string => typeof c === 'string' && c.trim().length > 0);
        }
      }
    } catch {
      // Ignore storage errors
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem(CUSTOM_CATEGORIES_STORAGE_KEY, JSON.stringify(customCategories));
    } catch {
      // Ignore quota errors
    }
  }, [customCategories]);

  // Custom category icons map (persisted in localStorage)
  const [categoryIcons, setCategoryIcons] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem(CATEGORY_ICONS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return parsed as Record<string, string>;
        }
      }
    } catch {
      // Ignore storage errors
    }
    return {};
  });

  useEffect(() => {
    try {
      localStorage.setItem(CATEGORY_ICONS_STORAGE_KEY, JSON.stringify(categoryIcons));
    } catch {
      // Ignore quota errors
    }
  }, [categoryIcons]);

  // Admin-saved Custom Default Menu snapshot (persisted in localStorage)
  const [savedDefaultMenu, setSavedDefaultMenu] = useState<SavedDefaultMenuSnapshot | null>(() => {
    try {
      const saved = localStorage.getItem(SAVED_DEFAULT_MENU_STORAGE_KEY);
      if (saved) {
        return parseSavedDefaultMenuSnapshot(JSON.parse(saved), normalizeBundledAssetPath);
      }
    } catch {
      // Ignore storage errors
    }
    return null;
  });

  useEffect(() => {
    try {
      if (savedDefaultMenu) {
        localStorage.setItem(SAVED_DEFAULT_MENU_STORAGE_KEY, JSON.stringify(savedDefaultMenu));
      } else {
        localStorage.removeItem(SAVED_DEFAULT_MENU_STORAGE_KEY);
      }
    } catch {
      // Ignore quota errors
    }
  }, [savedDefaultMenu]);

  // Merged list of default + admin-created + dish-referenced categories (case-insensitive dedupe)
  const availableCategories = useMemo(() => {
    const merged: string[] = [];
    const seen = new Set<string>();
    const addUnique = (cat: string) => {
      const trimmed = cat.trim();
      if (!trimmed || trimmed.toLowerCase() === 'all') return;
      const lower = trimmed.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        merged.push(trimmed);
      }
    };

    DEFAULT_CATEGORIES.forEach(addUnique);
    customCategories.forEach(addUnique);
    menuItems.forEach((item) => addUnique(item.category));

    return merged;
  }, [customCategories, menuItems]);

  const handleAddCategory = (categoryName: string, iconId?: string) => {
    const trimmed = categoryName.trim();
    if (!trimmed || trimmed.toLowerCase() === 'all') return;
    setCustomCategories((prev) => {
      const existsInDefaults = DEFAULT_CATEGORIES.some(
        (c) => c.toLowerCase() === trimmed.toLowerCase()
      );
      const existsInCustom = prev.some(
        (c) => c.toLowerCase() === trimmed.toLowerCase()
      );
      if (existsInDefaults || existsInCustom) return prev;
      return [...prev, trimmed];
    });
    if (!DEFAULT_CATEGORIES.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      setCategoryIcons((prev) => ({
        ...prev,
        [trimmed]: iconId || DEFAULT_CUSTOM_ICON_ID,
      }));
    }
    triggerLocalPublish();
  };

  const handleUpdateCategoryIcon = (categoryName: string, iconId: string) => {
    const trimmed = categoryName.trim();
    if (!trimmed) return;
    const previousVal = latestSnapshotRef.current.categoryIcons[trimmed];
    const nextIcons = {
      ...latestSnapshotRef.current.categoryIcons,
      [trimmed]: iconId,
    };
    setCategoryIcons(nextIcons);
    latestSnapshotRef.current = { ...latestSnapshotRef.current, categoryIcons: nextIcons };
    triggerLocalPublish();
    if (previousVal && previousVal !== iconId) {
      void cleanupOrphanStorageImages({
        candidateUrls: [previousVal],
        activeMenuItems: latestSnapshotRef.current.menuItems,
        activePopups: latestSnapshotRef.current.popups ?? [],
        activeBrandLogo: latestSnapshotRef.current.brandLogo,
        activeCategoryIcons: nextIcons,
        activeSavedDefaultMenu: latestSnapshotRef.current.savedDefaultMenu,
      });
    }
  };

  const handleResetCategoryIcon = (categoryName: string) => {
    const trimmed = categoryName.trim();
    if (!trimmed) return;
    const previousVal = latestSnapshotRef.current.categoryIcons[trimmed];
    if (!previousVal) return;
    const nextIcons = { ...latestSnapshotRef.current.categoryIcons };
    delete nextIcons[trimmed];
    setCategoryIcons(nextIcons);
    latestSnapshotRef.current = { ...latestSnapshotRef.current, categoryIcons: nextIcons };
    triggerLocalPublish();
    void cleanupOrphanStorageImages({
      candidateUrls: [previousVal],
      activeMenuItems: latestSnapshotRef.current.menuItems,
      activePopups: latestSnapshotRef.current.popups ?? [],
      activeBrandLogo: latestSnapshotRef.current.brandLogo,
      activeCategoryIcons: nextIcons,
      activeSavedDefaultMenu: latestSnapshotRef.current.savedDefaultMenu,
    });
  };

  // Availability map (persisted in localStorage)
  const [availabilityMap, setAvailabilityMap] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(AVAILABILITY_STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(AVAILABILITY_STORAGE_KEY, JSON.stringify(availabilityMap));
    } catch {
      // Ignore quota/private mode errors
    }
  }, [availabilityMap]);

  const getAvailability = useCallback(
    (item: FoodItem): boolean => {
      return resolveItemAvailability(item, availabilityMap);
    },
    [availabilityMap]
  );

  const handleToggleItemAvailability = (itemId: string) => {
    const targetItem = latestSnapshotRef.current.menuItems.find((it) => it.id === itemId);
    const current = targetItem
      ? resolveItemAvailability(targetItem, latestSnapshotRef.current.availabilityMap)
      : (latestSnapshotRef.current.availabilityMap[itemId] ?? true);
    const nextMap = { ...latestSnapshotRef.current.availabilityMap, [itemId]: !current };
    setAvailabilityMap(nextMap);
    latestSnapshotRef.current = { ...latestSnapshotRef.current, availabilityMap: nextMap };
    triggerLocalPublish();
  };

  const handleBulkSetAvailability = useCallback(
    (itemIds: string[], isAvailable: boolean) => {
      const nextMap = applyBulkAvailability(
        latestSnapshotRef.current.availabilityMap,
        itemIds,
        isAvailable
      );
      if (nextMap === latestSnapshotRef.current.availabilityMap) return;
      setAvailabilityMap(nextMap);
      latestSnapshotRef.current = { ...latestSnapshotRef.current, availabilityMap: nextMap };
      triggerLocalPublish();
    },
    [triggerLocalPublish]
  );

  // Customer favorites state (persisted in customer browser localStorage)
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(FAVORITES_STORAGE_KEY);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((id): id is string => typeof id === 'string');
        }
      }
    } catch {
      // Ignore storage read errors
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favoriteIds));
    } catch {
      // Ignore storage quota errors
    }
  }, [favoriteIds]);

  // Modals state
  const [selectedFoodItem, setSelectedFoodItem] = useState<FoodItem | null>(null);
  const [modalInitialSize, setModalInitialSize] = useState<PortionSizeKey>('medium');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMenuDrawerOpen, setIsMenuDrawerOpen] = useState(false);

  // Promotional Pop-up Queue state (loaded synchronously from cache, synced via Realtime)
  const [popups, setPopups] = useState<MenuPopup[]>(() => getInitialLocalPopups());
  const [isPopupsRemoteReady, setIsPopupsRemoteReady] = useState<boolean>(() => !isSupabaseConfigured());
  const [isTestQueueOpen, setIsTestQueueOpen] = useState(false);

  const handleSavePopup = async (item: MenuPopup) => {
    const previousUrl = (latestSnapshotRef.current.popups ?? []).find((p) => p.id === item.id)?.image_url;
    const updated = await savePopup(item);
    setPopups(updated);
    latestSnapshotRef.current = { ...latestSnapshotRef.current, popups: updated };
    triggerLocalPublish();
    if (previousUrl && previousUrl !== item.image_url) {
      void cleanupOrphanStorageImages({
        candidateUrls: [previousUrl],
        activeMenuItems: latestSnapshotRef.current.menuItems,
        activePopups: updated,
        activeBrandLogo: latestSnapshotRef.current.brandLogo,
        activeCategoryIcons: latestSnapshotRef.current.categoryIcons,
        activeSavedDefaultMenu: latestSnapshotRef.current.savedDefaultMenu,
      });
    }
  };

  const handleDeletePopup = async (popupId: string) => {
    const deletedUrl = (latestSnapshotRef.current.popups ?? []).find((p) => p.id === popupId)?.image_url;
    const updated = await deletePopup(popupId);
    setPopups(updated);
    latestSnapshotRef.current = { ...latestSnapshotRef.current, popups: updated };
    triggerLocalPublish();
    if (deletedUrl) {
      void cleanupOrphanStorageImages({
        candidateUrls: [deletedUrl],
        activeMenuItems: latestSnapshotRef.current.menuItems,
        activePopups: updated,
        activeBrandLogo: latestSnapshotRef.current.brandLogo,
        activeCategoryIcons: latestSnapshotRef.current.categoryIcons,
        activeSavedDefaultMenu: latestSnapshotRef.current.savedDefaultMenu,
      });
    }
  };

  const handleTogglePopupActive = async (popupId: string) => {
    const updated = await togglePopupActive(popupId);
    setPopups(updated);
    latestSnapshotRef.current = { ...latestSnapshotRef.current, popups: updated };
    triggerLocalPublish();
  };

  const handleResetPopupDefaults = async () => {
    const previousUrls = (latestSnapshotRef.current.popups ?? []).map((p) => p.image_url);
    const updated = await resetDefaultPopups();
    setPopups(updated);
    latestSnapshotRef.current = { ...latestSnapshotRef.current, popups: updated };
    triggerLocalPublish();
    if (previousUrls.length > 0) {
      void cleanupOrphanStorageImages({
        candidateUrls: previousUrls,
        activeMenuItems: latestSnapshotRef.current.menuItems,
        activePopups: updated,
        activeBrandLogo: latestSnapshotRef.current.brandLogo,
        activeCategoryIcons: latestSnapshotRef.current.categoryIcons,
        activeSavedDefaultMenu: latestSnapshotRef.current.savedDefaultMenu,
      });
    }
  };

  const handleTriggerPopupCta = (ctaLink?: string) => {
    if (!ctaLink) return;
    const trimmed = ctaLink.trim();
    if (trimmed === 'All' || availableCategories.includes(trimmed)) {
      setActiveCategory(trimmed as Category);
      setActiveTab('menu');
    }
  };

  const handleTestPopupQueue = () => {
    setIsTestQueueOpen(true);
  };

  // Admin CRUD Handlers
  const handleAddItem = (newItem: FoodItem) => {
    const nextMenu = [newItem, ...latestSnapshotRef.current.menuItems];
    const nextAvailabilityMap = {
      ...latestSnapshotRef.current.availabilityMap,
      [newItem.id]: newItem.isAvailable ?? true,
    };
    setMenuItems(nextMenu);
    setAvailabilityMap(nextAvailabilityMap);
    latestSnapshotRef.current = {
      ...latestSnapshotRef.current,
      menuItems: nextMenu,
      availabilityMap: nextAvailabilityMap,
    };
    triggerLocalPublish();
  };

  const handleEditItem = (updatedItem: FoodItem) => {
    const previousUrl = latestSnapshotRef.current.menuItems.find((it) => it.id === updatedItem.id)?.image;
    const nextMenu = latestSnapshotRef.current.menuItems.map((it) =>
      it.id === updatedItem.id ? updatedItem : it
    );
    const nextAvailabilityMap =
      typeof updatedItem.isAvailable === 'boolean'
        ? {
            ...latestSnapshotRef.current.availabilityMap,
            [updatedItem.id]: updatedItem.isAvailable,
          }
        : latestSnapshotRef.current.availabilityMap;
    setMenuItems(nextMenu);
    setAvailabilityMap(nextAvailabilityMap);
    latestSnapshotRef.current = {
      ...latestSnapshotRef.current,
      menuItems: nextMenu,
      availabilityMap: nextAvailabilityMap,
    };
    if (selectedFoodItem?.id === updatedItem.id) {
      setSelectedFoodItem(updatedItem);
    }
    triggerLocalPublish();
    if (previousUrl && previousUrl !== updatedItem.image) {
      void cleanupOrphanStorageImages({
        candidateUrls: [previousUrl],
        activeMenuItems: nextMenu,
        activePopups: latestSnapshotRef.current.popups ?? [],
        activeBrandLogo: latestSnapshotRef.current.brandLogo,
        activeCategoryIcons: latestSnapshotRef.current.categoryIcons,
        activeSavedDefaultMenu: latestSnapshotRef.current.savedDefaultMenu,
      });
    }
  };

  const handleDeleteItem = (itemId: string) => {
    const deletedUrl = latestSnapshotRef.current.menuItems.find((it) => it.id === itemId)?.image;
    const nextMenu = latestSnapshotRef.current.menuItems.filter((it) => it.id !== itemId);
    setMenuItems(nextMenu);
    latestSnapshotRef.current = { ...latestSnapshotRef.current, menuItems: nextMenu };
    setFavoriteIds((prev) => prev.filter((id) => id !== itemId));
    if (selectedFoodItem?.id === itemId) {
      setSelectedFoodItem(null);
    }
    triggerLocalPublish();
    if (deletedUrl) {
      void cleanupOrphanStorageImages({
        candidateUrls: [deletedUrl],
        activeMenuItems: nextMenu,
        activePopups: latestSnapshotRef.current.popups ?? [],
        activeBrandLogo: latestSnapshotRef.current.brandLogo,
        activeCategoryIcons: latestSnapshotRef.current.categoryIcons,
        activeSavedDefaultMenu: latestSnapshotRef.current.savedDefaultMenu,
      });
    }
  };

  const handleSetSavedDefaultMenu = () => {
    const previousSnapshot = latestSnapshotRef.current.savedDefaultMenu;
    const previousSnapshotUrls = extractSnapshotMediaUrls(previousSnapshot);
    const nextSnapshot = createSavedDefaultMenuSnapshot({
      menuItems: latestSnapshotRef.current.menuItems,
      customCategories: latestSnapshotRef.current.customCategories,
      categoryIcons: latestSnapshotRef.current.categoryIcons,
      normalizeImage: normalizeBundledAssetPath,
    });
    setSavedDefaultMenu(nextSnapshot);
    latestSnapshotRef.current = {
      ...latestSnapshotRef.current,
      savedDefaultMenu: nextSnapshot,
    };
    triggerLocalPublish();
    if (previousSnapshotUrls.length > 0) {
      void cleanupOrphanStorageImages({
        candidateUrls: previousSnapshotUrls,
        activeMenuItems: latestSnapshotRef.current.menuItems,
        activePopups: latestSnapshotRef.current.popups ?? [],
        activeBrandLogo: latestSnapshotRef.current.brandLogo,
        activeCategoryIcons: latestSnapshotRef.current.categoryIcons,
        activeSavedDefaultMenu: nextSnapshot,
      });
    }
  };

  const handleRestoreDefaultMenu = (mode: 'saved' | 'factory' = 'saved') => {
    const existingSaved = latestSnapshotRef.current.savedDefaultMenu;
    const previousLiveUrls = [
      ...latestSnapshotRef.current.menuItems.map((it) => it.image),
      ...Object.values(latestSnapshotRef.current.categoryIcons || {}),
    ];

    if (mode === 'saved' && existingSaved && existingSaved.menuItems.length > 0) {
      const restored = createSavedDefaultMenuSnapshot({
        menuItems: existingSaved.menuItems,
        customCategories: existingSaved.customCategories,
        categoryIcons: existingSaved.categoryIcons,
        normalizeImage: normalizeBundledAssetPath,
        savedAt: existingSaved.savedAt,
      });
      setMenuItems(restored.menuItems);
      setCustomCategories(restored.customCategories);
      setCategoryIcons(restored.categoryIcons);
      latestSnapshotRef.current = {
        ...latestSnapshotRef.current,
        menuItems: restored.menuItems,
        customCategories: restored.customCategories,
        categoryIcons: restored.categoryIcons,
      };
      const restoredCategories = new Set(
        [
          ...DEFAULT_CATEGORIES,
          ...restored.customCategories,
          ...restored.menuItems.map((it) => String(it.category)),
        ].map((c) => c.toLowerCase())
      );
      if (activeCategory !== 'All' && !restoredCategories.has(String(activeCategory).toLowerCase())) {
        setActiveCategory('All');
      }
      triggerLocalPublish();
      if (previousLiveUrls.length > 0) {
        void cleanupOrphanStorageImages({
          candidateUrls: previousLiveUrls,
          activeMenuItems: restored.menuItems,
          activePopups: latestSnapshotRef.current.popups ?? [],
          activeBrandLogo: latestSnapshotRef.current.brandLogo,
          activeCategoryIcons: restored.categoryIcons,
          activeSavedDefaultMenu: existingSaved,
        });
      }
      return;
    }

    const previousUrls = [
      ...previousLiveUrls,
      ...(mode === 'factory' ? extractSnapshotMediaUrls(existingSaved) : []),
    ];
    try {
      localStorage.removeItem(CUSTOM_MENU_STORAGE_KEY);
      localStorage.removeItem(CUSTOM_CATEGORIES_STORAGE_KEY);
      localStorage.removeItem(CATEGORY_ICONS_STORAGE_KEY);
      if (mode === 'factory') {
        localStorage.removeItem(SAVED_DEFAULT_MENU_STORAGE_KEY);
      }
    } catch {
      // Ignore
    }
    setMenuItems(MENU_ITEMS);
    setCustomCategories([]);
    setCategoryIcons({});
    if (mode === 'factory') {
      setSavedDefaultMenu(null);
    }
    latestSnapshotRef.current = {
      ...latestSnapshotRef.current,
      menuItems: MENU_ITEMS,
      customCategories: [],
      categoryIcons: {},
      ...(mode === 'factory' ? { savedDefaultMenu: null } : {}),
    };
    if (activeCategory !== 'All' && !DEFAULT_CATEGORIES.includes(activeCategory)) {
      setActiveCategory('All');
    }
    triggerLocalPublish();
    if (previousUrls.length > 0) {
      void cleanupOrphanStorageImages({
        candidateUrls: previousUrls,
        activeMenuItems: MENU_ITEMS,
        activePopups: latestSnapshotRef.current.popups ?? [],
        activeBrandLogo: latestSnapshotRef.current.brandLogo,
        activeCategoryIcons: {},
        activeSavedDefaultMenu: mode === 'factory' ? null : existingSaved,
      });
    }
  };

  // Snapshot ref for outbound publishing without infinite sync loops
  const latestSnapshotRef = useRef<StorefrontSyncPayload>({
    menuItems,
    customCategories,
    categoryIcons,
    availabilityMap,
    storefrontTheme,
    brandLogo,
    cafeInfo,
    serviceControl,
    popups,
    savedDefaultMenu,
  });

  latestSnapshotRef.current = {
    menuItems,
    customCategories,
    categoryIcons,
    availabilityMap,
    storefrontTheme,
    brandLogo,
    cafeInfo,
    serviceControl,
    popups,
    savedDefaultMenu,
  };

  const noticeTimeoutRef = useRef<number | null>(null);
  const showMenuUpdatedNotice = useCallback((message = 'Menu updated') => {
    setLiveUpdateNotice(message);
    if (noticeTimeoutRef.current !== null) {
      window.clearTimeout(noticeTimeoutRef.current);
    }
    noticeTimeoutRef.current = window.setTimeout(() => {
      setLiveUpdateNotice(null);
      noticeTimeoutRef.current = null;
    }, 3200);
  }, []);

  const applyRemoteEnvelope = useCallback(
    (envelope: StorefrontSyncEnvelope, notifyCustomer: boolean) => {
      const p = envelope.payload;
      if (!p || typeof p !== 'object') return;

      if (Array.isArray(p.menuItems) && p.menuItems.length > 0) {
        const normalized = p.menuItems.map((item) => ({
          ...item,
          image: normalizeBundledAssetPath(item.image),
        }));
        setMenuItems(normalized);
        setSelectedFoodItem((current) => {
          if (!current) return null;
          return normalized.find((it) => it.id === current.id) ?? null;
        });
      }

      if (Array.isArray(p.customCategories)) {
        setCustomCategories(
          p.customCategories.filter((c): c is string => typeof c === 'string' && c.trim().length > 0)
        );
      }

      if (p.categoryIcons && typeof p.categoryIcons === 'object') {
        setCategoryIcons(p.categoryIcons);
      }

      if (p.savedDefaultMenu !== undefined) {
        setSavedDefaultMenu(
          p.savedDefaultMenu
            ? parseSavedDefaultMenuSnapshot(p.savedDefaultMenu, normalizeBundledAssetPath)
            : null
        );
      }

      if (p.availabilityMap && typeof p.availabilityMap === 'object') {
        setAvailabilityMap(p.availabilityMap);
      }

      if (p.storefrontTheme === 'warm-amber-neumorphism' || p.storefrontTheme === 'classic') {
        setStorefrontTheme(p.storefrontTheme);
      }

      if (p.brandLogo !== undefined) {
        setBrandLogo(p.brandLogo && p.brandLogo.trim() ? p.brandLogo : null);
      }

      if (p.cafeInfo && typeof p.cafeInfo === 'object') {
        setCafeInfo({
          cafeName: p.cafeInfo.cafeName?.trim() || DEFAULT_CAFE_INFO.cafeName,
          tagline: p.cafeInfo.tagline?.trim() || DEFAULT_CAFE_INFO.tagline,
          openingHours: p.cafeInfo.openingHours?.trim() || DEFAULT_CAFE_INFO.openingHours,
          location: p.cafeInfo.location?.trim() || DEFAULT_CAFE_INFO.location,
          contactNumber: p.cafeInfo.contactNumber?.trim() || DEFAULT_CAFE_INFO.contactNumber,
          wifiPassword: p.cafeInfo.wifiPassword?.trim() || DEFAULT_CAFE_INFO.wifiPassword,
        });
      }

      if (p.serviceControl && typeof p.serviceControl === 'object') {
        setServiceControl(p.serviceControl);
      }

      if (Array.isArray(p.popups)) {
        setPopups(p.popups);
        setLocalPopups(p.popups);
      }

      if (notifyCustomer && portalTarget === 'customer') {
        showMenuUpdatedNotice('Menu updated');
      }
    },
    [portalTarget, showMenuUpdatedNotice]
  );

  // Publish local Admin / Super Admin changes with short debounce
  useEffect(() => {
    if (localEditTick === 0) return;
    const timer = window.setTimeout(() => {
      void publishStorefrontState(latestSnapshotRef.current).then((res) => {
        if (!res.ok && res.error) {
          setLastSyncError(res.error);
        } else {
          setLastSyncError(null);
          if (isSupabaseConfigured()) {
            setLastSyncedAt(new Date().toISOString());
          }
        }
      });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [localEditTick]);

  const handleForcePushToCloud = useCallback(async () => {
    const res = await publishStorefrontState(latestSnapshotRef.current);
    if (!res.ok) {
      setLastSyncError(res.error || 'Failed to publish to Supabase.');
      return { ok: false, error: res.error };
    }
    setLastSyncError(null);
    setLastSyncedAt(new Date().toISOString());
    return { ok: true };
  }, []);

  const handlePullFromCloud = useCallback(async () => {
    try {
      const remoteEnv = await fetchRemoteStorefrontState();
      if (!remoteEnv) {
        return { ok: true, found: false };
      }
      recordIncomingRevision(Math.max(remoteEnv.revision, Date.now()));
      applyRemoteEnvelope(remoteEnv, false);
      setLastSyncError(null);
      setLastSyncedAt(new Date().toISOString());
      return { ok: true, found: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch from Supabase.';
      setLastSyncError(msg);
      return { ok: false, found: false, error: msg };
    }
  }, [applyRemoteEnvelope]);

  // Initial remote sync, Realtime subscription, and focus/reconnect refresh
  useEffect(() => {
    let isMounted = true;

    const pullLatestRemote = async (notifyOnChange: boolean) => {
      try {
        await hydrateSupabaseConfig();
        if (!isMounted) return;

        const remoteEnv = await fetchRemoteStorefrontState();
        if (!isMounted) return;

        const hasRemotePopups = Boolean(
          remoteEnv?.payload && Array.isArray(remoteEnv.payload.popups)
        );

        if (remoteEnv && recordIncomingRevision(remoteEnv.revision)) {
          applyRemoteEnvelope(remoteEnv, notifyOnChange);
        } else if (remoteEnv && hasRemotePopups && remoteEnv.payload.popups) {
          setPopups(remoteEnv.payload.popups);
          setLocalPopups(remoteEnv.payload.popups);
        } else if (!remoteEnv && portalTarget !== 'customer' && !isSupabaseConfigured()) {
          // Seed local broadcast snapshot when offline/local mode
          await publishStorefrontState(latestSnapshotRef.current);
        }

        if (!hasRemotePopups) {
          const freshPopups = await fetchAllPopups();
          if (isMounted && Array.isArray(freshPopups)) {
            setPopups(freshPopups);
          }
        }
      } finally {
        if (isMounted) {
          setIsPopupsRemoteReady(true);
        }
      }
    };

    void pullLatestRemote(false);

    const unsubscribe = subscribeRealtimeSync({
      onStatusChange: (status) => {
        if (isMounted) setSyncStatus(status);
      },
      onStorefrontUpdate: (envelope) => {
        if (!isMounted) return;
        applyRemoteEnvelope(envelope, true);
      },
      onPopupsChanged: () => {
        fetchAllPopups().then((data) => {
          if (isMounted && Array.isArray(data)) {
            setPopups(data);
            if (portalTarget === 'customer') {
              showMenuUpdatedNotice('Menu updated');
            }
          }
        });
      },
    });

    const handleVisibilityOrOnline = () => {
      if (document.visibilityState === 'visible') {
        void pullLatestRemote(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityOrOnline);
    window.addEventListener('online', handleVisibilityOrOnline);

    return () => {
      isMounted = false;
      unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityOrOnline);
      window.removeEventListener('online', handleVisibilityOrOnline);
      if (noticeTimeoutRef.current !== null) {
        window.clearTimeout(noticeTimeoutRef.current);
      }
    };
  }, [applyRemoteEnvelope, portalTarget, showMenuUpdatedNotice]);

  // Idle prefetch of customer modals & secondary tabs after first paint
  // (skipped on Save-Data / 2G / 3G networks so cellular bandwidth stays fast)
  const [areCustomerOverlaysReady, setAreCustomerOverlaysReady] = useState(false);

  useEffect(() => {
    if (portalTarget !== 'customer') return;
    const prefetchChunks = () => {
      if (shouldPrefetchSecondary) {
        void import('./components/FoodDetailModal.tsx');
        void import('./components/SearchModal.tsx');
        void import('./components/HamburgerDrawer.tsx');
        void import('./components/FavoritesView.tsx');
        void import('./components/ProfileView.tsx');
        void import('./components/PromotionalModalQueue.tsx');
      }
      setAreCustomerOverlaysReady(true);
    };

    const win = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    if (typeof win.requestIdleCallback === 'function') {
      const idleId = win.requestIdleCallback(prefetchChunks, { timeout: 1800 });
      return () => win.cancelIdleCallback?.(idleId);
    }

    const timer = window.setTimeout(prefetchChunks, shouldPrefetchSecondary ? 500 : 1200);
    return () => window.clearTimeout(timer);
  }, [portalTarget, shouldPrefetchSecondary]);

  // Filtered menu items
  const filteredMenuItems = useMemo(() => {
    if (!pureVegFilter) return menuItems;
    return menuItems.filter((item) => item.isVeg);
  }, [menuItems, pureVegFilter]);

  // Favorite items list
  const favoriteItems = useMemo(() => {
    return menuItems.filter((item) => favoriteIds.includes(item.id));
  }, [menuItems, favoriteIds]);

  // Single category displayed items
  const singleCategoryItems = useMemo(() => {
    if (activeCategory === 'All') return [];
    return filteredMenuItems.filter((i) => i.category === activeCategory);
  }, [activeCategory, filteredMenuItems]);

  // Pre-grouped category sections for smooth memoized rendering
  const menuSections = useMemo(() => {
    return availableCategories
      .map((category) => {
        const items = filteredMenuItems.filter((i) => i.category === category);
        if (items.length === 0) return null;
        return {
          category,
          meta: getCategoryMeta(category),
          iconSvg: getCategorySectionIcon(category, categoryIcons[category]),
          items,
        };
      })
      .filter((section): section is NonNullable<typeof section> => section !== null);
  }, [availableCategories, filteredMenuItems, categoryIcons]);

  // Handlers
  const handleToggleFavorite = useCallback((item: FoodItem) => {
    setFavoriteIds((prev) =>
      prev.includes(item.id) ? prev.filter((id) => id !== item.id) : [...prev, item.id]
    );
  }, []);

  const handleSelectItem = useCallback((item: FoodItem, size: PortionSizeKey = 'medium') => {
    setSelectedFoodItem(item);
    setModalInitialSize(size);
  }, []);

  const handleOpenMenuDrawer = useCallback(() => setIsMenuDrawerOpen(true), []);
  const handleOpenSearchModal = useCallback(() => setIsSearchOpen(true), []);
  const handleOpenFavoritesTab = useCallback(() => setActiveTab('favorites'), []);
  const handleSelectTabStable = useCallback((tab: BottomTab) => setActiveTab(tab), []);
  const handleSelectCategoryStable = useCallback((cat: Category) => setActiveCategory(cat), []);
  const handleResetToAllCategories = useCallback(() => setActiveCategory('All'), []);

  // Dedicated Super Admin Portal Route (superadmin.* or /superadmin)
  if (portalTarget === 'superadmin') {
    return (
      <Suspense fallback={<PortalLoadingFallback />}>
        <SuperAdminPortal
          serviceControl={serviceControl}
          onUpdateServiceControl={handleUpdateServiceControlLocal}
          brandLogo={brandLogo}
          cafeInfo={cafeInfo}
          totalDishesCount={menuItems.length}
          totalCategoriesCount={availableCategories.length}
          activePopupsCount={popups.filter((p) => p.is_active).length}
          totalPopupsCount={popups.length}
          onResetMenuDefaults={() => handleRestoreDefaultMenu('saved')}
          onResetPopupDefaults={handleResetPopupDefaults}
          onResetCafeInfoDefaults={() => handleUpdateCafeInfoLocal(DEFAULT_CAFE_INFO)}
          onNavigatePortal={handleNavigatePortal}
        />
      </Suspense>
    );
  }

  // Dedicated Admin Portal Route (/admin)
  if (portalTarget === 'admin') {
    return (
      <Suspense fallback={<PortalLoadingFallback />}>
        <AdminPanel
          onNavigateToStorefront={() => handleNavigatePortal('customer')}
          items={menuItems}
          onAddItem={handleAddItem}
          onEditItem={handleEditItem}
          onDeleteItem={handleDeleteItem}
          onRestoreDefaults={handleRestoreDefaultMenu}
          savedDefaultMenu={savedDefaultMenu}
          onSetDefaultMenu={handleSetSavedDefaultMenu}
          availabilityMap={availabilityMap}
          onToggleAvailability={handleToggleItemAvailability}
          onBulkSetAvailability={handleBulkSetAvailability}
          popups={popups}
          onSavePopup={handleSavePopup}
          onDeletePopup={handleDeletePopup}
          onTogglePopupActive={handleTogglePopupActive}
          onResetPopupDefaults={handleResetPopupDefaults}
          onTestPopupQueue={handleTestPopupQueue}
          categories={availableCategories}
          categoryIcons={categoryIcons}
          onAddCategory={handleAddCategory}
          onUpdateCategoryIcon={handleUpdateCategoryIcon}
          onResetCategoryIcon={handleResetCategoryIcon}
          brandLogo={brandLogo}
          onUpdateBrandLogo={handleUpdateBrandLogoLocal}
          cafeInfo={cafeInfo}
          onUpdateCafeInfo={handleUpdateCafeInfoLocal}
          storefrontTheme={storefrontTheme}
          onUpdateStorefrontTheme={handleUpdateStorefrontThemeLocal}
          syncStatus={syncStatus}
          lastSyncError={lastSyncError}
          lastSyncedAt={lastSyncedAt}
          onForcePushToCloud={handleForcePushToCloud}
          onPullFromCloud={handlePullFromCloud}
          isAdminLocked={serviceControl.isAdminLocked}
          isServicePaused={serviceControl.isPaused}
        />

        {/* Preview Pop-up Queue only when explicitly triggered from Admin Portal */}
        {isTestQueueOpen && (
          <PromotionalModalQueue
            popups={popups}
            isOpenOverride={true}
            onCloseOverride={() => setIsTestQueueOpen(false)}
            onTriggerCta={(ctaLink) => {
              setIsTestQueueOpen(false);
              handleTriggerPopupCta(ctaLink);
              handleNavigatePortal('customer');
            }}
          />
        )}
      </Suspense>
    );
  }

  // Customer Storefront Maintenance Screen when Super Admin pauses the service
  if (serviceControl.isPaused) {
    return (
      <Suspense fallback={<PortalLoadingFallback />}>
        <ServicePausedScreen
          brandLogo={brandLogo}
          cafeInfo={cafeInfo}
          serviceControl={serviceControl}
        />
      </Suspense>
    );
  }

  const isNeu = storefrontTheme === 'warm-amber-neumorphism';

  return (
    <LazyMotion features={domAnimation}>
      <MotionConfig reducedMotion={isLiteMode ? 'always' : 'user'}>
        <div
          data-theme={storefrontTheme}
          data-perf={isLiteMode ? 'lite' : 'full'}
          className={`min-h-screen flex flex-col pb-20 md:pb-8 transition-colors duration-300 ${
            isNeu
              ? 'bg-[#F3E5D0] text-[#2A180B] selection:bg-amber-500/20 selection:text-[#B45309]'
              : 'bg-[#F8EBDD] text-[#2D1B12] selection:bg-[#B94F2E]/20 selection:text-[#B94F2E]'
          }`}
        >
        
        {/* Centered responsive container */}
        <div
          className={`w-full max-w-6xl mx-auto min-h-screen flex flex-col relative transition-colors duration-300 ${
            isNeu ? 'bg-[#F3E5D0]' : 'bg-[#F8EBDD]'
          }`}
        >
          
          {/* Top Header with desktop navigation */}
          <Header
            onOpenMenu={handleOpenMenuDrawer}
            onOpenSearch={handleOpenSearchModal}
            savedItemCount={favoriteIds.length}
            onOpenSaved={handleOpenFavoritesTab}
            activeTab={activeTab}
            onSelectTab={handleSelectTabStable}
            brandLogo={brandLogo}
            cafeName={cafeInfo.cafeName?.trim() || DEFAULT_CAFE_INFO.cafeName}
            tagline={cafeInfo.tagline?.trim() || DEFAULT_CAFE_INFO.tagline}
            theme={storefrontTheme}
          />

          {/* Main Tab Router */}
          <main className="flex-1">
            <AnimatePresence mode="wait">
              {activeTab === 'menu' && (
                <m.div
                  key="tab-menu"
                  initial={isLiteMode ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={isLiteMode ? undefined : { opacity: 0, y: -6 }}
                  transition={{ duration: isLiteMode ? 0 : 0.18, ease: [0.16, 1, 0.3, 1] }}
                  className="space-y-4 pb-6"
                >
                
                {/* Hero Banner */}
                <PromoHero
                  cafeName={cafeInfo.cafeName?.trim() || DEFAULT_CAFE_INFO.cafeName}
                  theme={storefrontTheme}
                  isLiteMode={isLiteMode}
                />

                {/* Café Location, Hours & Table Strip */}
                <CafeInfoStrip
                  cafeInfo={cafeInfo}
                  tableLabel={tableLabel}
                  theme={storefrontTheme}
                />

                {/* Horizontal Category Nav Bar */}
                <CategoryNav
                  activeCategory={activeCategory}
                  onSelectCategory={handleSelectCategoryStable}
                  categories={availableCategories}
                  categoryIcons={categoryIcons}
                  theme={storefrontTheme}
                />

                {/* Compact Dietary Filter Bar */}
                <div className="px-3.5 sm:px-6 lg:px-8">
                  <div
                    className={`flex items-center justify-between gap-3 py-2.5 border-y transition-colors duration-300 ${
                      isNeu ? 'border-[#E2C9A4]/80' : 'border-[#B98660]/20'
                    }`}
                  >
                    <div
                      className={`text-xs font-medium tabular-nums flex flex-wrap items-center gap-x-1.5 ${
                        isNeu ? 'text-[#7C5D41]' : 'text-[#7A5C48]'
                      }`}
                    >
                      {activeCategory === 'All' ? (
                        pureVegFilter ? (
                          <span>
                            Showing{' '}
                            <strong className={isNeu ? 'text-[#2A180B]' : 'text-[#2D1B12]'}>
                              {filteredMenuItems.length}
                            </strong>{' '}
                            pure veg {filteredMenuItems.length === 1 ? 'dish' : 'dishes'}
                          </span>
                        ) : (
                          <span>
                            <strong className={isNeu ? 'text-[#2A180B]' : 'text-[#2D1B12]'}>
                              {menuItems.length}
                            </strong>{' '}
                            curated {menuItems.length === 1 ? 'dish' : 'dishes'}
                          </span>
                        )
                      ) : (
                        <span>
                          <strong className={isNeu ? 'text-[#2A180B]' : 'text-[#2D1B12]'}>
                            {singleCategoryItems.length}
                          </strong>{' '}
                          {pureVegFilter ? 'veg ' : ''}
                          {singleCategoryItems.length === 1 ? 'dish' : 'dishes'} in {activeCategory}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={pureVegFilter}
                      onClick={() => setPureVegFilter((v) => !v)}
                      className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer active:scale-95 shrink-0 ${
                        isNeu
                          ? pureVegFilter
                            ? 'neu-card !bg-[#E9F5E9] !border-emerald-500/60 text-emerald-900'
                            : 'neu-pill-btn text-[#5C4128]'
                          : pureVegFilter
                            ? 'cream-neu-card !bg-[#EAF4EA] border border-emerald-600/45 text-emerald-950'
                            : 'cream-neu-pill text-[#5E4232]'
                      }`}
                    >
                      {/* Authentic Veg Mark (Green dot inside square) */}
                      <span
                        aria-hidden="true"
                        className="w-4 h-4 rounded-[4px] border-[1.5px] border-emerald-700 bg-white flex items-center justify-center shrink-0"
                      >
                        <span className="w-2 h-2 rounded-full bg-emerald-600" />
                      </span>

                      <span className="whitespace-nowrap">Only Veg</span>

                      {/* Sliding Switch Track */}
                      <span
                        aria-hidden="true"
                        className={`w-8 h-4.5 rounded-full p-0.5 transition-colors flex items-center ${
                          pureVegFilter
                            ? 'bg-emerald-600'
                            : isNeu
                              ? 'bg-[#D6BF9E]'
                              : 'bg-[#D7C0AA]'
                        }`}
                      >
                        <span
                          className={`w-3.5 h-3.5 rounded-full bg-white shadow-2xs transition-transform duration-150 ${
                            pureVegFilter ? 'translate-x-3.5' : 'translate-x-0'
                          }`}
                        />
                      </span>
                    </button>
                  </div>
                </div>

                {/* Menu Sections Content */}
                <div className="px-3.5 sm:px-6 lg:px-8 space-y-4 sm:space-y-5 md:space-y-6">
                  <AnimatePresence mode="wait">
                    {activeCategory === 'All' ? (
                      <m.div
                        key="category-all"
                        initial={isLiteMode ? false : { opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={isLiteMode ? undefined : { opacity: 0, y: -6 }}
                        transition={{ duration: isLiteMode ? 0 : 0.18, ease: [0.16, 1, 0.3, 1] }}
                        className="space-y-4 sm:space-y-5 md:space-y-6"
                      >
                        {filteredMenuItems.length === 0 ? (
                      <div
                        className={`rounded-3xl p-8 text-center space-y-3 ${
                          isNeu ? 'neu-surface' : 'cream-neu-surface'
                        }`}
                      >
                        <p
                          className={`font-serif text-base font-bold ${
                            isNeu ? 'text-[#2A180B]' : 'text-[#2D1B12]'
                          }`}
                        >
                          No vegetarian dishes available right now
                        </p>
                        <p className={`text-xs ${isNeu ? 'text-[#7C5D41]' : 'text-[#7A5C48]'}`}>
                          Turn off the Only Veg filter to browse all dishes on the menu.
                        </p>
                        <button
                          type="button"
                          onClick={() => setPureVegFilter(false)}
                          className={`min-h-[44px] px-5 py-2.5 rounded-xl text-white text-xs font-semibold cursor-pointer transition-colors ${
                            isNeu ? 'neu-btn-amber' : 'cream-neu-primary'
                          }`}
                        >
                          Show All Dishes
                        </button>
                      </div>
                    ) : (
                      menuSections.map((section, idx) => (
                        <MenuSectionCard
                          key={section.category}
                          category={section.category}
                          title={section.meta.title}
                          subtitle={section.meta.subtitle}
                          iconSvg={section.iconSvg}
                          items={section.items}
                          favoriteIds={favoriteIds}
                          onToggleFavorite={handleToggleFavorite}
                          onViewAll={handleSelectCategoryStable}
                          onSelectItem={handleSelectItem}
                          getAvailability={getAvailability}
                          theme={storefrontTheme}
                          sectionIndex={idx}
                          isLiteMode={isLiteMode}
                        />
                      ))
                    )}
                      </m.div>
                    ) : (
                      /* Single Filtered Category View */
                      <m.div
                        key={`category-${activeCategory}`}
                        initial={isLiteMode ? false : { opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={isLiteMode ? undefined : { opacity: 0, y: -6 }}
                        transition={{ duration: isLiteMode ? 0 : 0.18, ease: [0.16, 1, 0.3, 1] }}
                        className="space-y-3"
                      >
                      <div className="flex items-center justify-between pb-1">
                        <button
                          type="button"
                          onClick={() => setActiveCategory('All')}
                          className={`min-h-[44px] text-xs font-semibold flex items-center gap-1.5 hover:underline cursor-pointer ${
                            isNeu ? 'text-[#B45309]' : 'text-[#B94F2E]'
                          }`}
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                          <span>Back to All Categories</span>
                        </button>
                        <span
                          className={`text-xs tabular-nums ${
                            isNeu ? 'text-[#7C5D41]' : 'text-[#7A5C48]'
                          }`}
                        >
                          {singleCategoryItems.length} {singleCategoryItems.length === 1 ? 'dish' : 'dishes'}
                        </span>
                      </div>

                      {singleCategoryItems.length === 0 ? (
                        <div
                          className={`rounded-3xl p-8 text-center space-y-3 ${
                            isNeu ? 'neu-surface' : 'cream-neu-surface'
                          }`}
                        >
                          <p
                            className={`font-serif text-base font-bold ${
                              isNeu ? 'text-[#2A180B]' : 'text-[#2D1B12]'
                            }`}
                          >
                            {pureVegFilter
                              ? `No vegetarian dishes in ${activeCategory}`
                              : `No dishes in ${activeCategory} yet`}
                          </p>
                          <p className={`text-xs ${isNeu ? 'text-[#7C5D41]' : 'text-[#7A5C48]'}`}>
                            {pureVegFilter
                              ? 'Turn off the Only Veg filter or switch to another category to view more dishes.'
                              : 'Select another category or add a dish to this category from the Admin Portal.'}
                          </p>
                          <div className="flex items-center justify-center gap-2.5">
                            {pureVegFilter && (
                              <button
                                type="button"
                                onClick={() => setPureVegFilter(false)}
                                className={`min-h-[44px] px-5 py-2.5 rounded-xl text-white text-xs font-semibold cursor-pointer transition-colors ${
                                  isNeu ? 'neu-btn-amber' : 'cream-neu-primary'
                                }`}
                              >
                                Show All {activeCategory}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setActiveCategory('All')}
                              className={`min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                                isNeu
                                  ? 'neu-pill-btn text-[#5C4128]'
                                  : 'cream-neu-pill text-[#5E4232]'
                              }`}
                            >
                              All Categories
                            </button>
                          </div>
                        </div>
                      ) : (
                      <MenuSectionCard
                        category={activeCategory}
                        title={getCategoryMeta(activeCategory).title}
                        subtitle={getCategoryMeta(activeCategory).subtitle}
                        iconSvg={getCategorySectionIcon(activeCategory, categoryIcons[activeCategory])}
                        items={singleCategoryItems}
                        favoriteIds={favoriteIds}
                        onToggleFavorite={handleToggleFavorite}
                        onViewAll={handleResetToAllCategories}
                        actionLabel="All Categories"
                        onSelectItem={handleSelectItem}
                        getAvailability={getAvailability}
                        theme={storefrontTheme}
                        sectionIndex={0}
                        isLiteMode={isLiteMode}
                      />
                      )}
                      </m.div>
                    )}
                  </AnimatePresence>

                </div>

              </m.div>
            )}

              {activeTab === 'favorites' && (
                <m.div
                  key="tab-favorites"
                  initial={isLiteMode ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={isLiteMode ? undefined : { opacity: 0, y: -6 }}
                  transition={{ duration: isLiteMode ? 0 : 0.18, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Suspense fallback={<TabLoadingSkeleton isNeu={isNeu} />}>
                    <FavoritesView
                      favoriteItems={favoriteItems}
                      onRemoveFavorite={handleToggleFavorite}
                      onExploreMenu={() => setActiveTab('menu')}
                      onSelectItem={(item) => handleSelectItem(item)}
                      getAvailability={getAvailability}
                      cafeName={cafeInfo.cafeName?.trim() || DEFAULT_CAFE_INFO.cafeName}
                      theme={storefrontTheme}
                    />
                  </Suspense>
                </m.div>
              )}

              {activeTab === 'profile' && (
                <m.div
                  key="tab-profile"
                  initial={isLiteMode ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={isLiteMode ? undefined : { opacity: 0, y: -6 }}
                  transition={{ duration: isLiteMode ? 0 : 0.18, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Suspense fallback={<TabLoadingSkeleton isNeu={isNeu} />}>
                    <ProfileView
                      pureVegFilter={pureVegFilter}
                      onTogglePureVegFilter={() => setPureVegFilter((v) => !v)}
                      brandLogo={brandLogo}
                      cafeInfo={cafeInfo}
                      theme={storefrontTheme}
                      onOpenAdminPanel={() => handleNavigatePortal('admin')}
                    />
                  </Suspense>
                </m.div>
              )}
            </AnimatePresence>
          </main>

          {/* Food Detail Modal (lazy-loaded / prefetched on idle) */}
          {(areCustomerOverlaysReady || Boolean(selectedFoodItem)) && (
            <Suspense fallback={null}>
              <FoodDetailModal
                item={selectedFoodItem}
                isOpen={Boolean(selectedFoodItem)}
                onClose={() => setSelectedFoodItem(null)}
                isFavorite={selectedFoodItem ? favoriteIds.includes(selectedFoodItem.id) : false}
                onToggleFavorite={handleToggleFavorite}
                isAvailable={selectedFoodItem ? getAvailability(selectedFoodItem) : true}
                initialSize={modalInitialSize}
                theme={storefrontTheme}
              />
            </Suspense>
          )}

          {/* Search Modal (lazy-loaded / prefetched on idle) */}
          {(areCustomerOverlaysReady || isSearchOpen) && (
            <Suspense fallback={null}>
              <SearchModal
                isOpen={isSearchOpen}
                onClose={() => setIsSearchOpen(false)}
                items={filteredMenuItems}
                onSelectItem={(item) => handleSelectItem(item)}
                getAvailability={getAvailability}
                theme={storefrontTheme}
              />
            </Suspense>
          )}

          {/* Hamburger Menu Drawer (lazy-loaded / prefetched on idle) */}
          {(areCustomerOverlaysReady || isMenuDrawerOpen) && (
            <Suspense fallback={null}>
              <HamburgerDrawer
                isOpen={isMenuDrawerOpen}
                onClose={() => setIsMenuDrawerOpen(false)}
                onSelectCategory={(cat) => {
                  setActiveCategory(cat);
                  setActiveTab('menu');
                }}
                categories={availableCategories}
                brandLogo={brandLogo}
                cafeInfo={cafeInfo}
                theme={storefrontTheme}
              />
            </Suspense>
          )}

          {/* Customer Promotional Pop-up Banner Queue (respects Super Admin global mute) */}
          {!serviceControl.suppressPopups && areCustomerOverlaysReady && isPopupsRemoteReady && (
            <Suspense fallback={null}>
              <PromotionalModalQueue
                popups={popups}
                onTriggerCta={handleTriggerPopupCta}
              />
            </Suspense>
          )}

          {/* Subtle Real-Time Menu Update Toast */}
          <AnimatePresence>
            {liveUpdateNotice && (
              <m.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                role="status"
                aria-live="polite"
                className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-40 pointer-events-none"
              >
                <div
                  className={`px-4 py-2.5 rounded-full text-xs font-semibold flex items-center gap-2 shadow-md ${
                    isNeu
                      ? 'neu-surface text-[#2A180B]'
                      : 'bg-[#2D1B12] text-[#FDF6EE] border border-[#4A2F20]'
                  }`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isNeu ? 'text-[#D97706]' : 'text-[#F3B08E]'}`} />
                  <span>{liveUpdateNotice}</span>
                </div>
              </m.div>
            )}
          </AnimatePresence>

          {/* Fixed Bottom Navigation (Menu, Orders, Favorites, Profile) */}
          <BottomNav
            activeTab={activeTab}
            onSelectTab={handleSelectTabStable}
            favoritesCount={favoriteIds.length}
            theme={storefrontTheme}
          />

        </div>

      </div>
    </MotionConfig>
    </LazyMotion>
  );
}
