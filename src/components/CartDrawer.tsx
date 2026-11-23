import React, { useState } from 'react';
import { X, Trash2, Plus, Minus, Tag, Check, ShoppingBag, ArrowRight, Truck, Utensils } from 'lucide-react';
import { CartItem } from '../types/index.ts';
import { calculateOrderSummary, formatPrice, FREE_DELIVERY_THRESHOLD } from '../utils/cart.ts';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (cartId: string, newQty: number) => void;
  onRemoveItem: (cartId: string) => void;
  onClearCart: () => void;
  onProceedToCheckout: () => void;
  appliedPromo: string | null;
  onApplyPromo: (code: string) => void;
  orderType: 'delivery' | 'dine_in';
  onSetOrderType: (type: 'delivery' | 'dine_in') => void;
  tableNumber: string;
  onSetTableNumber: (num: string) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onProceedToCheckout,
  appliedPromo,
  onApplyPromo,
  orderType,
  onSetOrderType,
  tableNumber,
  onSetTableNumber,
}) => {
  const [promoInput, setPromoInput] = useState('');
  const [promoError, setPromoError] = useState('');

  if (!isOpen) return null;

  const summary = calculateOrderSummary(items, appliedPromo, orderType);

  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoInput.trim()) return;

    const code = promoInput.trim().toUpperCase();
    if (code === 'NOURISH' || code === 'AURAFIRST' || code === 'WELCOME10') {
      onApplyPromo(code);
      setPromoError('');
      setPromoInput('');
    } else {
      setPromoError('Invalid promo code. Try "NOURISH" for 20% off.');
    }
  };

  const deliveryProgress = Math.min(100, (summary.subtotal / FREE_DELIVERY_THRESHOLD) * 100);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cart-drawer-title"
      className="fixed inset-0 z-50 flex justify-end bg-black/55 backdrop-blur-xs transition-opacity"
    >
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Drawer Container */}
      <div className="relative w-full max-w-md bg-[#F8EBDD] h-full shadow-2xl flex flex-col z-10 border-l border-[#B98660]/25">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-[#FDF6EE] border-b border-[#B98660]/20 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl cream-neu-inset text-[#B94F2E] flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 id="cart-drawer-title" className="font-serif text-lg font-bold text-[#2D1B12]">
                Your Order Bag
              </h2>
              <span className="text-xs text-[#7A5C48] font-medium tabular-nums">
                {items.length} {items.length === 1 ? 'item' : 'items'}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close cart"
            className="w-10 h-10 rounded-2xl cream-neu-pill text-[#2D1B12] flex items-center justify-center active:scale-95 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dine-in vs Delivery Toggle */}
        <div className="p-4 bg-[#F2E2D0] border-b border-[#B98660]/20">
          <div className="flex p-1 rounded-2xl cream-neu-inset">
            <button
              onClick={() => onSetOrderType('delivery')}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                orderType === 'delivery'
                  ? 'cream-neu-primary text-white'
                  : 'text-[#5E4232] hover:text-[#2D1B12]'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Door Delivery</span>
            </button>
            <button
              onClick={() => onSetOrderType('dine_in')}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                orderType === 'dine_in'
                  ? 'cream-neu-primary text-white'
                  : 'text-[#5E4232] hover:text-[#2D1B12]'
              }`}
            >
              <Utensils className="w-3.5 h-3.5" />
              <span>Table Dine-In</span>
            </button>
          </div>

          {orderType === 'dine_in' && (
            <div className="mt-2.5 flex items-center justify-between text-xs cream-neu-card px-3.5 py-2.5 rounded-xl">
              <span className="font-medium text-[#5E4232]">Your Table Number:</span>
              <input
                type="text"
                value={tableNumber}
                onChange={(e) => onSetTableNumber(e.target.value)}
                placeholder="e.g. 12"
                className="w-16 text-center font-bold font-mono text-[#2D1B12] cream-neu-inset rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#B94F2E]"
              />
            </div>
          )}

          {/* Delivery threshold bar */}
          {orderType === 'delivery' && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-[11px] font-semibold text-[#5E4232] mb-1">
                {summary.qualifiesForFreeDelivery ? (
                  <span className="text-emerald-800 flex items-center gap-1">
                    <Check className="w-3 h-3 stroke-[3]" /> Free Delivery Unlocked!
                  </span>
                ) : (
                  <span>
                    Add <strong className="text-[#B94F2E]">{formatPrice(summary.amountNeededForFreeDelivery)}</strong> more for free delivery
                  </span>
                )}
                <span className="tabular-nums">{formatPrice(FREE_DELIVERY_THRESHOLD)}</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-[#DFCCB7] overflow-hidden">
                <div
                  className="h-full bg-[#B94F2E] transition-all duration-300 rounded-full"
                  style={{ width: `${deliveryProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Items List or Empty State */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#7A5C48]">
              <div className="w-16 h-16 rounded-3xl cream-neu-inset flex items-center justify-center text-[#B94F2E] mb-3">
                <ShoppingBag className="w-8 h-8 stroke-[1.5]" />
              </div>
              <h3 className="font-serif text-lg font-bold text-[#2D1B12] mb-1">
                Your bag is empty
              </h3>
              <p className="text-xs text-[#7A5C48] max-w-xs mb-5">
                Explore our artisanal wood-fired pizzas, hearty soups, and crafted burgers to start ordering.
              </p>
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl cream-neu-primary text-white text-xs font-semibold cursor-pointer"
              >
                Browse Menu
              </button>
            </div>
          ) : (
            items.map((cartItem) => (
              <div
                key={cartItem.cartId}
                className="cream-neu-card p-3.5 rounded-2xl flex gap-3 items-center"
              >
                <img
                  src={cartItem.foodItem.image}
                  alt={cartItem.foodItem.name}
                  className="w-16 h-16 rounded-xl object-cover shrink-0 bg-[#EFE0CE]"
                  referrerPolicy="no-referrer"
                />

                <div className="flex-1 min-w-0">
                  <h4 className="font-serif text-sm font-bold text-[#2D1B12] truncate leading-tight">
                    {cartItem.foodItem.name}
                  </h4>

                  {Object.entries(cartItem.selectedOptions).length > 0 && (
                    <div className="text-[11px] text-[#7A5C48] truncate">
                      {Object.values(cartItem.selectedOptions).join(', ')}
                    </div>
                  )}

                  {cartItem.specialNotes && (
                    <div className="text-[10px] text-[#8A6B57] italic truncate">
                      "{cartItem.specialNotes}"
                    </div>
                  )}

                  <div className="text-xs font-bold text-[#B94F2E] font-mono mt-1 tabular-nums">
                    {formatPrice(cartItem.totalPrice)}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <button
                    onClick={() => onRemoveItem(cartItem.cartId)}
                    aria-label={`Remove ${cartItem.foodItem.name}`}
                    className="text-[#8A6B57] hover:text-rose-600 transition-colors p-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <div className="flex items-center cream-neu-inset p-0.5 rounded-xl">
                    <button
                      onClick={() => onUpdateQuantity(cartItem.cartId, cartItem.quantity - 1)}
                      aria-label="Decrease quantity"
                      className="w-7 h-7 rounded-lg cream-neu-pill text-[#2D1B12] flex items-center justify-center active:scale-90 cursor-pointer"
                    >
                      <Minus className="w-3 h-3 stroke-[2.5]" />
                    </button>

                    <span className="min-w-[22px] text-center text-xs font-bold text-[#2D1B12] font-mono tabular-nums">
                      {cartItem.quantity}
                    </span>

                    <button
                      onClick={() => onUpdateQuantity(cartItem.cartId, cartItem.quantity + 1)}
                      aria-label="Increase quantity"
                      className="w-7 h-7 rounded-lg cream-neu-primary text-white flex items-center justify-center active:scale-90 cursor-pointer"
                    >
                      <Plus className="w-3 h-3 stroke-[2.5]" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer with Promo & Bill Summary */}
        {items.length > 0 && (
          <div className="p-4 sm:p-5 bg-[#FDF6EE] border-t border-[#B98660]/20 shadow-lg">
            
            <form onSubmit={handleApplyPromo} className="mb-3.5">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#7A5C48]" />
                  <input
                    type="text"
                    value={promoInput}
                    onChange={(e) => {
                      setPromoInput(e.target.value);
                      setPromoError('');
                    }}
                    placeholder="Promo code (e.g. NOURISH)"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl cream-neu-inset text-xs font-medium text-[#2D1B12] placeholder:text-[#8E6E58] focus:outline-none focus:ring-1 focus:ring-[#B94F2E] uppercase"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#2D1B12] hover:bg-[#4A2E20] text-white text-xs font-semibold tracking-wide transition-colors cursor-pointer"
                >
                  Apply
                </button>
              </div>

              {appliedPromo && (
                <div className="mt-1.5 flex items-center justify-between text-[11px] text-emerald-800 font-semibold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                  <span className="flex items-center gap-1">
                    <Check className="w-3 h-3 stroke-[3]" /> Code {appliedPromo} applied!
                  </span>
                  <span className="tabular-nums">-{formatPrice(summary.discount)}</span>
                </div>
              )}

              {promoError && (
                <div className="mt-1 text-[11px] text-rose-700 font-medium">
                  {promoError}
                </div>
              )}
            </form>

            <div className="space-y-1.5 text-xs text-[#5E4232] mb-4 pb-3 border-b border-[#B98660]/18">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-mono text-[#2D1B12] font-semibold tabular-nums">{formatPrice(summary.subtotal)}</span>
              </div>

              {summary.discount > 0 && (
                <div className="flex justify-between text-[#B94F2E] font-semibold">
                  <span>Discount</span>
                  <span className="font-mono tabular-nums">-{formatPrice(summary.discount)}</span>
                </div>
              )}

              {orderType === 'delivery' && (
                <div className="flex justify-between">
                  <span>Delivery Fee</span>
                  <span className="font-mono text-[#2D1B12] font-semibold tabular-nums">
                    {summary.deliveryFee === 0 ? (
                      <span className="text-emerald-800 font-bold uppercase text-[10px]">Free</span>
                    ) : (
                      formatPrice(summary.deliveryFee)
                    )}
                  </span>
                </div>
              )}

              <div className="flex justify-between">
                <span>Estimated Tax (8.25%)</span>
                <span className="font-mono text-[#2D1B12] font-semibold tabular-nums">{formatPrice(summary.tax)}</span>
              </div>

              <div className="flex justify-between text-sm font-bold text-[#2D1B12] pt-1.5 border-t border-[#B98660]/18">
                <span>Total Amount</span>
                <span className="font-mono text-[#B94F2E] text-base tabular-nums">{formatPrice(summary.total)}</span>
              </div>
            </div>

            <button
              onClick={onProceedToCheckout}
              className="w-full h-12 rounded-2xl cream-neu-primary text-white font-bold text-sm tracking-wide flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
