import React, { useMemo, useRef, useState } from 'react';
import {
  Search,
  Upload,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Link2,
  X,
  Image as ImageIcon,
} from 'lucide-react';
import { DEFAULT_CATEGORIES } from '../data/menuData.ts';
import {
  CATEGORY_ICON_OPTIONS,
  getCategoryIconLabel,
  isCategoryImageUrl,
  renderCategoryLogo,
  sanitizeCategoryImageUrlInput,
} from '../data/categoryIcons.tsx';
import { CompressionResult } from '../lib/imageCompressor.ts';
import { uploadCompressedMediaToStorage } from '../lib/mediaStorage.ts';
import { ImageFramingModal } from './ImageFramingModal.tsx';

interface CategoryLogosAdminProps {
  categories: string[];
  categoryIcons: Record<string, string>;
  onUpdateCategoryIcon: (category: string, iconId: string) => void;
  onResetCategoryIcon: (category: string) => void;
}

export const CategoryLogosAdmin: React.FC<CategoryLogosAdminProps> = ({
  categories,
  categoryIcons,
  onUpdateCategoryIcon,
  onResetCategoryIcon,
}) => {
  const allEditableCategories = useMemo(() => ['All', ...categories], [categories]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [groupFilter, setGroupFilter] = useState<'all' | 'indian' | 'global'>('all');
  const [iconSearch, setIconSearch] = useState('');
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [uploadTargetCategory, setUploadTargetCategory] = useState<string | null>(null);
  const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const editorPanelRef = useRef<HTMLDivElement | null>(null);

  const activeCategory = allEditableCategories.includes(selectedCategory)
    ? selectedCategory
    : 'All';

  const activeOverride = categoryIcons[activeCategory];
  const activeDisplayName = activeCategory === 'All' ? 'All Dishes' : activeCategory;
  const isBuiltInCategory =
    activeCategory === 'All' || DEFAULT_CATEGORIES.includes(activeCategory);

  const indianCount = useMemo(
    () => CATEGORY_ICON_OPTIONS.filter((opt) => opt.group === 'indian').length,
    []
  );
  const globalCount = useMemo(
    () => CATEGORY_ICON_OPTIONS.filter((opt) => opt.group === 'global').length,
    []
  );

  const filteredIcons = useMemo(() => {
    const q = iconSearch.trim().toLowerCase();
    return CATEGORY_ICON_OPTIONS.filter((opt) => {
      if (groupFilter !== 'all' && opt.group !== groupFilter) return false;
      if (!q) return true;
      return (
        opt.label.toLowerCase().includes(q) ||
        (opt.shortLabel && opt.shortLabel.toLowerCase().includes(q)) ||
        opt.id.toLowerCase().includes(q)
      );
    });
  }, [groupFilter, iconSearch]);

  const handleSelectCategoryToEdit = (cat: string) => {
    setSelectedCategory(cat);
    const current = categoryIcons[cat];
    setCustomUrlInput(isCategoryImageUrl(current) ? current : '');
    setErrorMessage(null);
    setStatusMessage(null);
  };

  const handleTriggerFileUpload = (targetCategory: string) => {
    setUploadTargetCategory(targetCategory);
    setSelectedCategory(targetCategory);
    setErrorMessage(null);
    setStatusMessage(null);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setPendingLogoFile(file);
  };

  const handleConfirmFramedImage = async (result: CompressionResult) => {
    const targetCat = uploadTargetCategory || activeCategory;
    setPendingLogoFile(null);
    setIsUploadingImage(true);
    setErrorMessage(null);
    try {
      const uploadedUrl = await uploadCompressedMediaToStorage(result.dataUrl, 'logos');
      onUpdateCategoryIcon(targetCat, uploadedUrl);
      setCustomUrlInput(uploadedUrl.startsWith('data:') ? '' : uploadedUrl);
      const label = targetCat === 'All' ? 'All Dishes' : targetCat;
      setStatusMessage(`Custom logo image saved for ${label}.`);
    } catch {
      setErrorMessage('Could not upload category image. Please try again.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleApplyUrl = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);
    const safeUrl = sanitizeCategoryImageUrlInput(customUrlInput);
    if (!safeUrl) {
      setErrorMessage(
        'Enter a valid HTTPS/HTTP image URL or relative path starting with /.'
      );
      return;
    }
    onUpdateCategoryIcon(activeCategory, safeUrl);
    setStatusMessage(`Custom image URL applied to ${activeDisplayName}.`);
  };

  const handleSelectIcon = (iconId: string, iconLabel: string) => {
    setErrorMessage(null);
    onUpdateCategoryIcon(activeCategory, iconId);
    setCustomUrlInput('');
    setStatusMessage(`${activeDisplayName} updated to "${iconLabel}".`);
  };

  const handleResetCategory = (cat: string) => {
    setErrorMessage(null);
    onResetCategoryIcon(cat);
    if (cat === activeCategory) {
      setCustomUrlInput('');
    }
    const label = cat === 'All' ? 'All Dishes' : cat;
    setStatusMessage(`${label} restored to default logo.`);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Section Intro */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#EFE5D6]">
        <div>
          <h2 className="font-serif text-lg sm:text-xl font-bold text-[#2C1C12]">
            Category Logos
          </h2>
          <p className="text-xs text-[#7A6452] mt-0.5">
            Customize icons or upload square images for &quot;All Dishes&quot;, built-in categories, and custom categories across the menu bar and section headers.
          </p>
        </div>
        <span className="text-xs font-medium text-[#7A6452] tabular-nums">
          {allEditableCategories.length} categories
        </span>
      </div>

      {/* Category Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {allEditableCategories.map((cat) => {
          const override = categoryIcons[cat];
          const isSelected = activeCategory === cat;
          const isBuiltIn = cat === 'All' || DEFAULT_CATEGORIES.includes(cat);
          const displayTitle = cat === 'All' ? 'All Dishes' : cat;
          const currentLabel = getCategoryIconLabel(override, cat);
          const hasCustomOverride = Boolean(override);

          return (
            <div
              key={cat}
              className={`rounded-2xl p-3.5 border transition-all flex flex-col gap-3 ${
                isSelected
                  ? 'bg-[#FFFDF9] border-[#D4621A] shadow-sm ring-1 ring-[#D4621A]/25'
                  : 'bg-white border-[#EDE2D2] hover:border-[#D7C4AE]'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-[#FAF6EE] border border-[#E8DDCE] flex items-center justify-center shrink-0 overflow-hidden">
                  {renderCategoryLogo(cat, {
                    color: '#B94F2E',
                    sizeClass: 'w-6 h-6',
                    imageClassName: 'w-10 h-10 rounded-xl object-cover',
                    strokeWidth: 1.85,
                    customIconId: override,
                  })}
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-sm text-[#2C1C12] truncate">
                    {displayTitle}
                  </h3>
                  <div className="flex items-center gap-1.5 text-[11px] text-[#7A6452] truncate mt-0.5">
                    <span>{isBuiltIn ? 'Built-in' : 'Custom'}</span>
                    <span aria-hidden="true">·</span>
                    <span className={hasCustomOverride ? 'text-[#B94F2E] font-medium truncate' : 'truncate'}>
                      {currentLabel}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1 border-t border-[#F4ECE1]">
                <button
                  type="button"
                  onClick={() => {
                    handleSelectCategoryToEdit(cat);
                    editorPanelRef.current?.scrollIntoView({
                      behavior: 'smooth',
                      block: 'nearest',
                    });
                  }}
                  className={`flex-1 min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    isSelected
                      ? 'bg-[#D4621A] text-white'
                      : 'bg-[#FAF6EE] hover:bg-[#EFE5D6] text-[#2C1C12] border border-[#E8DDCE]'
                  }`}
                >
                  {isSelected ? 'Editing' : 'Choose Logo'}
                </button>

                <button
                  type="button"
                  onClick={() => handleTriggerFileUpload(cat)}
                  title={`Upload custom logo image for ${displayTitle}`}
                  className="min-h-[40px] px-3 py-1.5 rounded-xl bg-white hover:bg-[#FAF6EE] text-[#5C4533] border border-[#E0D2C2] text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <Upload className="w-3.5 h-3.5 text-[#D4621A]" />
                  <span>Upload</span>
                </button>

                {hasCustomOverride && (
                  <button
                    type="button"
                    onClick={() => handleResetCategory(cat)}
                    title={`Reset ${displayTitle} to default logo`}
                    aria-label={`Reset ${displayTitle} to default logo`}
                    className="min-h-[40px] min-w-[40px] px-2.5 py-1.5 rounded-xl bg-[#FAF6EE] hover:bg-rose-50 text-[#7A6452] hover:text-rose-700 border border-[#E8DDCE] hover:border-rose-200 flex items-center justify-center cursor-pointer transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Category Editor Panel */}
      <div
        ref={editorPanelRef}
        className="rounded-3xl bg-[#FAF6EE] border border-[#E8DDCE] p-4 sm:p-5 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-[#E8DDCE]">
          <div className="flex items-center gap-3 min-w-0">
            {/* Dual Storefront Tile Preview (Resting + Active) */}
            <div className="flex items-center gap-2 shrink-0">
              <div
                title="Resting tile preview"
                className="w-11 h-11 rounded-2xl bg-[#F8EBDD] border border-[#E4D2BE] shadow-xs flex items-center justify-center overflow-hidden"
              >
                {renderCategoryLogo(activeCategory, {
                  color: '#8A573B',
                  sizeClass: 'w-5 h-5',
                  imageClassName: 'w-9 h-9 rounded-xl object-cover',
                  strokeWidth: 1.85,
                  customIconId: activeOverride,
                })}
              </div>
              <div
                title="Active tile preview"
                className="w-11 h-11 rounded-2xl bg-[#B94F2E] shadow-xs flex items-center justify-center overflow-hidden"
              >
                {renderCategoryLogo(activeCategory, {
                  color: '#FFFFFF',
                  sizeClass: 'w-5 h-5',
                  imageClassName: 'w-9 h-9 rounded-xl object-cover',
                  strokeWidth: 1.85,
                  customIconId: activeOverride,
                })}
              </div>
            </div>

            <div className="min-w-0">
              <h3 className="font-serif text-base sm:text-lg font-bold text-[#2C1C12] truncate">
                Editing Logo: {activeDisplayName}
              </h3>
              <p className="text-xs text-[#7A6452]">
                Current: <strong className="text-[#2C1C12]">{getCategoryIconLabel(activeOverride, activeCategory)}</strong>
                {isBuiltInCategory ? ' · Built-in category' : ' · Custom category'}
              </p>
            </div>
          </div>

          {activeOverride && (
            <button
              type="button"
              onClick={() => handleResetCategory(activeCategory)}
              className="min-h-[40px] px-3.5 py-2 rounded-xl bg-white hover:bg-[#EFE5D6] text-[#5C4533] border border-[#E0D2C2] text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to Default</span>
            </button>
          )}
        </div>

        {/* Status / Error Banners */}
        {statusMessage && (
          <div className="flex items-center gap-2 text-xs px-3.5 py-2.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="flex items-center gap-2 text-xs px-3.5 py-2.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 font-medium">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Custom Image Upload & Image URL Controls */}
        <div className="rounded-2xl bg-white border border-[#E8DDCE] p-3.5 sm:p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-[#D4621A]" />
              <div>
                <h4 className="text-xs font-bold text-[#2C1C12]">
                  Custom Category Image
                </h4>
                <p className="text-[11px] text-[#7A6452]">
                  Upload a 1:1 square icon/photo (auto-compressed &le; 200 KB) or apply an image URL.
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={isUploadingImage}
              onClick={() => handleTriggerFileUpload(activeCategory)}
              className="min-h-[40px] px-4 py-2 rounded-xl bg-[#D4621A] hover:bg-[#B84E0F] disabled:opacity-60 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shadow-2xs"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{isUploadingImage ? 'Uploading...' : 'Upload Square Image'}</span>
            </button>
          </div>

          <form onSubmit={handleApplyUrl} className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Link2 className="w-3.5 h-3.5 text-[#8C7662] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="https://example.com/category-icon.png"
                value={customUrlInput}
                onChange={(e) => {
                  setCustomUrlInput(e.target.value);
                  setErrorMessage(null);
                }}
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E0D2C2] text-xs text-[#2C1C12] focus:outline-none focus:ring-1 focus:ring-[#D4621A]"
              />
            </div>
            <button
              type="submit"
              className="min-h-[40px] px-4 py-2 rounded-xl bg-[#FAF6EE] hover:bg-[#EFE5D6] text-[#2C1C12] border border-[#E0D2C2] text-xs font-semibold cursor-pointer whitespace-nowrap"
            >
              Apply URL
            </button>
          </form>
        </div>

        {/* Built-In 56 Culinary SVG Icon Library */}
        <div className="rounded-2xl bg-white border border-[#E8DDCE] p-3.5 sm:p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="w-3.5 h-3.5 text-[#8C7662] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search 56 culinary icons..."
                value={iconSearch}
                onChange={(e) => setIconSearch(e.target.value)}
                className="w-full pl-8 pr-8 py-2 rounded-xl bg-[#FAF8F5] border border-[#E0D2C2] text-xs text-[#2C1C12] focus:outline-none focus:ring-1 focus:ring-[#D4621A]"
              />
              {iconSearch && (
                <button
                  type="button"
                  onClick={() => setIconSearch('')}
                  aria-label="Clear icon search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8C7662] hover:text-[#2C1C12] cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div
              role="tablist"
              aria-label="Filter culinary category icons"
              className="inline-flex items-center p-0.5 rounded-xl bg-[#FAF6EE] border border-[#E0D2C2] gap-0.5"
            >
              {[
                { id: 'all' as const, label: `All (${CATEGORY_ICON_OPTIONS.length})` },
                { id: 'indian' as const, label: `Indian (${indianCount})` },
                { id: 'global' as const, label: `Global (${globalCount})` },
              ].map((tab) => {
                const isTabActive = groupFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={isTabActive}
                    onClick={() => setGroupFilter(tab.id)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
                      isTabActive
                        ? 'bg-[#D4621A] text-white shadow-2xs'
                        : 'text-[#7A6452] hover:text-[#2C1C12]'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {filteredIcons.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#7A6452]">
              No culinary icons match &quot;{iconSearch}&quot;.
            </div>
          ) : (
            <div
              role="radiogroup"
              aria-label={`Culinary icons for ${activeDisplayName}`}
              className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 max-h-72 overflow-y-auto p-0.5 no-scrollbar"
            >
              {filteredIcons.map((option) => {
                const isSelected = activeOverride === option.id;
                const IconComponent = option.Icon;

                return (
                  <button
                    key={option.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    aria-label={option.label}
                    title={option.label}
                    onClick={() => handleSelectIcon(option.id, option.label)}
                    className={`min-h-[52px] rounded-xl flex flex-col items-center justify-center gap-1 p-1.5 border transition-all cursor-pointer active:scale-95 ${
                      isSelected
                        ? 'bg-[#D4621A] text-white border-[#D4621A] shadow-xs'
                        : 'bg-[#FAF8F5] text-[#8C6C50] border-[#E0D2C2] hover:bg-[#F3EADB] hover:text-[#2C1C12]'
                    }`}
                  >
                    <IconComponent
                      className="w-5 h-5 shrink-0"
                      strokeWidth={1.8}
                      color={isSelected ? '#FFFFFF' : '#8C6C50'}
                    />
                    <span
                      className={`text-[9px] leading-tight font-medium truncate w-full text-center ${
                        isSelected ? 'text-white' : 'text-[#7A6452]'
                      }`}
                    >
                      {option.shortLabel || option.label.split(' ')[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 1:1 Square Logo Image Framing Modal */}
      <ImageFramingModal
        isOpen={Boolean(pendingLogoFile)}
        draftFile={pendingLogoFile}
        preset="logo"
        onCancel={() => setPendingLogoFile(null)}
        onConfirm={handleConfirmFramedImage}
      />
    </div>
  );
};
