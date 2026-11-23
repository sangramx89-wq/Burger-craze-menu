import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateSubtotal,
  calculateDiscount,
  calculateOrderSummary,
  isFixedPriceItem,
  getItemDisplayPrice,
} from './cart.ts';
import { CartItem, FoodItem } from '../types/index.ts';

const mockFood: FoodItem = {
  id: 'test-1',
  name: 'Test Bruschetta',
  category: 'Starters',
  price: 14.5,
  description: 'Fresh test dish',
  image: '/test.jpg',
  rating: 4.8,
  reviewCount: 30,
  prepTime: '15 mins',
  calories: 320,
  tags: ['Vegetarian'],
  isVeg: true,
  ingredients: ['Bread', 'Tomato'],
  sizes: {
    small: { label: 'Small', portion: '2 pcs', price: 10.0 },
    medium: { label: 'Medium', portion: '4 pcs', price: 14.5 },
    large: { label: 'Large', portion: '6 pcs', price: 18.0 },
  },
};

test('calculateSubtotal sums up items accurately', () => {
  const items: CartItem[] = [
    {
      cartId: 'item-1',
      foodItem: mockFood,
      quantity: 2,
      selectedOptions: {},
      unitPrice: 14.5,
      totalPrice: 29.0,
    },
    {
      cartId: 'item-2',
      foodItem: { ...mockFood, id: 'test-2', price: 10.0 },
      quantity: 1,
      selectedOptions: {},
      unitPrice: 10.0,
      totalPrice: 10.0,
    },
  ];

  assert.equal(calculateSubtotal(items), 39.0);
});

test('calculateDiscount applies 20% for NOURISH code', () => {
  const result = calculateDiscount(50.0, 'NOURISH');
  assert.equal(result.discount, 10.0);
  assert.equal(result.promoCode, 'NOURISH');
});

test('calculateDiscount ignores invalid codes', () => {
  const result = calculateDiscount(50.0, 'INVALID');
  assert.equal(result.discount, 0);
  assert.equal(result.promoCode, null);
});

test('calculateOrderSummary calculates tax, delivery fee and totals correctly', () => {
  const items: CartItem[] = [
    {
      cartId: 'item-1',
      foodItem: mockFood,
      quantity: 1,
      selectedOptions: {},
      unitPrice: 20.0,
      totalPrice: 20.0,
    },
  ];

  // Under threshold: standard delivery fee 3.99 applies
  const summary = calculateOrderSummary(items, null, 'delivery');
  assert.equal(summary.subtotal, 20.0);
  assert.equal(summary.deliveryFee, 3.99);
  assert.equal(summary.qualifiesForFreeDelivery, false);
  assert.equal(summary.amountNeededForFreeDelivery, 25.0);
  assert.equal(summary.discount, 0);

  // Over threshold ($50 > $45): free delivery applies
  const itemsOverThreshold: CartItem[] = [
    {
      cartId: 'item-2',
      foodItem: mockFood,
      quantity: 1,
      selectedOptions: {},
      unitPrice: 50.0,
      totalPrice: 50.0,
    },
  ];
  const summaryFree = calculateOrderSummary(itemsOverThreshold, 'NOURISH', 'delivery');
  assert.equal(summaryFree.subtotal, 50.0);
  assert.equal(summaryFree.discount, 10.0);
  assert.equal(summaryFree.deliveryFee, 0);
  assert.equal(summaryFree.qualifiesForFreeDelivery, true);
});

test('isFixedPriceItem and getItemDisplayPrice handle tiered and fixed-price items', () => {
  assert.equal(isFixedPriceItem(mockFood), false);
  assert.equal(getItemDisplayPrice(mockFood), 10.0);

  const fixedDrink: FoodItem = {
    ...mockFood,
    id: 'coffee-1',
    name: 'Iced Latte',
    price: 110,
    pricingMode: 'fixed',
    fixedPortion: '250 ml',
    sizes: undefined,
  };
  assert.equal(isFixedPriceItem(fixedDrink), true);
  assert.equal(getItemDisplayPrice(fixedDrink), 110);

  const legacyFixedWithoutSizes: FoodItem = {
    ...mockFood,
    id: 'soda-1',
    price: 60,
    sizes: undefined,
  };
  assert.equal(isFixedPriceItem(legacyFixedWithoutSizes), true);
  assert.equal(getItemDisplayPrice(legacyFixedWithoutSizes), 60);
});
