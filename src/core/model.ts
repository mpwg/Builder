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

export type ShipmentKind = 'letter' | 'ad';

export interface ShipmentBatch {
  readonly arrivalTick: number;
  readonly districtId: string;
  readonly kind: ShipmentKind;
  readonly quantity: number;
}

export interface ShipmentCounts {
  readonly letter: number;
  readonly ad: number;
}

export type VehicleState =
  | { readonly phase: 'idle' }
  | { readonly phase: 'loading'; readonly reservedArrivalTick: number; readonly departsAt: number }
  | {
      readonly phase: 'outbound' | 'servicing';
      readonly batch: ShipmentBatch;
      readonly travelTicks: number;
      readonly phaseEndsAt: number;
    }
  | {
      readonly phase: 'returning';
      readonly districtId: string;
      readonly travelTicks: number;
      readonly phaseEndsAt: number;
    };

export interface GameState {
  readonly seed: string;
  readonly tick: number;
  readonly map: GameMap;
  readonly randomState: number;
  readonly nextArrivalTick: number;
  readonly nextArrivalKind: ShipmentKind;
  readonly waiting: readonly ShipmentBatch[];
  readonly delivered: Readonly<Record<string, ShipmentCounts>>;
  readonly vehicle: VehicleState;
  readonly revenue: number;
  readonly latestEvent: string;
}

export type VehiclePhase = 'idle' | 'outbound' | 'servicing' | 'returning';

export interface VehicleView {
  readonly x: number;
  readonly y: number;
  readonly phase: VehiclePhase;
  readonly targetId: string | null;
  readonly cargo: number;
}

export interface DistrictView {
  readonly id: string;
  readonly lettersWaiting: number;
  readonly adsWaiting: number;
  readonly lettersDelivered: number;
  readonly adsDelivered: number;
}

export interface GameView {
  readonly seed: string;
  readonly tick: number;
  readonly map: GameMap;
  readonly vehicle: VehicleView;
  readonly districts: readonly DistrictView[];
  readonly revenue: number;
  readonly latestEvent: string;
}

export interface CommandEnvelope {
  readonly id: string;
  readonly baseRevision: number;
  readonly command: never;
}

export interface CommandResult {
  readonly ok: false;
  readonly state: GameState;
  readonly reason: string;
}
