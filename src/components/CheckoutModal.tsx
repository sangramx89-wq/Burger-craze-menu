import React, { useState } from 'react';
import { X, CreditCard, Smartphone, Banknote, ShieldCheck, CheckCircle2, MapPin, Utensils } from 'lucide-react';
import { CartItem } from '../types/index.ts';
import { calculateOrderSummary, formatPrice } from '../utils/cart.ts';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  promoCode: string | null;
  orderType: 'delivery' | 'dine_in';
  tableNumber: string;
  onOrderPlaced: (orderData: {
    customerName: string;
    customerPhone: string;
    deliveryAddress: string;
    tableNumber: string;
    paymentMethod: 'card' | 'apple_pay' | 'cash';
  }) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  items,
  promoCode,
  orderType,
  tableNumber: initialTableNumber,
  onOrderPlaced,
}) => {
  const [customerName, setCustomerName] = useState('Elena Vance');
  const [customerPhone, setCustomerPhone] = useState('(555) 382-9104');
  const [deliveryAddress, setDeliveryAddress] = useState('428 Oakwood Terrace, Apt 4B');
  const [tableNumber, setTableNumber] = useState(initialTableNumber || '12');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'apple_pay' | 'cash'>('card');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);

  if (!isOpen) return null;

  const summary = calculateOrderSummary(items, promoCode, orderType);

  const handleSubmitOrder = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
      setOrderComplete(true);
      setTimeout(() => {
        onOrderPlaced({
          customerName,
          customerPhone,
          deliveryAddress,
          tableNumber,
          paymentMethod,
        });
      }, 350);
    }, 250);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity"
    >
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-[#F8EBDD] rounded-3xl shadow-2xl overflow-hidden flex flex-col z-10 border border-[#B98660]/25 max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-[#FDF6EE] border-b border-[#B98660]/20 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <h2 id="checkout-modal-title" className="font-serif text-xl font-bold text-[#2D1B12]">
              Complete Your Order
            </h2>
            <span className="text-xs font-semibold text-[#B94F2E]">
              · {orderType === 'delivery' ? 'Delivery' : `Table #${tableNumber}`}
            </span>
          </div>

          <button
            onClick={onClose}
            aria-label="Close checkout"
            className="w-10 h-10 rounded-2xl cream-neu-pill text-[#2D1B12] flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {orderComplete ? (
          <div className="p-10 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4 shadow-sm">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="font-serif text-2xl font-bold text-[#2D1B12] mb-2">
              Order Confirmed!
            </h3>
            <p className="text-xs text-[#7A5C48] max-w-xs mb-4">
              Our kitchen has received your order and our artisan chefs are now preparing your dishes fresh to order.
            </p>
            <span className="text-xs text-[#B94F2E] font-semibold">
              Redirecting to Live Order Tracker...
            </span>
          </div>
        ) : (
          <form onSubmit={handleSubmitOrder} className="flex-1 overflow-y-auto p-5 space-y-5 no-scrollbar">
            
            {/* Dining Destination Info */}
            <div className="p-4 rounded-2xl cream-neu-surface space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#7A5C48]">
                {orderType === 'delivery' ? (
                  <>
                    <MapPin className="w-4 h-4 text-[#B94F2E]" />
                    <span>Delivery Address</span>
                  </>
                ) : (
                  <>
                    <Utensils className="w-4 h-4 text-[#B94F2E]" />
                    <span>Dine-In Table Confirmation</span>
                  </>
                )}
              </div>

              {orderType === 'delivery' ? (
                <div>
                  <input
                    type="text"
                    required
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="Enter street address, apt, or suite"
                    className="w-full px-3.5 py-2.5 rounded-xl cream-neu-inset text-xs sm:text-sm font-medium text-[#2D1B12] focus:outline-none focus:ring-1 focus:ring-[#B94F2E]"
                  />
                  <div className="flex flex-wrap gap-2 mt-2.5">
                    {['428 Oakwood Terrace', '950 Grand Avenue', 'Office - Suite 300'].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setDeliveryAddress(preset)}
                        className="text-[11px] px-2.5 py-1 rounded-lg cream-neu-pill text-[#5E4232] font-medium cursor-pointer"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#5E4232]">Assigned Table Number:</span>
                  <input
                    type="text"
                    required
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    className="w-20 text-center font-mono font-bold text-sm text-[#2D1B12] cream-neu-inset rounded-xl py-1.5 focus:outline-none focus:ring-1 focus:ring-[#B94F2E]"
                  />
                </div>
              )}
            </div>

            {/* Contact Details */}
            <div className="p-4 rounded-2xl cream-neu-surface space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#7A5C48]">
                Contact Information
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#7A5C48] mb-1">
                    Your Name
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl cream-neu-inset text-xs font-medium text-[#2D1B12] focus:outline-none focus:ring-1 focus:ring-[#B94F2E]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#7A5C48] mb-1">
                    Phone for Updates
                  </label>
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl cream-neu-inset text-xs font-medium text-[#2D1B12] focus:outline-none focus:ring-1 focus:ring-[#B94F2E]"
                  />
                </div>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="p-4 rounded-2xl cream-neu-surface space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#7A5C48]">
                Payment Method
              </h4>
              <div className="grid grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`p-3 rounded-xl flex flex-col items-center gap-1.5 text-xs font-semibold transition-all cursor-pointer ${
                    paymentMethod === 'card'
                      ? 'cream-neu-primary text-white'
                      : 'cream-neu-card text-[#5E4232]'
                  }`}
                >
                  <CreditCard className="w-5 h-5" />
                  <span>Card</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('apple_pay')}
                  className={`p-3 rounded-xl flex flex-col items-center gap-1.5 text-xs font-semibold transition-all cursor-pointer ${
                    paymentMethod === 'apple_pay'
                      ? 'cream-neu-primary text-white'
                      : 'cream-neu-card text-[#5E4232]'
                  }`}
                >
                  <Smartphone className="w-5 h-5" />
                  <span>Apple Pay</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`p-3 rounded-xl flex flex-col items-center gap-1.5 text-xs font-semibold transition-all cursor-pointer ${
                    paymentMethod === 'cash'
                      ? 'cream-neu-primary text-white'
                      : 'cream-neu-card text-[#5E4232]'
                  }`}
                >
                  <Banknote className="w-5 h-5" />
                  <span>Pay Later</span>
                </button>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-[#7A5C48] pt-1">
                <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>256-bit encrypted checkout. No upfront charges for table dining.</span>
              </div>
            </div>

            {/* Quick Bill Summary Box */}
            <div className="p-4 rounded-2xl cream-neu-inset flex items-center justify-between text-xs font-medium text-[#5E4232]">
              <div>
                <span>Total Due ({items.length} items):</span>
                {summary.discount > 0 && (
                  <span className="block text-[11px] text-emerald-800 font-semibold">
                    Saved {formatPrice(summary.discount)} with promo!
                  </span>
                )}
              </div>
              <span className="font-serif text-lg font-bold text-[#2D1B12] font-mono tabular-nums">
                {formatPrice(summary.total)}
              </span>
            </div>

            {/* Submit Place Order Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 rounded-2xl cream-neu-primary disabled:opacity-60 text-white font-bold text-sm tracking-wide flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Placing Order...</span>
                </div>
              ) : (
                <span className="tabular-nums">Place Order • {formatPrice(summary.total)}</span>
              )}
            </button>

          </form>
        )}

      </div>
    </div>
  );
};
