import React, { useState, useEffect } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { X, Star, Clock, Flame, Heart, AlertCircle } from 'lucide-react';
import { FoodItem, PortionSizeKey, StorefrontTheme } from '../types/index.ts';
import { formatPrice, isFixedPriceItem } from '../utils/cart.ts';
import { ProgressiveImage } from './ProgressiveImage.tsx';

interface FoodDetailModalProps {
  item: FoodItem | null;
  isOpen: boolean;
  onClose: () => void;
  isFavorite: boolean;
  onToggleFavorite: (item: FoodItem) => void;
  isAvailable?: boolean;
  initialSize?: PortionSizeKey;
  theme?: StorefrontTheme;
}

export const FoodDetailModal: React.FC<FoodDetailModalProps> = ({
  item,
  isOpen,
  onClose,
  isFavorite,
  onToggleFavorite,
  isAvailable = true,
  initialSize = 'medium',
  theme = 'classic',
}) => {
  const [selectedSize, setSelectedSize] = useState<PortionSizeKey>('medium');

  useEffect(() => {
    setSelectedSize(initialSize);
  }, [item?.id, initialSize]);

  const isNeu = theme === 'warm-amber-neumorphism';
  const isFixed = item ? isFixedPriceItem(item) : false;
  const currentTier = !isFixed ? item?.sizes?.[selectedSize] : undefined;
  const activePrice = isFixed ? (item?.price ?? 0) : (currentTier ? currentTier.price : (item?.price ?? 0));
  const activeCalories = isFixed ? (item?.calories ?? 0) : (currentTier?.calories ?? (item?.calories ?? 0));

  const sizeKeys: PortionSizeKey[] = ['small', 'medium', 'large'];

  return (
    <AnimatePresence>
      {isOpen && item && (
        <m.div
          key="food-detail-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="food-modal-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/55 backdrop-blur-xs"
        >
          <div className="absolute inset-0" onClick={onClose} />

          <m.div
            initial={{ opacity: 0, y: 36, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 360, damping: 28, mass: 0.85 }}
            className={`relative w-full sm:max-w-lg md:max-w-xl rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col z-10 max-h-[90vh] ${
              isNeu
                ? 'bg-[#F5E8D5] border border-[#E4C9A1]'
                : 'bg-[#F8EBDD] border border-[#B98660]/25'
            }`}
          >
        
            {/* Floating Top Action Controls */}
            <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
              <div className="px-3 py-1 rounded-xl bg-[#2D1B12]/72 backdrop-blur-xs text-[#FDF6EE] text-[11px] font-semibold">
                {item.category} · {isAvailable ? 'Available' : 'Sold Out'}
              </div>

              <div className="flex items-center gap-2 pointer-events-auto">
                <m.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => onToggleFavorite(item)}
                  aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-md transition-colors cursor-pointer ${
                    isFavorite
                      ? isNeu
                        ? 'bg-[#D97706] text-white'
                        : 'bg-[#B94F2E] text-white'
                      : 'bg-[#FDF6EE]/95 text-[#2D1B12] hover:text-[#B94F2E]'
                  }`}
                >
                  <m.span
                    key={isFavorite ? 'fav' : 'unfav'}
                    initial={false}
                    animate={isFavorite ? { scale: [1, 1.3, 0.92, 1] } : { scale: 1 }}
                    transition={{ duration: 0.3 }}
                    className="flex items-center justify-center"
                  >
                    <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
                  </m.span>
                </m.button>

                <button
                  onClick={onClose}
                  aria-label="Close details"
                  className="w-10 h-10 rounded-2xl bg-[#FDF6EE]/95 hover:bg-white text-[#2D1B12] flex items-center justify-center shadow-md transition-all active:scale-90 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Modal Body */}
            <div className="overflow-y-auto flex-1 no-scrollbar">
              
              {/* Dish Image */}
              <div className="relative aspect-[16/10] w-full bg-[#EFE0CE] overflow-hidden">
                <ProgressiveImage
                  src={item.image}
                  alt={item.name}
                  eager
                  fetchPriority="high"
                  theme={theme}
                  className={`w-full h-full object-cover object-center ${!isAvailable ? 'grayscale-40' : ''}`}
                />
                <div
                  className={`absolute inset-0 bg-gradient-to-t via-transparent to-black/20 pointer-events-none ${
                    isNeu ? 'from-[#F5E8D5]' : 'from-[#F8EBDD]'
                  }`}
                />

                {!isAvailable && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center p-4">
                    <div className="bg-[#FDF6EE]/95 px-4 py-2 rounded-2xl shadow-lg border border-rose-200 flex items-center gap-2 text-rose-800 font-bold text-xs uppercase tracking-wider">
                      <AlertCircle className="w-4 h-4 text-rose-600" />
                      <span>Currently Out of Stock in Kitchen</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="px-5 sm:px-6 pt-1 pb-6 -mt-4 relative z-10">
                
                {/* Header: Name & Price */}
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="min-w-0">
                    <div
                      className={`flex items-center gap-2 text-xs font-medium mb-1.5 ${
                        isNeu ? 'text-[#7C5D41]' : 'text-[#7A5C48]'
                      }`}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          aria-hidden="true"
                          className={`w-3.5 h-3.5 rounded-[3px] border-[1.5px] bg-white flex items-center justify-center shrink-0 ${
                            item.isVeg ? 'border-emerald-700' : 'border-amber-800'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              item.isVeg ? 'bg-emerald-600' : 'bg-amber-800'
                            }`}
                          />
                        </span>
                        <span className="font-semibold text-[#2D1B12]">
                          {item.isVeg ? 'Pure Veg' : 'Non-Veg'}
                        </span>
                      </span>

                      {item.spiceLevel && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>Spice: {item.spiceLevel}</span>
                        </>
                      )}
                    </div>

                    <h2
                      id="food-modal-title"
                      className={`font-serif text-2xl sm:text-[26px] font-bold leading-tight text-balance ${
                        isNeu ? 'text-[#2A180B]' : 'text-[#2D1B12]'
                      }`}
                    >
                      {item.name}
                    </h2>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`font-mono text-2xl font-bold tabular-nums ${
                        isNeu ? 'text-[#B45309]' : 'text-[#B94F2E]'
                      }`}
                    >
                      {formatPrice(activePrice)}
                    </span>
                    <span
                      className={`block text-[10.5px] uppercase font-bold tracking-wider ${
                        isNeu ? 'text-[#7C5D41]' : 'text-[#7A5C48]'
                      }`}
                    >
                      {isFixed
                        ? (item.fixedPortion?.trim() || 'Fixed Price')
                        : (currentTier ? currentTier.label : 'Regular')}
                    </span>
                  </div>
                </div>

                {/* Recessed Quick Metrics Bar */}
                <div
                  className={`flex items-center justify-between sm:justify-start gap-3 sm:gap-5 py-2.5 px-3.5 rounded-2xl text-xs font-medium mb-4 ${
                    isNeu ? 'neu-inset text-[#5E4229]' : 'cream-neu-inset text-[#5E4232]'
                  }`}
                >
                  <div className="flex items-center gap-1 tabular-nums">
                    <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                    <span className={`font-bold ${isNeu ? 'text-[#2A180B]' : 'text-[#2D1B12]'}`}>
                      {item.rating.toFixed(1)}
                    </span>
                    <span className={isNeu ? 'text-[#7C5D41]' : 'text-[#7A5C48]'}>
                      ({item.reviewCount})
                    </span>
                  </div>
                  <span aria-hidden="true" className="text-[#C8AE96]">·</span>
                  <div className="flex items-center gap-1.5">
                    <Clock className={`w-3.5 h-3.5 ${isNeu ? 'text-[#B45309]' : 'text-[#B94F2E]'}`} />
                    <span>{item.prepTime}</span>
                  </div>
                  <span aria-hidden="true" className="text-[#C8AE96]">·</span>
                  <div className="flex items-center gap-1.5 tabular-nums">
                    <Flame className={`w-3.5 h-3.5 ${isNeu ? 'text-[#B45309]' : 'text-[#B94F2E]'}`} />
                    <span>{activeCalories} kcal</span>
                  </div>
                </div>

                {/* Portion Size Selection (Small, Medium, Large) - hidden for fixed-price items */}
                {!isFixed && item.sizes && (
                  <div
                    className={`mb-5 p-3.5 sm:p-4 rounded-2xl ${
                      isNeu ? 'neu-surface' : 'cream-neu-surface'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2.5">
                      <h3
                        className={`text-xs font-bold uppercase tracking-wider ${
                          isNeu ? 'text-[#5E4229]' : 'text-[#5E4232]'
                        }`}
                      >
                        Choose Portion Size
                      </h3>
                      <span
                        className={`text-[11px] font-semibold ${
                          isNeu ? 'text-[#B45309]' : 'text-[#B94F2E]'
                        }`}
                      >
                        {currentTier?.portion}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2.5">
                      {sizeKeys.map((key) => {
                        const tier = item.sizes?.[key];
                        if (!tier) return null;
                        const isSelected = selectedSize === key;

                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setSelectedSize(key)}
                            className={`relative p-2.5 rounded-xl flex flex-col items-center justify-center transition-all active:scale-96 cursor-pointer text-center overflow-hidden min-h-[68px] ${
                              isSelected
                                ? `text-white ${isNeu ? 'neu-btn-amber' : 'cream-neu-primary'}`
                                : isNeu
                                ? 'neu-card text-[#5E4229]'
                                : 'cream-neu-card text-[#5E4232]'
                            }`}
                          >
                            <span
                              className={`relative z-10 text-xs font-bold ${
                                isSelected ? 'text-white' : isNeu ? 'text-[#2A180B]' : 'text-[#2D1B12]'
                              }`}
                            >
                              {tier.label}
                            </span>
                            <span
                              className={`relative z-10 font-mono text-xs font-semibold mt-0.5 tabular-nums ${
                                isSelected ? 'text-white/95' : isNeu ? 'text-[#B45309]' : 'text-[#B94F2E]'
                              }`}
                            >
                              {formatPrice(tier.price)}
                            </span>
                            <span
                              className={`relative z-10 text-[10px] truncate max-w-full mt-0.5 ${
                                isSelected ? 'text-white/80' : isNeu ? 'text-[#7C5D41]' : 'text-[#7A5C48]'
                              }`}
                            >
                              {tier.portion.split(' ')[0]}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Description */}
                <p
                  className={`text-xs sm:text-sm leading-relaxed mb-5 ${
                    isNeu ? 'text-[#543A23]' : 'text-[#5E4232]'
                  }`}
                >
                  {item.description}
                </p>

                {/* Fresh Ingredients */}
                <div className="mb-4">
                  <h3
                    className={`text-[11px] uppercase tracking-wider font-bold mb-2 ${
                      isNeu ? 'text-[#7C5D41]' : 'text-[#7A5C48]'
                    }`}
                  >
                    Fresh Ingredients
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {item.ingredients.map((ing, idx) => (
                      <span
                        key={idx}
                        className={`text-xs px-3 py-1 rounded-xl ${
                          isNeu ? 'neu-card text-[#4A2B11]' : 'cream-neu-card text-[#2D1B12]'
                        }`}
                      >
                        {ing}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Allergen info */}
                {item.allergens && item.allergens.length > 0 && (
                  <div
                    className={`p-3.5 rounded-2xl text-xs mb-1 ${
                      isNeu
                        ? 'bg-[#FBEAD6] border border-[#E5B885] text-[#7A3512]'
                        : 'cream-neu-inset text-[#7B341E]'
                    }`}
                  >
                    <strong>Allergen Notice:</strong> Contains {item.allergens.join(', ')}. Ask your table server for custom preparation.
                  </div>
                )}

              </div>
            </div>

            {/* Bottom Actions */}
            <div
              className={`p-4 flex items-center gap-3 ${
                isNeu
                  ? 'bg-[#F3E5D0] border-t border-[#E3C8A0]'
                  : 'bg-[#F8EBDD] border-t border-[#B98660]/20'
              }`}
            >
              <button
                onClick={() => onToggleFavorite(item)}
                className={`flex-1 h-12 rounded-2xl font-semibold text-xs sm:text-sm tracking-wide flex items-center justify-center gap-2 transition-all active:scale-97 cursor-pointer ${
                  isFavorite
                    ? isNeu
                      ? 'neu-card text-[#2A180B]'
                      : 'cream-neu-card text-[#2D1B12]'
                    : isNeu
                    ? 'neu-btn-amber text-white'
                    : 'cream-neu-primary text-white'
                }`}
              >
                <Heart
                  className={`w-4 h-4 ${
                    isFavorite
                      ? isNeu
                        ? 'fill-[#D97706] text-[#D97706]'
                        : 'fill-[#B94F2E] text-[#B94F2E]'
                      : ''
                  }`}
                />
                <span>{isFavorite ? 'Saved to Favorites' : 'Add to Favorites'}</span>
              </button>

              <button
                onClick={onClose}
                className={`px-6 h-12 rounded-2xl font-semibold text-xs sm:text-sm transition-all active:scale-97 cursor-pointer ${
                  isNeu
                    ? 'neu-pill-btn text-[#4A2B11]'
                    : 'cream-neu-pill text-[#2D1B12]'
                }`}
              >
                Close
              </button>
            </div>

          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
};
