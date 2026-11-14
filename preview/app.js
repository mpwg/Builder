import { groups, screens } from './screens.js';

const catalogue = document.querySelector('#catalogue');
const frame = document.querySelector('#screen');
const order = [...screens.keys()];

function element(tag, className, content) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (typeof content === 'string') node.textContent = content;
  else if (content) node.append(...content);
  return node;
}

function link(label, id, className) {
  const node = element('a', className, label);
  node.href = '#' + id;
  return node;
}

const entryLinks = new Map();
for (const [title, entries] of groups) {
  const list = element('ul');
  for (const screen of entries) {
    const entry = link(screen.title, screen.id);
    entryLinks.set(screen.id, entry);
    list.append(element('li', '', [entry]));
  }
  catalogue.append(element('section', 'catalogue-group', [element('h2', '', title), list]));
}

const places = [
  ['quarry', 'Nordgrube', 'hilfe'],
  ['second-quarry', 'Westgrube', 'bau'],
  ['warehouse', 'Zentrallager', 'depot'],
  ['factory', 'Fabrik', 'fabrik'],
  ['junction', 'Kreuzung', 'kreuzung'],
  ['truck', 'Lkw', 'fahrzeug'],
  ['terminal', 'Bahnlinie', 'bahn'],
];

function symbol(name, label) {
  const token = element('span', 'token ' + name);
  token.setAttribute('role', 'img');
  token.setAttribute('aria-label', label);
  return token;
}

function recipe() {
  return element('p', 'recipe', [
    symbol('circle', 'Blauer Kreis'), '+', symbol('triangle', 'Gelbes Dreieck'),
    '→', symbol('square', 'Violettes Quadrat'),
  ]);
}

function map(screen) {
  const image = element('img', 'map-image');
  image.src = './modellbahn.jpg';
  image.alt = 'Modellbahnstadt mit Fluss, Güterzug, zwei Steinbrüchen und Lagerzufahrt';
  const map = element('div', 'map', [image]);
  if (screen.selection) {
    for (const [id, label, destination] of places) {
      const pin = link(label, destination, 'pin pin-' + id);
      if (screen.selection === id) pin.classList.add('selected');
      map.append(pin);
    }
  }
  if (screen.layer || screen.id === 'strasse' || screen.id === 'bau-fehler') {
    const layer = element('span', 'map-layer ' + (screen.layer ?? screen.id));
    layer.setAttribute('aria-hidden', 'true');
    map.append(layer);
  }
  return map;
}

function gameHeader(screen) {
  const [quantity, rate] = screen.metrics ?? ['0 / 40', '0 / 4'];
  const speed = element('div', 'speed', [link('Pause', 'pause')]);
  for (const value of ['1×', '2×', '4×']) {
    const button = element('button', '', value);
    button.type = 'button';
    button.setAttribute('aria-pressed', String(value === '1×'));
    button.addEventListener('click', () => {
      for (const control of speed.querySelectorAll('button')) {
        control.setAttribute('aria-pressed', String(control === button));
      }
    });
    speed.append(button);
  }
  const target = link('Lieferziel', 'zielabgabe', 'target-link');
  target.append(symbol('square', 'Violettes Quadrat'), element('strong', '', quantity));
  return element('header', 'game-header', [
    link('Symbol-Logistik', 'start', 'game-title'), target,
    element('span', 'rate', [element('span', '', 'Pro Minute'), element('strong', '', rate)]),
    speed, link('Spielstand', 'spielstand', 'save-link'),
  ]);
}

function toolbar(screen) {
  const tools = [
    ['Straße', 'strasse'], ['Abbau', 'bau'], ['Fabrik', 'fabrik'], ['Lager', 'depot'], ['Bahn', 'bahn-bau'],
    ['Verkehr', 'belastung'], ['Warenwege', 'warenwege'], ['Sanierung', 'sanierung'],
  ];
  const nav = element('nav', 'toolbar');
  nav.setAttribute('aria-label', 'Bauwerkzeuge und Kartenansichten');
  for (const [label, id] of tools) nav.append(link(label, id, screen.id === id ? 'active' : ''));
  return nav;
}

