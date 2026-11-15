# Ab die Post · Spielentwurf

Dieses Dokument definiert die Spielregeln für Ab die Post. Dazu gehören die [Browserarchitektur](2026-11-15-postlogistik-architektur.md), der [UX-Flow](2026-11-15-postlogistik-ux-flow.md) und der [Web-Umsetzungsplan](../plans/2026-11-15-postlogistik-web-umsetzung.md).

## 1. Ziel und bestätigte Entscheidungen

Der Spieler betreibt die Post. Eingehende Sendungen werden vom zentralen Postzentrum über eine organisierte Flotte in ganze Zustellgebiete verteilt. Das Spiel belohnt verständliche Verbesserungen an Kapazitätsverteilung, Touren, Kosten und Servicequalität.

Vom Nutzer bestätigt:

- Reines TypeScript-Webspiel ohne Backend und ohne lokale Clients.
- Symbolische 2D-Darstellung.
- Ganze Zustellgebiete statt einzelner Adressen und Haustürstopps.
- Postbetrieb als Schwerpunkt; das Straßennetz gibt die Bedingungen vor.
- Laufender Betrieb mit Pause; automatische Tourenplanung mit manueller Optimierung.
- Ausschließlich eingehende Sendungen verteilen. Keine Abholung und keine Rücksendungen in der ersten Fassung.
- Werbung, Briefe, Einschreiben, kleine Pakete und Speditionsware. Sendungsart und Dringlichkeit sind getrennte Eigenschaften.
- Fahrrad, Lastenrad, Lieferwagen und Lkw. Fußzustellung und Bahn gehören nicht zur ersten Fassung.
- Kosten und Zufriedenheit sind zentrale Größen. Eine Sanierung muss immer möglich bleiben.

Die folgenden Kapitel konkretisieren die erste Spielfassung.

## 2. Betrachtete Ansätze und gewählte Richtung

**Kontinuierlicher Betrieb mit Pause — vom Nutzer gewählt.** Sendungen kommen laufend an, die Automatik plant und fährt Touren. Eingriffe wirken unmittelbar, und die Pause ermöglicht überlegte Änderungen. Dieser Ansatz macht Engpässe sichtbar, benötigt aber verständliche Diagnosen für gleichzeitig laufende Vorgänge.

**Planung pro Zustelltag.** Planung und Auswertung wären klar getrennt und leicht vergleichbar. Dafür gäbe es weniger laufende Eingriffsmöglichkeiten. Nicht gewählt.

**Rundenbasierte Disposition.** Kapazitäten würden pro Runde verteilt und Ergebnisse anschließend berechnet. Das wäre eine kompakte Strategieoberfläche, würde aber den gewünschten laufenden Betrieb ersetzen. Nicht gewählt.

Die statische Anwendung verwendet TypeScript, Vite, semantisches HTML, CSS und eine SVG-Karte. Die Simulation ist ein von DOM und Speicherung unabhängiges TypeScript-Modul.

## 3. Spielkreislauf und Umfang

### Start und laufender Betrieb

Eine neue Partie erzeugt aus einem Seed ein kleines zusammenhängendes Netz mit einem Postzentrum, zunächst vier Zustellgebieten und geeigneten Depotstandorten. Alle fünf Sendungsarten und vier Transportmittel sind von Anfang an verfügbar; die Einstiegshilfe führt zuerst durch Briefe und Werbung. Ein ausreichendes Startbudget erlaubt eine geeignete Flotte für alle Arten. Das Zentrum kann selbst als Zustelldepot arbeiten; ein zusätzlicher Bau ist keine Einstiegshürde.

Sendungen treffen nach einem seedabhängigen, reproduzierbaren Aufkommen im Zentrum ein. Jede Sendungsgruppe besitzt Art, Serviceklasse, Zielgebiet, Eingangszeit, Frist und Stückzahl. Gleichartige Sendungen dürfen als Chargen gespeichert werden; beim Aufteilen bleiben Alter und Frist erhalten.

