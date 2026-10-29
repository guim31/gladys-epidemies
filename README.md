# Seasonal epidemics (Sentinelles) for Gladys Assistant

An external integration for [Gladys Assistant](https://gladysassistant.com) that brings the weekly
rates of **acute respiratory infections, acute diarrhoea (gastroenteritis) and chickenpox** in
your French region into Gladys, as the **Sentinelles network** (Inserm, Sorbonne Université)
publishes them. Public data, no account, no key.

> **Epidemiological information, not medical advice.** Not affiliated with the Sentinelles
> network.

## What it does

- One device per area you choose (the 13 regions of metropolitan France, and metropolitan France
  as a whole), with the rate of each disease in the latest week (per 100,000 inhabitants), its
  trend against the week before, and the week of the data.
- Scene triggers: **Epidemic rate rises above a threshold** and **Epidemic rate falls below a
  threshold** (25 to 1,000 per 100,000, fired once when the new week is published).
- A scene action: **the week in one sentence**, ready for a notification.
- A dashboard widget: the diseases of an area with their rate and trend.

Full user documentation: [English](docs/en.md), [français](docs/fr.md), [Deutsch](docs/de.md),
[español](docs/es.md).

## Requirements

- Gladys Assistant 5.3.0 or later, with Internet access.
- Metropolitan France only: the Sentinelles network does not cover the overseas regions.

## Installation

In Gladys: **Integrations → Install from GitHub**, address of this repository:
`https://github.com/guim31/gladys-epidemies`. Choose your areas in the configuration, save, then
create the devices in the **Discover** tab.

## How it works

The data come from the public [Sentiweb API](https://www.sentiweb.fr/france/fr/?page=api) of the
Sentinelles network: indicators 25 (acute respiratory infections), 6 (acute diarrhoea) and 7
(chickenpox), regions (INSEE codes since 2016) and national level, last 10 weeks. The API allows
15 requests per 10 minutes and may block an IP that insists: the integration asks for the
version of the data once an hour, downloads the datasets only when it changed (7 requests at
most), keeps them under `/data`, and honours the pause the API announces after a 429, restarts
included.

## Limits

- **Developed without a running Gladys**: tested against the real API and the fake Gladys of the
  SDK. Feedback welcome.
- The regional rates are estimates with wide confidence intervals; the trend ignores the small
  moves (15 % and 5 per 100,000 at least).
- No official epidemic level: Sentinelles publishes rates, and Santé publique France publishes
  no open regional epidemic level. The thresholds of the triggers are chosen by the user.
- Influenza-like illness (indicator 3) is no longer under surveillance by the network: left out,
  flu being counted in the acute respiratory infections.

## Development

```bash
npm ci
npm run format:check && npm run lint && npm test
```

The tests run against the fake Gladys of the SDK and real answers of the API recorded under
`test/fixtures/sentiweb/` (29 October 2026, week 43); they never touch the network.

## Credits

- Data: réseau Sentinelles, INSERM, Sorbonne Université,
  [www.sentiweb.fr](https://www.sentiweb.fr). Some answers of the API are recorded in
  `test/fixtures/sentiweb/` as test data.
- Cover: a simple pictogram drawn for this integration (no logo of the network).
- Built on the official
  [Gladys integration template](https://github.com/GladysAssistant/integration-template-js) and
  [SDK](https://github.com/GladysAssistant/integration-sdk-js).

Not affiliated with, nor endorsed by, the Sentinelles network, Inserm or Sorbonne Université.

## License

[Apache-2.0](LICENSE)
