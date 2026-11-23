import { FoodItem } from '../types/index.ts';

export interface AvailabilitySummary {
  total: number;
  availableCount: number;
  soldOutCount: number;
}

export function resolveItemAvailability(
  item: Pick<FoodItem, 'id' | 'isAvailable'>,
  availabilityMap: Record<string, boolean>
): boolean {
  const override = availabilityMap[item.id];
  if (typeof override === 'boolean') {
    return override;
  }
  return item.isAvailable ?? true;
}

export function applyBulkAvailability(
  prevMap: Record<string, boolean>,
  targetIds: readonly string[],
  isAvailable: boolean
): Record<string, boolean> {
  if (targetIds.length === 0) {
    return prevMap;
  }

  let changed = false;
  const nextMap: Record<string, boolean> = { ...prevMap };

  for (const id of targetIds) {
    if (!id) continue;
    if (nextMap[id] !== isAvailable) {
      nextMap[id] = isAvailable;
      changed = true;
    }
  }

  return changed ? nextMap : prevMap;
}

export function summarizeAvailability(
  items: readonly Pick<FoodItem, 'id' | 'isAvailable'>[],
  availabilityMap: Record<string, boolean>
): AvailabilitySummary {
  let availableCount = 0;
  let soldOutCount = 0;

  for (const item of items) {
    if (resolveItemAvailability(item, availabilityMap)) {
      availableCount += 1;
    } else {
      soldOutCount += 1;
    }
  }

  return {
    total: items.length,
    availableCount,
    soldOutCount,
  };
}
