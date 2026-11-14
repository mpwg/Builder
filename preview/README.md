# UX-Vorschau · Symbol-Logistik

Die Vorschau ist ein eigenständiger UX-Prototyp. Die installierbare Spielfassung folgt der [Architektur-Spezifikation](../docs/superpowers/specs/2026-11-14-symbol-logistik-architektur.md).

Im Verzeichnis `preview` einen lokalen Dateiserver starten:

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

Dann [die Vorschau öffnen](http://127.0.0.1:4173/). Die linke Navigation bietet direkten Zugriff auf alle Ansichten. Die Pfeile oben blättern durch die Galerie. Kartenpunkte, Werkzeuge und Aktionslinks führen zu den passenden Beispielen. Jeder Zustand hat eine eigene URL mit Fragment, etwa `/#wahl` für die Freischaltungswahl.

Die Ansicht arbeitet mit festen Beispieldaten. Bauen, Lieferungen und Speichern werden als Bildschirmzustände veranschaulicht. Das Dateifeld zeigt die vorgesehene Dateiauswahl. Die beiden Importbeispiele zeigen die anschließenden Zustände.

Grundlage sind der [UX-Flow](../docs/superpowers/specs/2026-11-14-symbol-logistik-ux-flow.md) und die [Modellbahn-Variante](../docs/visual-concepts/miniaturstadt-modellbahn.png). Die Kartenillustration wurde daraus mit ImageGen für die Vorschau abgeleitet und liegt lokal bei.
