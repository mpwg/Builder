import { DEPOT_OPEN_COST, VEHICLES } from '../core/balance';
import { getRouteTravelTicks } from '../core/routes';
import type { Command, GameView, ShipmentKind, ShipmentSummary, VehicleType } from '../core/model';
import { byId, money, setOptions, setText } from './dom';
import { createTourEditor } from './tour-editor';

const shipments: Record<ShipmentKind, string> = {
  ad: 'Werbung', letter: 'Briefe', registered: 'Einschreiben', parcel: 'Kleine Pakete', freight: 'Speditionsware',
};
const kinds = Object.keys(shipments) as ShipmentKind[];
const expressKinds = new Set<ShipmentKind>(['letter', 'registered', 'parcel']);
const fleetNumber = (id: string) => Number(id.split('-').at(-1)) || id;

const phases = {
  idle: 'Bereit', loading: 'Beladung', outbound: 'Zustellfahrt', servicing: 'Bedienung am Ziel',
  returning: 'Rückfahrt', transfer: 'Depottransfer', relocating: 'Überführung',
};

type Send = (command: Command) => string | undefined;

function select(id: string) {
  return byId<HTMLSelectElement>(id);
}

function sum(rows: readonly ShipmentSummary[], kind?: ShipmentKind) {
  return rows.reduce((total, row) => total + (kind === undefined || row.kind === kind ? row.quantity : 0), 0);
}

function row(kind: ShipmentKind, label: string, parent: Element, marker?: Record<string, string>) {
  const tr = document.createElement('tr');
  for (const [key, value] of Object.entries(marker ?? {})) tr.dataset[key] = value;
  const header = document.createElement('th');
  header.scope = 'row';
  const ns = 'http://www.w3.org/2000/svg';
  const icon = document.createElementNS(ns, 'svg');
  const use = document.createElementNS(ns, 'use');
  use.setAttribute('href', '#shipment-' + kind);
  icon.setAttribute('aria-hidden', 'true');
  icon.classList.add('shipment-icon');
  icon.append(use);
  header.append(icon, label);
  tr.append(header);
  parent.append(tr);
  return {
    update(values: number[]) {
      while (tr.cells.length - 1 < values.length) tr.insertCell();
      values.forEach((value, index) => setText(tr.cells[index + 1], String(value)));
      if (marker) tr.dataset.count = String(values.reduce((total, value) => total + value, 0));
    },
  };
}

