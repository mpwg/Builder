# Symbol-Logistik: erste vollständige Spielfassung

Status: Vom Nutzer am 14. November 2026 einschließlich der vorgeschlagenen Grenzen freigegeben. Noch keine Implementierung.

## 1. Spielidee und bestätigte Leitlinien

Ein Browser-Spiel über ein leistungsfähiges, sanierbares Logistiknetz in einer automatisch wachsenden Stadt. Der Spieler verbessert ein prozedural entstandenes Straßennetz, ergänzt frei gezeichnete Straßen und platziert Abbaubetriebe, Fabriken, Lager und Verteilpunkte. Lokale Lieferfahrzeuge sammeln und verteilen Waren. Verteilpunkte bündeln Ferntransporte zum Zentrallager. Alles liegt auf einer zusammenhängenden Karte.

Der Spielreiz liegt im Beobachten, Verstehen und Verbessern der Warenströme. Am Anfang funktionieren Standardregelungen. Mit steigenden Lieferanforderungen werden Fahrspuren, Ampelphasen und koordinierte Kreuzungen wichtig. Technische Störungen prüfen die Reserven. Es gibt weder Game-over noch eine wirtschaftliche Sackgasse: Auch ein vollständig festgefahrenes Netz muss wiederherstellbar bleiben.

Bestätigt sind:

- Abstrakte, deutlich unterscheidbare Symbole; pro Partie neue zufällige Rezepte einschließlich Alternativrezepten. Neue Rezepte kommen schrittweise hinzu.
- Steigende Lieferanforderungen, Liefermeilensteine und eine Auswahl zwischen mehreren Freischaltungen.
- Automatisch entstehende Stadtbebauung, aber selbst platzierte Fabriken und Logistikgebäude. Ausschließlich eigener Logistikverkehr.
- Unterschiedliche prozedurale Straßenstrukturen von regelmäßigen Rastern bis zu verwinkelten alten Vierteln; eigene Straßen können frei ergänzt werden.
- Detaillierte Straßenverkehrssteuerung einschließlich Ampelphasen, Spursteuerung, grüner Wellen und Kreisverkehren. Einfacher Ferntransport, zunächst ohne detaillierte Eisenbahnsimulation.
- Weitgehend automatische Versorgung mit manuellen Lieferanten-, Prioritäts- und Routenvorgaben.
- Ressourcenbasierte Baukosten, überwiegende Rückerstattung beim Abriss und jederzeit verfügbare Sanierungshilfe.

## 2. Betrachtete Ansätze und gewählte Richtung

**Verkehr zuerst:** Eine kleine Stadt mit einfachen Lieferaufträgen hätte allein Verkehrsverhalten und Eingriffe getestet. Vorteil: geringerer Umfang und schnelle Rückmeldung zu Kreuzungen; Nachteil: das Zusammenspiel mit zufälligen Rezepten, Wachstum und Freischaltungen bliebe ungeprüft.

**Kleiner vollständiger Kreislauf – vom Nutzer gewählt:** Eine räumlich kleine Welt verbindet Produktion, Verkehr, Ferntransport, Fortschritt und Rettung. Der Umfang wird durch wenige Inhalte begrenzt, nicht durch Weglassen eines Glieds des Spielkreislaufs. Dadurch lässt sich früh beurteilen, ob neue Rezepte tatsächlich interessante Netzumbauten auslösen.

Die Kartengrundlage ist das bereits gemeinsam gewählte zusammenhängende Netz mit lokaler Sammlung und überregionalem Transport. Getrennte lokale Karten und eine abstrakte Regionskarte wurden verworfen.

## 3. Grenzen und vorgeschlagene Standardentscheidungen

Die folgenden konkreten Grenzen wurden zunächst als Vorschläge des Entwurfs formuliert und mit der Gesamtfreigabe am 14. November 2026 bestätigt:

