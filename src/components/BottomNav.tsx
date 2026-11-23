import React from 'react';
import { Home, Heart, User } from 'lucide-react';
import { StorefrontTheme } from '../types/index.ts';

export type BottomTab = 'menu' | 'favorites' | 'profile';

interface BottomNavProps {
  activeTab: BottomTab;
  onSelectTab: (tab: BottomTab) => void;
  favoritesCount?: number;
  theme?: StorefrontTheme;
}

export const BottomNav: React.FC<BottomNavProps> = React.memo(({
  activeTab,
  onSelectTab,
  favoritesCount = 0,
  theme = 'classic',
}) => {
  const isNeu = theme === 'warm-amber-neumorphism';

  return (
    <nav
      aria-label="Bottom Navigation"
      className={`md:hidden fixed bottom-0 left-0 right-0 z-40 transition-colors duration-200 ${
        isNeu
          ? 'bg-[#F3E5D0]/98 border-t border-[#E3C8A0]/80 shadow-[0_-4px_14px_rgba(180,124,52,0.12)]'
          : 'bg-[#F8EBDD]/98 border-t border-[#B98660]/20 shadow-[0_-4px_14px_rgba(168,122,86,0.10)]'
      }`}
    >
      <div className="max-w-md mx-auto px-6 h-16 flex items-center justify-around">
        {[
          { id: 'menu' as BottomTab, label: 'Menu', Icon: Home },
          { id: 'favorites' as BottomTab, label: 'Favorites', Icon: Heart, badge: favoritesCount },
          { id: 'profile' as BottomTab, label: 'Café Info', Icon: User },
        ].map(({ id, label, Icon, badge }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelectTab(id)}
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
              className={`relative flex flex-col items-center justify-center min-w-[76px] min-h-[46px] py-1 px-3 rounded-2xl cursor-pointer transition-transform active:scale-92 ${
                isActive
                  ? isNeu
                    ? 'text-[#B45309]'
                    : 'text-[#B94F2E]'
                  : isNeu
                  ? 'text-[#7C5D41] hover:text-[#2A180B]'
                  : 'text-[#7A5C48] hover:text-[#2D1B12]'
              }`}
            >
              <div className={`transition-transform duration-150 ${isActive ? '-translate-y-0.5 scale-105' : ''}`}>
                <Icon
                  className={`w-5 h-5 ${
                    isActive ? 'stroke-[2.3]' : 'stroke-[1.8]'
                  }`}
                />
              </div>
              {typeof badge === 'number' && badge > 0 && (
                <span
                  className={`absolute top-1 right-3.5 min-w-[15px] h-[15px] px-1 rounded-full text-white text-[8.5px] font-bold flex items-center justify-center tabular-nums ${
                    isNeu ? 'bg-[#D97706]' : 'bg-[#B94F2E]'
                  }`}
                >
                  {badge}
                </span>
              )}
              <span className="text-[10.5px] font-semibold mt-0.5 whitespace-nowrap">
                {label}
              </span>
              <div className="h-[3px] w-6 mt-0.5 flex items-center justify-center">
                {isActive && (
                  <span
                    className={`w-full h-full rounded-full ${
                      isNeu
                        ? 'bg-gradient-to-r from-[#F59E0B] to-[#D97706]'
                        : 'bg-[#B94F2E]'
                    }`}
                  />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </nav>
  );
});

