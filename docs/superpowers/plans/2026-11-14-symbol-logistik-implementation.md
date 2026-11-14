# Symbol-Logistik Implementation Plan

> **Abgelöst.** Die [Architektur-Spezifikation](../specs/2026-11-14-symbol-logistik-architektur.md) legt die installierbare Mac-App mit Rust-Core und Godot 4 fest. Dieser Browserplan bleibt als historische Referenz für fachliche Szenarien, Testfälle und Balancingdaten erhalten.

> **For agentic workers:** Use delegate-coding-efficiently for optional coding delegation, delegate-work-efficiently for non-coding packages, or executing-plans for explicit inline implementation. Delegation must justify its overhead. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eine vollständig lokal im Browser spielbare erste Fassung bauen, in der zufällige Symbolrezepte, detaillierter Straßenverkehr, einfache Bahnlogistik und wählbare Meilensteine einen jederzeit sanierbaren Kreislauf bilden.

**Architecture:** Eine deterministische TypeScript-Simulation besitzt den gesamten Spielzustand und läuft in einem Dedicated Web Worker. Die React-Oberfläche sendet geprüfte Befehle und liest unveränderliche Ansichten; Canvas 2D zeichnet Karte und Fahrzeuge unabhängig vom React-Renderzyklus. Warenbewegungen, Baupläne und Spielstandwechsel sind atomare Zustandsübergänge.

**Tech Stack:** TypeScript im Strict-Modus, React, Vite, Canvas 2D, native Web Worker und IndexedDB; Zod für Importvalidierung, Vitest für Logiktests, Playwright für Browserabläufe. Bun als Paketmanager und für Projektbefehle, Node für Werkzeuge gemäß deren Unterstützung. Keine Spielengine, kein Backend, kein externer Zustandsspeicher und keine CDN-Laufzeitabhängigkeiten.

**Spec:** [Freigegebenes Design](../specs/2026-11-14-symbol-logistik-design.md) und [UX-Flow](../specs/2026-11-14-symbol-logistik-ux-flow.md). Beide Spezifikationen vor Umsetzung lesen. Lokal vorhanden: Bun 1.4.4 und Node 26.13.0. Paketversionen bei Umsetzung gemeinsam auflösen, exakt in `package.json` und `bun.lock` festhalten; keine ungetesteten Versionsnummern aus diesem Plan ableiten.

## Global Constraints

- „Singleplayer im Desktop-Browser mit Maus und Tastatur. Keine Anmeldung, kein Backend und keine laufende Netzwerkabhängigkeit nach dem Laden.“
- „Eine anfängliche Zone, eine zusätzlich erschließbare Zone und ein Zentrallager.“
- „Sechs Symboltypen insgesamt: zwei anfänglich erreichbare Grundressourcen, eine mögliche Grundressource der zweiten Zone und drei mögliche kombinierte Produkte.“
- „Fünf Liefermeilensteine. Nach den ersten vier wird jeweils eine von drei angebotenen Freischaltungen gewählt.“
- „Die erste Fassung enthält ausschließlich Ampeldefekte als Störung.“
- „Vorgeschlagener Abrisswert: 90 Prozent der tatsächlich eingesetzten Materialien.“ Dieser Wert ist durch die Designfreigabe bestätigt.
- „Es gibt weder Game-over noch eine wirtschaftliche Sackgasse: Auch ein vollständig festgefahrenes Netz muss wiederherstellbar bleiben.“
- „Ein Meilenstein verlangt eine sichtbare kumulierte Liefermenge und eine angegebene durchschnittliche Lieferrate über die letzten 60 Simulationssekunden.“
- „Browser- oder Geräteabdeckung nur nach tatsächlicher Prüfung behaupten.“
- Deutsche Oberflächentexte mit Umlauten. Keine Veröffentlichung, kein Push und kein Remote-Repository ohne gesonderten Auftrag. Neue Shellskripte erfordern zuerst den Skill `personal-shell-scripts`; dieser Plan benötigt keine Shellskriptdateien.

## Review Focus

1. Abriss eines vollen Depots bei laufender Zu- und Abfahrt: sämtliche Ladung erhalten und Reservierungen genau einmal lösen; Tests in Aufgabe 11.
2. Doppelt übermittelter Befehl oder veraltete Bauvorschau: keine doppelte Ausgabe, Rückerstattung oder Freischaltung; Tests in Aufgaben 1 und 11.
3. Hintergrund-Tab und verschachtelte Pausen: keine nachgeholte Verkehrsexplosion oder unbeabsichtigte Wiederaufnahme; Tests in Aufgabe 12.
4. Fehlerhafte/neue Importversion, erschöpfter Browserspeicher oder zweiter Tab: laufenden Spielstand behalten, Fehler melden und Export ermöglichen; Tests in Aufgabe 13.
5. Späte alternative Freischaltungsfolge ohne zweite Zone: trotzdem drei gültige Angebote und erreichbare Ziele bis zum fünften Meilenstein; Tests in Aufgabe 10.

---

## Technische Entscheidungen und gemeinsame Verträge

### Simulation und Datenfluss

- `stepGame(state: GameState): void` führt exakt einen Schritt von 50 ms Simulationszeit aus. Reihenfolge: Befehle → Störungen/Signalwechsel → Produktion → Disposition → Fahrzeug- und Zugbewegung → Laden/Entladen → Zielabgabe/Fortschritt → Diagnose. Entitäten werden in stabiler ID-Reihenfolge verarbeitet.
- 1×, 2× und 4× beschleunigen die Anzahl der Schritte, nicht deren Dauer. Der Worker bearbeitet höchstens acht Schritte pro Arbeitsblock und gibt dann die Ereignisschleife frei. Bei Überlastung wird die reale Spielgeschwindigkeit geringer; es werden keine Simulationsschritte übersprungen und kein endloser Rückstand angesammelt. Snapshot-Ausgabe höchstens zehnmal pro realer Sekunde und sofort nach bestätigten Bedienbefehlen.
- Zufall ausschließlich über gespeicherte Streams für Karte, Rezepte und Störungen. FNV-1a aus `seed + ':' + domain` initialisiert Xorshift32, Nullzustand wird durch `0x6d2b79f5` ersetzt. Diese Algorithmusversion gehört zum Spielstand. Rendering und Benutzeroberfläche verbrauchen keinen Simulationszufall.
- `GameState` enthält serialisierbare Records/Arrays für Welt, Wirtschaft, Verkehr, Bahn, Fortschritt, Bauhilfe und Zufallszustände. Keine DOM-Objekte, Funktionen, `Map`, `Set` oder Wandzeit im gespeicherten Zustand. Abgeleitete Pfad- und Geometriecaches gehören zur Engine und werden bei Revisionen neu aufgebaut.
- Mengen sind sichere ganze Zahlen in Tausendsteln einer Ware (`Qty`, 1000 = eine Einheit). Baupreise werden in ganzen Waren berechnet und als historische Kosten am Objekt gespeichert; 90-Prozent-Rückerstattungen sind dadurch exakt darstellbar. Keine Rundung auf ganze Waren bei der Rückgabe.
- Zeitbasierte Mengen führen ihren Divisionsrest mit; kleine Lieferraten dürfen durch schrittweises Abrunden nicht auf null fallen. `revision` steigt bei bestätigten Befehlen und strukturellen Fortschrittsänderungen; `tick` zählt die laufende Simulation separat. Baupläne werden nur bei aktiver Baupause angewandt und müssen deren aktuelle Basisrevision besitzen.
- Die zentralen Schemas liegen in `src/model/`: `ids.ts`, `world.ts`, `economy.ts`, `traffic.ts`, `rail.ts`, `progression.ts`, `game.ts`, `commands.ts`, `views.ts`. Zod-Schemas definieren gespeicherte Daten, TypeScript-Typen werden daraus abgeleitet. Fachmodule erweitern ihre Schemas in ihrer eigenen Aufgabe.

