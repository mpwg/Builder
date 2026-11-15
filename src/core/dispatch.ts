import { BASE_SERVICE_TICKS, LOADING_TICKS, SHIPMENTS } from './balance';
import { getMapNode, getTravelTicks } from './map';
import type { GameState, ShipmentBatch, ShipmentCounts } from './model';

const EMPTY_COUNTS: ShipmentCounts = { letter: 0, ad: 0 };

export function addShipment(counts: ShipmentCounts | undefined, batch: ShipmentBatch): ShipmentCounts {
  const previous = counts ?? EMPTY_COUNTS;
  return { ...previous, [batch.kind]: previous[batch.kind] + batch.quantity };
}

export function describeShipment(batch: ShipmentBatch): string {
  if (batch.kind === 'ad') return `${batch.quantity} Werbesendungen`;
  return `${batch.quantity} ${batch.quantity === 1 ? 'Brief' : 'Briefe'}`;
}

export function dispatch(state: GameState): GameState {
  const { tick, map, vehicle, waiting } = state;

  switch (vehicle.phase) {
    case 'idle': {
      const batch = waiting[0];
      if (!batch) return state;
      return {
        ...state,
        vehicle: {
          phase: 'loading',
          reservedArrivalTick: batch.arrivalTick,
          departsAt: tick + LOADING_TICKS,
        },
      };
    }
    case 'loading': {
      if (tick < vehicle.departsAt) return state;
      const [batch, ...remaining] = waiting;
      if (!batch || batch.arrivalTick !== vehicle.reservedArrivalTick) {
        throw new Error('Die reservierte Sendung fehlt im Postzentrum.');
      }
      const district = getMapNode(map, batch.districtId);
      const travelTicks = getTravelTicks(map, district.id);
      return {
        ...state,
        waiting: remaining,
        vehicle: { phase: 'outbound', batch, travelTicks, phaseEndsAt: tick + travelTicks },
        latestEvent: `Fahrrad mit ${describeShipment(batch)} nach ${district.name} unterwegs.`,
      };
    }
    case 'outbound': {
      if (tick < vehicle.phaseEndsAt) return state;
      const { batch } = vehicle;
      const district = getMapNode(map, batch.districtId);
      const serviceTicks = BASE_SERVICE_TICKS + batch.quantity * SHIPMENTS[batch.kind].serviceTicks;
      return {
        ...state,
        vehicle: { ...vehicle, phase: 'servicing', phaseEndsAt: tick + serviceTicks },
        latestEvent: `Fahrrad stellt in ${district.name} ${describeShipment(batch)} zu.`,
      };
    }
    case 'servicing': {
      if (tick < vehicle.phaseEndsAt) return state;
      const { batch, travelTicks } = vehicle;
      const district = getMapNode(map, batch.districtId);
      return {
        ...state,
        delivered: { ...state.delivered, [district.id]: addShipment(state.delivered[district.id], batch) },
        revenue: state.revenue + batch.quantity * SHIPMENTS[batch.kind].revenue,
        vehicle: { phase: 'returning', districtId: district.id, travelTicks, phaseEndsAt: tick + travelTicks },
        latestEvent: `${describeShipment(batch)} in ${district.name} zugestellt.`,
      };
    }
    case 'returning':
      if (tick < vehicle.phaseEndsAt) return state;
      return { ...state, vehicle: { phase: 'idle' }, latestEvent: 'Fahrrad wieder im Postzentrum.' };
  }
}
