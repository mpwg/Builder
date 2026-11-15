import { expect, test } from 'vitest';
import { applyCommand, createGame, readView, step } from '../../src/core/game';
import type { CommandEnvelope, GameView } from '../../src/core/model';

function totals(view: GameView) {
  return view.districts.reduce(
    (sum, district) => ({
      waiting: sum.waiting + district.lettersWaiting + district.adsWaiting,
      letters: sum.letters + district.lettersDelivered,
      ads: sum.ads + district.adsDelivered,
    }),
    { waiting: 0, letters: 0, ads: 0 },
  );
}

test('a first letter arrives, travels on an edge and is delivered within 120 ticks', () => {
  for (let index = 0; index < 128; index++) {
    const seed = `Brief-${index}`;
    let state = createGame(seed);
    let previous = readView(state);
    let arrivalTick = 0;
    let departureTick = 0;
    let serviceTick = 0;
    let expectedTravelTicks = 0;

    for (let tick = 1; tick <= 120; tick++) {
      state = step(state);
      const view = readView(state);
      expect(view.tick).toBe(tick);

      if (!arrivalTick && totals(view).waiting > 0) {
        arrivalTick = tick;
        expect(view.vehicle.phase).toBe('idle');
        expect(view.districts.some((district) => district.lettersWaiting > 0)).toBe(true);
      }

      if (!departureTick && view.vehicle.phase === 'outbound') {
        departureTick = tick;
        expect(view.vehicle.cargo).toBeGreaterThan(0);
        expect(totals(previous).waiting - totals(view).waiting).toBe(view.vehicle.cargo);
        expectedTravelTicks = view.map.edges.find(
          (edge) => edge.from === 'center' && edge.to === view.vehicle.targetId,
        )?.ticks ?? 0;
      }

      if (departureTick && tick === departureTick + 1) {
        expect(view.vehicle.x).not.toBe(previous.vehicle.x);
        expect(view.vehicle.y).not.toBe(previous.vehicle.y);
      }

      if (!serviceTick && view.vehicle.phase === 'servicing') {
        serviceTick = tick;
        expect(view.revenue).toBe(0);
        const district = view.map.nodes.find((node) => node.id === view.vehicle.targetId);
        expect(view.vehicle.x).toBe(district?.x);
        expect(view.vehicle.y).toBe(district?.y);
      }

      if (view.revenue > 0) break;
      previous = view;
    }

    const view = readView(state);
    expect(arrivalTick).toBeGreaterThan(0);
    expect(departureTick).toBeGreaterThan(arrivalTick);
    expect(expectedTravelTicks).toBeGreaterThan(0);
    expect(serviceTick - departureTick).toBe(expectedTravelTicks);
    expect(view.tick).toBeGreaterThan(serviceTick);
    expect(view.tick).toBeLessThanOrEqual(120);
    expect(totals(view).letters).toBeGreaterThan(0);
    expect(totals(view).ads).toBe(0);
    expect(view.vehicle.phase).toBe('returning');
  }
});

test('deliveryAndRevenueAreBookedOnce', () => {
  let state = createGame('Gänsepost');
  let previous = readView(state);
  let deliveries = 0;
  let emptyReturns = 0;

  for (let tick = 1; tick <= 600; tick++) {
    state = step(state);
    const current = readView(state);
    const currentTotals = totals(current);
    const previousTotals = totals(previous);
    const lettersDelivered = currentTotals.letters - previousTotals.letters;
    const adsDelivered = currentTotals.ads - previousTotals.ads;
    expect(lettersDelivered).toBeGreaterThanOrEqual(0);
    expect(adsDelivered).toBeGreaterThanOrEqual(0);
    expect(current.revenue - previous.revenue).toBe(80 * lettersDelivered + 15 * adsDelivered);

    if (current.vehicle.phase === 'returning' && previous.vehicle.phase === 'servicing') {
      deliveries++;
      expect(lettersDelivered + adsDelivered).toBe(previous.vehicle.cargo);
      expect(current.vehicle.cargo).toBe(0);
      expect(current.vehicle.targetId).toBe('center');
    } else {
      expect(lettersDelivered + adsDelivered).toBe(0);
    }

    if (current.vehicle.phase === 'idle' && previous.vehicle.phase === 'returning') {
      emptyReturns++;
      const center = current.map.nodes.find((node) => node.id === 'center');
      expect({ x: current.vehicle.x, y: current.vehicle.y }).toEqual({
        x: center?.x,
        y: center?.y,
      });
      expect(current.vehicle.cargo).toBe(0);
    }

    previous = current;
  }

  expect(deliveries).toBeGreaterThan(2);
  expect(emptyReturns).toBeGreaterThan(2);
  expect(totals(previous).letters).toBeGreaterThan(0);
  expect(totals(previous).ads).toBeGreaterThan(0);
});

test('replays the same arrivals, reservations and trips from the same seed', () => {
  const initial = createGame('Brief für Nö');
  let first = initial;
  let replay = createGame(initial.seed);

  for (let tick = 1; tick <= 300; tick++) {
    first = step(first);
    replay = step(replay);
    expect(first).toEqual(replay);
  }

  expect(readView(initial)).toMatchObject({
    tick: 0,
    revenue: 0,
    vehicle: { phase: 'idle', cargo: 0, targetId: null },
  });
  expect(totals(readView(initial))).toEqual({ waiting: 0, letters: 0, ads: 0 });
});

test('rejects an unsupported player command without changing the game', () => {
  const state = createGame('Probefahrt');
  const unsupported = { id: '1', baseRevision: 0, command: { type: 'unsupported' } };
  const result = applyCommand(state, unsupported as CommandEnvelope);
  expect(result).toMatchObject({ ok: false, state });
  expect(result.state).toBe(state);
});
