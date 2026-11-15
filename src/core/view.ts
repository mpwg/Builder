import { SHIPMENTS, VEHICLES } from './balance';
import { readDepot } from './depots';
import { CENTER_ID, getMapNode } from './map';
import type { DepotView, GameState, GameView, ShipmentBatch, VehicleState, VehicleView } from './model';
import { readPosition } from './routes';
import { summarize } from './shipments';

function readVehicle(state: GameState, vehicle: VehicleState): VehicleView {
  const { map, tick } = state;
  const { id, type, homeId, phase, template, pendingHomeId } = vehicle;
  const plan = 'plan' in vehicle ? vehicle.plan : null;
  const stops = plan?.kind === 'delivery' ? plan.stops
    : plan && phase === 'transfer' && vehicle.pickup ? [plan.sourceId, plan.destinationId]
    : plan ? [plan.destinationId] : [];
  const travel = 'travel' in vehicle ? vehicle.travel : null;
  const targetId = travel?.legs.at(-1)?.to ?? stops[0] ?? null;
  const at = phase === 'loading' ? vehicle.plan.sourceId : phase === 'servicing' ? targetId! : homeId;
  const { x, y } = travel ? readPosition(map, travel, tick) : getMapNode(map, at);
  const waitReason = phase === 'idle' && vehicle.waitReason ? vehicle.waitReason
    : phase === 'transfer' && tick >= vehicle.travel.endsAt ? 'Wartet auf einen freien Ladeplatz.'
    : pendingHomeId && phase !== 'relocating' ? `Überführung nach ${getMapNode(map, pendingHomeId).name} nach Rückkehr.`
    : null;
  return {
    id, type, homeId, x, y, phase, targetId, template, stops, waitReason,
    cargo: 'cargo' in vehicle ? vehicle.cargo.reduce((total, shipment) => total + shipment.quantity, 0) : 0,
  };
}

function readProblems(
  state: GameState, depots: readonly DepotView[], vehicles: readonly VehicleView[], waiting: readonly ShipmentBatch[],
): GameView['problems'] {
  const problems = new Map<string, { nodeId: string; message: string }>();
  const record = (nodeId: string, message: string) => {
    problems.set(`${nodeId}:${message}`, { nodeId, message });
  };

  for (const depot of depots) {
    if (depot.closing) record(depot.id, 'Depot wird geräumt. Laufende Aufträge werden abgeschlossen; verbleibende Sendungen gehen über das Postzentrum.');
  }

  for (const batch of waiting) {
    const assigned = state.districts.find(({ id }) => id === batch.districtId)!.depotId;
    const depot = depots.find(({ id }) => id === assigned)!;
    if (
      batch.depotId === CENTER_ID && assigned !== CENTER_ID && depot.capacity !== null &&
      depot.capacity - depot.used - depot.reserved < SHIPMENTS[batch.kind].volume
    ) record(assigned, 'Lager ist ausgelastet oder bereits für ankommende Sendungen reserviert.');

    const needsTransfer = batch.depotId !== assigned;
    const homes = needsTransfer ? [CENTER_ID, batch.depotId] : [assigned];
    const suitable = vehicles.filter((vehicle) =>
      homes.includes(vehicle.homeId) && VEHICLES[vehicle.type].eligible.includes(batch.kind));
    if (!suitable.length) {
      const capability = batch.kind === 'freight' ? 'Kein Lkw für Speditionsware' : `Kein geeignetes Fahrzeug für ${SHIPMENTS[batch.kind].name}`;
      if (depot.open) record(batch.districtId, `${capability} ${needsTransfer ? 'für den Umschlag' : `in ${getMapNode(state.map, assigned).name}`}.`);
    } else if (
      !depots.some(({ id, closing }) => id === batch.depotId && closing) &&
      suitable.every(({ template }) => template !== null && (needsTransfer || !template.includes(batch.districtId)))
    ) {
      record(batch.districtId, 'Vorlagen binden alle geeigneten Fahrzeuge.');
    }

    if (batch.deadlineTick < state.tick) {
      record(batch.districtId, 'Sendungen sind überfällig. Prüfe Fahrzeuge, Ladeplätze und Zuständigkeit.');
    }
  }

  for (const vehicle of vehicles) {
    if (vehicle.waitReason?.includes('Ladepl')) {
      const nodeId = vehicle.phase === 'transfer' && vehicle.targetId ? vehicle.targetId : vehicle.homeId;
      record(nodeId, 'Ladeplätze ausgelastet.');
    }
  }
  return [...problems.values()];
}

export function readView(state: GameState): GameView {
  const { map, seed, tick, revision, budget, expenses, revenue, investmentExpenses, operatingExpenses, latestEvent } = state;
  const vehicles = state.vehicles.map((vehicle) => readVehicle(state, vehicle));
  const depots = state.depots.map((depot) => readDepot(state, depot));
  const openShipments = [...state.waiting, ...state.vehicles.flatMap((vehicle) => 'cargo' in vehicle ? vehicle.cargo : [])];
  const districts = state.districts.map((district) => ({
    ...district,
    waiting: summarize([], openShipments.filter((batch) => batch.districtId === district.id), tick),
    delivered: state.delivered[district.id] ?? [],
  }));
  return {
    map, seed, tick, revision, budget, expenses, investment: investmentExpenses, operatingExpenses, revenue, latestEvent,
    depots, vehicles, districts, problems: readProblems(state, depots, vehicles, state.waiting),
  };
}