Der Spieler beobachtet Rückstände, Pünktlichkeit, Kosten und Zufriedenheit, beschafft oder verlegt Fahrzeuge, eröffnet Depots und optimiert Zuständigkeiten und Touren. Fortschritt erweitert die betreute Fläche bewusst statt während einer Krise automatisch weiterzuwachsen: Drei Ausbauziele führen von vier über sechs zu acht Gebieten. Das erste Ziel bewertet die Startgebiete, die nächsten beiden die jeweils bestätigte Erweiterung. Nach dem dritten Ziel bleibt dieselbe Partie frei spielbar. Konkrete Schwellenwerte sind Balancingdaten.

Ein Ziel verlangt über ein zusammenhängendes Fenster von fünf Simulationsminuten eine ausgewiesene Mindestpünktlichkeit, Mindestzufriedenheit und einen nicht negativen operativen Saldo. Vor dem ersten vollständig gefüllten Fenster ist keine Zielerfüllung möglich. Der nächste Ausbau beginnt erst nach Bestätigung; es gibt keine zufälligen Rezept- oder Freischaltungskarten. Jede Erweiterung zeigt zusätzliches Aufkommen und nötige Kapazitäten vorab. Ein Ausbau erhält oder ergänzt die Erreichbarkeit aller Gebiete.

### Sendungen und Eignung

| Art | Charakter | Geeignete Transportmittel |
| --- | --- | --- |
| Werbung | Große Mengen, geringe Erlöse, großzügige Frist; Bündelung lohnt sich | Alle vier |
| Briefe | Regelmäßiges Aufkommen, geringe Ladungsgröße | Alle vier |
| Einschreiben | Zusätzliche Zustellzeit für die bestätigte Übergabe | Alle vier |
| Kleine Pakete | Höherer Platzbedarf | Lastenrad, Lieferwagen, Lkw |
| Speditionsware | Hoher Platzbedarf und längere Entladung | Nur Lkw |

Standard und Express sind Serviceklassen. Express ist in der ersten Fassung für Briefe, Einschreiben und kleine Pakete verfügbar; Werbung und Speditionsware nutzen Standard. Express bedeutet eine kürzere Frist und einen höheren Erlös. Einschreiben sind nicht automatisch Express. Die Übergabebestätigung wird als zusätzliche Bedienzeit im Gebiet modelliert; Empfängerabwesenheit und fehlgeschlagene Einzelzustellungen werden nicht simuliert.

Fahrzeuge unterscheiden sich durch Kaufpreis, laufende Bereitstellungskosten, Fahrtkosten, Geschwindigkeit und Ladekapazität. Kapazität wird in abstrakten ganzzahligen Ladeeinheiten modelliert. Die Fahrzeuge benötigen keine Personalverwaltung, Treibstoffversorgung oder Wartungskette. Betriebskosten enthalten diese Aufwände zusammengefasst. Gemischte Ladung ist erlaubt, sofern Eignung und Kapazität passen.

### Touren und Depots

Das bestehende Netz besteht aus Gebietsknoten, Depotstandorten und Verbindungen mit Fahrzeiten. Der Spieler baut keine Straßen, Spuren oder Ampeln. Die erste Fassung simuliert weder Einzelverkehr noch Kreuzungskonflikte; Flottenknappheit, Ladeplätze, Transportwege und Zustellzeit erzeugen die Engpässe.

Direktzustellung vom Zentrum und Zustellung über ein lokales Depot sind möglich. Jedes Gebiet hat genau einen zuständigen Ausgangspunkt. Depotfahrzeuge bedienen dessen Gebiete; Fahrzeuge des Zentrums können außerdem Sendungen zu Depots bringen. Nach einem Umladen wird die Zustellfahrt separat geplant. Fristen und Sendungsidentität bleiben erhalten. Reservierungen verhindern doppelte Zuteilung und Überbelegung. Für jedes Depot werden Lagerkapazität und Ladeplätze berücksichtigt. Das Zentrum besitzt einen unbegrenzten, sichtbaren Eingangsrückstand, damit Überlast keine Sendungen verschwinden lässt.