### Schnittstellen zwischen Oberfläche und Engine

```ts
type Result<T> = { ok: true; value: T } | { ok: false; code: string; message: string };
type Stock = Record<SymbolId, Qty>;
type PauseReason = 'user' | 'build' | 'choice' | 'rescue' | 'hidden';
type CommandEnvelope = { id: string; expectedRevision?: number; command: GameCommand };
type CommandResult = Result<{ revision: number }>;
type GameCommand =
  | { type: 'set-pause'; reason: PauseReason; active: boolean }
  | { type: 'set-speed'; speed: 1 | 2 | 4 }
  | { type: 'commit-build'; draft: BuildDraft; aid: boolean }
  | { type: 'configure-building'; id: EntityId; config: BuildingConfig }
  | { type: 'configure-junction'; id: EntityId; control: JunctionControl }
  | { type: 'configure-road'; id: EntityId; rules: RoadRules }
  | { type: 'set-policy'; id: EntityId; policy: DeliveryPolicy }
  | { type: 'configure-rail'; id: EntityId; config: RailLineConfig }
  | { type: 'set-target-release'; targetId: EntityId; enabled: boolean }
  | { type: 'choose-unlock'; offerId: EntityId }
  | { type: 'recover-vehicles'; ids: EntityId[] }
  | { type: 'set-incidents'; enabled: boolean };
```

`EntityId` ist eine stabile Zeichenkette; `SymbolId` ist die Union `circle | triangle | square | heart | star | crescent`. `BuildingConfig` umfasst Rezept, Sollbestand je Symbol, Depotzuordnung, Ladeplätze und aktive Flottengröße; materieller Ausbau wird ausschließlich über `commit-build` bezahlt. `RoadRules` umfasst Geschwindigkeit, Fahrtrichtung und erlaubte Bewegungen je vorhandener Spur; zusätzliche Breite ist ein Bauvorgang. Konfigurationsbefehle validieren Referenzen und ändern keine Geometrie.

`DeliveryPolicy` enthält Priorität `low | normal | high`, Lieferantenmodus `auto | prefer | require`, Lieferanten-IDs sowie Routenmodus `auto | prefer | require` mit geordneten Straßen-Wegpunkten und gesperrten Straßen. `JunctionControl` ist `priority | stop | signals | roundabout`; Signalsteuerung enthält konfliktfreie Bewegungsgruppen, Grünzeiten, Gruppen-ID und Versatz. `RailLineConfig` enthält Warenfreigaben je Richtung und maximale Wartezeit. `BuildDraft` enthält eine Basisrevision und Operationen für Straßen, Gebäude, Terminals, Bahnen, Fahrzeugbestand, Flächenreservierung und Bebauungsfreigabe.

Worker-Eingang: `init(seed)`, `command(envelope)`, `preview(draft)`, `snapshot(requestId)`, `restore(requestId, validatedState)`. Ausgang: `ready`, `view(GameView)`, `result(commandId, CommandResult)`, `preview-result`, `snapshot-result` oder `error`. Antworten tragen eine Session-ID; nach neuem Spiel/Laden werden verspätete Antworten der vorigen Session verworfen. `GameView` enthält nur entdeckte Informationen, Renderdaten, aktuelle Angebote und Diagnosen; unbekannte Rezepte bleiben aus der Oberfläche heraus.

### Dateizuständigkeiten

| Bereich | Verantwortliche Dateien/Verzeichnisse |
|---|---|
| Modell und Grenzen | `src/model/`, `src/core/engine.ts`, `src/core/commands.ts`, `src/core/random.ts` |
| Karte und Verkehrsgeometrie | `src/world/generate.ts`, `src/world/geometry.ts`, `src/world/lanes.ts`, `src/world/city.ts` |
| Warenwirtschaft | `src/economy/inventory.ts`, `src/economy/production.ts`, `src/economy/recipes.ts`, `src/economy/progression.ts` |
| Transport | `src/logistics/routing.ts`, `src/logistics/dispatch.ts`, `src/logistics/rail.ts` |
| Verkehr | `src/traffic/movement.ts`, `src/traffic/junctions.ts`, `src/traffic/signals.ts`, `src/traffic/incidents.ts` |
| Bau und Rettung | `src/build/plans.ts`, `src/build/recovery.ts`, `src/build/costs.ts` |
| Darstellung und Interaktion | `src/view/renderer.ts`, `src/view/camera.ts`, `src/view/symbols.ts`, `src/ui/` |
| Laufzeit und Speicherung | `src/runtime/worker.ts`, `src/runtime/client.ts`, `src/runtime/visibility.ts`, `src/storage/` |
| Tests und Abnahme | `tests/unit/`, `tests/integration/`, `tests/fixtures/`, `tests/e2e/`, `docs/acceptance/` |

Das sind Verantwortungsgrenzen, keine Aufforderung, leere Dateien im Voraus anzulegen. Kein eigener Plan pro Subsystem: Verkehr, Wirtschaft und Sanierung müssen zusammen abgenommen werden. Abgrenzbare Aufgaben können später delegiert werden; der Integrationsstand bleibt zentral.

### Vorläufige Balancingdaten

In `src/core/balance.ts` als versionierte Daten hinterlegen: Startbestand je Grundressource 200 Waren; Quelle 1 Ware/s; Lastwagenkapazität 4 Waren; Zugkapazität 32 Waren; ein Ladeplatz bewegt 2 Waren/s; Fabriklager je Zutat/Ergebnis 24 Waren, Verteilpunkt je Symbol 128. Rezepte verwenden 1–3 Einheiten je Zutat, Ausgaben 1–2 Einheiten und 5–15 Sekunden Zykluszeit. Mindestreserven zentral zunächst 20 Einheiten je Baustoff und zwei Rezeptchargen je weiterer benötigter Zutat.

Baukosten als Paare der beiden Startressourcen: Abbau (12,8), Fabrik (20,20), Verteilpunkt (25,20), Terminalaufsatz (20,25), Lastwagen (4,2), Zug (15,10), zusätzliche Ladebucht (8,8). Straße pro angefangenen 10 Weltmetern und physischer Spur (1,1), Bahn pro angefangenen 10 Weltmetern (1,1). Zentrallager mit Startdepot existiert kostenlos und kann nicht abgerissen werden. Startbestand muss den geprüften Einstiegsplan finanzieren; andernfalls Startbestand im Generator bis zu diesem Bedarf plus 25 Prozent erhöhen.

Nominale Zielmengen: 12, 24, 40, 60, 80 Waren; nominale Raten: 2, 3, 4, 5, 6 Waren/min. Für das jeweilige Ziel Rate auf 60 Prozent des aus Quellen, Rezepten und einer konstruierten Referenzversorgung nachgewiesenen Durchsatzes begrenzen. Die Mengen steigen immer, neue Produkte dürfen eine andere Rate besitzen. Ein neuer Meilenstein zählt eigene Abgaben und ein neues, zunächst leeres 60-Sekunden-Fenster. Abgabe entnimmt nur verfügbaren Überschuss oberhalb Reservierungen und Sollbestand, höchstens mit der aktuellen Zielrate; kein einmaliger Lagerklick erfüllt die Ratenprüfung.

