import { VEHICLES } from '../core/balance';
import { CENTER_ID, findRoute } from '../core/map';
import type { GameView, MapNode, VehicleView } from '../core/model';
import {
  districtOutlines, landscape, mapPath, mapPosition, mapScaleX as scaleX, mapViewBox, svgElement as element,
} from './map-art';

const districtTones = ['orchard', 'meadow', 'field', 'harbor'];
const vehicleGlyphs = {
  bike: 'M-2.2 1.1A.85 .85 0 1 0-.5 1.1A.85 .85 0 1 0-2.2 1.1M.65 1.1A.85 .85 0 1 0 2.35 1.1A.85 .85 0 1 0 .65 1.1M-1.35 1.1-.55-.8.35 1.1ZM.35 1.1 1.25-1.05h.65M-.95-.8h.8',
  cargoBike: 'M-1.9 1.2m-.7 0a.7 .7 0 1 0 1.4 0a.7 .7 0 1 0-1.4 0M1.8 1.2m-.7 0a.7 .7 0 1 0 1.4 0a.7 .7 0 1 0-1.4 0M-1.9 1.2-1-.7-.1 1.2ZM-.1 1.2 .5-.9h.4M-1.4-.7h.8M.7-.5h2l-.45 1.05H1.15Z',
  van: 'M-2.5 1V-1.3H.8L2.5-.2V1H1.9M.7 1H-.9M-2.1 1H-2.5M.8-1.3V-.2H2.5M-1.5 1m-.6 0a.6 .6 0 1 0 1.2 0a.6 .6 0 1 0-1.2 0M1.3 1m-.6 0a.6 .6 0 1 0 1.2 0a.6 .6 0 1 0-1.2 0',
  truck: 'M-2.75-1.55H.55V.55H-2.75ZM.55.55V-.95H1.8L2.75-.05V1.05H2.3M1.2 1.05H-.8M-1.9 1.05H-2.75V.55M1.75 1.05m-.55 0a.55 .55 0 1 0 1.1 0a.55 .55 0 1 0-1.1 0M-1.35 1.05m-.55 0a.55 .55 0 1 0 1.1 0a.55 .55 0 1 0-1.1 0',
};
const depotGlyphs = {
  open: 'M-1.25 .65V-.2L0-1.35 1.25-.2V.65Z',
  closing: 'M-.8 .8 .8-.8',
  closed: '',
};
const depotLabels = { open: 'geöffnet', closing: 'schließt', closed: 'geschlossen' };
const parkingAngles = [0, Math.PI, Math.PI / 3, 2 * Math.PI / 3, -Math.PI / 3, -2 * Math.PI / 3];

function districtShape(node: MapNode, index: number) {
  const shape = mapPath(districtOutlines[index], `district-shape district-${districtTones[index]}`);
  shape.setAttribute('transform', mapPosition(node));
  return shape;
}

function beginMap(svg: SVGSVGElement, shapes: readonly SVGPathElement[]) {
  const { defs, ground, foreground, waterClipId } = landscape();
  svg.setAttribute('viewBox', mapViewBox);
  svg.classList.add('postal-map');
  svg.replaceChildren(defs, ground, ...shapes, foreground);
  return waterClipId;
}

function edgeLine(a: MapNode, b: MapNode, className: string) {
  return element('line', { x1: a.x * scaleX, y1: a.y, x2: b.x * scaleX, y2: b.y, class: className });
}

function edgeKey(a: string, b: string) {
  return a < b ? `${a}/${b}` : `${b}/${a}`;
}

function drawRoad(a: MapNode, b: MapNode, waterClipId: string) {
  const group = element('g', { class: 'map-road', 'aria-hidden': 'true' });
  if (a.kind !== 'center' && b.kind !== 'center') group.classList.add('map-road-local');
  const bridge = edgeLine(a, b, 'road-bridge');
  bridge.setAttribute('clip-path', `url(#${waterClipId})`);
  group.append(edgeLine(a, b, 'road-casing'), bridge, edgeLine(a, b, 'road'));
  return group;
}

