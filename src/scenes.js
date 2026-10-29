// -----------------------------------------------------------------------------
// Scene action (manifest `scene_actions`, Gladys 5.1+): `get_weekly_summary`.
//
// Returns the week of an area in one sentence, ready for a notification, and
// its figures for the following actions of the scene. A scene action does not
// receive the user's language: the sentence is in the configured `language`.
// -----------------------------------------------------------------------------

import { codeOfExternalId } from './devices.js';
import { snapshotWeek } from './incidence.js';
import { DISEASE_KEYS, DISEASE_NAMES, SUMMARY, TREND_NAMES, fill } from './messages.js';

export const GET_WEEKLY_SUMMARY = 'get_weekly_summary';

/** The sentence of an area's snapshot (see incidence.js areaSnapshot). */
export function summaryText(areaLabel, snapshot, language) {
  const texts = SUMMARY[language] ?? SUMMARY.fr;
  const week = snapshotWeek(snapshot);
  if (week === null) {
    return fill(texts.none, { area: areaLabel });
  }
  const list = DISEASE_KEYS.filter((key) => snapshot[key])
    .map((key) => {
      const entry = snapshot[key];
      const values = { name: DISEASE_NAMES[language][key], value: String(entry.value) };
      return entry.trend
        ? fill(texts.item, { ...values, trend: TREND_NAMES[language][entry.trend] })
        : fill(texts.itemNoTrend, values);
    })
    .join(', ');
  return fill(texts.intro, { area: areaLabel, week: String(week % 100), list });
}

export const SCENE_ACTIONS = {
  /**
   * @param {object} monitor
   * @param {object} fields { area?: device external id }
   */
  async [GET_WEEKLY_SUMMARY](monitor, fields = {}) {
    const language = monitor.config.language;
    const created = monitor.created();
    let code = created[0] ?? null;
    if (typeof fields.area === 'string' && fields.area) {
      code = codeOfExternalId(monitor.gladys, fields.area);
      if (code === null || !monitor.config.codes.includes(code)) {
        throw new Error('This area is not followed by the integration');
      }
    }
    if (code === null) {
      throw new Error('No area followed yet: create a device in the Discover tab');
    }
    const snapshot = monitor.snapshot(code);
    const name = monitor.deviceName(code);
    const outputs = { summary: summaryText(name, snapshot, language), area_name: name };
    const week = snapshotWeek(snapshot);
    if (week !== null) {
      outputs.week = week % 100;
    }
    for (const key of DISEASE_KEYS) {
      if (snapshot[key]) {
        outputs[`${key}_incidence`] = snapshot[key].value;
      }
    }
    return outputs;
  },
};