Diese Zahlen sind Ausgangswerte für Spieltests, keine zusätzlichen Produktanforderungen. Anpassungen erfolgen mit dokumentierten Messwerten, nicht durch Abschwächen von Waren- oder Rettungsinvarianten.

## Durchführung und Prüfregeln

Jede Aufgabe enthält einen eigenen fachlichen Testzyklus. Angegebene Testdateien zuerst mit den beschriebenen Assertions erstellen, gezielt rot ausführen, dann implementieren und grün prüfen. Die Codezeilen unter „Test“ benennen die entscheidenden Assertions; Setup und Fixtures werden in der jeweiligen Aufgabe angelegt. `tests/fixtures/scenarios.ts` liefert benannte `GameState`-Fixtures, `tests/fixtures/driver.ts` die Funktionen `runTicks(state, count)` und `send(state, command)` über die echte Engine. Keine Testhilfen, die Lieferungen, Fortschritt oder wirtschaftliche Buchungen umgehen.

Nach einer grünen Aufgabe `bun run typecheck` und die betroffenen Tests ausführen. Dann nur die in der Aufgabe geänderten Dateien gezielt stagen und mit der angegebenen Nachricht lokal committen. Kein `git add .`. Repository erst bei autorisierter Umsetzung mit `git init -b main` initialisieren, vorhandene Dokumente bewahren und im ersten Commit mit aufnehmen. Dieser Plan selbst führt keine Initialisierung oder Installation durch.

### Aufgabe 1: Deterministischer Kern mit befehlsgesteuertem Zustand

**Dateien:** Neu `package.json`, `bun.lock`, `.gitignore`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `index.html`; `src/model/{ids,game,commands}.ts`, `src/core/{engine,commands,random,balance}.ts`; Tests `tests/unit/engine.test.ts`, `tests/fixtures/{scenarios,driver}.ts`.

**Schnittstellen:** Erzeugt `createGame(seed: string): GameState`, `stepGame(state: GameState): void`, `applyCommand(state: GameState, envelope: CommandEnvelope): CommandResult`, `runTicks(state: GameState, count: number): void`. `GameState` besitzt `tick`, `revision`, Zufallszustände, Pausengründe und die letzten 256 bestätigten Befehls-IDs samt Ergebnis. Ein Duplikat liefert das ursprüngliche Ergebnis, ohne erneut anzuwenden. Veraltete Revisionen werden abgelehnt.

- [ ] **Test erstellen:** Zwei Spiele mit gleichem Seed und Befehlen bleiben nach 200 Schritten gleich; Pause friert den Tick ein; doppelte Befehls-ID erhöht die Revision nur einmal. Assertions: `expect(a).toEqual(b)`, `expect(state.tick).toBe(pausedTick)`, `expect(secondResult).toEqual(firstResult)`.
- [ ] **Rot prüfen:** `bun run test -- tests/unit/engine.test.ts`; Fehler müssen an fehlendem Verhalten liegen. Werkzeuge minimal in dieser Aufgabe einrichten; Skripte `dev=vite`, `typecheck=tsc --noEmit`, `test=vitest run`, `build=tsc --noEmit && vite build`, `preview=vite preview`, `e2e=playwright test` definieren.
- [ ] **Implementieren:** Strikte Modelle, getrennte PRNG-Streams, feste Schritte und Command-Validierung. Pause bleibt ein Satz unabhängiger Gründe; Entfernen eines Grundes setzt andere nicht zurück. Fachsysteme folgen in ihren Aufgaben, keine Dummy-Warenbewegungen.
- [ ] **Grün prüfen:** Gleicher Testbefehl und `bun run typecheck`; deterministischer Vergleich besteht ohne Zeit- oder Zufallsmocks.
- [ ] **Commit:** `feat: add deterministic simulation core`.

### Aufgabe 2: Spielbare Karte mit gültiger Straßengeometrie

**Dateien:** Neu `src/model/world.ts`, `src/world/{generate,geometry,lanes,city}.ts`, `tests/unit/world.test.ts`, `tests/fixtures/worlds.ts`; Engine um Weltinitialisierung ergänzen.

**Schnittstellen:** Nutzt `createGame` und den Kartenstream. Erzeugt `generateWorld(seed: string, style?: 'grid' | 'organic' | 'mixed'): World`, `compileLanes(world: World): Result<LaneGraph>`, `validateWorld(world: World): WorldIssue[]`, `growCity(state: GameState): void`. `WorldIssue` trägt Objekt-ID, Code und deutsche Erklärung. Die zweite Zone ist vollständig vorbestimmt, aber noch gesperrt. `Point`, `World`, `LaneGraph` und `WorldIssue` werden in `src/model/world.ts` definiert und von allen Geometrieverbrauchern importiert.

- [ ] **Test erstellen:** Raster und organische Karte haben verbundene Startquellen, freie Bauplätze, sechs bis zehn Startknoten und vier bis sechs Erweiterungsknoten. `expect(validateWorld(world)).toEqual([])`; Wiederholung gleichen Seeds ist gleich; gesperrte Zone verändert bei Freigabe keine vorhandenen IDs. Wachstum überbaut keine Reservierungen/Fabriken.
- [ ] **Rot prüfen:** `bun run test -- tests/unit/world.test.ts`.
- [ ] **Implementieren:** Ein gebietsweises Straßenskelett erzeugen, organische Varianten mit kontrolliert versetzten Knoten. Anfangskarte ungefähr 1000 × 700 Weltmeter, Erweiterung angrenzend. Straßen als frei platzierte Polylinien, automatisch geteilte Kreuzungen, Spurbreite 3,5 m, Mindestsegmentlänge 16 m und minimale Knotenwinkel 30°. Abbiegepfade mit mindestens 6 m Radius; unzulässige Geometrie verständlich ablehnen. Höchstens 32 Generatorversuche, dann geprüfte Vorlage mit Seed-Variation. Hausparzellen entlang freigegebener Straßen deterministisch erzeugen.
- [ ] **Grün prüfen:** Testbefehl und Typprüfung; `grid`, `organic`, `mixed` besitzen sichtbare, funktionale Unterschiede, nicht nur unterschiedliche Dekoration.
- [ ] **Commit:** `feat: generate connected logistics districts`.

### Aufgabe 3: Karte ansehen, auswählen und Zustände erklären

**Dateien:** Neu `src/main.tsx`, `src/ui/{App,Toolbar,Inspector}.tsx`, `src/ui/styles.css`, `src/view/{renderer,camera,symbols}.ts`, `src/model/views.ts`, `src/core/views.ts`, `playwright.config.ts`, `tests/e2e/map.spec.ts`.

**Schnittstellen:** `selectGameView(state: GameState): GameView`, `drawWorld(ctx: CanvasRenderingContext2D, view: GameView, camera: Camera): void`, `pickEntity(view: GameView, worldPoint: Point): EntityId | null`. `Camera` liegt in `src/view/camera.ts` und enthält Mittelpunkt und Zoom. Zunächst lokaler Adapter zur Engine; derselbe Client-Vertrag wird in Aufgabe 12 in den Worker verlegt. Modelltypen für fachliche Ergebnisse liegen jeweils in dem für diese Aufgabe benannten Modellmodul; Ansichts- und Worker-Protokolltypen liegen in `src/model/views.ts` beziehungsweise `src/runtime/client.ts`.

