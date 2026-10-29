// -----------------------------------------------------------------------------
// Dashboard widget (manifest `widgets`, Gladys 5.1+): `epidemics`.
//
// One area (the one chosen, else the first followed): a heading with its name
// (the one given in Gladys), one status line per disease shown, with the rate
// per 100,000 and the trend, coloured by the trend, and a caption with the
// week and the source. A setting hides diseases, another the caption.
// Budget: 2 texts, 1 status.
// -----------------------------------------------------------------------------

import { WIDGET_COLORS } from '@gladysassistant/integration-sdk';
import { codeOfExternalId } from './devices.js';
import { snapshotWeek } from './incidence.js';
import { DISEASE_KEYS, DISEASE_NAMES, TREND_NAMES, fill } from './messages.js';
import { WIDGET_KEY } from './monitor.js';

export const TTL_SECONDS = 1800;
const MAX_STATUS_TEXT = 40;

export const TEXT = {
  empty: {
    en: 'No area yet: choose them in the configuration of the integration, then create the devices in the Discover tab.',
    fr: "Aucune zone pour l'instant : choisissez-les dans la configuration de l'intégration, puis créez les appareils dans l'onglet Découverte.",
    de: 'Noch kein Gebiet: Wähle sie in der Konfiguration der Integration aus und lege dann die Geräte im Tab „Entdecken“ an.',
    es: 'Aún no hay zonas: elíjalas en la configuración de la integración y, después, cree los dispositivos en la pestaña Descubrir.',
  },
  gone: {
    en: 'This area is no longer followed.',
    fr: "Cette zone n'est plus suivie.",
    de: 'Dieses Gebiet wird nicht mehr verfolgt.',
    es: 'Esta zona ya no se sigue.',
  },
  noData: {
    en: 'No data yet',
    fr: 'Pas encore de données',
    de: 'Noch keine Daten',
    es: 'Aún sin datos',
  },
  caption: {
    en: 'Week {week} · per 100,000 · Sentinelles',
    fr: 'Semaine {week} · pour 100 000 hab. · Sentinelles',
    de: 'Woche {week} · pro 100.000 Einw. · Sentinelles',
    es: 'Semana {week} · por 100.000 hab. · Sentinelles',
  },
  source: {
    en: 'Sentinelles network · not medical advice',
    fr: 'Réseau Sentinelles · pas un avis médical',
    de: 'Sentinelles-Netz · keine ärztliche Beratung',
    es: 'Red Sentinelles · no es consejo médico',
  },
};

const t = (text, language) => text[language] ?? text.en;
const clip = (text, max = MAX_STATUS_TEXT) =>
  text.length <= max ? text : `${text.slice(0, max - 1)}…`;

/** Colour of a trend: rising in orange, falling in green, else neutral (closed palette). */
export function trendColor(trend) {
  if (trend === 'rising') {
    return WIDGET_COLORS.WARNING;
  }
  return trend === 'falling' ? WIDGET_COLORS.SUCCESS : WIDGET_COLORS.NEUTRAL;
}

const TREND_ICONS = { rising: 'trending-up', falling: 'trending-down', stable: 'minus' };

/** "259 · en hausse" (40 characters at most). */
export function lineValue(entry, language) {
  if (!entry) {
    return t(TEXT.noData, language);
  }
  const trend = entry.trend ? ` · ${TREND_NAMES[language][entry.trend]}` : '';
  return clip(`${entry.value}${trend}`);
}

function areaContent(monitor, code, language, settings) {
  const snapshot = monitor.snapshot(code);
  const shown = Array.isArray(settings.diseases)
    ? DISEASE_KEYS.filter((key) => settings.diseases.includes(key))
    : DISEASE_KEYS;
  const components = [{ type: 'text', variant: 'heading', text: clip(monitor.deviceName(code)) }];
  if (shown.length > 0) {
    components.push({
      type: 'status',
      items: shown.map((key) => ({
        label: DISEASE_NAMES[language][key],
        value: lineValue(snapshot[key], language),
        color: trendColor(snapshot[key]?.trend),
        icon: TREND_ICONS[snapshot[key]?.trend] ?? 'activity',
      })),
    });
  }
  if (settings.show_source !== false) {
    const week = snapshotWeek(snapshot);
    components.push({
      type: 'text',
      variant: 'caption',
      text:
        week === null
          ? t(TEXT.source, language)
          : fill(t(TEXT.caption, language), { week: String(week % 100) }),
    });
  }
  return components;
}

export const WIDGETS = {
  [WIDGET_KEY]: {
    async get(monitor, { settings, language = 'en' } = {}) {
      const lang = DISEASE_NAMES[language] ? language : 'en';
      const created = monitor.created();
      const chosen = typeof settings?.area === 'string' && settings.area ? settings.area : null;
      let code = created[0] ?? null;
      if (chosen) {
        code = codeOfExternalId(monitor.gladys, chosen);
        if (code === null || !created.includes(code)) {
          return {
            ttl_seconds: TTL_SECONDS,
            components: [{ type: 'text', variant: 'body', text: t(TEXT.gone, lang) }],
          };
        }
      }
      if (code === null) {
        return {
          ttl_seconds: TTL_SECONDS,
          components: [{ type: 'text', variant: 'body', text: t(TEXT.empty, lang) }],
        };
      }
      return {
        ttl_seconds: TTL_SECONDS,
        components: areaContent(monitor, code, lang, settings ?? {}),
      };
    },
  },
};
