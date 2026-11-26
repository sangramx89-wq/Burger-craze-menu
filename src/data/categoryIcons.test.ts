import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getCategoryIconLabel,
  isCategoryImageUrl,
  sanitizeCategoryImageUrlInput,
} from './categoryIcons.tsx';

test('isCategoryImageUrl accepts safe raster image URLs and rejects unsafe schemes', () => {
  assert.equal(isCategoryImageUrl('https://cdn.example.com/coffee.png'), true);
  assert.equal(isCategoryImageUrl('http://localhost:3000/icon.webp'), true);
  assert.equal(isCategoryImageUrl('/images/custom-cat.png'), true);
  assert.equal(
    isCategoryImageUrl('data:image/webp;base64,UklGRh4AAABXRUJQVlA4TBEAAAAvAAAAAAfQ//73v/+BiOh/AAA='),
    true
  );

  // Reject unsafe URLs and SVG data payloads
  assert.equal(isCategoryImageUrl('javascript:alert(1)'), false);
  assert.equal(isCategoryImageUrl('data:text/html,<script>alert(1)</script>'), false);
  assert.equal(isCategoryImageUrl('data:image/svg+xml;base64,PHN2Zz4='), false);
  assert.equal(isCategoryImageUrl('//evil.example.com/img.png'), false);
  assert.equal(isCategoryImageUrl('coffee'), false);
});

test('sanitizeCategoryImageUrlInput trims safe URLs and returns null for invalid inputs', () => {
  assert.equal(
    sanitizeCategoryImageUrlInput('  https://example.com/burger.jpg  '),
    'https://example.com/burger.jpg'
  );
  assert.equal(sanitizeCategoryImageUrlInput('javascript:void(0)'), null);
  assert.equal(sanitizeCategoryImageUrlInput('   '), null);
});

test('getCategoryIconLabel distinguishes built-in defaults, culinary icons, and custom images', () => {
  assert.equal(getCategoryIconLabel(undefined, 'Pizzas'), 'Default Logo');
  assert.equal(getCategoryIconLabel(undefined, 'All'), 'Default Logo');
  assert.equal(getCategoryIconLabel(undefined, 'Desserts'), 'House Special');
  assert.equal(getCategoryIconLabel('coffee', 'Burgers'), 'Coffee & Espresso');
  assert.equal(
    getCategoryIconLabel('https://cdn.example.com/logo.png', 'Starters'),
    'Custom Image'
  );
});
