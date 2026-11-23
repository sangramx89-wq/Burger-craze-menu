import React, { useState, useMemo } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { Search, X, ChevronRight } from 'lucide-react';
import { FoodItem, StorefrontTheme } from '../types/index.ts';
import { formatPrice, getItemDisplayPrice, isFixedPriceItem } from '../utils/cart.ts';
import { ProgressiveImage } from './ProgressiveImage.tsx';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: FoodItem[];
  onSelectItem: (item: FoodItem) => void;
  getAvailability?: (item: FoodItem) => boolean;
  theme?: StorefrontTheme;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  items,
  onSelectItem,
  getAvailability,
  theme = 'classic',
}) => {
  const [query, setQuery] = useState('');
  const [filterVegOnly, setFilterVegOnly] = useState(false);
  const isNeu = theme === 'warm-amber-neumorphism';

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const q = query.toLowerCase().trim();
      const matchesText =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.ingredients.some((ing) => ing.toLowerCase().includes(q));

      const matchesVeg = !filterVegOnly || item.isVeg;

      return matchesText && matchesVeg;
    });
  }, [items, query, filterVegOnly]);

  return (
    <AnimatePresence>
      {isOpen && (
        <m.div
          key="search-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Search menu items"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-4 pt-12 sm:pt-16 bg-black/55 backdrop-blur-xs"
        >
          <div className="absolute inset-0" onClick={onClose} />

          <m.div
            initial={{ opacity: 0, y: -16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 370, damping: 28, mass: 0.85 }}
            className={`relative w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col z-10 max-h-[82vh] ${
              isNeu
                ? 'bg-[#F5E8D5] border border-[#E4C9A1]'
                : 'bg-[#F8EBDD] border border-[#B98660]/25'
            }`}
          >
        
            {/* Search Input Header */}
            <div
              className={`p-3.5 sm:p-4 flex items-center gap-2.5 ${
                isNeu
                  ? 'bg-[#F7EBDA] border-b border-[#E4C9A1]'
                  : 'bg-[#FDF6EE] border-b border-[#B98660]/20'
              }`}
            >
              <div
                className={`flex-1 flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl ${
                  isNeu ? 'neu-inset' : 'cream-neu-inset'
                }`}
              >
                <Search className={`w-4 h-4 shrink-0 ${isNeu ? 'text-[#B45309]' : 'text-[#B94F2E]'}`} />
                <input
                  type="text"
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search Paneer Tikka, Soups, Burgers..."
                  className={`flex-1 text-sm font-medium bg-transparent focus:outline-none ${
                    isNeu
                      ? 'text-[#2A180B] placeholder:text-[#8E6C48]'
                      : 'text-[#2D1B12] placeholder:text-[#8E6E58]'
                  }`}
                />
                {query && (
                  <button
                    onClick={() => setQuery('')}
                    className="text-xs font-semibold text-[#7A5C48] hover:text-[#2D1B12] px-1.5 cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>

              <button
                onClick={onClose}
                aria-label="Close search"
                className={`w-10 h-10 rounded-2xl flex items-center justify-center cursor-pointer shrink-0 ${
                  isNeu ? 'neu-pill-btn text-[#4A2B11]' : 'cream-neu-pill text-[#2D1B12]'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Count & Pure Veg Toggle */}
            <div
              className={`px-4 py-2.5 flex items-center justify-between text-xs ${
                isNeu
                  ? 'bg-[#EAD7BA] border-b border-[#DFC39B] text-[#6B4D30]'
                  : 'bg-[#F2E2D0] border-b border-[#B98660]/18 text-[#7A5C48]'
              }`}
            >
              <span className="font-medium tabular-nums">
                {filteredItems.length} {filteredItems.length === 1 ? 'dish' : 'dishes'} found
              </span>
              <button
                onClick={() => setFilterVegOnly((v) => !v)}
                className={`min-h-[36px] px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  filterVegOnly
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : isNeu
                    ? 'neu-pill-btn text-[#4A2B11]'
                    : 'cream-neu-pill text-[#2D1B12]'
                }`}
              >
                <span
                  aria-hidden="true"
                  className="w-3.5 h-3.5 rounded-[3px] border border-emerald-700 bg-white flex items-center justify-center shrink-0"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                </span>
                <span>Pure Veg Only</span>
              </button>
            </div>

            {/* Results List */}
            <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-2.5 no-scrollbar">
              {filteredItems.length === 0 ? (
                <div className="py-12 text-center text-[#7A5C48]">
                  <p className="font-serif text-base font-bold text-[#2D1B12]">
                    No dishes found matching "{query}"
                  </p>
                  <p className="text-xs text-[#7A5C48] mt-1">
                    Try searching for "paneer", "soup", "pizza", or "burger".
                  </p>
                </div>
              ) : (
                filteredItems.map((item) => {
                  const isAvailable = getAvailability ? getAvailability(item) : (item.isAvailable ?? true);
                  const isFixed = isFixedPriceItem(item);
                  const displayPrice = getItemDisplayPrice(item);

                  return (
                    <m.div
                      key={item.id}
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.985 }}
                      onClick={() => {
                        onSelectItem(item);
                        onClose();
                      }}
                      className={`p-2.5 sm:p-3 flex items-center justify-between gap-3 group cursor-pointer rounded-2xl transition-colors ${
                        isNeu
                          ? 'neu-card'
                          : 'cream-neu-card'
                      } ${!isAvailable ? 'opacity-70' : ''}`}
                    >
                      <div className="w-16 h-12 rounded-xl overflow-hidden shrink-0 bg-[#EFE0CE] relative">
                        <ProgressiveImage
                          src={item.image}
                          alt={item.name}
                          theme={theme}
                          className={`w-full h-full object-cover ${!isAvailable ? 'grayscale-40' : ''}`}
                        />
                        {!isAvailable && (
                          <div
                            aria-hidden="true"
                            className="absolute inset-0 bg-[#2D1B12]/25 pointer-events-none"
                          />
                        )}
                      </div>

                      <div className="flex-1 min-w-0 pr-1">
                        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider">
                          <span className={isNeu ? 'text-[#B45309]' : 'text-[#B94F2E]'}>
                            {item.category}
                          </span>
                          <span aria-hidden="true" className="text-[#C8AE96]">·</span>
                          <span className={item.isVeg ? 'text-emerald-800' : 'text-amber-900'}>
                            {item.isVeg ? 'Veg' : 'Non-Veg'}
                          </span>
                        </div>
                        <h3
                          className={`font-serif font-bold text-sm transition-colors line-clamp-2 sm:line-clamp-1 break-words mt-0.5 ${
                            isNeu
                              ? 'text-[#2A180B] group-hover:text-[#B45309]'
                              : 'text-[#2D1B12] group-hover:text-[#B94F2E]'
                          }`}
                        >
                          {item.name}
                        </h3>
                        <p className={`text-xs truncate ${isNeu ? 'text-[#7C5D41]' : 'text-[#7A5C48]'}`}>
                          {item.description}
                        </p>
                      </div>

                      <div className="flex flex-col items-end shrink-0">
                        <div className="flex items-center gap-1">
                          {!isFixed && (
                            <span className={`text-[10px] ${isNeu ? 'text-[#7C5D41]' : 'text-[#7A5C48]'}`}>
                              From
                            </span>
                          )}
                          <span
                            className={`font-bold text-sm font-mono tabular-nums ${
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
                          <ChevronRight
                            className={`w-3.5 h-3.5 ${
                              isNeu
                                ? 'text-[#9A744E] group-hover:text-[#B45309]'
                                : 'text-[#A67B5B] group-hover:text-[#B94F2E]'
                            }`}
                          />
                        </div>
                        <span className="mt-0.5 inline-flex items-center gap-1">
                          <span
                            aria-hidden="true"
                            className={`w-1.5 h-1.5 rounded-full ${
                              isAvailable ? 'bg-emerald-600' : 'bg-rose-600'
                            }`}
                          />
                          <span
                            className={`text-[10px] leading-none ${
                              isAvailable
                                ? 'font-semibold text-emerald-800'
                                : 'font-bold text-rose-700'
                            }`}
                          >
                            {isAvailable ? 'Available' : 'Sold Out'}
                          </span>
                        </span>
                      </div>
                    </m.div>
                  );
                })
              )}
            </div>

          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
};
