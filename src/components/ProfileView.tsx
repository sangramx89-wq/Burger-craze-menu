import React from 'react';
import { m } from 'motion/react';
import { Clock, MapPin, Phone, Check, Wifi, ShieldCheck } from 'lucide-react';
import { BrandEmblem } from './BrandEmblem.tsx';
import { CafeInfo, StorefrontTheme } from '../types/index.ts';
import { DEFAULT_CAFE_INFO } from '../catalog/menuData.ts';

interface ProfileViewProps {
  pureVegFilter: boolean;
  onTogglePureVegFilter: () => void;
  brandLogo?: string | null;
  cafeInfo?: CafeInfo;
  theme?: StorefrontTheme;
  onOpenAdminPanel?: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  pureVegFilter,
  onTogglePureVegFilter,
  brandLogo,
  cafeInfo = DEFAULT_CAFE_INFO,
  theme = 'classic',
  onOpenAdminPanel,
}) => {
  const isNeu = theme === 'warm-amber-neumorphism';
  const cafeName = cafeInfo.cafeName?.trim() || DEFAULT_CAFE_INFO.cafeName || 'The Burger Craze';
  const tagline = cafeInfo.tagline?.trim() || DEFAULT_CAFE_INFO.tagline || 'Gourmet Burgers & Café';
  const sanitizedPhone = cafeInfo.contactNumber.replace(/[^\d+]/g, '');

  return (
    <m.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5"
    >
      
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1
            className={`font-serif text-2xl sm:text-3xl font-bold tracking-tight ${
              isNeu ? 'text-[#2A180B]' : 'text-[#2D1B12]'
            }`}
          >
            Café &amp; Guest Info
          </h1>
          <p className={`text-xs sm:text-sm mt-0.5 ${isNeu ? 'text-[#7C5D41]' : 'text-[#7A5C48]'}`}>
            Experience {cafeName} hospitality
          </p>
        </div>

        {onOpenAdminPanel && (
          <button
            type="button"
            onClick={onOpenAdminPanel}
            aria-label="Open Admin Panel"
            className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-all active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 ${
              isNeu
                ? 'neu-pill-btn text-[#4A2B11] focus-visible:outline-[#B45309]'
                : 'cream-neu-pill text-[#2D1B12] focus-visible:outline-[#B94F2E]'
            }`}
          >
            <ShieldCheck
              className={`w-4 h-4 shrink-0 ${
                isNeu ? 'text-[#B45309]' : 'text-[#B94F2E]'
              }`}
            />
            <span>Admin</span>
          </button>
        )}
      </div>

      {/* Warm Espresso Brand Hospitality Card */}
      <div
        className={`relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#2D1B12] via-[#3B2519] to-[#4A2E20] text-[#FFFDF9] p-5 sm:p-7 ${
          isNeu
            ? 'border border-amber-500/30 shadow-[0_12px_28px_rgba(146,64,14,0.22)]'
            : 'border border-[#5A3A28] shadow-[0_12px_28px_rgba(45,27,18,0.18)]'
        }`}
      >
        <div className="flex items-center gap-3.5 mb-4">
          <BrandEmblem logoUrl={brandLogo} brandName={cafeName} size="md" />
          <div className="min-w-0">
            <span className="text-[10px] uppercase tracking-[0.22em] font-serif font-bold text-[#F3B08E] block truncate">
              {cafeName}
            </span>
            <h2 className="font-serif text-lg sm:text-xl font-bold text-[#FFF9F2] leading-tight">
              {tagline}
            </h2>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-[#DFCFC0] leading-relaxed mb-4 max-w-2xl">
          Fresh ingredients, flame-grilled burgers, and hand-crafted comfort in a warm, welcoming ambience.
        </p>

        <div className="pt-3.5 border-t border-white/12 flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm">
          <div className="flex items-center gap-2 text-[#F3B08E]">
            <Wifi className="w-4 h-4 shrink-0" />
            <span>Complimentary Guest Wi-Fi</span>
          </div>
          <span className="font-mono text-xs text-[#F5E8DA]">
            Password: {cafeInfo.wifiPassword}
          </span>
        </div>
      </div>

      {/* Responsive Grid for Dietary Preference and Timings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        {/* Dietary Toggle */}
        <div
          className={`rounded-3xl p-5 space-y-4 flex flex-col justify-between ${
            isNeu ? 'neu-surface' : 'cream-neu-surface'
          }`}
        >
          <div>
            <h3
              className={`font-serif text-base font-bold ${
                isNeu ? 'text-[#2A180B]' : 'text-[#2D1B12]'
              }`}
            >
              Menu Dietary Preference
            </h3>
            <p className={`text-xs mt-1 ${isNeu ? 'text-[#7C5D41]' : 'text-[#7A5C48]'}`}>
              Highlight purely vegetarian offerings across the menu
            </p>
          </div>

          <button
            onClick={onTogglePureVegFilter}
            className={`w-full min-h-[48px] flex items-center justify-between p-3.5 rounded-2xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              pureVegFilter
                ? 'bg-[#EBF6EC] border border-emerald-600/60 text-emerald-950 shadow-xs'
                : isNeu
                ? 'neu-card text-[#4A2B11]'
                : 'cream-neu-card text-[#2D1B12]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span
                aria-hidden="true"
                className="w-4 h-4 rounded-[4px] border-[1.5px] border-emerald-700 bg-white flex items-center justify-center shrink-0"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
              </span>
              <span>Show Pure Vegetarian Dishes Only</span>
            </div>
            <div
              className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors shrink-0 ${
                pureVegFilter
                  ? 'bg-emerald-600 border-emerald-600 text-white'
                  : 'border-[#C7B099] bg-white'
              }`}
            >
              {pureVegFilter && <Check className="w-3.5 h-3.5 stroke-[3]" />}
            </div>
          </button>
        </div>

        {/* Café Details & Timings */}
        <div
          className={`rounded-3xl p-5 space-y-3.5 text-xs sm:text-sm ${
            isNeu ? 'neu-surface text-[#5E4229]' : 'cream-neu-surface text-[#5E4232]'
          }`}
        >
          <h3
            className={`font-serif text-base font-bold ${
              isNeu ? 'text-[#2A180B]' : 'text-[#2D1B12]'
            }`}
          >
            Restaurant Timings &amp; Location
          </h3>

          <div className="space-y-3 pt-1">
            <div className="flex items-start gap-2.5">
              <Clock className={`w-4 h-4 shrink-0 mt-0.5 ${isNeu ? 'text-[#B45309]' : 'text-[#B94F2E]'}`} />
              <span>{cafeInfo.openingHours}</span>
            </div>
            <div className="flex items-start gap-2.5">
              <MapPin className={`w-4 h-4 shrink-0 mt-0.5 ${isNeu ? 'text-[#B45309]' : 'text-[#B94F2E]'}`} />
              <span>{cafeInfo.location}</span>
            </div>
            <div className="flex items-start gap-2.5">
              <Phone className={`w-4 h-4 shrink-0 mt-0.5 ${isNeu ? 'text-[#B45309]' : 'text-[#B94F2E]'}`} />
              {sanitizedPhone ? (
                <a
                  href={`tel:${sanitizedPhone}`}
                  className={`font-semibold hover:underline tabular-nums ${
                    isNeu ? 'text-[#B45309]' : 'text-[#B94F2E]'
                  }`}
                >
                  {cafeInfo.contactNumber}
                </a>
              ) : (
                <span className="tabular-nums">{cafeInfo.contactNumber}</span>
              )}
            </div>
          </div>
        </div>
      </div>

    </m.div>
  );
};
