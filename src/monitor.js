// -----------------------------------------------------------------------------
// The heart of the integration: watches the Sentinelles data every hour,
// downloads the datasets when they changed, publishes the states of the
// created devices, fires the scene triggers and keeps the connection status.
//
// Requests, the API allowing 15 per 10 minutes: one /version per cycle, then
// one dataset per disease and level (regions, France) only when the version
// changed or a dataset is missing; at most 7 per weekly update. The datasets,
// the version and a rate-limit pause survive restarts (src/store.js), so a
// container that restarts in a loop asks for /version at most every
// 10 minutes and never during a pause.
//
// Triggers, on a week newer than the last one seen for an area and a disease
// (never on the very first one, which only sets the reference):
//   - incidence_rose_above: one event per threshold the rate crosses upwards;
//   - incidence_fell_below: one event per threshold it crosses downwards.
// The rate compared is the one the device last showed, so the revisions of the
// previous weeks by Sentinelles never fire a crossing twice.
//
// States: `publishChangedStates` sends only what changed, plus a heartbeat
// every 12 hours (Gladys shows "no recent value" after 48 hours). Everything
// is published again in onDeviceCreated, and on a reconnection.
// -----------------------------------------------------------------------------

import { createLogger } from '@gladysassistant/integration-sdk';
import { areaName, levelOf } from './areas.js';
import { REFRESH_MINUTES } from './config.js';
import { areaIds, buildDevice, codeOfExternalId, deviceStates } from './devices.js';
import { areaSnapshot, latestOf } from './incidence.js';
import { DISEASES, DISEASE_NAMES, STATUS } from './messages.js';
import { datasetId, SentiwebClient } from './sentiweb.js';
import { mondayOf, weekText } from './weeks.js';

const logger = createLogger({ name: 'epidemies-monitor' });

export const WIDGET_KEY = 'epidemics';
export const TRIGGERS = {
  ROSE_ABOVE: 'incidence_rose_above',
  FELL_BELOW: 'incidence_fell_below',
};
export const SCENE_TRIGGER_KEYS = Object.values(TRIGGERS);
// Cases per 100,000 inhabitants and per week. For scale: chickenpox stays
// under 50 most of the year, a gastroenteritis wave reaches 200 to 300, a flu
// season peaks between 300 and 1,000 (more in some regions).
export const THRESHOLDS = [25, 50, 100, 150, 200, 300, 500, 1000];

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
export const HEARTBEAT_MS = 12 * HOUR;
// Not two /version requests closer than this, restarts included.
const MIN_CHECK_GAP_MS = 10 * MINUTE;
const MAX_REFERENCE_GAP_MS = 21 * 24 * HOUR;
// requestWidgetRefresh is rate-limited to one call every 10 s by the core.
const WIDGET_REFRESH_GAP_MS = 10 * 1000;

export class Monitor {
  /**
   * @param {object} options
   * @param {object} options.gladys GladysIntegration (or the SDK's fake Gladys)
   * @param {object} options.store see store.js
   * @param {Function} [options.fetch]
   * @param {boolean} [options.timers] false in tests: no interval, no delayed refresh
   * @param {Function} [options.now] clock (ms)
   */
  constructor({ gladys, store, fetch, timers = true, now }) {
    this.gladys = gladys;
    this.store = store;
    this.timers = timers;
    this.now = now ?? (() => Date.now());
    this.client = new SentiwebClient({ fetch, now: this.now });
    this.config = { codes: [], language: 'fr' };
    this.version = null;
    this.checkedAt = 0;
    // dataset id → { version, records }
    this.datasets = {};
    // "<area>:<disease>" → { week, value }: the reference of the triggers
    this.seen = {};
    // dataset id → time of its last failed download: not retried within the gap
    this.failedAt = {};
    this.retryTimer = null;
    this.lastCycleAt = null;
    this.running = null;
    this.failing = null; // null, 'source' or 'rate'
    this.statusPublished = false;
    this.cycleTimer = null;
    this.refreshTimer = null;
    this.lastWidgetRefresh = 0;
  }

