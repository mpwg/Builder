# Symbol-Logistik

Symbol-Logistik ist ein Modellbahn-Logistikspiel für macOS. Milestone 1 startet im Hauptmenü. „Beenden“ ist die einzige aktive Schaltfläche. „Neue Partie“, „Fortsetzen“ und „Spielstand“ sind sichtbar und deaktiviert.

- `crates/builder-core` ist das engine-unabhängige Grundgerüst für die spätere Simulation.
- `crates/builder-godot` ist die Rust-GDExtension. Sie stellt die Menüklasse bereit und führt das Beenden aus.
- `game` enthält das Godot-Projekt, die deklarative Menüszene und das macOS-Exportprofil. Die Szene verbindet das Signal des Buttons mit der Rust-Methode.
- `preview` enthält die eigenständige Browser-Vorschau. Deren Modellbahn-Illustration liegt als WebP im Spielprojekt.

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

Der lokale Universal-Export ist ad hoc signiert. Die Laufzeitprüfung erfolgte auf einem MacBook Pro mit Apple M4 Pro unter macOS 27.2.1. Im exportierten Fenster wurden alle vier Schaltflächen angeklickt. Nur „Beenden“ löste eine Aktion aus und schloss den Prozess. Der Build enthält die Rust-Library und die Menü-Assets.

## Prüfen

Nach dem lokalen Build und Asset-Import deckt der Godot-Integrationstest die Startszene, die drei deaktivierten Buttons und das Beenden per Eingabetaste bei fokussierter Schaltfläche ab.

```fish
set -l godot /Applications/Godot.app/Contents/MacOS/Godot
cargo fmt --check
cargo clippy --locked --workspace --all-targets -- -D warnings
cargo build --locked -p builder-core --target wasm32-unknown-unknown
$godot --headless --path game --script "$PWD/tests/start_menu.gd"
```
