# Symbol-Logistik · Umsetzungsplan für macOS

**Ziel** ist eine installierbare Offline-App mit drehbarer 3D-Modellbahn und vollständigem Logistik-Spielkreislauf. Der aktuelle Stand ist Meilenstein 2. Meilenstein 3 beginnt mit einer automatischen Lkw-Lieferung auf dem vorhandenen Straßennetz.

**Grundlage** sind die [Architektur-Spezifikation](../specs/2026-11-14-symbol-logistik-architektur.md), der [Spielentwurf](../specs/2026-11-14-symbol-logistik-design.md) und der [UX-Flow](../specs/2026-11-14-symbol-logistik-ux-flow.md). Der [abgelöste Browserplan](2026-11-14-symbol-logistik-implementation.md) dient als Referenz für seine fachlichen Szenarien und vorläufigen Balancingdaten.

**Arbeitsweise.** Direkt auf `main` arbeiten und nach jedem geprüften Paket lokal committen. Mit einem fehlschlagenden Test für den jeweiligen Rust-Vertrag beginnen. Prüfergebnisse für App-Abläufe am real ausgeführten Paket festhalten. Godot 4, die dazu passende `godot`-Crate und Exportvorlagen im ersten Paket gemeinsam auswählen, prüfen und mit exakter Version dokumentieren. Die Cargo-Abhängigkeiten im Lockfile fixieren.

## Projektstruktur und Verträge