- Singleplayer im Desktop-Browser mit Maus und Tastatur. Keine Anmeldung, kein Backend und keine laufende Netzwerkabhängigkeit nach dem Laden. Mobile Bedienung und Multiplayer gehören nicht zur ersten Fassung.
- Eine anfängliche Zone, eine zusätzlich erschließbare Zone und ein Zentrallager. Ein Seed bestimmt Karte, Ressourcenvorkommen und den reproduzierbaren Vorrat an Freischaltungen. Ein neuer Seed erzeugt eine neue Partie; Laden würfelt nichts neu.
- Sechs Symboltypen insgesamt: zwei anfänglich erreichbare Grundressourcen, eine mögliche Grundressource der zweiten Zone und drei mögliche kombinierte Produkte. Welche Symbole diese Rollen haben, wechselt pro Partie.
- Fünf Liefermeilensteine. Nach den ersten vier wird jeweils eine von drei angebotenen Freischaltungen gewählt. Nach dem fünften erscheint ein unaufdringlicher Abschluss; die bestehende Welt kann anschließend frei weiterbetrieben und saniert werden, ohne neue Fortschrittsstufen.
- Lastwagen und eine einfache Zuggattung. Schiffe, komplexe Bahntechnik, mehrstöckige Verkehrsbauwerke, mehrspurige Kreisverkehre und weitere Katastrophen folgen später. Die erste Fassung enthält ausschließlich Ampeldefekte als Störung.
- Anfangs ungefähr sechs bis zehn Kreuzungen, später vier bis sechs weitere in der zweiten Zone. Diese Größen sind Balancing-Ausgangswerte und dürfen nach Spieltests angepasst werden.
- Verkehrsregeln stehen von Anfang an zur Verfügung. Die Freischaltungen betreffen Warenwirtschaft und Gebiete, nicht grundlegende Rettungswerkzeuge.
- Aus dem unabhängigen Entwurfscheck ergänzte Vorschläge: Rohstoffvorkommen sind unerschöpflich, lokale Direktlieferungen sind erlaubt und Bahnlinien transportieren bei Bedarf in beide Richtungen. Diese Regeln sichern langfristige Versorgung und freie Fabrikstandorte.

Anti-Ziele: bestrafende Zufallszerstörung, Pflichtklicken, manuelle Disposition einzelner Fahrten, lange unverständliche Rezeptketten und Fortschritt allein durch längeres Warten.

## 4. Vollständiger Spielkreislauf

### Einstieg und Zielerfüllung

Die erste Zone enthält zwei erreichbare Rohstoffvorkommen, ein bestehendes Straßennetz und das Zentrallager. Vorkommen sind unerschöpflich, aber ihre Abbaubetriebe liefern nur mit begrenzter Rate. Der Spieler erhält Baumaterial für eine funktionierende Anfangskette samt Fahrzeugen. Er setzt Abbaubetriebe auf die Vorkommen, verbindet eine Fabrik und stellt das erste kombinierte Produkt her. Eine platzierte Fabrik erhält eines der bereits bekannten Rezepte.

Das Zentrallager hat einen getrennten Bestand für Bau und Weiterverarbeitung sowie eine Zielabgabe. Nur die ausdrücklich für das aktuelle Lieferziel abgegebenen Waren werden verbraucht und als Fortschritt gezählt. Reservierte Zutaten und Baumaterial werden nicht automatisch abgegeben. Die Bedienung bietet sinnvolle automatische Mindestreserven, die der Spieler verändern kann.

Ein Meilenstein verlangt eine sichtbare kumulierte Liefermenge und eine angegebene durchschnittliche Lieferrate über die letzten 60 Simulationssekunden. Diese Kombination belohnt eine laufende Versorgung. Die Menge geht bei Unterbrechungen nicht verloren; die Rate darf sich wieder erholen. Es gibt keine Frist, Strafzahlung oder anwachsende Lieferschuld. Pausen zählen nicht als verstrichene Simulationszeit. Lager können Ausfälle überbrücken; ihre Nutzung ist ausdrücklich erlaubt.

Nach Erfüllung hält der Fortschritt zur Auswahl an. Erst die gewählte Karte bestimmt das nächste Ziel und gegebenenfalls den Kartenzuwachs. Während einer Überlastung steigt die Nachfrage nicht zusätzlich. Konkrete Mengen, Raten und Herstellungszeiten werden als Balancingdaten festgelegt; sie müssen innerhalb der verfügbaren Kapazitäten erreichbar sein.

