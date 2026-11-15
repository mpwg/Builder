import { expect, test } from 'vitest';
import { applyCommand, createGame, readView, step } from '../../src/core/game';
import type { Command, CommandEnvelope, GameState } from '../../src/core/model';

function act(state: GameState, command: Command): GameState {
  const result = applyCommand(state, { id: `test-${state.revision}`, baseRevision: state.revision, command });
  if (!result.ok) throw new Error(result.reason);
  return result.state;
}

function run(state: GameState, ticks: number, observe: (state: GameState) => void = () => {}): GameState {
  for (let i = 0; i < ticks; i++) {
    state = step(state);
    observe(state);
  }
  return state;
}

function fixture() {
  return { ...createGame('Disposition'), nextArrivalTick: 10_000 };
}

function batch(
  depotId: string, districtId: string, quantity: number,
  kind: GameState['waiting'][number]['kind'] = 'letter',
  deadlineTick = 500, id = 'Testcharge',
  serviceClass: 'standard' | 'express' = 'standard',
) {
  return { id, depotId, districtId, quantity, kind, arrivalTick: 0, deadlineTick, serviceClass } as const;
}

function delivered(state: GameState, districtId: string) {
  return readView(state).districts.find((district) => district.id === districtId)!.delivered;
}

test('a first letter arrives, travels on an edge and is delivered within 120 ticks', () => {
  for (let index = 0; index < 128; index++) {
    let state = createGame(`Brief-${index}`);
    let departureTick = 0;
    let serviceTick = 0;
    let expectedTravelTicks = 0;
    state = run(state, 120, (current) => {
      const view = readView(current);
      const bike = view.vehicles.find((vehicle) => vehicle.type === 'bike')!;
      if (!departureTick && bike.phase === 'loading') {
        expect(view.districts.flatMap((district) => district.waiting).some((shipment) => shipment.kind === 'letter')).toBe(true);
      }
      if (!departureTick && bike.phase === 'outbound') {
        departureTick = view.tick;
        expect(bike.cargo).toBeGreaterThan(0);
        expectedTravelTicks = view.map.edges.find((edge) => edge.from === 'center' && edge.to === bike.targetId)!.ticks;
      }
      if (!serviceTick && bike.phase === 'servicing') {
        serviceTick = view.tick;
        expect(view.revenue).toBe(0);
        const district = view.map.nodes.find((node) => node.id === bike.targetId)!;
        expect([bike.x, bike.y]).toEqual([district.x, district.y]);
      }
    });
    expect(departureTick).toBeGreaterThan(0);
    expect(serviceTick - departureTick).toBe(expectedTravelTicks);
    expect(readView(state).districts.flatMap((district) => district.delivered).some((shipment) => shipment.kind === 'letter')).toBe(true);
  }
});

test('a delivery books the agreed revenue once, including late pieces', () => {
  let state: GameState = { ...fixture(), waiting: [batch('center', 'district-1', 2, 'letter', 1)] };
  state = run(state, 120);
  expect(delivered(state, 'district-1')).toEqual([{ kind: 'letter', serviceClass: 'standard', quantity: 2, overdue: 2 }]);
  expect(state.revenue).toBe(160);
  expect(run(state, 100).revenue).toBe(160);
});

test('replays the same dispatch and ledger from the same seed and commands', () => {
  const first = createGame('Brief für Nö');
  const replay = createGame(first.seed);
  const open: Command = { type: 'open-depot', depotId: 'depot-1' };
  expect(run(act(first, open), 600)).toEqual(run(act(replay, open), 600));
  expect(first.tick).toBe(0);
  expect(first.revenue).toBe(0);
  expect(first.waiting).toEqual([]);
});

test('rejects an unsupported player command without changing the game', () => {
  const state = createGame('Probefahrt');
  const unsupported = { id: '1', baseRevision: 0, command: { type: 'unsupported' } };
  const result = applyCommand(state, unsupported as CommandEnvelope);
  expect(result.ok).toBe(false);
  expect(result.state).toBe(state);
});

test('repeatedPurchaseChargesOnce', () => {
  const state = fixture();
  const purchase = { id: 'Kauf', baseRevision: 0, command: { type: 'buy-vehicle', vehicleType: 'van', depotId: 'center' } } as const;
  const { ok, state: after } = applyCommand(state, purchase);
  expect(ok).toBe(true);
  expect(after.revision).toBe(1);
  expect(after.vehicles).toHaveLength(state.vehicles.length + 1);
  expect(after.budget).toBeLessThan(state.budget);
  expect(after.budget + after.expenses).toBe(state.budget);
  expect(applyCommand(after, purchase)).toEqual({ ok: true, state: after });
  expect(applyCommand(after, { ...purchase, id: 'Andere ID' })).toMatchObject({ ok: false, state: after });
  expect(applyCommand({ ...after, budget: 0 }, { ...purchase, id: 'Kein Geld', baseRevision: 1 }).ok).toBe(false);
});