Die Automatik bildet Mehrgebietstouren, beachtet Eignung und Kapazität und priorisiert zunächst die gefährdeten Fristen, dann einstellbare Gebietsvorgaben und schließlich kurze Wege. Ein Altersbonus verhindert dauerhaftes Verhungern der Werbung bei ausreichender Gesamtkapazität. Bei insgesamt unzureichender Kapazität muss die Diagnose dies benennen; die Automatik verspricht keine unmögliche Fristeinhaltung.

Eine Tour beginnt und endet am Heimatdepot. Im Gebiet wird die Zustellmenge nach Ablauf der aus Menge und Art berechneten Bedienzeit als zugestellt gebucht. Die Karte zeigt Fahrzeuge als bewegte Symbole zwischen Gebieten; es gibt keine einzelnen Haushalte. Beladung, Fahrt, Zustellung und Rückkehr sind nachvollziehbare Zustände.

Manuelle Optimierung umfasst Gebiet-Depot-Zuordnung, Fahrzeugbestand je Depot, Gebietsvorrang, maximale Bündelwartezeit und gespeicherte Tourvorlagen mit geordneter Gebietsliste und Fahrzeugtyp. Die Automatik teilt passende Sendungen auf die verfügbaren Fahrzeuge auf. Vorlagen sind verbindlich für die ihnen zugewiesenen Fahrzeuge; andere Fahrzeuge bleiben automatisch disponiert. Ungültige Vorlagen werden mit Ursache abgelehnt. Eine gültige, momentan nicht ausführbare Vorlage wartet mit sichtbarem Grund, ohne stillschweigend verändert zu werden. „Automatik übernehmen lassen“ löst die jeweilige Vorgabe ausdrücklich.

Änderungen an Zuordnung und Vorlagen gelten für neue Touren. Bereits beladene Fahrten schließen ihren bisherigen Auftrag ab. Es entstehen keine kostenlosen Teleportationen durch Flottenverschiebung: Fahrzeuge werden erst nach Rückkehr ohne Ladung zu ihrem neuen Depot überführt und verursachen dabei Fahrtkosten. Depotauflösung mit aktiven Fahrzeugen oder Sendungen ist nur über eine angezeigte verlustfreie Räumung möglich.

### Kosten, Zufriedenheit und Sanierung

Einnahmen werden einmal bei Zustellung gebucht. Ausgaben entstehen durch Fahrzeuge, Depots und laufenden Betrieb. Einmalige Investitionen und operative Kosten erscheinen getrennt. Geld wird intern in ganzzahligen Untereinheiten geführt. Verspätete Sendungen behalten ihren Zustellauftrag und den vereinbarten Erlös; ihre Verspätung belastet den Servicewert, statt zusätzlich unübersichtliche Vertragsstrafen zu erzeugen.

Zufriedenheit wird je Gebiet geführt und aus der Pünktlichkeit abgeschlossener Sendungen sowie aktuell überfälligem Rückstand in einem gleitenden Simulationszeitfenster berechnet. Express erhält ein höheres Gewicht. Wenige oder keine neuen Zustellungen dürfen einen alten Rückstand nicht verdecken. Die Gesamtanzeige gewichtet Gebiete nach ihrem Aufkommen. Details zeigen die Einzelbeiträge; keine verborgene Zufallsbewertung. Konkrete Gewichte, Fristen, Kosten und Kapazitäten werden zentral als Balancingdaten festgelegt und anhand reproduzierbarer Szenarien abgestimmt.

