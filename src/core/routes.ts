import { VEHICLES } from './balance';
import { findRoute, getMapNode } from './map';
import type { GameMap, Travel, VehicleType } from './model';

export function getRouteTravelTicks(map: GameMap, from: string, to: string, type: VehicleType): number {
  return findRoute(map, from, to).reduce((ticks, leg) => ticks + legTicks(leg.ticks, type), 0);
}

function legTicks(ticks: number, type: VehicleType): number {
  return Math.ceil(ticks * 100 / VEHICLES[type].speedPercent);
}

export function beginTravel(map: GameMap, from: string, to: string, type: VehicleType, tick: number): Travel {
  const legs = findRoute(map, from, to).map((leg) => ({ ...leg, ticks: legTicks(leg.ticks, type) }));
  return { legs, startsAt: tick, endsAt: tick + legs.reduce((ticks, leg) => ticks + leg.ticks, 0) };
}

export function readPosition(map: GameMap, travel: Travel, tick: number) {
  let elapsed = tick - travel.startsAt;
  for (const { from, to, ticks } of travel.legs) {
    if (elapsed <= ticks) {
      const a = getMapNode(map, from);
      const b = getMapNode(map, to);
      const fraction = Math.max(0, elapsed) / ticks;
      return { x: a.x + (b.x - a.x) * fraction, y: a.y + (b.y - a.y) * fraction };
    }
    elapsed -= ticks;
  }
  return getMapNode(map, travel.legs.at(-1)!.to);
}