### Freischaltungen und zufällige Rezepte

Jede Auswahl enthält drei noch nicht bekannte, nutzbare Angebote. Der Angebotspool besteht aus einem neuen Produkt samt erstem Rezept, einem Alternativrezept für ein bekanntes Produkt oder der zweiten Zone samt Rohstoff und einem sofort nutzbaren Rezept. Es können mehrere unterschiedliche Alternativrezepte angeboten werden. Die zweite Zone bleibt später erneut anbietbar, falls sie zunächst nicht gewählt wird. Sie ist nicht zwingend nötig, um die fünf Meilensteine abzuschließen; ein Spieltest muss sie gezielt wählen, um den vollständigen Ferntransportpfad abzunehmen.

Abgelehnte Angebote sind nicht dauerhaft verloren. Ein neues Ziel darf nur Produkte verlangen, die nach der getroffenen Wahl herstellbar sind. Bei einer Gebietswahl gehören die nötigen Transportmöglichkeiten bereits zum Bauangebot. Wählt der Spieler ein Alternativrezept, steigt die Aufgabe für ein bereits bekanntes Produkt, statt eine nicht gewählte Produktionskette vorauszusetzen.

Rezepte haben höchstens zwei verschiedene Zutatenarten, kleine ganzzahlige Mengen und ein Ausgabesymbol. Die Rezeptabhängigkeiten sind azyklisch und führen zu erreichbaren Grundressourcen zurück. Alternativen dürfen die Erreichbarkeit nicht beschädigen. Der Generator muss für alle vier Auswahlrunden genügend gültige Angebote bereithalten; bei ungültigen Kandidaten erzeugt er weitere und fällt nach begrenzten Versuchen auf geprüfte, seedabhängig permutierte Muster zurück.

Alternative Rezepte unterscheiden sich in Zutaten, Mengen, Ausbeute oder Herstellungszeit. Sie sollen unterschiedliche Standorte und Warenströme begünstigen. Eine durchgehend schlechtere Kopie desselben Rezepts ist kein gültiges Angebot. Die Ortsabhängigkeit lässt sich erst anhand der konkreten Karte bewerten; die Vorschau zeigt deshalb Quellen und benötigte Zutaten.

Eine Freischaltung ergänzt bekannte Rezepte, ersetzt sie aber nicht. Bestehende Fabriken behalten ihre Einstellung. Eine noch nicht entdeckte Rezeptwelt bleibt verborgen; die drei angebotenen Freischaltungen zeigen ihre vollständigen unmittelbaren Auswirkungen vor der Wahl.

### Lokale Sammlung und Ferntransport

Lokale Verteilpunkte besitzen Lager, Ladeplätze und Fahrzeugdepots. Fabriken haben begrenzte Eingangs- und Ausgangslager sowie einen Ladeanschluss. Spieler wählen Flottengrößen und können Fahrzeuge hinzufügen oder stilllegen; das System führt einzelne Aufträge selbstständig aus. Waren erscheinen nicht durch das Setzen eines Gebäudes.

Die Depotzuordnung legt Zuständigkeit und Fahrzeugbestand fest, erzwingt aber keinen Lagerumweg: Innerhalb eines verbundenen Straßennetzes dürfen Lastwagen direkt zwischen Quellen, Fabriken und Lagern liefern. Die Bahn erfordert dagegen einen echten Umschlag in den beiden Terminals. Das Zentrallager enthält für die Anfangszone selbst einen lokalen Verteilpunkt samt Depot; ein zusätzlicher Verteilpunkt ist zum Start nicht erforderlich.

