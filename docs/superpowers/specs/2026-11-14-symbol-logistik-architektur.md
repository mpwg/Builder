# Symbol-Logistik · Architektur für die erste Mac-Fassung

Der [Spielentwurf](2026-11-14-symbol-logistik-design.md) definiert die Spielregeln und der [UX-Flow](2026-11-14-symbol-logistik-ux-flow.md) die Bedienung. Diese Spezifikation legt die technische Grundlage dafür fest.

## Plattform und Architekturwahl

Builder erscheint zuerst als installierbares macOS-Spiel für Maus und Tastatur. Die Partie läuft lokal und offline. Windows und Linux folgen mit demselben Godot-Client und jeweils eigener Paket- und Laufzeitabnahme. Mobilgeräte verwenden später denselben Core und erhalten eine für Touch angepasste Bedienung. Ein möglicher Browserclient bleibt offen. In der ersten Fassung wird dafür ausschließlich die Baubarkeit des Core für `wasm32-unknown-unknown` geprüft.

- **Rust-Core und Godot 4.** Der gewählte Ansatz verbindet eine eigenständig test- und einbindbare Simulation mit einer gemeinsamen Spieloberfläche für den Desktop. Die erste Fassung enthält eine drehbare 3D-Modellbahn. Eine dünne GDExtension bindet die Rust-Library an Godot an. [Godot-Rust-Bindings](https://godot-rust.github.io/) · [macOS-Export](https://godot-rust.github.io/book/toolchain/export-mac-and-ios.html)
- **TypeScript und Tauri.** Die Weboberfläche ließe sich im Browser und in einer installierbaren App teilen. Das passt zum ursprünglichen Canvas-Entwurf. Die 3D-Spielansicht müsste als Webrenderer umgesetzt und in den unterschiedlichen System-WebViews der Desktop-Ziele geprüft werden. [Tauri-WebViews](https://v2.tauri.app/reference/webview-versions/)
- **Simulation und Darstellung in Godot.** Dieser Weg spart die Rust-Anbindung. Ein eigener Web-Leitstand oder ein anderes Frontend müsste die Simulation über Godot ausführen oder sie zuerst aus der Engine lösen. Ein späterer Browserclient kann beim gewählten Ansatz direkt auf dem Core aufbauen. [Godot-Web-Export](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html) · [Rust und WebAssembly](https://rustwasm.github.io/docs/wasm-bindgen/)

## Zuständigkeiten und Datenfluss

| Schicht | Zuständigkeit |
| --- | --- |
| Rust-Core | Besitzt die Partie. Generiert die Welt aus einem Seed, verwaltet Straßen- und Spurgeometrie, Warenbestände, Fahrzeuge, Regeln, Freischaltungen und Sanierung. Nutzt gespeicherten Zufallszustand und eine stabile Verarbeitungsreihenfolge. Hat keine Laufzeitabhängigkeit von Godot, Systemuhr, Dateisystem oder Netzwerk. |
| GDExtension | Hält eine Core-Instanz pro aktiver Partie. Übersetzt zwischen Godot-Werten und Core-Typen. Reicht Befehle, Bauanfragen und Sicherungen durch und liefert Ansichten und Fehler in Godot-kompatiblen Werten. |
| Godot-Client | Steuert die Echtzeit-Taktung, Kamera, Auswahl, Eingaben, HUD, Audio und lokale Dateien. Baut die 3D-Szene aus Core-Daten und interpoliert die Fahrzeugdarstellung zwischen Simulationsständen. |

1. **Partie starten.** Der Client übergibt den Seed. Der Core erzeugt die Karte und liefert eine Ansicht mit stabilen Objekt-IDs. Godot baut daraus Straßen, Kreuzungen und sichtbare Objekte. Ein Klick in die Szene liefert eine Objekt-ID oder eine Position auf der Bauebene.
2. **Bauen und konfigurieren.** Der Core erhält typisierte Befehle. Eine Bauvorschau prüft einen Entwurf gegen die aktuelle Weltrevision und liefert Geometrie, Kosten und konkrete Fehler, ohne den Zustand zu ändern. Ein bestätigter Entwurf wird erneut geprüft und vollständig angewandt oder abgelehnt. Doppelte Befehls-IDs dürfen insbesondere keine Kosten oder Rückerstattungen erneut buchen. Der Core liefert Fehlercodes mit Daten für deutschsprachige Meldungen.
3. **Simulieren und darstellen.** Der Core verarbeitet feste Schritte von 50 ms. Godot bestimmt anhand von Pause und Spieltempo, wann und wie viele Schritte anstehen. 1×, 2× und 4× ändern die Zahl der Schritte pro Echtzeitsekunde. Bei Überlastung läuft das Spiel langsamer. Bei Wiederaufnahme entsteht kein Nachholstau. Die Tickzahl und die Revision für bestätigte Änderungen werden getrennt geführt. Ansichten liefern die für Darstellung und Bedienung nötigen sichtbaren Daten einschließlich Fahrzeugpositionen, Verkehrsdiagnosen und offener Entscheidungen. Die Anzeige liest diese Daten und ändert die Welt ausschließlich über Befehle.
4. **Karte in 3D darstellen.** Godot zeichnet aus dem ebenen Straßennetz räumliche Straßen, Gebäude, Gelände und Fahrzeuge. Die Kamera kann verschoben, gezoomt und gedreht werden. Die Kamera und rein visuelle Höhen ändern weder Baugeometrie noch Verkehrsregeln. Die Bahnsimulation verwendet die im Spielentwurf festgelegte Trennung an Straßenkreuzungen.

## Spielstände

Der Core kodiert und prüft ein portables JSON-Dokument mit expliziter Formatversion. Es enthält den zuletzt bestätigten Weltzustand mit Tick, Seed und laufenden Zufallszuständen, Waren und Reservierungen, Fahrzeugen und Aufträgen, Fortschritt, offenen Angeboten, Störungen und manueller Pause. Temporäre Bau- und Sanierungsvorschauen sowie die aktuelle Darstellung werden beim Laden neu aufgebaut. Ein Spielstand ohne `releaseEnabled` lädt gemäß UX-Vertrag mit ausgeschalteter Zielabgabe, sofern seine Formatversion unterstützt wird.

Godot verwaltet automatische und manuelle Sicherungen im lokalen App-Datenverzeichnis. Es schreibt einen temporären Stand im selben Verzeichnis und ersetzt den bisherigen Slot erst nach erfolgreichem Schreiben. Import und Export verwenden dasselbe Dateiformat. Der Core prüft eine eingelesene Datei vollständig, bevor der Client den Partiewechsel anbietet. Ungültige und zu neue Dateien lassen die laufende Partie und vorhandene Sicherungen unberührt. Bei einem Schreibfehler bleiben der bisherige Slot und die laufende Partie erhalten. Export an einen anderen beschreibbaren Ort bleibt verfügbar.

## Technische Abnahme

Der erste Meilenstein verbindet Core, GDExtension und 3D-Client in einer exportierten Mac-App. Auf dem vorhandenen Apple-Silicon-Mac wird außerhalb des Editors eine generierte Kreuzung aus mehreren Blickwinkeln gewählt, eine Straße über die Bauvorschau ergänzt, eine Lkw-Lieferung gespielt und während einer Fahrt gespeichert. Nach Beenden und Neustarten der App setzt der geladene Lkw dieselbe Lieferung fort.

Native Core-Tests prüfen deterministische Wiederholung, atomaren Bau, doppelte Befehle und den Spielstand-Rundlauf. Ein WebAssembly-Build prüft Portabilität. Für die vollständige Mac-Fassung gelten zusätzlich die fachlichen Szenarien und die Leistungsabnahme aus dem Spielentwurf. Plattform- und Geräteabdeckung wird je getestetem Paket ausgewiesen.