- [ ] **Test erstellen:** Karte laden, zoomen, verschieben, Quelle auswählen und Symbolname im Inspector lesen. Assertions: `await expect(page.getByRole('heading', {name:'Rohstoffvorkommen'})).toBeVisible()`; Pointerabbruch schließt keinen Bauvorgang ab. Tastaturfokus erreicht Toolbar und Inspector.
- [ ] **Rot prüfen:** `bun run e2e -- tests/e2e/map.spec.ts --project=chromium`.
- [ ] **Implementieren:** Canvas-Karte mit Welt-/Bildschirmtransformation, DPR-Berücksichtigung, Objekt-Culling und eigener Render-Schleife. Native HTML-Bedienelemente; Karte in Modellbahn-Optik, Werkzeugleiste unten, Inspector rechts, Meilenstein und Zeitsteuerung oben. SVG-Pfade und Canvas-Zeichnung verwenden gemeinsame Symbolgeometrie. Feste Farbzuordnung mit deutlicher Kontur; deutsche Namen und Silhouetten bleiben auch ohne Farbe erkennbar. Keine Emoji, dekorativen Animationsschleifen oder externen Fonts. Escape bricht Werkzeuge ab. Leertaste pausiert außerhalb von Eingabefeldern und interaktiven Steuerelementen.
- [ ] **Grün prüfen:** Browserablauf, Resize und zwei DPI-Stufen visuell prüfen; `bun run build` erfolgreich. Kein Nachweis eines vollständigen Spiels in dieser Aufgabe.
- [ ] **Commit:** `feat: render and inspect the generated world`.

### Aufgabe 4: Waren, Rezepte und lokale Produktion

**Dateien:** Neu `src/model/economy.ts`, `src/economy/{inventory,recipes,production}.ts`, `src/ui/{BuildingPanel,RecipePanel}.tsx`, `tests/unit/economy.test.ts`.

**Schnittstellen:** `generateRecipePool(seed: string): RecipePool`, `validateRecipes(pool: RecipePool): RecipeIssue[]`, `advanceProduction(state: GameState): void`, `transferStock(source: Inventory, target: Inventory, item: SymbolId, qty: Qty): Result<void>`. Reservierungen werden in der Inventory-Struktur vorbereitet. `Recipe` besitzt ID, bis zu zwei Inputs, ein Output und `durationTicks`.

- [ ] **Test erstellen:** Fehlende oder reservierte Zutaten starten keine Charge; ein volles Ausgangslager blockiert die nächste Charge. `expect(consumed).toEqual(recipe.inputs)` und `expect(produced).toEqual(recipe.output)` nach einem Zyklus; laufende Charge speichert ihre bereits verbrauchten Inputs. Alle Rezeptpfade enden an Grundressourcen.
- [ ] **Rot prüfen:** `bun run test -- tests/unit/economy.test.ts`.
- [ ] **Implementieren:** Begrenzte Inventare und atomare Mengenbuchung; kein negativer Bestand. Die Charge reserviert Ergebnisplatz vor Start und hält Zutaten als Work-in-progress für spätere Bergung. Abbau liefert kontinuierlich mit begrenzter Rate. Eingangsziele erzeugen Bedarf, Output erzeugt Angebot. Symbolrollen werden je Seed permutiert, Silhouette/Farbe bleiben konstant.
- [ ] **Grün prüfen:** Tests plus manuell eine Fabrik per Testwelt mit Zutaten beobachten; Rezepte und blockierte Zustände erscheinen im Inspector.
- [ ] **Commit:** `feat: add conserved inventories and recipe production`.

### Aufgabe 5: Freier Straßenbau und platzierbare Betriebe

**Dateien:** Neu `src/build/{plans,costs}.ts`, `src/ui/{BuildToolbar,BuildPreview}.tsx`, `src/view/build-tools.ts`, `tests/unit/build.test.ts`, `tests/e2e/build.spec.ts`.

**Schnittstellen:** `previewBuild(state: GameState, draft: BuildDraft): Result<BuildQuote>`, `commitBuild(state: GameState, draft: BuildDraft, aid: boolean): Result<void>`. `BuildQuote` enthält Kosten, historische Rückgaben, Fehlbestand, betroffene Objekte und Geometriefehler. Noch kein Abriss belegter Objekte; dieser wird bis Aufgabe 11 mit Begründung abgelehnt.

- [ ] **Test erstellen:** Eine neue Querstraße teilt bestehende Straßen korrekt, bezahlt einmal und bewahrt deren Regeln. Ungültiger Winkel oder fehlende Materialien lässt Zustand unverändert. Assertions: `expect(afterFailedBuild).toEqual(before)` und `expect(paid).toEqual(quote.cost)`. Browser setzt eine Fabrik mit gültiger Zufahrt.
- [ ] **Rot prüfen:** `bun run test -- tests/unit/build.test.ts` und `bun run e2e -- tests/e2e/build.spec.ts --project=chromium`.
- [ ] **Implementieren:** Klickpunkte zeichnen eine freie Polylinie, Enter/Doppelklick beendet, Escape verwirft; Snapping zeigt Vorschau. Sämtliche Operationen werden auf einem Arbeitszustand validiert und gemeinsam übernommen. Bauplanung pausiert standardmäßig. Quellenbindung für Abbaubetriebe, freie Platzierung anderer Betriebe, Fabrikdrehung und erreichbare Zufahrt prüfen. Stadtbebauung darf weichen, reservierte Flächen verlangen bewusstes Aufheben.
- [ ] **Grün prüfen:** Echte Anfangskette mit Startressourcen bauen; Zentrallager und Depot dürfen nicht versehentlich gelöscht werden.
- [ ] **Commit:** `feat: build roads and production sites transactionally`.

### Aufgabe 6: Fahrende Lastwagen mit Rückstau und Vorfahrt

**Dateien:** Neu `src/model/traffic.ts`, `src/traffic/{movement,junctions}.ts`, `tests/unit/traffic.test.ts`, `tests/fixtures/traffic.ts`; Renderer und Engine erweitern.

**Schnittstellen:** `advanceTraffic(state: GameState, graph: LaneGraph): void`, `tryReserveMovement(state: GameState, vehicleId: EntityId, movementId: EntityId): boolean`. Fahrzeuge besitzen Spurposition, Route, Geschwindigkeit, Ladung und Auftrags-ID; `LaneGraph` enthält befahrbare Bewegungen, Längen und Konflikte.

- [ ] **Test erstellen:** Führendes Fahrzeug stoppt; nachfolgendes hält Sicherheitsabstand. Volle Ausfahrt verhindert Knoteneinfahrt; stopppflichtiger Zufluss wartet; Kreisverkehr hat Vorfahrt. Nach 2000 Schritten `expect(collisions).toEqual([])` und keine Position außerhalb ihres Fahrwegs. Gesperrte Abbiegung wird nie befahren.
- [ ] **Rot prüfen:** `bun run test -- tests/unit/traffic.test.ts`.
- [ ] **Implementieren:** Spurbasierte Bewegung mit 4,5-m-Lastwagen, 2-m-Mindestabstand und Geschwindigkeits-/Bremsbegrenzung. Belegung pro Spur von vorne nach hinten auswerten; Spurwechsel erst planen, dann konfliktfrei übernehmen. Wechsel rechtzeitig vor dem Abbiegen, keine Teleportation am Knoten. Bewegungsreservierung umfasst Konfliktfläche und freien Ausgangsplatz. Vorfahrt/Stop sowie einspuriger Kreisverkehr mit separaten Einfahrten. Ungeregelte Gleichstände stabil nach Wartebeginn und ID entscheiden.
- [ ] **Grün prüfen:** Tests; sichtbare Referenzszene mit wartenden Fahrzeugen und freiem Abfluss beobachten. Kreisverkehr darf kein nur anders gezeichnetes normales Kreuzungsverhalten sein.
- [ ] **Commit:** `feat: simulate lane traffic and physical queues`.