  async start(config) {
    this.config = config;
    const saved = await this.store.load();
    this.version = typeof saved.version === 'string' ? saved.version : null;
    this.checkedAt = Number.isFinite(saved.checkedAt) ? saved.checkedAt : 0;
    this.client.restorePause(saved.pausedUntil);
    for (const [id, at] of Object.entries(saved.failedAt ?? {})) {
      if (Number.isFinite(at)) {
        this.failedAt[id] = at;
      }
    }
    for (const [id, entry] of Object.entries(saved.datasets ?? {})) {
      if (Array.isArray(entry?.records)) {
        this.datasets[id] = { version: entry.version ?? null, records: entry.records };
      }
    }
    for (const [key, entry] of Object.entries(saved.seen ?? {})) {
      if (Number.isInteger(entry?.week) && Number.isFinite(entry?.value)) {
        this.seen[key] = entry;
      }
    }
    await this.publishDiscovered();
    await this.publishStates(this.created());
    await this.runCycle();
    if (this.timers && !this.cycleTimer) {
      this.cycleTimer = setInterval(() => this.runCycle(), REFRESH_MINUTES * MINUTE);
      this.cycleTimer.unref?.();
    }
  }

  /** Gladys restarted: publish the devices and every state again. */
  async resync(config) {
    this.config = config;
    this.gladys.forgetPublishedStates();
    this.statusPublished = false;
    await this.publishDiscovered();
    await this.publishStates(this.created());
    await this.publishStatus();
  }

  async reconfigure(config) {
    const languageChanged = config.language !== this.config.language;
    this.config = config;
    if (languageChanged) {
      this.gladys.forgetPublishedStates();
    }
    await this.publishDiscovered();
    // A cycle in progress still uses the old configuration: one more after it
    // (it downloads only a level not read yet, France or the regions).
    await this.running;
    await this.runCycle();
    this.refreshWidget();
  }

  async publishDiscovered() {
    const devices = this.config.codes.map((code) =>
      buildDevice(this.gladys, code, this.config.language),
    );
    await this.gladys.publishDiscoveredDevices(devices);
  }

  /** Codes of the areas whose device the user created, in configuration order. */
  created() {
    const codes = [];
    for (const device of this.gladys.devices ?? []) {
      const code = codeOfExternalId(this.gladys, device.external_id);
      // A device of an area removed from the configuration is no longer read.
      if (code !== null && !codes.includes(code) && this.config.codes.includes(code)) {
        codes.push(code);
      }
    }
    const rank = (code) => this.config.codes.indexOf(code);
    return codes.sort((a, b) => rank(a) - rank(b));
  }

  /** The name the user gave the device in Gladys, else the area's. */
  deviceName(code) {
    const { device } = areaIds(this.gladys, code);
    const found = (this.gladys.devices ?? []).find((d) => d.external_id === device);
    return found?.name || areaName(code, this.config.language);
  }

  /** The records of every dataset read: id → records. */
  records() {
    return Object.fromEntries(Object.entries(this.datasets).map(([id, e]) => [id, e.records]));
  }

  snapshot(code) {
    return areaSnapshot(this.records(), code);
  }

  /** Dataset ids the configured areas need. */
  neededIds() {
    const levels = [...new Set(this.config.codes.map(levelOf))];
    return levels.flatMap((level) => DISEASES.map((d) => datasetId(d.indicator, level)));
  }

  /** One cycle at a time: a call during a cycle waits for it. */
  runCycle() {
    if (!this.running) {
      this.running = this.cycle()
        .catch((err) => logger.error('Refresh failed', err))
        .finally(() => {
          this.running = null;
        });
    }
    return this.running;
  }

