import { AGING_TICKS, BASE_SERVICE_TICKS, DEADLINE_BUFFER_TICKS, LOADING_TICKS, SHIPMENTS, UNLOADING_TICKS, VEHICLES } from './balance';
import { availableSpace } from './depots';
import { CENTER_ID, compareIds, getMapNode } from './map';
import type { GameState, ShipmentBatch, TourPlan, VehicleState } from './model';
import { getRouteTravelTicks } from './routes';
import { deliveryServiceTicks } from './shipments';

export interface PlannedLoad {
  readonly plan: TourPlan;
  readonly reserved: readonly ShipmentBatch[];
}

export function primaryDepot(state: GameState, batch: ShipmentBatch): string {
  return state.districts.find(({ id }) => id === batch.districtId)!.depotId;
}

function orderKey(a: ShipmentBatch, b: ShipmentBatch): number {
  return a.arrivalTick - b.arrivalTick || compareIds(a.id, b.id) || compareIds(a.depotId, b.depotId);
}

export function shipmentKey({ depotId, id }: ShipmentBatch): string {
  return `${depotId}:${id}`;
}

function freeStock(state: GameState): ShipmentBatch[] {
  const reserved = new Map<string, number>();
  for (const vehicle of state.vehicles) {
    if (!('reserved' in vehicle)) continue;
    for (const batch of vehicle.reserved) {
      const key = shipmentKey(batch);
      reserved.set(key, (reserved.get(key) ?? 0) + batch.quantity);
    }
  }
  return state.waiting.flatMap((batch) => {
    const quantity = batch.quantity - (reserved.get(shipmentKey(batch)) ?? 0);
    return quantity > 0 ? [{ ...batch, quantity }] : [];
  });
}

function routeType(
  state: GameState, vehicle: VehicleState, batch: ShipmentBatch, invalidTemplate: boolean,
): { kind: 'delivery' | 'transfer'; sourceId: string; targetId: string } | null {
  const { homeId, template } = vehicle;
  const depotId = primaryDepot(state, batch);
  const isRecovery = batch.depotId !== CENTER_ID && batch.depotId !== depotId &&
    (homeId === CENTER_ID || homeId === batch.depotId);
  const isEvacuation = isRecovery && state.depots.some((depot) => depot.id === batch.depotId && depot.closing);
  if (isEvacuation) return { kind: 'transfer', sourceId: batch.depotId, targetId: CENTER_ID };
  if (template !== null && (!template.includes(batch.districtId) || invalidTemplate)) return null;
  if (batch.depotId === homeId && depotId === homeId) {
    return { kind: 'delivery', sourceId: homeId, targetId: batch.districtId };
  }
  if (template !== null) return null;
  if (homeId === CENTER_ID && batch.depotId === CENTER_ID && depotId !== CENTER_ID) {
    return { kind: 'transfer', sourceId: CENTER_ID, targetId: depotId };
  }
  if (isRecovery) return { kind: 'transfer', sourceId: batch.depotId, targetId: CENTER_ID };
  return null;
}

export function isStillRoutable(state: GameState, plan: TourPlan, reserved: readonly ShipmentBatch[]): boolean {
  return reserved.every((batch) => {
    const depotId = primaryDepot(state, batch);
    if (plan.kind === 'delivery') return depotId === plan.sourceId;
    if (plan.sourceId === CENTER_ID) return depotId === plan.destinationId;
    return depotId !== plan.sourceId;
  });
}

