import type { GameMap, MapEdge, MapNode, RouteLeg } from './model';
import { randomInteger, seedNumber } from './random';

export const CENTER_ID = 'center';

export function createMap(seed: string): GameMap {
  let randomState = seedNumber(`Karte:${seed}`);

  function jitter(coordinate: number, radius: number): number {
    const [offset, next] = randomInteger(randomState, -radius, radius);
    randomState = next;
    return coordinate + offset;
  }

  function node(id: string, name: string, kind: MapNode['kind'], x: number, y: number, radius: number): MapNode {
    return { id, name, kind, x: jitter(x, radius), y: jitter(y, radius) };
  }

  const center = node(CENTER_ID, 'Postzentrum', 'center', 50, 50, 3);
  const northWest = node('district-1', 'Lindenau', 'district', 22, 25, 5);
  const northEast = node('district-2', 'Am Mühlbach', 'district', 78, 25, 5);
  const southWest = node('district-3', 'Sonnenfeld', 'district', 22, 75, 5);
  const southEast = node('district-4', 'Hafenviertel', 'district', 78, 75, 5);
  const districts = [northWest, northEast, southWest, southEast];
  const northDepot = node('depot-1', 'Depotstandort Nord', 'depot', 50, 23, 5);
  const southDepot = node('depot-2', 'Depotstandort Süd', 'depot', 50, 77, 5);

  function edge(from: MapNode, to: MapNode): MapEdge {
    const distance = Math.hypot(to.x - from.x, to.y - from.y);
    return { from: from.id, to: to.id, ticks: Math.round(distance) };
  }

  return {
    nodes: [center, ...districts, northDepot, southDepot],
    edges: [
      ...districts.map((district) => edge(center, district)),
      edge(center, northDepot),
      edge(center, southDepot),
      edge(northDepot, northWest),
      edge(northDepot, northEast),
      edge(southDepot, southWest),
      edge(southDepot, southEast),
    ],
  };
}

export function getMapNode(map: GameMap, id: string): MapNode {
  const node = map.nodes.find((candidate) => candidate.id === id);
  if (!node) throw new Error(`Der Kartenknoten ${id} ist unbekannt.`);
  return node;
}

export function getTravelTicks(map: GameMap, districtId: string): number {
  const edge = map.edges.find(({ from, to }) => (
    (from === CENTER_ID && to === districtId) || (to === CENTER_ID && from === districtId)
  ));
  if (!edge) throw new Error(`Es gibt keine direkte Verbindung zum Gebiet ${districtId}.`);
  return edge.ticks;
}

const routes = new WeakMap<GameMap, Map<string, readonly RouteLeg[]>>();

export function findRoute(map: GameMap, from: string, to: string): readonly RouteLeg[] {
  if (from === to) return [];
  let cache = routes.get(map);
  if (!cache) {
    cache = new Map();
    routes.set(map, cache);
  }
  const key = JSON.stringify([from, to]);
  const cached = cache.get(key);
  if (cached) return cached;

  const visited = new Set<string>();
  const candidates = new Map<string, { distance: number; legs: readonly RouteLeg[] }>([[from, { distance: 0, legs: [] }]]);
  while (candidates.size) {
    const [nodeId, candidate] = [...candidates].sort(([a, x], [b, y]) => x.distance - y.distance || compareIds(a, b))[0];
    if (nodeId === to) {
      cache.set(key, candidate.legs);
      return candidate.legs;
    }
    candidates.delete(nodeId);
    visited.add(nodeId);
    for (const edge of map.edges) {
      const neighbor = edge.from === nodeId ? edge.to : edge.to === nodeId ? edge.from : null;
      if (neighbor === null || visited.has(neighbor)) continue;
      const distance = candidate.distance + edge.ticks;
      if (distance < (candidates.get(neighbor)?.distance ?? Infinity)) {
        candidates.set(neighbor, {
          distance, legs: [...candidate.legs, { from: nodeId, to: neighbor, ticks: edge.ticks }],
        });
      }
    }
  }
  throw new Error(`Es gibt keine Verbindung zwischen ${from} und ${to}.`);
}

export function compareIds(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