Die zweite Zone wird lokal durch Lastwagen versorgt. Ein dortiger Verteilpunkt kann mit einem integrierten Güterterminal ausgestattet werden. Eine selbst gezeichnete Bahnverbindung führt zu einem Terminal am Zentrallager. Die Linie bekommt Züge sowie eine Warenfreigabe je Richtung zugewiesen. Sie kann sowohl Waren zur Zentrale als auch Zutaten für Fabriken in der zweiten Zone transportieren. Die Automatik zerlegt solche Lieferungen in lokale Vorfahrt, Bahntransport und lokale Weiterlieferung, reserviert die nötigen Mengen und berücksichtigt die verfügbare Verbindung bei der Lieferantenauswahl. Abfahrt erfolgt bei voller Ladung oder nach einer einstellbaren maximalen Wartezeit, sofern Ware geladen ist; leere Rückfahrten sind zulässig. Ladegeschwindigkeit, Lagergröße, Zugkapazität und Umlaufzeit begrenzen die Leistung.

Es gibt keine Bahnsignale, Weichen- oder Blockplanung. Bahnstrecken sind direkte Linien zwischen zwei Terminals; kreuzende Straßen und Bahnlinien werden als höhengetrennt behandelt. Züge blockieren einander auf der Strecke in dieser Fassung nicht; Terminalkapazität und Ladeplätze werden dagegen berücksichtigt. Eine Straßenverbindung zwischen den Zonen bleibt als mögliche Alternative erlaubt, aber nicht automatisch vorhanden.

### Automatische und manuelle Disposition

Der Spieler kann Gebäude einem lokalen Verteilpunkt zuordnen; ohne Vorgabe geschieht dies automatisch nach Erreichbarkeit und erwarteter Transportzeit. Bedarfsmeldungen führen zu reservierten Transportaufträgen. Bestände, Lagerplatz und transportierte Mengen dürfen dadurch nicht mehrfach vergeben werden. Bei erfülltem Bedarf entstehen keine weiteren Leeraufträge.

Quellen und Routen werden anhand von Verfügbarkeit, erwarteter Fahrzeit, Wartezeit und gesetzten Prioritäten gewählt. Routen bleiben während einer Fahrt grundsätzlich stabil. Erneute Planung erfolgt bei Unpassierbarkeit oder erheblicher anhaltender Verzögerung, nicht bei jedem kleinen Unterschied.

Für Lieferanten und Routen unterscheidet die Oberfläche zwischen bevorzugt und verbindlich. Bevorzugte Vorgaben erlauben Ausweichlösungen; verbindliche Vorgaben werden nie stillschweigend übergangen. Bei nicht erfüllbaren Vorgaben nennt das Gebäude den Grund und bietet deren Bearbeitung an. Lieferprioritäten gelten bei knappen Beständen und Fahrzeugen; sie erlauben keine Missachtung von Vorfahrt und Ampeln.

## 5. Straßen, Stadt und Verkehr

### Karte und Bebauung

Die Karte entsteht aus Gelände, festen Rohstoffvorkommen und Vierteln mit zusammenhängenden Wachstumsmustern. Seeds können Raster, unregelmäßige Straßen oder Mischungen erzeugen. Die Generatorprüfung stellt sicher, dass Startquellen, Bauflächen und Ziel erreichbar sind und zulässige Anschlüsse besitzen. Zufall darf schwierige, aber keine geometrisch unbrauchbaren Startnetze erzeugen.

Der Spieler zeichnet Straßen frei mit Unterstützung durch Einrasten an vorhandenen Straßen und Knoten. Neue ebenerdige Kreuzungen werden echte Verkehrsknoten. Ungültig enge Winkel, zu kurze Spuren und nicht befahrbare Anschlüsse werden vor der Bauausführung angezeigt. Gebäudezugänge müssen an eine befahrbare Straße anschließen.

Stadtbebauung entsteht automatisch entlang freigegebener Straßen. Sie dient als sichtbarer Ausdruck der aggregierten Nachfrage und erzeugt keine einzelnen Haustürlieferungen oder privaten Fahrzeuge. Flächen können reserviert und Straßen von weiterer Bebauung ausgenommen werden. Automatische Häuser dürfen bei Umbauten weichen, ohne eine zusätzliche Strafwirtschaft auszulösen. Fabriken, Logistikgebäude, Reservierungen und eingestellte Verkehrsregeln werden durch automatisches Wachstum nicht überschrieben.

### Verkehrssteuerung der ersten Fassung

