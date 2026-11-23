import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluatePerformanceProfile } from './performanceProfile.ts';

test('Desktop fast device runs full animations and idle prefetching', () => {
  const result = evaluatePerformanceProfile({
    isMobileViewport: false,
    prefersReducedMotion: false,
    saveData: false,
    effectiveType: '4g',
    deviceMemory: 8,
    hardwareConcurrency: 8,
  });

  assert.equal(result.isLiteMode, false);
  assert.equal(result.isSlowNetwork, false);
  assert.equal(result.shouldPrefetchSecondary, true);
});

test('Phone viewport enables lite mode while preserving 4G prefetch', () => {
  const result = evaluatePerformanceProfile({
    isMobileViewport: true,
    prefersReducedMotion: false,
    saveData: false,
    effectiveType: '4g',
    deviceMemory: 6,
    hardwareConcurrency: 8,
  });

  assert.equal(result.isLiteMode, true);
  assert.equal(result.isSlowNetwork, false);
  assert.equal(result.shouldPrefetchSecondary, true);
});

test('Slow network or Save-Data disables speculative secondary prefetching and enables lite mode', () => {
  const slow3g = evaluatePerformanceProfile({
    isMobileViewport: false,
    prefersReducedMotion: false,
    saveData: false,
    effectiveType: '3g',
    deviceMemory: 8,
    hardwareConcurrency: 8,
  });
  assert.equal(slow3g.isLiteMode, true);
  assert.equal(slow3g.isSlowNetwork, true);
  assert.equal(slow3g.shouldPrefetchSecondary, false);

  const saveData = evaluatePerformanceProfile({
    isMobileViewport: false,
    prefersReducedMotion: false,
    saveData: true,
    effectiveType: '4g',
    deviceMemory: 8,
    hardwareConcurrency: 8,
  });
  assert.equal(saveData.isLiteMode, true);
  assert.equal(saveData.shouldPrefetchSecondary, false);
});

test('Older low-RAM or low-CPU device activates lite mode even on wider screens', () => {
  const oldDevice = evaluatePerformanceProfile({
    isMobileViewport: false,
    prefersReducedMotion: false,
    saveData: false,
    effectiveType: '4g',
    deviceMemory: 2,
    hardwareConcurrency: 4,
  });

  assert.equal(oldDevice.isLiteMode, true);
  assert.equal(oldDevice.shouldPrefetchSecondary, true);
});
