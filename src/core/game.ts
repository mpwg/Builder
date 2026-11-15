import { ARRIVAL_INTERVAL_TICKS, FIRST_ARRIVAL_TICKS, SHIPMENTS } from './balance';
import { addShipment, describeShipment, dispatch } from './dispatch';
import { CENTER_ID, createMap, getMapNode } from './map';
import type { CommandEnvelope, CommandResult, GameState, GameView, ShipmentCounts, VehicleView } from './model';
import { randomInteger, seedNumber } from './random';

export function createGame(seed: string): GameState {
  const [nextArrivalTick, randomState] = randomInteger(
    seedNumber(`Eingang:${seed}`),
    FIRST_ARRIVAL_TICKS.minimum,
    FIRST_ARRIVAL_TICKS.maximum,
  );
  return {
    seed,
    tick: 0,
    map: createMap(seed),
    randomState,
    nextArrivalTick,
    nextArrivalKind: 'letter',
    waiting: [],
    delivered: {},
    vehicle: { phase: 'idle' },
    revenue: 0,
    latestEvent: 'Das Postzentrum wartet auf den ersten Eingang.',
  };
}

function receiveShipment(state: GameState): GameState {
  const { tick, nextArrivalKind: kind } = state;
  if (tick !== state.nextArrivalTick) return state;

  const districts = state.map.nodes.filter((node) => node.kind === 'district');
  const [targetIndex, afterTarget] = randomInteger(state.randomState, 0, districts.length - 1);
  const district = districts[targetIndex];
  if (!district) throw new Error('Das Postnetz enthält kein verfügbares Zustellgebiet.');
  const { minimumBatch, maximumBatch } = SHIPMENTS[kind];
  const [quantity, afterQuantity] = randomInteger(afterTarget, minimumBatch, maximumBatch);
  const [interval, randomState] = randomInteger(
    afterQuantity,
    ARRIVAL_INTERVAL_TICKS.minimum,
    ARRIVAL_INTERVAL_TICKS.maximum,
  );
  const batch = { arrivalTick: tick, districtId: district.id, kind, quantity };
  return {
    ...state,
    randomState,
    nextArrivalTick: tick + interval,
    nextArrivalKind: kind === 'letter' ? 'ad' : 'letter',
    waiting: [...state.waiting, batch],
    latestEvent: `${describeShipment(batch)} für ${district.name} im Postzentrum eingegangen.`,
  };
}

export function step(state: GameState): GameState {
  return dispatch(receiveShipment({ ...state, tick: state.tick + 1 }));
}

export function applyCommand(state: GameState, _command: CommandEnvelope): CommandResult {
  return { ok: false, state, reason: 'Für die erste Zustellung sind keine Spielerbefehle verfügbar.' };
}

function readVehicle(state: GameState): VehicleView {
  const { tick, map, vehicle } = state;
  const center = getMapNode(map, CENTER_ID);
  if (vehicle.phase === 'idle' || vehicle.phase === 'loading') {
    return { x: center.x, y: center.y, phase: 'idle', targetId: null, cargo: 0 };
  }

  const returning = vehicle.phase === 'returning';
  const district = getMapNode(map, returning ? vehicle.districtId : vehicle.batch.districtId);
  if (vehicle.phase === 'servicing') {
    return {
      x: district.x,
      y: district.y,
      phase: vehicle.phase,
      targetId: district.id,
      cargo: vehicle.batch.quantity,
    };
  }

  const from = returning ? district : center;
  const to = returning ? center : district;
  const progress = 1 - (vehicle.phaseEndsAt - tick) / vehicle.travelTicks;
  return {
    x: from.x + (to.x - from.x) * progress,
    y: from.y + (to.y - from.y) * progress,
    phase: vehicle.phase,
    targetId: to.id,
    cargo: returning ? 0 : vehicle.batch.quantity,
  };
}

export function readView(state: GameState): GameView {
  const waiting = new Map<string, ShipmentCounts>();
  for (const batch of state.waiting) {
    waiting.set(batch.districtId, addShipment(waiting.get(batch.districtId), batch));
  }

  const districts = state.map.nodes.filter((node) => node.kind === 'district').map(({ id }) => ({
    id,
    lettersWaiting: waiting.get(id)?.letter ?? 0,
    adsWaiting: waiting.get(id)?.ad ?? 0,
    lettersDelivered: state.delivered[id]?.letter ?? 0,
    adsDelivered: state.delivered[id]?.ad ?? 0,
  }));

  return {
    seed: state.seed,
    tick: state.tick,
    map: state.map,
    vehicle: readVehicle(state),
    districts,
    revenue: state.revenue,
    latestEvent: state.latestEvent,
  };
}