Enthalten sind Einbahnstraßen, ein oder zwei Fahrspuren je Richtung, gezielte Abbiegespuren und Abbiegeverbote, Vorfahrt, Stoppschilder, Geschwindigkeitsvorgaben und einspurige Kreisverkehre. Vorhandene Spuren können kostenlos anders zugeordnet werden; zusätzliche physische Fahrbahnbreite kostet Material und Platz.

Ampeln haben eine brauchbare automatische Standardschaltung. Manuell lassen sich erlaubte Fahrbeziehungen, Phasenfolge, Grünzeiten und ein zeitlicher Versatz einstellen. Konfliktierende Freigaben werden verhindert, notwendige Räumzeiten sind automatisch abgesichert. Benachbarte Ampeln lassen sich mit gemeinsamer Umlaufzeit und individuellen Versätzen koordinieren; eine zeitliche Vorschau unterstützt die Planung grüner Wellen. Die erste Fassung verzichtet auf Skriptprogrammierung, freie Sensorlogik und adaptive Verkehrssteuerung.

Fahrzeuge beachten Spuren, erlaubte Abbiegevorgänge und Reservierungen im Knoten. Sie halten Abstand, wechseln rechtzeitig und nachvollziehbar die Spur und fahren nicht in einen Knoten ein, wenn der erforderliche Ausgangsraum fehlt. Kreuzende Fahrzeuge dürfen weder kollidieren noch durch einander fahren. Auch mit dieser Regel können volle Straßenzüge und zyklische Abhängigkeiten einen Gridlock bilden; dessen Behandlung ist Teil des Spiels.

Depots besitzen eigene Warteflächen. Volle Ladeplätze erzeugen zunächst Warteschlangen dort; überfüllte Zufahrten können anschließend den Straßenverkehr beeinträchtigen. Rückstau muss tatsächlich aus begrenztem Platz und Kapazität entstehen, nicht aus künstlichen Zufallsstopps.

## 6. Störungen, Kosten und garantierte Sanierung

Bauten und Fahrzeuge kosten die zwei anfänglichen Grundressourcen aus dem Zentrallager. Eine Ressourcenlieferung zur Baustelle ist nicht nötig. Baumaterialkosten hängen nicht von späteren Freischaltungen ab. Es gibt keine laufenden Schulden oder negativen Lagerbestände.

Vorgeschlagener Abrisswert: 90 Prozent der tatsächlich eingesetzten Materialien. Bruchteile bleiben intern erhalten, damit wiederholte kleine Abrisse die Regel nicht durch Rundung verändern. Reine Regeländerungen sind kostenlos. Ein pausierter Bauplan verrechnet Rückgewinnung und Neubau gemeinsam und zeigt die verbleibenden Kosten vor der Anwendung. Fabriken verlieren bei Umbauten weder gelagerte noch bereits transportierte Ware.

Die Sanierungshilfe ist jederzeit freiwillig erreichbar. Sie kann fehlende Baumaterialien für den angezeigten Bauplan zweckgebunden bereitstellen. Es entstehen keine Schulden, Lieferpunkte oder als Produktion gezählte Waren. Die Hilfe verhindert auch bei leerem Lager den Stillstand. Es ist kein kompliziertes System zur Verhinderung absichtlicher Übernutzung vorgesehen; Experimentieren hat Vorrang vor strengem Ressourcenwettbewerb.

Festgefahrene Lastwagen können einzeln oder gebietsweise in ihr Depot zurückgeholt werden. Ladung wird dort eingelagert; falls der normale Platz fehlt, bleibt sie in einem klar gekennzeichneten Bergungsbestand verfügbar. Ein entferntes Depot verwendet das Zentrallager als Rückfallort. Das Zurückholen löst Reservierungen und stellt Transporte neu zur Disposition. Straßen mit Fahrzeugen dürfen nur über einen angekündigten, verlustfreien Räumvorgang abgerissen werden. Entsprechende Erhaltung gilt für Zugladungen und abgerissene Terminals.

