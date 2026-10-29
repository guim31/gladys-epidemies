# Saisonale Epidemien (Sentinelles)

Akute Atemwegsinfekte, akuter Durchfall (Magen-Darm-Infekt) und Windpocken in deiner französischen Region, wie das
**Sentinelles-Netz** (Inserm, Sorbonne Université) sie jede Woche mit Hausärzten misst: ein Gerät pro Region, mit der
wöchentlichen Rate jeder Krankheit und ihrer Tendenz. Dazu Szenen-Auslöser, eine Szenen-Aktion und ein
Dashboard-Widget.

> **Epidemiologische Information, keine ärztliche Beratung.** Es sind Schätzungen für eine ganze Region, mit weiten
> Konfidenzintervallen. Für deine Gesundheit frag deinen Arzt.

Nicht mit dem Sentinelles-Netz verbunden.

## Was du bekommst

- **Ein Gerät pro Gebiet**, das du wählst: die 13 Regionen Festland-Frankreichs und Frankreich (Festland) als Ganzes.
- Für jede Krankheit die **Rate der letzten Woche** (von Hausärzten gesehene Fälle pro 100.000 Einwohner) und ihre
  **Tendenz** gegenüber der Vorwoche (steigend, stabil, sinkend).
- Die **Datenwoche** („43 (19. – 25. Okt. 2026)“).
- Zwei **Szenen-Auslöser** (eine Rate übersteigt oder unterschreitet eine Schwelle), eine **Szenen-Aktion** (die
  Woche in einem Satz) und ein **Dashboard-Widget**.

## Voraussetzungen

- Gladys Assistant 5.3.0 oder neuer.
- Internetzugang von Gladys aus. Weder Konto noch Schlüssel.
- Nur Festland-Frankreich: Das Netz deckt die Überseeregionen nicht ab.

## Konfiguration

### Einstellungen

| Einstellung                | Standard    | Wirkung                                                                         |
| -------------------------- | ----------- | ------------------------------------------------------------------------------- |
| Gebiete                    | keine       | Die zu verfolgenden Regionen (und Frankreich), je ein Gerät.                    |
| Sprache der Funktionsnamen | Französisch | Namen neuer Geräte und Funktionen, Sprache ihrer Texte und der Zusammenfassung. |

Speichere, öffne dann den Tab **Entdecken** der Integration und lege die gewünschten Geräte an.

## Geräte

| Funktion                        | Typ  | Wert                                           |
| ------------------------------- | ---- | ---------------------------------------------- |
| Atemwegsinfekte /100.000 Einw.  | Zahl | Akute Atemwegsinfekte (Grippe, COVID-19, RSV…) |
| Atemwegsinfekte, Tendenz        | Text | steigend, stabil oder sinkend                  |
| Akuter Durchfall /100.000 Einw. | Zahl | Akuter Durchfall (Magen-Darm-Infekt)           |
| Akuter Durchfall, Tendenz       | Text | steigend, stabil oder sinkend                  |
| Windpocken /100.000 Einw.       | Zahl | Windpocken                                     |
| Windpocken, Tendenz             | Text | steigend, stabil oder sinkend                  |
| Datenwoche                      | Text | ISO-Wochennummer und ihre Tage                 |

Die **Tendenz** ist „steigend“ oder „sinkend“, wenn sich die Rate um 15 % oder mehr der Vorwoche **und** um 5 pro
100.000 oder mehr bewegt hat; sonst „stabil“. Die Raten sind Zahlen: Eine Szenen-Bedingung wie „Atemwegsinfekte ≥
200“ funktioniert.

## Dashboard-Widget

**Saisonale Epidemien**: das gewählte Gebiet (sonst das erste verfolgte), mit einer Zeile pro Krankheit mit Rate und
Tendenz, orange bei steigender und grün bei sinkender Tendenz, und eine Legende mit Woche und Quelle. Eine
Einstellung wählt die angezeigten Krankheiten, eine andere blendet die Legende aus.

## Szenen-Auslöser