  async cycle() {
    const now = this.now();
    this.lastCycleAt = now;
    const needed = this.neededIds();
    let failure = null;
    let downloaded = false;
    const missing = needed.some(
      (id) => !this.datasets[id] && !(now - (this.failedAt[id] ?? -Infinity) < MIN_CHECK_GAP_MS),
    );
    const recent = now - this.checkedAt < MIN_CHECK_GAP_MS && now >= this.checkedAt;
    // The API was asked: the check time and a pause must survive a restart.
    const asked = needed.length > 0 && (missing || !recent);
    if (asked) {
      try {
        downloaded = await this.download(needed);
      } catch (err) {
        failure = err;
        downloaded = Boolean(err.downloaded);
      }
    }
    await this.setFailure(failure);
    const fired = await this.checkTriggers();
    if (asked || fired) {
      await this.save();
    }
    await this.publishStates(this.created());
    if (downloaded) {
      this.refreshWidget();
    }
    if (failure?.rateLimited) {
      this.retryAfterPause();
    }
  }

  /** One more cycle when the pause ends, rather than at the next hour. */
  retryAfterPause() {
    if (!this.timers || this.retryTimer) {
      return;
    }
    const delay = Math.max(0, this.client.pausedUntil - this.now()) + 1000;
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      this.runCycle();
    }, delay);
    this.retryTimer.unref?.();
  }

  /** Reads /version, then the datasets out of date. True if one was downloaded. */
  async download(needed) {
    const version = await this.client.version();
    this.checkedAt = this.now();
    let downloaded = false;
    let failure = null;
    for (const id of needed) {
      if (this.datasets[id]?.version === version) {
        continue;
      }
      try {
        const records = await this.client.dataset(id);
        this.datasets[id] = { version, records };
        delete this.failedAt[id];
        downloaded = true;
        logger.debug(`Read ${id} (${records.length} records, version ${version})`);
      } catch (err) {
        if (err.rateLimited) {
          throw err; // nothing more can be asked
        }
        // One broken dataset does not hold the others back.
        this.failedAt[id] = this.now();
        failure ??= err;
      }
    }
    this.version = version;
    if (failure) {
      failure.downloaded = downloaded;
      throw failure;
    }
    return downloaded;
  }

  /** Fires the triggers of the new weeks of the created areas. True if a reference moved. */
  async checkTriggers() {
    const records = this.records();
    let moved = false;
    for (const code of this.created()) {
      for (const { key } of DISEASES) {
        const entry = latestOf(records, code, key);
        if (!entry) {
          continue;
        }
        const ref = `${code}:${key}`;
        const previous = this.seen[ref];
        if (previous && entry.week <= previous.week) {
          continue;
        }
        this.seen[ref] = { week: entry.week, value: entry.value };
        moved = true;
        // A reference more than 3 weeks old (area followed again, long outage)
        // says nothing about this week: it is only replaced.
        if (previous && mondayOf(entry.week) - mondayOf(previous.week) <= MAX_REFERENCE_GAP_MS) {
          await this.fireTriggers(code, key, previous.value, entry);
        }
      }
    }
    return moved;
  }

  async fireTriggers(code, disease, before, entry) {
    const language = this.config.language;
    const common = {
      area: areaIds(this.gladys, code).device,
      area_name: this.deviceName(code),
      disease,
      disease_name: DISEASE_NAMES[language][disease],
      incidence: entry.value,
      previous_incidence: before,
      week: weekText(entry.week, language),
    };
    const events = [];
    for (const threshold of THRESHOLDS) {
      if (before < threshold && entry.value >= threshold) {
        events.push([TRIGGERS.ROSE_ABOVE, { ...common, threshold: String(threshold) }]);
      }
      if (before >= threshold && entry.value < threshold) {
        events.push([TRIGGERS.FELL_BELOW, { ...common, threshold: String(threshold) }]);
      }
    }
    for (const [key, data] of events) {
      try {
        await this.gladys.publishSceneEvent(key, data);
      } catch (err) {
        logger.warn(`Cannot fire the ${key} trigger: ${err.message}`);
      }
    }
  }

  async setFailure(err) {
    const kind = err ? (err.rateLimited ? 'rate' : 'source') : null;
    if (kind !== this.failing) {
      if (kind) {
        // One line at the first failure, one at the recovery.
        logger.warn(`Cannot read the Sentinelles data: ${err.message}`);
      } else if (this.failing) {
        logger.info('The Sentinelles data are readable again');
      }
      this.failing = kind;
      this.statusPublished = false;
    } else if (err) {
      logger.debug(`Still cannot read the Sentinelles data: ${err.message}`);
    }
    await this.publishStatus();
  }

  async publishStatus() {
    if (this.statusPublished) {
      return;
    }
    const message =
      this.failing === 'rate' ? STATUS.rateLimited : this.failing ? STATUS.sourceDown : undefined;
    try {
      await this.gladys.setConnectionStatus(!this.failing, message);
      this.statusPublished = true;
    } catch (err) {
      logger.debug(`Cannot publish the connection status: ${err.message}`);
    }
  }

  async publishStates(codes, { force = false } = {}) {
    const states = codes.flatMap((code) =>
      deviceStates(this.gladys, code, this.snapshot(code), this.config.language),
    );
    if (states.length === 0) {
      return;
    }
    if (force) {
      for (const code of codes) {
        this.gladys.forgetPublishedStates(areaIds(this.gladys, code).device);
      }
    }
    try {
      await this.gladys.publishChangedStates(states, { heartbeat: HEARTBEAT_MS });
    } catch (err) {
      // Sent again by the next cycle: publishChangedStates only remembers accepted values.
      logger.warn(`Cannot publish the states: ${err.message}`);
    }
  }

  /** Gladys polls a device (only if it was created with a poll frequency). */
  async poll(device) {
    const code = codeOfExternalId(this.gladys, device?.external_id);
    if (code === null) {
      return;
    }
    if (
      this.lastCycleAt === null ||
      this.now() - this.lastCycleAt >= (REFRESH_MINUTES * MINUTE) / 2
    ) {
      await this.runCycle();
    } else {
      await this.publishStates([code]);
    }
  }

  async onDeviceCreated(device) {
    const code = codeOfExternalId(this.gladys, device?.external_id);
    if (code !== null) {
      await this.publishStates([code], { force: true });
      // The reference of the triggers: the week the device shows now.
      if (await this.checkTriggers()) {
        await this.save();
      }
    }
    this.refreshWidget();
  }

  /** A device renamed or deleted: the widget shows Gladys' names and devices. */
  onDeviceChanged() {
    this.refreshWidget();
  }

  refreshWidget() {
    const elapsed = this.now() - this.lastWidgetRefresh;
    if (elapsed >= WIDGET_REFRESH_GAP_MS || !this.timers) {
      this.lastWidgetRefresh = this.now();
      Promise.resolve(this.gladys.requestWidgetRefresh(WIDGET_KEY)).catch((err) =>
        logger.debug(`Widget refresh refused: ${err.message}`),
      );
      return;
    }
    if (!this.refreshTimer) {
      this.refreshTimer = setTimeout(() => {
        this.refreshTimer = null;
        this.refreshWidget();
      }, WIDGET_REFRESH_GAP_MS - elapsed);
      this.refreshTimer.unref?.();
    }
  }

  save() {
    return this.store.save({
      version: this.version,
      checkedAt: this.checkedAt,
      pausedUntil: this.client.pausedUntil,
      failedAt: this.failedAt,
      datasets: this.datasets,
      seen: this.seen,
    });
  }

  async stop() {
    clearInterval(this.cycleTimer);
    clearTimeout(this.refreshTimer);
    clearTimeout(this.retryTimer);
    this.cycleTimer = null;
    this.refreshTimer = null;
    this.retryTimer = null;
    await this.running;
    await this.store.flush();
  }
}