Ampeldefekte treten erst nach dem ersten Meilenstein und höchstens einzeln auf. Sie sind sichtbar, zeitlich begrenzt und schalten den betroffenen Knoten auf eine sichere, langsamere Vorfahrtsregel um. Keine kollidierenden Freigaben und keine zerstörten Anlagen. Ein erster Defekt wird erklärt; weitere treten mit ausreichend Abstand auf. Während Pause, Freischaltungswahl und Sanierungsmodus läuft kein Störungstimer weiter. Spieler können Störungen für den Spielstand deaktivieren und später wieder einschalten.

## 7. Visuelle Richtung, Lesbarkeit und Bedienung

Die [UX-Spezifikation](2026-11-14-symbol-logistik-ux-flow.md) beschreibt die Bildschirmzustände, Bedienabläufe und Fehlerpfade vom Einstieg bis zum freien Betrieb.

### Modellbahn-Miniaturstadt

Die vom Nutzer gewählte [Modellbahn-Variante](../../visual-concepts/miniaturstadt-modellbahn.png) gibt die visuelle Richtung vor. Die Spielkarte wirkt wie eine handgebaute Modellbahnanlage aus schräger Vogelperspektive. Helle Putzfassaden, Terrakottadächer, sattes Grün und ein türkisfarbener Fluss prägen die Stadt. Kurze, weiche Schatten machen die Miniaturen räumlich. Feinere Details sitzen vor allem an Fassaden, Ufern und Gleisen.

Lager sind an ihren Laderampen zu erkennen, Fabriken an ihrer markanten Dachform und Abbaustellen am offenen Gelände. Fahrbahnmarkierungen, Kreuzungen und Frachtsymbole heben sich auch zwischen dicht stehenden Gebäuden klar ab. Die Karte nimmt den größten Teil der Ansicht ein. Lieferziel und Zeitsteuerung stehen oben, die Bauwerkzeuge unten. Details zur ausgewählten Kreuzung erscheinen seitlich.

Das Referenzbild zeigt eine beispielhafte Partie. Kartenausschnitt, Gebäudeanordnung, Rezept und angezeigte Werte hängen vom jeweiligen Spielstand ab.

### Lesbarkeit und Bedienung

Die sechs Symbole sind Kreis, Dreieck, Quadrat, Herz, Stern und Halbmond. Jedes behält über Partien hinweg seine Silhouette und unterstützende Farbe; wirtschaftliche Rolle und Rezepte wechseln. Die Darstellung wird als konsistente Vektorgrafik ausgeführt, nicht als plattformabhängige Emoji. Form bleibt das primäre Unterscheidungsmerkmal. Es gibt keine nur gedrehten oder allein farblich unterschiedenen Ressourcenvarianten.

Gebäude zeigen Zutaten, Ergebnis und Betriebszustand. Die Rezeptübersicht stellt bekannte Alternativen nebeneinander. Auswahl eines Symbols hebt Quellen, Verbraucher und relevante Transportwege hervor. Ansichten für Verkehrsbelastung, Warteschlangen und Lieferprobleme ergänzen die normale Karte; nicht alle Informationen sind dauerhaft gleichzeitig sichtbar.

Jede wartende Fabrik oder Lieferung erklärt ihren wesentlichen Hinderungsgrund: fehlende Zutat, reservierter Bestand, volles Ziel, fehlendes Fahrzeug, keine Verbindung, feste Lieferantenvorgabe oder blockierte Strecke. Ein Klick führt zum betroffenen Ort. Bei ausgezoomter Karte werden Informationen zusammengefasst; die Simulation und ihre Mengen bleiben unverändert.

Pause und einfache Zeitbeschleunigung sind jederzeit verfügbar. Freischaltungswahl und Bauplanung pausieren standardmäßig. Ein lokaler Spielstand wird automatisch und manuell gespeichert. Export und Import eines Spielstands ermöglichen Sicherung und Weitergabe; Seed, entdeckte Rezepte, Angebote, Bestände, Fahrzeuge, Aufträge und Fortschritt müssen erhalten bleiben. Browserdaten können verloren gehen; die Oberfläche macht die lokale Speicherung und Exportmöglichkeit verständlich.

## 8. Abnahme der ersten Fassung

Abschluss bedeutet ein tatsächlich spielbarer Kreislauf, nicht nur vorhandene Menüs oder Einzelkomponenten.

