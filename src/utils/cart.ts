import { CartItem, FoodItem } from '../types/index.ts';

export const TAX_RATE = 0.0825; // 8.25%
export const STANDARD_DELIVERY_FEE = 3.99;
export const FREE_DELIVERY_THRESHOLD = 45.0;

export interface PriceSummary {
  subtotal: number;
  discount: number;
  deliveryFee: number;
  tax: number;
  total: number;
  appliedPromo?: string;
  qualifiesForFreeDelivery: boolean;
  amountNeededForFreeDelivery: number;
}

export function calculateSubtotal(items: CartItem[]): number {
  const sum = items.reduce((acc, item) => acc + item.totalPrice, 0);
  return Math.round(sum * 100) / 100;
}

export function calculateDiscount(subtotal: number, promoCode: string | null): { discount: number; promoCode: string | null } {
  if (!promoCode) {
    return { discount: 0, promoCode: null };
  }

  const normalized = promoCode.trim().toUpperCase();
  if (normalized === 'NOURISH') {
    // 20% discount on order
    const discount = Math.round(subtotal * 0.2 * 100) / 100;
    return { discount, promoCode: 'NOURISH' };
  }

  if (normalized === 'AURAFIRST' || normalized === 'WELCOME10') {
    // $10 off orders over $30
    if (subtotal >= 30) {
      return { discount: 10, promoCode: normalized };
    }
    return { discount: 0, promoCode: null };
  }

  return { discount: 0, promoCode: null };
}

export function calculateOrderSummary(
  items: CartItem[],
  promoCode: string | null = null,
  orderType: 'delivery' | 'dine_in' = 'delivery'
): PriceSummary {
  const subtotal = calculateSubtotal(items);
  const { discount, promoCode: appliedPromo } = calculateDiscount(subtotal, promoCode);

  let deliveryFee = 0;
  const qualifiesForFreeDelivery = subtotal >= FREE_DELIVERY_THRESHOLD;
  const amountNeededForFreeDelivery = Math.max(0, Math.round((FREE_DELIVERY_THRESHOLD - subtotal) * 100) / 100);

  if (orderType === 'delivery') {
    if (items.length > 0 && !qualifiesForFreeDelivery) {
      deliveryFee = STANDARD_DELIVERY_FEE;
    }
  }

  const taxableAmount = Math.max(0, subtotal - discount);
  const tax = Math.round(taxableAmount * TAX_RATE * 100) / 100;
  const total = Math.round((taxableAmount + tax + deliveryFee) * 100) / 100;

  return {
    subtotal,
    discount,
    deliveryFee,
    tax,
    total,
    appliedPromo: appliedPromo || undefined,
    qualifiesForFreeDelivery,
    amountNeededForFreeDelivery,
  };
}

export function formatPrice(amount: number): string {
  return `₹${amount}`;
}

export function isFixedPriceItem(item: Pick<FoodItem, 'pricingMode' | 'sizes'>): boolean {
  return item.pricingMode === 'fixed' || !item.sizes;
}

export function getItemDisplayPrice(item: Pick<FoodItem, 'pricingMode' | 'price' | 'sizes'>): number {
  if (isFixedPriceItem(item) || !item.sizes) {
    return item.price;
  }
  return Math.min(item.sizes.small.price, item.sizes.medium.price, item.sizes.large.price);
}
