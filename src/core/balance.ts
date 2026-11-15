import type { ShipmentKind } from './model';

export const FIRST_ARRIVAL_TICKS = { minimum: 12, maximum: 20 };
export const ARRIVAL_INTERVAL_TICKS = { minimum: 55, maximum: 100 };
export const LOADING_TICKS = 16;
export const BASE_SERVICE_TICKS = 6;

export const SHIPMENTS = {
  letter: { minimumBatch: 1, maximumBatch: 5, serviceTicks: 2, revenue: 80 },
  ad: { minimumBatch: 3, maximumBatch: 8, serviceTicks: 1, revenue: 15 },
} satisfies Record<ShipmentKind, {
  minimumBatch: number;
  maximumBatch: number;
  serviceTicks: number;
  revenue: number;
}>;
