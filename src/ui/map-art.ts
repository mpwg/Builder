import type { MapNode } from '../core/model';

export const mapViewBox = '-8 -8 160 116';
export const mapScaleX = 1.44;

export const districtOutlines = [
  'M-37-22Q-30-25-22-21L-16-24-6-22 2-26Q9-29 16-23L25-24 30-18Q39-16 37-8L40-1 32 6Q34 13 27 13L22 22 12 22 5 25-2 21-13 24-19 20-31 21-36 14-42 12-41 5-46-2-42-9-43-16Z',
  'M-34-21-27-23-18-21Q-11-27-3-25L7-22 14-25 20-21 34-21 40-16 42-9 47-4 44 5 48 12 43 18 32 18 27 24 19 22 13 26 4 22-8 24-14 18-22 20-24 13-34 11-32 5-40 0-36-7-40-13Z',
  'M-36-19-29-23-24-21-14-25-5-21 5-23 13-18 22-22 31-17 34-9 43-8 39 0 44 6 37 12 35 19 26 18 18 23 12 20 3 26-4 22-16 24-23 20-32 21-37 17-42 16-39 10-46 4-42-1-45-7-39-12Z',
  'M-33-16-28-22-19-20-12-25-4-22 3-25 12-19 20-22 32-18 38-19 44-12 42-5 48 0 43 8 45 17 37 19 26 20 20 23 13 20 4 25-3 20-14 23-22 18-32 21-37 14-43 11-39 5-44-1-38-8Z',
];

const river = 'M97-123Q95-87 104-59T103-15C105-4 89 4 88 18S104 40 99 53 80 68 77 82 69 93 53 101 38 111 39 119C38 133 29 140 25 154S23 183 23 190H36C36 178 35 166 38 154S51 133 52 119C53 110 67 108 76 101S87 88 88 82 106 68 110 55 100 30 98 19 116 1 114-15Q125-39 115-60T110-123Z';
const shore = 'M78 110Q88 99 97 98T111 97Q117 96 122 100T139 98Q150 91 168 90T200 85V190H62Q86 167 78 154T78 110Z';
let nextArtId = 0;

export function svgElement<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attributes: Record<string, string | number>,
): SVGElementTagNameMap[K] {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
  return node;
}

export function mapPath(d: string, className: string) {
  return svgElement('path', { d, class: className });
}

export function mapPosition(node: MapNode) {
  return `translate(${node.x * mapScaleX} ${node.y})`;
}