### Aufgabe 7: Automatische Lieferungen mit verbindlichen Eingriffen

**Dateien:** Neu `src/logistics/{routing,dispatch}.ts`, `src/ui/DeliveryPolicyPanel.tsx`, `tests/integration/delivery.test.ts`; Inventar und Fahrzeugmodelle erweitern.

**Schnittstellen:** `findRoute(graph: LaneGraph, request: RouteRequest): Result<Route>`, `dispatchDeliveries(state: GameState): void`, `completeDeliveryLeg(state: GameState, orderId: EntityId): Result<void>`. `RouteRequest` enthält Start/Ziel, Wegpunkte, Ausschlüsse, Modus und bekannte Wartezeiten. Auftrag reserviert Quelle und Zielplatz; Fahrzeugladung wird ausschließlich bei tatsächlichem Laden gebucht.

- [ ] **Test erstellen:** Zwei gleichzeitige Verbraucher können dieselben vier Waren nicht doppelt reservieren. Automatische Direktlieferung fährt Quelle → Fabrik ohne Depotumweg. Bevorzugte gesperrte Quelle wird ersetzt, verbindliche Quelle liefert eine Erklärung. `expect(delivered + inTransit + onHand + workInProgress + consumed).toEqual(produced + initial)` in einer gemischten Simulation; Verbrauch nach Rezept separat buchen.
- [ ] **Rot prüfen:** `bun run test -- tests/integration/delivery.test.ts`.
- [ ] **Implementieren:** A* auf dem gerichteten Spurgraphen mit Fahrzeitheuristik; Wartezeit nur als nichtnegativer Zuschlag. Flotten gehören Depots, Fahrten dürfen direkt zwischen Betrieben erfolgen. Prioritäten entscheiden Zuteilung, danach Alter des Bedarfs. Wegpunkte und Verbote strikt prüfen. Rerouting bei Sperrung sofort, sonst erst nach 20 s Blockade und mindestens 20 Prozent erwartetem Vorteil; pro Fahrzeug mindestens 10 s Abstand zwischen solchen Änderungen. Ladebuchten und reale Warteplätze mit anschließender Straßenwarteschlange modellieren.
- [ ] **Grün prüfen:** Anfangsprodukt gelangt ohne manuelle Einzelaufträge zum Zentrallager. UI zeigt keine Route, keine Ware, keine Fahrzeuge und volles Ziel als unterscheidbare Zustände.
- [ ] **Commit:** `feat: automate deliveries with supplier and route policies`.

### Aufgabe 8: Ampelphasen, Spurregeln und grüne Wellen

**Dateien:** Neu `src/traffic/signals.ts`, `src/ui/{JunctionEditor,SignalTimeline,RoadEditor}.tsx`, `tests/unit/signals.test.ts`, `tests/integration/corridor.test.ts`.

**Schnittstellen:** `validateSignalPlan(graph: LaneGraph, junctionId: EntityId, plan: SignalPlan): Result<void>`, `getSignalState(state: GameState, junctionId: EntityId): SignalState`. Ein Signalplan hat geordnete Phasen, erlaubte Bewegungs-IDs, Grünzeiten, Koordinationsgruppe und Versatz. `SignalState` enthält Freigaben und verbleibende Zeit.

- [ ] **Test erstellen:** Konfliktierende Bewegungen werden zurückgewiesen, eine Phasenänderung räumt bereits eingefahrene Fahrzeuge sicher. Auf einem fest definierten Korridor mit zwei Ampeln und gepulster Zufahrt gilt `expect(coordinated.meanWait).toBeLessThan(uncoordinated.meanWait)` bei identischer Nachfrage. Separierte Abbiegespur verbessert das dazu passende Engpassszenario.
- [ ] **Rot prüfen:** `bun run test -- tests/unit/signals.test.ts tests/integration/corridor.test.ts`.
- [ ] **Implementieren:** Konfliktmatrix aus tatsächlichen Bewegungspfaden, automatische gültige Standardphasen, manuelle Grünzeiten mindestens 5 s. Räumzeit konservativ aus Pfadlänge, sicherer Räumgeschwindigkeit und 1 s Puffer; aktive Belegung sperrt konfliktierende Freigaben auch darüber hinaus. Gruppierte Ampeln teilen Umlaufzeit, Versatz modulo Umlauf. Zeitleiste zeigt Phase und rechnerische Fahrt zwischen zwei ausgewählten Knoten. Regeln bestehender Spuren kostenlos, bauliche Erweiterung über Aufgabe 5.
- [ ] **Grün prüfen:** Tests und Ampelbedienung im Browser; ungültige Freigaben können nicht gespeichert werden. Durchsatzverbesserung nur für passende Lastfälle behaupten.
- [ ] **Commit:** `feat: add signal phases and coordinated corridors`.

### Aufgabe 9: Zweite Zone und bidirektionale Bahnlogistik

**Dateien:** Neu `src/model/rail.ts`, `src/logistics/rail.ts`, `src/ui/RailPanel.tsx`, `tests/integration/rail.test.ts`; Bau, Disposition, Renderer und Fixtures erweitern.

**Schnittstellen:** `advanceRail(state: GameState): void`, `planShipment(state: GameState, source: EntityId, target: EntityId, item: SymbolId, qty: Qty): Result<ShipmentPlan>`. Ein `ShipmentPlan` besteht aus geordneten Straßen-/Bahnabschnitten; Auftrag und Warenbesitz bleiben über Umschläge eindeutig.

- [ ] **Test erstellen:** Zutaten fahren in Zone zwei, werden dort verarbeitet und Produkte kommen zurück. Volles Zielterminal verhindert zusätzliche Reservierung. `expect(totalAccountedStock).toEqual(expectedStock)` nach Hin-/Rückfahrt und nach leerer Rückfahrt. Ein Teilzug fährt nach maximaler Wartezeit, ein leerer Zug startet keine sinnlose Pendelschleife.
- [ ] **Rot prüfen:** `bun run test -- tests/integration/rail.test.ts`.
- [ ] **Implementieren:** Terminals als bezahlte Aufsätze, frei gezogene höhengetrennte Zweipunktbahnlinie, fahrzeugweise Kapazität und Umlaufzeit. Maximalwartezeit beginnt beim ersten Ladebestand; vollständiger Zug fährt nach Laden ab. Zug mit Auftrag am Gegenende darf leer zurückfahren. Je Terminal eine Ladeposition und Warteliste; keine Streckenkonflikte. Disposition beachtet Warenfreigaben pro Richtung und reserviert den nächsten Umschlagplatz vor Abfahrt. Straße zwischen Zonen bleibt eine alternative Spielerentscheidung.
- [ ] **Grün prüfen:** Gesamte Warenkette in der Browserkarte beobachten; keine simulierte Teleportation als Ersatz für die Zugfahrt.
- [ ] **Commit:** `feat: connect districts with bidirectional rail freight`.

### Aufgabe 10: Fünf Meilensteine mit drei gültigen Wahlmöglichkeiten