Es gibt keine Insolvenz und keine Zinsen. Bei erschöpftem Budget bleibt der Betrieb handlungsfähig; der Saldo darf als sichtbarer Fehlbetrag negativ werden. Sanierung pausiert die Partie und bietet einen überprüfbaren Wiederanlaufplan: Fahrzeuge verlustfrei zurückholen, Flotte und Depots umorganisieren und fehlendes Budget durch einen offen ausgewiesenen Zuschuss ausgleichen. Zuschüsse sind jederzeit wiederholbar, zählen nicht als Erlöse oder Zielerfüllung und setzen Zufriedenheit oder Sendungsalter nicht zurück. Nach einer Sanierung beginnt das Zielbewertungsfenster neu.

Zur Bergung wird Ladung an das Heimatdepot oder ersatzweise ans Zentrum übertragen. Reicht regulärer Lagerplatz nicht aus, steht ein gekennzeichneter Bergungsbestand bereit, aus dem erneut disponiert wird. Aufträge und Reservierungen werden konsistent freigegeben. Der Sanierungszuschuss kann den Fehlbetrag und die vorab berechneten Kosten einer ausreichend leistungsfähigen Startflotte decken. Das Spiel erzwingt weder Neustart noch Verlust einer Sendung.

## 4. Darstellung und Bedienung

Eine flache, schematische 2D-Karte zeigt Zustellgebiete als klar abgegrenzte Flächen, Depots als Symbole und Verbindungen als Linien. Sendungsarten erhalten eigene Silhouetten, Namen und unterstützende Farben; Dringlichkeit ist eine zusätzliche Kennzeichnung. Gebietsnamen und Zustände bleiben ohne Farberkennung verständlich.

Die Bedienung umfasst eine Betriebsübersicht, Gebiet- und Depotdetails, Flottenverwaltung, Tourenoptimierung, Problemdiagnose, Sanierung und Spielstände. Ein Problem führt zum betroffenen Gebiet oder Depot und benennt eine konkrete Ursache, etwa „kein Lkw für Speditionsware“, „Ladeplatz ausgelastet“ oder „Vorlage bindet alle geeigneten Fahrzeuge“.

Pause sowie 1×, 2× und 4× betreffen ausschließlich die Simulation. Auswahl, Inspektion und Planung bleiben in Pause möglich. Kartenverschiebung und Zoom sind vorgesehen, Rotation nicht. Alle wesentlichen Aktionen sind auch über beschriftete HTML-Steuerelemente erreichbar; die Karte ist nicht der einzige Zugang. Tastaturfokus, Dialogrückkehr und reduzierte Bewegung werden berücksichtigt. Das konkrete visuelle Layout wird separat mit dem Nutzer abgestimmt; dieser Entwurf legt noch kein fertiges Bildschirmdesign fest.

## 5. Browserarchitektur und Spielstände