test('vehicleEligibilityAndDeadlines', () => {
  const initial = fixture();
  const bike = initial.vehicles.find(({ type }) => type === 'bike')!;
  const input = [
    batch('center', 'district-1', 2, 'parcel', 1, 'Paket'),
    batch('center', 'district-1', 1, 'freight', 1, 'Fracht'),
    batch('center', 'district-2', 3, 'ad', 2, 'Werbung'),
  ];
  const bikeOnly = { ...initial, vehicles: [bike], waiting: input };
  expect(run(bikeOnly, 150).waiting.map(({ id }) => id)).toEqual(['Paket', 'Fracht']);
  expect(delivered(run(bikeOnly, 150), 'district-2')).toMatchObject([{ kind: 'ad', quantity: 3 }]);

  const serviceStartsAndEnds = (kind: 'registered' | 'letter') => {
    let start = 0;
    let end = 0;
    run({ ...bikeOnly, waiting: [batch('center', 'district-1', 3, kind)] }, 120, (state) => {
      if (!start && state.vehicles[0].phase === 'servicing') start = state.tick;
      if (!end && state.revenue) end = state.tick;
    });
    expect(end).toBeGreaterThan(start);
    return end - start;
  };
  expect(serviceStartsAndEnds('registered')).toBeGreaterThan(serviceStartsAndEnds('letter'));

  const seen = new Map<string, number>();
  run(createGame('Serviceklassen'), 4000, (state) => {
    for (const shipment of state.waiting) seen.set(`${shipment.kind}:${shipment.serviceClass}`, shipment.deadlineTick - shipment.arrivalTick);
  });
  expect(seen.get('letter:express')).toBeLessThan(seen.get('letter:standard')!);
  expect(seen.get('parcel:express')).toBeLessThan(seen.get('parcel:standard')!);
  expect(seen.has('ad:express')).toBe(false);
  expect(seen.has('freight:express')).toBe(false);
  const outcome = readView(run(createGame('Serviceklassen'), 2000));
  expect(new Set(outcome.districts.flatMap(({ delivered: shipments }) => shipments.map(({ kind }) => kind)))).toEqual(
    new Set(['ad', 'letter', 'registered', 'parcel', 'freight']),
  );
});

test('lastDepotCapacityIsReservedOnlyOnce', () => {
  let state = act(fixture(), { type: 'open-depot', depotId: 'depot-1' });
  state = act(state, { type: 'assign-district', districtId: 'district-1', depotId: 'depot-1' });
  state = {
    ...state,
    depots: state.depots.map((depot) => depot.id === 'depot-1' ? { ...depot, capacity: 1 } : depot),
    waiting: [batch('center', 'district-1', 2)],
  };
  const next = step(state);
  expect(readView(next).depots.find(({ id }) => id === 'depot-1')).toMatchObject({ used: 0, reserved: 1 });
  expect(next.vehicles.filter(({ phase }) => phase === 'loading')).toHaveLength(1);
  expect(next.waiting[0].quantity).toBe(2);
  state = run(next, 200);
  expect(readView(state).depots.find(({ id }) => id === 'depot-1')).toMatchObject({ used: 1, reserved: 0 });
  expect(state.waiting.map(({ depotId, quantity }) => [depotId, quantity])).toEqual([['center', 1], ['depot-1', 1]]);
  expect(readView(state).problems.some(({ nodeId, message }) => nodeId === 'depot-1' && message.includes('Lager'))).toBe(true);
});

test('transferPreservesQuantityAgeAndDeadline', () => {
  let state = act(fixture(), { type: 'open-depot', depotId: 'depot-1' });
  state = act(state, { type: 'assign-district', districtId: 'district-1', depotId: 'depot-1' });
  const source = { ...batch('center', 'district-1', 2, 'registered', 130, 'Expresscharge', 'express'), arrivalTick: 1 };
  state = run({ ...state, waiting: [source] }, 130);
  expect(state.waiting).toEqual([{ ...source, depotId: 'depot-1' }]);
  expect(state.revenue).toBe(0);
  state = act(state, { type: 'buy-vehicle', depotId: 'depot-1', vehicleType: 'bike' });
  state = run(state, 160);
  expect(delivered(state, 'district-1')).toEqual([{ kind: 'registered', serviceClass: 'express', quantity: 2, overdue: 2 }]);
  expect(state.waiting).toEqual([]);
});

