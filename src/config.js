// -----------------------------------------------------------------------------
// Integration configuration: defaults (they mirror the `default` values of the
// manifest `config_schema`, see test/manifest.test.js) and normalization, so
// the rest of the code never deals with strings, blanks or `undefined`.
// -----------------------------------------------------------------------------

import { areaOf } from './areas.js';

export const LANGUAGES = ['en', 'fr', 'de', 'es'];

// The data change once a week (Wednesday afternoon, sometimes later). One
// request to /version every hour sees a new week within the hour and keeps the
// API (15 requests per 10 minutes) far from its limit; the datasets are only
// downloaded when the version changed.
export const REFRESH_MINUTES = 60;

export const DEFAULT_CONFIG = {
  areas: [],
  language: 'fr',
};

/**
 * @param {object} raw configuration from Gladys
 * @returns {{codes: string[], language: string}}
 */
export function normalizeConfig(raw = {}) {
  const config = { ...DEFAULT_CONFIG, ...(raw ?? {}) };
  let values = config.areas;
  if (typeof values === 'string') {
    // A value typed by hand, or stored by an older form: "76, FR".
    values = values.split(/[\s,;]+/);
  }
  const codes = [];
  for (const value of Array.isArray(values) ? values : []) {
    const area = areaOf(String(value).trim().toUpperCase());
    if (area && !codes.includes(area.code)) {
      codes.push(area.code);
    }
  }
  const language = LANGUAGES.includes(config.language) ? config.language : DEFAULT_CONFIG.language;
  return { codes, language };
}
