// -----------------------------------------------------------------------------
// One Gladys device per followed area (a region, or metropolitan France).
//
// Features (couples checked against the Gladys front, see
// test/gladys-rules.test.js), for each disease of messages.js DISEASES:
//   - <disease>_incidence: counter-sensor/integer, cases per 100,000
//     inhabitants in the latest week (no Gladys unit exists for "per 100,000":
//     it is in the feature name);
//   - <disease>_trend: text/text, rising / stable / falling against the week
//     before (see incidence.js);
// and once per device:
//   - week: text/text, the week of the data ("43 (19 – 25 Oct 2026)").
//
// Published with should_poll: false: the refresh runs in the container
// (src/monitor.js). The area code is the platform id.
// -----------------------------------------------------------------------------

import {
  DEVICE_FEATURE_CATEGORIES as CATEGORIES,
  DEVICE_FEATURE_TYPES as TYPES,
} from '@gladysassistant/integration-sdk';
import { areaName, areaOf } from './areas.js';
import { snapshotWeek } from './incidence.js';
import { DISEASE_KEYS, DISEASE_NAMES, TREND_NAMES } from './messages.js';
import { weekText } from './weeks.js';

export const DEVICE_TYPE = 'area';
export const FEATURE_KEYS = [
  ...DISEASE_KEYS.flatMap((key) => [`${key}_incidence`, `${key}_trend`]),
  'week',
];

// Incidence rates go far above 1,000 per 100,000 at a flu peak (2,000 to
// 3,000 in some regions); the bound only frames the history chart.
const MAX_INCIDENCE = 5000;

// Feature names, frozen at creation in Gladys (language of the configuration).
const SUFFIX = {
  en: { incidence: '{disease} /100,000', trend: '{disease}, trend', week: 'Week of the data' },
  fr: {
    incidence: '{disease} /100 000 hab.',
    trend: '{disease}, tendance',
    week: 'Semaine des données',
  },
  de: { incidence: '{disease} /100.000 Einw.', trend: '{disease}, Tendenz', week: 'Datenwoche' },
  es: {
    incidence: '{disease} /100.000 hab.',
    trend: '{disease}, tendencia',
    week: 'Semana de los datos',
  },
};
export const NAMES = SUFFIX;

/** Feature name in a language. */
export function featureName(key, language) {
  const names = SUFFIX[language] ?? SUFFIX.fr;
  if (key === 'week') {
    return names.week;
  }
  const [disease, kind] = key.split('_');
  const diseases = DISEASE_NAMES[language] ?? DISEASE_NAMES.fr;
  return names[kind].replace('{disease}', diseases[disease]);
}

/** External ids of an area device and of its features. */
export function areaIds(gladys, code) {
  const ids = gladys.externalIds(DEVICE_TYPE, String(code));
  return {
    device: ids.device,
    ...Object.fromEntries(FEATURE_KEYS.map((key) => [key, ids.feature(key)])),
  };
}

/** The area code of a device or feature external id (null if not ours). */
export function codeOfExternalId(gladys, externalId) {
  const prefix = gladys.externalIds(DEVICE_TYPE, '').device;
  if (typeof externalId !== 'string' || !externalId.startsWith(prefix)) {
    return null;
  }
  const area = areaOf(externalId.slice(prefix.length).split(':')[0]);
  return area ? area.code : null;
}

function feature(key, ids, language) {
  const base = {
    name: featureName(key, language),
    external_id: ids[key],
    read_only: true,
    has_feedback: false,
  };
  if (key.endsWith('_incidence')) {
    return {
      ...base,
      category: CATEGORIES.COUNTER_SENSOR,
      type: TYPES.SENSOR.INTEGER,
      keep_history: true,
      min: 0,
      max: MAX_INCIDENCE,
    };
  }
  return {
    ...base,
    category: CATEGORIES.TEXT,
    type: TYPES.TEXT.TEXT,
    keep_history: false,
    min: 0,
    max: 0,
  };
}

/** The discovery payload of an area. */
export function buildDevice(gladys, code, language = 'fr') {
  const ids = areaIds(gladys, code);
  return {
    name: areaName(code, language),
    external_id: ids.device,
    model: 'Réseau Sentinelles',
    should_poll: false,
    params: [{ name: 'AREA_CODE', value: String(code) }],
    features: FEATURE_KEYS.map((key) => feature(key, ids, language)),
  };
}

/**
 * States of an area device; nothing for a disease without data (the values
 * are not invented).
 * @param {object} gladys
 * @param {string} code
 * @param {object} snapshot see incidence.js areaSnapshot
 * @param {string} language
 */
export function deviceStates(gladys, code, snapshot, language) {
  const ids = areaIds(gladys, code);
  const trends = TREND_NAMES[language] ?? TREND_NAMES.fr;
  const states = [];
  for (const key of DISEASE_KEYS) {
    const entry = snapshot[key];
    if (!entry) {
      continue;
    }
    states.push({ device_feature_external_id: ids[`${key}_incidence`], state: entry.value });
    if (entry.trend) {
      states.push({ device_feature_external_id: ids[`${key}_trend`], text: trends[entry.trend] });
    }
  }
  const week = snapshotWeek(snapshot);
  if (week !== null) {
    states.push({ device_feature_external_id: ids.week, text: weekText(week, language) });
  }
  return states;
}