test('reassignmentKeepsShipmentsDeliverable', () => {
  let state = act(fixture(), { type: 'open-depot', depotId: 'depot-1' });
  state = act(state, { type: 'assign-district', districtId: 'district-1', depotId: 'depot-1' });
  state = act(state, { type: 'buy-vehicle', depotId: 'depot-1', vehicleType: 'bike' });
  const local = state.vehicles.at(-1)!;
  state = run({ ...state, waiting: [batch('depot-1', 'district-1', 3, 'letter', 370, 'Laufend')] }, 20);
  expect(state.vehicles.find(({ id }) => id === local.id)?.phase).toBe('outbound');
  state = { ...state, waiting: [batch('depot-1', 'district-1', 1, 'parcel', 380, 'Lager')] };
  state = act(state, { type: 'close-depot', depotId: 'depot-1' });
  expect(readView(state).depots.find(({ id }) => id === 'depot-1')?.closing).toBe(true);
  expect(readView(state).vehicles.find(({ id }) => id === local.id)).toMatchObject({ homeId: 'depot-1', phase: 'outbound' });
  let reachedCenter: typeof state.waiting[number] | undefined;
  let relocating = false;
  state = run(state, 400, (current) => {
    reachedCenter ??= current.waiting.find(({ id, depotId }) => id === 'Lager' && depotId === 'center');
    relocating ||= current.vehicles.some(({ id, phase }) => id === local.id && phase === 'relocating');
  });
  expect(reachedCenter).toMatchObject({ quantity: 1, deadlineTick: 380, arrivalTick: 0 });
  expect(relocating).toBe(true);
  expect(delivered(state, 'district-1')).toEqual(expect.arrayContaining([
    { kind: 'letter', serviceClass: 'standard', quantity: 3, overdue: 0 },
    { kind: 'parcel', serviceClass: 'standard', quantity: 1, overdue: 0 },
  ]));
  expect(state.waiting).toEqual([]);
  expect(readView(state).depots.find(({ id }) => id === 'depot-1')).toMatchObject({ closing: false, open: false, used: 0, reserved: 0 });
});

test('manualTemplateChangesStopOrder', () => {
  let state = fixture();
  const bike = state.vehicles[0];
  state = {
    ...state, vehicles: [bike], waiting: [batch('center', 'district-1', 1, 'letter', 10, 'A'), batch('center', 'district-2', 1, 'letter', 10, 'B')],
  };
  state = act(state, { type: 'set-priority', districtId: 'district-1', priority: 2 });
  const stops = (current: GameState) => readView(current).vehicles[0].stops;
  expect(stops(step(state))).toEqual(['district-1', 'district-2']);
  const fixed = act(state, { type: 'set-template', vehicleId: bike.id, districtIds: ['district-2', 'district-1'] });
  expect(stops(step(fixed))).toEqual(['district-2', 'district-1']);
  state = step(fixed);
  state = act(state, { type: 'set-template', vehicleId: bike.id, districtIds: null });
  expect(stops(state)).toEqual(['district-2', 'district-1']);
  state = run(state, 250);
  expect(delivered(state, 'district-1')[0]?.quantity).toBe(1);
  expect(delivered(state, 'district-2')[0]?.quantity).toBe(1);
  const waiting = [batch('center', 'district-3', 1)];
  const blocked = step({ ...fixed, waiting });
  expect(readView(blocked).vehicles[0]).toMatchObject({ phase: 'idle', waitReason: expect.stringContaining('Vorlage') });
  expect(stops(step({ ...state, waiting }))).toEqual(['district-3']);
  expect(applyCommand(state, { id: 'Doppelt', baseRevision: state.revision, command: { type: 'set-template', vehicleId: bike.id, districtIds: ['district-1', 'district-1'] } }).ok).toBe(false);
});

test('bundle wait retains ordinary mail but departures honor an exposed deadline', () => {
  const base = fixture();
  let state = act({ ...base, vehicles: [base.vehicles[0]] }, { type: 'set-bundle-wait', depotId: 'center', ticks: 90 });
  state = { ...state, waiting: [batch('center', 'district-1', 2, 'letter', 500)] };
  expect(run(state, 89).vehicles[0].phase).toBe('idle');
  expect(run(state, 90).vehicles[0].phase).toBe('loading');
  expect(step({ ...state, waiting: [batch('center', 'district-1', 2, 'letter', 25, 'Eilbrief', 'express')] }).vehicles[0].phase).toBe('loading');
});

