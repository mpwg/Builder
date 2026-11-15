# Ab die Post · Web-Umsetzungsplan

> Die Kontrollkästchen halten den Stand fest. Für abgegrenzte Pakete bei Bedarf delegate-coding-efficiently konsultieren.

**Ziel** ist ein statisch ausgeliefertes 2D-Postspiel vom ersten automatischen Zustelllauf bis zum freien Betrieb nach drei Ausbauzielen.

**Architektur** ist ein deterministischer TypeScript-Core mit getrennten Browseradaptern für Bedienung, Taktung und Spielstände. Die Oberfläche verwendet HTML, CSS und SVG.

**Werkzeuge** sind Bun mit eingecheckter Sperrdatei, TypeScript im Strict-Modus, Vite, Vitest und Playwright. Meilenstein 1 richtet `dev`, `build`, `check`, `test` und `test:e2e` als Skripte ein. `check` prüft Typen. `test` führt Core-Tests einmalig aus.

**Spezifikationen** beschreiben [Spielregeln](../specs/2026-11-15-postlogistik-design.md), [Architektur und Schnittstellen](../specs/2026-11-15-postlogistik-architektur.md) und [Bedienabläufe](../specs/2026-11-15-postlogistik-ux-flow.md).

## Rahmen und Projektstruktur

- `src/core/game.ts` bietet `createGame`, `step`, `applyCommand` und `readView` gemäß Architektur. `src/core/model.ts` definiert Zustand, Befehle und Ansichten. `src/core/balance.ts` enthält Fristen, Kosten, Kapazitäten und Ziele.
- `src/main.ts` verdrahtet die Anwendung. `src/ui/` enthält Ansichten, SVG-Karte und CSS. `src/browser/clock.ts` steuert die Taktung, `src/browser/save-store.ts` die Browser-Slots. `src/core/save.ts` verarbeitet das Dateiformat. `tests/core/` und `tests/browser/` trennen Simulations- und Browserprüfungen.
- `dist/` lässt sich auch unter einem URL-Unterpfad statisch ausliefern. Alle Laufzeitdateien werden mitgeliefert. Simulation und Speicherung liegen vollständig im Browser.
- Der Core verarbeitet 100-ms-Schritte. Die Oberfläche bietet Pause, 1×, 2× und 4×. Die Partie startet mit vier Gebieten. Zwei bestätigte Ausbauten führen zu sechs und acht Gebieten. Das Bewertungsfenster umfasst fünf Simulationsminuten.
- Vor HTML-, CSS- oder Browsercode passende Leitfäden mit `bunx --bun modern-web-guidance@latest` suchen und abrufen. Browserfunktionen an der Baseline- und Fallback-Regel des Skills messen.
- Pro Paket den fachlichen Test zuerst schreiben und fehlschlagen lassen. Nach Implementierung `bun run check`, `bun run test`, `bun run build` sowie die Browserprüfungen des Pakets ausführen und lokal mit Co-Autor-Trailer committen.

## Besonders zu prüfende Fehlerfälle

- Ein wieder sichtbarer Tab holt keinen Tick nach (Meilenstein 1).
- Ein Depotwechsel erhält bereits geladene und noch im früheren Depot liegende Sendungen (Meilenstein 2).
- Zwei Fahrten können denselben freien Lagerplatz nur einmal belegen (Meilenstein 2).
- Ein Zuschuss zählt weder als Erlös noch als unmittelbare Zielerfüllung (Meilenstein 3).
- Ein Tab mit älterem Slotstand darf einen neueren Spielstand nicht überschreiben (Meilenstein 4).

## Meilenstein 1 · Erste Zustellung im Browser

