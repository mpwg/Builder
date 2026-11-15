import { VEHICLES } from '../core/balance';
import type { GameView, VehicleView } from '../core/model';

const namespace = 'http://www.w3.org/2000/svg';
const scaleX = 1.44;
const colors = ['#e4c578', '#b9d2b4', '#d8bbac', '#bccfdc'];
const outlines = [
  '-18,-9 -13,-15 12,-13 18,-5 14,10 2,14 -16,11',
  '-16,-12 11,-15 18,-8 17,7 3,13 -12,12 -19,0',
  '-18,-5 -8,-13 12,-12 18,-1 13,12 -8,14 -18,7',
  '-18,-8 4,-14 16,-9 18,4 10,13 -14,11 -19,4',
];
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
const parkingAngles = [0, Math.PI, -Math.PI / 3, -2 * Math.PI / 3, Math.PI / 3, 2 * Math.PI / 3];

function element<K extends keyof SVGElementTagNameMap>(
  tag: K, attributes: Record<string, string | number>,
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(namespace, tag);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
  return node;
}

export function drawMap(
  svg: SVGSVGElement,
  map: GameView['map'],
  selectDistrict: (id: string) => void,
  selectDepot: (id: string) => void,
  selectVehicle: (id: string) => void,
) {
  svg.replaceChildren();
  svg.setAttribute('viewBox', '-8 -8 160 116');
  const nodes = new Map(map.nodes.map(node => [node.id, node]));
  const districts = map.nodes.filter(node => node.kind === 'district');
  const areas = new Map<string, SVGPolygonElement>();
  const depotPins = new Map<string, {
    group: SVGGElement;
    title: SVGTitleElement;
    glyph: SVGPathElement;
    name: string;
  }>();
  const vehiclePins = new Map<string, SVGGElement>();

  for (const [i, node] of districts.entries()) {
    const area = element('polygon', {
      points: outlines[i], fill: colors[i], class: 'district-shape',
      transform: `translate(${node.x * scaleX} ${node.y})`,
    });
    area.addEventListener('click', () => selectDistrict(node.id));
    areas.set(node.id, area);
    svg.append(area);
  }
  for (const edge of map.edges) {
    const a = nodes.get(edge.from)!;
    const b = nodes.get(edge.to)!;
    const road = element('line', {
      x1: a.x * scaleX, y1: a.y, x2: b.x * scaleX, y2: b.y, class: 'road',
    });
    svg.append(road);
  }
  for (const node of map.nodes) {
    const group = element('g', { transform: `translate(${node.x * scaleX} ${node.y})`, class: 'map-node' });
    if (node.kind !== 'district') {
      group.classList.add('depot-node');
      group.setAttribute('data-depot-id', node.id);
      group.addEventListener('click', () => selectDepot(node.id));
    }
    if (node.kind === 'center') {
      group.append(
        element('rect', { x: -5, y: -4, width: 10, height: 8, rx: 1, class: 'center-pin' }),
        element('path', { d: 'M-3 -1.6 0 .8 3 -1.6', class: 'envelope-fold', 'pointer-events': 'none' }),
      );
    } else if (node.kind === 'depot') {
      const title = element('title', {});
      const glyph = element('path', { class: 'depot-status-mark', 'pointer-events': 'none' });
      group.append(
        title,
        element('circle', { r: 4, fill: 'transparent' }),
        element('rect', { x: -2.4, y: -2.4, width: 4.8, height: 4.8, transform: 'rotate(45)', class: 'depot-pin' }),
        glyph,
      );
      depotPins.set(node.id, { group, title, glyph, name: node.name });
    } else {
      group.append(element('circle', { r: 2.35, class: 'district-pin' }));
      group.addEventListener('click', () => selectDistrict(node.id));
    }
    if (node.kind !== 'depot') {
      const label = element('text', { y: node.kind === 'center' ? 9 : 7, class: 'map-label' });
      label.textContent = node.name;
      group.append(label);
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
    marker.append(
      title,
      element('circle', { r: 3.7, class: 'vehicle-disc' }),
      element('path', { d: vehicleGlyphs[type], class: 'bike-glyph', 'pointer-events': 'none' }),
    );
    marker.addEventListener('click', () => selectVehicle(id));
    svg.append(marker);
    vehiclePins.set(id, marker);
    return marker;
  }

  return {
    select(id: string) {
      for (const [key, area] of areas) area.classList.toggle('selected', key === id);
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
          const radius = 9 + 8 * Math.floor(slot / parkingAngles.length);
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
