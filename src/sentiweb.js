// -----------------------------------------------------------------------------
// Client of the Sentiweb API of the Sentinelles network (Inserm, Sorbonne
// Université): https://www.sentiweb.fr/api/v1/datasets/rest/, no key.
//
// The API allows 15 requests per 10 minutes and per IP (X-RateLimit-* headers;
// the limit "can change at any time"), answers 429 past it, and blocks for
// several days an IP that keeps asking after a 429. So:
//   - `version()` (one request) says whether the data changed; datasets are
//     downloaded only when it did (the API documentation asks for this);
//   - a 429, or a window about to run out, stops every request until the reset
//     the server announces (never before MIN_PAUSE_MS);
//   - `span=short` (the last 10 weeks) only.
// -----------------------------------------------------------------------------

export const API_BASE = 'https://www.sentiweb.fr/api/v1/datasets/rest';
const TIMEOUT_MS = 30 * 1000;
// Requests kept in reserve in the window: someone else may share the IP.
const RESERVE = 2;
const MIN_PAUSE_MS = 60 * 1000;
const DEFAULT_PAUSE_MS = 10 * 60 * 1000;
// A longer announced pause (an IP blocked for days) is waited for in steps:
// an hour after a first 429, then twice as long after each new one in a row
// (2 h, 4 h... 24 h at most), never a pause stored for years.
const HOUR_MS = 60 * 60 * 1000;
export const MAX_PAUSE_MS = 24 * HOUR_MS;

export class SourceError extends Error {
  constructor(message, { rateLimited = false } = {}) {
    super(message);
    this.name = 'SourceError';
    this.rateLimited = rateLimited;
  }
}

/** Id of the weekly incidence dataset of an indicator at a level ("inc-25-RDD"). */
export function datasetId(indicator, level) {
  return `inc-${indicator}-${level}`;
}

export class SentiwebClient {
  /**
   * @param {object} options
   * @param {Function} [options.fetch]
   * @param {Function} [options.now] clock (ms)
   */
  constructor({ fetch, now } = {}) {
    this.fetch = fetch ?? globalThis.fetch;
    this.now = now ?? (() => Date.now());
    this.pausedUntil = 0;
    // 429 answers in a row, without a success between them
    this.strikes = 0;
  }

  /** True while the client refuses to send anything (rate limit). */
  paused() {
    return this.now() < this.pausedUntil;
  }

  /** `reset`: seconds to wait, or (above 1e9) an epoch in seconds. */
  pause(reset) {
    const now = this.now();
    let ms = DEFAULT_PAUSE_MS;
    if (Number.isFinite(reset) && reset > 0) {
      ms = reset > 1e9 ? reset * 1000 - now : reset * 1000;
    }
    const cap = Math.min(HOUR_MS * 2 ** Math.max(0, this.strikes - 1), MAX_PAUSE_MS);
    ms = Math.min(Math.max(ms, MIN_PAUSE_MS), cap);
    this.pausedUntil = Math.min(Math.max(this.pausedUntil, now + ms), now + cap);
  }

  /** Restores a saved pause, never longer than MAX_PAUSE_MS from now. */
  restorePause(until, strikes = 0) {
    if (Number.isFinite(until)) {
      this.pausedUntil = Math.min(until, this.now() + MAX_PAUSE_MS);
    }
    this.strikes = Number.isInteger(strikes) && strikes > 0 ? strikes : 0;
  }

  async request(path) {
    if (this.paused()) {
      throw new SourceError('rate limit of the Sentinelles API: waiting for its reset', {
        rateLimited: true,
      });
    }
    let res;
    try {
      res = await this.fetch(`${API_BASE}${path}`, {
        headers: { Accept: 'application/json, text/plain' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (err) {
      throw new SourceError(`Sentinelles API unreachable (${err.message})`);
    }
    const header = (name) => res.headers?.get?.(name) ?? null;
    const reset = Number(header('x-ratelimit-reset'));
    if (res.status === 429) {
      this.strikes += 1;
      this.pause(reset);
      throw new SourceError('rate limit of the Sentinelles API (HTTP 429)', { rateLimited: true });
    }
    this.strikes = 0;
    const remaining = header('x-ratelimit-remaining');
    if (remaining !== null && Number(remaining) <= RESERVE) {
      // The answer is good, but the next requests would hit the limit.
      this.pause(reset);
    }
    if (res.status < 200 || res.status >= 300) {
      throw new SourceError(`Sentinelles API answered HTTP ${res.status}`);
    }
    return res.text();
  }

  async json(path) {
    const text = await this.request(path);
    try {
      return JSON.parse(text);
    } catch {
      throw new SourceError('Sentinelles API answered something that is not JSON');
    }
  }

  /** Version of the published data: changes when any dataset changes. */
  async version() {
    // Plain text ("1793207247"); documented as possibly alphanumeric one day.
    const version = String(await this.request('/version'))
      .trim()
      .replace(/^"(.*)"$/, '$1');
    if (!/^[A-Za-z0-9._-]{1,64}$/.test(version)) {
      throw new SourceError('unexpected answer to /version');
    }
    return version;
  }

  /**
   * The last 10 weeks of a weekly incidence dataset, as records
   * { week, area, inc100, inc100Low, inc100Up }.
   */
  async dataset(id) {
    const body = await this.json(`/dataset?id=${encodeURIComponent(id)}&span=short`);
    return parseRecords(body);
  }
}

const toNumber = (value) => {
  const number = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  return typeof number === 'number' && Number.isFinite(number) ? number : null;
};

/** Records of a dataset answer; malformed rows are skipped. */
export function parseRecords(body) {
  const rows = Array.isArray(body?.data) ? body.data : null;
  if (!rows) {
    throw new SourceError('unexpected answer to /dataset (no data)');
  }
  const records = [];
  for (const row of rows) {
    const week = toNumber(row?.week);
    const area =
      row?.geo_insee === undefined || row?.geo_insee === null ? '' : String(row.geo_insee);
    const inc100 = toNumber(row?.inc100);
    if (!Number.isInteger(week) || week < 198000 || week % 100 < 1 || week % 100 > 53 || !area) {
      continue;
    }
    if (inc100 === null || inc100 < 0) {
      continue;
    }
    records.push({
      week,
      area,
      inc100: Math.round(inc100),
      inc100Low: toNumber(row.inc100_low),
      inc100Up: toNumber(row.inc100_up),
    });
  }
  return records;
}
