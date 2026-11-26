import React, { useState, useEffect } from 'react';
import {
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  MapPin,
  Phone,
  Wifi,
  Check,
  Palette,
  Store,
  Tag,
} from 'lucide-react';
import { BrandEmblem } from './BrandEmblem.tsx';
import { ImageFramingModal } from './ImageFramingModal.tsx';
import { CafeInfo, StorefrontTheme } from '../types/index.ts';
import { DEFAULT_CAFE_INFO } from '../lib/menuDefaults.ts';
import {
  CompressionResult,
  estimateDataUrlSizeBytes,
  formatBytes,
} from '../lib/imageCompressor.ts';
import { uploadCompressedMediaToStorage } from '../lib/mediaStorage.ts';

interface BrandLogoAdminProps {
  brandLogo: string | null;
  onUpdateBrandLogo: (logoUrl: string | null) => void;
  cafeInfo?: CafeInfo;
  onUpdateCafeInfo?: (nextInfo: CafeInfo) => void;
  storefrontTheme?: StorefrontTheme;
  onUpdateStorefrontTheme?: (theme: StorefrontTheme) => void;
}

export const BrandLogoAdmin: React.FC<BrandLogoAdminProps> = ({
  brandLogo,
  onUpdateBrandLogo,
  cafeInfo = DEFAULT_CAFE_INFO,
  onUpdateCafeInfo,
  storefrontTheme = 'classic',
  onUpdateStorefrontTheme,
}) => {
  const [themeFeedback, setThemeFeedback] = useState<StorefrontTheme | null>(null);
  const [urlInput, setUrlInput] = useState(brandLogo && !brandLogo.startsWith('data:') ? brandLogo : '');
  const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<{
    isCompressing?: boolean;
    originalSize?: string;
    finalSize?: string;
    wasCompressed?: boolean;
    error?: string;
  }>({});

  const normalizeCafeInfo = (info: CafeInfo): Required<CafeInfo> => ({
    cafeName: info.cafeName?.trim() || DEFAULT_CAFE_INFO.cafeName || 'The Burger Craze',
    tagline: info.tagline?.trim() || DEFAULT_CAFE_INFO.tagline || 'Gourmet Burgers & Café',
    openingHours: info.openingHours?.trim() || DEFAULT_CAFE_INFO.openingHours,
    location: info.location?.trim() || DEFAULT_CAFE_INFO.location,
    contactNumber: info.contactNumber?.trim() || DEFAULT_CAFE_INFO.contactNumber,
    wifiPassword: info.wifiPassword?.trim() || DEFAULT_CAFE_INFO.wifiPassword,
  });

  const normalizedCafeInfo = normalizeCafeInfo(cafeInfo);

  // Draft state for Café Identity, Hours, Location, Contact & Guest Wi-Fi Password
  const [draftInfo, setDraftInfo] = useState<Required<CafeInfo>>(() => normalizeCafeInfo(cafeInfo));
  const [infoStatus, setInfoStatus] = useState<'saved' | 'reset' | null>(null);
  const [infoError, setInfoError] = useState<string | null>(null);

  useEffect(() => {
    setDraftInfo(normalizeCafeInfo(cafeInfo));
  }, [cafeInfo]);

  const isInfoDirty =
    draftInfo.cafeName.trim() !== normalizedCafeInfo.cafeName.trim() ||
    draftInfo.tagline.trim() !== normalizedCafeInfo.tagline.trim() ||
    draftInfo.openingHours.trim() !== normalizedCafeInfo.openingHours.trim() ||
    draftInfo.location.trim() !== normalizedCafeInfo.location.trim() ||
    draftInfo.contactNumber.trim() !== normalizedCafeInfo.contactNumber.trim() ||
    draftInfo.wifiPassword.trim() !== normalizedCafeInfo.wifiPassword.trim();

  const isInfoDefault =
    draftInfo.cafeName.trim() === (DEFAULT_CAFE_INFO.cafeName || 'The Burger Craze') &&
    draftInfo.tagline.trim() === (DEFAULT_CAFE_INFO.tagline || 'Gourmet Burgers & Café') &&
    draftInfo.openingHours.trim() === DEFAULT_CAFE_INFO.openingHours &&
    draftInfo.location.trim() === DEFAULT_CAFE_INFO.location &&
    draftInfo.contactNumber.trim() === DEFAULT_CAFE_INFO.contactNumber &&
    draftInfo.wifiPassword.trim() === DEFAULT_CAFE_INFO.wifiPassword;

  const previewCafeName = draftInfo.cafeName.trim() || normalizedCafeInfo.cafeName;
  const previewTagline = draftInfo.tagline.trim() || normalizedCafeInfo.tagline;

  const handleSaveCafeInfo = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned: CafeInfo = {
      cafeName: draftInfo.cafeName.trim(),
      tagline: draftInfo.tagline.trim(),
      openingHours: draftInfo.openingHours.trim(),
      location: draftInfo.location.trim(),
      contactNumber: draftInfo.contactNumber.trim(),
      wifiPassword: draftInfo.wifiPassword.trim(),
    };

    if (
      !cleaned.cafeName ||
      !cleaned.tagline ||
      !cleaned.openingHours ||
      !cleaned.location ||
      !cleaned.contactNumber ||
      !cleaned.wifiPassword
    ) {
      setInfoError(
        'Please fill in café name, tagline, opening hours, location, contact number, and Wi-Fi password.'
      );
      setInfoStatus(null);
      return;
    }

    setInfoError(null);
    onUpdateCafeInfo?.(cleaned);
    setDraftInfo(normalizeCafeInfo(cleaned));
    setInfoStatus('saved');
  };

  const handleResetCafeInfoDefaults = () => {
    setInfoError(null);
    const defaults = normalizeCafeInfo(DEFAULT_CAFE_INFO);
    setDraftInfo(defaults);
    onUpdateCafeInfo?.(defaults);
    setInfoStatus('reset');
  };

  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setUploadState({});
    setPendingLogoFile(file);
  };

  const handleConfirmFramedLogo = async (result: CompressionResult) => {
    setUploadState({ isCompressing: true });
    const uploadedUrl = await uploadCompressedMediaToStorage(result.dataUrl, 'logos');
    onUpdateBrandLogo(uploadedUrl);
    setUrlInput('');
    setUploadState({
      isCompressing: false,
      originalSize: result.formattedOriginalSize,
      finalSize: result.formattedSize,
      wasCompressed: result.wasCompressed,
    });
    setPendingLogoFile(null);
  };

  const handleResetDefault = () => {
    onUpdateBrandLogo(null);
    setUrlInput('');
    setUploadState({});
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 no-scrollbar">
      {/* Section Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#EFE5D6]">
        <div>
          <h3 className="font-serif text-lg font-bold text-[#2C1C12]">
            Brand Identity & Logo
          </h3>
          <p className="text-xs text-[#8C7662] mt-0.5">
            Upload a custom logo and customize identity details for <strong>{previewCafeName}</strong>. Updates the Header, Menu Drawer, QR Posters, and Guest Info immediately.
          </p>
        </div>

        <button
          type="button"
          onClick={handleResetDefault}
          disabled={!brandLogo}
          className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
            brandLogo
              ? 'bg-[#FAF6EE] hover:bg-[#EFE5D6] text-[#5C4533] border-[#E0D2C2] cursor-pointer'
              : 'bg-[#FAF8F5] text-[#B8A898] border-[#EDE5DA] cursor-not-allowed'
          }`}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reset Default Emblem</span>
        </button>
      </div>

      {/* Storefront Theme & Appearance Selector */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#EDE2D2] shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#EFE5D6]">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-serif text-base font-bold text-[#2C1C12]">
                Storefront Theme &amp; Appearance
              </h4>
              <p className="text-[11px] text-[#8C7662] mt-0.5">
                Choose how the customer menu looks across desktop and mobile devices.
              </p>
            </div>
          </div>

          <span className="text-[11px] font-semibold text-[#B94F2E]">
            Active: {storefrontTheme === 'warm-amber-neumorphism' ? 'Warm Amber Neumorphism' : 'Warm Cream & Terracotta'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Option 1: Warm Cream & Terracotta (Default) */}
          <button
            type="button"
            onClick={() => {
              onUpdateStorefrontTheme?.('classic');
              setThemeFeedback('classic');
            }}
            className={`text-left rounded-2xl p-4 border-2 transition-all cursor-pointer flex flex-col gap-3 ${
              storefrontTheme === 'classic'
                ? 'border-[#B94F2E] bg-[#FDF6EE] shadow-sm'
                : 'border-[#EAE0D2] bg-[#FAF8F5] hover:border-[#B94F2E]/40'
            }`}
          >
            {/* Mini Visual Preview */}
            <div className="rounded-xl bg-[#F8EBDD] border border-[#B98660]/25 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-16 h-2.5 rounded bg-[#2D1B12]/80" />
                <span className="px-2 py-0.5 rounded-md bg-[#B94F2E] text-white text-[9px] font-bold">
                  Default
                </span>
              </div>
              <div className="rounded-xl cream-neu-card p-2 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="w-20 h-2 rounded bg-[#2D1B12]/75" />
                  <div className="w-12 h-1.5 rounded bg-[#7A5C48]/55" />
                </div>
                <div className="w-8 h-3 rounded bg-[#B94F2E]/25" />
              </div>
            </div>

            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-bold text-xs sm:text-sm text-[#2C1C12]">
                  Warm Cream &amp; Terracotta
                </div>
                <p className="text-[11px] text-[#8C7662] mt-0.5 leading-snug">
                  Soft cream canvas (#F8EBDD), subtle Neumorphic cards, and terracotta (#B94F2E) accents.
                </p>
              </div>
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                  storefrontTheme === 'classic'
                    ? 'bg-[#B94F2E] text-white'
                    : 'border border-[#D5C7B6] bg-white'
                }`}
              >
                {storefrontTheme === 'classic' && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
            </div>
          </button>

          {/* Option 2: Warm Amber Neumorphism */}
          <button
            type="button"
            onClick={() => {
              onUpdateStorefrontTheme?.('warm-amber-neumorphism');
              setThemeFeedback('warm-amber-neumorphism');
            }}
            className={`text-left rounded-2xl p-4 border-2 transition-all cursor-pointer flex flex-col gap-3 ${
              storefrontTheme === 'warm-amber-neumorphism'
                ? 'border-[#D97706] bg-[#FDF6EB] shadow-sm'
                : 'border-[#EAE0D2] bg-[#FAF8F5] hover:border-[#D97706]/45'
            }`}
          >
            {/* Mini Neumorphic Visual Preview */}
            <div className="rounded-xl bg-[#F3E5D0] border border-[#E5C89E]/70 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-20 h-2.5 rounded bg-[#2A180B]/85" />
                <span className="px-2 py-0.5 rounded-md neu-btn-amber text-white text-[9px] font-bold">
                  Amber
                </span>
              </div>
              <div className="rounded-xl neu-card p-2 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="w-20 h-2 rounded bg-[#2A180B]/75" />
                  <div className="w-14 h-1.5 rounded bg-[#7C5D41]/55" />
                </div>
                <div className="w-8 h-3 rounded-md bg-amber-500/25 border border-amber-500/40" />
              </div>
            </div>

            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-bold text-xs sm:text-sm text-[#2C1C12]">
                  Warm Amber Neumorphism
                </div>
                <p className="text-[11px] text-[#8C7662] mt-0.5 leading-snug">
                  Soft extruded clay shadows, honey-amber surfaces, and warm glow highlights.
                </p>
              </div>
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                  storefrontTheme === 'warm-amber-neumorphism'
                    ? 'bg-[#D97706] text-white'
                    : 'border border-[#D5C7B6] bg-white'
                }`}
              >
                {storefrontTheme === 'warm-amber-neumorphism' && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
            </div>
          </button>
        </div>

        {themeFeedback && (
          <div className="flex items-center gap-2 text-[11px] px-3 py-2 rounded-xl bg-amber-50 text-amber-900 border border-amber-200">
            <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Storefront theme updated to{' '}
              <strong>
                {themeFeedback === 'warm-amber-neumorphism'
                  ? 'Warm Amber Neumorphism'
                  : 'Warm Cream & Terracotta'}
              </strong>
              . Open customer menu tabs update automatically.
            </span>
          </div>
        )}
      </div>

      {/* Live Preview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {/* Light Header Preview */}
        <div
          className={`rounded-2xl p-4 space-y-2.5 transition-all ${
            storefrontTheme === 'warm-amber-neumorphism'
              ? 'neu-surface'
              : 'bg-[#F8EBDD] border border-[#B98660]/25 cream-neu-surface'
          }`}
        >
          <span className="text-[10.5px] font-semibold text-[#8C7662] block">
            Header &amp; Storefront Surface Preview
          </span>
          <div className="flex items-center gap-2.5 min-w-0">
            <BrandEmblem logoUrl={brandLogo} brandName={previewCafeName} size="sm" />
            <div className="flex flex-col text-left min-w-0">
              <span className="font-serif text-lg font-bold tracking-[0.03em] text-[#2D2015] leading-tight truncate">
                {previewCafeName}
              </span>
              <span
                className={`text-[9.5px] uppercase tracking-[0.18em] font-medium leading-none mt-1 truncate ${
                  storefrontTheme === 'warm-amber-neumorphism' ? 'text-[#B45309]' : 'text-[#B94F2E]'
                }`}
              >
                {previewTagline}
              </span>
            </div>
          </div>
        </div>

        {/* Dark Drawer / Guest Info Card Preview */}
        <div className="rounded-2xl bg-gradient-to-br from-[#2D1B11] via-[#3B2519] to-[#482F20] border border-[#543928] p-4 space-y-2.5 text-white">
          <span className="text-[10.5px] font-semibold text-[#D8C7B6] block">
            Menu Drawer &amp; Guest Card Preview
          </span>
          <div className="flex items-center gap-3 min-w-0">
            <BrandEmblem logoUrl={brandLogo} brandName={previewCafeName} size="md" />
            <div className="min-w-0">
              <span className="text-[10px] uppercase tracking-[0.22em] font-serif font-bold text-[#FDBA74] block truncate">
                {previewCafeName}
              </span>
              <span className="font-serif text-base font-bold text-[#FFF8F0] leading-tight block truncate">
                {previewTagline}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Logo Upload Card */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#EDE2D2] shadow-2xs space-y-3">
        <div className="flex items-center justify-between gap-2">
          <label className="font-bold text-xs sm:text-sm text-[#2C1C12]">
            Upload Brand Logo (Max 200 KB)
          </label>
          <span className="text-[11px] font-mono text-[#8C7662] tabular-nums">
            {!brandLogo
              ? 'Default Vector Emblem'
              : brandLogo.startsWith('data:')
              ? formatBytes(estimateDataUrlSizeBytes(brandLogo))
              : 'Web Asset URL'}
          </span>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap gap-2.5 items-center">
          <label className="px-4 py-2.5 rounded-xl bg-[#D4621A] hover:bg-[#B84E0F] text-white font-semibold text-xs flex items-center gap-2 cursor-pointer shrink-0 transition-colors shadow-2xs active:scale-95">
            <Upload className="w-4 h-4" />
            <span>{uploadState.isCompressing ? 'Compressing...' : 'Upload Logo'}</span>
            <input
              type="file"
              accept="image/*"
              disabled={uploadState.isCompressing}
              onChange={handleLogoFileUpload}
              className="hidden"
            />
          </label>

          <input
            type="url"
            placeholder="Or paste direct logo URL (https://...)"
            value={urlInput}
            onChange={(e) => {
              const val = e.target.value;
              setUrlInput(val);
              setUploadState({});
              if (val.trim()) {
                onUpdateBrandLogo(val.trim());
              } else if (brandLogo && !brandLogo.startsWith('data:')) {
                onUpdateBrandLogo(null);
              }
            }}
            className="flex-1 min-w-[200px] px-3 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E0D2C2] text-xs text-[#2C1C12] focus:outline-none focus:ring-1 focus:ring-[#D4621A]"
          />

          <BrandEmblem logoUrl={brandLogo} size="md" />
        </div>

        {/* Aspect Ratio & Pixel Dimensions Guidance */}
        <p className="text-[11px] text-[#8C7662] leading-snug tabular-nums">
          Recommended aspect ratio: <strong className="font-semibold text-[#5C4533]">1:1 square</strong> (400 × 400 px) · Auto-compressed &le; 200 KB
        </p>

        {/* Auto-Compression Size Confirmation */}
        {uploadState.finalSize && (
          <div className="flex items-center gap-2 text-[11px] px-3 py-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Logo ready: <strong>{uploadState.finalSize}</strong> (Strictly &le; 200 KB)
              {uploadState.wasCompressed && (
                <span className="text-[#6B5746]"> · Auto-compressed from {uploadState.originalSize}</span>
              )}
            </span>
          </div>
        )}

        {uploadState.error && (
          <div className="flex items-center gap-2 text-[11px] text-rose-700 bg-rose-50 px-3 py-2 rounded-xl border border-rose-200">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{uploadState.error}</span>
          </div>
        )}
      </div>

      {/* Café Opening Hours, Location, Contact & Guest Wi-Fi Editor */}
      <form
        onSubmit={handleSaveCafeInfo}
        className="bg-white rounded-2xl p-4 sm:p-5 border border-[#EDE2D2] shadow-2xs space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#EFE5D6]">
          <div>
            <h4 className="font-serif text-base font-bold text-[#2C1C12]">
              Café Name, Hours, Location, Contact &amp; Wi-Fi
            </h4>
            <p className="text-[11px] text-[#8C7662] mt-0.5">
              Updates displayed across the Header, Menu Drawer, Guest Info page, QR posters, and page title.
            </p>
          </div>

          {isInfoDirty && (
            <span className="text-[11px] font-semibold text-[#C95C18]">
              Unsaved changes
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
          {/* Café Name */}
          <div>
            <label
              htmlFor="cafe-brand-name"
              className="flex items-center gap-1.5 font-bold text-[#5C4533] mb-1.5"
            >
              <Store className="w-3.5 h-3.5 text-[#D4621A]" />
              <span>Café Name *</span>
            </label>
            <input
              id="cafe-brand-name"
              type="text"
              required
              placeholder="e.g. The Burger Craze"
              value={draftInfo.cafeName}
              onChange={(e) => {
                setDraftInfo((prev) => ({ ...prev, cafeName: e.target.value }));
                setInfoStatus(null);
                setInfoError(null);
              }}
              className="w-full px-3 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E0D2C2] text-[#2C1C12] font-semibold focus:outline-none focus:ring-1 focus:ring-[#D4621A]"
            />
          </div>

          {/* Café Tagline */}
          <div>
            <label
              htmlFor="cafe-brand-tagline"
              className="flex items-center gap-1.5 font-bold text-[#5C4533] mb-1.5"
            >
              <Tag className="w-3.5 h-3.5 text-[#D4621A]" />
              <span>Tagline / Subtitle *</span>
            </label>
            <input
              id="cafe-brand-tagline"
              type="text"
              required
              placeholder="e.g. Gourmet Burgers & Café"
              value={draftInfo.tagline}
              onChange={(e) => {
                setDraftInfo((prev) => ({ ...prev, tagline: e.target.value }));
                setInfoStatus(null);
                setInfoError(null);
              }}
              className="w-full px-3 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E0D2C2] text-[#2C1C12] font-medium focus:outline-none focus:ring-1 focus:ring-[#D4621A]"
            />
          </div>
          {/* Opening Hours */}
          <div>
            <label
              htmlFor="cafe-opening-hours"
              className="flex items-center gap-1.5 font-bold text-[#5C4533] mb-1.5"
            >
              <Clock className="w-3.5 h-3.5 text-[#D4621A]" />
              <span>Opening Hours *</span>
            </label>
            <input
              id="cafe-opening-hours"
              type="text"
              required
              placeholder="e.g. Open Daily: 10:00 AM – 11:00 PM"
              value={draftInfo.openingHours}
              onChange={(e) => {
                setDraftInfo((prev) => ({ ...prev, openingHours: e.target.value }));
                setInfoStatus(null);
                setInfoError(null);
              }}
              className="w-full px-3 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E0D2C2] text-[#2C1C12] font-medium focus:outline-none focus:ring-1 focus:ring-[#D4621A]"
            />
          </div>

          {/* Contact Number */}
          <div>
            <label
              htmlFor="cafe-contact-number"
              className="flex items-center gap-1.5 font-bold text-[#5C4533] mb-1.5"
            >
              <Phone className="w-3.5 h-3.5 text-[#D4621A]" />
              <span>Contact Number *</span>
            </label>
            <input
              id="cafe-contact-number"
              type="tel"
              required
              placeholder="e.g. +91 98765 43210"
              value={draftInfo.contactNumber}
              onChange={(e) => {
                setDraftInfo((prev) => ({ ...prev, contactNumber: e.target.value }));
                setInfoStatus(null);
                setInfoError(null);
              }}
              className="w-full px-3 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E0D2C2] text-[#2C1C12] font-medium focus:outline-none focus:ring-1 focus:ring-[#D4621A]"
            />
          </div>

          {/* Location Address */}
          <div>
            <label
              htmlFor="cafe-location"
              className="flex items-center gap-1.5 font-bold text-[#5C4533] mb-1.5"
            >
              <MapPin className="w-3.5 h-3.5 text-[#D4621A]" />
              <span>Café Location *</span>
            </label>
            <input
              id="cafe-location"
              type="text"
              required
              placeholder="e.g. Plot 42, Green Park Avenue, Main Market"
              value={draftInfo.location}
              onChange={(e) => {
                setDraftInfo((prev) => ({ ...prev, location: e.target.value }));
                setInfoStatus(null);
                setInfoError(null);
              }}
              className="w-full px-3 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E0D2C2] text-[#2C1C12] font-medium focus:outline-none focus:ring-1 focus:ring-[#D4621A]"
            />
          </div>

          {/* Guest Wi-Fi Password */}
          <div>
            <label
              htmlFor="cafe-wifi-password"
              className="flex items-center gap-1.5 font-bold text-[#5C4533] mb-1.5"
            >
              <Wifi className="w-3.5 h-3.5 text-[#D4621A]" />
              <span>Guest Wi-Fi Password *</span>
            </label>
            <input
              id="cafe-wifi-password"
              type="text"
              required
              placeholder="e.g. burgercraze"
              value={draftInfo.wifiPassword}
              onChange={(e) => {
                setDraftInfo((prev) => ({ ...prev, wifiPassword: e.target.value }));
                setInfoStatus(null);
                setInfoError(null);
              }}
              className="w-full px-3 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E0D2C2] text-[#2C1C12] font-mono font-medium focus:outline-none focus:ring-1 focus:ring-[#D4621A]"
            />
          </div>
        </div>

        {infoError && (
          <div className="flex items-center gap-2 text-[11px] text-rose-700 bg-rose-50 px-3 py-2 rounded-xl border border-rose-200">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{infoError}</span>
          </div>
        )}

        {infoStatus && (
          <div className="flex items-center gap-2 text-[11px] px-3 py-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              {infoStatus === 'saved'
                ? 'Café name, tagline, hours, location, contact number, and Wi-Fi password saved.'
                : 'Restored default café name, tagline, hours, location, contact number, and Wi-Fi password.'}
            </span>
          </div>
        )}

        <div className="pt-3 border-t border-[#F0E6D8] flex flex-wrap items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={handleResetCafeInfoDefaults}
            disabled={isInfoDefault && !isInfoDirty}
            className={`min-h-[40px] px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              isInfoDefault && !isInfoDirty
                ? 'bg-[#FAF8F5] text-[#B8A898] border-[#EDE5DA] cursor-not-allowed'
                : 'bg-[#FAF6EE] hover:bg-[#EFE5D6] text-[#5C4533] border-[#E0D2C2] cursor-pointer'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset to Defaults</span>
          </button>

          <button
            type="submit"
            disabled={!isInfoDirty}
            className={`min-h-[40px] px-5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all whitespace-nowrap ${
              isInfoDirty
                ? 'bg-[#D4621A] hover:bg-[#B84E0F] text-white active:scale-95 cursor-pointer'
                : 'bg-[#E8DDCE] text-[#9A8776] cursor-not-allowed shadow-none'
            }`}
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>Save Changes</span>
          </button>
        </div>
      </form>

      {/* Interactive Image Framing & Confirm Modal */}
      <ImageFramingModal
        isOpen={Boolean(pendingLogoFile)}
        draftFile={pendingLogoFile}
        preset="logo"
        onCancel={() => setPendingLogoFile(null)}
        onConfirm={handleConfirmFramedLogo}
      />
    </div>
  );
};
