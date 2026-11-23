import React from 'react';
import { AnimatePresence, m } from 'motion/react';
import { Heart, Star, BookOpen, ChevronRight } from 'lucide-react';
import { FoodItem, StorefrontTheme } from '../types/index.ts';
import { formatPrice, getItemDisplayPrice, isFixedPriceItem } from '../utils/cart.ts';
import { ProgressiveImage } from './ProgressiveImage.tsx';

interface FavoritesViewProps {
  favoriteItems: FoodItem[];
  onRemoveFavorite: (item: FoodItem) => void;
  onExploreMenu: () => void;
  onSelectItem: (item: FoodItem) => void;
  getAvailability?: (item: FoodItem) => boolean;
  cafeName?: string;
  theme?: StorefrontTheme;
}

export const FavoritesView: React.FC<FavoritesViewProps> = React.memo(({
  favoriteItems,
  onRemoveFavorite,
  onExploreMenu,
  onSelectItem,
  getAvailability,
  cafeName = 'The Burger Craze',
  theme = 'classic',
}) => {
  const isNeu = theme === 'warm-amber-neumorphism';

  return (
    <m.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5"
    >
      
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1
            className={`font-serif text-2xl sm:text-3xl font-bold tracking-tight ${
              isNeu ? 'text-[#2A180B]' : 'text-[#2D1B12]'
            }`}
          >
            Your Favourites
          </h1>
          <p className={`text-xs sm:text-sm mt-0.5 ${isNeu ? 'text-[#7C5D41]' : 'text-[#7A5C48]'}`}>
            Dishes you love and recommend at {cafeName}
          </p>
        </div>

        {favoriteItems.length > 0 && (
          <span
            className={`text-xs font-semibold tabular-nums ${
              isNeu ? 'text-[#7C5D41]' : 'text-[#7A5C48]'
            }`}
          >
            {favoriteItems.length} saved {favoriteItems.length === 1 ? 'dish' : 'dishes'}
          </span>
        )}
      </div>

      {favoriteItems.length === 0 ? (
        <div
          className={`rounded-3xl p-8 md:p-12 text-center flex flex-col items-center justify-center ${
            isNeu ? 'neu-surface' : 'cream-neu-surface'
          }`}
        >
          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${
              isNeu ? 'neu-inset text-[#B45309]' : 'cream-neu-inset text-[#B94F2E]'
            }`}
          >
            <Heart className="w-8 h-8 stroke-[1.8]" />
          </div>
          <h2
            className={`font-serif text-lg sm:text-xl font-bold mb-1.5 ${
              isNeu ? 'text-[#2A180B]' : 'text-[#2D1B12]'
            }`}
          >
            No favourites saved yet
          </h2>
          <p
            className={`text-xs sm:text-sm max-w-md mb-6 leading-relaxed ${
              isNeu ? 'text-[#7C5D41]' : 'text-[#7A5C48]'
            }`}
          >
            Tap the heart on any starter, soup, pizza, burger, or main course while browsing the menu to save it here.
          </p>
          <m.button
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.96 }}
            onClick={onExploreMenu}
            className={`px-6 py-3 rounded-2xl text-white font-semibold text-xs sm:text-sm cursor-pointer flex items-center gap-2 min-h-[44px] ${
              isNeu ? 'neu-btn-amber' : 'cream-neu-primary'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Explore Menu</span>
          </m.button>
        </div>
      ) : (
        <div
          className={`rounded-3xl p-4 sm:p-5 md:p-6 ${
            isNeu ? 'neu-surface' : 'cream-neu-surface'
          }`}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            <AnimatePresence mode="popLayout">
              {favoriteItems.map((item, idx) => {
                const isAvailable = getAvailability ? getAvailability(item) : (item.isAvailable ?? true);
                const isFixed = isFixedPriceItem(item);
                const displayPrice = getItemDisplayPrice(item);

                return (
                  <m.article
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 12, scale: 0.97 }}
                    animate={{ opacity: isAvailable ? 1 : 0.72, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.18 } }}
                    transition={{
                      type: 'spring',
                      stiffness: 380,
                      damping: 28,
                      mass: 0.72,
                      delay: Math.min(idx * 0.025, 0.16),
                    }}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.985 }}
                    onClick={() => onSelectItem(item)}
                    className={`rounded-2xl overflow-hidden flex flex-col cursor-pointer group ${
                      isNeu ? 'neu-card' : 'cream-neu-card'
                    }`}
                  >
                    <div
                      className={`relative aspect-[4/3] w-full overflow-hidden ${
                        isNeu ? 'bg-[#EEDEC5]' : 'bg-[#EFE0CE]'
                      }`}
                    >
                      <ProgressiveImage
                        src={item.image}
                        alt={item.name}
                        theme={theme}
                        className={`w-full h-full object-cover object-center transition-transform duration-300 ${
                          isAvailable ? 'group-hover:scale-105' : 'grayscale-40'
                        }`}
                      />

                      {!isAvailable && (
                        <div
                          aria-hidden="true"
                          className="absolute inset-0 bg-[#2D1B12]/25 pointer-events-none"
                        />
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveFavorite(item);
                        }}
                        aria-label={`Remove ${item.name} from favorites`}
                        className={`absolute top-2.5 right-2.5 w-10 h-10 rounded-full flex items-center justify-center active:scale-90 cursor-pointer transition-colors shadow-sm ${
                          isNeu
                            ? 'bg-[#D97706] text-white'
                            : 'bg-[#B94F2E] text-white hover:bg-[#9B3D20]'
                        }`}
                      >
                        <Heart className="w-4 h-4 fill-current" />
                      </button>
                    </div>

                    <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <div
                          className={`flex items-center gap-1.5 text-[11px] font-medium mb-1.5 ${
                            isNeu ? 'text-[#7C5D41]' : 'text-[#7A5C48]'
                          }`}
                        >
                          <span className={`font-semibold ${isNeu ? 'text-[#B45309]' : 'text-[#B94F2E]'}`}>
                            {item.category}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="inline-flex items-center gap-0.5 tabular-nums font-semibold text-[#2D1B12]">
                            <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                            {item.rating.toFixed(1)}
                          </span>
                        </div>

                        <h3
                          className={`font-serif text-base font-bold line-clamp-2 sm:line-clamp-1 break-words ${
                            isNeu
                              ? 'text-[#2A180B] group-hover:text-[#B45309]'
                              : 'text-[#2D1B12] group-hover:text-[#B94F2E]'
                          }`}
                        >
                          {item.name}
                        </h3>

                        <p
                          className={`text-xs line-clamp-2 mt-1 leading-relaxed ${
                            isNeu ? 'text-[#7C5D41]' : 'text-[#7A5C48]'
                          }`}
                        >
                          {item.description}
                        </p>
                      </div>

                      <div
                        className={`pt-3 mt-3 border-t flex items-center justify-between gap-2 ${
                          isNeu ? 'border-[#E6CEAC]/65' : 'border-[#B98660]/15'
                        }`}
                      >
                        <div className="flex items-baseline gap-1">
                          {!isFixed && (
                            <span className={`text-[10.5px] ${isNeu ? 'text-[#7C5D41]' : 'text-[#7A5C48]'}`}>
                              From
                            </span>
                          )}
                          <span
                            className={`font-bold text-base font-mono tabular-nums ${
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

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="inline-flex items-center gap-1">
                            <span
                              aria-hidden="true"
                              className={`w-1.5 h-1.5 rounded-full ${
                                isAvailable ? 'bg-emerald-600' : 'bg-rose-600'
                              }`}
                            />
                            <span
                              className={`text-[11px] leading-none ${
                                isAvailable
                                  ? 'font-semibold text-emerald-800'
                                  : 'font-bold text-rose-700'
                              }`}
                            >
                              {isAvailable ? 'Available' : 'Sold Out'}
                            </span>
                          </span>

                          <ChevronRight
                            className={`w-4 h-4 transition-transform group-hover:translate-x-0.5 ${
                              isNeu ? 'text-[#9A744E]' : 'text-[#A67B5B] group-hover:text-[#B94F2E]'
                            }`}
                          />
                        </div>
                      </div>
                    </div>
                  </m.article>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      )}

    </m.div>
  );
});