test('a full tour chooses an urgent letter in another district before fresh mail at its first stop', () => {
  const initial = fixture();
  const waiting = [
    batch('center', 'district-1', 1, 'letter', 0, 'Knapp eins', 'express'),
    batch('center', 'district-1', 9, 'ad', 500, 'Nicht dringend'),
    batch('center', 'district-2', 1, 'letter', 1, 'Knapp zwei', 'express'),
  ];
  const state = step({ ...initial, vehicles: [initial.vehicles[0]], waiting });
  expect(readView(state).vehicles[0].stops).toEqual(['district-1', 'district-2']);
  const after = run(state, 220);
  expect(delivered(after, 'district-2')).toContainEqual({ kind: 'letter', serviceClass: 'express', quantity: 1, overdue: 1 });
});

test('freight can leave an old depot whose resident truck is the only eligible vehicle', () => {
  let state = act(fixture(), { type: 'open-depot', depotId: 'depot-1' });
  state = act(state, { type: 'assign-district', districtId: 'district-1', depotId: 'depot-1' });
  const truck = state.vehicles.find(({ type }) => type === 'truck')!;
  state = act(state, { type: 'relocate-vehicle', vehicleId: truck.id, depotId: 'depot-1' });
  state = run(state, 80);
  state = { ...state, waiting: [batch('depot-1', 'district-1', 1, 'freight', 490)] };
  state = act(state, { type: 'assign-district', districtId: 'district-1', depotId: 'center' });
  state = run(state, 140);
  expect(state.waiting).toEqual([batch('center', 'district-1', 1, 'freight', 490)]);
  expect(state.revenue).toBe(0);
  state = act(state, { type: 'relocate-vehicle', vehicleId: truck.id, depotId: 'center' });
  expect(delivered(run(state, 150), 'district-1')).toMatchObject([{ kind: 'freight', quantity: 1 }]);
});

test('depot closure completes an active freight unloading and returns the stock through the center', () => {
  let state = act(fixture(), { type: 'open-depot', depotId: 'depot-1' });
  state = act(state, { type: 'assign-district', districtId: 'district-1', depotId: 'depot-1' });
  state = { ...state, waiting: [batch('center', 'district-1', 2, 'freight', 300)] };
  for (let i = 0; i < 100 && !state.vehicles.some(({ phase }) => phase === 'servicing'); i++) state = step(state);
  const depot = (current: GameState) => readView(current).depots.find(({ id }) => id === 'depot-1');
  expect(depot(state)).toMatchObject({ used: 0, reserved: 24, busyBays: 1 });
  state = act(state, { type: 'close-depot', depotId: 'depot-1' });
  let putAway = false;
  let recovered = false;
  state = run(state, 280, (current) => {
    const localFreight = current.waiting.find(({ id, depotId }) => id === 'Testcharge' && depotId === 'depot-1');
    const returnedFreight = current.waiting.find(({ id, depotId }) => id === 'Testcharge' && depotId === 'center');
    if (localFreight) {
      putAway = true;
      expect(localFreight).toMatchObject({ quantity: 2, arrivalTick: 0, deadlineTick: 300 });
      expect(depot(current)).toMatchObject({ used: 24, reserved: 0, closing: true });
    }
    if (returnedFreight) recovered = true;
    const totalWaiting = current.waiting.reduce((sum, batch) => sum + batch.quantity, 0);
    const totalCargo = readView(current).vehicles.reduce((sum, vehicle) => sum + vehicle.cargo, 0);
    const totalDelivered = delivered(current, 'district-1').reduce((sum, shipment) => sum + shipment.quantity, 0);
    expect(totalWaiting + totalCargo + totalDelivered).toBe(2);
  });
  expect(putAway && recovered).toBe(true);
  expect(depot(state)).toMatchObject({ used: 0, reserved: 0, open: false, closing: false });
  expect(state.revenue).toBe(2_200);
});

test('changing the assignment before departure lifts an unused storage reservation', () => {
  let state = act(fixture(), { type: 'open-depot', depotId: 'depot-1' });
  state = act(state, { type: 'assign-district', districtId: 'district-1', depotId: 'depot-1' });
  state = step({ ...state, waiting: [batch('center', 'district-1', 3)] });
  expect(readView(state).depots.find(({ id }) => id === 'depot-1')?.reserved).toBe(3);
  state = act(state, { type: 'assign-district', districtId: 'district-1', depotId: 'center' });
  state = run(state, 120);
  expect(readView(state).depots.find(({ id }) => id === 'depot-1')).toMatchObject({ used: 0, reserved: 0 });
  expect(delivered(state, 'district-1')).toMatchObject([{ quantity: 3 }]);
});

