# Symbol-Logistik

Symbol-Logistik ist ein Browser-Spiel über den Betrieb eines Postnetzes. Eingehende Sendungen gelangen vom zentralen Postzentrum direkt oder über Depots in ganze Zustellgebiete. Werbung, Briefe, Einschreiben, kleine Pakete und Speditionsware stellen unterschiedliche Anforderungen an Kapazität, Transportmittel und Zustellzeit.

Die Tourenplanung läuft automatisch. Du kannst Flotte, Gebietszuständigkeiten, Prioritäten und Tourvorlagen anpassen. Auf einer symbolischen 2D-Karte beobachtest du den Betrieb in Echtzeit und kannst jederzeit pausieren. Kosten, Pünktlichkeit und Zufriedenheit zeigen die Folgen deiner Entscheidungen. Ein festgefahrener Betrieb lässt sich jederzeit sanieren.

Meilenstein 1 ist spielbar. Ein Fahrrad stellt Briefe und Werbung vom Postzentrum aus automatisch zu. Verfolge die Fahrt und die Erlösbuchung. Wähle ein Gebiet auf der Karte oder in der Liste, um offene und zugestellte Mengen zu sehen. Du kannst jederzeit pausieren oder das Spieltempo erhöhen.

## Lokal spielen

Voraussetzung ist Bun. Im Projektordner ausführen:

```sh
bun install --frozen-lockfile
bun run dev
```

Die ausgegebene Adresse im Browser öffnen und **Neue Partie → Starten** wählen. Mit den Seeds `Nordring` und `Westpost` lassen sich zwei unterschiedliche Zustellläufe reproduzieren.

`bun run build` erzeugt `dist/` zur statischen Auslieferung. Der Build funktioniert auch unter einem URL-Unterpfad. Die Simulation läuft vollständig im Browser.

## VS Code

Die Tasks stehen unter **Terminal → Task ausführen**. Bun muss für VS Code im `PATH` verfügbar sein.

- **Abhängigkeiten installieren** richtet das Projekt anhand der Sperrdatei ein.
- **Spiel starten** startet Vite lokal und öffnet das Spiel im Browser. Zum Beenden den Task stoppen.
- **Spiel bauen** erzeugt den statischen Build. Das ist der Standard-Buildtask mit ⇧⌘B auf macOS.
- **Projekt prüfen** führt Typprüfung, Core- und Taktgeber-Tests sowie die Browsertests mit Produktionsbuild aus. Vor dem ersten Browsertest **Chromium für Browsertests installieren** ausführen.

## Prüfen

```sh
bun run check
bun run test
bunx --bun playwright install chromium
bun run test:e2e
```

Die Core-Tests prüfen unter anderem 128 Karten-Seeds, Zustellung und Erlösbuchung. Playwright testet den Produktionsbuild unter `/post/` in Chromium. Dazu gehören zwei vollständige Briefzustellungen und das Pausenverhalten mit kontrollierten Sichtbarkeitsereignissen.

- [Spielentwurf](docs/superpowers/specs/2026-11-15-postlogistik-design.md)
- [Browserarchitektur](docs/superpowers/specs/2026-11-15-postlogistik-architektur.md)
- [UX-Flow](docs/superpowers/specs/2026-11-15-postlogistik-ux-flow.md)
- [Web-Umsetzungsplan](docs/superpowers/plans/2026-11-15-postlogistik-web-umsetzung.md)
