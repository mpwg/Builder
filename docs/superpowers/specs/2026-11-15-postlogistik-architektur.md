# Ab die Post · Browserarchitektur

Die [Spielregeln](2026-11-15-postlogistik-design.md) gehören in einen deterministischen TypeScript-Core. Die Bedienung folgt dem [UX-Flow](2026-11-15-postlogistik-ux-flow.md).

## Laufzeit und Zuständigkeiten

| Schicht | Verantwortung |
| --- | --- |
| Simulation | Seed, Netz, Sendungsgruppen, Touren, Reservierungen, wirtschaftliche Buchungen und Bewertung. Verwendet feste 100-ms-Schritte und ganzzahlige Mengen und Geldwerte. |
| Browser-Steuerung | Zeitsteuerung, Eingaben, Auswahl, Vorschauen und typisierte Befehle. Liest Ansichten aus der Simulation und reicht fachliche Fehler an die Oberfläche weiter. |
| Oberfläche | Semantisches HTML für Steuerung, Listen und Dialoge, SVG für Zustellgebiete, Verbindungen und Fahrzeugsymbole. CSS regelt Layout, Zustände und reduzierte Bewegung. |
| Speicherung | Versionierte JSON-Daten prüfen und in getrennten IndexedDB-Slots speichern. Spielstände als Dateien importieren und exportieren. |

Die Produktion besteht aus statischen Dateien und lokalen Assets. Eine einzelne Startseite lädt alle Laufzeitmodule vom selben Ursprung. Hosting auch unter einem URL-Unterpfad ermöglichen. Das Spiel benötigt weder Dienste noch Konten. Ein Entwicklungs- oder Prüfserver liefert nur Dateien aus.

## Zustand und Befehle

Die Simulation bietet `createGame(seed: string): GameState`, `step(state: GameState): GameState`, `applyCommand(state: GameState, command: CommandEnvelope): CommandResult` und `readView(state: GameState): GameView`. Der Core kennt weder DOM noch Uhr, Dateisystem oder Netzwerk. `GameView` enthält die für Darstellung und Diagnose benötigten Daten und stabile IDs. Mutationen der Partie laufen über bestätigte Befehle und Simulationsschritte.

Ein bestätigender Befehl trägt eine ID und die Basisrevision seiner Konfiguration. Ein erneuter erfolgreicher Befehl mit gleicher ID wendet Änderungen kein zweites Mal an. Neue Befehle mit veralteter Revision oder inzwischen unerfüllbaren Bedingungen werden vor jeder Buchung abgelehnt. Automatische Schritte erhöhen den Tick. Spielerschritte erhöhen die Konfigurationsrevision. Auch bei unveränderter Revision werden dynamische Voraussetzungen wie Budget oder Belegung erneut geprüft.

Stückzahlen bleiben vom Eingang bis zur Zustellung oder Bergung nachverfolgbar. Reservierte Sendungen bleiben am Herkunftsort, bis das Fahrzeug sie übernimmt. Am Depot reservierter Platz wird beim Entladen in belegten Platz umgewandelt. Jede Zustellung erzeugt genau eine Einnahme. Konflikte werden durch stabile Reihenfolge nach eindeutigen IDs aufgelöst.

Der Browser steuert mit `requestAnimationFrame` die feste Schrittfolge und begrenzt je Frame die Zahl nachzuholender Schritte. Die Anzeige interpoliert nur zwischen bekannten Positionen. Manuelle Pause, offener Sanierungsplan und verborgenes Dokument wirken unabhängig. Bei Pause und Wiederaufnahme wird der Zeitakkumulator zurückgesetzt. Wandzeit außerhalb der aktiven Simulation verändert keine Fristen und Kosten.

## Spielstände

Das JSON enthält Formatversion, Seed, Tick, Zufallszustand, manuelle Pause, Konfigurationsrevision, bestätigte Befehls-IDs, Sendungen, Lager, Buchungen, Fortschritt und laufende Fahrten samt Reservierungen. Die Ansicht wird beim Laden neu abgeleitet. Aktuelle Browser-Sichtbarkeit, Frame-Zeit und offene Vorschauen werden zur Laufzeit neu ermittelt.

`encodeSave(state: GameState): string` erzeugt das JSON. `decodeSave(text: string): SaveResult` prüft vor jeder Übernahme Form, Version, Zahlenbereiche, Referenzen und konsistente Bestände. Schreibvorgänge ersetzen einen Slot in einer IndexedDB-Transaktion und melden Erfolg nach deren Abschluss. Eine parallel geöffnete Partie in einem anderen Tab darf einen neueren Stand nicht still überschreiben. Dazu den zuletzt gelesenen Slotstand innerhalb derselben Transaktion vergleichen. Dateiexport bleibt bei fehlendem Browserspeicher verfügbar.

Desktop-Chromium, Firefox und Safari sind Prüfziele. Modern Web Guidance bestimmt die Anforderungen an Browserfunktionen und Fallbacks. Versionsnummern und Ergebnisse stehen im späteren Abnahmeprotokoll.
