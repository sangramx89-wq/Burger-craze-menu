import React from 'react';
import { AnimatePresence, m } from 'motion/react';
import { Menu, Search, Heart, Home, User } from 'lucide-react';
import { BottomTab } from './BottomNav.tsx';
import { BrandEmblem } from './BrandEmblem.tsx';
import { StorefrontTheme } from '../types/index.ts';

interface HeaderProps {
  onOpenMenu: () => void;
  onOpenSearch: () => void;
  savedItemCount?: number;
  onOpenSaved?: () => void;
  activeTab?: BottomTab;
  onSelectTab?: (tab: BottomTab) => void;
  brandLogo?: string | null;
  cafeName?: string;
  tagline?: string;
  theme?: StorefrontTheme;
}

export const Header: React.FC<HeaderProps> = React.memo(({
  onOpenMenu,
  onOpenSearch,
  savedItemCount = 0,
  onOpenSaved,
  activeTab = 'menu',
  onSelectTab,
  brandLogo,
  cafeName = 'The Burger Craze',
  tagline = 'Gourmet Burgers & Café',
  theme = 'classic',
}) => {
  const isNeu = theme === 'warm-amber-neumorphism';

  return (
    <header
      className={`sticky top-0 z-40 md:backdrop-blur-md transition-colors duration-300 ${
        isNeu
          ? 'bg-[#F3E5D0]/96 md:bg-[#F3E5D0]/92 border-b border-[#E3C8A0]/70 shadow-[0_6px_18px_rgba(180,124,52,0.12)]'
          : 'bg-[#F8EBDD]/96 md:bg-[#F8EBDD]/92 border-b border-[#B98660]/18 shadow-[0_6px_18px_rgba(168,122,86,0.10)]'
      }`}
    >
      <div className="max-w-6xl mx-auto px-3.5 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-2.5 sm:gap-6">
        {/* Left: Drawer Toggle + Brand Lockup */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={onOpenMenu}
            aria-label="Open menu options"
            className={`w-11 h-11 rounded-2xl flex items-center justify-center cursor-pointer shrink-0 transition-transform active:scale-95 ${
              isNeu
                ? 'neu-pill-btn text-[#4A2B11] hover:text-[#B45309]'
                : 'cream-neu-pill text-[#2D1B12] hover:text-[#B94F2E]'
            }`}
          >
            <Menu className="w-5 h-5 stroke-[1.9]" />
          </button>

          <button
            type="button"
            onClick={() => onSelectTab && onSelectTab('menu')}
            className="flex items-center gap-2 sm:gap-2.5 select-none cursor-pointer text-left min-w-0 active:scale-[0.98] transition-transform"
          >
            <BrandEmblem logoUrl={brandLogo} brandName={cafeName} size="sm" />

            <div className="flex flex-col min-w-0">
              <span
                className={`font-serif text-[15px] sm:text-lg font-bold tracking-[0.03em] leading-tight truncate ${
                  isNeu ? 'text-[#2A180B]' : 'text-[#2D1B12]'
                }`}
              >
                {cafeName}
              </span>
              <span
                className={`text-[10px] font-medium tracking-[0.14em] uppercase leading-none mt-0.5 truncate ${
                  isNeu ? 'text-[#B45309]' : 'text-[#B94F2E]'
                }`}
              >
                {tagline}
              </span>
            </div>
          </button>
        </div>

        {/* Center: Desktop Navigation Tabs (visible on md: and up) */}
        {onSelectTab && (
          <nav
            aria-label="Desktop Navigation"
            className={`hidden md:flex items-center gap-1 p-1.5 rounded-2xl ${
              isNeu ? 'neu-inset' : 'cream-neu-inset'
            }`}
          >
            {[
              { id: 'menu' as BottomTab, label: 'Menu', Icon: Home },
              { id: 'favorites' as BottomTab, label: 'Favorites', Icon: Heart, badge: savedItemCount },
              { id: 'profile' as BottomTab, label: 'Café Info', Icon: User },
            ].map(({ id, label, Icon, badge }) => {
              const isActive = activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onSelectTab(id)}
                  className={`relative px-4 py-2 rounded-xl font-semibold text-xs lg:text-sm transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'text-white'
                      : isNeu
                      ? 'text-[#6D4D30] hover:text-[#2A180B]'
                      : 'text-[#6C4F3D] hover:text-[#2D1B12]'
                  }`}
                >
                  {isActive && (
                    <span
                      className={`absolute inset-0 rounded-xl ${
                        isNeu ? 'neu-btn-amber' : 'cream-neu-primary'
                      }`}
                    />
                  )}
                  <Icon className="w-4 h-4 stroke-[2] relative z-10" />
                  <span className="relative z-10">{label}</span>
                  <AnimatePresence mode="popLayout">
                    {typeof badge === 'number' && badge > 0 && (
                      <m.span
                        key={badge}
                        initial={{ scale: 0.6, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.6, opacity: 0 }}
                        transition={{ duration: 0.16 }}
                        className={`relative z-10 ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold tabular-nums leading-none ${
                          isActive
                            ? isNeu
                              ? 'bg-white text-[#B45309]'
                              : 'bg-[#FDF6EE] text-[#B94F2E]'
                            : isNeu
                            ? 'bg-[#D97706] text-white'
                            : 'bg-[#B94F2E] text-white'
                        }`}
                      >
                        {badge}
                      </m.span>
                    )}
                  </AnimatePresence>
                </button>
              );
            })}
          </nav>
        )}

        {/* Right: Search & Favorites Quick Access */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenSearch}
            aria-label="Search menu items"
            className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-transform active:scale-95 cursor-pointer ${
              isNeu
                ? 'neu-pill-btn text-[#4A2B11] hover:text-[#B45309]'
                : 'cream-neu-pill text-[#2D1B12] hover:text-[#B94F2E]'
            }`}
          >
            <Search className="w-5 h-5 stroke-[2]" />
          </button>

          <button
            type="button"
            onClick={onOpenSaved}
            aria-label="View selected favorites"
            className={`relative w-11 h-11 rounded-2xl flex items-center justify-center transition-transform active:scale-95 cursor-pointer ${
              isNeu
                ? 'neu-pill-btn text-[#4A2B11] hover:text-[#B45309]'
                : 'cream-neu-pill text-[#2D1B12] hover:text-[#B94F2E]'
            }`}
          >
            <Heart
              className={`w-5 h-5 stroke-[2] ${
                savedItemCount > 0 && !isNeu ? 'text-[#B94F2E]' : ''
              }`}
            />
            {savedItemCount > 0 && (
              <span
                className={`absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full text-white text-[9.5px] font-bold flex items-center justify-center shadow-xs tabular-nums ${
                  isNeu ? 'bg-[#D97706]' : 'bg-[#B94F2E]'
                }`}
              >
                {savedItemCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
});