export function planLoad(
  state: GameState, vehicle: VehicleState, baysAvailable: (depotId: string) => boolean,
): PlannedLoad | string | null {
  const { map, tick } = state;
  const { homeId, template, type } = vehicle;
  const { eligible, capacity } = VEHICLES[type];
  const home = state.depots.find(({ id }) => id === homeId)!;
  const invalidTemplate = template?.some((id) =>
    !state.districts.some((district) => district.id === id && district.depotId === homeId)) ?? false;

  const depotSpace = new Map<string, number>();
  const candidates = freeStock(state).flatMap((batch) => {
    if (!eligible.includes(batch.kind)) return [];
    const route = routeType(state, vehicle, batch, invalidTemplate);
    if (!route) return [];
    const pickup = getRouteTravelTicks(map, homeId, route.sourceId, type);
    const distance = pickup + getRouteTravelTicks(map, route.sourceId, route.targetId, type);
    const service = SHIPMENTS[batch.kind].serviceTicks * Math.min(batch.quantity, Math.floor(capacity / SHIPMENTS[batch.kind].volume));
    const remaining = batch.deadlineTick - tick - (LOADING_TICKS + distance + BASE_SERVICE_TICKS + service);
    const priority = state.districts.find(({ id }) => id === batch.districtId)!.priority;
    if (route.kind === 'transfer' && !depotSpace.has(route.targetId)) {
      depotSpace.set(route.targetId, availableSpace(state, route.targetId));
    }
    const finalService = route.kind === 'transfer' && route.targetId !== CENTER_ID
      ? LOADING_TICKS + UNLOADING_TICKS + getRouteTravelTicks(map, route.targetId, batch.districtId, type)
      : 0;
    return [{
      batch, route, distance, priority, remaining: remaining - finalService,
      risk: remaining - finalService <= 0 ? 2 : remaining - finalService <= DEADLINE_BUFFER_TICKS ? 1 : 0,
      aged: tick - batch.arrivalTick >= AGING_TICKS,
    }];
  });

  if (!candidates.length) {
    if (invalidTemplate) return 'Vorlage wartet: Gebietszuordnung oder Heimatdepot hat sich geändert.';
    return template !== null ? 'Vorlage wartet: Keine passenden Sendungen für ihre Halte verfügbar.' : null;
  }
  let waitMessage: string | null = null;
  const doable = candidates.filter(({ batch, route }) => {
    const { sourceId, targetId } = route;
    if (route.kind === 'transfer' && (depotSpace.get(targetId) ?? 0) < SHIPMENTS[batch.kind].volume) {
      waitMessage ??= `Lager im ${getMapNode(map, targetId).name} ausgelastet.`;
      return false;
    }
    if (sourceId === homeId && !baysAvailable(sourceId)) {
      waitMessage ??= 'Alle Ladeplätze sind belegt.';
      return false;
    }
    return true;
  });
  if (!doable.length) return waitMessage;

  // Equally urgent ordinary batches use district preference and distance. A long-waiting
  // batch wins against a fresh batch without an exposed deadline.
  type Candidate = typeof doable[number];
  function compareCandidates(a: Candidate, b: Candidate, from: string): number {
    const distance = (candidate: Candidate) => from === homeId ? candidate.distance
      : getRouteTravelTicks(map, from, candidate.route.targetId, type);
    return b.risk - a.risk ||
      (a.risk ? a.remaining - b.remaining : Number(b.aged) - Number(a.aged)) ||
      (a.aged && b.aged ? orderKey(a.batch, b.batch) : 0) ||
      b.priority - a.priority || distance(a) - distance(b) || orderKey(a.batch, b.batch);
  }

  doable.sort((a, b) => compareCandidates(a, b, homeId));
  const groups = new Map<string, Candidate[]>();
  for (const candidate of doable) {
    const { kind, sourceId, targetId } = candidate.route;
    const key = kind === 'delivery' ? kind : `${sourceId}:${targetId}`;
    const group = groups.get(key);
    if (group) group.push(candidate);
    else groups.set(key, [candidate]);
  }

  function orderStops(selectedStops: ReadonlyMap<string, Candidate>): readonly string[] {
    if (template !== null) return template.filter((id) => selectedStops.has(id));
    const remaining = new Map(selectedStops);
    const stops: string[] = [];
    let at = homeId;
    while (remaining.size) {
      const [stop] = [...remaining].sort(([, a], [, b]) => compareCandidates(a, b, at))[0];
      stops.push(stop);
      remaining.delete(stop);
      at = stop;
    }
    return stops;
  }

  function deliverySchedule(stops: readonly string[], cargo: readonly ShipmentBatch[]): ReadonlyMap<string, number> {
    const completion = new Map<string, number>();
    let clock = tick + LOADING_TICKS;
    let at = homeId;
    for (const stop of stops) {
      clock += getRouteTravelTicks(map, at, stop, type) + deliveryServiceTicks(cargo, stop);
      completion.set(stop, clock);
      at = stop;
    }
    return completion;
  }

  for (const group of groups.values()) {
    const { sourceId, targetId, kind } = group[0].route;
    const targetSpace = kind === 'transfer' ? depotSpace.get(targetId)! : Infinity;
    const loadLimit = Math.min(capacity, targetSpace);
    const volume = group.reduce((total, { batch }) => total + batch.quantity * SHIPMENTS[batch.kind].volume, 0);
    if (
      kind === 'delivery' || (kind === 'transfer' && sourceId === CENTER_ID)
    ) {
      if (volume < loadLimit && group.every(({ batch, risk }) => risk === 0 && tick - batch.arrivalTick < home.bundleWaitTicks)) {
        waitMessage ??= 'Wartet auf Bündelung oder Ablauf der Bündelwartezeit.';
        continue;
      }
    }

    // Select pieces by urgency before choosing the visit order. Otherwise fresh
    // mail at the first stop could displace urgent pieces for a later stop.
    const reserved: ShipmentBatch[] = [];
    const selectedStops = new Map<string, Candidate>();
    const protectedBatches: ShipmentBatch[] = [];
    let room = loadLimit;
    for (const candidate of group) {
      const { batch, route } = candidate;
      const unit = SHIPMENTS[batch.kind].volume;
      const quantity = Math.min(batch.quantity, Math.floor(room / unit));
      if (quantity < 1) continue;
      const selection = { ...batch, quantity };
      const isNewStop = !selectedStops.has(route.targetId);
      if (isNewStop) selectedStops.set(route.targetId, candidate);
      reserved.push(selection);

      // A later search choice may add handling or another stop. Keep threatened,
      // still achievable deadlines intact unless the player set an explicit order.
      if (kind === 'delivery' && template === null && (protectedBatches.length || candidate.risk > 0)) {
        const completion = deliverySchedule(orderStops(selectedStops), reserved);
        if (protectedBatches.some((item) => completion.get(item.districtId)! > item.deadlineTick)) {
          reserved.pop();
          if (isNewStop) selectedStops.delete(route.targetId);
          continue;
        }
        if (candidate.risk > 0 && completion.get(batch.districtId)! <= batch.deadlineTick) {
          protectedBatches.push(selection);
        }
      }

      room -= quantity * unit;
      if (room === 0) break;
    }

    if (kind === 'transfer') return { plan: { kind, sourceId, destinationId: targetId }, reserved };
    return { plan: { kind, sourceId, stops: orderStops(selectedStops) }, reserved };
  }

  return waitMessage;
}
