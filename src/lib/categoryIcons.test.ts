import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CATEGORY_ICON_OPTIONS,
  getCategoryIconLabel,
  isCategoryImageUrl,
  sanitizeCategoryImageUrlInput,
} from './categoryIcons.tsx';

test('CATEGORY_ICON_OPTIONS defines 56 unique culinary icons across indian and global groups', () => {
  assert.equal(CATEGORY_ICON_OPTIONS.length, 56);
  const ids = new Set(CATEGORY_ICON_OPTIONS.map((opt) => opt.id));
  assert.equal(ids.size, 56);

  const indianCount = CATEGORY_ICON_OPTIONS.filter((opt) => opt.group === 'indian').length;
  const globalCount = CATEGORY_ICON_OPTIONS.filter((opt) => opt.group === 'global').length;
  assert.ok(indianCount > 0 && globalCount > 0);
  assert.equal(indianCount + globalCount, 56);
});

test('sanitizeCategoryImageUrlInput accepts http/https URLs and rejects unsafe schemes', () => {
  assert.equal(
    sanitizeCategoryImageUrlInput('  https://cdn.example.com/logo.png  '),
    'https://cdn.example.com/logo.png'
  );
  assert.equal(
    sanitizeCategoryImageUrlInput('http://cdn.example.com/icon.webp'),
    'http://cdn.example.com/icon.webp'
  );
  assert.equal(sanitizeCategoryImageUrlInput('javascript:alert(1)'), null);
  assert.equal(sanitizeCategoryImageUrlInput('data:text/html,<script>'), null);
  assert.equal(sanitizeCategoryImageUrlInput('   '), null);
});

test('isCategoryImageUrl distinguishes image URLs from icon preset IDs', () => {
  assert.equal(isCategoryImageUrl('https://cdn.example.com/pizza.png'), true);
  assert.equal(isCategoryImageUrl('data:image/webp;base64,AAA'), true);
  assert.equal(isCategoryImageUrl('/images/custom.png'), true);
  assert.equal(isCategoryImageUrl('indian-thali'), false);
  assert.equal(isCategoryImageUrl(''), false);
  assert.equal(isCategoryImageUrl(null), false);
});

test('getCategoryIconLabel resolves custom image, preset ID, and built-in fallback labels', () => {
  assert.equal(
    getCategoryIconLabel('https://cdn.example.com/pizza.png', 'Pizzas'),
    'Custom Image Logo'
  );
  assert.equal(getCategoryIconLabel('masala-chai', 'Drinks'), 'Masala Chai & Kulhad');
  assert.equal(getCategoryIconLabel(undefined, 'Burgers'), 'Gourmet Burger (Default)');
});
