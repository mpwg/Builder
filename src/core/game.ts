import {
  ARRIVAL_INTERVAL_TICKS, ARRIVAL_KINDS, CENTER_LOADING_BAYS, DEPOT_CAPACITY, DEPOT_LOADING_BAYS,
  FIRST_ARRIVAL_TICKS, RUNNING_COST_INTERVAL, SHIPMENTS, START_BUDGET, START_FLEET, VEHICLES,
} from './balance';
import { createVehicle } from './commands';
import { chargeOperation, dispatch } from './dispatch';
import { CENTER_ID, createMap, getMapNode } from './map';
import type { GameState, ShipmentBatch } from './model';
import { randomInteger, seedNumber } from './random';
import { describeShipments } from './shipments';

export { applyCommand } from './commands';
export { readView } from './view';

export function createGame(seed: string): GameState {
  const [nextArrivalTick, randomState] = randomInteger(
    seedNumber(`Eingang:${seed}`), FIRST_ARRIVAL_TICKS.minimum, FIRST_ARRIVAL_TICKS.maximum,
  );
  const map = createMap(seed);
  return {
    seed, map, tick: 0, revision: 0, appliedCommandIds: [], randomState,
    nextArrivalTick, arrivalCount: 0, waiting: [], delivered: {},
    districts: map.nodes.filter(({ kind }) => kind === 'district').map(({ id }) => ({ id, depotId: CENTER_ID, priority: 1 })),
    depots: map.nodes.filter(({ kind }) => kind !== 'district').map(({ id }) => ({
      id, open: id === CENTER_ID, closing: false, capacity: id === CENTER_ID ? null : DEPOT_CAPACITY,
      loadingBays: id === CENTER_ID ? CENTER_LOADING_BAYS : DEPOT_LOADING_BAYS, bundleWaitTicks: 0,
    })),
    vehicles: START_FLEET.map((type, index) => createVehicle(type, CENTER_ID, index + 1)),
    budget: START_BUDGET, revenue: 0, expenses: 0, operatingExpenses: 0, investmentExpenses: 0,
    latestEvent: 'Das Postzentrum wartet auf den ersten Eingang.',
  };
}

function receiveShipment(state: GameState): GameState {
  const { tick, districts, arrivalCount } = state;
  if (tick !== state.nextArrivalTick) return state;
  const kind = ARRIVAL_KINDS[arrivalCount % ARRIVAL_KINDS.length];
  const { minimumBatch, maximumBatch, deadline, expressDeadline } = SHIPMENTS[kind];
  const [targetIndex, afterTarget] = randomInteger(state.randomState, 0, districts.length - 1);
  const [quantity, afterQuantity] = randomInteger(afterTarget, minimumBatch, maximumBatch);
  const [interval, randomState] = randomInteger(
    afterQuantity, ARRIVAL_INTERVAL_TICKS.minimum, ARRIVAL_INTERVAL_TICKS.maximum,
  );
  const districtId = districts[targetIndex].id;
  const express = expressDeadline !== null && Math.floor(arrivalCount / ARRIVAL_KINDS.length) % 2 === 1;
  const batch: ShipmentBatch = {
    id: `eingang-${arrivalCount + 1}`, depotId: CENTER_ID, arrivalTick: tick, districtId, kind, quantity,
    serviceClass: express ? 'express' : 'standard', deadlineTick: tick + (express ? expressDeadline : deadline),
  };
  return {
    ...state, randomState, nextArrivalTick: tick + interval, arrivalCount: arrivalCount + 1,
    waiting: [...state.waiting, batch],
    latestEvent: `${describeShipments([batch])} für ${getMapNode(state.map, districtId).name} im Postzentrum eingegangen.`,
  };
}

export function step(state: GameState): GameState {
  let next = receiveShipment({ ...state, tick: state.tick + 1 });
  if (next.tick % RUNNING_COST_INTERVAL === 0) {
    next = chargeOperation(next, next.vehicles.reduce((sum, { type }) => sum + VEHICLES[type].runningCost, 0));
  }
  return dispatch(next);
}
