# AGENTS.md

## Einstieg

Builder ist das Repo für Symbol-Logistik, ein statisch auslieferbares TypeScript-Webspiel über Postverteilung. Beginne bei der [README](README.md) und dem [Web-Umsetzungsplan](docs/superpowers/plans/2026-11-15-postlogistik-web-umsetzung.md).

Der [Spielentwurf](docs/superpowers/specs/2026-11-15-postlogistik-design.md) definiert die Regeln. Die [Browserarchitektur](docs/superpowers/specs/2026-11-15-postlogistik-architektur.md) legt die Grenzen zwischen Simulation, Oberfläche und Speicherung fest. Der [UX-Flow](docs/superpowers/specs/2026-11-15-postlogistik-ux-flow.md) beschreibt die Bedienung und Fehlerfälle.

## Arbeitsweise

- Verwende deutsche Umlaute.
- Prüfe vor Eigenentwicklungen für einzelne Komponenten zuerst native Browserbausteine und geeignete fertige Komponenten oder Bibliotheken. Wähle nach Funktionsumfang, Zugänglichkeit und Aufwand für Integration und Pflege.
- Prüfe Spielregeln unabhängig vom DOM mit reproduzierbaren Seeds und festen Simulationsschritten. Prüfe sichtbare Abläufe im gebauten Spiel im tatsächlichen Browser. Weise automatisierte und praktische Browserprüfungen getrennt aus.
- Nutze für HTML, CSS und clientseitiges TypeScript zuerst Modern Web Guidance. Führe alle Aufrufe mit `bunx --bun modern-web-guidance@latest` aus. Nutze für die Skills-CLI `bunx --bun skills` und installiere oder aktualisiere deren Skills direkt darüber.
- Lies vor dem Schreiben oder Ändern von Shellskripten `~/.agents/skills/personal-shell-scripts/SKILL.md`.

## Commits

Committe nach jedem abgeschlossenen und passend geprüften Arbeitspaket lokal. Fasse zusammengehörige Änderungen in einem Commit zusammen. Trage dich mit dem Git-Trailer `Co-authored-by: <Agentenname> <E-Mail-Adresse>` als Co-Autor ein.
