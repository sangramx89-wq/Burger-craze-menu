import React from 'react';
import { Category, StorefrontTheme } from '../types/index.ts';
import { DEFAULT_CATEGORIES } from '../catalog/menuData.ts';
import { renderCategoryLogo } from '../catalog/categoryIcons.tsx';

interface CategoryNavProps {
  activeCategory: Category;
  onSelectCategory: (category: Category) => void;
  categories?: string[];
  categoryIcons?: Record<string, string>;
  theme?: StorefrontTheme;
}

export const CategoryNav: React.FC<CategoryNavProps> = React.memo(({
  activeCategory,
  onSelectCategory,
  categories = DEFAULT_CATEGORIES,
  categoryIcons = {},
  theme = 'classic',
}) => {
  const navItems: Category[] = ['All', ...categories];
  const isNeu = theme === 'warm-amber-neumorphism';

  return (
    <div className="px-3.5 sm:px-6 lg:px-8 py-1.5 md:py-2.5 w-full max-w-6xl mx-auto">
      <div
        role="tablist"
        aria-label="Menu Categories"
        className={`flex items-start ${
          navItems.length > 6 ? 'justify-start sm:justify-center gap-3' : 'justify-between md:justify-center gap-2'
        } md:gap-6 lg:gap-8 py-2 px-1 overflow-x-auto no-scrollbar`}
      >
        {navItems.map((categoryId) => {
          const isActive = activeCategory === categoryId;

          return (
            <button
              key={categoryId}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onSelectCategory(categoryId)}
              className={`flex flex-col items-center gap-2 min-w-[58px] transition-transform duration-150 md:hover:-translate-y-0.5 active:scale-95 ${
                navItems.length > 6 ? 'shrink-0' : 'flex-1 md:flex-none'
              } cursor-pointer group`}
            >
              {/* Sculpted Neumorphic Squircle Card */}
              <div
                className={`w-[52px] h-[50px] md:w-[58px] md:h-[56px] rounded-2xl flex items-center justify-center transition-colors duration-200 ${
                  isNeu
                    ? isActive
                      ? 'neu-btn-amber'
                      : 'neu-card'
                    : isActive
                    ? 'cream-neu-primary'
                    : 'cream-neu-card'
                }`}
              >
                <div
                  className={`flex items-center justify-center transition-transform duration-150 md:group-hover:scale-108 ${
                    isActive ? 'scale-105' : 'scale-100'
                  }`}
                >
                  {renderCategoryLogo(categoryId, {
                    color: isActive ? '#FFFFFF' : isNeu ? '#8A5A2B' : '#8A573B',
                    sizeClass: 'w-6 h-6',
                    imageClassName: 'w-9 h-9 md:w-10 md:h-10 rounded-xl object-cover',
                    strokeWidth: 1.85,
                    customIconId: categoryIcons[categoryId],
                  })}
                </div>
              </div>

              {/* Single-Line Category Label */}
              <span
                className={`text-[10.5px] md:text-xs font-semibold tracking-tight transition-colors text-center whitespace-nowrap truncate max-w-[74px] md:max-w-none ${
                  isActive
                    ? isNeu
                      ? 'text-[#B45309]'
                      : 'text-[#B94F2E]'
                    : isNeu
                    ? 'text-[#735133] group-hover:text-[#2A180B]'
                    : 'text-[#7A5C48] group-hover:text-[#2D1B12]'
                }`}
              >
                {categoryId}
              </span>

              {/* Active Sliding Terracotta Underline Indicator */}
              <div className="h-[3px] w-6 md:w-7 flex items-center justify-center">
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
    </div>
  );
});