Zielabgabe nach UX-Spezifikation umsetzen. Neues Ziel mit `releaseEnabled: false` anlegen. Beim Befehl `set-target-release` die Zielkennung prüfen, veraltete Befehle ablehnen und bei ausgeschalteter Freigabe keine Ware entnehmen. Zielkennung, Freigabe, Menge und Rate in `GameView` ausgeben. Prüfung um Freigabe, Widerruf, Reserveschutz und verspäteten Befehl nach Zielwechsel ergänzen.

**Dateien:** Neu `src/model/progression.ts`, `src/economy/progression.ts`, `src/ui/{MilestonePanel,UnlockDialog}.tsx`, `tests/unit/progression.test.ts`, `tests/integration/generation.test.ts`; Rezeptgenerator und Stadtwachstum ergänzen.

**Schnittstellen:** `evaluateProgress(state: GameState): void`, `getUnlockOffers(state: GameState): readonly UnlockOffer[]`, `chooseUnlock(state: GameState, offerId: EntityId): Result<void>`. Die gemeinsame reine Erzeugungsfunktion `deriveProgression(seed: string, choices: readonly number[]): ProgressionPlan` nimmt null bis vier Wahlindizes (0–2), liefert bekannte Rezepte, freigegebene Gebiete, nächste Ziele und Angebote und wird sowohl von Spiel als auch Generatortests verwendet. `ProgressionPlan` und `UnlockOffer` liegen in `src/model/progression.ts`. `UnlockOffer` ist Produkt-, Alternativrezept- oder Gebietskarte mit offen sichtbaren Auswirkungen; einmal erzeugte Angebote werden im Zustand gespeichert.

- [ ] **Test erstellen:** Nach vier erreichten Meilensteinen jeweils exakt drei gültige Angebote; fünfter führt in freien Betrieb. Alle 81 Wahlfolgen über vier Runden für mindestens 100 Seeds mit `deriveProgression` prüfen; dafür keine 8100 vollständigen Verkehrspartien starten und keine Produktionsbuchungen umgehen. `expect(offers).toHaveLength(3)` und `expect(unreachableTargets).toEqual([])` gelten auch ohne Gebietswahl. Eine Pause verändert das Ratenfenster nicht; reservierte Baustoffe werden nicht abgegeben. Eine kleine gebrochene Zielrate erreicht über 60 Sekunden die rechnerische Menge ohne Rundungsverlust.
- [ ] **Rot prüfen:** `bun run test -- tests/unit/progression.test.ts tests/integration/generation.test.ts`.
- [ ] **Implementieren:** Rezept-DAG mit stabiler Rangordnung erzeugen; nur Inputs mit niedrigerem Rang. Kandidaten über 64 Versuche suchen, danach geprüfte Muster mit Mengen-/Zeittradeoffs permutieren. Gleiche Inputs mit gleicher Ausbeute und schlechterer Zeit/Kosten verwerfen. Für jeden Zweig einen erreichbaren Referenzaufbau samt genügend Fabriken nachweisen; Kapazitätsgrenzen in Zielrate einrechnen. Angebote enthalten nur nach Wahl sofort erschließbare Abhängigkeiten; nicht gewählte Karten bleiben im Pool. Bedarf nach Wahl neu festlegen und nicht durch reale Wartezeit erhöhen.
- [ ] **Grün prüfen:** Generatorprüfungen und ein Durchlauf durch fünf Ziele mit echten Lieferungen. Automatische Stadtverdichtung an erreichte Meilensteine koppeln; keine Nachfrage durch bloßes Platzieren einer Straße erzeugen.
- [ ] **Commit:** `feat: add branching milestones and validated unlocks`.

### Aufgabe 11: Verlustfreier Rückbau, Bergung und Sanierungshilfe

**Dateien:** Neu `src/build/recovery.ts`, `src/ui/RescuePanel.tsx`, `tests/integration/recovery.test.ts`; Baupläne, Disposition und Kosten ergänzen.

**Schnittstellen:** `recoverVehicles(state: GameState, ids: EntityId[]): Result<void>`, `recoverEntityContents(state: GameState, id: EntityId): Result<void>`; erweitert `previewBuild` und `commitBuild` um Abriss/Rettung. Bergungsbestand hat keine Kapazitätsgrenze und wird bevorzugt wieder ins normale Lager übernommen, sobald Platz frei ist; er kann direkt als Lieferquelle/Baumaterial verwendet werden.

- [ ] **Test erstellen:** Volles Depot mit wartenden, fahrenden und beladenen Fahrzeugen plus laufender Fabrikcharge abreißen. Alle Inputs, Ladungen und freien Waren bleiben verbucht, Reservierungen werden genau einmal gelöst. Assertions: `expect(afterAccounting).toEqual(beforeAccounting)` und `expect(orphanReservations).toEqual([])`. Vollständigen Gridlock bei null Baustoffen mit Hilfe reparieren und wieder liefern. Zweifacher Commit derselben ID zahlt nichts doppelt.
- [ ] **Rot prüfen:** `bun run test -- tests/integration/recovery.test.ts`.
- [ ] **Implementieren:** Bauplan auf stabile Revision beziehen, Kosten/Rückgaben aggregieren, Inhalte zuerst in sichere Bestände überführen und betroffene Aufträge neu disponieren. Ein Arbeitszustand verhindert halbe Umbauten. Rohmaterial einer abgebrochenen Charge zurückgeben, keinen unfertigen Output erzeugen. Hilfe deckt nur den konkreten Fehlbestand des Plans, zählt nicht als Lieferung und bleibt nicht als freie Warenbuchung übrig. Bei Straßenabriss betroffene Fahrzeuge nachvollziehbar bergen. Stillgelegte Flottenfahrzeuge erst nach Entladen abstellen, außer expliziter Bergung.
- [ ] **Grün prüfen:** Rettungsszenario mit echter UI einschließlich Vorschau durchführen; nach anschließendem Speichern/Laden später in Aufgabe 13 erneut bestätigen.
- [ ] **Commit:** `feat: guarantee recovery from blocked networks`.

### Aufgabe 12: Worker-Laufzeit, Pausen und sichere Ampeldefekte

**Dateien:** Neu `src/runtime/{worker,client,visibility}.ts`, `src/traffic/incidents.ts`, `src/ui/IncidentPanel.tsx`, `tests/unit/incidents.test.ts`, `tests/e2e/runtime.spec.ts`; bisher lokalen Client ersetzen.

**Schnittstellen:** `createGameClient(): GameClient` mit `subscribe`, `getSnapshot`, `send`, `preview`, `requestSnapshot`, `restore`, `dispose`. `getSnapshot` liefert dieselbe unveränderliche Referenz bis zur nächsten View; React nutzt `useSyncExternalStore`. `advanceIncidents(state: GameState): void` arbeitet allein mit Simulationsticks.