function phaseDiagram() {
  const phases = [
    ['Jetzt aktiv', '↕', 'Nord–Süd'],
    ['Als Nächstes', '↔', 'Ost–West'],
  ];
  return element('div', 'phases', phases.map(([state, arrow, direction]) =>
    element('div', 'phase', [
      element('strong', 'direction', arrow),
      element('span', '', [element('small', '', state), element('strong', '', direction)]),
    ])
  ));
}

function signalTimeline() {
  return element('div', 'timeline', [
    element('p', 'eyebrow', 'Phasenversatz'),
    element('p', '', 'Ampel 1 · 0 Sekunden'),
    element('div', 'timing'),
    element('p', '', 'Ampel 2 · 12 Sekunden'),
    element('div', 'timing offset'),
  ]);
}

function panel(screen) {
  const heading = element('h1', '', screen.title);
  heading.id = 'view-title';
  heading.tabIndex = -1;
  const content = element('section', 'panel' + (screen.tone ? ' ' + screen.tone : ''), [heading]);
  content.setAttribute('aria-labelledby', heading.id);
  if (screen.status) content.append(element('p', 'status', screen.status));
  if (screen.copy) content.append(element('p', 'description', screen.copy));
  if (screen.recipe) content.append(recipe());
  if (screen.signal) content.append(phaseDiagram());
  if (screen.timeline) content.append(signalTimeline());
  if (screen.facts) {
    const facts = element('dl', 'facts');
    for (const [name, value] of screen.facts) {
      facts.append(element('div', '', [element('dt', '', name), element('dd', '', value)]));
    }
    content.append(facts);
  }
  for (const [label, value] of screen.fields ?? []) {
    const field = element('input');
    field.value = value;
    content.append(element('label', 'field', [label, field]));
  }
  if (screen.file) {
    const file = element('input');
    file.type = 'file';
    file.accept = '.json,application/json';
    content.append(element('label', 'field', ['Spielstanddatei', file]));
  }
  if (screen.items) {
    content.append(element('ul', 'item-links', screen.items.map(([label, id]) =>
      element('li', '', [link(label, id)]))));
  }
  if (screen.cards) {
    content.append(element('div', 'offers', screen.cards.map(([type, product, equation, sources, id]) =>
      element('article', 'offer', [
        element('p', 'eyebrow', type), element('h2', '', product), element('p', '', equation),
        element('p', 'sources', sources), link('Auswählen', id, 'action primary'),
      ])
    )));
  }
  if (screen.actions?.length) {
    content.append(element('div', 'actions', screen.actions.map(([label, id], index) =>
      link(label, id, index === 0 ? 'action primary' : 'action')
    )));
  }
  return content;
}

function render(focus = false) {
  const key = location.hash.slice(1);
  const screen = screens.get(key) ?? screens.get('start');
  const index = order.indexOf(screen.id);
  document.title = screen.title + ' · Symbol-Logistik';
  document.querySelector('#section').textContent = groups.find(([, entries]) => entries.includes(screen))[0];
  document.querySelector('#screen-name').textContent = screen.title;
  document.querySelector('#position').textContent = (index + 1) + ' / ' + order.length;
  document.querySelector('#previous').href = '#' + order[(index + order.length - 1) % order.length];
  document.querySelector('#next').href = '#' + order[(index + 1) % order.length];

  for (const [id, entry] of entryLinks) {
    if (id === screen.id) entry.setAttribute('aria-current', 'page');
    else entry.removeAttribute('aria-current');
  }

  const scene = element('div', 'scene ' + (screen.view ?? 'inspector') + (screen.wide ? ' wide' : ''));
  scene.append(map(screen), panel(screen));
  const game = element('div', 'game', screen.view === 'cover'
    ? [scene]
    : [gameHeader(screen), scene, toolbar(screen)]);
  frame.replaceChildren(game);
  if (focus) {
    frame.querySelector('h1').focus({ preventScroll: true });
    const active = entryLinks.get(screen.id);
    const bounds = catalogue.getBoundingClientRect();
    const entry = active.getBoundingClientRect();
    if (entry.top < bounds.top || entry.bottom > bounds.bottom) {
      catalogue.scrollTop += entry.top - bounds.top - 12;
    }
  }
}

window.addEventListener('hashchange', () => render(true));
window.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  const screen = screens.get(location.hash.slice(1));
  const exit = screen?.actions?.find(([label]) => /^(Verwerfen|Abbrechen|Verlassen)$/.test(label));
  if (exit) location.hash = exit[1];
});
render();