- Die Anwendung wird als statische Dateien ausgeliefert. Kein Backend, Konto, Multiplayer, Telemetriedienst oder serverseitiger Spielstand. Statisches Hosting und ein lokaler Entwicklungsserver sind keine Spielserver. Start über `file://` und installierbare PWA sind keine Anforderungen der ersten Fassung.
- Der TypeScript-Core besitzt Spielzustand, deterministischen Zufallszustand, Sendungsgruppen, Reservierungen, Touren, Finanzen und Bewertungen. Feste Simulationsschritte von 100 ms, stabile Verarbeitungsreihenfolge und ganzzahlige Mengen und Geldwerte erlauben reproduzierbare Tests.
- Die Oberfläche sendet typisierte Befehle und liest Ansichten. Bestätigungen werden atomar geprüft; abgelehnte Änderungen erhalten den Zustand. Befehlswiederholungen dürfen keine zusätzlichen Käufe, Zustellungen oder Einnahmen erzeugen.
- Der Browser taktet die Simulation unabhängig von der Darstellung. Ein verborgenes Dokument pausiert; beim Zurückkehren wird keine verstrichene Wandzeit nachgeholt. Manuelle Pause bleibt davon unabhängig. Bei Überlast wird das Spiel langsamer, statt unbeschränkt Schritte nachzuholen.
- Automatische und manuelle Spielstände werden getrennt in IndexedDB gespeichert. Ein versioniertes JSON-Format ermöglicht Import und Export. Der Stand enthält Seed, Tick, Zufallszustand, Sendungen samt Alter, aktive Fahrten, Reservierungen, Zuordnungen, Vorlagen, Bewertungsfenster, Finanzen und Fortschritt. Vorschauen und Animationen sind kein Teil des Spielstands.
- Schreibfehler lassen den letzten gültigen Stand und die laufende Partie bestehen. Die Oberfläche meldet fehlgeschlagene Speicherung und bietet Dateiexport an. Ungültige oder zu neue Importe ersetzen weder Partie noch Sicherung. Browserdaten können gelöscht werden; Export ist die unabhängige Sicherung.
- Ziel sind Desktop-Browser mit Maus und Tastatur. Chromium, Firefox und Safari werden praktisch geprüft; tatsächliche Versionen und Geräte werden dokumentiert. Modern Web Guidance wird vor Web-Implementierung gezielt abgefragt, mit `bunx --bun modern-web-guidance@latest`. Ohne eigens vereinbarte Browserpolitik gilt dessen Baseline- und Fallback-Regel. Mobile Optimierung ist ein späteres Paket.

## 6. Abnahme und Übergang

Die erste vollständige Partie muss vom Start über automatische Zustellung und manuelle Optimierung bis zu allen drei Ausbauzielen spielbar sein. Mindestens zwei unterschiedliche Seeds werden praktisch im Browser gespielt.

Fachliche Prüfungen:

- Alle fünf Arten werden mit geeigneten Fahrzeugen genau einmal zugestellt und vergütet. Ein Fahrrad erhält weder kleine Pakete noch Speditionsware.
- Express verdrängt bei knapper Kapazität weniger dringende Ladung nachvollziehbar; Werbung wird bei ausreichend verfügbarer Kapazität nicht dauerhaft vergessen.
- Direkte Zustellung und Depotumschlag erhalten Sendungsmenge, Alter und Frist. Volle Depots erzeugen diagnostizierbare Wartezustände.
- Eine manuelle Tourvorlage verändert Reihenfolge und Ergebnis messbar. Ihre Aufhebung stellt automatische Disposition wieder her; laufende Fahrten bleiben konsistent.
- Pause und Hintergrundpause stoppen Ankunft, Fahrt, Fristablauf, Kosten und Bewertungsfenster. Spieltempo verändert nicht das Ergebnis derselben Simulationszeit.
- Eine günstigere geeignete Flotte senkt Kosten; zu geringe Kapazität erzeugt Rückstand und schlechtere Zufriedenheit. Angezeigte Bewertungen erklären beide Effekte.
- Bei negativem Budget, überfälligen Sendungen und ungeeigneter Flotte ermöglicht wiederholbare Sanierung erneut korrekte Zustellungen, ohne Mengenverlust oder Zuschüsse als operative Erlöse zu zählen.
- Speichern und Laden während Fahrt, Umladen und manueller Vorgaben liefert bei denselben Folgeeingaben denselben Zustand wie ein ununterbrochener Lauf. Beschädigte Importe und Speicherfehler erhalten bestehende Daten.
- Bedienung bei 1280 × 720 und 1920 × 1080, Tastaturnavigation, Graustufen und reduzierter Bewegung wird im Browser geprüft. Leistungsprüfung: acht Gebiete, 100 Fahrzeuge und 10.000 offene Sendungen als Chargen; bei 1× kein wachsender Rückstand der Simulation und flüssige Bedienung. Gerät, Browser, Build und Messung müssen angegeben werden.

Die Umsetzung legt interne Datenstrukturen und numerische Balancingwerte innerhalb der beschriebenen Regeln fest.
