import { BASE_SERVICE_TICKS, EXPRESS_REVENUE_PERCENT, SHIPMENTS } from './balance';
import type { GameState, ShipmentBatch, ShipmentSummary } from './model';

export function describeShipments(batches: readonly ShipmentBatch[]): string {
  const groups = summarize([], batches, -1);
  return groups.map(({ kind, quantity, serviceClass }) => {
    const name = kind === 'letter' && quantity === 1 ? 'Brief' : SHIPMENTS[kind].name;
    const prefix = serviceClass === 'express' ? 'Express: ' : '';
    return `${prefix}${quantity} ${name}`;
  }).join(', ');
}

export function deliveryServiceTicks(cargo: readonly ShipmentBatch[], stop: string): number {
  return BASE_SERVICE_TICKS + cargo.reduce((total, batch) =>
    total + (batch.districtId === stop ? batch.quantity * SHIPMENTS[batch.kind].serviceTicks : 0), 0);
}

export function summarize(
  previous: readonly ShipmentSummary[], batches: readonly ShipmentBatch[], tick: number,
): readonly ShipmentSummary[] {
  const result = [...previous];
  for (const { kind, serviceClass, quantity, deadlineTick } of batches) {
    const overdue = tick > deadlineTick ? quantity : 0;
    const index = result.findIndex((entry) => entry.kind === kind && entry.serviceClass === serviceClass);
    if (index < 0) result.push({ kind, serviceClass, quantity, overdue });
    else result[index] = { kind, serviceClass, quantity: result[index].quantity + quantity, overdue: result[index].overdue + overdue };
  }
  return result;
}

export function bookDelivery(state: GameState, districtId: string, batches: readonly ShipmentBatch[]): GameState {
  const income = batches.reduce((total, batch) => {
    const unitRevenue = SHIPMENTS[batch.kind].revenue;
    const rate = batch.serviceClass === 'express' ? EXPRESS_REVENUE_PERCENT : 100;
    return total + batch.quantity * Math.round(unitRevenue * rate / 100);
  }, 0);
  return {
    ...state,
    delivered: {
      ...state.delivered,
      [districtId]: summarize(state.delivered[districtId] ?? [], batches, state.tick),
    },
    revenue: state.revenue + income,
    budget: state.budget + income,
  };
}
