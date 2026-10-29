// -----------------------------------------------------------------------------
// The Sentiweb client: parsing of the real answers, and the rate limit of the
// API (15 requests per 10 minutes; insisting after a 429 blocks the IP for
// days), which must stop every request until the announced reset.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { API_BASE, SentiwebClient, parseRecords } from '../src/sentiweb.js';
import { fixtureText, response } from './helpers/world.js';

test('reads the records of a real regional dataset', async () => {
  const records = parseRecords(JSON.parse(await fixtureText('inc-25-RDD.json')));
  assert.equal(records.length, 13 * 11);
  const occitanie = records.find((r) => r.area === '76' && r.week === 202643);
  assert.deepEqual(occitanie, {
    week: 202643,
    area: '76',
    inc100: 196,
    inc100Low: occitanie.inc100Low,
    inc100Up: occitanie.inc100Up,
  });
  assert.ok(occitanie.inc100Low < 196 && occitanie.inc100Up > 196);
});

test('reads the national dataset, keyed FR', async () => {
  const records = parseRecords(JSON.parse(await fixtureText('inc-6-PAY.json')));
  assert.ok(records.every((r) => r.area === 'FR'));
  assert.equal(records.find((r) => r.week === 202643).inc100, 58);
});

test('skips malformed rows, refuses an answer without data', () => {
  const records = parseRecords({
    data: [
      { week: 202643, geo_insee: 76, inc100: 12 },
      { week: 202699, geo_insee: 76, inc100: 12 },
      { week: 202643, geo_insee: null, inc100: 12 },
      { week: 202643, geo_insee: 11, inc100: null },
      { week: '202642', geo_insee: '11', inc100: '7.4' },
    ],
  });
  assert.deepEqual(
    records.map((r) => [r.week, r.area, r.inc100]),
    [
      [202643, '76', 12],
      [202642, '11', 7],
    ],
  );
  assert.throws(() => parseRecords({ message: 'UnhandledFormat' }), /no data/);
});

test('reads the plain-text version', async () => {
  const client = new SentiwebClient({ fetch: async () => response(200, '1793207247\n') });
  assert.equal(await client.version(), '1793207247');
  const html = new SentiwebClient({ fetch: async () => response(200, '<html>oops</html>') });
  await assert.rejects(html.version(), /unexpected answer/);
});

test('asks the dataset by id, last 10 weeks only', async () => {
  const urls = [];
  const client = new SentiwebClient({
    fetch: async (url) => {
      urls.push(url);
      return response(200, '{"data":[]}');
    },
  });
  await client.dataset('inc-25-RDD');
  assert.deepEqual(urls, [`${API_BASE}/dataset?id=inc-25-RDD&span=short`]);
});

test('a 429 stops every request until the announced reset', async () => {
  const clock = { now: 0 };
  let calls = 0;
  const client = new SentiwebClient({
    now: () => clock.now,
    fetch: async () => {
      calls += 1;
      return response(429, '{"message":"Too many requests"}', { 'X-RateLimit-Reset': '239' });
    },
  });
  await assert.rejects(client.version(), (err) => err.rateLimited === true);
  await assert.rejects(client.version(), (err) => err.rateLimited === true);
  assert.equal(calls, 1, 'nothing is sent during the pause');
  clock.now = 238 * 1000;
  assert.equal(client.paused(), true);
  clock.now = 240 * 1000;
  assert.equal(client.paused(), false);
});

test('a window about to run out pauses before the 429', async () => {
  const clock = { now: 0 };
  const client = new SentiwebClient({
    now: () => clock.now,
    fetch: async () =>
      response(200, '42', { 'X-RateLimit-Remaining': '2', 'X-RateLimit-Reset': '300' }),
  });
  assert.equal(await client.version(), '42');
  assert.equal(client.paused(), true);
  clock.now = 301 * 1000;
  assert.equal(client.paused(), false);
});

test('a 429 without reset header waits 10 minutes', async () => {
  const clock = { now: 0 };
  const client = new SentiwebClient({ now: () => clock.now, fetch: async () => response(429) });
  await assert.rejects(client.version());
  clock.now = 9 * 60 * 1000;
  assert.equal(client.paused(), true);
});

test('server and network errors', async () => {
  const down = new SentiwebClient({ fetch: async () => response(503) });
  await assert.rejects(down.version(), /HTTP 503/);
  const offline = new SentiwebClient({
    fetch: async () => {
      throw new Error('getaddrinfo ENOTFOUND');
    },
  });
  await assert.rejects(offline.version(), /unreachable/);
  const notJson = new SentiwebClient({ fetch: async () => response(200, '<html>') });
  await assert.rejects(notJson.dataset('inc-6-PAY'), /not JSON/);
});