- [x] Projektgerüst und Prüfbefehle einrichten. Vite mit relativen Asset-URLs konfigurieren. Den Produktionsbuild unter einem Pfad unterhalb der Domainwurzel laden und alle Laufzeitanfragen auf denselben Ursprung prüfen.
- [x] In `src/core/map.ts` einen zusammenhängenden Graphen mit Zentrum, vier aktiven Gebieten und Depotstandorten aus einem Seed erzeugen. Kanten bestimmen Fahrzeiten. Test `sameSeedRepeatsAndEveryDistrictIsReachable` prüft Reproduzierbarkeit, Variation und Erreichbarkeit bei mindestens 100 Seeds.
- [x] In `src/core/dispatch.ts` Werbung und Briefe vom Zentrum per Fahrrad automatisch zustellen. Chargen reservieren, sichtbar transportieren und nach Bedienzeit im Gebiet zustellen. Fahrzeug zum Zentrum zurückführen. Test `deliveryAndRevenueAreBookedOnce` prüft Menge, Rückkehr und genau eine Erlösbuchung.
- [x] Startmenü, Seedfeld, Einstiegshilfe, Gebietsliste und SVG-Karte anbinden. Pro Animationsframe höchstens acht Schritte zulassen. `hiddenTabDoesNotCatchUp` prüft unveränderten Tick während ausgeblendeter Seite, Wiederaufnahme ohne Nachholschritte und fortbestehende manuelle Pause. Bei gleicher Tickzahl liefern alle Tempi dasselbe Simulationsergebnis.
- [x] Im Browser mit zwei Seeds jeweils eine Briefzustellung vom Eingang bis zur Buchung beobachten. Paket prüfen und committen.

Abnahme: Typprüfung, acht Core- und Taktgeber-Tests sowie drei Playwright-Tests bestanden. Chromium lud den Produktionsbuild unter `/post/` und schloss für `Nordring` und `Westpost` je eine Briefzustellung ab. Der Sichtbarkeitstest löste Browserereignisse kontrolliert aus. Die Kartenansicht wurde zusätzlich bei 1280 × 720 geprüft.

## Meilenstein 2 · Vollständige Disposition und manuelle Eingriffe

- [x] Alle fünf Sendungsarten, Standard und Express sowie die vier Fahrzeuge gemäß Eignungstabelle in `balance.ts` ergänzen. Eine geeignete Startflotte anbieten. Test `vehicleEligibilityAndDeadlines` prüft unzulässige Beladungen, längere Bedienzeit beim Einschreiben, kürzere Expressfrist und die Abfertigung wartender Werbung bei ausreichender Kapazität.
- [x] Mehrgebietstouren und Depotumschlag in `dispatch.ts` und `src/core/depots.ts` umsetzen. Fristgefahr und Alter vor Gebietsvorrang und kurzen Wegen bewerten. Stabile IDs lösen Gleichstände auf. Ladeeinheiten und Zielplatz vor der Abfahrt reservieren. `lastDepotCapacityIsReservedOnlyOnce` prüft zwei Zugriffe auf den letzten freien Platz. `transferPreservesQuantityAgeAndDeadline` prüft den Umschlag.
- [x] Befehle für Depots, Flotte, Gebietszuständigkeit, Vorrang, Bündelwartezeit und verbindliche Tourvorlagen ergänzen. Bei einem Zuständigkeitswechsel laufen beladene Touren aus. Ladung im früheren Depot wird über das Zentrum weitergeleitet. Prüfe mit `reassignmentKeepsShipmentsDeliverable` die laufende Fahrt und den Weitertransport sowie mit `repeatedPurchaseChargesOnce` wiederholte Befehle ohne zusätzliche Kosten.
- [x] Gebietsdetail, Depotdetail, Flottenansicht, Problemliste und Toureneditor anbinden. `manualTemplateChangesStopOrder` prüft eine geänderte Reihenfolge, unveränderte laufende Fahrten, einen sichtbaren Wartegrund und Rückgabe an die Automatik.
- [x] Alle Sendungsarten und einen Depotumschlag im Browser nachvollziehen. Eine manuelle Vorlage einsetzen und wieder aufheben. Paket prüfen und committen.

