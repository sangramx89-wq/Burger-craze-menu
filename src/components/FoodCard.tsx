import React from 'react';
import { Plus, Minus, Star, Heart, Clock, Flame } from 'lucide-react';
import { FoodItem } from '../types/index.ts';
import { formatPrice } from '../utils/cart.ts';

interface FoodCardProps {
  item: FoodItem;
  quantityInCart: number;
  isFavorite: boolean;
  onAddToCart: (item: FoodItem, e?: React.MouseEvent) => void;
  onUpdateQuantity: (item: FoodItem, delta: number, e?: React.MouseEvent) => void;
  onToggleFavorite: (item: FoodItem, e?: React.MouseEvent) => void;
  onCardClick: (item: FoodItem) => void;
}

export const FoodCard: React.FC<FoodCardProps> = ({
  item,
  quantityInCart,
  isFavorite,
  onAddToCart,
  onUpdateQuantity,
  onToggleFavorite,
  onCardClick,
}) => {
  return (
    <article
      onClick={() => onCardClick(item)}
      className="group relative cream-neu-card rounded-3xl overflow-hidden flex flex-col cursor-pointer"
    >
      {/* Top 4:3 Image Container */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#EFE0CE]">
        <img
          src={item.image}
          alt={item.name}
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
          referrerPolicy="no-referrer"
          loading="lazy"
        />

        {/* Favorite Heart Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(item, e);
          }}
          aria-label={isFavorite ? `Remove ${item.name} from favorites` : `Save ${item.name} to favorites`}
          className={`absolute top-3 right-3 w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90 z-10 shadow-sm cursor-pointer ${
            isFavorite
              ? 'bg-[#B94F2E] text-white'
              : 'bg-[#FDF6EE]/92 text-[#2D1B12] hover:text-[#B94F2E]'
          }`}
        >
          <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
        </button>
      </div>

      {/* Card Content Area */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Clean Unboxed Metadata */}
          <div className="flex items-center justify-between text-[11px] text-[#7A5C48] mb-1.5 font-medium">
            <div className="flex items-center gap-1.5 min-w-0">
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
              <span className="text-[#B94F2E] font-semibold truncate">{item.category}</span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-0.5 tabular-nums font-semibold text-[#2D1B12]">
                <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                {item.rating.toFixed(1)}
              </span>
            </div>

            <span className="flex items-center gap-1 shrink-0 tabular-nums">
              <Clock className="w-3 h-3 text-[#B94F2E]" />
              {item.prepTime}
            </span>
          </div>

          {/* Dish Name */}
          <h3 className="font-serif text-lg font-bold text-[#2D1B12] group-hover:text-[#B94F2E] transition-colors leading-snug line-clamp-1 mb-1">
            {item.name}
          </h3>

          {/* Dish Description */}
          <p className="text-xs text-[#7A5C48] line-clamp-2 leading-relaxed mb-3">
            {item.description}
          </p>

          <div className="flex items-center gap-1 text-[11px] text-[#7A5C48] mb-3 tabular-nums">
            <Flame className="w-3 h-3 text-[#B94F2E]" />
            <span>{item.calories} kcal</span>
            {item.isChefSpecial && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-semibold text-[#B94F2E]">Chef's Pick</span>
              </>
            )}
          </div>
        </div>

        {/* Card Footer: Price & Working Add Action */}
        <div className="pt-3 border-t border-[#B98660]/18 flex items-center justify-between gap-2 mt-auto">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-semibold text-[#7A5C48]">Price</span>
            <span className="text-lg font-bold text-[#B94F2E] font-mono tracking-tight tabular-nums">
              {formatPrice(item.price)}
            </span>
          </div>

          {quantityInCart > 0 ? (
            <div
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 cream-neu-inset p-1 rounded-2xl"
            >
              <button
                onClick={(e) => onUpdateQuantity(item, -1, e)}
                aria-label={`Decrease ${item.name} quantity`}
                className="w-8 h-8 rounded-xl cream-neu-pill text-[#2D1B12] flex items-center justify-center active:scale-90 cursor-pointer"
              >
                <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>

              <span className="min-w-[24px] text-center text-xs font-bold text-[#2D1B12] font-mono tabular-nums">
                {quantityInCart}
              </span>

              <button
                onClick={(e) => onUpdateQuantity(item, 1, e)}
                aria-label={`Increase ${item.name} quantity`}
                className="w-8 h-8 rounded-xl cream-neu-primary text-white flex items-center justify-center active:scale-90 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </div>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddToCart(item, e);
              }}
              aria-label={`Add ${item.name} to order`}
              className="h-10 px-4 rounded-xl cream-neu-primary text-white text-xs font-semibold tracking-wide flex items-center gap-1.5 active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add</span>
            </button>
          )}
        </div>
      </div>
    </article>
  );
};
