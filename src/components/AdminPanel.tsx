import React, { useState } from 'react';
import {
  Lock,
  Plus,
  Trash2,
  Edit3,
  X,
  Search,
  Check,
  RefreshCw,
  AlertCircle,
  Eye,
  EyeOff,
  LogOut,
  ExternalLink,
  PauseCircle,
  ShieldAlert,
  Sparkles,
  Upload,
  QrCode,
  RotateCcw,
  Link2,
  BookmarkCheck,
  CheckCircle2,
} from 'lucide-react';
import { FoodItem, Category, PortionSizeKey, PortionTier, PricingMode, CafeInfo, StorefrontTheme, SavedDefaultMenuSnapshot } from '../types/index.ts';
import { getItemDisplayPrice, isFixedPriceItem } from '../utils/cart.ts';
import { resolveItemAvailability, summarizeAvailability } from '../lib/availability.ts';
import { MenuPopup } from '../types/popup.ts';
import { DEFAULT_CATEGORIES, DEFAULT_CAFE_INFO } from '../lib/menuDefaults.ts';
import {
  CATEGORY_ICON_OPTIONS,
  DEFAULT_CUSTOM_ICON_ID,
  getCategoryIconLabel,
  isCategoryImageUrl,
  renderCategoryLogo,
  sanitizeCategoryImageUrlInput,
} from '../lib/categoryIcons.tsx';
import { BrandEmblem } from './BrandEmblem.tsx';
import { PopupBannerAdmin } from './PopupBannerAdmin.tsx';
import { BrandLogoAdmin } from './BrandLogoAdmin.tsx';
import { MenuQrAdmin } from './MenuQrAdmin.tsx';
import { CategoryLogosAdmin } from './CategoryLogosAdmin.tsx';
import { LiveSyncAdmin } from './LiveSyncAdmin.tsx';
import { ImageFramingModal } from './ImageFramingModal.tsx';
import { ResetConfirmModal } from './ResetConfirmModal.tsx';
import {
  clearRememberedPortalEmail,
  getRememberedPortalEmail,
} from '../lib/serviceControl.ts';
import {
  claimFirstRunPortalAccount,
  completeSupabasePasswordRecovery,
  getPortalAuthStatus,
  sendSupabasePasswordReset,
  signInToPortal,
  signOutFromPortal,
  signUpSupabaseStaffAccount,
} from '../lib/portalAuth.ts';
import { RealtimeSyncStatus } from '../lib/realtimeMenuSync.ts';
import {
  CompressionResult,
  estimateDataUrlSizeBytes,
  formatBytes,
} from '../lib/imageCompressor.ts';
import { uploadCompressedMediaToStorage } from '../lib/mediaStorage.ts';

// Curated high quality food image presets for admin convenience
const PRESET_FOOD_IMAGES = [
  {
    name: 'Tandoori Starter',
    url: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Crispy Snack',
    url: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Steaming Soup Bowl',
    url: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Rich Curry Main',
    url: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Artisan Pizza',
    url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Gourmet Burger',
    url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80',
  },
];

