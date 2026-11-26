import React from 'react';
import { AnimatePresence, m } from 'motion/react';
import { X, MapPin, Phone, Clock, ChevronRight } from 'lucide-react';
import { Category, CafeInfo, StorefrontTheme } from '../types/index.ts';
import { DEFAULT_CATEGORIES, DEFAULT_CAFE_INFO } from '../lib/menuDefaults.ts';
import { BrandEmblem } from './BrandEmblem.tsx';

interface HamburgerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCategory: (category: Category) => void;
  categories?: string[];
  brandLogo?: string | null;
  cafeInfo?: CafeInfo;
  theme?: StorefrontTheme;
}

export const HamburgerDrawer: React.FC<HamburgerDrawerProps> = ({
  isOpen,
  onClose,
  onSelectCategory,
  categories = DEFAULT_CATEGORIES,
  brandLogo,
  cafeInfo = DEFAULT_CAFE_INFO,
  theme = 'classic',
}) => {
  const isNeu = theme === 'warm-amber-neumorphism';
  const cafeName = cafeInfo.cafeName?.trim() || DEFAULT_CAFE_INFO.cafeName || 'The Burger Craze';
  const tagline = cafeInfo.tagline?.trim() || DEFAULT_CAFE_INFO.tagline || 'Gourmet Burgers & Café';
  const sanitizedPhone = cafeInfo.contactNumber.replace(/[^\d+]/g, '');

  return (
    <AnimatePresence>
      {isOpen && (
        <m.div
          key="hamburger-drawer-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="drawer-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex justify-start bg-black/55 backdrop-blur-xs"
        >
          <div className="absolute inset-0" onClick={onClose} />

          <m.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 350, damping: 32, mass: 0.9 }}
            className={`relative w-full max-w-xs h-full shadow-2xl flex flex-col z-10 overflow-y-auto no-scrollbar ${
              isNeu
                ? 'bg-[#F3E5D0] border-r border-[#E3C8A0]'
                : 'bg-[#F8EBDD] border-r border-[#B98660]/25'
            }`}
          >
        
            {/* Brand Header */}
            <div className="p-6 bg-gradient-to-br from-[#2D1B12] via-[#3B2519] to-[#4A2E20] text-[#FFFDF9]">
              <div className="flex items-center justify-between mb-4">
                <BrandEmblem logoUrl={brandLogo} brandName={cafeName} size="sm" />
                <button
                  onClick={onClose}
                  aria-label="Close menu drawer"
                  className="w-10 h-10 rounded-2xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <h2 id="drawer-title" className="font-serif text-xl font-bold tracking-wide leading-tight break-words">
                {cafeName}
              </h2>
              <span className="text-[9.5px] uppercase tracking-[0.2em] text-[#E69A73] block mt-1">
                {tagline}
              </span>
              <p className="text-xs text-[#DFCFC0] mt-2.5 leading-relaxed">
                Good food, cozy vibes, and authentic culinary passion every day.
              </p>
            </div>

            {/* Menu Categories */}
            <div className="p-4 space-y-2 flex-1">
              <div
                className={`px-2 py-1 text-[10.5px] font-bold uppercase tracking-wider ${
                  isNeu ? 'text-[#7C5D41]' : 'text-[#7A5C48]'
                }`}
              >
                Menu Categories
              </div>

              {[
                { label: 'All Dishes', id: 'All' as Category },
                ...categories.map((cat) => ({ label: cat, id: cat as Category })),
              ].map((cat, idx) => (
                <m.button
                  key={cat.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(idx * 0.025, 0.16), duration: 0.18 }}
                  whileHover={{ x: 3 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    onSelectCategory(cat.id);
                    onClose();
                  }}
                  className={`w-full min-h-[44px] flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-colors text-left cursor-pointer ${
                    isNeu
                      ? 'neu-card text-[#2A180B] hover:text-[#B45309]'
                      : 'cream-neu-card text-[#2D1B12] hover:text-[#B94F2E]'
                  }`}
                >
                  <span>{cat.label}</span>
                  <ChevronRight
                    className={`w-4 h-4 ${
                      isNeu ? 'text-[#B45309]' : 'text-[#B94F2E]'
                    }`}
                  />
                </m.button>
              ))}
            </div>

            {/* Bottom Contact */}
            <div
              className={`mt-auto p-4 text-xs space-y-2.5 ${
                isNeu
                  ? 'border-t border-[#E3C8A0] bg-[#EAD8BC] text-[#5E4229]'
                  : 'border-t border-[#B98660]/20 bg-[#EFE0CE] text-[#5E4232]'
              }`}
            >
              <div className="flex items-start gap-2">
                <Clock className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${isNeu ? 'text-[#B45309]' : 'text-[#B94F2E]'}`} />
                <span>{cafeInfo.openingHours}</span>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${isNeu ? 'text-[#B45309]' : 'text-[#B94F2E]'}`} />
                <span>{cafeInfo.location}</span>
              </div>
              <div className="flex items-start gap-2">
                <Phone className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${isNeu ? 'text-[#B45309]' : 'text-[#B94F2E]'}`} />
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

          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
};
