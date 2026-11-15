import { LOADING_TICKS, UNLOADING_TICKS, VEHICLES } from './balance';
import { countOccupiedBays, putInDepot, settleDepotClosures } from './depots';
import { CENTER_ID, compareIds, getMapNode } from './map';
import type { GameState, ShipmentBatch, TourPlan, VehicleState } from './model';
import { isStillRoutable, planLoad, shipmentKey } from './planning';
import { beginTravel } from './routes';
import { bookDelivery, deliveryServiceTicks, describeShipments } from './shipments';

export function chargeOperation(state: GameState, cost: number): GameState {
  return {
    ...state, budget: state.budget - cost, expenses: state.expenses + cost, operatingExpenses: state.operatingExpenses + cost,
  };
}

function identity({ id, type, homeId, pendingHomeId, template }: VehicleState) {
  return { id, type, homeId, pendingHomeId, template };
}

function replace(state: GameState, vehicle: VehicleState, latestEvent = state.latestEvent): GameState {
  return {
    ...state,
    vehicles: state.vehicles.map((item) => item.id === vehicle.id ? vehicle : item),
    latestEvent,
  };
}

function nextStop(plan: TourPlan): string {
  return plan.kind === 'delivery' ? plan.stops[0] : plan.destinationId;
}

function startTrip(state: GameState, vehicle: VehicleState, from: string, plan: TourPlan, cargo: readonly ShipmentBatch[]) {
  const to = nextStop(plan);
  const travel = beginTravel(state.map, from, to, vehicle.type, state.tick);
  return replace(chargeOperation(state, travelCost(vehicle, travel.endsAt - state.tick)), {
    ...identity(vehicle), phase: plan.kind === 'delivery' ? 'outbound' : 'transfer', pickup: false, plan, cargo, travel,
  }, plan.kind === 'transfer'
    ? `${VEHICLES[vehicle.type].name} bringt ${describeShipments(cargo)} von ${getMapNode(state.map, from).name} nach ${getMapNode(state.map, to).name}.`
    : `${VEHICLES[vehicle.type].name} mit ${describeShipments(cargo)} nach ${getMapNode(state.map, to).name} unterwegs.`);
}

function travelCost(vehicle: VehicleState, ticks: number) {
  return VEHICLES[vehicle.type].travelCost * ticks;
}

function returnHome(state: GameState, vehicle: VehicleState, from: string, latestEvent = state.latestEvent) {
  if (from === vehicle.homeId) {
    return replace(state, { ...identity(vehicle), phase: 'idle', waitReason: null }, latestEvent);
  }
  const travel = beginTravel(state.map, from, vehicle.homeId, vehicle.type, state.tick);
  return replace(chargeOperation(state, travelCost(vehicle, travel.endsAt - state.tick)), {
    ...identity(vehicle), phase: 'returning', travel,
  }, latestEvent);
}