function centerSymbol() {
  const group = element('g', { class: 'map-center-symbol' });
  const building = 'M-13 2.6V-5.3H-8.6V-8.8Q0-16 8.6-8.8V-5.3H13V2.6Z';
  group.append(
    mapPath(building, 'center-outline'),
    mapPath(building, 'center-pin'),
    mapPath('M8.6-4.9H12.6V2.25H8.6ZM-12.6-4.9H-8.6V2.25H-12.6Z', 'center-wings'),
    mapPath('M-8.6 2.6V-8.8M8.6 2.6V-8.8', 'center-seams'),
    mapPath('M-1.2 2.6V-.2Q-1.2-1.2-2.5-1.2H-3Q-4.2-1.2-4.2-.2V2.6ZM4.2 2.6V-.2Q4.2-1.2 3-1.2H2.5Q1.2-1.2 1.2-.2V2.6ZM-6.8-4.6h2v2h-2zm5.8 0h2v2h-2zm5.8 0h2v2h-2zM-11.8-3.7h1.7v1.7h-1.7zm0 2.6h1.7V.6h-1.7zm21.9-2.6h1.7V-2h-1.7zm0 2.6h1.7V.6h-1.7z', 'building-openings'),
    mapPath('M-3.7-9.2C-3.2-4.8 3.2-4.8 3.7-9.2M-1.9-8.3a1.9 1.9 0 1 0 3.8 0 1.9 1.9 0 1 0-3.8 0Z', 'posthorn'),
  );
  return group;
}

function depotSymbol() {
  const group = element('g', { class: 'map-depot-symbol' });
  const building = 'M-5.5 3V-2L0-5.6 5.5-2V3Z';
  group.append(
    mapPath(building, 'depot-outline'),
    mapPath(building, 'depot-pin'),
    mapPath('M-2.7 1.1V-2.2H2.7V1.1Z M-2.7-2.2 0-.3 2.7-2.2', 'envelope-fold'),
  );
  return group;
}

function mapLabel(name: string, y: number) {
  const width = Math.max(21, name.length * 2.32 + 5);
  const group = element('g', { class: 'map-plaque' });
  const label = element('text', { y, class: 'map-label' });
  label.textContent = name;
  group.append(element('rect', {
    x: -width / 2, y: y - 4.6, width, height: 6.4, rx: 1.9, class: 'map-label-paper',
  }), label);
  return group;
}

function vehicleSymbol(type: VehicleView['type']) {
  return [
    element('circle', { r: 3.8, class: 'vehicle-disc' }),
    element('path', { d: vehicleGlyphs[type], class: 'bike-glyph', 'pointer-events': 'none' }),
  ];
}

export function drawCoverMap(svg: SVGSVGElement) {
  const center: MapNode = { id: 'center', name: '', kind: 'center', x: 47, y: 53 };
  const districts: MapNode[] = [
    { id: 'nw', name: '', kind: 'district', x: 20, y: 24 },
    { id: 'ne', name: '', kind: 'district', x: 83, y: 23 },
    { id: 'sw', name: '', kind: 'district', x: 23, y: 78 },
    { id: 'se', name: '', kind: 'district', x: 80, y: 74 },
  ];
  const depot: MapNode = { id: 'depot', name: '', kind: 'depot', x: 45, y: 17 };
  const waterClipId = beginMap(svg, districts.map(districtShape));
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.classList.add('postal-map-cover');
  const orange = drawRoad(center, districts[3], waterClipId);
  orange.classList.add('map-road-selected');
  svg.append(...districts.slice(0, 3).map(district => drawRoad(center, district, waterClipId)),
    drawRoad(districts[0], depot, waterClipId), drawRoad(depot, districts[1], waterClipId), orange);
  for (const district of districts) {
    svg.append(element('circle', {
      r: 2.7, class: 'district-pin', transform: mapPosition(district),
    }));
  }
  for (const [node, symbol] of [[center, centerSymbol()], [depot, depotSymbol()]] as const) {
    symbol.setAttribute('transform', mapPosition(node));
    svg.append(symbol);
  }
  const cyclists = element('g', { class: 'vehicle', transform: 'translate(48 35) scale(1.2)' });
  cyclists.append(...vehicleSymbol('cargoBike'));
  const van = element('g', { class: 'vehicle', transform: 'translate(95 65) scale(1.25)' });
  van.append(...vehicleSymbol('van'));
  svg.append(cyclists, van);
}

