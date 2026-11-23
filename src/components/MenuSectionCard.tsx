import React from 'react';
import { m } from 'motion/react';
import { ChevronRight, ArrowRight, Heart } from 'lucide-react';
import { FoodItem, Category, StorefrontTheme } from '../types/index.ts';
import { formatPrice, getItemDisplayPrice, isFixedPriceItem } from '../utils/cart.ts';
import { ProgressiveImage } from './ProgressiveImage.tsx';

interface MenuSectionCardProps {
  category: Category;
  title: string;
  subtitle: string;
  iconSvg: React.ReactNode;
  items: FoodItem[];
  onViewAll: (category: Category) => void;
  onSelectItem: (item: FoodItem) => void;
  getAvailability?: (item: FoodItem) => boolean;
  favoriteIds?: string[];
  onToggleFavorite?: (item: FoodItem) => void;
  actionLabel?: string;
  theme?: StorefrontTheme;
  sectionIndex?: number;
  isLiteMode?: boolean;
}

export const MenuSectionCard: React.FC<MenuSectionCardProps> = React.memo(({
  category,
  title,
  subtitle,
  iconSvg,
  items,
  onViewAll,
  onSelectItem,
  getAvailability,
  favoriteIds = [],
  onToggleFavorite,
  actionLabel = 'View All',
  theme = 'classic',
  sectionIndex = 0,
  isLiteMode = false,
}) => {
  const isNeu = theme === 'warm-amber-neumorphism';
  const isFirstSection = sectionIndex === 0;

  const sectionBody = (
    <>
      {/* Section Header */}
      <div className="flex items-center justify-between gap-2.5 sm:gap-3 pb-3">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          {/* Circular Category Icon Emblem */}
          <div
            className={`w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-full overflow-hidden flex items-center justify-center text-white shrink-0 transition-transform duration-150 ${
              isNeu ? 'neu-btn-amber' : 'cream-neu-primary'
            }`}
          >
            {iconSvg}
          </div>

          <div className="min-w-0">
            <h2
              className={`font-serif text-lg md:text-xl font-bold leading-tight truncate ${
                isNeu ? 'text-[#2A180B]' : 'text-[#2D1B12]'
              }`}
            >
              {title}
            </h2>
            <p
              className={`text-xs md:text-[13px] font-medium leading-snug mt-0.5 truncate ${
                isNeu ? 'text-[#7C5D41]' : 'text-[#7A5C48]'
              }`}
            >
              {subtitle}
            </p>
          </div>
        </div>

        {/* View All / Back Action */}
        <button
          type="button"
          onClick={() => onViewAll(category)}
          className={`group text-xs sm:text-[13px] font-semibold flex items-center gap-1 select-none cursor-pointer px-2 sm:px-2.5 py-2 rounded-xl transition-colors active:scale-95 whitespace-nowrap shrink-0 min-h-[44px] ${
            isNeu
              ? 'text-[#B45309] hover:text-[#92400E] hover:bg-[#B45309]/8'
              : 'text-[#B94F2E] hover:text-[#9B3D20] hover:bg-[#B94F2E]/8'
          }`}
        >
          <span>{actionLabel}</span>
          <ArrowRight className="w-3.5 h-3.5 stroke-[2.2] transition-transform duration-150 group-hover:translate-x-0.5" />
        </button>
      </div>

      {/* Horizontal Dish Rows List */}
      <div
        className={`divide-y ${
          isNeu ? 'divide-[#E6CEAC]/75' : 'divide-[#B98660]/16'
        }`}
      >
        {items.map((item, idx) => {
          const isAvailable = getAvailability ? getAvailability(item) : (item.isAvailable ?? true);
          const isFavorite = favoriteIds.includes(item.id);
          const isFixed = isFixedPriceItem(item);
          const displayPrice = getItemDisplayPrice(item);

          const rowClassName = `py-3 sm:py-3.5 px-1.5 sm:px-2 -mx-1.5 sm:-mx-2 rounded-2xl flex items-center gap-2.5 sm:gap-4 cursor-pointer group transition-colors focus-visible:outline-none focus-visible:ring-2 ${
            isNeu
              ? `focus-visible:ring-[#D97706]/50 ${
                  !isAvailable ? 'opacity-70' : 'hover:bg-[#FFFBF4]/65 active:bg-[#F3E5D0]/70'
                }`
              : `focus-visible:ring-[#B94F2E]/45 ${
                  !isAvailable ? 'opacity-70' : 'hover:bg-[#FFFDF9]/75 active:bg-[#EFE0CE]/55'
                }`
          }`;

          const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelectItem(item);
            }
          };

          const rowInner = (
            <>
              {/* Left Rounded Landscape Food Photograph */}
              <div
                className={`relative w-[72px] h-[54px] sm:w-28 sm:h-[72px] rounded-xl overflow-hidden shrink-0 ${
                  isNeu ? 'bg-[#EEDEC5]' : 'bg-[#EFE0CE]'
                }`}
              >
                <ProgressiveImage
                  src={item.image}
                  alt={item.name}
                  eager={isFirstSection && idx < 2}
                  fetchPriority={isFirstSection && idx < 2 ? 'high' : 'low'}
                  theme={theme}
                  className={`w-full h-full object-cover object-center ${
                    isLiteMode ? '' : 'transition-transform duration-300'
                  } ${isAvailable && !isLiteMode ? 'group-hover:scale-105' : !isAvailable ? 'grayscale-40' : ''}`}
                />

                {!isAvailable && (
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-[#2D1B12]/25 pointer-events-none"
                  />
                )}
              </div>

              {/* Center Dish Title (Wraps up to 2 lines on phone) & One-Line Description */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start sm:items-center gap-1.5 sm:gap-2 min-w-0">
                  <span
                    aria-label={item.isVeg ? 'Vegetarian' : 'Non-vegetarian'}
                    title={item.isVeg ? 'Veg' : 'Non-Veg'}
                    className={`mt-[4px] sm:mt-0 w-3.5 h-3.5 rounded-[3px] border-[1.5px] bg-white flex items-center justify-center shrink-0 ${
                      item.isVeg ? 'border-emerald-700' : 'border-amber-800'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        item.isVeg ? 'bg-emerald-600' : 'bg-amber-800'
                      }`}
                    />
                  </span>

                  <h3
                    className={`font-serif text-[14.5px] sm:text-base font-bold leading-snug line-clamp-2 sm:line-clamp-1 break-words transition-colors ${
                      isNeu
                        ? 'text-[#2A180B] group-hover:text-[#B45309]'
                        : 'text-[#2D1B12] group-hover:text-[#B94F2E]'
                    }`}
                  >
                    {item.name}
                  </h3>
                </div>

                <p
                  className={`text-[11.5px] sm:text-[13px] line-clamp-1 leading-relaxed mt-0.5 ${
                    isNeu ? 'text-[#7A5B3E]' : 'text-[#7A5C48]'
                  }`}
                >
                  {item.description}
                </p>
              </div>

              {/* Right Price, Availability Status, Favorite & Chevron */}
              <div className="flex items-center gap-0.5 sm:gap-2 shrink-0">
                <div className="text-right">
                  <div>
                    {!isFixed && (
                      <span
                        className={`block sm:inline text-[9.5px] sm:text-[11px] font-medium leading-none sm:mr-1 ${
                          isNeu ? 'text-[#7C5D41]' : 'text-[#7A5C48]'
                        }`}
                      >
                        From
                      </span>
                    )}
                    <span
                      className={`font-bold text-[13.5px] sm:text-base font-mono tabular-nums ${
                        !isAvailable
                          ? isNeu
                            ? 'text-[#7C5D41]'
                            : 'text-[#7A5C48]'
                          : isNeu
                          ? 'text-[#B45309]'
                          : 'text-[#B94F2E]'
                      }`}
                    >
                      {formatPrice(displayPrice)}
                    </span>
                  </div>

                  <div className="mt-0.5 flex items-center justify-end gap-1">
                    <span
                      aria-hidden="true"
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        isAvailable ? 'bg-emerald-600' : 'bg-rose-600'
                      }`}
                    />
                    <span
                      className={`text-[10px] sm:text-[11px] leading-none whitespace-nowrap ${
                        isAvailable
                          ? 'font-semibold text-emerald-800'
                          : 'font-bold text-rose-700'
                      }`}
                    >
                      {isAvailable ? 'Available' : 'Sold Out'}
                    </span>
                  </div>
                </div>

                {onToggleFavorite && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(item);
                    }}
                    aria-label={
                      isFavorite
                        ? `Remove ${item.name} from favorites`
                        : `Save ${item.name} to favorites`
                    }
                    className={`w-10 h-10 sm:w-11 sm:h-11 -mr-1 sm:mr-0 rounded-full flex items-center justify-center transition-colors active:scale-90 cursor-pointer shrink-0 ${
                      isFavorite
                        ? isNeu
                          ? 'text-[#D97706] bg-[#D97706]/10'
                          : 'text-[#B94F2E] bg-[#B94F2E]/10'
                        : isNeu
                        ? 'text-[#9A744E]/75 hover:text-[#B45309] hover:bg-[#EAD7BA]/60'
                        : 'text-[#A67B5B]/75 hover:text-[#B94F2E] hover:bg-[#EFE0CE]/70'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
                  </button>
                )}

                <ChevronRight
                  className={`w-4 h-4 shrink-0 transition-transform duration-150 group-hover:translate-x-0.5 ${
                    isNeu
                      ? 'text-[#9A744E] group-hover:text-[#B45309]'
                      : 'text-[#A67B5B] group-hover:text-[#B94F2E]'
                  }`}
                />
              </div>
            </>
          );

          if (isLiteMode) {
            return (
              <article
                key={item.id}
                role="button"
                tabIndex={0}
                aria-label={`${item.name}, ${formatPrice(displayPrice)}, ${isAvailable ? 'Available' : 'Sold Out'}`}
                onClick={() => onSelectItem(item)}
                onKeyDown={handleKeyDown}
                className={rowClassName}
              >
                {rowInner}
              </article>
            );
          }

          return (
            <m.article
              key={item.id}
              role="button"
              tabIndex={0}
              aria-label={`${item.name}, ${formatPrice(displayPrice)}, ${isAvailable ? 'Available' : 'Sold Out'}`}
              initial={{ opacity: 0, y: 10 }}
              animate={isFirstSection ? { opacity: 1, y: 0 } : undefined}
              whileInView={!isFirstSection ? { opacity: 1, y: 0 } : undefined}
              viewport={{ once: true, amount: 0.05 }}
              transition={{
                type: 'spring',
                stiffness: 380,
                damping: 28,
                mass: 0.72,
                delay: Math.min(idx * 0.02, 0.12),
              }}
              whileTap={{ scale: 0.992 }}
              onClick={() => onSelectItem(item)}
              onKeyDown={handleKeyDown}
              className={rowClassName}
            >
              {rowInner}
            </m.article>
          );
        })}
      </div>
    </>
  );

  const sectionClassName = `menu-section-perf rounded-3xl p-3.5 sm:p-5 md:p-6 transition-colors duration-300 ${
    isNeu ? 'neu-surface' : 'cream-neu-surface'
  }`;

  if (isLiteMode) {
    return <section className={sectionClassName}>{sectionBody}</section>;
  }

  return (
    <m.section
      initial={{ opacity: 0, y: 14 }}
      animate={isFirstSection ? { opacity: 1, y: 0 } : undefined}
      whileInView={!isFirstSection ? { opacity: 1, y: 0 } : undefined}
      viewport={{ once: true, amount: 0.06 }}
      transition={{
        type: 'spring',
        stiffness: 310,
        damping: 26,
        mass: 0.85,
      }}
      className={sectionClassName}
    >
      {sectionBody}
    </m.section>
  );
});


