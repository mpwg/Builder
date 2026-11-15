# Ab die Post · UX-Flow

Die [Spielregeln](2026-11-15-postlogistik-design.md) definieren die Zustellung. Die [Browserarchitektur](2026-11-15-postlogistik-architektur.md) definiert Zustand und Speicherung.

## Partie starten

„Neue Partie“ zeigt einen vorgeschlagenen, änderbaren Seed. Nach „Starten“ ist die Karte mit Zentrum und vier Zustellgebieten sichtbar. Die ausblendbare Einstiegshilfe erklärt an realen Daten, wo Briefe und Werbung eintreffen, welches Fahrzeug fährt und wie man eine Änderung überprüft. „Fortsetzen“ bietet den neuesten gültigen lokalen Stand an. Ein fehlender Stand lässt „Neue Partie“ und „Importieren“ verfügbar.

## Betrieb beobachten

Die flache 2D-Karte zeigt klar abgegrenzte Gebiete, Depot-Symbole, Verbindungen und fahrende Fahrzeuge. Zoom und Verschieben funktionieren auch im pausierten Zustand. Eine Gebietsliste bietet dieselbe Auswahl wie die Karte. Sendungsarten unterscheiden sich durch Silhouette und Namen. Express und Probleme haben zusätzliche Textkennzeichen. Bei reduzierter Bewegung bleiben Position und Status ohne fließende Animation nachvollziehbar.

Karte und Betriebsübersicht zeigen Rückstand, Pünktlichkeit, Zufriedenheit und laufenden Saldo. Gebietsdaten trennen offene und überfällige Mengen nach Art und Serviceklasse. Depotdetails zeigen freien und reservierten Lagerplatz, Ladeplätze und Flotte. Fahrtinformationen nennen Phase, Ziel und Ladung. Bei einer Störung im Ablauf öffnet die Problemliste das betroffene Gebiet oder Depot und nennt die Ursache sowie den passenden Eingriff.

## Touren und Zuständigkeiten verbessern

Im Gebietsdetail lässt sich das Depot ändern oder Vorrang setzen. Die Flottenansicht zeigt Kauf- und Betriebskosten sowie Eignung je Typ. Eine Überführung zeigt Kosten und Status bis zur Ankunft. Eine bestätigte Änderung wirkt auf neue Touren. Eine laufende Fahrt zeigt weiterhin ihre ursprüngliche Route.

Der Toureneditor zeigt Fahrzeugtyp und geordnete Gebiete. Gebiete lassen sich mit beschrifteten Steuerelementen hinzufügen, entfernen und umsortieren. Die Vorschau nennt unpassende Zuordnungen und die geschätzte Fahrzeit. Eine gespeicherte verbindliche Vorlage zeigt Gründe für Wartezustände. „Automatik übernehmen lassen“ gibt die zugewiesenen Fahrzeuge wieder frei. Die Auswahl bleibt nach Änderungen erhalten, damit sich die Wirkung vergleichen lässt.

## Pausieren, ausbauen und sanieren

Pause sowie 1×, 2× und 4× sind jederzeit erreichbar. Die Anzeige nennt wirksame Pausengründe. Beim Schließen eines Sanierungsdialogs oder Wiederanzeigen des Tabs bleibt eine manuelle Pause bestehen.

Die Ausbauansicht zeigt Zielwerte und das Bewertungsfenster. Erreichte Ziele bieten die nächste Gebietserweiterung mit zusätzlichem Aufkommen und Kapazitätsbedarf an. Die Partie läuft mit den bisherigen Gebieten weiter, bis der Spieler den Ausbau bestätigt. Nach dem letzten Ziel bleibt die Karte spielbar.

„Sanierung“ öffnet eine pausierte Vorschau mit Fahrzeugen, Ladung, Bergungsort, Flottenänderungen, Budget und möglichem Zuschuss. Erst die Bestätigung übernimmt den Plan. Ein abgelehnter Plan bleibt mit konkreter Ursache bearbeitbar. Nach Erfolg zeigt die Karte geborgene Sendungen und neu verfügbare Kapazität.

## Sichern und wechseln

Der Spielstanddialog zeigt automatische und manuelle Slots mit Speicherstatus. Import prüft die Datei und bietet erst dann die Übernahme an. Vor dem Wechsel aus einer laufenden Partie stehen „Speichern und wechseln“, „Wechseln“ und „Abbrechen“ zur Verfügung. Der Wechsel nach „Speichern und wechseln“ erfolgt erst nach erfolgreichem Schreiben. Fehler bleiben im Dialog sichtbar, die Partie bleibt erhalten und Dateiexport ist verfügbar.

Alle wesentlichen Aktionen sind per Tastatur erreichbar. Fokus ist sichtbar und kehrt nach einem Dialog zum Auslöser zurück. Fehler nennen die betroffene Einstellung als Text.
