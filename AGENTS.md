# AGENTS.md

## Einstieg

Builder ist das Repo für Symbol-Logistik, ein lokal spielbares macOS-Spiel mit Rust-Core und Godot. Die [README](README.md) beschreibt den spielbaren Stand und die lokale Einrichtung.

- Für die Umsetzung der Mac-App gelten der [macOS-Meilensteinplan](docs/superpowers/plans/2026-11-14-symbol-logistik-macos-umsetzung.md) und die [Architektur-Spezifikation](docs/superpowers/specs/2026-11-14-symbol-logistik-architektur.md). Prüfe im Code, welche geplanten Schnittstellen bereits existieren. Der [frühere Browserplan](docs/superpowers/plans/2026-11-14-symbol-logistik-implementation.md) dient als Referenz für fachliche Szenarien und Balancingdaten.

## Zuständigkeiten und Prüfungen

- **Kartengenerierung und Spielregeln** liegen im Godot-unabhängigen [`builder-core`](crates/builder-core/). Die [Architektur-Spezifikation](docs/superpowers/specs/2026-11-14-symbol-logistik-architektur.md#zuständigkeiten-und-datenfluss) beschreibt den Datenfluss. Beginne für reine Core-Änderungen mit `cargo test --locked -p builder-core`. Die [Kartentests](crates/builder-core/tests/start_map.rs) decken unter anderem reproduzierbare Seeds, Straßennetze und Parzellen ab.
- **Eingaben, Kamera und Darstellung** liegen in der Rust-GDExtension [`builder-godot`](crates/builder-godot/). [`game/`](game/) enthält das Godot-Projekt mit Szenen, Assets und macOS-Exportprofil. Führe für die vollständige Prüfung auf macOS im Repo-Stamm `fish --no-config .vscode/builder.fish check` aus. Der Task führt die Rust-Prüfungen aus, baut und importiert die GDExtension und startet den Godot-Integrationstest. Für sichtbare Kartenänderungen nutze die [Prüfanleitung](README.md#prüfen) mit Seed `0` für die Rasterkarte und `1` für die Ringkarte. Weise Headless-Tests und Prüfungen im App-Fenster getrennt aus.
- **Browser-Vorschau** ist der eigenständige UX-Prototyp in [`preview/`](preview/). Richte Zustände am [UX-Flow](docs/superpowers/specs/2026-11-14-symbol-logistik-ux-flow.md) aus. Starte den lokalen Server laut [Vorschau-README](preview/README.md) und prüfe den geänderten Zustand im Browser über seine Fragment-URL und die vorgesehenen Navigationswege.

## Skills

- Lies vor dem Schreiben oder Ändern von Shellskripten `~/.agents/skills/personal-shell-scripts/SKILL.md`.
- Nutze für HTML-, CSS- und clientseitige JavaScript-Arbeit in `preview/` zuerst Modern Web Guidance. Führe dessen CLI mit `bunx --bun modern-web-guidance@latest` aus. Installiere oder aktualisiere dessen Skills direkt über `bunx --bun skills`.

## Commits

Committe nach jedem abgeschlossenen und passend geprüften Arbeitspaket lokal. Fasse zusammengehörige Änderungen in einem Commit zusammen.

Trage dich bei jedem neuen Commit, den du erstellst, als Co-Autor ein. Verwende den Git-Trailer `Co-authored-by: <Agentenname> <E-Mail-Adresse>` mit deinem eigenen Namen (z. B. Codex, Claude oder GitHub Copilot) und der zugehörigen E-Mail-Adresse.