export function landscape() {
  const id = `postal-art-${nextArtId++}`;
  const defs = svgElement('defs', {});
  const tree = svgElement('g', { id: `${id}-tree` });
  tree.append(
    mapPath('M-.7 0C-2.6-.1-3.4-1.6-2.9-3.7-3.4-5.1-2.2-6.2-1.8-6.5-1.8-8.3-.7-9.1.5-8.7 1.3-8.6 2.1-7.6 2.1-6.2 3.1-5.3 3.5-4.4 3-3.3 3.3-1.1 1.8.1-.7 0Z', 'scenery-tree'),
    mapPath('M-1.9-3.9C-1.8-6.3-.4-7.9.4-7.6S.5-4.2-.3-3.4-1.8-3.3-1.9-3.9Z', 'scenery-tree-light'),
    mapPath('M-.1 1.4.1-6M0-1.5-1.7-3.5M.1-3.3 1.7-4.9', 'scenery-branches'),
  );
  const home = svgElement('g', { id: `${id}-home` });
  home.append(
    mapPath('M-3.2-3.5H3.3L3.7.2H-3.1Z', 'scenery-wall'),
    mapPath('M-.8-3.5H3.4L3.7.2H-.8Z', 'scenery-wall-shade'),
    mapPath('M-4.2-3.3-2.9-6H2.4L4.1-3.3Z', 'scenery-roof'),
    mapPath('M-2.9-6H2.4L3.1-4.8H-3.4Z', 'scenery-roof-light'),
    mapPath('M-.8.2V-1.6H.3V.2ZM-2.6-2.7H-1.6V-1.8H-2.6ZM1.7-2.7H2.7V-1.8H1.7Z', 'scenery-window'),
  );
  const grain = svgElement('pattern', { id: `${id}-paper`, width: 11.5, height: 7.7, patternUnits: 'userSpaceOnUse' });
  grain.append(
    mapPath('M1 1.9l.25.1M3.8 1l.25-.2M6.7 2.8l.35.1M1.1 5.1l.45-.15M4.9 5.7l.35-.12M8.3 6.1h.3M9.5 1.3l.15-.15M10.8 4.1l.25.12', 'scenery-grain-dark'),
    mapPath('M2.5 3.3l.35-.2M5.1 2.2l.45-.15M8.2 1.1h.3M3 6.2l.4-.15M6.7 4.8l.4.1M9.9 4l.28-.15', 'scenery-grain-light'),
  );
  const waterClip = svgElement('clipPath', { id: `${id}-water` });
  waterClip.append(svgElement('path', { d: river }));
  defs.append(tree, home, grain, waterClip);

  const ground = svgElement('g', { class: 'map-scenery', 'aria-hidden': 'true' });
  ground.append(
    svgElement('rect', { x: -72, y: -120, width: 290, height: 310, class: 'map-paper' }),
    mapPath('M-11 25Q9 15 27 20T53 12Q67 2 78 12T110 18L139 5 157 20V39Q130 31 110 44T73 52Q47 54 36 46T-11 58Z', 'map-pasture'),
    mapPath('M-12 83Q9 66 40 71T68 62L67 99Q42 117 17 107T-12 111Z', 'map-pasture'),
    mapPath('M-12 42Q13 36 25 39T57 47Q72 49 82 44M-12 44Q13 38 25 41T56 49Q72 51 82 46M113 10Q131 3 154 10M112 12Q130 5 155 12M99 83Q116 76 131 82T159 80', 'scenery-contours'),
  );

  const foreground = svgElement('g', { class: 'map-scenery', 'aria-hidden': 'true' });
  foreground.append(
    mapPath(river, 'map-water'),
    mapPath(shore, 'map-water map-shore'),
    svgElement('rect', { x: -72, y: -120, width: 290, height: 310, fill: `url(#${id}-paper)` }),
  );

  for (const [x, y, scale] of [
    [102, 0, .9], [94, 10, .82], [93, 21, .68], [102, 40, .74], [105, 49, .9],
    [100, 61, .76], [88, 72, .75], [82, 85, .66], [71, 97, .86], [57, 105, .9],
    [112, 104, .86], [125, 105, .95], [138, 104, .78], [146, 99, .68],
  ]) {
    const ripple = mapPath('M-2 0Q-1 .45 0-.1T2-.05M-1 1.3Q0 1.65 1.2 1', 'water-ripple');
    ripple.setAttribute('transform', `translate(${x} ${y}) scale(${scale})`);
    foreground.append(ripple);
  }

  for (const [x, y, scale] of [
    [0, 9, 1.15], [5, 3, .95], [12, 7, .95], [20, 2, .67], [24, 4, .62],
    [46, 12, .77], [48, 6, 1.05], [54, 8, .68], [75, 4, .92], [79, 9, .67],
    [122, 3, .88], [128, 9, 1.1], [133, 6, .93], [141, 11, .85], [145, 7, .98],
    [1, 32, .83], [8, 37, .99], [14, 35, .68], [14, 49, .83], [34, 43, .76],
    [61, 39, .78], [62, 34, .72], [70, 41, .85], [78, 36, .72],
    [126, 38, .77], [134, 37, .9], [140, 42, .9], [147, 34, .7], [147, 56, 1.14],
    [4, 62, .84], [11, 59, .92], [18, 62, .64], [26, 55, .88], [29, 58, .64],
    [48, 58, .71], [51, 61, .59], [63, 69, 1.02], [67, 73, .78],
    [3, 88, 1.1], [7, 94, .65], [10, 88, .79], [16, 100, .85], [26, 96, .98],
    [36, 90, .84], [40, 96, 1.07], [46, 92, .84], [53, 89, .67], [56, 86, .95],
    [92, 98, .74], [95, 92, 1.04], [133, 66, .8], [142, 68, 1.02], [146, 75, .98],
  ]) {
    foreground.append(svgElement('use', {
      href: `#${id}-tree`, transform: `translate(${x} ${y}) scale(${scale})`,
      class: scale > .85 ? 'scenery-tall-tree' : 'scenery-small-tree',
    }));
  }

  for (const [x, y, scale] of [
    [16, 12, .85], [24, 11, .75], [11, 19, .68], [18, 18, .7],
    [42, 7, .64], [58, 8, .75], [65, 4, .64], [80, 16, .72],
    [113, 10, .8], [118, 15, .75], [137, 20, .8], [143, 23, .65],
    [5, 44, .7], [18, 45, .63], [27, 41, .74], [39, 53, .72], [45, 44, .68],
    [54, 53, .6], [53, 49, .76], [82, 47, .8], [86, 50, .66],
    [119, 49, .82], [124, 52, .66], [140, 51, .75],
    [8, 72, .83], [16, 70, .67], [27, 63, .75], [31, 65, .6], [36, 63, .55],
    [55, 71, .71], [58, 75, .68], [65, 63, .7], [70, 65, .68],
    [5, 103, .75], [24, 91, .74], [30, 92, .62], [43, 102, .74], [54, 96, .65],
    [59, 91, .82], [78, 100, .71], [104, 70, .55], [146, 85, .75], [139, 79, .78],
  ]) {
    foreground.append(svgElement('use', {
      href: `#${id}-home`, transform: `translate(${x} ${y}) scale(${scale})`,
      class: scale > .73 ? 'scenery-brick-roof' : 'scenery-clay-roof',
    }));
  }

  const harbor = svgElement('g', { transform: 'translate(120 97)' });
  harbor.append(
    mapPath('M-17-1H21V1H-17ZM-15 1h1.1v2h-1.1Zm9 0h1.1v2H-6Zm13 0h1.1v2H7Zm10 0h1.1v2H17Z', 'scenery-wharf'),
    mapPath('M-14-1v-2h5v2zm1-2v-8h2v8zm0-8 7-3m-5 3 5-3 5 2h-12m7-2v2m3 0v4q0 1-1 1t-1-1', 'scenery-crane'),
    mapPath('M-6-5h7v4h-7zm7 0h7v4H1zm-5-4h7v4h-7z', 'scenery-containers'),
    mapPath('M-4.6-4v2m2-2v2m2-2v2m3-2v2m2-2v2m2-2v2m-9-6v2m2-2v2m2-2v2', 'scenery-container-lines'),
    mapPath('M10 2h15l-2 3H12zM13 2V.5h7.5V2M15 .5V-1h4v1.5M16.5-1v-2h2', 'scenery-boat'),
  );
  foreground.append(harbor);
  return { defs, ground, foreground, waterClipId: waterClip.id };
}