- **Epidemische Rate übersteigt eine Schwelle**: Wenn eine neue Woche erscheint, überschreitet die Rate einer
  Krankheit in einem Gebiet die gewählte Schwelle (25 bis 1.000 pro 100.000) nach oben. Filter: Gebiet, Krankheit,
  Schwelle.
- **Epidemische Rate fällt unter eine Schwelle**: dasselbe nach unten: Die Welle ist bei dir vorbei.

Variablen: Gebiet, Krankheit, Rate, vorherige Rate, Woche. Die erste nach der Installation gelesene Woche setzt nur
die Referenz und löst nichts aus. Die vorherige Rate ist die, die das Gerät zeigte: Eine Korrektur vergangener Wochen
durch Sentinelles löst eine Überschreitung nie zweimal aus.

## Szenen-Aktion

**Epidemien: die Woche in einem Satz abrufen**: liefert für ein Gebiet (leer: das erste verfolgte) einen fertigen
Satz für eine Benachrichtigung, etwa „Okzitanien, Woche 43 (Fälle pro 100.000 Einwohner): Atemwegsinfekte 196
(steigend), Akuter Durchfall 58 (steigend), Windpocken 4 (stabil).“, in der Sprache der Konfiguration, mit der
Wochennummer und jeder Rate als eigenen Ausgaben.

## Szenen-Beispiele

- Jeden Donnerstag um 8 Uhr den Satz deiner Region an die Familiengruppe schicken.
- Wenn akuter Durchfall in deiner Region 200 übersteigt, alle ans Händewaschen erinnern.
- Wenn die Atemwegsinfekte wieder unter 100 fallen, das Ende der Winterwelle melden.

## Datenquellen, Lizenz und Kontingente

- Quelle: **réseau Sentinelles, INSERM, Sorbonne Université**, [www.sentiweb.fr](https://www.sentiweb.fr), öffentliche
  Sentiweb-API, ohne Konto gelesen. Es sind Schätzungen aus den Hausärzten des Netzes (für die Regionen mit weiten
  Konfidenzintervallen).
- Einmal pro Woche aktualisiert, meist am Mittwochnachmittag. Die API erlaubt 15 Anfragen pro 10 Minuten und bittet
  darum, nur Geändertes herunterzuladen: Die Integration fragt einmal pro Stunde nach der Datenversion und lädt die
  Datensätze (3 pro Ebene, Regionen oder Frankreich) nur bei einer Änderung. Nach einer Antwort „zu viele Anfragen“
  wartet sie die von der API genannte Zeit ab, auch über Neustarts hinweg.
- Grippale Infekte, der historische Grippe-Indikator, werden nicht mehr überwacht: Die Grippe zählt zu den akuten
  Atemwegsinfekten.

## Fehlerbehebung

- **Kein Wert nach dem Anlegen des Geräts**: Warte ein paar Sekunden auf den ersten Download; prüfe, ob Gladys
  Internetzugang hat.
- Der Verbindungsstatus meldet, dass die Sentinelles-Daten nicht lesbar sind: Die API ist nicht erreichbar; die
  letzten Werte bleiben erhalten und die Integration versucht es jede Stunde erneut.
- Der Verbindungsstatus meldet, dass die API um Geduld bittet: Das Anfragelimit der API ist erreicht (vielleicht durch ein
  anderes Gerät in deinem Netz). Die Integration wartet und versucht es von selbst erneut.

## Grenzen

- Gegen die echte API entwickelt und getestet, noch nicht in einem laufenden Gladys: Rückmeldungen willkommen.
- Die regionalen Raten sind Schätzungen mit weiten Konfidenzintervallen: Eine kleine Änderung ist nicht
  aussagekräftig, daher die Spanne der Tendenz.
- Keine offizielle „Epidemiestufe“: Sentinelles veröffentlicht Raten, und Santé publique France veröffentlicht keine
  offene regionale Epidemiestufe, die eine Integration lesen könnte. Die Schwellen der Auslöser wählst du selbst.
