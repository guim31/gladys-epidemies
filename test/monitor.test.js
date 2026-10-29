// -----------------------------------------------------------------------------
// The monitor against the fake Gladys and the recorded Sentinelles answers:
// discovery, states, requests kept to the strict minimum, triggers on a new
// week, rate limit, restarts, and the container's own timer.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { areaIds } from '../src/devices.js';
import { STATUS } from '../src/messages.js';
import { HEARTBEAT_MS, TRIGGERS } from '../src/monitor.js';
import { API_BASE } from '../src/sentiweb.js';
import { OCT_29, createWorld, fixtureFetch, response } from './helpers/world.js';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const paths = (calls) => calls.map((c) => c.url.slice(API_BASE.length));

test('discovers one device per configured area, without poll frequency', async () => {
  const world = await createWorld({ config: { areas: ['76', 'FR'], language: 'en' } });
  try {
    const devices = world.fake.discoveredDevices;
    assert.deepEqual(
      devices.map((d) => d.name),
      ['Occitania', 'Metropolitan France'],
    );
    assert.equal(devices[0].should_poll, false);
    assert.equal(devices[0].poll_frequency, undefined);
    assert.equal(devices[0].external_id, world.gladys.externalIds('area', '76').device);
    assert.equal(world.fake.connectionStatus.connected, true);
  } finally {
    await world.cleanup();
  }
});

test('publishes the latest week of a created area', async () => {
  const world = await createWorld({ created: ['76', 'FR'], config: { areas: ['76', 'FR'] } });
  try {
    const occitanie = areaIds(world.gladys, '76');
    const last = (id) => world.fake.lastState(id);
    assert.equal(last(occitanie.ari_incidence), 196);
    assert.equal(last(occitanie.ari_trend), 'en hausse');
    assert.equal(last(occitanie.diarrhea_incidence), 58);
    assert.equal(last(occitanie.diarrhea_trend), 'en hausse');
    assert.equal(last(occitanie.chickenpox_incidence), 4);
    assert.equal(last(occitanie.chickenpox_trend), 'stable');
    assert.equal(last(occitanie.week), '43 (19 – 25 oct. 2026)');
    const france = areaIds(world.gladys, 'FR');
    assert.equal(last(france.ari_incidence), 194);
    assert.equal(last(france.diarrhea_trend), 'stable');
  } finally {
    await world.cleanup();
  }
});

test('asks the API as little as possible', async () => {
  const calls = [];
  const world = await createWorld({
    created: ['76'],
    config: { areas: ['76', '11'] },
    fetch: fixtureFetch({ calls }),
  });
  try {
    assert.deepEqual(paths(calls), [
      '/version',
      '/dataset?id=inc-25-RDD&span=short',
      '/dataset?id=inc-6-RDD&span=short',
      '/dataset?id=inc-7-RDD&span=short',
    ]);
    // Within 10 minutes: nothing.
    world.clock.now += 5 * MINUTE;
    await world.monitor.runCycle();
    assert.equal(calls.length, 4);
    // An hour later, same version: /version only.
    world.clock.now += HOUR;
    await world.monitor.runCycle();
    assert.deepEqual(paths(calls.slice(4)), ['/version']);
    // France added: only its level is downloaded.
    await world.monitor.reconfigure({ codes: ['76', '11', 'FR'], language: 'fr' });
    assert.deepEqual(paths(calls.slice(5)), [
      '/version',
      '/dataset?id=inc-25-PAY&span=short',
      '/dataset?id=inc-6-PAY&span=short',
      '/dataset?id=inc-7-PAY&span=short',
    ]);
  } finally {
    await world.cleanup();
  }
});

test('nothing configured: no request at all', async () => {
  const calls = [];
  const world = await createWorld({ config: {}, fetch: fixtureFetch({ calls }) });
  try {
    world.clock.now += HOUR;
    await world.monitor.runCycle();
    assert.deepEqual(calls, []);
  } finally {
    await world.cleanup();
  }
});

