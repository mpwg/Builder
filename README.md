# Symbol-Logistik

Symbol-Logistik ist ein Modellbahn-Logistikspiel für macOS. In Milestone 2 öffnet **Neue Partie → Starten** eine generierte Miniaturstadt mit neun Kreuzungen, Wohnhäusern, Zentrallager und zwei Rohstoffvorkommen. Bei jedem Start wird der Seed automatisch gewählt. Auf der Karte verschiebt **WASD** die Ansicht, **Escape** führt ins Hauptmenü zurück. Auf der Zwischenseite führen **Abbrechen** und **Escape** zurück zu „Neue Partie“.

- `crates/builder-core` erzeugt und besitzt die engine-unabhängigen Kartendaten. Ein Seed reproduziert dieselbe Karte mit Raster- oder Ringstraßennetz.
- `crates/builder-godot` ist die Rust-GDExtension. Sie verwaltet den Menüablauf, baut die Godot-Ansicht aus den Core-Daten und steuert die Kamera.
- `game` enthält das Godot-Projekt, die deklarativen Szenen und das macOS-Exportprofil.
- `preview` enthält die eigenständige Browser-Vorschau. Deren Modellbahn-Illustration liegt als WebP im Spielprojekt.

## VS Code

Den Repository-Ordner in VS Code öffnen und im Menü **Terminal → Task ausführen** einen Task wählen. **Spiel bauen** ist der Standard-Buildtask (⇧⌘B). **Spiel starten** baut und öffnet das Spiel. **Projekt prüfen** führt die Rust-Prüfungen und den Godot-Integrationstest aus. **macOS-App exportieren** schreibt den Universal-Build nach `dist/Symbol-Logistik.app`.

Die Tasks benötigen Fish und Rustup im `PATH`. Sie starten Cargo über Rustup mit der für das Projekt ausgewählten Toolchain. Godot wird über den `PATH`, in den Programme-Ordnern oder im lokalen Builder-Cache gesucht. Für einen anderen Installationsort kann `BUILDER_GODOT` beim Start von VS Code auf die ausführbare Godot-Datei gesetzt werden. Der Export benötigt die unten beschriebenen Godot-Exportvorlagen.

## Lokal starten

Vorausgesetzt sind Apple Silicon, die Xcode Command Line Tools, Rustup und [Godot 4.7.2 stable](https://godotengine.org/download/archive/4.7.2-stable/). Rustup wählt anhand von `rust-toolchain.toml` Rust 1.100.0 mit Rust Edition 2024. Die Godot-Anbindung verwendet `godot` 0.5.5 mit der Godot-4.7-API.

Im Repository-Stamm ausführen. Den Pfad zur Godot-App gegebenenfalls anpassen.

```fish
set -l godot /Applications/Godot.app/Contents/MacOS/Godot
cargo build --locked -p builder-godot
mkdir -p game/bin
cp target/debug/libbuilder_godot.dylib game/bin/
$godot --headless --path game --editor --import --quit
$godot --path game
```

## macOS-App exportieren

In Godot unter **Editor → Exportvorlagen verwalten** die passenden Vorlagen für 4.7.2 stable installieren. Die offiziellen macOS-Vorlagen enthalten eine Universal-Binary. Für den Export werden daher beide Rust-Ziele gebaut und mit `lipo` zusammengeführt. Aus dem Repository-Stamm ausführen.

```fish
set -l godot /Applications/Godot.app/Contents/MacOS/Godot
rustup target add aarch64-apple-darwin x86_64-apple-darwin
cargo build --locked --release -p builder-godot --target aarch64-apple-darwin --target x86_64-apple-darwin
mkdir -p game/bin dist
lipo -create target/aarch64-apple-darwin/release/libbuilder_godot.dylib \
    target/x86_64-apple-darwin/release/libbuilder_godot.dylib \
    -output game/bin/libbuilder_godot.dylib
$godot --headless --path game --editor --import --quit
$godot --headless --path game --export-release macOS "$PWD/dist/Symbol-Logistik.app"
open dist/Symbol-Logistik.app
```

Der lokale Universal-Export ist ad hoc signiert. Auf einem MacBook Pro mit Apple M4 Pro und macOS 27.2.1 wurden in der exportierten App eine organische Ringkarte und eine Rasterkarte gestartet. Die Abnahme im App-Fenster umfasste die Zwischenseite, Kamerabewegung, Escape zum Hauptmenü und den Start der zweiten Partie.

## Prüfen

Die Rust-Core-Tests prüfen mit drei festen Seed-Reihen zu je 256 Karten die Reproduzierbarkeit und Variation, beide Netzformen, eindeutige IDs, Erreichbarkeit, Straßenverläufe, Gebäudeabstände und freie Zufahrten. Nach Build und Asset-Import prüft der Godot-Integrationstest Menü und Zwischenseite per Tastatur, einen Kartenfehler mit anschließendem Neustart der Erzeugung, den Szenenaufbau, alle WASD-Richtungen, gleichmäßiges diagonales Tempo, die Kartenbegrenzung und Stillstand beim Loslassen, Escape und Beenden.

```fish
set -l godot /Applications/Godot.app/Contents/MacOS/Godot
cargo fmt --check
cargo clippy --locked --workspace --all-targets -- -D warnings
cargo test --locked --workspace
cargo build --locked -p builder-core --target wasm32-unknown-unknown
$godot --headless --path game --script "$PWD/tests/start_menu.gd"
```
