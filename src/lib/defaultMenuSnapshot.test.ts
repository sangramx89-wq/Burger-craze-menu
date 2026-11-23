import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createSavedDefaultMenuSnapshot,
  extractSnapshotMediaUrls,
  parseSavedDefaultMenuSnapshot,
} from './defaultMenuSnapshot.ts';
import { FoodItem } from '../types/index.ts';

const sampleDish: FoodItem = {
  id: 'dish-1',
  name: 'Classic Espresso',
  category: 'Beverages',
  price: 120,
  pricingMode: 'fixed',
  fixedPortion: '250 ml',
  description: 'Single-origin espresso.',
  image: '/images/espresso.jpg',
  rating: 4.9,
  reviewCount: 40,
  prepTime: '5 min',
  calories: 25,
  tags: ['Hot'],
  isVeg: true,
  ingredients: ['Espresso beans', 'Water'],
};

test('createSavedDefaultMenuSnapshot deep-clones dishes, categories, and icons independently from live mutations', () => {
  const liveItems = [sampleDish];
  const liveCategories = ['Beverages', 'beverages', 'Desserts'];
  const liveIcons: Record<string, string> = {
    Beverages: 'coffee',
    Pizzas: 'https://cdn.example.com/pizza.png',
  };

  const snapshot = createSavedDefaultMenuSnapshot({
    menuItems: liveItems,
    customCategories: liveCategories,
    categoryIcons: liveIcons,
    savedAt: '2026-11-21T04:30:00.000Z',
  });

  // Mutate live structures after snapshot capture
  liveItems[0].name = 'Modified Espresso';
  liveItems[0].ingredients.push('Milk');
  liveCategories.push('Seasonal');
  liveIcons.Beverages = 'utensils';

  assert.equal(snapshot.menuItems[0].name, 'Classic Espresso');
  assert.deepEqual(snapshot.menuItems[0].ingredients, ['Espresso beans', 'Water']);
  assert.deepEqual(snapshot.customCategories, ['Beverages', 'Desserts']);
  assert.equal(snapshot.categoryIcons.Beverages, 'coffee');
  assert.equal(snapshot.savedAt, '2026-11-21T04:30:00.000Z');
});

test('parseSavedDefaultMenuSnapshot rejects empty/invalid inputs and preserves valid snapshots', () => {
  assert.equal(parseSavedDefaultMenuSnapshot(null), null);
  assert.equal(parseSavedDefaultMenuSnapshot({ menuItems: [] }), null);
  assert.equal(parseSavedDefaultMenuSnapshot({ menuItems: [{ id: 'x' }] }), null);

  const parsed = parseSavedDefaultMenuSnapshot(
    {
      menuItems: [sampleDish],
      customCategories: ['Beverages'],
      categoryIcons: { All: 'indian-thali' },
      savedAt: '2026-11-21T04:30:00.000Z',
    },
    (img) => `/normalized${img}`
  );

  assert.ok(parsed);
  assert.equal(parsed.menuItems[0].image, '/normalized/images/espresso.jpg');
  assert.equal(parsed.categoryIcons.All, 'indian-thali');
});

test('extractSnapshotMediaUrls collects dish images and category logo URLs for cleanup protection', () => {
  const snapshot = createSavedDefaultMenuSnapshot({
    menuItems: [sampleDish],
    customCategories: ['Beverages'],
    categoryIcons: {
      Beverages: 'coffee',
      Pizzas: 'https://cdn.example.com/pizza-logo.webp',
    },
  });

  const urls = extractSnapshotMediaUrls(snapshot);
  assert.ok(urls.includes('/images/espresso.jpg'));
  assert.ok(urls.includes('https://cdn.example.com/pizza-logo.webp'));
});