Abnahme: Typprüfung, Produktionsbuild und 24 Core- und Taktgeber-Tests bestanden. Die Core-Fälle prüfen zusätzlich Bündelkonflikte, Expressfrist, Doppelbuchungen, den Rücktransport aus einem Depot und die Räumung bei verbindlicher Vorlage. Vier Playwright-Tests in Chromium 159 unter `/post/` bestanden. Mit dem Seed `Nordring` wurden alle fünf Sendungsarten, Depotbestand nach Umschlag, Fahrzeugverlegung, eine gestartete manuelle Tour, Rückgabe an die Automatik und abgeschlossene Räumung nachvollzogen. Die README erklärt den Einstieg in Depotbetrieb und Tourplanung.

## Meilenstein 3 · Betriebsergebnis, Ausbau und Sanierung

- [ ] `src/core/metrics.ts` wertet Zustellungen, überfälligen Rückstand und operativen Saldo für ein Fenster von 3.000 Ticks aus. Express erhält größeres Gewicht. Ein leeres Zustellfenster erfüllt kein Ziel. `overdueBacklogLowersSatisfaction` prüft den Einfluss offener Fristüberschreitungen. `mixedFleetReducesCostAtEqualService` vergleicht zwei Flotten bei identischem Aufkommen.
- [ ] `src/core/progression.ts` prüft Pünktlichkeit, Zufriedenheit und Saldo im vollständigen Fenster. Eine bestätigte Erweiterung aktiviert zwei verbundene Gebiete und startet das nächste Fenster. `expansionRequiresConfirmationAndFreshWindow` prüft vier, sechs und acht Gebiete sowie freien Betrieb nach Ziel drei. Für jede Stufe eine reproduzierbare erfolgreiche Flottenkonfiguration als Balancingprüfung festhalten.
- [ ] `src/core/recovery.ts` erzeugt eine Sanierungsvorschau aus Bergungsort, Ladung, nötiger Flotte und offen ausgewiesenem Zuschuss. Bestätigung validiert den Plan atomar, löst Reservierungen und startet das Bewertungsfenster neu. `repeatableRecoveryPreservesShipmentsAndRestartsEvaluation` prüft zweimalige Hilfe bei negativem Budget, volle Bestände, genau einmalige spätere Zustellung und getrennte Zuschussbuchung.
- [ ] Betriebsübersicht, Ausbau und Sanierungsdialog verbinden. Im Browser alle Ziele abschließen und aus absichtlicher Überlastung wieder zustellen. Paket prüfen und committen.

## Meilenstein 4 · Spielstände und Browserabnahme

- [ ] `encodeSave` und `decodeSave` gemäß Architektur implementieren. `roundTripContinuesActiveTransferExactly` vergleicht unterbrochenen und fortgesetzten Ablauf mit identischen Eingaben während Fahrt und Umschlag. Fehlerfälle prüfen fehlende Referenzen, inkonsistente Bestände und zu neue Versionen.
- [ ] Getrennte IndexedDB-Slots und bedingtes Schreiben innerhalb einer Transaktion implementieren. `staleTabCannotOverwriteNewerSave` prüft zwei Tabs auf demselben Ursprung. `writeFailureKeepsPreviousSaveAndAllowsExport` prüft bisherigen Stand, laufende Partie und gültigen Dateiexport bei Schreibfehler.
- [ ] Spielstanddialog und Wechselpfade integrieren. „Speichern und wechseln“ übernimmt erst nach bestätigtem Schreiben, Import erst nach vollständiger Prüfung und Bestätigung. `bun run test:e2e` prüft den statischen Build mit Playwright in Chromium, Firefox und WebKit.
- [ ] Die Oberfläche praktisch in Chromium, Firefox und Safari prüfen. Playwright-WebKit separat ausweisen. Zwei Seeds bis zum freien Betrieb spielen. Tastatur, 1280 × 720, 1920 × 1080, Graustufen und reduzierte Bewegung prüfen.
- [ ] Mit acht Gebieten, 100 Fahrzeugen und 10.000 offenen Sendungen als Chargen bei 1× nach 60 Sekunden Warmlauf für 120 Sekunden Schrittlast und Bedienbarkeit messen. Der Simulationsrückstand darf nicht wachsen. Browser, Geräte, Build und Ergebnisse je Kriterium dokumentieren.
- [ ] Tatsächliche Start-, Build- und Prüfbefehle in die README übernehmen. Paket prüfen und committen.
