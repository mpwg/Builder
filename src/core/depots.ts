import { SHIPMENTS } from './balance';
import { CENTER_ID } from './map';
import type { DepotState, DepotView, GameState, ShipmentBatch, VehicleState } from './model';

export function isAccepting(depot: DepotState | undefined): boolean {
  return !!depot?.open && !depot.closing;
}

export function usedVolume(batches: readonly ShipmentBatch[]): number {
  return batches.reduce((total, { kind, quantity }) => total + SHIPMENTS[kind].volume * quantity, 0);
}

export function countOccupiedBays(vehicles: readonly VehicleState[], depotId: string): number {
  return vehicles.filter((vehicle) => (
    (vehicle.phase === 'loading' && vehicle.plan.sourceId === depotId) ||
    (vehicle.phase === 'servicing' && vehicle.plan.kind === 'transfer' && vehicle.plan.destinationId === depotId)
  )).length;
}

export function depotUsed(state: GameState, depotId: string): number {
  return usedVolume(state.waiting.filter((batch) => batch.depotId === depotId));
}

export function depotReserved(state: GameState, depotId: string): number {
  let reserved = 0;
  for (const vehicle of state.vehicles) {
    if (!('plan' in vehicle) || vehicle.plan.kind !== 'transfer' || vehicle.plan.destinationId !== depotId) continue;
    if ('reserved' in vehicle) reserved += usedVolume(vehicle.reserved);
    if ('cargo' in vehicle) reserved += usedVolume(vehicle.cargo);
  }
  return reserved;
}

export function availableSpace(state: GameState, depotId: string): number {
  const depot = state.depots.find(({ id }) => id === depotId)!;
  if (depot.capacity === null) return Infinity;
  return depot.capacity - depotUsed(state, depotId) - depotReserved(state, depotId);
}

export function readDepot(state: GameState, depot: DepotState): DepotView {
  return {
    ...depot,
    used: depotUsed(state, depot.id),
    reserved: depotReserved(state, depot.id),
    busyBays: countOccupiedBays(state.vehicles, depot.id),
  };
}

export function putInDepot(waiting: readonly ShipmentBatch[], cargo: readonly ShipmentBatch[], depotId: string): readonly ShipmentBatch[] {
  const next = [...waiting];
  for (const batch of cargo) {
    const index = next.findIndex((entry) => entry.id === batch.id && entry.depotId === depotId);
    if (index < 0) next.push({ ...batch, depotId });
    else next[index] = { ...next[index], quantity: next[index].quantity + batch.quantity };
  }
  return next;
}

export function settleDepotClosures(state: GameState): GameState {
  if (!state.depots.some(({ closing }) => closing)) return state;
  const depots = state.depots.map((depot) => {
    if (!depot.closing || depot.id === CENTER_ID) return depot;
    const incomingVehicle = state.vehicles.some((vehicle) => (
      vehicle.homeId === depot.id ||
      vehicle.pendingHomeId === depot.id ||
      ('plan' in vehicle && vehicle.plan.sourceId === depot.id)
    ));
    if (incomingVehicle || depotUsed(state, depot.id) || depotReserved(state, depot.id) || countOccupiedBays(state.vehicles, depot.id)) {
      return depot;
    }
    return { ...depot, open: false, closing: false };
  });
  if (depots.every((depot, index) => depot === state.depots[index])) return state;
  return { ...state, depots };
}
