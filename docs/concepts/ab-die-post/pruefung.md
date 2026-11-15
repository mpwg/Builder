# Prüfung der Konzeptbilder

Stand: 15. November 2026.

## Ergebnis und Umfang

20 Konzepttafeln plus die bestätigte Stilreferenz liegen als PNG im Repo. Alle 21 Dateien haben 1672 × 941 Pixel; Gesamtgröße der PNGs: 52,89 MiB. PNG-Signaturen, Chunk-Prüfsummen, Bildmaße, erwartete Dateinamen und Vollständigkeit wurden maschinell geprüft. [manifest.json](manifest.json) enthält Maße, Dateigrößen und SHA-256-Prüfsummen.

Alle finalen Tafeln wurden visuell betrachtet. Geprüft wurden Spieltitel, Wiedererkennbarkeit des bestätigten Stils, jeweilige Hauptansicht, wesentliche Beschriftungen und die Abdeckung der Bedienabläufe. Die Abdeckungsmatrix steht in der [Übersicht](README.md); eine unabhängige lesende Prüfung der Spezifikationen durch einen Subagenten lieferte die zugrunde liegende Liste von 24 Hauptansichten. Seitenleisten und Zustandsvarianten sind in den 20 Tafeln zusammengefasst.

## Gezielte Bildkorrekturen

| Tafel | Beobachtung und Korrektur |
| --- | --- |
| 03 · Einstiegshilfe | Auf vier benannte Gebiete und ein Postzentrum reduziert; zusätzliche Depots und die unpassende Anfangskrise entfernt. |
| 07 · Depots | Speditionsware von Express auf Standard korrigiert; Lager mit LE beschriftet; nur Depots als aktive Navigation hervorgehoben. |
| 08 · Flotte | Überführung des Lkw ohne Ladung, mit 0 / 60 LE dargestellt. |
| 09 · Fahrzeugkauf | Kapazitätsangaben von Sendungszahlen auf Ladeeinheiten (LE) geändert. |
| 14 · Sanierung | Budget im oberen Statusbereich an den Fehlbetrag der Vorschau angeglichen. |

Die Korrekturen wurden mit dem integrierten Bildwerkzeug ausgeführt und danach erneut betrachtet. [korrekturprompts.json](korrekturprompts.json) enthält die verwendeten Anweisungen. Im Repo liegt jeweils die ausgewählte Endfassung; die Originalgenerierungen bleiben außerhalb des Repos erhalten.

## Grenzen der Konzepte

- Die Tafeln zeigen Gestaltung und Anordnung, keine exakten Simulationsergebnisse. Beispieldaten, Depotnamen, Flottenbestände und Geografie sind zwischen den Tafeln nicht als konsistenter gespeicherter Spielzustand zu lesen.
- Aus der Stilreferenz übernommene Kartenbeschriftungen wie „98 % geliefert“ sind illustrative Platzhalter. Die Umsetzung muss Zeitfenster und Bezugsgröße konkret benennen oder offene Mengen anzeigen.
- Die Kosteneinheiten, Ladeeinheiten und Ausbauempfehlungen müssen bei Umsetzung aus den Balancingdaten stammen. Tafel 13 illustriert die Platzierung einer Kapazitätsvorschau; die generische Angabe „Fahrzeug-Einheiten“ ist keine neue Spielgröße.
- Tafel 19 ist ein Vorher-Nachher-Vergleich. Maßgeblich für die dargestellten Zustände sind die Werte innerhalb der beiden Vergleichsfelder; die äußere Rahmenleiste ist dekorativer Kontext.
- Bild 20 zeigt eine kompaktere Anordnung mit acht Gebieten und sichtbarem Fokus. Es ist ebenfalls ein PNG mit 1672 × 941 Pixeln, kein ausgeführter Test bei 1280 × 720.
- Unterschiedliche aktive Navigationsmarkierungen und vereinfachte Richtungspfeile sind Gestaltungsdetails, keine verbindliche Navigations- oder Routinglogik.
- Kleine Fehlertexte, etwa beschädigte gegenüber zu neuen Importen oder Speichern beim Wechsel, verwenden die Muster aus 16–18. Die genaue Fehlermeldung muss die tatsächliche Ursache benennen; die laufende Partie darf nicht verloren gehen.

## Prüfarten

**Durchgeführt:** unabhängige Abdeckungsanalyse, Sichtprüfung aller finalen Bilder, fünf gezielte Bildkorrekturen, Prüfung der PNG-Dateien und der lokalen Dokumentverweise.

**Nicht durchgeführt und nicht behauptet:** Implementierung, automatisierte Spieltests, praktische Browserprüfung, Tastatur- und Screenreader-Abnahme, Kontrastmessung oder Abnahme bei bestimmten Viewportgrößen. Für dieses reine Bild- und Dokumentationspaket wurde kein Anwendungscode geändert.
