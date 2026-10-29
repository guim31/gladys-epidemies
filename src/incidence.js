// -----------------------------------------------------------------------------
// From the downloaded datasets to what a device shows: for an area and a
// disease, the incidence rate (cases per 100,000 inhabitants) of the latest
// week, the one of the week before, and the trend.
//
// Trend: "rising" or "falling" when the rate moved by 15 % or more of the
// previous week AND by 5 per 100,000 or more; "stable" otherwise. The second
// condition keeps the small rates (chickenpox, a summer week) from swinging
// with the noise: the regional confidence intervals are wide.
// -----------------------------------------------------------------------------

import { levelOf } from './areas.js';
import { DISEASES } from './messages.js';
import { datasetId } from './sentiweb.js';

const TREND_RATIO = 0.15;
const TREND_MIN = 5;

export function trendOf(value, previous) {
  if (previous === null || previous === undefined) {
    return null;
  }
  const delta = value - previous;
  const threshold = Math.max(TREND_MIN, previous * TREND_RATIO);
  if (delta >= threshold) {
    return 'rising';
  }
  if (-delta >= threshold) {
    return 'falling';
  }
  return 'stable';
}

/** The previous ISO week of YYYYWW (handles years of 52 and 53 weeks). */
export function previousWeek(week) {
  if (week % 100 > 1) {
    return week - 1;
  }
  const year = Math.floor(week / 100) - 1;
  // 28 December is always in the last week of its ISO year.
  const dec28 = new Date(Date.UTC(year, 11, 28));
  const thursday = new Date(dec28);
  thursday.setUTCDate(dec28.getUTCDate() + 3 - ((dec28.getUTCDay() + 6) % 7));
  const yearStart = Date.UTC(thursday.getUTCFullYear(), 0, 1);
  const number = Math.ceil(((thursday - yearStart) / 86400000 + 1) / 7);
  return year * 100 + number;
}

/**
 * @param {object} datasets id → records (see sentiweb.js parseRecords)
 * @param {string} code area code
 * @param {string} diseaseKey
 * @returns {{week: number, value: number, previous: number|null, trend: string|null}|null}
 */
export function latestOf(datasets, code, diseaseKey) {
  const disease = DISEASES.find((d) => d.key === diseaseKey);
  const records = datasets?.[datasetId(disease.indicator, levelOf(code))];
  if (!Array.isArray(records)) {
    return null;
  }
  let latest = null;
  for (const record of records) {
    if (record.area === code && (!latest || record.week > latest.week)) {
      latest = record;
    }
  }
  if (!latest) {
    return null;
  }
  const before = previousWeek(latest.week);
  const previous = records.find((r) => r.area === code && r.week === before)?.inc100 ?? null;
  return {
    week: latest.week,
    value: latest.inc100,
    previous,
    trend: trendOf(latest.inc100, previous),
  };
}

/** Every disease of an area: key → latestOf(...) (null when no data). */
export function areaSnapshot(datasets, code) {
  return Object.fromEntries(DISEASES.map(({ key }) => [key, latestOf(datasets, code, key)]));
}

/** The latest week any disease of the area has, or null. */
export function snapshotWeek(snapshot) {
  const weeks = Object.values(snapshot)
    .filter(Boolean)
    .map((entry) => entry.week);
  return weeks.length > 0 ? Math.max(...weeks) : null;
}
