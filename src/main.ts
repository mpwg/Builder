import { createClock } from './browser/clock';
import { applyCommand, createGame, readView, step } from './core/game';
import { drawMap } from './ui/map';

import type { Command } from './core/model';
import { byId, money, setText } from './ui/dom';
import { createWorkbench } from './ui/workbench';

const menu = byId('menu');
const game = byId('game');
const form = byId<HTMLFormElement>('seed-form');
const seed = byId<HTMLInputElement>('seed-input');
const newGame = byId<HTMLButtonElement>('new-game');
const menuButton = byId<HTMLButtonElement>('menu-button');
const pause = byId<HTMLButtonElement>('pause');
const mapSvg = byId<SVGSVGElement>('network');
const mapScroll = byId('map-scroll');
const districts = byId('districts');
const clockOutput = byId('clock');
const speeds = document.querySelectorAll<HTMLButtonElement>('[data-speed]');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let state: ReturnType<typeof createGame> | undefined;
let view: ReturnType<typeof readView>;
let previous: typeof view;
let map: ReturnType<typeof drawMap>;
let selected = '';
let paused = false;
let frameId = 0;
let zoom = 1;
let commandId = 0;
let displayed: typeof view | undefined;
const areaButtons = new Map<string, HTMLButtonElement>();

const clock = createClock(() => {
  if (!state) return;
  previous = view;
  state = step(state);
  view = readView(state);
});

const workbench = createWorkbench(send, selectDistrict, () => paint(1));

function send(command: Command) {
  if (!state) return 'Starte zuerst eine Partie.';
  const result = applyCommand(state, { id: String(++commandId), baseRevision: view.revision, command });
  if (!result.ok) return result.reason;
  previous = view;
  state = result.state;
  view = readView(state);
  render();
}

function paint(alpha: number) {
  map.render(view.vehicles, previous.vehicles, reduced.matches || paused ? 1 : alpha, view.depots, workbench.selectedVehicle());
}

function render(alpha = 1) {
  if (displayed !== view) {
    displayed = view;
    const seconds = Math.floor(view.tick / 10);
    const time = [Math.floor(seconds / 60), seconds % 60].map(n => String(n).padStart(2, '0')).join(':');
    clockOutput.dataset.tick = String(view.tick);
    setText(clockOutput, time);
    setText(byId('revenue'), money(view.revenue));
    setText(byId('event'), view.latestEvent);
    renderDistricts();
    workbench.update(view);
  }
  paint(alpha);
}

function renderDistricts() {
  for (const area of view.districts) {
    const button = areaButtons.get(area.id)!;
    const count = area.waiting.reduce((total, item) => total + item.quantity, 0);
    setText(button.lastElementChild!, String(count));
    button.setAttribute('aria-pressed', String(selected === area.id));
  }
  const area = view.districts.find(area => area.id === selected);
  if (!area) return;
  const total = area.waiting.reduce((n, item) => n + item.quantity, 0);
  const overdue = area.waiting.reduce((n, item) => n + item.overdue, 0);
  const delivered = area.delivered.reduce((n, item) => n + item.quantity, 0);
  setText(byId('details'), `Offen: ${total} · davon überfällig: ${overdue} · zugestellt: ${delivered}`);
}

function selectDistrict(id: string) {
  selected = id;
  map.select(id);
  renderDistricts();
  workbench.selectArea(id);
}

function synchronizeFrames() {
  cancelAnimationFrame(frameId);
  if (state && !paused && !document.hidden) frameId = requestAnimationFrame(frame);
}

function frame(now: number) {
  render(clock.frame(now));
  frameId = requestAnimationFrame(frame);
}

function setPaused(value: boolean) {
  paused = value;
  clock.setPaused(value);
  pause.textContent = value ? 'Fortsetzen' : 'Pause';
  byId('pause-note').hidden = !value;
  synchronizeFrames();
  if (value) render();
}

function setZoom(value: number) {
  const x = (mapScroll.scrollLeft + mapScroll.clientWidth / 2) / mapScroll.scrollWidth;
  const y = (mapScroll.scrollTop + mapScroll.clientHeight / 2) / mapScroll.scrollHeight;
  zoom = Math.max(1, Math.min(2.5, value));
  mapSvg.style.width = `${zoom * 100}%`;
  mapSvg.style.height = `${zoom * 100}%`;
  mapScroll.scrollLeft = x * mapScroll.scrollWidth - mapScroll.clientWidth / 2;
  mapScroll.scrollTop = y * mapScroll.scrollHeight - mapScroll.clientHeight / 2;
  byId<HTMLButtonElement>('zoom-in').disabled = zoom === 2.5;
  byId<HTMLButtonElement>('zoom-out').disabled = zoom === 1;
}

function start(value: string) {
  state = createGame(value);
  previous = view = readView(state);
  commandId = 0;
  workbench.reset();
  byId('seed').textContent = view.seed;
  areaButtons.clear();
  districts.replaceChildren();
  view.districts.forEach((area, i) => {
    const button = document.createElement('button');
    button.type = 'button';
    const key = document.createElement('span');
    key.className = 'area-key';
    key.textContent = String(i + 1).padStart(2, '0');
    const name = document.createElement('span');
    name.textContent = view.map.nodes.find(node => node.id === area.id)!.name;
    const total = document.createElement('span');
    total.className = 'area-count';
    button.append(key, name, total);
    button.addEventListener('click', () => selectDistrict(area.id));
    const item = document.createElement('li');
    item.append(button);
    districts.append(item);
    areaButtons.set(area.id, button);
  });
  map = drawMap(mapSvg, view.map, selectDistrict, id => {
    workbench.selectDepot(id);
    byId('depot-work').focus();
  }, id => {
    workbench.selectVehicle(id);
    byId('fleet-work').focus();
  });
  workbench.update(view);
  selectDistrict(view.districts[0].id);
  menu.hidden = true;
  game.hidden = false;
  menuButton.hidden = false;
  byId<HTMLDetailsElement>('guide').open = true;
  setZoom(1);
  speeds[0].click();
  clock.setHidden(document.hidden);
  setPaused(false);
  render();
  byId('map-heading').focus();
}

newGame.addEventListener('click', () => {
  form.hidden = false;
  newGame.hidden = true;
  seed.value = `Post-${crypto.getRandomValues(new Uint16Array(1))[0].toString(16).toUpperCase()}`;
  seed.focus();
  seed.select();
});
form.addEventListener('submit', event => {
  event.preventDefault();
  const error = byId('seed-error');
  const value = seed.value.trim();
  error.hidden = Boolean(value);
  if (!value) {
    error.textContent = 'Gib einen Karten-Seed ein.';
    seed.focus();
    return;
  }
  start(value);
});
menuButton.addEventListener('click', () => {
  state = undefined;
  synchronizeFrames();
  game.hidden = true;
  menuButton.hidden = true;
  menu.hidden = false;
  form.hidden = true;
  newGame.hidden = false;
  newGame.focus();
});
pause.addEventListener('click', () => setPaused(!paused));
for (const button of speeds) {
  button.addEventListener('click', () => {
    clock.setSpeed(Number(button.dataset.speed) as 1 | 2 | 4);
    for (const candidate of speeds) candidate.setAttribute('aria-pressed', String(candidate === button));
  });
}
byId('zoom-in').addEventListener('click', () => setZoom(zoom + 0.25));
byId('zoom-out').addEventListener('click', () => setZoom(zoom - 0.25));
byId('reset-map').addEventListener('click', () => setZoom(1));
document.addEventListener('visibilitychange', () => {
  clock.setHidden(document.hidden);
  synchronizeFrames();
});