interface AdminPanelProps {
  onNavigateToStorefront: () => void;
  items: FoodItem[];
  onAddItem: (newItem: FoodItem) => void;
  onEditItem: (updatedItem: FoodItem) => void;
  onDeleteItem: (itemId: string) => void;
  onRestoreDefaults: (mode?: 'saved' | 'factory') => void;
  savedDefaultMenu?: SavedDefaultMenuSnapshot | null;
  onSetDefaultMenu?: () => void;
  availabilityMap: Record<string, boolean>;
  onToggleAvailability: (itemId: string) => void;
  onBulkSetAvailability?: (itemIds: string[], isAvailable: boolean) => void;
  popups: MenuPopup[];
  onSavePopup: (popup: MenuPopup) => void;
  onDeletePopup: (popupId: string) => void;
  onTogglePopupActive: (popupId: string) => void;
  onResetPopupDefaults: () => void;
  onTestPopupQueue: () => void;
  categories?: string[];
  categoryIcons?: Record<string, string>;
  onAddCategory?: (category: string, iconId?: string) => void;
  onUpdateCategoryIcon?: (category: string, iconId: string) => void;
  onResetCategoryIcon?: (category: string) => void;
  brandLogo?: string | null;
  onUpdateBrandLogo?: (logoUrl: string | null) => void;
  cafeInfo?: CafeInfo;
  onUpdateCafeInfo?: (info: CafeInfo) => void;
  storefrontTheme?: StorefrontTheme;
  onUpdateStorefrontTheme?: (theme: StorefrontTheme) => void;
  syncStatus?: RealtimeSyncStatus;
  lastSyncError?: string | null;
  lastSyncedAt?: string | null;
  onForcePushToCloud?: () => Promise<{ ok: boolean; error?: string }>;
  onPullFromCloud?: () => Promise<{ ok: boolean; found: boolean; error?: string }>;
  isAdminLocked?: boolean;
  isServicePaused?: boolean;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  onNavigateToStorefront,
  items,
  onAddItem,
  onEditItem,
  onDeleteItem,
  onRestoreDefaults,
  savedDefaultMenu = null,
  onSetDefaultMenu,
  availabilityMap,
  onToggleAvailability,
  onBulkSetAvailability,
  popups,
  onSavePopup,
  onDeletePopup,
  onTogglePopupActive,
  onResetPopupDefaults,
  onTestPopupQueue,
  categories = DEFAULT_CATEGORIES,
  categoryIcons = {},
  onAddCategory,
  onUpdateCategoryIcon,
  onResetCategoryIcon,
  brandLogo = null,
  onUpdateBrandLogo,
  cafeInfo = DEFAULT_CAFE_INFO,
  onUpdateCafeInfo,
  storefrontTheme = 'classic',
  onUpdateStorefrontTheme,
  syncStatus = 'local',
  lastSyncError = null,
  lastSyncedAt = null,
  onForcePushToCloud,
  onPullFromCloud,
  isAdminLocked = false,
  isServicePaused = false,
}) => {
  const cafeName = cafeInfo.cafeName?.trim() || DEFAULT_CAFE_INFO.cafeName || 'The Burger Craze';
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);
  const [authMode, setAuthMode] = useState<'supabase' | 'server'>('server');
  const [needsFirstRunSetup, setNeedsFirstRunSetup] = useState<boolean>(false);
  const [serverUnavailable, setServerUnavailable] = useState<boolean>(false);
  const [supabaseActionMode, setSupabaseActionMode] = useState<'signin' | 'signup' | 'recovery'>('signin');
  const [isAuthSubmitting, setIsAuthSubmitting] = useState<boolean>(false);
  const [rememberedEmail, setRememberedEmail] = useState<string>(() =>
    getRememberedPortalEmail('admin')
  );
  const [adminEmail, setAdminEmail] = useState<string>(() =>
    getRememberedPortalEmail('admin')
  );
  const [adminPassword, setAdminPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authInfo, setAuthInfo] = useState('');
  const [adminTab, setAdminTab] = useState<
    'dishes' | 'categories' | 'popups' | 'branding' | 'qr' | 'sync'
  >('dishes');

  React.useEffect(() => {
    let cancelled = false;
    setIsAuthChecking(true);
    void getPortalAuthStatus('admin')
      .then((status) => {
        if (cancelled) return;
        setAuthMode(status.mode);
        setNeedsFirstRunSetup(status.needsFirstRunSetup);
        setServerUnavailable(Boolean(status.serverUnavailable));
        if (status.needsPasswordRecovery) {
          setSupabaseActionMode('recovery');
          if (status.email) setAdminEmail(status.email);
        }
        setIsAuthenticated(Boolean(status.authenticated && !isAdminLocked));
      })
      .finally(() => {
        if (!cancelled) setIsAuthChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAdminLocked]);

  // Search & Filter state in Admin
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category>('All');

  // Modal states for CRUD
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FoodItem | null>(null);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<FoodItem | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [resetMode, setResetMode] = useState<'saved' | 'factory'>('saved');
  const [isSetDefaultConfirmOpen, setIsSetDefaultConfirmOpen] = useState(false);
  const [defaultMenuNotice, setDefaultMenuNotice] = useState<string | null>(null);
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIconId, setNewCategoryIconId] = useState<string>(DEFAULT_CUSTOM_ICON_ID);
  const [isEditingExistingCategoryLogo, setIsEditingExistingCategoryLogo] = useState(false);
  const [logoFilterGroup, setLogoFilterGroup] = useState<'all' | 'indian' | 'global'>('all');
  const [pendingCategoryLogoFile, setPendingCategoryLogoFile] = useState<File | null>(null);
  const [categoryLogoUrlInput, setCategoryLogoUrlInput] = useState('');
  const [categoryLogoError, setCategoryLogoError] = useState<string | null>(null);
  const [isUploadingCategoryLogo, setIsUploadingCategoryLogo] = useState(false);
  const categoryLogoInputRef = React.useRef<HTMLInputElement | null>(null);

  // Form fields for Add / Edit
  const [formData, setFormData] = useState({
    name: '',
    category: 'Starters' as Exclude<Category, 'All'>,
    description: '',
    image: PRESET_FOOD_IMAGES[0].url,
    isVeg: true,
    isAvailable: true,
    spiceLevel: 'Mild' as 'Mild' | 'Medium' | 'Spicy',
    prepTime: '12-15 min',
    calories: 250,
    ingredients: '',
    allergens: '',
    pricingMode: 'tiered' as PricingMode,
    fixedPrice: 120,
    fixedPortion: '',
    smallPortion: '180g (Small)',
    smallPrice: 120,
    mediumPortion: '260g (Medium)',
    mediumPrice: 160,
    largePortion: '350g (Large)',
    largePrice: 210,
  });

  const [pendingDishImageFile, setPendingDishImageFile] = useState<File | null>(null);
  const [isSavingItem, setIsSavingItem] = useState(false);
  const [imageUploadState, setImageUploadState] = useState<{
    isCompressing?: boolean;
    originalSize?: string;
    finalSize?: string;
    wasCompressed?: boolean;
    error?: string;
  }>({});

  // Async Portal Authentication (Supabase Auth + authorized_staff OR Server Auth fallback)
  const isPasswordCreateFlow =
    (needsFirstRunSetup && authMode === 'server') ||
    (authMode === 'supabase' && (supabaseActionMode === 'signup' || supabaseActionMode === 'recovery'));

  const handleVerifyLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAdminLocked) {
      setAuthError('Admin Portal access is currently suspended by Super Admin.');
      return;
    }
    if (isAuthSubmitting) return;

    if (isPasswordCreateFlow) {
      if (adminPassword.length < 8) {
        setAuthError('Password must be at least 8 characters.');
        return;
      }
      if (adminPassword !== confirmPassword) {
        setAuthError('Passwords do not match.');
        return;
      }
    }

    setIsAuthSubmitting(true);
    setAuthError('');
    setAuthInfo('');
    try {
      let result;
      if (authMode === 'supabase' && supabaseActionMode === 'recovery') {
        result = await completeSupabasePasswordRecovery({
          role: 'admin',
          newPassword: adminPassword,
          rememberMe,
        });
      } else if (authMode === 'supabase' && supabaseActionMode === 'signup') {
        result = await signUpSupabaseStaffAccount({
          role: 'admin',
          email: adminEmail,
          password: adminPassword,
          rememberMe,
        });
      } else if (needsFirstRunSetup && authMode === 'server') {
        result = await claimFirstRunPortalAccount({
          role: 'admin',
          email: adminEmail,
          password: adminPassword,
          rememberMe,
        });
      } else {
        result = await signInToPortal({
          role: 'admin',
          email: adminEmail,
          password: adminPassword,
          rememberMe,
        });
      }

      if (result.ok) {
        const normalizedEmail = (result.email || adminEmail).trim();
        setRememberedEmail(rememberMe ? normalizedEmail : '');
        setNeedsFirstRunSetup(false);
        setSupabaseActionMode('signin');
        setIsAuthenticated(true);
        setAuthError('');
        setAuthInfo('');
        setAdminPassword('');
        setConfirmPassword('');
        setRememberMe(false);
      } else if (result.pendingEmailConfirmation && result.info) {
        setAuthInfo(result.info);
        setSupabaseActionMode('signin');
        setAdminPassword('');
        setConfirmPassword('');
      } else {
        setAuthError(result.error || 'Authentication failed.');
      }
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    if (isAuthSubmitting) return;
    setIsAuthSubmitting(true);
    setAuthError('');
    setAuthInfo('');
    try {
      const result = await sendSupabasePasswordReset({
        role: 'admin',
        email: adminEmail,
      });
      if (result.ok && result.info) {
        setAuthInfo(result.info);
      } else {
        setAuthError(result.error || 'Unable to send password reset email.');
      }
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await signOutFromPortal('admin');
    const savedEmail = getRememberedPortalEmail('admin');
    setIsAuthenticated(false);
    setRememberedEmail(savedEmail);
    setAdminEmail(savedEmail);
    setAdminPassword('');
    setConfirmPassword('');
    setRememberMe(false);
    setAuthError('');
    setAuthInfo('');
  };

  const handleForgetSavedEmail = () => {
    clearRememberedPortalEmail('admin');
    setRememberedEmail('');
    setAdminEmail('');
    setAuthError('');
    setAuthInfo('');
  };

  // Dish image upload handler: stage draft in interactive framing modal before confirming
  const handleDishImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setImageUploadState({});
    setPendingDishImageFile(file);
  };

  const handleConfirmFramedDishImage = (result: CompressionResult) => {
    setFormData((prev) => ({ ...prev, image: result.dataUrl }));
    setImageUploadState({
      isCompressing: false,
      originalSize: result.formattedOriginalSize,
      finalSize: result.formattedSize,
      wasCompressed: result.wasCompressed,
    });
    setPendingDishImageFile(null);
  };

  // Open editor for new item
  const handleOpenAddModal = () => {
    setEditingItem(null);
    setPendingDishImageFile(null);
    setImageUploadState({});
    setIsAddingNewCategory(false);
    setNewCategoryName('');
    setNewCategoryIconId(DEFAULT_CUSTOM_ICON_ID);
    setIsEditingExistingCategoryLogo(false);
    setLogoFilterGroup('all');
    setCategoryLogoUrlInput('');
    setCategoryLogoError(null);
    setPendingCategoryLogoFile(null);
    setFormData({
      name: '',
      category: (categories[0] || 'Starters') as Exclude<Category, 'All'>,
      description: '',
      image: PRESET_FOOD_IMAGES[0].url,
      isVeg: true,
      isAvailable: true,
      spiceLevel: 'Mild',
      prepTime: '12-15 min',
      calories: 250,
      ingredients: 'Fresh ingredients, herbs, spices',
      allergens: '',
      pricingMode: 'tiered',
      fixedPrice: 120,
      fixedPortion: '',
      smallPortion: '180g (Small)',
      smallPrice: 120,
      mediumPortion: '260g (Medium)',
      mediumPrice: 160,
      largePortion: '350g (Large)',
      largePrice: 210,
    });
    setIsEditorOpen(true);
  };

  // Open editor for existing item
  const handleOpenEditModal = (item: FoodItem) => {
    setEditingItem(item);
    setPendingDishImageFile(null);
    setImageUploadState({});
    setIsAddingNewCategory(false);
    setNewCategoryName('');
    setNewCategoryIconId(DEFAULT_CUSTOM_ICON_ID);
    setIsEditingExistingCategoryLogo(false);
    setLogoFilterGroup('all');
    setCategoryLogoUrlInput('');
    setCategoryLogoError(null);
    setPendingCategoryLogoFile(null);
    const isFixed = isFixedPriceItem(item);
    setFormData({
      name: item.name,
      category: (item.category === 'All' ? 'Starters' : item.category) as Exclude<Category, 'All'>,
      description: item.description,
      image: item.image,
      isVeg: item.isVeg,
      isAvailable: resolveItemAvailability(item, availabilityMap),
      spiceLevel: item.spiceLevel || 'Mild',
      prepTime: item.prepTime,
      calories: item.calories,
      ingredients: item.ingredients.join(', '),
      allergens: item.allergens ? item.allergens.join(', ') : '',
      pricingMode: isFixed ? 'fixed' : 'tiered',
      fixedPrice: isFixed ? item.price : (item.sizes?.medium?.price ?? item.price),
      fixedPortion: item.fixedPortion ?? '',
      smallPortion: item.sizes?.small?.portion ?? '180g (Small)',
      smallPrice: item.sizes?.small?.price ?? item.price,
      mediumPortion: item.sizes?.medium?.portion ?? '260g (Medium)',
      mediumPrice: item.sizes?.medium?.price ?? item.price,
      largePortion: item.sizes?.large?.portion ?? '350g (Large)',
      largePrice: item.sizes?.large?.price ?? item.price,
    });
    setIsEditorOpen(true);
  };

  // Submit Add or Edit
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || isSavingItem) return;

    const rawCategory = isAddingNewCategory
      ? newCategoryName.trim()
      : String(formData.category).trim();
    if (isAddingNewCategory && !rawCategory) return;

    setIsSavingItem(true);
    try {
      const existingMatch = categories.find(
        (c) => c.toLowerCase() === rawCategory.toLowerCase()
      );
      const finalCategory = (
        existingMatch ||
        (rawCategory.toLowerCase() === 'all' ? 'Starters' : rawCategory) ||
        'Starters'
      ) as Exclude<Category, 'All'>;

      if (!existingMatch) {
        onAddCategory?.(finalCategory, newCategoryIconId);
      } else if (isAddingNewCategory) {
        onUpdateCategoryIcon?.(existingMatch, newCategoryIconId);
      }

      const isFixed = formData.pricingMode === 'fixed';
      const resolvedFixedPrice = Math.max(0, Number(formData.fixedPrice) || 0);
      const resolvedFixedPortion = formData.fixedPortion.trim() || undefined;

      const sizesRecord: Record<PortionSizeKey, PortionTier> = {
        small: {
          label: 'Small',
          portion: formData.smallPortion || 'Small',
          price: Number(formData.smallPrice) || 100,
          calories: Math.round(Number(formData.calories) * 0.75),
        },
        medium: {
          label: 'Medium',
          portion: formData.mediumPortion || 'Medium',
          price: Number(formData.mediumPrice) || 140,
          calories: Number(formData.calories) || 250,
        },
        large: {
          label: 'Large',
          portion: formData.largePortion || 'Large',
          price: Number(formData.largePrice) || 190,
          calories: Math.round(Number(formData.calories) * 1.3),
        },
      };

      const ingredientsList = formData.ingredients
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const allergensList = formData.allergens
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const resolvedImage = await uploadCompressedMediaToStorage(
        formData.image || PRESET_FOOD_IMAGES[0].url,
        'dishes'
      );

      if (editingItem) {
        // Update existing
        const updated: FoodItem = {
          ...editingItem,
          name: formData.name.trim(),
          category: finalCategory,
          description: formData.description.trim() || 'Freshly prepared specialty dish.',
          image: resolvedImage,
          isVeg: formData.isVeg,
          isAvailable: formData.isAvailable,
          spiceLevel: formData.spiceLevel,
          prepTime: formData.prepTime || '15 min',
          calories: Number(formData.calories) || 250,
          ingredients: ingredientsList.length > 0 ? ingredientsList : ['Fresh spices', 'Herbs'],
          allergens: allergensList.length > 0 ? allergensList : undefined,
          pricingMode: isFixed ? 'fixed' : 'tiered',
          price: isFixed ? resolvedFixedPrice : (Number(formData.mediumPrice) || 140),
          fixedPortion: isFixed ? resolvedFixedPortion : undefined,
          sizes: isFixed ? undefined : sizesRecord,
        };
        onEditItem(updated);
      } else {
        // Add brand new
        const newItem: FoodItem = {
          id: `custom-${Date.now()}`,
          name: formData.name.trim(),
          category: finalCategory,
          description: formData.description.trim() || 'Freshly prepared specialty dish.',
          image: resolvedImage,
          rating: 4.8,
          reviewCount: 1,
          prepTime: formData.prepTime || '15 min',
          calories: Number(formData.calories) || 250,
          tags: [formData.isVeg ? 'Vegetarian' : 'Non-Vegetarian', finalCategory],
          isVeg: formData.isVeg,
          spiceLevel: formData.spiceLevel,
          isPopular: false,
          isChefSpecial: false,
          ingredients: ingredientsList.length > 0 ? ingredientsList : ['Fresh spices', 'Herbs'],
          allergens: allergensList.length > 0 ? allergensList : undefined,
          isAvailable: formData.isAvailable,
          pricingMode: isFixed ? 'fixed' : 'tiered',
          price: isFixed ? resolvedFixedPrice : (Number(formData.mediumPrice) || 140),
          fixedPortion: isFixed ? resolvedFixedPortion : undefined,
          sizes: isFixed ? undefined : sizesRecord,
        };
        onAddItem(newItem);
      }

      setIsEditorOpen(false);
    } finally {
      setIsSavingItem(false);
    }
  };

  // Filter items
  const filteredItems = items.filter((it) => {
    const matchesCategory = selectedCategory === 'All' || it.category === selectedCategory;
    const matchesSearch =
      it.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      it.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const totalItemsCount = items.length;
  const overallAvailability = summarizeAvailability(items, availabilityMap);
  const filteredAvailability = summarizeAvailability(filteredItems, availabilityMap);
  const activeScopeLabel =
    selectedCategory === 'All' ? 'All Dishes' : String(selectedCategory);

  const handleBulkScopeAvailability = (targetAvailable: boolean) => {
    const targetIds = filteredItems.map((it) => it.id);
    if (targetIds.length === 0) return;
    if (onBulkSetAvailability) {
      onBulkSetAvailability(targetIds, targetAvailable);
      return;
    }
    filteredItems.forEach((it) => {
      const current = resolveItemAvailability(it, availabilityMap);
      if (current !== targetAvailable) {
        onToggleAvailability(it.id);
      }
    });
  };

  return (
    <div className="min-h-screen bg-[#FAF7EE] text-[#2C1C12] flex flex-col">
      {isAdminLocked ? (
        <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
          <div className="w-full max-w-md bg-white rounded-3xl border border-amber-300 shadow-lg p-6 sm:p-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div className="space-y-1.5">
              <span className="text-[10.5px] font-bold uppercase tracking-[0.2em] text-amber-700 block">
                Access Suspended
              </span>
              <h1 className="font-serif text-xl sm:text-2xl font-bold text-[#2C1C12]">
                Admin Portal Locked
              </h1>
              <p className="text-xs text-[#6B5746] leading-relaxed">
                Admin access has been temporarily locked by the Super Admin. Contact your account owner to restore access.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={onNavigateToStorefront}
                className="min-h-[40px] px-4 py-2 rounded-xl bg-[#D4621A] hover:bg-[#B84E0F] text-white text-xs font-semibold cursor-pointer"
              >
                Return to Storefront
              </button>
              {isAuthenticated && (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="min-h-[40px] px-4 py-2 rounded-xl bg-[#FAF6EE] hover:bg-[#EFE5D6] text-[#5C4533] border border-[#E0D2C2] text-xs font-semibold cursor-pointer"
                >
                  Sign Out
                </button>
              )}
            </div>
          </div>
        </div>
      ) : isAuthChecking ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-[#D4621A] border-t-transparent animate-spin" />
            <span className="text-xs font-semibold text-[#7A6452]">
              Verifying portal session...
            </span>
          </div>
        </div>
      ) : !isAuthenticated ? (
        /* Email & Password Login / First-Run Claim Screen */
        <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-[#EDE2D2] overflow-hidden">
            <div className="bg-gradient-to-br from-[#2D1B11] via-[#3B2519] to-[#482F20] text-white px-6 py-6 flex flex-col items-center text-center">
              <BrandEmblem logoUrl={brandLogo} brandName={cafeName} size="md" />
              <span className="mt-3 text-[10px] uppercase tracking-[0.25em] font-bold text-[#FDBA74]">
                {needsFirstRunSetup && authMode === 'server'
                  ? 'FIRST-RUN ADMIN SETUP'
                  : 'STORE ADMIN PORTAL'}
              </span>
              <h1 className="font-serif text-xl sm:text-2xl font-bold text-white mt-1">
                {cafeName}
              </h1>
              <p className="text-xs text-[#D8C7B6] mt-1">
                {needsFirstRunSetup && authMode === 'server'
                  ? 'Create the initial Store Admin credentials. Setup locks automatically once saved.'
                  : 'Sign in to manage menu dishes, promotional banners, logo, and café info.'}
              </p>
            </div>

            <form onSubmit={(e) => void handleVerifyLogin(e)} className="p-6 space-y-4 text-xs">
              {authMode === 'supabase' ? (
                <div className="space-y-2.5">
                  <div className="px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] font-medium">
                    Secured by <strong>Supabase Auth</strong> &amp; <code className="font-mono">authorized_staff</code> allowlist.
                  </div>
                  {supabaseActionMode !== 'recovery' && (
                    <div
                      role="tablist"
                      aria-label="Admin authentication mode"
                      className="grid grid-cols-2 p-1 rounded-xl bg-[#FAF6EE] border border-[#E6DACB] gap-1"
                    >
                      <button
                        type="button"
                        role="tab"
                        aria-selected={supabaseActionMode === 'signin'}
                        onClick={() => {
                          setSupabaseActionMode('signin');
                          setAuthError('');
                          setAuthInfo('');
                        }}
                        className={`py-1.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                          supabaseActionMode === 'signin'
                            ? 'bg-[#D4621A] text-white shadow-2xs'
                            : 'text-[#6B5746] hover:text-[#2C1C12]'
                        }`}
                      >
                        Sign In
                      </button>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={supabaseActionMode === 'signup'}
                        onClick={() => {
                          setSupabaseActionMode('signup');
                          setAuthError('');
                          setAuthInfo('');
                        }}
                        className={`py-1.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                          supabaseActionMode === 'signup'
                            ? 'bg-[#D4621A] text-white shadow-2xs'
                            : 'text-[#6B5746] hover:text-[#2C1C12]'
                        }`}
                      >
                        First-Time Setup
                      </button>
                    </div>
                  )}
                  {supabaseActionMode === 'signup' && (
                    <p className="text-[11px] text-[#6B5746] leading-relaxed">
                      Creates your Supabase Auth login password. Only emails listed in{' '}
                      <code className="font-mono font-semibold">authorized_staff</code> can unlock the portal.
                    </p>
                  )}
                  {supabaseActionMode === 'recovery' && (
                    <div className="px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-medium">
                      Password reset verified. Choose a new password (min 8 characters) to finish signing in.
                    </div>
                  )}
                </div>
              ) : (
                serverUnavailable && (
                  <div className="px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] leading-relaxed space-y-1">
                    <p className="font-bold">Supabase Environment Variables Missing</p>
                    <p>
                      This static host has no backend auth API. Add{' '}
                      <code className="font-mono font-semibold">VITE_SUPABASE_URL</code> and{' '}
                      <code className="font-mono font-semibold">VITE_SUPABASE_ANON_KEY</code> in{' '}
                      <strong>Vercel → Project Settings → Environment Variables</strong>, then redeploy.
                    </p>
                  </div>
                )
              )}

              {supabaseActionMode !== 'recovery' && (
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <label htmlFor="admin-email-id" className="block font-bold text-[#5C4533]">
                      Admin ID (Email)
                    </label>
                    {rememberedEmail && (
                      <button
                        type="button"
                        onClick={handleForgetSavedEmail}
                        className="text-[11px] font-semibold text-[#D4621A] hover:underline cursor-pointer"
                      >
                        Forget email
                      </button>
                    )}
                  </div>
                  <input
                    id="admin-email-id"
                    type="email"
                    required
                    autoFocus={!rememberedEmail}
                    autoComplete="username"
                    placeholder="Enter admin email"
                    value={adminEmail}
                    onChange={(e) => {
                      setAdminEmail(e.target.value);
                      setAuthError('');
                      setAuthInfo('');
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E0D2C2] text-[#2C1C12] font-medium focus:outline-none focus:ring-2 focus:ring-[#D4621A]"
                  />
                </div>
              )}

              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <label htmlFor="admin-password" className="block font-bold text-[#5C4533]">
                    {supabaseActionMode === 'recovery'
                      ? 'New Password (min 8 characters)'
                      : isPasswordCreateFlow
                      ? 'Create Password (min 8 characters)'
                      : 'Password'}
                  </label>
                  {authMode === 'supabase' && supabaseActionMode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => void handleForgotPassword()}
                      disabled={isAuthSubmitting}
                      className="text-[11px] font-semibold text-[#D4621A] hover:underline cursor-pointer disabled:opacity-50"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    id="admin-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={isPasswordCreateFlow ? 8 : undefined}
                    autoFocus={Boolean(rememberedEmail) || supabaseActionMode === 'recovery'}
                    autoComplete={isPasswordCreateFlow ? 'new-password' : 'current-password'}
                    placeholder={
                      isPasswordCreateFlow ? 'At least 8 characters' : 'Enter password'
                    }
                    value={adminPassword}
                    onChange={(e) => {
                      setAdminPassword(e.target.value);
                      setAuthError('');
                    }}
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E0D2C2] text-[#2C1C12] font-medium focus:outline-none focus:ring-2 focus:ring-[#D4621A]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#8C7662] hover:text-[#2C1C12] cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {isPasswordCreateFlow && (
                <div>
                  <label
                    htmlFor="admin-confirm-password"
                    className="block font-bold text-[#5C4533] mb-1.5"
                  >
                    Confirm Password
                  </label>
                  <input
                    id="admin-confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setAuthError('');
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E0D2C2] text-[#2C1C12] font-medium focus:outline-none focus:ring-2 focus:ring-[#D4621A]"
                  />
                </div>
              )}

              <label
                htmlFor="admin-remember-me"
                className="min-h-[44px] flex items-start gap-2.5 py-1.5 px-2.5 -mx-1 rounded-xl hover:bg-[#FAF6EE] transition-colors cursor-pointer select-none"
              >
                <input
                  id="admin-remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-[#CBB8A3] accent-[#D4621A] cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4621A] focus-visible:ring-offset-1"
                />
                <span className="flex flex-col">
                  <span className="text-xs font-semibold text-[#2C1C12] leading-snug">
                    Remember me for 30 days
                  </span>
                  <span className="text-[11px] text-[#7A6452] leading-snug">
                    Keeps you signed in and saves your email on this device
                  </span>
                </span>
              </label>

              {authInfo && (
                <div className="flex items-start gap-2 text-emerald-800 bg-emerald-50 px-3 py-2.5 rounded-xl border border-emerald-200 font-medium leading-relaxed">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{authInfo}</span>
                </div>
              )}

              {authError && (
                <div className="flex items-start gap-2 text-rose-700 bg-rose-50 px-3 py-2.5 rounded-xl border border-rose-200 font-medium leading-relaxed">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{authError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isAuthSubmitting}
                className="w-full min-h-[42px] py-2.5 rounded-xl bg-[#D4621A] hover:bg-[#B84E0F] text-white font-semibold text-xs sm:text-sm tracking-wide transition-all shadow-xs active:scale-95 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <Lock className="w-4 h-4" />
                <span>
                  {isAuthSubmitting
                    ? 'Verifying...'
                    : authMode === 'supabase' && supabaseActionMode === 'recovery'
                    ? 'Update Password & Sign In'
                    : authMode === 'supabase' && supabaseActionMode === 'signup'
                    ? 'Activate Staff Account'
                    : needsFirstRunSetup && authMode === 'server'
                    ? 'Create Admin Account & Sign In'
                    : 'Sign In to Admin Portal'}
                </span>
              </button>

              <div className="pt-2 border-t border-[#F0E6D8] flex items-center justify-center">
                <button
                  type="button"
                  onClick={onNavigateToStorefront}
                  className="text-[11px] text-[#8C7662] hover:text-[#2C1C12] font-medium cursor-pointer"
                >
                  &larr; Return to Café Menu
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        /* Authenticated Full-Page Admin Workspace */
        <div className="flex-1 max-w-6xl w-full mx-auto bg-[#FFFDF9] md:my-4 md:rounded-3xl md:border md:border-[#EFE5D7] md:shadow-sm overflow-hidden flex flex-col">
          {isServicePaused && (
            <div className="px-5 py-2 bg-amber-50 border-b border-amber-200 text-amber-900 text-xs flex items-center justify-center gap-2 font-medium">
              <PauseCircle className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                Customer storefront is currently <strong>Paused</strong> by Super Admin. Menu edits will appear once service resumes.
              </span>
            </div>
          )}

          {/* Top Workspace Bar */}
          <div className="px-4 sm:px-5 py-3.5 border-b border-[#EFE5D6] bg-white flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <BrandEmblem logoUrl={brandLogo} brandName={cafeName} size="sm" />
              <div>
                <h1 className="font-serif text-lg sm:text-xl font-bold text-[#2C1C12] leading-tight">
                  {cafeName} Portal
                </h1>
                <p className="text-[11px] text-[#8C7662] tabular-nums">
                  Dishes: <strong className="text-[#2C1C12]">{totalItemsCount}</strong> (
                  <span className="text-emerald-700 font-semibold">
                    {overallAvailability.availableCount} in stock
                  </span>
                  {overallAvailability.soldOutCount > 0 && (
                    <>
                      {' · '}
                      <span className="text-rose-700 font-semibold">
                        {overallAvailability.soldOutCount} sold out
                      </span>
                    </>
                  )}
                  ) · Pop-ups: <strong className="text-[#D4621A]">{popups.length}</strong> ({popups.filter(p => p.is_active).length} active) ·{' '}
                  <button
                    type="button"
                    onClick={() => setAdminTab('sync')}
                    className={`underline decoration-dotted underline-offset-2 cursor-pointer ${
                      lastSyncError
                        ? 'text-rose-700 font-semibold'
                        : syncStatus === 'live'
                        ? 'text-emerald-700 font-semibold'
                        : 'text-[#7A6452] hover:text-[#D4621A]'
                    }`}
                  >
                    {lastSyncError
                      ? 'Sync Issue'
                      : syncStatus === 'live'
                        ? 'Live Sync'
                        : syncStatus === 'connecting'
                          ? 'Connecting...'
                          : 'Local Sync'}
                  </button>
                </p>
              </div>
            </div>

            {/* Segmented Admin Tabs */}
            <div className="flex items-center flex-wrap p-1 bg-[#FAF6EE] rounded-2xl border border-[#E8DDCE] gap-0.5">
              <button
                type="button"
                onClick={() => setAdminTab('dishes')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  adminTab === 'dishes'
                    ? 'bg-[#D4621A] text-white shadow-2xs'
                    : 'text-[#7A6452] hover:text-[#2C1C12]'
                }`}
              >
                Dishes Manager
              </button>
              <button
                type="button"
                onClick={() => setAdminTab('categories')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  adminTab === 'categories'
                    ? 'bg-[#D4621A] text-white shadow-2xs'
                    : 'text-[#7A6452] hover:text-[#2C1C12]'
                }`}
              >
                Category Logos
              </button>
              <button
                type="button"
                onClick={() => setAdminTab('popups')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  adminTab === 'popups'
                    ? 'bg-[#D4621A] text-white shadow-2xs'
                    : 'text-[#7A6452] hover:text-[#2C1C12]'
                }`}
              >
                <span>Announcement Pop-ups</span>
                {popups.filter((p) => p.is_active).length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setAdminTab('branding')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  adminTab === 'branding'
                    ? 'bg-[#D4621A] text-white shadow-2xs'
                    : 'text-[#7A6452] hover:text-[#2C1C12]'
                }`}
              >
                Storefront &amp; Info
              </button>
              <button
                type="button"
                onClick={() => setAdminTab('qr')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  adminTab === 'qr'
                    ? 'bg-[#D4621A] text-white shadow-2xs'
                    : 'text-[#7A6452] hover:text-[#2C1C12]'
                }`}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Menu QR</span>
              </button>
              <button
                type="button"
                onClick={() => setAdminTab('sync')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  adminTab === 'sync'
                    ? 'bg-[#D4621A] text-white shadow-2xs'
                    : 'text-[#7A6452] hover:text-[#2C1C12]'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    adminTab === 'sync'
                      ? 'bg-white'
                      : lastSyncError
                      ? 'bg-rose-500'
                      : syncStatus === 'live'
                      ? 'bg-emerald-500'
                      : 'bg-amber-500'
                  }`}
                />
                <span>Live Sync</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {adminTab === 'dishes' && (
                <>
                  <button
                    onClick={handleOpenAddModal}
                    className="px-3.5 py-1.5 rounded-xl bg-[#D4621A] hover:bg-[#B84E0F] text-white font-semibold text-xs flex items-center gap-1.5 shadow-2xs transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                    <span>Add Dish</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDefaultMenuNotice(null);
                      setIsSetDefaultConfirmOpen(true);
                    }}
                    title="Save current dishes, custom categories, and category logos as your Default Menu"
                    className="px-3 py-1.5 rounded-xl bg-[#FAF6EE] hover:bg-[#EFE5D6] text-[#2C1C12] border border-[#E0D2C2] font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <BookmarkCheck className="w-3.5 h-3.5 text-[#D4621A]" />
                    <span className="hidden sm:inline">Set as Default</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDefaultMenuNotice(null);
                      setResetMode(savedDefaultMenu ? 'saved' : 'factory');
                      setIsResetConfirmOpen(true);
                    }}
                    title={
                      savedDefaultMenu
                        ? `Restore your saved Default Menu (${savedDefaultMenu.menuItems.length} dishes)`
                        : 'Restore original 18 starter dishes'
                    }
                    className="px-2.5 py-1.5 rounded-xl bg-[#FAF6EE] hover:bg-[#EFE5D6] text-[#7A6452] hover:text-[#2C1C12] border border-[#E8DDCE] font-semibold text-xs flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Reset Dishes</span>
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={onNavigateToStorefront}
                className="px-2.5 py-1.5 rounded-xl bg-[#FAF6EE] hover:bg-[#EFE5D6] text-[#5C4533] border border-[#E8DDCE] font-semibold text-xs flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
              >
                <ExternalLink className="w-3.5 h-3.5 text-[#D4621A]" />
                <span className="hidden sm:inline">View Menu</span>
              </button>

              <button
                type="button"
                onClick={handleLogout}
                aria-label="Sign out of Admin Portal"
                className="px-2.5 py-1.5 rounded-xl bg-[#FFF2F2] hover:bg-[#FFE0E0] text-rose-700 border border-rose-200 font-semibold text-xs flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>

            {adminTab === 'dishes' ? (
              <>
                {/* Filter & Search Bar */}
                <div className="px-5 py-3 bg-[#FAF8F5] border-b border-[#F0E6D8] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                {(['All', ...categories] as Category[]).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                      selectedCategory === cat
                        ? 'bg-[#D4621A] text-white shadow-2xs'
                        : 'bg-white text-[#7A6452] border border-[#EAE0D2] hover:bg-[#F3EADB]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="relative flex-1 sm:max-w-xs min-w-[200px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8C7662]" />
                <input
                  type="text"
                  placeholder="Search dishes to edit or remove..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white border border-[#EAE0D2] text-xs text-[#2C1C12] focus:outline-none focus:ring-1 focus:ring-[#D4621A]"
                />
              </div>
            </div>

            {/* Active Default Menu Baseline & Confirmation Notice */}
            <div className="px-5 py-2 bg-[#FFFDF9] border-b border-[#F2E9DC] flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#7A6452]">
              <div className="flex flex-wrap items-center gap-1.5 tabular-nums">
                <span className="font-semibold text-[#5C4533]">Default Menu:</span>
                {savedDefaultMenu ? (
                  <span>
                    Saved Custom Menu ({savedDefaultMenu.menuItems.length} dishes ·{' '}
                    {savedDefaultMenu.customCategories.length} custom categories ·{' '}
                    {Object.keys(savedDefaultMenu.categoryIcons).length} customized logos)
                  </span>
                ) : (
                  <span>Original 18 starter dishes (tap Set as Default to save your own)</span>
                )}
              </div>
              {defaultMenuNotice && (
                <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>{defaultMenuNotice}</span>
                </div>
              )}
            </div>

            {/* Bulk Category Availability Controls */}
            {filteredItems.length > 0 && (
              <div className="px-5 py-2.5 bg-[#FAF6EE] border-b border-[#EFE5D6] flex flex-wrap items-center justify-between gap-2.5 text-xs">
                <div className="flex flex-wrap items-center gap-2 tabular-nums">
                  <span className="font-bold text-[#2C1C12]">
                    {activeScopeLabel}
                    {searchQuery.trim() ? ' (Filtered)' : ''}:
                  </span>
                  <span className="text-emerald-800 font-semibold">
                    {filteredAvailability.availableCount} In Stock
                  </span>
                  <span className="text-[#C8AE96]" aria-hidden="true">·</span>
                  <span className="text-rose-700 font-semibold">
                    {filteredAvailability.soldOutCount} Sold Out
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={filteredAvailability.soldOutCount === 0}
                    onClick={() => handleBulkScopeAvailability(true)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 disabled:opacity-45 disabled:cursor-not-allowed text-emerald-800 border border-emerald-300 font-semibold text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                    <span>
                      Mark {selectedCategory === 'All' ? 'All' : selectedCategory} In Stock
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={filteredAvailability.availableCount === 0}
                    onClick={() => handleBulkScopeAvailability(false)}
                    className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 disabled:opacity-45 disabled:cursor-not-allowed text-rose-800 border border-rose-300 font-semibold text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <AlertCircle className="w-3.5 h-3.5 text-rose-700" />
                    <span>
                      Mark {selectedCategory === 'All' ? 'All' : selectedCategory} Sold Out
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* Items Management List */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 no-scrollbar">
              {filteredItems.length === 0 ? (
                <div className="text-center py-12 text-[#8C7662] text-xs">
                  No dishes found matching &quot;{searchQuery}&quot;. Tap <strong>Add New Dish</strong> above to create one.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredItems.map((item) => {
                    const isAvailable = resolveItemAvailability(item, availabilityMap);
                    const isFixed = isFixedPriceItem(item);
                    const minPrice = getItemDisplayPrice(item);

                    return (
                      <div
                        key={item.id}
                        className={`bg-white rounded-2xl p-3.5 border transition-all flex flex-col justify-between gap-3 shadow-2xs ${
                          !isAvailable ? 'border-dashed border-[#E5DACD] opacity-75' : 'border-[#EDE2D2]'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-16 h-14 rounded-xl overflow-hidden shrink-0 bg-[#F4EBE0] relative">
                            <img
                              src={item.image}
                              alt={item.name}
                              className={`w-full h-full object-cover ${!isAvailable ? 'grayscale-40' : ''}`}
                              referrerPolicy="no-referrer"
                            />
                            {!isAvailable && (
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                <span className="text-[8px] font-bold text-white uppercase bg-black/60 px-1 py-0.5 rounded">
                                  Out
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className={`w-2 h-2 rounded-full shrink-0 ${
                                  item.isVeg ? 'bg-emerald-600' : 'bg-amber-700'
                                }`}
                              />
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C7662]">
                                {item.category}
                              </span>
                            </div>

                            <h3 className="font-semibold text-xs sm:text-sm text-[#2C1C12] truncate mt-0.5">
                              {item.name}
                            </h3>

                            <p className="text-[10px] text-[#8C7662] line-clamp-1 mt-0.5">
                              {item.description}
                            </p>
                          </div>
                        </div>

                        {/* Price Summary (Fixed Price vs Size Tiers) */}
                        {isFixed ? (
                          <div className="p-2 rounded-xl bg-[#FAF7F0] border border-[#F2ECE1] text-[10.5px] flex items-center justify-between gap-2 font-mono">
                            <span className="text-[#8C7662] font-sans font-medium truncate">
                              Fixed Price{item.fixedPortion ? ` · ${item.fixedPortion}` : ''}
                            </span>
                            <span className="font-bold text-[#D4621A] shrink-0 tabular-nums">
                              ₹{item.price}
                            </span>
                          </div>
                        ) : (
                          <div className="p-2 rounded-xl bg-[#FAF7F0] border border-[#F2ECE1] text-[10.5px] flex items-center justify-between font-mono">
                            <span className="text-[#8C7662]">S: ₹{item.sizes?.small?.price ?? item.price}</span>
                            <span className="text-[#8C7662]">M: ₹{item.sizes?.medium?.price ?? item.price}</span>
                            <span className="text-[#8C7662]">L: ₹{item.sizes?.large?.price ?? item.price}</span>
                            <span className="font-bold text-[#D4621A]">From ₹{minPrice}</span>
                          </div>
                        )}

                        {/* Bottom Actions Row */}
                        <div className="flex items-center justify-between pt-1 border-t border-[#F5EFE7]">
                          <button
                            onClick={() => onToggleAvailability(item.id)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                              isAvailable
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
                                : 'bg-rose-50 text-rose-800 border border-rose-300 hover:bg-rose-100'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${isAvailable ? 'bg-emerald-600' : 'bg-rose-600'}`} />
                            <span>{isAvailable ? 'In Stock' : 'Sold Out'}</span>
                          </button>

                          <button
                            onClick={() => handleOpenEditModal(item)}
                            aria-label={`Edit ${item.name}`}
                            className="px-2.5 py-1 rounded-lg bg-[#FAF6EE] hover:bg-[#EFE5D6] text-[#6B5746] hover:text-[#D4621A] border border-[#E8DDCE] transition-colors cursor-pointer flex items-center gap-1.5 text-[11px] font-semibold"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit Dish</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        ) : adminTab === 'categories' ? (
          <CategoryLogosAdmin
            categories={categories}
            categoryIcons={categoryIcons}
            onUpdateCategoryIcon={(cat, iconId) => onUpdateCategoryIcon?.(cat, iconId)}
            onResetCategoryIcon={(cat) => onResetCategoryIcon?.(cat)}
          />
        ) : adminTab === 'popups' ? (
          <PopupBannerAdmin
            popups={popups}
            onSavePopup={onSavePopup}
            onDeletePopup={onDeletePopup}
            onToggleActive={onTogglePopupActive}
            onResetDefaults={onResetPopupDefaults}
            onTestQueue={onTestPopupQueue}
            categories={categories}
          />
        ) : adminTab === 'branding' ? (
          <BrandLogoAdmin
            brandLogo={brandLogo ?? null}
            onUpdateBrandLogo={(url) => onUpdateBrandLogo?.(url)}
            cafeInfo={cafeInfo}
            onUpdateCafeInfo={(info) => onUpdateCafeInfo?.(info)}
            storefrontTheme={storefrontTheme}
            onUpdateStorefrontTheme={(t) => onUpdateStorefrontTheme?.(t)}
          />
        ) : adminTab === 'qr' ? (
          <MenuQrAdmin
            brandLogo={brandLogo ?? null}
            cafeInfo={cafeInfo}
            syncStatus={syncStatus}
          />
        ) : (
          <LiveSyncAdmin
            syncStatus={syncStatus}
            lastSyncError={lastSyncError}
            lastSyncedAt={lastSyncedAt}
            onForcePushToCloud={onForcePushToCloud}
            onPullFromCloud={onPullFromCloud}
          />
        )}
        </div>
      )}

      {/* Add / Edit Dish Modal Dialog */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs">
          <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-[#EDE2D2] max-h-[92vh]">
            
            {/* Header */}
            <div className="px-5 py-3.5 border-b border-[#F0E6D8] flex items-center justify-between bg-[#FAF7EE]">
              <h3 className="font-serif text-lg font-bold text-[#2C1C12]">
                {editingItem ? `Edit: ${editingItem.name}` : 'Add New Menu Dish'}
              </h3>
              <button
                onClick={() => setIsEditorOpen(false)}
                className="w-8 h-8 rounded-full bg-white text-[#6B5746] flex items-center justify-center hover:bg-[#EFE5D6] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveItem} className="overflow-y-auto p-5 space-y-4 text-xs no-scrollbar">
              
              {/* Name & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#5C4533] mb-1">
                    Dish Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Truffle Mushroom Risotto"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E0D2C2] text-[#2C1C12] font-medium focus:outline-none focus:ring-1 focus:ring-[#D4621A]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#5C4533] mb-1">
                    Menu Category *
                  </label>
                  {!isAddingNewCategory ? (
                    <div className="space-y-2">
                      <select
                        value={formData.category}
                        onChange={(e) => {
                          if (e.target.value === '__add_new__') {
                            setIsAddingNewCategory(true);
                            setNewCategoryName('');
                            setNewCategoryIconId(DEFAULT_CUSTOM_ICON_ID);
                            setIsEditingExistingCategoryLogo(false);
                          } else {
                            setIsEditingExistingCategoryLogo(false);
                            setFormData({
                              ...formData,
                              category: e.target.value as Exclude<Category, 'All'>,
                            });
                          }
                        }}
                        className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E0D2C2] text-[#2C1C12] font-medium focus:outline-none focus:ring-1 focus:ring-[#D4621A]"
                      >
                        {categories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                        {formData.category && !categories.includes(formData.category) && (
                          <option value={formData.category}>{formData.category}</option>
                        )}
                        <option value="__add_new__">+ Add New Category...</option>
                      </select>

                      <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-[#FAF6EE] border border-[#E8DDCE]">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-7 h-7 rounded-lg bg-[#D4621A] text-white flex items-center justify-center shrink-0 overflow-hidden">
                            {renderCategoryLogo(formData.category, {
                              color: '#FFFFFF',
                              sizeClass: 'w-4 h-4',
                              imageClassName: 'w-7 h-7 rounded-lg object-cover',
                              strokeWidth: 1.8,
                              customIconId: categoryIcons[formData.category],
                            })}
                          </span>
                          <span className="text-[11px] font-medium text-[#5C4533] truncate">
                            {getCategoryIconLabel(
                              categoryIcons[formData.category],
                              formData.category
                            )}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {categoryIcons[formData.category] && (
                            <button
                              type="button"
                              onClick={() => {
                                onResetCategoryIcon?.(formData.category);
                                setCategoryLogoUrlInput('');
                                setCategoryLogoError(null);
                              }}
                              title={`Reset ${formData.category} logo to default`}
                              className="px-2 py-1 rounded-lg bg-white hover:bg-rose-50 text-[#7A6452] hover:text-rose-700 border border-[#E0D2C2] font-semibold text-[11px] whitespace-nowrap cursor-pointer transition-colors"
                            >
                              Reset
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setCategoryLogoError(null);
                              const currentVal = categoryIcons[formData.category];
                              setCategoryLogoUrlInput(
                                isCategoryImageUrl(currentVal) ? currentVal : ''
                              );
                              setIsEditingExistingCategoryLogo((prev) => !prev);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-white hover:bg-[#F3EADB] text-[#D4621A] border border-[#E0D2C2] font-semibold text-[11px] whitespace-nowrap cursor-pointer transition-colors"
                          >
                            {isEditingExistingCategoryLogo ? 'Done' : 'Change Logo'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          required
                          autoFocus
                          placeholder="e.g. Desserts, Beverages, Pasta"
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#D4621A] text-[#2C1C12] font-medium focus:outline-none focus:ring-1 focus:ring-[#D4621A]"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingNewCategory(false);
                            setNewCategoryName('');
                          }}
                          className="px-2.5 py-2 rounded-xl bg-[#FAF6EE] hover:bg-[#EFE5D6] text-[#7A6452] border border-[#E0D2C2] font-semibold text-[11px] whitespace-nowrap cursor-pointer shrink-0"
                        >
                          Choose existing
                        </button>
                      </div>
                      <p className="text-[10px] text-[#8C7662]">
                        Creates a new category across the menu, category bar, and filters.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Visual Category Logo Picker + Custom Image Upload (Shown when adding a new category or editing any category's logo) */}
              {(isAddingNewCategory || isEditingExistingCategoryLogo) && (() => {
                const indianCount = CATEGORY_ICON_OPTIONS.filter((o) => o.group === 'indian').length;
                const globalCount = CATEGORY_ICON_OPTIONS.filter((o) => o.group === 'global').length;
                const visibleIcons = CATEGORY_ICON_OPTIONS.filter(
                  (o) => logoFilterGroup === 'all' || o.group === logoFilterGroup
                );
                const activeIconId = isAddingNewCategory
                  ? newCategoryIconId
                  : categoryIcons[formData.category];
                const targetCategoryLabel = isAddingNewCategory
                  ? newCategoryName.trim() || 'New Category'
                  : formData.category;

                return (
                  <div className="p-3.5 rounded-2xl bg-[#FAF6EE] border border-[#E8DDCE] space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="font-bold text-[#5C4533] text-xs block">
                          {isAddingNewCategory
                            ? 'Choose Category Logo'
                            : `Logo for ${formData.category}`}
                        </span>
                        <span className="text-[11px] font-semibold text-[#D4621A]">
                          Selected:{' '}
                          {getCategoryIconLabel(
                            activeIconId,
                            isAddingNewCategory ? undefined : formData.category
                          )}
                        </span>
                      </div>

                      {/* Segmented Filter Tabs: All / Indian / Global */}
                      <div
                        role="tablist"
                        aria-label="Filter category logos"
                        className="inline-flex items-center p-0.5 rounded-xl bg-white border border-[#E0D2C2] gap-0.5"
                      >
                        {[
                          { id: 'all' as const, label: `All (${CATEGORY_ICON_OPTIONS.length})` },
                          { id: 'indian' as const, label: `Indian (${indianCount})` },
                          { id: 'global' as const, label: `Global (${globalCount})` },
                        ].map((tab) => {
                          const isTabActive = logoFilterGroup === tab.id;
                          return (
                            <button
                              key={tab.id}
                              type="button"
                              role="tab"
                              aria-selected={isTabActive}
                              onClick={() => setLogoFilterGroup(tab.id)}
                              className={`px-2.5 py-1 rounded-lg text-[10.5px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
                                isTabActive
                                  ? 'bg-[#D4621A] text-white shadow-2xs'
                                  : 'text-[#7A6452] hover:text-[#2C1C12] hover:bg-[#FAF6EE]'
                              }`}
                            >
                              {tab.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Custom Image Upload or URL */}
                    <div className="p-2.5 rounded-xl bg-white border border-[#E0D2C2] space-y-2">
                      <input
                        ref={categoryLogoInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          e.target.value = '';
                          if (!file) return;
                          setCategoryLogoError(null);
                          setPendingCategoryLogoFile(file);
                        }}
                        className="hidden"
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          disabled={isUploadingCategoryLogo}
                          onClick={() => categoryLogoInputRef.current?.click()}
                          className="min-h-[36px] px-3 py-1.5 rounded-lg bg-[#D4621A] hover:bg-[#B84E0F] disabled:opacity-60 text-white text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>
                            {isUploadingCategoryLogo ? 'Uploading...' : 'Upload Logo Image'}
                          </span>
                        </button>

                        <div className="flex-1 min-w-[160px] flex items-center gap-1.5">
                          <div className="relative flex-1">
                            <Link2 className="w-3 h-3 text-[#8C7662] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                              type="text"
                              placeholder={`Image URL for ${targetCategoryLabel}`}
                              value={categoryLogoUrlInput}
                              onChange={(e) => {
                                setCategoryLogoUrlInput(e.target.value);
                                setCategoryLogoError(null);
                              }}
                              className="w-full pl-7 pr-2.5 py-1.5 rounded-lg bg-[#FAF8F5] border border-[#E0D2C2] text-[11px] text-[#2C1C12] focus:outline-none focus:ring-1 focus:ring-[#D4621A]"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const safeUrl = sanitizeCategoryImageUrlInput(categoryLogoUrlInput);
                              if (!safeUrl) {
                                setCategoryLogoError('Enter a valid HTTPS/HTTP image URL.');
                                return;
                              }
                              setCategoryLogoError(null);
                              if (isAddingNewCategory) {
                                setNewCategoryIconId(safeUrl);
                              } else {
                                onUpdateCategoryIcon?.(formData.category, safeUrl);
                              }
                            }}
                            className="min-h-[34px] px-2.5 py-1 rounded-lg bg-[#FAF6EE] hover:bg-[#EFE5D6] text-[#2C1C12] border border-[#E0D2C2] text-[11px] font-semibold cursor-pointer whitespace-nowrap"
                          >
                            Apply
                          </button>
                        </div>

                        {!isAddingNewCategory && categoryIcons[formData.category] && (
                          <button
                            type="button"
                            onClick={() => {
                              onResetCategoryIcon?.(formData.category);
                              setCategoryLogoUrlInput('');
                              setCategoryLogoError(null);
                            }}
                            className="min-h-[34px] px-2.5 py-1 rounded-lg bg-[#FAF6EE] hover:bg-rose-50 text-[#5C4533] hover:text-rose-700 border border-[#E0D2C2] text-[11px] font-semibold flex items-center gap-1 cursor-pointer whitespace-nowrap"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Reset</span>
                          </button>
                        )}
                      </div>

                      {categoryLogoError && (
                        <p className="text-[11px] text-rose-700 font-medium">
                          {categoryLogoError}
                        </p>
                      )}
                    </div>

                    <div
                      role="radiogroup"
                      aria-label="Category Logo Options"
                      className="grid grid-cols-5 sm:grid-cols-6 gap-2 max-h-52 overflow-y-auto p-0.5 no-scrollbar"
                    >
                      {visibleIcons.map((option) => {
                        const isSelected = activeIconId === option.id;
                        const IconComponent = option.Icon;

                        return (
                          <button
                            key={option.id}
                            type="button"
                            role="radio"
                            aria-checked={isSelected}
                            aria-label={option.label}
                            title={option.label}
                            onClick={() => {
                              setCategoryLogoUrlInput('');
                              setCategoryLogoError(null);
                              if (isAddingNewCategory) {
                                setNewCategoryIconId(option.id);
                              } else {
                                onUpdateCategoryIcon?.(formData.category, option.id);
                              }
                            }}
                            className={`min-h-[44px] rounded-xl flex flex-col items-center justify-center gap-1 p-1.5 border transition-all cursor-pointer active:scale-95 ${
                              isSelected
                                ? 'bg-[#D4621A] text-white border-[#D4621A] shadow-xs'
                                : 'bg-white text-[#8C6C50] border-[#E0D2C2] hover:bg-[#F3EADB] hover:text-[#2C1C12]'
                            }`}
                          >
                            <IconComponent
                              className="w-5 h-5 shrink-0"
                              strokeWidth={1.8}
                              color={isSelected ? '#FFFFFF' : '#8C6C50'}
                            />
                            <span
                              className={`text-[8.5px] leading-none font-medium truncate w-full text-center ${
                                isSelected ? 'text-white' : 'text-[#7A6452]'
                              }`}
                            >
                              {option.shortLabel || option.label.split(' ')[0]}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Description */}
              <div>
                <label className="block font-bold text-[#5C4533] mb-1">
                  Menu Description
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Creamy arborio rice with black truffle oil and roasted wild forest mushrooms."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E0D2C2] text-[#2C1C12] font-medium focus:outline-none focus:ring-1 focus:ring-[#D4621A]"
                />
              </div>

              {/* Food Image Selector with 200 KB Auto-Compressing Upload */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-[#5C4533]">
                    Dish Image (Max 200 KB) *
                  </label>
                  {formData.image && (
                    <span className="text-[10px] font-mono text-[#8C7662]">
                      {formData.image.startsWith('data:')
                        ? formatBytes(estimateDataUrlSizeBytes(formData.image))
                        : 'Web Asset URL'}
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex gap-2 items-center">
                    <label className="px-3 py-2 rounded-xl bg-[#FAF6EE] hover:bg-[#EFE5D6] text-[#7A6452] border border-[#E0D2C2] font-semibold text-xs flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors">
                      <Upload className="w-3.5 h-3.5 text-[#D4621A]" />
                      <span>{imageUploadState.isCompressing ? 'Optimizing...' : 'Upload Photo'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={imageUploadState.isCompressing}
                        onChange={handleDishImageUpload}
                        className="hidden"
                      />
                    </label>

                    <input
                      type="url"
                      placeholder="Or paste direct image URL (https://...)"
                      value={formData.image}
                      onChange={(e) => {
                        setFormData({ ...formData, image: e.target.value });
                        setImageUploadState({});
                      }}
                      className="flex-1 px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E0D2C2] text-[#2C1C12] focus:outline-none focus:ring-1 focus:ring-[#D4621A]"
                    />

                    <div className="w-12 h-10 rounded-xl overflow-hidden bg-neutral-100 shrink-0 border border-[#E0D2C2]">
                      <img
                        src={formData.image || PRESET_FOOD_IMAGES[0].url}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>

                  <p className="text-[10.5px] text-[#8C7662] leading-snug tabular-nums">
                    Recommended aspect ratio: <strong className="font-semibold text-[#5C4533]">4:3 or 16:10 landscape</strong> (800 × 600 px) · Auto-compressed &le; 200 KB
                  </p>

                  {/* Optimization & Size Badge */}
                  {imageUploadState.finalSize && (
                    <div className="flex items-center gap-1.5 text-[10.5px] px-2.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>
                        Image ready: <strong>{imageUploadState.finalSize}</strong> (Strictly &le; 200 KB)
                        {imageUploadState.wasCompressed && (
                          <span className="text-[#8C7662]"> · Auto-compressed from {imageUploadState.originalSize}</span>
                        )}
                      </span>
                    </div>
                  )}

                  {imageUploadState.error && (
                    <div className="text-[10px] text-rose-600 bg-rose-50 px-2.5 py-1 rounded-xl border border-rose-200">
                      {imageUploadState.error}
                    </div>
                  )}

                  {/* Preset quick buttons */}
                  <div className="pt-1">
                    <span className="text-[10px] text-[#8C7662] block mb-1">
                      Or choose a culinary preset image:
                    </span>
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                      {PRESET_FOOD_IMAGES.map((preset) => (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, image: preset.url });
                            setImageUploadState({});
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[10px] whitespace-nowrap cursor-pointer transition-colors border ${
                            formData.image === preset.url
                              ? 'bg-[#D4621A] text-white border-[#D4621A] shadow-2xs font-semibold'
                              : 'bg-[#FAF6EE] text-[#7A6452] border-[#E8DDCE] hover:bg-[#F0E6D8]'
                          }`}
                        >
                          {preset.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Dietary, Kitchen Availability, Spice Rating & Calories */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-bold text-[#5C4533] mb-1">
                    Dietary
                  </label>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, isVeg: !formData.isVeg })}
                    className={`w-full py-2 px-3 rounded-xl border font-bold flex items-center justify-center gap-2 cursor-pointer ${
                      formData.isVeg
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : 'bg-amber-50 text-amber-900 border-amber-300'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${formData.isVeg ? 'bg-emerald-600' : 'bg-amber-700'}`} />
                    <span>{formData.isVeg ? 'Pure Veg' : 'Non-Veg'}</span>
                  </button>
                </div>

                <div>
                  <label className="block font-bold text-[#5C4533] mb-1">
                    Availability
                  </label>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, isAvailable: !formData.isAvailable })}
                    className={`w-full py-2 px-3 rounded-xl border font-bold flex items-center justify-center gap-2 cursor-pointer ${
                      formData.isAvailable
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : 'bg-rose-50 text-rose-800 border-rose-300'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${formData.isAvailable ? 'bg-emerald-600' : 'bg-rose-600'}`} />
                    <span>{formData.isAvailable ? 'In Stock' : 'Sold Out'}</span>
                  </button>
                </div>

                <div>
                  <label className="block font-bold text-[#5C4533] mb-1">
                    Spice Level
                  </label>
                  <select
                    value={formData.spiceLevel}
                    onChange={(e) => setFormData({ ...formData, spiceLevel: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E0D2C2] text-[#2C1C12] font-medium"
                  >
                    <option value="Mild">Mild</option>
                    <option value="Medium">Medium</option>
                    <option value="Spicy">Spicy</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#5C4533] mb-1">
                    Calories (kcal)
                  </label>
                  <input
                    type="number"
                    value={formData.calories}
                    onChange={(e) => setFormData({ ...formData, calories: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E0D2C2] text-[#2C1C12]"
                  />
                </div>
              </div>

              {/* Pricing Mode: Size Tiers (S, M, L) or Single Fixed Price */}
              <div className="p-3.5 rounded-2xl bg-[#FFF9F3] border border-[#FED7AA] space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-bold text-[#9A3412] text-xs flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Pricing Mode &amp; Amounts (₹)</span>
                  </div>

                  {/* Segmented Mode Toggle */}
                  <div
                    role="tablist"
                    aria-label="Pricing mode"
                    className="inline-flex items-center p-0.5 rounded-xl bg-white border border-[#FED7AA] gap-0.5"
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={formData.pricingMode === 'tiered'}
                      onClick={() => setFormData({ ...formData, pricingMode: 'tiered' })}
                      className={`min-h-[36px] px-3 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
                        formData.pricingMode === 'tiered'
                          ? 'bg-[#D4621A] text-white shadow-2xs'
                          : 'text-[#7A6452] hover:text-[#2C1C12] hover:bg-[#FAF6EE]'
                      }`}
                    >
                      Size Tiers (S / M / L)
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={formData.pricingMode === 'fixed'}
                      onClick={() => setFormData({ ...formData, pricingMode: 'fixed' })}
                      className={`min-h-[36px] px-3 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
                        formData.pricingMode === 'fixed'
                          ? 'bg-[#D4621A] text-white shadow-2xs'
                          : 'text-[#7A6452] hover:text-[#2C1C12] hover:bg-[#FAF6EE]'
                      }`}
                    >
                      Fixed Price
                    </button>
                  </div>
                </div>

                {formData.pricingMode === 'fixed' ? (
                  <div className="space-y-2.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="bg-white p-2.5 rounded-xl border border-[#FED7AA]">
                        <label
                          htmlFor="fixed-price-input"
                          className="font-bold text-[#D4621A] block mb-1"
                        >
                          Fixed Price (₹) *
                        </label>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[#8C7662] font-semibold">₹</span>
                          <input
                            id="fixed-price-input"
                            type="number"
                            min={0}
                            required
                            placeholder="e.g. 120"
                            value={formData.fixedPrice}
                            onChange={(e) =>
                              setFormData({ ...formData, fixedPrice: Number(e.target.value) })
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg bg-[#FAF8F5] border border-[#E8DDCE] font-bold text-[#2C1C12] tabular-nums focus:outline-none focus:ring-1 focus:ring-[#D4621A]"
                          />
                        </div>
                      </div>

                      <div className="bg-white p-2.5 rounded-xl border border-[#FED7AA]">
                        <label
                          htmlFor="fixed-portion-input"
                          className="font-bold text-[#5C4533] block mb-1"
                        >
                          Serving Size / Quantity (Optional)
                        </label>
                        <input
                          id="fixed-portion-input"
                          type="text"
                          placeholder="e.g. 250 ml, 1 Cup, 1 Bottle"
                          value={formData.fixedPortion}
                          onChange={(e) =>
                            setFormData({ ...formData, fixedPortion: e.target.value })
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg bg-[#FAF8F5] border border-[#E8DDCE] text-[#2C1C12] font-medium focus:outline-none focus:ring-1 focus:ring-[#D4621A]"
                        />
                      </div>
                    </div>

                    <p className="text-[11px] text-[#7A6452]">
                      Customers will see <strong className="text-[#D4621A] font-mono tabular-nums">₹{Math.max(0, Number(formData.fixedPrice) || 0)}</strong> directly without any Small / Medium / Large selector.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {/* Small */}
                    <div className="bg-white p-2.5 rounded-xl border border-[#FED7AA]">
                      <span className="font-bold text-[#D4621A] block mb-1">Small Tier</span>
                      <input
                        type="text"
                        placeholder="Portion (e.g. 180g)"
                        value={formData.smallPortion}
                        onChange={(e) => setFormData({ ...formData, smallPortion: e.target.value })}
                        className="w-full px-2 py-1 rounded bg-[#FAF8F5] border border-[#E8DDCE] mb-1.5"
                      />
                      <div className="flex items-center gap-1">
                        <span className="text-[#8C7662]">₹</span>
                        <input
                          type="number"
                          placeholder="Price"
                          value={formData.smallPrice}
                          onChange={(e) => setFormData({ ...formData, smallPrice: Number(e.target.value) })}
                          className="w-full px-2 py-1 rounded bg-[#FAF8F5] border border-[#E8DDCE] font-bold"
                        />
                      </div>
                    </div>

                    {/* Medium */}
                    <div className="bg-white p-2.5 rounded-xl border border-[#FED7AA]">
                      <span className="font-bold text-[#D4621A] block mb-1">Medium Tier</span>
                      <input
                        type="text"
                        placeholder="Portion (e.g. 260g)"
                        value={formData.mediumPortion}
                        onChange={(e) => setFormData({ ...formData, mediumPortion: e.target.value })}
                        className="w-full px-2 py-1 rounded bg-[#FAF8F5] border border-[#E8DDCE] mb-1.5"
                      />
                      <div className="flex items-center gap-1">
                        <span className="text-[#8C7662]">₹</span>
                        <input
                          type="number"
                          placeholder="Price"
                          value={formData.mediumPrice}
                          onChange={(e) => setFormData({ ...formData, mediumPrice: Number(e.target.value) })}
                          className="w-full px-2 py-1 rounded bg-[#FAF8F5] border border-[#E8DDCE] font-bold"
                        />
                      </div>
                    </div>

                    {/* Large */}
                    <div className="bg-white p-2.5 rounded-xl border border-[#FED7AA]">
                      <span className="font-bold text-[#D4621A] block mb-1">Large Tier</span>
                      <input
                        type="text"
                        placeholder="Portion (e.g. 350g)"
                        value={formData.largePortion}
                        onChange={(e) => setFormData({ ...formData, largePortion: e.target.value })}
                        className="w-full px-2 py-1 rounded bg-[#FAF8F5] border border-[#E8DDCE] mb-1.5"
                      />
                      <div className="flex items-center gap-1">
                        <span className="text-[#8C7662]">₹</span>
                        <input
                          type="number"
                          placeholder="Price"
                          value={formData.largePrice}
                          onChange={(e) => setFormData({ ...formData, largePrice: Number(e.target.value) })}
                          className="w-full px-2 py-1 rounded bg-[#FAF8F5] border border-[#E8DDCE] font-bold"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Ingredients & Allergens */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#5C4533] mb-1">
                    Key Ingredients (comma separated)
                  </label>
                  <input
                    type="text"
                    placeholder="Fresh cream, basil, garlic..."
                    value={formData.ingredients}
                    onChange={(e) => setFormData({ ...formData, ingredients: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E0D2C2]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#5C4533] mb-1">
                    Allergens (optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Dairy, Nuts, Gluten..."
                    value={formData.allergens}
                    onChange={(e) => setFormData({ ...formData, allergens: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E0D2C2]"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-[#F0E6D8] flex items-center justify-between gap-2.5">
                {editingItem ? (
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmItem(editingItem)}
                    className="px-3.5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold text-xs transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Dish</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditorOpen(false)}
                    className="px-5 py-2.5 rounded-xl bg-[#FAF6EE] text-[#7A6452] font-semibold hover:bg-[#F0E6D8] cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isSavingItem}
                    className="px-6 py-2.5 rounded-xl bg-[#D4621A] hover:bg-[#B84E0F] disabled:opacity-60 text-white font-semibold shadow-xs active:scale-95 cursor-pointer"
                  >
                    {isSavingItem ? 'Saving...' : editingItem ? 'Save Updates' : 'Add to Menu'}
                  </button>
                </div>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Delete Item Confirmation Modal */}
      {deleteConfirmItem && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-sm bg-white rounded-3xl p-6 text-center shadow-2xl border border-rose-200 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6 stroke-[2]" />
            </div>

            <h4 className="font-serif text-lg font-bold text-[#2C1C12] mb-1">
              Remove &quot;{deleteConfirmItem.name}&quot;?
            </h4>
            <p className="text-xs text-[#8C7662] mb-5 leading-relaxed">
              This will remove this dish from the menu, category listings, and customer view. You can restore default dishes anytime.
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setDeleteConfirmItem(null)}
                className="flex-1 py-2.5 rounded-xl bg-[#FAF6EE] hover:bg-[#F0E6D8] text-[#5C4533] font-semibold text-xs cursor-pointer"
              >
                Keep Dish
              </button>

              <button
                onClick={() => {
                  onDeleteItem(deleteConfirmItem.id);
                  setDeleteConfirmItem(null);
                  setIsEditorOpen(false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-xs cursor-pointer active:scale-95"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Set Current Menu as Default Confirmation Modal */}
      {isSetDefaultConfirmOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="set-default-menu-title"
          className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
        >
          <div
            className="absolute inset-0"
            onClick={() => setIsSetDefaultConfirmOpen(false)}
          />
          <div className="relative w-full max-w-sm bg-white rounded-3xl p-6 text-center shadow-2xl border border-[#E8DDCE] z-10 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-[#FAF6EE] text-[#D4621A] border border-[#E8DDCE] flex items-center justify-center mx-auto mb-3">
              <BookmarkCheck className="w-6 h-6 stroke-[2]" />
            </div>

            <h4
              id="set-default-menu-title"
              className="font-serif text-lg font-bold text-[#2C1C12] mb-1.5"
            >
              Set Current Menu as Default?
            </h4>

            <p className="text-xs text-[#7A6452] leading-relaxed mb-4">
              Saves your current menu snapshot so whenever you click{' '}
              <strong className="text-[#2C1C12]">Reset Dishes</strong>, this exact menu is restored:
            </p>

            <div className="rounded-2xl bg-[#FAF6EE] border border-[#E8DDCE] px-3.5 py-2.5 text-xs text-[#5C4533] mb-5 space-y-1 tabular-nums">
              <div>
                <strong className="text-[#2C1C12]">{items.length}</strong> menu dishes
              </div>
              <div>
                <strong className="text-[#2C1C12]">
                  {categories.filter((c) => !DEFAULT_CATEGORIES.includes(c)).length}
                </strong>{' '}
                custom categories ·{' '}
                <strong className="text-[#2C1C12]">
                  {Object.keys(categoryIcons).length}
                </strong>{' '}
                customized logos
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsSetDefaultConfirmOpen(false)}
                className="flex-1 min-h-[40px] py-2 rounded-xl bg-[#FAF6EE] hover:bg-[#F0E6D8] text-[#5C4533] font-semibold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onSetDefaultMenu?.();
                  setIsSetDefaultConfirmOpen(false);
                  setDefaultMenuNotice(
                    `Saved ${items.length} dishes as your Default Menu.`
                  );
                }}
                className="flex-1 min-h-[40px] py-2 rounded-xl bg-[#D4621A] hover:bg-[#B84E0F] text-white font-semibold text-xs shadow-xs cursor-pointer active:scale-95"
              >
                Save Default Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Two-Step Reset Dishes Confirmation Modal (Saved Default or Factory Starter Menu) */}
      <ResetConfirmModal
        isOpen={isResetConfirmOpen}
        itemLabel="Menu Dishes"
        title={
          resetMode === 'saved' && savedDefaultMenu
            ? 'Restore Your Saved Default Menu?'
            : 'Factory Reset to Starter Menu?'
        }
        step1Description={
          resetMode === 'saved' && savedDefaultMenu
            ? `This will discard recent menu edits and restore your saved Default Menu (${savedDefaultMenu.menuItems.length} dishes, ${savedDefaultMenu.customCategories.length} custom categories, and category logos).`
            : 'This will replace all dishes, custom categories, category logos, and clear any saved Default Menu to restore the original 18 starter items.'
        }
        step2Description={
          resetMode === 'saved' && savedDefaultMenu
            ? 'Are you sure you want to revert live menu changes back to your saved Default Menu?'
            : 'This action cannot be undone. Are you completely sure you want to erase custom edits and factory-reset to the 18 starter dishes?'
        }
        confirmLabel={
          resetMode === 'saved' && savedDefaultMenu
            ? 'Restore Saved Default'
            : 'Factory Reset Menu'
        }
        secondaryAction={
          resetMode === 'saved' && savedDefaultMenu
            ? {
                description: 'Need the original sample menu instead?',
                label: 'Factory Reset to 18 Starter Dishes',
                onSelect: () => setResetMode('factory'),
              }
            : undefined
        }
        onConfirm={() => {
          const modeToRun = savedDefaultMenu && resetMode === 'saved' ? 'saved' : 'factory';
          onRestoreDefaults(modeToRun);
          setSelectedCategory('All');
          setDefaultMenuNotice(
            modeToRun === 'saved'
              ? 'Restored your saved Default Menu.'
              : 'Factory-reset to original 18 starter dishes.'
          );
        }}
        onClose={() => setIsResetConfirmOpen(false)}
      />

      {/* Interactive Image Framing & Confirm Modal for Dish Image */}
      <ImageFramingModal
        isOpen={Boolean(pendingDishImageFile)}
        draftFile={pendingDishImageFile}
        preset="dish"
        onCancel={() => setPendingDishImageFile(null)}
        onConfirm={handleConfirmFramedDishImage}
      />

      {/* Interactive Image Framing & Confirm Modal for Category Logo */}
      <ImageFramingModal
        isOpen={Boolean(pendingCategoryLogoFile)}
        draftFile={pendingCategoryLogoFile}
        preset="logo"
        onCancel={() => setPendingCategoryLogoFile(null)}
        onConfirm={async (result) => {
          setPendingCategoryLogoFile(null);
          setIsUploadingCategoryLogo(true);
          setCategoryLogoError(null);
          try {
            const uploadedUrl = await uploadCompressedMediaToStorage(result.dataUrl, 'logos');
            setCategoryLogoUrlInput(uploadedUrl.startsWith('data:') ? '' : uploadedUrl);
            if (isAddingNewCategory) {
              setNewCategoryIconId(uploadedUrl);
            } else {
              onUpdateCategoryIcon?.(formData.category, uploadedUrl);
            }
          } catch {
            setCategoryLogoError('Failed to upload category logo image.');
          } finally {
            setIsUploadingCategoryLogo(false);
          }
        }}
      />

    </div>
  );
};