test('a depot transfer can depart while preferred mail is still waiting to bundle', () => {
  let state = act(fixture(), { type: 'open-depot', depotId: 'depot-1' });
  state = act(state, { type: 'assign-district', districtId: 'district-2', depotId: 'depot-1' });
  state = act(state, { type: 'set-priority', districtId: 'district-1', priority: 2 });
  state = act(state, { type: 'set-bundle-wait', depotId: 'center', ticks: 90 });
  state = {
    ...state, vehicles: [state.vehicles[0]],
    waiting: [batch('center', 'district-1', 1, 'ad', 500, 'Bündeln'), batch('center', 'district-2', 10, 'ad', 500, 'Voll')],
  };
  const next = step(state);
  expect(readView(next).vehicles[0]).toMatchObject({ phase: 'loading', targetId: 'depot-1' });
  expect(readView(next).depots.find(({ id }) => id === 'depot-1')?.reserved).toBe(10);
});

test('aging gives old advertisements room when fresh mail at a preferred district fills the vehicle', () => {
  let state = act(fixture(), { type: 'set-priority', districtId: 'district-2', priority: 2 });
  state = {
    ...state, tick: 320, vehicles: [state.vehicles[0]],
    waiting: [
      batch('center', 'district-1', 1, 'ad', 700, 'Alt'),
      { ...batch('center', 'district-2', 10, 'letter', 700, 'Frisch'), arrivalTick: 319 },
    ],
  };
  expect(readView(step(state)).vehicles[0].stops).toEqual(['district-1', 'district-2']);
  expect(delivered(run(state, 120), 'district-1')).toMatchObject([{ kind: 'ad', quantity: 1 }]);
});

test('explicit depot closure can retrieve freight even if the only truck has a template', () => {
  let state = act(fixture(), { type: 'open-depot', depotId: 'depot-1' });
  state = act(state, { type: 'assign-district', districtId: 'district-1', depotId: 'depot-1' });
  const truck = state.vehicles.find(({ type }) => type === 'truck')!;
  state = act(state, { type: 'relocate-vehicle', vehicleId: truck.id, depotId: 'depot-1' });
  state = run(state, 80);
  state = act(state, { type: 'set-template', vehicleId: truck.id, districtIds: ['district-1'] });
  state = { ...state, waiting: [batch('depot-1', 'district-1', 1, 'freight', 490)] };
  state = act(state, { type: 'close-depot', depotId: 'depot-1' });
  state = run(state, 220);
  expect(readView(state).depots.find(({ id }) => id === 'depot-1')).toMatchObject({ open: false, closing: false });
  expect(readView(state).vehicles.find(({ id }) => id === truck.id)).toMatchObject({ homeId: 'center', template: ['district-1'] });
  expect(delivered(state, 'district-1')).toMatchObject([{ kind: 'freight', quantity: 1 }]);
});

test('closing a second depot does not cancel the evacuation of a vehicle from the first', () => {
  let state = act(fixture(), { type: 'open-depot', depotId: 'depot-1' });
  state = act(state, { type: 'open-depot', depotId: 'depot-2' });
  const bike = state.vehicles[0];
  state = act(state, { type: 'relocate-vehicle', vehicleId: bike.id, depotId: 'depot-1' });
  state = run(state, 80);
  state = act(state, { type: 'relocate-vehicle', vehicleId: bike.id, depotId: 'depot-2' });
  state = act(state, { type: 'close-depot', depotId: 'depot-1' });
  state = act(state, { type: 'close-depot', depotId: 'depot-2' });
  state = run(state, 90);
  expect(readView(state).vehicles[0].homeId).toBe('center');
  expect(readView(state).depots.filter(({ id }) => id !== 'center').every(({ open }) => !open)).toBe(true);
});

test('ordinary cargo at a stop does not delay an otherwise on-time express delivery', () => {
  const initial = { ...createGame('review'), nextArrivalTick: 10_000 };
  const urgent = batch('center', 'district-1', 1, 'letter', 65, 'Express', 'express');
  const extra = batch('center', 'district-1', 4, 'registered', 390, 'Standard');
  const bikeOnly = { ...initial, vehicles: [initial.vehicles[0]] };
  const withoutExtra = run({ ...bikeOnly, waiting: [urgent] }, 65);
  expect(delivered(withoutExtra, 'district-1')).toContainEqual({ kind: 'letter', serviceClass: 'express', quantity: 1, overdue: 0 });
  const mixed = run({ ...bikeOnly, waiting: [urgent, extra] }, 65);
  expect(delivered(mixed, 'district-1')).toContainEqual({ kind: 'letter', serviceClass: 'express', quantity: 1, overdue: 0 });
});