1. **Durchspielen:** Mindestens je eine Raster- und eine unregelmäßige Karte mit verschiedenen Seeds vom Start bis zum fünften Meilenstein spielen. Einen Durchlauf mit Wahl der zweiten Zone und funktionierender Bahnversorgung abnehmen. Nach dem letzten Meilenstein bleibt die Welt spielbar.
2. **Generator:** Automatisiert mindestens 100 Seeds einschließlich unterschiedlicher Freischaltungsfolgen prüfen: gültige Startversorgung, keine zyklisch gesperrten Rezepte, drei gültige Angebote in jeder Auswahlrunde und erreichbare Lieferziele. Gleicher Seed und gleiche Entscheidungen erzeugen gleiche Inhalte.
3. **Verkehr:** Eine Standardkreuzung läuft bei geringer Last. Eine absichtlich überlastete Situation lässt sich durch Abbiegespur und Phasenanpassung verbessern. Zwei koordinierte Ampeln zeigen unter passenden Bedingungen einen messbaren Vorteil gegenüber ungünstigem Versatz. Kreisverkehr, Stoppschild, Einbahn und Routensperre werden praktisch befahren.
4. **Logistik:** Automatische Lieferungen funktionieren ohne Einzelaufträge, auch als lokale Direktlieferung ohne Lagerumweg. Bevorzugte Lieferanten erlauben Ersatz; feste Vorgaben werden respektiert und ihre Blockaden erklärt. Ein voller Verteilpunkt erzeugt nachvollziehbare Rückwirkung. Eine Fabrik in der zweiten Zone erhält Zutaten aus der ersten Zone per Bahn und liefert ihr Produkt zurück. Zugtransport erhält alle Warenmengen über Laden, Fahren und Entladen hinweg.
5. **Sanierung:** Einen vollständigen Gridlock mit leeren Baustofflagern herstellen. Mit Pause, Fahrzeugbergung, Rückbau und Sanierungshilfe wieder eine funktionierende Lieferkette erreichen. Kein Warenverlust, keine dauerhaften Reservierungen und kein Neustart erforderlich.
6. **Störung:** Einen Ampelausfall beobachten, dessen Auswirkung erklären und das Netz während oder nach dem Ausfall stabilisieren. Ausschalten von Störungen und Pausieren verändern keine Warenbestände.
7. **Speichern:** Während einer Fahrt, einer Freischaltungswahl und eines Ampeldefekts speichern und laden. Bestände, offene Aufträge, Entscheidungen und Zeitverlauf bleiben konsistent. Export und Import praktisch prüfen.
8. **Darstellung und Leistung:** Symbole bei üblichen Zoomstufen auch in Graustufen unterscheiden, lesbare Texte und Bedienbarkeit prüfen. Einen repräsentativen Spielstand mit ungefähr 100 Lastwagen und zwei Zügen im tatsächlich verfügbaren Desktop-Browser messen. Ziel: flüssige Bedienung, keine zunehmenden Simulationsrückstände und in der Regel mindestens 30 Bilder pro Sekunde auf dem dokumentierten Testgerät. Browser- oder Geräteabdeckung nur nach tatsächlicher Prüfung behaupten.

## 9. Was der Umsetzung überlassen bleibt

Framework, Renderingtechnik, Pfadfindungsverfahren, Simulationsschritt, Datenstrukturen und interne Schnittstellen werden im nachfolgenden Implementierungsplan festgelegt. Dieser Entwurf legt das Verhalten fest, nicht eine ungeprüfte Bibliothekswahl. Balancingwerte für Baukosten, Kapazitäten, Geschwindigkeiten und Meilensteinmengen werden als leicht veränderbare Daten angelegt und anhand der oben beschriebenen Spieltests abgestimmt.

Die Freigabe dieses Dokuments autorisiert noch keine Veröffentlichung. Vor Produktcode folgt nach Freigabe ein Implementierungsplan. Aktuell ist das Arbeitsverzeichnis leer und kein Git-Repository; deshalb wird dieser Entwurf als lokale Datei abgelegt und noch nicht committed.