export function createWorkbench(
  send: Send,
  onDistrict: (id: string) => void,
  onDepot: (id: string) => void,
  onVehicle: () => void,
) {
  let view: GameView;
  let districtId = '';
  let areaSignature = '';
  let depotSignature = '';
  let templateSignature = '';
  const depotChoice = select('depot-choice');
  const vehicleChoice = select('vehicle-choice');
  const areaDepot = select('district-depot');
  const priority = select('priority');
  const bundle = byId<HTMLInputElement>('bundle');
  const buyType = select('buy-type');
  const buyDepot = select('buy-depot');
  const relocate = select('relocate-depot');
  const open = byId<HTMLButtonElement>('open-depot');
  const close = byId<HTMLButtonElement>('close-depot');
  const release = byId<HTMLButtonElement>('clear-template');
  const depotStat = byId('depot-status');
  const depotMode = byId('depot-mode');
  const depotStock = byId('depot-stock');
  const depotBays = byId('depot-bays');
  const depotFleet = byId('depot-fleet');
  const depotDistricts = byId('depot-districts');
  const problemItems = new Map<string, HTMLLIElement>();
  const report = (id: string) => byId(id).querySelector<HTMLElement>('.feedback')!;

  const districtRows = kinds.flatMap(kind => (
    (expressKinds.has(kind) ? ['standard', 'express'] : ['standard']).map(serviceClass => ({
      kind,
      serviceClass,
      row: row(kind, shipments[kind] + (serviceClass === 'express' ? ' · Express' : ''), byId('district-shipments')),
    }))
  ));
  const totals = new Map(kinds.map(kind => [kind, row(kind, shipments[kind], byId('shipment-totals'), { deliveredKind: kind })]));
  setOptions(buyType, (Object.keys(VEHICLES) as VehicleType[]).map(id => ({ id, name: VEHICLES[id].name })));

  const name = (id: string) => view.map.nodes.find(node => node.id === id)?.name ?? id;
  const currentVehicle = () => view.vehicles.find(vehicle => vehicle.id === vehicleChoice.value);
  const currentDepot = () => view.depots.find(depot => depot.id === depotChoice.value);
  const editor = createTourEditor(renderDraft);

  function submit(command: Command, feedback: HTMLElement, success: string) {
    const problem = send(command);
    feedback.classList.toggle('error', problem !== undefined);
    setText(feedback, problem ?? success);
    if (problem) feedback.focus();
    return problem === undefined;
  }

  function onSubmit(id: string, handler: () => void) {
    byId(id).addEventListener('submit', event => {
      event.preventDefault();
      handler();
    });
  }

  function renderDraft() {
    const vehicle = currentVehicle();
    const route = editor.read();
    const from = vehicle?.homeId;
    if (!vehicle || !from || !route.length) {
      setText(byId('tour-estimate'), 'Füge ein oder mehrere Gebiete zur Vorlage hinzu.');
      return;
    }
    if (route.some(id => view.districts.find(area => area.id === id)?.depotId !== from)) {
      setText(byId('tour-estimate'), 'Ein Halt gehört inzwischen zu einem anderen Depot.');
      return;
    }
    const stops = [from, ...route, from];
    const ticks = stops.slice(1).reduce((sum, id, index) => sum + getRouteTravelTicks(view.map, stops[index], id, vehicle.type), 0);
    setText(byId('tour-estimate'), `Netzfahrzeit: ca. ${(ticks / 10).toLocaleString('de-AT')} s vor Beladung und Zustellung.`);
  }

  function renderArea() {
    const area = view.districts.find(candidate => candidate.id === districtId);
    if (!area) return;
    setText(byId('district-work'), name(area.id));
    for (const { kind, serviceClass, row } of districtRows) {
      const waiting = area.waiting.find(item => item.kind === kind && item.serviceClass === serviceClass);
      const delivered = area.delivered.find(item => item.kind === kind && item.serviceClass === serviceClass);
      row.update([waiting?.quantity ?? 0, waiting?.overdue ?? 0, delivered?.quantity ?? 0]);
    }
    setText(byId('district-classes'), `Zuständig: ${name(area.depotId)}`);
    const signature = [area.id, area.depotId, area.priority].join(':');
    if (signature !== areaSignature) {
      areaSignature = signature;
      areaDepot.value = area.depotId;
      priority.value = String(area.priority);
    }
  }

  function renderDepot() {
    const depot = currentDepot();
    if (!depot) return;
    const mode = depot.closing ? 'Räumung läuft' : depot.open ? 'Geöffnet' : 'Geschlossen';
    const routed = view.districts.filter(area => area.depotId === depot.id).map(area => name(area.id));
    const vehicles = view.vehicles.filter(vehicle => vehicle.homeId === depot.id).length;
    const capacity = depot.capacity === null ? 'unbegrenzt' : depot.capacity;
    setText(depotMode, mode);
    setText(depotStock, `${depot.used} belegt + ${depot.reserved} reserviert / ${capacity}`);
    setText(depotBays, `${depot.busyBays} / ${depot.loadingBays}`);
    setText(depotFleet, String(vehicles));
    setText(depotDistricts, routed.join(', ') || 'Keine');
    depotStat.toggleAttribute('data-open', depot.open && !depot.closing);
    depotStat.dataset.used = String(depot.used);
    depotStat.dataset.reserved = String(depot.reserved);
    open.hidden = depot.id === 'center' || depot.open || depot.closing;
    close.hidden = depot.id === 'center' || !depot.open || depot.closing;
    const closure = byId('depot-closure-plan');
    closure.hidden = close.hidden;
    setText(closure, 'Räumung: Gebiete wechseln zum Postzentrum. Laufende Touren enden regulär. Räumungsfahrten bringen Restbestände zurück, auch wenn ein Fahrzeug eine Tourvorlage hat.');
    byId<HTMLFormElement>('bundle-form').hidden = !depot.open || depot.closing;
    byId('depot-wait-closed').hidden = depot.open && !depot.closing;
    setText(open, `Depot eröffnen · ${money(DEPOT_OPEN_COST)}`);
    const signature = `${depot.id}:${depot.bundleWaitTicks}`;
    if (signature !== depotSignature) {
      depotSignature = signature;
      bundle.value = String(depot.bundleWaitTicks / 10);
    }
  }

  function renderBuy() {
    const config = VEHICLES[buyType.value as VehicleType];
    if (!config) return;
    setText(byId('buy-details'), `${config.capacity} Ladeeinheiten · ${money(config.runningCost)} je 10 s · ${money(config.travelCost)} je 0,1 s Fahrt · ${config.eligible.map(kind => shipments[kind]).join(', ')}`);
    setText(byId('buy-vehicle'), `Fahrzeug kaufen · ${money(config.purchaseCost)}`);
  }

  function renderRelocation() {
    const vehicle = currentVehicle();
    if (!vehicle || !relocate.value) return;
    const ticks = getRouteTravelTicks(view.map, vehicle.homeId, relocate.value, vehicle.type);
    const cost = ticks * VEHICLES[vehicle.type].travelCost;
    setText(byId('relocate-cost'), `Überführung nach Rückkehr: ${money(cost)} Fahrtkosten.`);
  }

  function renderVehicle() {
    const vehicle = currentVehicle();
    if (!vehicle) return;
    const config = VEHICLES[vehicle.type];
    const target = vehicle.targetId ? ` · Ziel: ${name(vehicle.targetId)}` : '';
    setText(byId('vehicle-status'), `${phases[vehicle.phase]} · Heimat: ${name(vehicle.homeId)} · Ladung: ${vehicle.cargo}${target}`);
    setText(byId('vehicle-eligible'), `${config.capacity} Ladeeinheiten · Geeignet für ${config.eligible.map(kind => shipments[kind]).join(', ')}`);
    setText(byId('template-mode'), `${config.name} ${fleetNumber(vehicle.id)} · ${vehicle.template ? 'Verbindliche Vorlage' : 'Automatik'}`);
    setText(byId('tour-remaining'), vehicle.stops.length ? 'Nächste Halte: ' + vehicle.stops.map(name).join(' → ') : 'Keine laufende Tour.');
    setText(byId('tour-wait'), vehicle.waitReason ?? '');
    release.disabled = vehicle.template === null;

    const options = view.districts.filter(area => area.depotId === vehicle.homeId).map(area => ({ id: area.id, name: name(area.id) }));
    for (const id of vehicle.template ?? []) {
      if (!options.some(option => option.id === id)) options.push({ id, name: name(id) });
    }
    editor.updateOptions(options);
    const signature = JSON.stringify([vehicle.id, vehicle.template]);
    if (signature !== templateSignature) {
      templateSignature = signature;
      editor.load(vehicle.template ?? []);
    }
    renderDraft();
    renderRelocation();
  }

  function renderProblems() {
    const list = byId('problems');
    byId('no-problems').hidden = view.problems.length > 0;
    const keys = new Set<string>();
    for (const problem of view.problems) {
      const key = JSON.stringify([problem.nodeId, problem.message]);
      if (keys.has(key)) continue;
      keys.add(key);
      if (problemItems.has(key)) continue;
      const item = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = `${name(problem.nodeId)} · ${problem.message}`;
      button.addEventListener('click', () => {
        if (view.districts.some(area => area.id === problem.nodeId)) {
          onDistrict(problem.nodeId);
        } else if (view.depots.some(depot => depot.id === problem.nodeId)) {
          onDepot(problem.nodeId);
        }
      });
      item.append(button);
      problemItems.set(key, item);
      list.append(item);
    }
    for (const [key, item] of problemItems) {
      if (keys.has(key)) continue;
      if (item.contains(document.activeElement)) byId('problems-work').focus();
      item.remove();
      problemItems.delete(key);
    }
  }

  function selectArea(id: string) {
    districtId = id;
    for (const id of ['assign-form', 'priority-form']) setText(report(id), '');
    renderArea();
  }

  function selectDepot(id: string) {
    depotChoice.value = id;
    setText(byId('depot-feedback'), '');
    setText(report('bundle-form'), '');
    renderDepot();
  }

  function selectVehicle(id: string) {
    vehicleChoice.value = id;
    for (const id of ['relocate-form', 'tour-form']) setText(report(id), '');
    renderVehicle();
    onVehicle();
  }

  onSubmit('assign-form', () => submit({ type: 'assign-district', districtId, depotId: areaDepot.value }, report('assign-form'), 'Zuständigkeit übernommen.'));
  onSubmit('priority-form', () => submit({ type: 'set-priority', districtId, priority: Number(priority.value) }, report('priority-form'), 'Vorrang übernommen.'));
  open.addEventListener('click', () => {
    if (submit({ type: 'open-depot', depotId: depotChoice.value }, byId('depot-feedback'), 'Depot eröffnet.')) depotChoice.focus();
  });
  close.addEventListener('click', () => {
    if (submit({ type: 'close-depot', depotId: depotChoice.value }, byId('depot-feedback'), 'Räumung beauftragt. Ladung kehrt ins Postzentrum zurück, Fahrzeuge folgen nach ihrer Tour.')) depotChoice.focus();
  });
  depotChoice.addEventListener('change', () => selectDepot(depotChoice.value));
  onSubmit('bundle-form', () => submit({ type: 'set-bundle-wait', depotId: depotChoice.value, ticks: Math.round(bundle.valueAsNumber * 10) }, report('bundle-form'), 'Bündelwartezeit übernommen.'));
  vehicleChoice.addEventListener('change', () => selectVehicle(vehicleChoice.value));
  buyType.addEventListener('change', renderBuy);
  relocate.addEventListener('change', renderRelocation);
  onSubmit('relocate-form', () => submit({ type: 'relocate-vehicle', vehicleId: vehicleChoice.value, depotId: relocate.value }, report('relocate-form'), 'Überführung beauftragt.'));
  onSubmit('buy-form', () => {
    const present = new Set(view.vehicles.map(vehicle => vehicle.id));
    if (!submit({ type: 'buy-vehicle', depotId: buyDepot.value, vehicleType: buyType.value as VehicleType }, report('buy-form'), 'Fahrzeug gekauft.')) return;
    const acquired = view.vehicles.find(vehicle => !present.has(vehicle.id));
    if (acquired) selectVehicle(acquired.id);
  });
  onSubmit('tour-form', () => submit({ type: 'set-template', vehicleId: vehicleChoice.value, districtIds: editor.read() }, report('tour-form'), 'Verbindliche Tourvorlage gespeichert.'));
  release.addEventListener('click', () => {
    if (submit({ type: 'set-template', vehicleId: vehicleChoice.value, districtIds: null }, report('tour-form'), 'Die Automatik plant wieder.')) byId('tour-work').focus();
  });

  return {
    update(next: GameView) {
      view = next;
      const depots = view.depots.map(depot => ({ id: depot.id, name: name(depot.id) }));
      const available = view.depots.filter(depot => depot.open && !depot.closing).map(depot => ({ id: depot.id, name: name(depot.id) }));
      setOptions(depotChoice, depots);
      for (const element of [areaDepot, buyDepot, relocate]) setOptions(element, available);
      setOptions(vehicleChoice, view.vehicles.map(vehicle => ({
        id: vehicle.id, name: `${VEHICLES[vehicle.type].name} ${fleetNumber(vehicle.id)} · ${name(vehicle.homeId)}`,
      })));
      renderArea();
      renderDepot();
      renderVehicle();
      renderBuy();
      renderProblems();
      setText(byId('budget'), money(view.budget));
      setText(byId('investment'), money(view.investment));
      setText(byId('operating-expenses'), money(view.operatingExpenses));
      const delivered = view.districts.flatMap(area => area.delivered);
      for (const kind of kinds) {
        totals.get(kind)!.update(['standard', 'express'].map(service => sum(delivered.filter(item => item.serviceClass === service), kind)));
      }
      setText(byId('delivered'), String(sum(delivered)));
    },
    reset() {
      areaSignature = depotSignature = templateSignature = districtId = '';
      vehicleChoice.value = depotChoice.value = buyDepot.value = relocate.value = 'center';
      for (const feedback of document.querySelectorAll('.feedback')) setText(feedback, '');
    },
    selectArea, selectDepot, selectVehicle,
    selectedVehicle: () => vehicleChoice.value,
  };
}
