export interface MapNode {
  readonly id: string;
  readonly name: string;
  readonly kind: 'center' | 'district' | 'depot';
  readonly x: number;
  readonly y: number;
}

export interface MapEdge {
  readonly from: string;
  readonly to: string;
  readonly ticks: number;
}

export interface GameMap {
  readonly nodes: readonly MapNode[];
  readonly edges: readonly MapEdge[];
}


export type ShipmentKind = 'ad' | 'letter' | 'registered' | 'parcel' | 'freight';
export type ServiceClass = 'standard' | 'express';
export type VehicleType = 'bike' | 'cargoBike' | 'van' | 'truck';

export interface ShipmentBatch {
  readonly id: string;
  readonly depotId: string;
  readonly districtId: string;
  readonly arrivalTick: number;
  readonly deadlineTick: number;
  readonly kind: ShipmentKind;
  readonly serviceClass: ServiceClass;
  readonly quantity: number;
}

export interface ShipmentSummary {
  readonly kind: ShipmentKind;
  readonly serviceClass: ServiceClass;
  readonly quantity: number;
  readonly overdue: number;
}

export interface DistrictState {
  readonly id: string;
  readonly depotId: string;
  readonly priority: number;
}

export interface DepotState {
  readonly id: string;
  readonly open: boolean;
  readonly closing: boolean;
  readonly capacity: number | null;
  readonly loadingBays: number;
  readonly bundleWaitTicks: number;
}

export interface RouteLeg {
  readonly from: string;
  readonly to: string;
  readonly ticks: number;
}

export interface Travel {
  readonly legs: readonly RouteLeg[];
  readonly startsAt: number;
  readonly endsAt: number;
}

export type TourPlan =
  | { readonly kind: 'delivery'; readonly sourceId: string; readonly stops: readonly string[] }
  | { readonly kind: 'transfer'; readonly sourceId: string; readonly destinationId: string };

export type VehiclePhase = 'idle' | 'loading' | 'outbound' | 'servicing' | 'returning' | 'transfer' | 'relocating';

interface VehicleIdentity {
  readonly id: string;
  readonly type: VehicleType;
  readonly homeId: string;
  readonly template: readonly string[] | null;
  readonly pendingHomeId: string | null;
}

type VehicleTask =
  | { readonly phase: 'idle'; readonly waitReason: string | null }
  | { readonly phase: 'loading'; readonly plan: TourPlan; readonly reserved: readonly ShipmentBatch[]; readonly endsAt: number }
  | {
    readonly phase: 'transfer';
    readonly pickup: true;
    readonly plan: Extract<TourPlan, { kind: 'transfer' }>;
    readonly reserved: readonly ShipmentBatch[];
    readonly travel: Travel;
  }
  | {
    readonly phase: 'outbound' | 'transfer';
    readonly pickup: false;
    readonly plan: TourPlan;
    readonly cargo: readonly ShipmentBatch[];
    readonly travel: Travel;
  }
  | {
    readonly phase: 'servicing';
    readonly plan: TourPlan;
    readonly cargo: readonly ShipmentBatch[];
    readonly endsAt: number;
  }
  | { readonly phase: 'returning' | 'relocating'; readonly travel: Travel };

export type VehicleState = VehicleIdentity & VehicleTask;

export interface GameState {
  readonly seed: string;
  readonly tick: number;
  readonly revision: number;
  readonly appliedCommandIds: readonly string[];
  readonly map: GameMap;
  readonly randomState: number;
  readonly nextArrivalTick: number;
  readonly arrivalCount: number;
  readonly waiting: readonly ShipmentBatch[];
  readonly districts: readonly DistrictState[];
  readonly depots: readonly DepotState[];
  readonly vehicles: readonly VehicleState[];
  readonly delivered: Readonly<Record<string, readonly ShipmentSummary[]>>;
  readonly budget: number;
  readonly revenue: number;
  readonly expenses: number;
  readonly operatingExpenses: number;
  readonly investmentExpenses: number;
  readonly latestEvent: string;
}

export interface VehicleView {
  readonly id: string;
  readonly type: VehicleType;
  readonly homeId: string;
  readonly x: number;
  readonly y: number;
  readonly phase: VehiclePhase;
  readonly targetId: string | null;
  readonly cargo: number;
  readonly template: readonly string[] | null;
  readonly stops: readonly string[];
  readonly waitReason: string | null;
}

export interface DistrictView extends DistrictState {
  readonly waiting: readonly ShipmentSummary[];
  readonly delivered: readonly ShipmentSummary[];
}

export interface DepotView extends DepotState {
  readonly used: number;
  readonly reserved: number;
  readonly busyBays: number;
}

export interface GameView {
  readonly seed: string;
  readonly tick: number;
  readonly revision: number;
  readonly map: GameMap;
  readonly districts: readonly DistrictView[];
  readonly depots: readonly DepotView[];
  readonly vehicles: readonly VehicleView[];
  readonly revenue: number;
  readonly expenses: number;
  readonly budget: number;
  readonly investment: number;
  readonly operatingExpenses: number;
  readonly latestEvent: string;
  readonly problems: readonly { readonly nodeId: string; readonly message: string }[];
}

export type Command =
  | { readonly type: 'open-depot' | 'close-depot'; readonly depotId: string }
  | { readonly type: 'buy-vehicle'; readonly depotId: string; readonly vehicleType: VehicleType }
  | { readonly type: 'relocate-vehicle'; readonly vehicleId: string; readonly depotId: string }
  | { readonly type: 'assign-district'; readonly districtId: string; readonly depotId: string }
  | { readonly type: 'set-priority'; readonly districtId: string; readonly priority: number }
  | { readonly type: 'set-bundle-wait'; readonly depotId: string; readonly ticks: number }
  | { readonly type: 'set-template'; readonly vehicleId: string; readonly districtIds: readonly string[] | null };

export interface CommandEnvelope {
  readonly id: string;
  readonly baseRevision: number;
  readonly command: Command;
}

export type CommandResult =
  | { readonly ok: true; readonly state: GameState }
  | { readonly ok: false; readonly state: GameState; readonly reason: string };