/** A world that saw week 42, then the publication of week 43. */
async function worldSeeingANewWeek(options = {}) {
  const state = { publication: 'previous' };
  const world = await createWorld({
    created: ['76', '11'],
    config: { areas: ['76', '11'], language: 'en' },
    fetch: fixtureFetch({ state }),
    ...options,
  });
  assert.deepEqual(world.fake.sceneEvents, [], 'the first week only sets the reference');
  state.publication = 'latest';
  world.clock.now += HOUR;
  await world.monitor.runCycle();
  return world;
}

test('a new week fires one event per threshold crossed', async () => {
  const world = await worldSeeingANewWeek();
  try {
    const events = world.fake.sceneEvents.map((e) => [
      e.key,
      e.data.area_name,
      e.data.disease,
      e.data.threshold,
    ]);
    assert.deepEqual(events, [
      [TRIGGERS.ROSE_ABOVE, 'Device 76', 'ari', '150'],
      [TRIGGERS.ROSE_ABOVE, 'Device 76', 'diarrhea', '50'],
      [TRIGGERS.FELL_BELOW, 'Device 11', 'diarrhea', '50'],
    ]);
    const first = world.fake.sceneEvents[0].data;
    assert.equal(first.area, world.gladys.externalIds('area', '76').device);
    assert.equal(first.incidence, 196);
    assert.equal(first.previous_incidence, 135);
    assert.equal(first.disease_name, 'Respiratory infections');
    assert.equal(first.week, '43 (19 – 25 Oct 2026)');
    // The same week again: nothing more.
    world.clock.now += HOUR;
    await world.monitor.runCycle();
    assert.equal(world.fake.sceneEvents.length, 3);
  } finally {
    await world.cleanup();
  }
});

test('the reference survives a restart: no event fired twice', async () => {
  const first = await worldSeeingANewWeek();
  await first.app.stop();
  const restarted = await createWorld({
    created: ['76', '11'],
    config: { areas: ['76', '11'] },
    dataDir: first.directory,
  });
  try {
    assert.deepEqual(restarted.fake.sceneEvents, []);
  } finally {
    await restarted.cleanup();
    await first.cleanup();
  }
});

test('a restart reads the data from /data, and asks nothing within 10 minutes', async () => {
  const first = await createWorld({ created: ['76'], config: { areas: ['76'] } });
  await first.app.stop();
  const calls = [];
  const restarted = await createWorld({
    created: ['76'],
    config: { areas: ['76'] },
    dataDir: first.directory,
    fetch: fixtureFetch({ calls }),
  });
  try {
    assert.deepEqual(calls, []);
    assert.equal(restarted.fake.lastState(areaIds(restarted.gladys, '76').ari_incidence), 196);
  } finally {
    await restarted.cleanup();
    await first.cleanup();
  }
});

test('a 429 pauses the requests, says so, and the pause survives a restart', async () => {
  const calls = [];
  let limited = true;
  const fetch = fixtureFetch({
    calls,
    overrides: [
      [
        () => limited,
        () => response(429, '{"message":"Too many requests"}', { 'X-RateLimit-Reset': '600' }),
      ],
    ],
  });
  const world = await createWorld({ created: ['76'], config: { areas: ['76'] }, fetch });
  assert.equal(calls.length, 1);
  assert.equal(world.fake.connectionStatus.connected, false);
  assert.deepEqual(world.fake.connectionStatus.message, STATUS.rateLimited);
  await world.app.stop();

  const restarted = await createWorld({
    created: ['76'],
    config: { areas: ['76'] },
    fetch,
    dataDir: world.directory,
    clock: { now: world.clock.now + 5 * MINUTE },
  });
  try {
    assert.equal(calls.length, 1, 'nothing asked during the pause, even after a restart');
    limited = false;
    restarted.clock.now += 10 * MINUTE;
    await restarted.monitor.runCycle();
    assert.equal(calls.length, 5);
    assert.equal(restarted.fake.connectionStatus.connected, true);
  } finally {
    await restarted.cleanup();
    await world.cleanup();
  }
});

