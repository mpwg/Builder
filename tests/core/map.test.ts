import { expect, test } from 'vitest';
import { createMap } from '../../src/core/map';

test('sameSeedRepeatsAndEveryDistrictIsReachable', () => {
  const layouts = new Set<string>();

  for (let index = 0; index < 128; index++) {
    const seed = `Päckchen-${index}`;
    const map = createMap(seed);
    expect(createMap(seed)).toEqual(map);
    layouts.add(JSON.stringify(map));

    const center = map.nodes.find((node) => node.kind === 'center');
    expect(center?.id).toBe('center');
    expect(map.nodes.filter((node) => node.kind === 'center')).toHaveLength(1);
    expect(map.nodes.filter((node) => node.kind === 'depot')).toHaveLength(2);
    const districts = map.nodes.filter((node) => node.kind === 'district');
    expect(districts).toHaveLength(4);
    expect(new Set(districts.map(({ x, y }) => `${x < 50}/${y < 50}`)).size).toBe(4);

    const nodeIds = new Set(map.nodes.map((node) => node.id));
    expect(nodeIds.size).toBe(map.nodes.length);
    for (const { x, y } of map.nodes) {
      expect(x).toBeGreaterThanOrEqual(10);
      expect(x).toBeLessThanOrEqual(90);
      expect(y).toBeGreaterThanOrEqual(12);
      expect(y).toBeLessThanOrEqual(88);
    }
    for (const { from, to, ticks } of map.edges) {
      expect(nodeIds.has(from)).toBe(true);
      expect(nodeIds.has(to)).toBe(true);
      expect(from).not.toBe(to);
      expect(Number.isInteger(ticks) && ticks > 0).toBe(true);
    }

    const reachable = new Set(['center']);
    for (const id of reachable) {
      for (const { from, to } of map.edges) {
        if (from === id) reachable.add(to);
        if (to === id) reachable.add(from);
      }
    }
    expect(reachable).toEqual(nodeIds);
  }

  expect(layouts.size).toBe(128);
});
