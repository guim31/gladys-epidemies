# Seasonal epidemics (Sentinelles)

Acute respiratory infections, acute diarrhoea (gastroenteritis) and chickenpox in your French region, as the
**Sentinelles network** (Inserm, Sorbonne Université) measures them every week with general practitioners: one
device per region, with the weekly rate of each disease and its trend. Scene triggers, a scene action and a dashboard
widget come with it.

> **Epidemiological information, not medical advice.** These are estimates for a whole region, with wide confidence
> intervals. For your health, ask your doctor.

Not affiliated with the Sentinelles network.

## What you get

- **One device per area** you choose: the 13 regions of metropolitan France, and metropolitan France as a whole.
- For each disease, the **rate of the latest week** (cases seen by general practitioners, per 100,000 inhabitants)
  and its **trend** against the week before (rising, stable, falling).
- The **week of the data** ("43 (19 – 25 Oct 2026)").
- Two **scene triggers** (a rate rises above or falls below a threshold), a **scene action** (the week in one
  sentence) and a **dashboard widget**.

## Requirements

- Gladys Assistant 5.3.0 or later.
- Internet access from Gladys. No account and no key.
- Metropolitan France only: the network does not cover the overseas regions.

## Configuration

### Settings

| Setting                       | Default | What it does                                                            |
| ----------------------------- | ------- | ----------------------------------------------------------------------- |
| Areas                         | none    | The regions to follow (and metropolitan France), one device each.       |
| Language of the feature names | French  | Names of new devices and features, language of their texts and summary. |

Save, then open the **Discover** tab of the integration and create the devices you want.

## Devices

| Feature                         | Type   | Value                                              |
| ------------------------------- | ------ | -------------------------------------------------- |
| Respiratory infections /100,000 | number | Acute respiratory infections (flu, COVID-19, RSV…) |
| Respiratory infections, trend   | text   | rising, stable or falling                          |
| Acute diarrhoea /100,000        | number | Acute diarrhoea (gastroenteritis)                  |
| Acute diarrhoea, trend          | text   | rising, stable or falling                          |
| Chickenpox /100,000             | number | Chickenpox                                         |
| Chickenpox, trend               | text   | rising, stable or falling                          |
| Week of the data                | text   | ISO week number and its days                       |

The **trend** is "rising" or "falling" when the rate moved by 15 % or more of the week before **and** by 5 per 100,000
or more; "stable" otherwise. The rates are numbers, so a scene condition such as "respiratory infections ≥ 200" works.

## Dashboard widget

**Seasonal epidemics**: the area chosen (else the first one followed), with one line per disease giving its rate and
trend, coloured orange when rising and green when falling, and a caption with the week and the source. One setting
chooses the diseases shown, another hides the caption.

## Scene triggers

- **Epidemic rate rises above a threshold**: when a new week is published, the rate of a disease in an area crosses
  the chosen threshold (25 to 1,000 per 100,000) upwards. Filters: area, disease, threshold.
- **Epidemic rate falls below a threshold**: the same, downwards: the wave is over in your area.

Variables: area, disease, rate, previous rate, week. The first week read after the installation only sets the
reference: it fires nothing. The previous rate is the one the device showed: a revision of past weeks by Sentinelles
never fires a crossing twice.

## Scene action

**Epidemics: get the week in one sentence**: returns, for an area (empty: the first one followed), a sentence ready
for a notification, such as "Occitanie, semaine 43 (cas pour 100 000 habitants) : Infections respiratoires 196 (en
hausse), Diarrhée aiguë 58 (en hausse), Varicelle 4 (stable).", in the language of the configuration, with the week
number and each rate as separate outputs.

## Scene examples

- Every Thursday at 8 am, send the sentence of your region to the family group.
- When acute diarrhoea rises above 200 in your region, remind everyone to wash their hands.
- When respiratory infections fall back below 100, say the winter wave is over.

## Data sources, licence and quotas

- Source: **réseau Sentinelles, INSERM, Sorbonne Université**, [www.sentiweb.fr](https://www.sentiweb.fr), public
  Sentiweb API, read without an account. The data are estimates from the network's general practitioners (and,
  for the regions, wide confidence intervals).
- Updated once a week, usually on Wednesday afternoon. The API allows 15 requests per 10 minutes and asks its users
  to download only what changed: the integration asks for the version of the data once an hour, and downloads the
  datasets (3 per level, regions or France) only when it changed. After a "too many requests" answer it waits for
  the time the API announces, restarts included.
- Influenza-like illness, the historical flu indicator, is no longer under surveillance: flu is counted in the
  acute respiratory infections.

## Troubleshooting

- **No value after creating the device**: wait a few seconds for the first download; check that Gladys has internet
  access.
- The connection status says the Sentinelles data cannot be read: the API is unreachable; the last values are kept
  and the integration tries again every hour.
- The connection status says the API asks to wait: its request limit was reached (perhaps by another device of your
  network). The integration waits and tries again on its own.

## Limits

- Developed and tested against the real API, not inside a running Gladys yet: feedback welcome.
- The regional rates are estimates with wide confidence intervals: a small change is not significant, hence the
  margin of the trend.
- No official "epidemic level": Sentinelles publishes rates, and Santé publique France publishes no open regional
  epidemic level that an integration could read. The thresholds of the triggers are yours to choose.