test('the source down: status with the four languages, values kept', async () => {
  let down = false;
  const fetch = fixtureFetch({ overrides: [[() => down, () => response(502)]] });
  const world = await createWorld({ created: ['76'], config: { areas: ['76'] }, fetch });
  try {
    down = true;
    world.clock.now += HOUR;
    await world.monitor.runCycle();
    assert.equal(world.fake.connectionStatus.connected, false);
    assert.deepEqual(world.fake.connectionStatus.message, STATUS.sourceDown);
    assert.equal(world.fake.lastState(areaIds(world.gladys, '76').ari_incidence), 196);
    down = false;
    world.clock.now += HOUR;
    await world.monitor.runCycle();
    assert.equal(world.fake.connectionStatus.connected, true);
  } finally {
    await world.cleanup();
  }
});

test('onDeviceCreated publishes everything again and refreshes the widget', async () => {
  const world = await createWorld({ config: { areas: ['76'] } });
  try {
    const device = { external_id: world.gladys.externalIds('area', '76').device, name: 'Ici' };
    world.fake.devices = [device];
    const before = world.fake.widgetRefreshes.length;
    await world.monitor.onDeviceCreated(device);
    assert.equal(world.fake.lastState(areaIds(world.gladys, '76').ari_incidence), 196);
    assert.ok(world.fake.widgetRefreshes.length > before);
  } finally {
    await world.cleanup();
  }
});

test('the heartbeat republishes an unchanged value after 12 hours', async (t) => {
  // The SDK dates the published states with Date.now().
  t.mock.timers.enable({ apis: ['Date'], now: OCT_29 });
  const world = await createWorld({ created: ['76'], config: { areas: ['76'] } });
  try {
    const id = areaIds(world.gladys, '76').ari_incidence;
    const count = () => world.fake.states.filter((s) => s.device_feature_external_id === id).length;
    const initial = count();
    world.clock.now += HOUR;
    await world.monitor.runCycle();
    assert.equal(count(), initial);
    world.clock.now += HEARTBEAT_MS;
    t.mock.timers.tick(HOUR + HEARTBEAT_MS);
    await world.monitor.runCycle();
    assert.equal(count(), initial + 1);
  } finally {
    await world.cleanup();
  }
});

test("the container's own timer refreshes, without onPoll", async (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const calls = [];
  const world = await createWorld({
    created: ['76'],
    config: { areas: ['76'] },
    fetch: fixtureFetch({ calls }),
    timers: true,
  });
  try {
    assert.equal(calls.length, 4);
    world.clock.now += HOUR;
    t.mock.timers.tick(HOUR);
    await world.monitor.running;
    assert.deepEqual(paths(calls.slice(4)), ['/version']);
  } finally {
    await world.cleanup();
  }
});

test('a broken dataset holds the others back neither, nor is asked again within 10 minutes', async () => {
  const calls = [];
  const broken = (url) => url.includes('inc-6-RDD');
  const world = await createWorld({
    created: ['76'],
    config: { areas: ['76'] },
    fetch: fixtureFetch({ calls, overrides: [[broken, () => response(500)]] }),
  });
  try {
    const ids = areaIds(world.gladys, '76');
    assert.equal(world.fake.lastState(ids.ari_incidence), 196);
    assert.equal(world.fake.lastState(ids.chickenpox_incidence), 4);
    assert.equal(world.fake.connectionStatus.connected, false);
    world.clock.now += 5 * MINUTE;
    await world.monitor.runCycle();
    assert.equal(calls.length, 4, 'no retry within 10 minutes');
    world.clock.now += HOUR;
    await world.monitor.runCycle();
    assert.deepEqual(paths(calls.slice(4)), ['/version', '/dataset?id=inc-6-RDD&span=short']);
  } finally {
    await world.cleanup();
  }
});

test('a reference older than 3 weeks is replaced without firing', async () => {
  const state = { publication: 'previous' };
  const world = await createWorld({
    created: ['76'],
    config: { areas: ['76'] },
    fetch: fixtureFetch({ state }),
  });
  try {
    // As if the area had been followed long ago, at another level.
    world.monitor.seen['76:ari'] = { week: 202630, value: 10 };
    state.publication = 'latest';
    world.clock.now += HOUR;
    await world.monitor.runCycle();
    assert.deepEqual(
      world.fake.sceneEvents.filter((e) => e.data.disease === 'ari'),
      [],
    );
    assert.deepEqual(world.monitor.seen['76:ari'], { week: 202643, value: 196 });
  } finally {
    await world.cleanup();
  }
});
