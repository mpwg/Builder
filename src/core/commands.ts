import { DEPOT_OPEN_COST, MAX_BUNDLE_WAIT, VEHICLES } from './balance';
import { CENTER_ID } from './map';
import type { CommandEnvelope, CommandResult, GameState, VehicleState, VehicleType } from './model';
import { isAccepting } from './depots';

export function createVehicle(type: VehicleType, homeId: string, sequence: number): VehicleState {
  return {
    id: `vehicle-${String(sequence).padStart(6, '0')}`,
    type, homeId, template: null, pendingHomeId: null, phase: 'idle', waitReason: null,
  };
}

export function applyCommand(state: GameState, envelope: CommandEnvelope): CommandResult {
  const reject = (reason: string): CommandResult => ({ ok: false, state, reason });
  const { id, command, baseRevision } = envelope;
  if (!id.trim()) return reject('Zur Bestätigung fehlt eine Befehls-ID.');
  if (state.appliedCommandIds.includes(id)) return { ok: true, state };
  if (baseRevision !== state.revision) return reject('Die Planung hat sich geändert. Bitte prüfe die aktuelle Konfiguration.');
  const accept = (changes: Partial<GameState>): CommandResult => ({
    ok: true,
    state: { ...state, ...changes, revision: state.revision + 1, appliedCommandIds: [...state.appliedCommandIds, id] },
  });
  const depot = 'depotId' in command ? state.depots.find(({ id }) => id === command.depotId) : undefined;
  const district = 'districtId' in command ? state.districts.find(({ id }) => id === command.districtId) : undefined;
  const vehicle = 'vehicleId' in command ? state.vehicles.find(({ id }) => id === command.vehicleId) : undefined;
  const investment = (cost: number) => ({
    budget: state.budget - cost, expenses: state.expenses + cost, investmentExpenses: state.investmentExpenses + cost,
  });
  const depotUnavailable = 'Wähle ein geöffnetes Depot, das nicht geräumt wird.';

  switch (command.type) {
    case 'open-depot':
      if (!depot || depot.open) return reject('An diesem Standort kann derzeit kein Depot eröffnet werden.');
      if (state.budget < DEPOT_OPEN_COST) return reject('Das Budget reicht für die Depoteröffnung nicht aus.');
      return accept({
        ...investment(DEPOT_OPEN_COST),
        depots: state.depots.map((item) => item === depot ? { ...depot, open: true } : item),
      });
    case 'close-depot':
      if (!depot || depot.id === CENTER_ID || !isAccepting(depot)) return reject('Dieses Depot kann nicht zur Räumung freigegeben werden.');
      return accept({
        depots: state.depots.map((item) => item === depot ? { ...depot, closing: true } : item),
        districts: state.districts.map((item) => item.depotId === depot.id ? { ...item, depotId: CENTER_ID } : item),
        vehicles: state.vehicles.map((item) => {
          if (item.phase === 'relocating') return item;
          if (item.homeId === depot.id && !item.pendingHomeId) return { ...item, pendingHomeId: CENTER_ID };
          if (item.pendingHomeId === depot.id) {
            const homeClosing = state.depots.some(({ id, closing }) => id === item.homeId && closing);
            return { ...item, pendingHomeId: homeClosing ? CENTER_ID : null };
          }
          return item;
        }),
      });
    case 'buy-vehicle': {
      if (!isAccepting(depot)) return reject(depotUnavailable);
      if (!Object.hasOwn(VEHICLES, command.vehicleType)) return reject('Dieser Fahrzeugtyp ist unbekannt.');
      const cost = VEHICLES[command.vehicleType].purchaseCost;
      if (state.budget < cost) return reject('Das Budget reicht für den Kauf nicht aus.');
      return accept({
        ...investment(cost),
        vehicles: [...state.vehicles, createVehicle(command.vehicleType, command.depotId, state.revision + 100)],
      });
    }
    case 'relocate-vehicle':
      if (!vehicle) return reject('Dieses Fahrzeug ist unbekannt.');
      if (!isAccepting(depot)) return reject(depotUnavailable);
      if (vehicle.phase === 'relocating') return reject('Das Fahrzeug ist bereits auf einer Überführungsfahrt.');
      return accept({
        vehicles: state.vehicles.map((item) => item === vehicle
          ? { ...vehicle, pendingHomeId: command.depotId === vehicle.homeId ? null : command.depotId } : item),
      });
    case 'assign-district':
      if (!district) return reject('Dieses Zustellgebiet ist unbekannt.');
      if (!isAccepting(depot)) return reject(depotUnavailable);
      return accept({
        districts: state.districts.map((item) => item === district ? { ...district, depotId: command.depotId } : item),
      });
    case 'set-priority':
      if (!district || !Number.isInteger(command.priority) || command.priority < 0 || command.priority > 2) {
        return reject('Wähle für ein bekanntes Gebiet eine Priorität von 0 bis 2.');
      }
      return accept({
        districts: state.districts.map((item) => item === district ? { ...district, priority: command.priority } : item),
      });
    case 'set-bundle-wait':
      if (!depot || !isAccepting(depot)) return reject(depotUnavailable);
      if (!Number.isInteger(command.ticks) || command.ticks < 0 || command.ticks > MAX_BUNDLE_WAIT) {
        return reject(`Die Bündelwartezeit muss zwischen 0 und ${MAX_BUNDLE_WAIT} ganzen Takten liegen.`);
      }
      return accept({
        depots: state.depots.map((item) => item === depot ? { ...depot, bundleWaitTicks: command.ticks } : item),
      });
    case 'set-template': {
      if (!vehicle) return reject('Dieses Fahrzeug ist unbekannt.');
      const { districtIds } = command;
      if (districtIds !== null && (
        !districtIds.length || new Set(districtIds).size !== districtIds.length ||
        !districtIds.every((districtId) => state.districts.some((item) =>
          item.id === districtId && item.depotId === (vehicle.pendingHomeId ?? vehicle.homeId)))
      )) return reject('Die Vorlage braucht eine eindeutige Liste von Gebieten des Heimatdepots.');
      return accept({
        vehicles: state.vehicles.map((item) => item === vehicle
          ? { ...vehicle, ...(vehicle.phase === 'idle' ? { waitReason: null } : {}), template: districtIds === null ? null : [...districtIds] } : item),
      });
    }
    default:
      return reject('Dieser Spielerbefehl ist unbekannt.');
  }
}
