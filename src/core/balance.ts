import type { ShipmentKind, VehicleType } from './model';

export const FIRST_ARRIVAL_TICKS = { minimum: 12, maximum: 20 };
export const ARRIVAL_INTERVAL_TICKS = { minimum: 55, maximum: 100 };
export const LOADING_TICKS = 16;
export const BASE_SERVICE_TICKS = 6;
export const UNLOADING_TICKS = 10;
export const DEADLINE_BUFFER_TICKS = 20;
export const AGING_TICKS = 280;
export const RUNNING_COST_INTERVAL = 100;
export const START_BUDGET = 120_000;
export const DEPOT_OPEN_COST = 18_000;
export const DEPOT_CAPACITY = 72;
export const DEPOT_LOADING_BAYS = 1;
export const CENTER_LOADING_BAYS = 3;
export const MAX_BUNDLE_WAIT = 300;

export const SHIPMENTS = {
  letter: { name: 'Briefe', minimumBatch: 1, maximumBatch: 5, volume: 1, serviceTicks: 2, revenue: 80, deadline: 350, expressDeadline: 155 },
  ad: { name: 'Werbesendungen', minimumBatch: 6, maximumBatch: 18, volume: 1, serviceTicks: 1, revenue: 15, deadline: 700, expressDeadline: null },
  registered: { name: 'Einschreiben', minimumBatch: 1, maximumBatch: 4, volume: 1, serviceTicks: 5, revenue: 240, deadline: 390, expressDeadline: 175 },
  parcel: { name: 'Pakete', minimumBatch: 2, maximumBatch: 6, volume: 4, serviceTicks: 3, revenue: 390, deadline: 420, expressDeadline: 195 },
  freight: { name: 'Speditionsstücke', minimumBatch: 1, maximumBatch: 2, volume: 12, serviceTicks: 10, revenue: 1_100, deadline: 600, expressDeadline: null },
} satisfies Record<ShipmentKind, {
  name: string;
  minimumBatch: number;
  maximumBatch: number;
  volume: number;
  serviceTicks: number;
  revenue: number;
  deadline: number;
  expressDeadline: number | null;
}>;

export const ARRIVAL_KINDS: readonly ShipmentKind[] = ['letter', 'ad', 'registered', 'parcel', 'freight'];
export const EXPRESS_REVENUE_PERCENT = 150;

interface VehicleBalance {
  readonly name: string;
  readonly capacity: number;
  readonly eligible: readonly ShipmentKind[];
  readonly speedPercent: number;
  readonly purchaseCost: number;
  readonly runningCost: number;
  readonly travelCost: number;
}

const MAIL: readonly ShipmentKind[] = ['ad', 'letter', 'registered'];
const LIGHT: readonly ShipmentKind[] = [...MAIL, 'parcel'];

export const VEHICLES: Readonly<Record<VehicleType, VehicleBalance>> = {
  bike: { name: 'Fahrrad', capacity: 10, eligible: MAIL, speedPercent: 100, purchaseCost: 5_000, runningCost: 4, travelCost: 1 },
  cargoBike: { name: 'Lastenrad', capacity: 24, eligible: LIGHT, speedPercent: 90, purchaseCost: 10_000, runningCost: 7, travelCost: 1 },
  van: { name: 'Lieferwagen', capacity: 42, eligible: LIGHT, speedPercent: 130, purchaseCost: 22_000, runningCost: 12, travelCost: 2 },
  truck: { name: 'Lkw', capacity: 72, eligible: [...LIGHT, 'freight'], speedPercent: 110, purchaseCost: 34_000, runningCost: 20, travelCost: 3 },
};

export const START_FLEET: readonly VehicleType[] = ['bike', 'cargoBike', 'van', 'truck'];
