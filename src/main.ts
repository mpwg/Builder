import { createClock } from './browser/clock';
import { applyCommand, createGame, readView, step } from './core/game';
import { drawCoverMap, drawMap } from './ui/map';

import type { Command } from './core/model';
import { byId, money, setText } from './ui/dom';
import { createWorkbench } from './ui/workbench';

const menu = byId('menu');
const game = byId('game');
const board = byId('board');
const panels = document.querySelectorAll<HTMLElement>('[data-view]');
const viewButtons = document.querySelectorAll<HTMLButtonElement>('[data-open-view]');
const fleetButtons = document.querySelectorAll<HTMLButtonElement>('[data-fleet-view]');
const compactButtons = document.querySelectorAll<HTMLButtonElement>('button[data-compact-view]');
const localViews = document.querySelectorAll<HTMLElement>('[data-local-active]');
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

const workbench = createWorkbench(send, id => {
  selectDistrict(id);
  openView('gebiete', 'district-work');
}, openDepot, () => paint(1));

function openView(name: string, heading?: string) {
  board.dataset.activeView = name;
  for (const panel of panels) panel.hidden = panel.dataset.view !== name;
  for (const button of viewButtons) {
    if (button.dataset.openView === name) button.setAttribute('aria-current', 'true');
    else button.removeAttribute('aria-current');
  }
  if (heading) byId(heading).focus({ preventScroll: true });
}

function openFleetView(name: string) {
  for (const button of fleetButtons) {
    const active = button.dataset.fleetView === name;
    button.setAttribute('aria-pressed', String(active));
    byId(button.getAttribute('aria-controls')!).hidden = !active;
  }
}

function openCompactView(name: string) {
  board.dataset.compactView = name;
  for (const button of compactButtons) {
    button.setAttribute('aria-pressed', String(button.dataset.compactView === name));
  }
}

function openLocalView(panel: HTMLElement, name: string) {
  panel.dataset.localActive = name;
  for (const button of panel.querySelectorAll<HTMLButtonElement>('[data-local-view]')) {
    button.setAttribute('aria-pressed', String(button.dataset.localView === name));
  }
}

function openDepot(id: string) {
  workbench.selectDepot(id);
  openView('depots', 'depot-work');
}

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
    setText(button.lastElementChild!, `${count} offen`);
    button.setAttribute('aria-pressed', String(selected === area.id));
  }
  const area = view.districts.find(area => area.id === selected);
  if (!area) return;
  map.select(area.id, area.depotId);
  const total = area.waiting.reduce((n, item) => n + item.quantity, 0);
  const overdue = area.waiting.reduce((n, item) => n + item.overdue, 0);
  const delivered = area.delivered.reduce((n, item) => n + item.quantity, 0);
  setText(byId('details'), `Offen: ${total} · davon überfällig: ${overdue} · zugestellt: ${delivered}`);
}

function selectDistrict(id: string) {
  selected = id;
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
  pause.toggleAttribute('data-paused', value);
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
  openView('betrieb');
  openFleetView('vehicle');
  openCompactView('karte');
  openLocalView(byId('view-gebiete'), 'sendungen');
  openLocalView(byId('view-depots'), 'bestand');
  openLocalView(byId('view-touren'), 'vorlage');
  byId('seed').textContent = view.seed;
  areaButtons.clear();
  districts.replaceChildren();
  view.districts.forEach((area, i) => {
    const button = document.createElement('button');
    button.type = 'button';
    const key = document.createElement('span');
    key.className = 'area-key';
    key.setAttribute('aria-hidden', 'true');
    key.dataset.area = String(i + 1);
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
  map = drawMap(mapSvg, view.map, id => {
    selectDistrict(id);
    openView('gebiete', 'district-work');
  }, openDepot, id => {
    workbench.selectVehicle(id);
    openFleetView('vehicle');
    openView('flotte', 'fleet-work');
  });
  workbench.update(view);
  selectDistrict(view.districts[0].id);
  menu.hidden = true;
  game.hidden = false;
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
  menu.hidden = false;
  form.hidden = true;
  newGame.hidden = false;
  newGame.focus();
});
for (const button of viewButtons) {
  button.addEventListener('click', () => {
    const viewName = button.dataset.openView!;
    openView(viewName);
    let destination = byId(button.getAttribute('aria-controls')!);
    if (viewName === 'betrieb') {
      const compactControl = [...compactButtons].find(control =>
        control.getAttribute('aria-pressed') === 'true' && control.getClientRects().length > 0,
      );
      destination = compactControl ?? byId('map-heading');
    }
    destination.focus({ preventScroll: true });
  });
}
for (const button of fleetButtons) {
  button.addEventListener('click', () => openFleetView(button.dataset.fleetView!));
}
for (const button of compactButtons) {
  button.addEventListener('click', () => openCompactView(button.dataset.compactView!));
}
for (const panel of localViews) {
  for (const button of panel.querySelectorAll<HTMLButtonElement>('[data-local-view]')) {
    button.addEventListener('click', () => openLocalView(panel, button.dataset.localView!));
  }
}
byId('choose-tour-vehicle').addEventListener('click', () => {
  openFleetView('vehicle');
  openView('flotte', 'vehicle-choice');
});
byId('open-guide').addEventListener('click', () => byId<HTMLDialogElement>('guide').showModal());
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

drawCoverMap(byId<SVGSVGElement>('cover-network'));