- `crates/builder-core` enthält Modell, Simulation, Ansichten und JSON-Spielstände mit Serde. `crates/builder-godot` baut die GDExtension als `cdylib`. `game` enthält das Godot-Projekt mit Szenen, Assets und Exportkonfiguration. Die Laufzeitlogik für Menü, HUD und Kamera liegt in der Rust-GDExtension. Die Extension für den jeweiligen Build unter `res://` bereitstellen und in der exportierten App verifizieren. Generierte Binärdateien und App-Pakete bleiben Build-Artefakte. [GDExtension einbinden](https://godot-rust.github.io/book/intro/hello-world)
- Der Core bietet `Game::new(seed: &str) -> Result<Game, GameError>`, `Game::apply(command: CommandEnvelope) -> Result<CommandReceipt, GameError>`, `Game::preview_build(draft: &BuildDraft) -> Result<BuildQuote, GameError>`, `Game::step()`, `Game::view() -> GameView`, `Game::encode_save() -> Result<Vec<u8>, SaveError>` und `Game::decode_save(bytes: &[u8]) -> Result<Game, SaveError>`. Nur die bestätigenden Methoden und `step` ändern die Partie. `GameView` enthält stabile Objekt-IDs, Tick, Revision, Geometrie, Fahrzeugpositionen und die entdeckten Infos für den Inspektor. Die Extension übersetzt diese Aufrufe in Godot-Werte, wobei Spielstände als Bytes und sichtbare Ansichten als Daten übergeben werden.
- Ein Bauentwurf enthält seine Basisrevision. Vor der Übernahme prüft der Core die gesamte Operation gegen den aktuellen Zustand und bestätigt eine neue Revision nur nach Erfolg. Erfolgreiche Befehls-IDs und ihre Ergebnisse bleiben für Wiederholungen innerhalb desselben Spielstands verfügbar. Die Tickzahl läuft separat. Ganzzahlige Warenmengen in Tausendsteln, gespeicherte Zufallsströme und stabile ID-Reihenfolge machen die Simulation reproduzierbar.

## Meilenstein 1 · Grundgerüst und Startmenü

1. Cargo-Workspace mit engine-unabhängigem Core und Rust-GDExtension einrichten. Rust, Godot-API und Cargo-Abhängigkeiten festlegen. Die Bibliotheken kompilieren und den Core für WebAssembly bauen.
2. Das Startmenü als Godot-Hauptszene einrichten. „Neue Partie“, „Fortsetzen“ und „Spielstand“ deaktivieren. „Beenden“ verbindet das Button-Signal mit der Rust-Methode. Ein Integrationstest prüft die Menüeinträge und das Beenden per Eingabetaste.
3. Die macOS-App exportieren, außerhalb des Editors öffnen und im nativen Fenster alle vier Schaltflächen anklicken. Der Prozess endet bei „Beenden“. Die Build-Schritte und die geprüfte Plattform stehen in der [README](../../../README.md).

## Meilenstein 2 · Generierte Stadt

„Neue Partie → Starten“ öffnet eine reproduzierbare Raster- oder Ringstadt mit Wohnhäusern, zwei Rohstoffvorkommen, Zentrallager und freien Parzellen am Straßennetz. WASD verschiebt die Ansicht. Bekannte Seeds und die bisherige Abnahme stehen in der [README](../../../README.md).

## Nächste Meilensteine

Die Nummern bezeichnen Entwicklungsmeilensteine. Die fünf Lieferziele sind Fortschrittsstufen innerhalb einer Partie. Für die erste Produktionskette genügen die vorhandenen Straßen und Parzellen. Der freie Straßenbau folgt, sobald sich seine Auswirkung an einer laufenden Lieferung prüfen lässt.

### Meilenstein 3 · Erste Lkw-Lieferung

- Einen Abbaubetrieb auf einem Rohstoffvorkommen setzen. Ein Lkw des Zentrallagers holt den Rohstoff automatisch ab. Der Core bestimmt Route und Fahrposition. Der Inspektor zeigt Bestand, Ladung und Lieferstatus.
- **Abnahme.** Auf Raster- und Ringkarte eine vollständige Lieferung vom Abbau bis zur Einbuchung beobachten. Core-Tests prüfen, dass der Auftrag Ware und Zielkapazität jeweils einmal reserviert und die Ladung genau einmal einbucht.

### Meilenstein 4 · Erste Produktionskette

- Beide Rohstoffe erschließen, eine Fabrik auf einer freien Parzelle bauen und ein kombiniertes Produkt herstellen. Automatische Aufträge versorgen die Fabrik und liefern das Produkt ans Zentrallager. Begrenzte Lager und fehlende Zutaten sind im Inspektor sichtbar.
- Die ausdrückliche Zielabgabe misst Liefermenge und durchschnittliche Lieferrate über 60 Simulationssekunden. Reservierte Waren bleiben für ihre Aufträge verfügbar. Eine Pause hält Produktion, Fahrten und Ratenfenster an.
- **Abnahme.** In der exportierten Mac-App eine Partie vom Hauptmenü bis zum ersten Lieferziel spielen. Fehlende Zutaten und volle Lager beobachten, die Ursache im Inspektor erkennen und prüfen, dass die Simulationszeit während einer Pause stehen bleibt.

### Meilenstein 5 · Straßennetz ändern und Partie fortsetzen

- Eine Straße als Polyline mit Anschlussprüfung, Kostenanzeige und revisionsgebundener Bauvorschau bauen. Eine Lieferaufgabe macht durch die neue Verbindung eine Route möglich oder kürzer. Zoom und Drehung unterstützen Auswahl und Bau. Die 50-ms-Simulation nutzt bei 1×, 2× und 4× ein begrenztes Schrittbudget. Manuelle Pause und Fensterpause wirken unabhängig, beim Wiederherstellen entsteht kein Nachholstau.
- Versionierte JSON-Spielstände enthalten auch aktive Aufträge, Reservierungen, Ladung und Fahrposition. Automatischen und manuellen Stand getrennt im App-Datenverzeichnis führen und atomar ersetzen. Ungültige oder neuere Dateien ablehnen. Bei Schreibfehlern bleiben der bisherige Slot und die laufende Partie erhalten. Import und Export verwenden dasselbe Format.
- **Abnahme.** Dieselbe Kreuzung aus zwei Kamerawinkeln auswählen, die Straße bauen und einen Lkw auf der neuen Route beobachten. Während der beladenen Fahrt speichern, die App vollständig beenden, offline neu starten und dieselbe Lieferung genau einmal abschließen. Import, Export und Schreibfehler praktisch prüfen. Im Core den ununterbrochenen Lauf mit dem gespeicherten und fortgesetzten Lauf vergleichen. Prüfen, dass abgelehnte Vorschauen den Zustand erhalten und wiederholte Befehle keine doppelten Kosten verursachen.

### Meilenstein 6 · Verkehr steuern und Engpässe beheben

- Mehrere Lkw, Spurgraph, Vorfahrt, Stoppschilder, Einbahnstraßen, Abbiegespuren, Kreisverkehre und Ampeln einführen. Zeitlich begrenzte Ampeldefekte schalten nach dem ersten Spielziel auf sichere Vorfahrt. Bevorzugte und verbindliche Lieferanten und Routen unterscheiden. Der Inspektor erklärt Lieferblockaden und führt zur Ursache.
- Rückbau, Fahrzeugbergung und zweckgebundene Bauhilfe geben Reservierungen frei und erhalten Ladungen und Rückerstattungen. Die Hilfe deckt den Fehlbestand des bestätigten Sanierungsplans.
- **Abnahme.** In reproduzierbaren Lastfällen durch Abbiegespur, Phasenanpassung und Ampelversatz den Durchsatz messbar verbessern. Bei einem vollständigen Stillstand mit leerem Baustofflager ohne Warenverlust wieder liefern. Die Auswirkung eines Ampeldefekts im Spiel nachvollziehen.

### Meilenstein 7 · Freischaltungen und Güterbahn

- Fünf Lieferziele mit je drei gültigen Angeboten nach den ersten vier Zielen umsetzen. Sechs Symboltypen, seedabhängige azyklische Rezepte und Stadtwachstum ergänzen. Die optionale zweite Zone bringt eine neue Quelle und zwei Terminals für bidirektionalen Güterverkehr mit echtem Umschlag. Die Zone kann später erneut angeboten werden. Stadtwachstum schützt reservierte Flächen und Spielerbauten.
- **Abnahme.** Raster- und Ringkarte bis Ziel fünf spielen, einmal mit und einmal ohne zweite Zone. Im Bahndurchlauf Zutaten in die zweite Zone liefern, das dort hergestellte Produkt zurückbringen und auf derselben Karte weiterspielen. Mindestens 100 Seeds automatisiert auf gültige Starts, erreichbare Lieferziele und gültige Wahlangebote prüfen.

### Meilenstein 8 · Mac-Fassung abnehmen

- Die exportierte App außerhalb des Editors offline durchspielen und die Szenarien aus Spielentwurf und UX-Flow prüfen. Eine gespeicherte Partie während Fahrt, Freischaltungswahl und Ampeldefekt wiederherstellen. Tastatur, Graustufen, Zoomstufen und beide vorgesehenen Fenstergrößen praktisch prüfen.
- **Abnahme.** Mit etwa 100 Lkw und zwei Zügen bei 1× nach 60 Sekunden Warmlauf für 120 Sekunden messen und dabei zoomen und drehen. Ziel sind in der Regel mindestens 30 FPS und kein wachsender Simulationsrückstand. Gerät, macOS-Version, Build, Seeds, Fahrzeugzahlen und Ergebnisse je Kriterium dokumentieren.

Windows und Linux folgen mit eigenen App-Paketen und einem Spielstand-Import aus der Mac-Fassung. Touch-Bedienung und die Entscheidung über einen Browserclient gehören zu späteren Paketen. Der WebAssembly-Build des Core bleibt Teil der technischen Prüfung.
