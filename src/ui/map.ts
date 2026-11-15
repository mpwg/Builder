import type { readView } from '../core/game';

type View = ReturnType<typeof readView>;
const namespace = 'http://www.w3.org/2000/svg';
const scaleX = 1.44;
const colors = ['#e4c578', '#b9d2b4', '#d8bbac', '#bccfdc'];
const outlines = [
  '-18,-9 -13,-15 12,-13 18,-5 14,10 2,14 -16,11',
  '-16,-12 11,-15 18,-8 17,7 3,13 -12,12 -19,0',
  '-18,-5 -8,-13 12,-12 18,-1 13,12 -8,14 -18,7',
  '-18,-8 4,-14 16,-9 18,4 10,13 -14,11 -19,4',
];

function element<K extends keyof SVGElementTagNameMap>(
  tag: K, attributes: Record<string, string | number>,
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(namespace, tag);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
  return node;
}

export function drawMap(svg: SVGSVGElement, map: View['map'], select: (id: string) => void) {
  svg.replaceChildren();
  svg.setAttribute('viewBox', '-8 -8 160 116');
  const nodes = new Map(map.nodes.map(node => [node.id, node]));
  const districts = map.nodes.filter(node => node.kind === 'district');
  const areas = new Map<string, SVGPolygonElement>();

  for (const [i, node] of districts.entries()) {
    const area = element('polygon', {
      points: outlines[i], fill: colors[i], class: 'district-shape',
      transform: `translate(${node.x * scaleX} ${node.y})`,
    });
    area.addEventListener('click', () => select(node.id));
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
    if (node.kind === 'center') {
      group.append(
        element('rect', { x: -5, y: -4, width: 10, height: 8, rx: 1, class: 'center-pin' }),
        element('path', { d: 'M-3 -1.6 0 .8 3 -1.6', class: 'envelope-fold' }),
      );
    } else if (node.kind === 'depot') {
      group.append(element('rect', { x: -2, y: -2, width: 4, height: 4, transform: 'rotate(45)', class: 'depot-pin' }));
    } else {
      group.append(element('circle', { r: 2.35, class: 'district-pin' }));
      group.addEventListener('click', () => select(node.id));
    }
    if (node.kind !== 'depot') {
      const label = element('text', { y: node.kind === 'center' ? 9 : 7, class: 'map-label' });
      label.textContent = node.name;
      group.append(label);
    }
    svg.append(group);
  }

  const bicycle = element('g', { 'data-testid': 'vehicle', class: 'vehicle' });
  bicycle.append(
    element('circle', { r: 3.7, class: 'vehicle-disc' }),
    element('path', { d: 'M-2.2 1.1A.85 .85 0 1 0-.5 1.1A.85 .85 0 1 0-2.2 1.1M.65 1.1A.85 .85 0 1 0 2.35 1.1A.85 .85 0 1 0 .65 1.1M-1.35 1.1-.55-.8.35 1.1ZM.35 1.1 1.25-1.05h.65M-.95-.8h.8', class: 'bike-glyph' }),
  );
  svg.append(bicycle);

  return {
    select(id: string) {
      for (const [key, area] of areas) area.classList.toggle('selected', key === id);
    },
    render(vehicle: View['vehicle'], previous: View['vehicle'], alpha: number) {
      const x = previous.x + (vehicle.x - previous.x) * alpha;
      const parkingOffset = vehicle.phase === 'idle' ? 8 : 0;
      const y = previous.y + (vehicle.y - previous.y) * alpha;
      bicycle.setAttribute('transform', `translate(${(x * scaleX + parkingOffset).toFixed(2)} ${y.toFixed(2)})`);
      bicycle.setAttribute('data-phase', vehicle.phase);
      bicycle.classList.toggle('parked', vehicle.phase === 'idle');
    },
  };
}
