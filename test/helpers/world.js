// -----------------------------------------------------------------------------
// Test world: the SDK's fake Gladys, the real wiring (src/app.js), and a fake
// fetch serving the real Sentinelles answers recorded under
// test/fixtures/sentiweb/ (29 October 2026, version 1793207247, latest week
// 202643). No network.
//
// `publication: 'previous'` serves the same files without week 43 and under an
// older version: the data as they were the week before, to see a new week
// arrive.
// -----------------------------------------------------------------------------

import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createFakeGladys } from '@gladysassistant/integration-sdk/testing';
import { registerHandlers } from '../../src/app.js';
import { API_BASE } from '../../src/sentiweb.js';
import { Store } from '../../src/store.js';

const FIXTURES = new URL('../fixtures/sentiweb/', import.meta.url);

// 29 October 2026, 08:00 in Paris: week 43 was published the day before.
export const OCT_29 = Date.parse('2026-10-29T07:00:00Z');
export const LATEST_WEEK = 202643;
export const VERSION = '1793207247';
export const PREVIOUS_VERSION = '1792602447';

export function response(status, body = '', headers = {}) {
  const lower = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  return {
    status,
    headers: { get: (name) => lower[name.toLowerCase()] ?? null },
    text: async () => body,
  };
}

export async function fixtureText(name) {
  return readFile(new URL(name, FIXTURES), 'utf8');
}

/**
 * A fetch serving the fixtures; 404 for anything else. `state.publication`
 * ('latest' or 'previous') can change during a test; `overrides` maps a
 * predicate on the URL to a response, for the error cases.
 */
export function fixtureFetch({
  state = { publication: 'latest' },
  overrides = [],
  calls = [],
} = {}) {
  return async (url, options) => {
    calls.push({ url, options });
    for (const [match, answer] of overrides) {
      if (match(url)) {
        return typeof answer === 'function' ? answer(url) : answer;
      }
    }
    if (!url.startsWith(API_BASE)) {
      return response(404);
    }
    const previous = state.publication === 'previous';
    const path = url.slice(API_BASE.length);
    if (path === '/version') {
      return response(200, previous ? PREVIOUS_VERSION : VERSION, { 'content-type': 'text/plain' });
    }
    const match = /^\/dataset\?id=(inc-\d+-(?:RDD|PAY))&span=short$/.exec(path);
    if (!match) {
      return response(404, '{"message":"not found"}');
    }
    try {
      const body = JSON.parse(await fixtureText(`${match[1]}.json`));
      if (previous) {
        body.data = body.data.filter((row) => row.week !== LATEST_WEEK);
      }
      return response(200, JSON.stringify(body), { 'x-ratelimit-remaining': '10' });
    } catch {
      return response(404, '{"message":"not found"}');
    }
  };
}

/**
 * Starts the integration against the fake Gladys.
 * @param {object} [options]
 * @param {object} [options.config] integration configuration
 * @param {string[]} [options.created] area codes whose device the user created
 * @param {Function} [options.fetch]
 * @param {object} [options.clock] { now } mutable clock
 * @param {string} [options.dataDir] reuse a /data directory (restart)
 * @param {boolean} [options.timers]
 */
export async function createWorld({
  config = { areas: ['76', '11', 'FR'] },
  created = [],
  fetch = fixtureFetch(),
  clock = { now: OCT_29 },
  dataDir,
  timers = false,
} = {}) {
  const directory = dataDir ?? (await mkdtemp(join(tmpdir(), 'gladys-epidemies-')));
  const gladys = createFakeGladys({ config });
  gladys.fake.devices = created.map((code) => ({
    name: `Device ${code}`,
    external_id: gladys.externalIds('area', String(code)).device,
    features: [],
  }));
  const app = registerHandlers(gladys, {
    store: new Store(directory),
    fetch,
    timers,
    now: () => clock.now,
  });
  await gladys.connect();
  await app.ready;
  return {
    gladys,
    fake: gladys.fake,
    app,
    monitor: app.monitor,
    clock,
    directory,
    async cleanup() {
      await app.stop();
      if (!dataDir) {
        await rm(directory, { recursive: true, force: true });
      }
    },
  };
}

/** Captures what the SDK logger writes (console.log / console.error) at `level`. */
export function captureLogs(t, level = 'info') {
  const previous = process.env.LOG_LEVEL;
  process.env.LOG_LEVEL = level;
  const lines = [];
  const record = (...args) => {
    const text = args.map((arg) => (arg instanceof Error ? arg.message : String(arg))).join(' ');
    const match = /^\[[^\]]+\] \[(\w+)\]/.exec(text);
    lines.push({ level: match ? match[1].toLowerCase() : 'raw', text });
  };
  t.mock.method(console, 'log', record);
  t.mock.method(console, 'error', record);
  t.after(() => {
    process.env.LOG_LEVEL = previous;
  });
  return lines;
}