function dispatchVehicle(state: GameState, vehicle: VehicleState): GameState {
  const { phase, homeId } = vehicle;
  const { tick, map } = state;
  const metadata = identity(vehicle);
  const canUseBay = (depotId: string) => countOccupiedBays(state.vehicles, depotId) <
    state.depots.find(({ id }) => id === depotId)!.loadingBays;

  switch (phase) {
    case 'idle': {
      if (vehicle.pendingHomeId && vehicle.pendingHomeId !== homeId) {
        const travel = beginTravel(map, homeId, vehicle.pendingHomeId, vehicle.type, tick);
        return replace(chargeOperation(state, travelCost(vehicle, travel.endsAt - tick)), {
          ...metadata, phase: 'relocating', travel,
        }, `${VEHICLES[vehicle.type].name} wird nach ${getMapNode(map, vehicle.pendingHomeId).name} überführt.`);
      }
      const plan = planLoad(state, vehicle, canUseBay);
      if (!plan || typeof plan === 'string') {
        return vehicle.waitReason === plan ? state : replace(state, { ...metadata, phase: 'idle', waitReason: plan });
      }
      if (plan.plan.kind === 'transfer' && plan.plan.sourceId !== homeId) {
        const travel = beginTravel(map, homeId, plan.plan.sourceId, vehicle.type, tick);
        return replace(chargeOperation(state, travelCost(vehicle, travel.endsAt - tick)), {
          ...metadata, plan: plan.plan, reserved: plan.reserved, phase: 'transfer', pickup: true, travel,
        }, `${VEHICLES[vehicle.type].name} holt Sendungen in ${getMapNode(map, plan.plan.sourceId).name} ab.`);
      }
      return replace(state, { ...metadata, ...plan, phase: 'loading', endsAt: tick + LOADING_TICKS });
    }
    case 'loading': {
      const { plan, reserved } = vehicle;
      if (!isStillRoutable(state, plan, reserved)) return returnHome(state, vehicle, plan.sourceId);
      if (tick < vehicle.endsAt) return state;
      const quantities = new Map(reserved.map((batch) => [shipmentKey(batch), batch.quantity]));
      const waiting = state.waiting.flatMap((batch) => {
        const quantity = batch.quantity - (quantities.get(shipmentKey(batch)) ?? 0);
        return quantity ? [{ ...batch, quantity }] : [];
      });
      return startTrip({ ...state, waiting }, vehicle, plan.sourceId, plan, reserved);
    }
    case 'transfer':
    case 'outbound': {
      if (tick < vehicle.travel.endsAt) return state;
      if (vehicle.pickup) {
        const { plan, reserved } = vehicle;
        if (!isStillRoutable(state, plan, reserved)) return returnHome(state, vehicle, plan.sourceId);
        if (!canUseBay(plan.sourceId)) return state;
        return replace(state, { ...metadata, phase: 'loading', plan, reserved, endsAt: tick + LOADING_TICKS });
      }
      const { plan, cargo } = vehicle;
      const stop = nextStop(plan);
      if (plan.kind === 'transfer' && !canUseBay(stop)) return state;
      const serviceTicks = plan.kind === 'transfer'
        ? UNLOADING_TICKS + cargo.length
        : deliveryServiceTicks(cargo, stop);
      return replace(state, { ...metadata, phase: 'servicing', plan, cargo, endsAt: tick + serviceTicks });
    }
    case 'servicing': {
      if (tick < vehicle.endsAt) return state;
      const { plan, cargo } = vehicle;
      const stop = nextStop(plan);
      const name = getMapNode(map, stop).name;
      if (plan.kind === 'transfer') {
        const waiting = putInDepot(state.waiting, cargo, stop);
        return returnHome({ ...state, waiting }, vehicle, stop, `${describeShipments(cargo)} in ${name} umgeschlagen.`);
      }
      const delivered = cargo.filter(({ districtId }) => districtId === stop);
      const booked = bookDelivery(state, stop, delivered);
      const latestEvent = `${describeShipments(delivered)} in ${name} zugestellt.`;
      if (plan.stops.length === 1) return returnHome(booked, vehicle, stop, latestEvent);
      const next = startTrip(booked, vehicle, stop, { ...plan, stops: plan.stops.slice(1) },
        cargo.filter(({ districtId }) => districtId !== stop));
      return { ...next, latestEvent };
    }
    case 'returning':
      if (tick < vehicle.travel.endsAt) return state;
      return replace(state, { ...metadata, phase: 'idle', waitReason: null });
    case 'relocating': {
      if (tick < vehicle.travel.endsAt) return state;
      const destinationId = vehicle.travel.legs.at(-1)!.to;
      const closing = state.depots.find(({ id }) => id === destinationId)?.closing;
      return replace(state, {
        ...metadata, phase: 'idle', homeId: destinationId, pendingHomeId: closing ? CENTER_ID : null, waitReason: null,
      }, `${VEHICLES[vehicle.type].name} ist jetzt in ${getMapNode(map, destinationId).name} stationiert.`);
    }
  }
}

export function dispatch(state: GameState): GameState {
  let next = state;
  // Earlier IDs reserve stock, storage and bays first. A vehicle is advanced at most once.
  const ids = state.vehicles.map(({ id }) => id).sort(compareIds);
  for (const id of ids) {
    next = dispatchVehicle(next, next.vehicles.find((vehicle) => vehicle.id === id)!);
  }
  return settleDepotClosures(next);
}