- [ ] **Test erstellen:** Hintergrundpause plus Nutzerpause bleibt nach Rückkehr pausiert; kein Nachholen verstrichener Wandzeit. Worker-Antwort aus alter Session wird ignoriert. Ein Defekt startet erst nach Meilenstein eins, nie überlappend und räumt aktive Bewegungen vor Wechsel auf sichere Vorfahrt. `expect(stockAfterFailure).toEqual(stockBeforeFailure)` beim reinen Umschalten des Störungsmodus.
- [ ] **Rot prüfen:** `bun run test -- tests/unit/incidents.test.ts` und `bun run e2e -- tests/e2e/runtime.spec.ts --project=chromium`.
- [ ] **Implementieren:** Dedicated Module Worker, referenzierte Command-/Reply-Verträge, begrenzte Arbeitsblöcke und gecachte Views. Heavy Generierung und Importprüfung ebenfalls im Worker. Versteckter Tab setzt eigenen Pausengrund, stoppt Canvas und verwirft Wandzeitakkumulator; Rückkehr entfernt nur diesen Grund. Defekt dauert zunächst 45 s, Abstand 180–300 Simulationssekunden, maximal einer. Wird die betroffene Ampel entfernt, endet der Defekt verlustfrei. Deaktivierung beendet aktuelle Defekte sicher. Defaults in Balancingdatei.
- [ ] **Grün prüfen:** Tests, mehrfaches Mount/Unmount ohne doppelte Worker/Loops, normale Bedienung während Generatorarbeit. Ausgeschaltete Störungen verursachen keine neuen Zufallsereignisse.
- [ ] **Commit:** `feat: isolate simulation and add recoverable signal failures`.

### Aufgabe 13: Lokales Speichern, Laden und robuste Spielstanddateien

Startmenü, Slotwahl, Importbestätigung und Wechsel bei ungesicherten Änderungen gemäß UX-Spezifikation umsetzen. Freigabe der aktuellen Zielabgabe mitspeichern und ältere Spielstände ohne Freigabefeld mit `releaseEnabled: false` laden. Sicherungsfehler beim Wechsel sowie beide Freigabefälle im Ladepfad prüfen.

**Dateien:** Neu `src/storage/{schema,codec,indexed-db,session-lock}.ts`, `src/ui/SavePanel.tsx`, `tests/unit/save.test.ts`, `tests/e2e/save.spec.ts`.

**Schnittstellen:** `encodeSave(state: GameState): string`, `decodeSave(json: string): Result<GameState>`, `writeSave(slot: 'auto' | 'manual', data: string): Promise<Result<void>>`, `readSave(slot: 'auto' | 'manual'): Promise<Result<string>>`. Envelope mit `schemaVersion: 1`, Generatorversion und vollständigem GameState. Import maximal 10 MiB; Schema, Zahlenbereiche, IDs, Referenzen, Mengen und Reservierungsinvarianten vor Austausch prüfen.

- [ ] **Test erstellen:** Speichern/Laden während Fahrt, Freischaltungswahl, Defekt und Bergung führt nach weiteren 1000 Schritten zum gleichen fachlichen Zustand wie ununterbrochene Simulation. Laden eines während Baupause erstellten Saves lässt keine verwaiste Pause zurück; Nutzerpause und Freischaltungswahl bleiben erhalten. Unbekannte Version, abgeschnittener JSON-Text, negative Menge und fehlendes Depot verändern das laufende Spiel nicht. IndexedDB-Abbruch erhält den vorherigen Slot. Zweiter Tab darf automatische Spielstände nicht überschreiben.
- [ ] **Rot prüfen:** `bun run test -- tests/unit/save.test.ts` und `bun run e2e -- tests/e2e/save.spec.ts --project=chromium`.
- [ ] **Implementieren:** Worker-Snapshot am Schrittende, atomare IndexedDB-Transaktion; Autosave alle 30 realen Sekunden bei Änderungen sowie nach Meilensteinwahl und Bauabschluss. Gespeichert wird der letzte angewandte Weltzustand, keine offene Bauvorschau. `user` und `choice` werden als Pausengründe erhalten; `build`/`rescue` werden beim Laden entfernt, `hidden` aus der aktuellen Browsersichtbarkeit gesetzt. Keine Abhängigkeit von einem letzten `beforeunload`-Save. Separater manueller Slot. Ein Tab besitzt Schreibrecht per Web Locks, sofern verfügbar; andernfalls IndexedDB-Lease mit Transaktionsprüfung, Besitzer-ID und Ablaufzeit. Vor jedem Schreibvorgang Eigentum prüfen; konkurrierender Tab spielt bei Bedarf ohne Autosave weiter und bietet Export. Import erst nach vollständiger Validierung atomar übernehmen; fehlerhaftes Laden niemals durch leeren neuen Spielstand ersetzen.
- [ ] **Grün prüfen:** Tests, tatsächlicher Dateidownload und Dateiimport. Bei Speicherfehler bleibt Spiel nutzbar, meldet fehlende Speicherung und bietet Export an. Keine Behauptung dauerhaft sicherer Browserdaten.
- [ ] **Commit:** `feat: persist and safely restore complete game states`.

### Aufgabe 14: Verständliche Diagnose und zusammenhängende Bedienung

Optionale Einstiegshilfe auf der laufenden Karte einbauen. Die Hinweise mit tatsächlichen Quellen, Bauwerkzeugen, Depot und Zielabgabe verknüpfen. Aus- und Wiedereinblenden prüfen. Aus einer offenen Freischaltungswahl Karte und Sanierung zugänglich machen. Bei Rückkehr dieselben Angebote anzeigen und `choice` bis zur gültigen Wahl beibehalten. Wirksame Pausengründe aus `GameView` anzeigen.

**Dateien:** Neu `src/core/diagnostics.ts`, `src/ui/{DiagnosticsPanel,SymbolFilter,HelpPanel}.tsx`, `tests/e2e/usability.spec.ts`; Inspector, Renderer, Rezepte und Lieferdialoge vervollständigen.

**Schnittstellen:** `diagnose(state: GameState): Diagnosis[]`; `Diagnosis` hat betroffene IDs, Grundcode, kurze Erklärung und fokussierbares Ziel. Diagnose ist abgeleitet und verändert keine Simulation. `GameView` enthält nur nötige Diagnosen und Ansichtsfilter.

- [ ] **Test erstellen:** Fehlende Zutat, fester unerreichbarer Lieferant, volles Lager und verstopfte Zufahrt liefern jeweils unterscheidbare deutsche Meldungen. Anklicken fokussiert den richtigen Ort. Symbolfilter hebt passende Quellen, Verbraucher und aktive Warenwege hervor. Tastatur kann Dialog öffnen, bedienen, schließen und zum Auslöser zurückkehren.
- [ ] **Rot prüfen:** `bun run e2e -- tests/e2e/usability.spec.ts --project=chromium`.
- [ ] **Implementieren:** Verkehrsbelastung, Warteschlangen und Lieferprobleme als einzeln aktivierbare Overlays. Rezeptvergleich zeigt konkrete Zutaten, Ausgaben und Zyklusdauer; unbekannte Rezepte nicht verraten. Zoom fasst Labels zusammen, ohne Simulation zu verändern. Native `dialog`-Elemente, sichtbarer Fokus, beschriftete Steuerelemente, unterstützende Farben und Namen statt Farbe allein. Kurze kontextuelle Einstiegshinweise zu Quelle, Fabrik, Fahrzeugen, Zielabgabe und Sanierung; keine neue Freischaltsperre.
- [ ] **Grün prüfen:** 1280 × 720 und 1920 × 1080, Graustufenansicht und zwei Zoomstufen tatsächlich ansehen. Keine verdeckten wesentlichen Bedienelemente oder rein farblich erklärten Zustände.
- [ ] **Commit:** `feat: explain bottlenecks and complete the gameplay controls`.

### Aufgabe 15: Vollständiger Durchlauf, Leistung und Abnahmebericht

