import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyBulkAvailability,
  resolveItemAvailability,
  summarizeAvailability,
} from './availability.ts';

test('resolveItemAvailability prioritizes availabilityMap override over item default', () => {
  assert.equal(resolveItemAvailability({ id: 'dish-1', isAvailable: true }, {}), true);
  assert.equal(resolveItemAvailability({ id: 'dish-1', isAvailable: false }, {}), false);
  assert.equal(resolveItemAvailability({ id: 'dish-1' }, {}), true);
  assert.equal(
    resolveItemAvailability({ id: 'dish-1', isAvailable: true }, { 'dish-1': false }),
    false
  );
  assert.equal(
    resolveItemAvailability({ id: 'dish-1', isAvailable: false }, { 'dish-1': true }),
    true
  );
});

test('applyBulkAvailability updates all target ids atomically without mutating untouched categories', () => {
  const initial = { 'starter-1': true, 'soup-1': false };
  const updated = applyBulkAvailability(initial, ['starter-1', 'starter-2'], false);

  assert.deepEqual(updated, {
    'starter-1': false,
    'starter-2': false,
    'soup-1': false,
  });
  assert.deepEqual(initial, { 'starter-1': true, 'soup-1': false });

  const unchanged = applyBulkAvailability(updated, ['starter-1', 'starter-2'], false);
  assert.equal(unchanged, updated);
});

test('summarizeAvailability computes accurate available and sold-out counts', () => {
  const items = [
    { id: 'a', isAvailable: true },
    { id: 'b', isAvailable: false },
    { id: 'c' },
    { id: 'd', isAvailable: true },
  ];
  const summary = summarizeAvailability(items, { c: false });

  assert.deepEqual(summary, {
    total: 4,
    availableCount: 2,
    soldOutCount: 2,
  });
});