export function drawMap(
  svg: SVGSVGElement,
  map: GameView['map'],
  selectDistrict: (id: string) => void,
  selectDepot: (id: string) => void,
  selectVehicle: (id: string) => void,
) {
  const nodes = new Map(map.nodes.map(node => [node.id, node]));
  const districts = map.nodes.filter(node => node.kind === 'district');
  const areas = new Map<string, SVGPathElement>();
  const districtPins = new Map<string, SVGGElement>();
  const roads = new Map<string, SVGGElement>();
  const depotPins = new Map<string, {
    group: SVGGElement;
    title: SVGTitleElement;
    glyph: SVGPathElement;
    name: string;
  }>();
  const vehiclePins = new Map<string, SVGGElement>();

  for (const [i, node] of districts.entries()) {
    const area = districtShape(node, i);
    area.addEventListener('click', () => selectDistrict(node.id));
    areas.set(node.id, area);
  }
  const waterClipId = beginMap(svg, [...areas.values()]);
  const roadLayer = element('g', { class: 'map-roads' });
  const directionLayer = element('g', { class: 'map-directions', 'aria-hidden': 'true' });
  for (const edge of map.edges) {
    const a = nodes.get(edge.from)!;
    const b = nodes.get(edge.to)!;
    const road = drawRoad(a, b, waterClipId);
    roads.set(edgeKey(edge.from, edge.to), road);
    roadLayer.append(road);
  }
  svg.append(roadLayer, directionLayer);
  for (const node of map.nodes) {
    const group = element('g', { transform: mapPosition(node), class: 'map-node' });
    if (node.kind !== 'district') {
      group.classList.add('depot-node');
      group.setAttribute('data-depot-id', node.id);
      group.addEventListener('click', () => selectDepot(node.id));
    }
    if (node.kind === 'center') {
      group.classList.add('map-center-node');
      group.append(centerSymbol(), mapLabel(node.name, 7.6));
    } else if (node.kind === 'depot') {
      const title = element('title', {});
      const glyph = element('path', { class: 'depot-status-mark', 'pointer-events': 'none' });
      const badge = element('g', { class: 'depot-status', transform: 'translate(4.5 1.8)' });
      badge.append(element('circle', { r: 1.65, class: 'depot-status-disc' }), glyph);
      group.append(
        title,
        depotSymbol(),
        badge,
      );
      depotPins.set(node.id, { group, title, glyph, name: node.name });
    } else {
      group.append(element('circle', { r: 2.7, class: 'district-pin' }), mapLabel(node.name, 8.4));
      group.addEventListener('click', () => selectDistrict(node.id));
      districtPins.set(node.id, group);
    }
    svg.append(group);
  }

  function createVehiclePin(vehicle: VehicleView) {
    const { id, type } = vehicle;
    const marker = element('g', {
      'data-testid': 'vehicle', 'data-vehicle-id': id, 'data-vehicle-type': type, class: 'vehicle',
    });
    const title = element('title', {});
    title.textContent = `${VEHICLES[type].name} · ${id}`;
    marker.append(title, ...vehicleSymbol(type));
    marker.addEventListener('click', () => selectVehicle(id));
    svg.append(marker);
    vehiclePins.set(id, marker);
    return marker;
  }

  let selectedDistrictId: string | undefined;
  let selectedDepotId: string | undefined;
  return {
    select(id: string, depotId = CENTER_ID) {
      if (selectedDistrictId === id && selectedDepotId === depotId) return;
      selectedDistrictId = id;
      selectedDepotId = depotId;
      for (const [key, area] of areas) area.classList.toggle('selected', key === id);
      for (const [key, pin] of districtPins) pin.classList.toggle('selected', key === id);
      for (const road of roads.values()) road.classList.remove('map-road-selected');
      directionLayer.replaceChildren();
      if (!areas.has(id) || !nodes.has(depotId)) return;
      for (const leg of findRoute(map, depotId, id)) {
        const road = roads.get(edgeKey(leg.from, leg.to))!;
        road.classList.add('map-road-selected');
        roadLayer.append(road);
        const from = nodes.get(leg.from)!;
        const to = nodes.get(leg.to)!;
        const dx = (to.x - from.x) * scaleX;
        const dy = to.y - from.y;
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        const arrows = mapPath('M-3-.65-2.2 0-3 .65M-1.45-.65-.65 0-1.45 .65M.1-.65.9 0 .1 .65', 'road-direction');
        arrows.setAttribute('transform', `translate(${from.x * scaleX + dx * .56} ${from.y + dy * .56}) rotate(${angle})`);
        directionLayer.append(arrows);
      }
    },
    render(
      vehicles: GameView['vehicles'],
      previous: GameView['vehicles'],
      alpha: number,
      depots: GameView['depots'],
      selectedVehicleId: string,
    ) {
      for (const depot of depots) {
        const pin = depotPins.get(depot.id);
        if (!pin) continue;
        const status = depot.closing ? 'closing' : depot.open ? 'open' : 'closed';
        if (pin.group.getAttribute('data-status') === status) continue;
        pin.group.setAttribute('data-status', status);
        pin.group.classList.remove('open', 'closed', 'closing');
        pin.group.classList.add(status);
        pin.title.textContent = `${pin.name} · ${depotLabels[status]}`;
        pin.glyph.setAttribute('d', depotGlyphs[status]);
      }

      const currentIds = new Set(vehicles.map(vehicle => vehicle.id));
      const previousById = new Map(previous.map(vehicle => [vehicle.id, vehicle]));
      const parkingSlots = new Map<string, number>();
      for (const [id, marker] of vehiclePins) {
        if (currentIds.has(id)) continue;
        marker.remove();
        vehiclePins.delete(id);
      }

      for (const vehicle of vehicles) {
        const marker = vehiclePins.get(vehicle.id) ?? createVehiclePin(vehicle);
        const last = previousById.get(vehicle.id) ?? vehicle;
        const home = nodes.get(vehicle.homeId);
        const parked = (vehicle.phase === 'idle' || vehicle.phase === 'loading')
          && home?.x === vehicle.x && home.y === vehicle.y;
        const slot = parkingSlots.get(vehicle.homeId) ?? 0;
        parkingSlots.set(vehicle.homeId, slot + 1);

        let x = (last.x + (vehicle.x - last.x) * alpha) * scaleX;
        let y = last.y + (vehicle.y - last.y) * alpha;
        if (parked) {
          const angle = parkingAngles[slot % parkingAngles.length];
          const radius = (home.kind === 'center' ? 20 : 10) + 8 * Math.floor(slot / parkingAngles.length);
          x = vehicle.x * scaleX + radius * Math.cos(angle);
          y = vehicle.y + radius * Math.sin(angle);
        }
        marker.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)})`);
        marker.setAttribute('data-phase', vehicle.phase);
        marker.classList.toggle('parked', parked);
        marker.classList.toggle('selected', vehicle.id === selectedVehicleId);
      }
    },
  };
}