**Dateien:** Neu `tests/integration/playthrough.test.ts`, `tests/e2e/playthrough.spec.ts`, `tests/e2e/performance.spec.ts`, `tests/fixtures/playthrough.ts`, `docs/acceptance/first-playable.md`, `README.md`; gemessene Balancingkorrekturen in `src/core/balance.ts`.

**Schnittstellen:** Verwendet ausschließlich öffentliche Engine-Befehle und UI. Test-Fixture enthält nachvollziehbare Startseeds und Bau-/Bedienaktionen, keine direkten Fortschritts- oder Inventaränderungen nach Spielstart. Für reproduzierbare Störungs-/Lasttests dürfen separat gekennzeichnete synthetische Fixtures geladen werden, nie als Ersatz für den vollständigen Durchlauf.

- [ ] **Test erstellen:** Raster- und organische Partie bis Meilenstein fünf, davon eine mit zweiter Zone und Rücktransport. Assertions: fünf erfüllte Ziele, weiterlaufende Simulation, erhaltene Buchungsinvarianten, keine verwaisten Reservierungen. Zweites Szenario rettet einen Gridlock mit leerem Baustofflager über die UI.
- [ ] **Rot prüfen:** `bun run test -- tests/integration/playthrough.test.ts` und `bun run e2e -- tests/e2e/playthrough.spec.ts --project=chromium`; Abweichungen als konkrete Spielfehler behandeln.
- [ ] **Implementieren und abstimmen:** Fehlende Integrationspfade schließen; Mengen/Raten nur bei nachgewiesener Unspielbarkeit oder unnötiger Leerlaufzeit ändern. Assets vollständig lokal bündeln und alle für das Spiel benötigten Module einschließlich Worker beim Start laden; keine späteren Netzwerk-Nachladungen voraussetzen. Im Produktionsbuild nach abgeschlossenem Laden die Netzwerkverbindung trennen und weiterbauen, liefern, speichern und laden; erneuter Offline-Seitenstart ist ohne Service Worker nicht Teil dieser Fassung.
- [ ] **Gesamtprüfung:** `bun run typecheck`, `bun run test`, `bun run build`, `bun run e2e -- --project=chromium`, anschließend Browserabläufe auch mit Playwright Firefox und WebKit. WebKit-Abnahme ausdrücklich nicht als echten Safari-Test ausgeben; native Safari-Prüfung ergänzen, wenn verfügbar. Fehler vor Abschluss beheben oder Abnahme als offen dokumentieren.
- [ ] **Leistung messen:** Produktionsbuild, etwa 100 Lastwagen und zwei Züge, 60 s Warmlauf und 120 s Messung bei 1×. Gerät, OS, Browser, Seed, Fahrzeugzahlen, Framezeiten und Simulationsgeschwindigkeit dokumentieren. Ziel: im Wesentlichen mindestens 30 FPS, keine stetig wachsende Schrittwarteschlange und direkt bedienbare Pause/Bergung. 2×/4× zusätzlich prüfen; die Engine darf bei Last begrenzt langsamer laufen, nicht Eingaben aushungern. Bei Bedarf Profiling und gezielte Cache-/Snapshot-Optimierung, kein ungeprüfter Enginewechsel.
- [ ] **Praktische Abnahme:** Beide Partien im sichtbaren Browser durchspielen und Spielbarkeit beurteilen; automatische Befehlsfolgen allein belegen keinen verständlichen Bedienablauf. Für alle acht Design-Abnahmepunkte Beleg und Ergebnis im Bericht festhalten. README mit lokalen Start-/Testbefehlen, Speicherhinweis und bekannten Grenzen ergänzen.
- [ ] **Commit:** `test: verify the complete logistics gameplay loop`.

## Reihenfolge und Zwischenstände

Aufgaben 1–7 ergeben erstmals eine selbst gebaute, automatisch belieferte Produktionskette. Aufgabe 8 vertieft die Verkehrsoptimierung; Aufgaben 9–10 schließen den vollständigen gewählten Spielkreislauf. Aufgaben 11–13 sichern Sanierung und Fortbestand des Spielstands. Aufgaben 14–15 schließen Bedienung und praktische Abnahme ab. Der Zwischenstand vor Aufgabe 15 wird ausdrücklich nicht als fertige erste Fassung bezeichnet.

Abhängigkeiten: 1 → 2 → 3; 1/2 → 4; 2/3/4 → 5; 2/3 → 6; 4/5/6 → 7; 6/7 → 8; 5/7 → 9; 4/7/9 → 10; 5/7/9 → 11; 8/10/11 → 12; 12 → 13; 8/10/11/13 → 14; alles → 15. Standardausführung sequenziell. Parallelisierung nur nach Prüfung tatsächlich unabhängiger Dateien und stabiler Schnittstellen.

## Quellen und Modern Web Guidance

Die Architekturentscheidungen sind Planfestlegungen. Die folgenden Primärquellen wurden am 14. November 2026 geprüft:

- [Vite Getting Started](https://vite.dev/guide/) und [Vitest Guide](https://vitest.dev/guide/) für Werkzeugaufteilung und gemeinsam zu prüfende Laufzeitkompatibilität.
- [MDN: Using Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers) für getrennte Simulationsausführung und Nachrichtenübergabe; [React: useSyncExternalStore](https://react.dev/reference/react/useSyncExternalStore) für stabile externe Snapshots.
- [MDN: IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB), [MDN: Web Locks](https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API) und [Zod: Basics](https://zod.dev/basics) für transaktionale Speicherung, Schreibzugriff mehrerer Tabs und Prüfung importierter Daten.
- [MDN: Page Visibility](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API) für Hintergrundpausen; [Playwright](https://playwright.dev/docs/intro) für die geplanten Browserprüfungen.

Modern Web Guidance wurde mit `bunx --bun modern-web-guidance@latest` befragt. `break-up-long-tasks` nennt „yield control back to the browser periodically“; deshalb sieht der Plan begrenzte Arbeitsblöcke und schwere Verarbeitung im Worker vor. Falls später zusätzlich lange Hauptthread-Schleifen nötig werden, gilt Feature Detection für `scheduler.yield()` mit `setTimeout`-Fallback. `efficient-background-processing` wurde geprüft, aber dessen `content-visibility`-Muster nicht auf die ständig sichtbare Hauptkarte übertragen; für den Hintergrund-Tab ist die Page Visibility API passend. Die Suche nach IndexedDB lieferte keine passende spezifische Anleitung; dafür wurde die MDN-Quelle verwendet. In diesem Auftrag wurde ausschließlich geplant, noch kein Browsercode geändert.

## Selbstprüfung des Plans

- Designabschnitte 1–3: globale Grenzen und Aufgaben 1–3; Produktions-/Fortschrittskreislauf: 4, 7, 9, 10; Straßen/Stadt: 2, 5, 6, 8; Kosten/Rettung: 5, 11; Störungen: 12; Übersicht/Speichern: 3, 13, 14; sämtliche Abnahmen: 15.
- Jeder fachliche Schritt besitzt eine benannte Datei, Schnittstelle und prüfbare Wirkung. Geteilte Verträge stehen zentral; `GameState`, `GameView`, `GameCommand` und `Result` werden nicht je Aufgabe unterschiedlich erfunden.
- Die fünf zusätzlichen Ausfallklassen aus Review Focus sind expliziten Tests zugeordnet.
- Keine Produktdateien, Abhängigkeiten, Tests, Git-Initialisierung oder Veröffentlichung wurden durch das Erstellen dieses Plans ausgeführt. Umsetzung ist ein gesonderter nächster Auftrag.
