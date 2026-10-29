// -----------------------------------------------------------------------------
// The `epidemics` widget and the `get_weekly_summary` scene action, through
// the real wiring (the fake Gladys calls the registered handlers).
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateWidgetContent } from '@gladysassistant/integration-sdk';
import { GET_WEEKLY_SUMMARY } from '../src/scenes.js';
import { WIDGET_KEY } from '../src/monitor.js';
import { createWorld } from './helpers/world.js';

const LANGS = ['en', 'fr', 'de', 'es'];

async function widget(world, request) {
  const answer = await world.fake.widgetGet(WIDGET_KEY, request);
  assert.equal(answer.success, true, JSON.stringify(answer));
  return answer.data.content;
}

async function summary(world, fields) {
  const answer = await world.fake.sceneAction(GET_WEEKLY_SUMMARY, fields);
  if (!answer.success) {
    throw new Error(JSON.stringify(answer));
  }
  return answer.data.outputs;
}

function valid(content) {
  assert.deepEqual(validateWidgetContent(content), [], JSON.stringify(content));
  const texts = content.components.filter((c) => c.type === 'text');
  assert.ok(content.components.length <= 8 && texts.length <= 2);
}

test('an area: heading, one line per disease, week and source', async () => {
  const world = await createWorld({ created: ['76'], config: { areas: ['76'] } });
  try {
    for (const language of LANGS) {
      const content = await widget(world, { settings: {}, language });
      valid(content);
    }
    const content = await widget(world, { settings: {}, language: 'fr' });
    const [heading, status, caption] = content.components;
    assert.equal(heading.text, 'Device 76');
    assert.deepEqual(
      status.items.map((i) => [i.label, i.value, i.color]),
      [
        ['Infections respiratoires', '196 · en hausse', 'warning'],
        ['Diarrhée aiguë', '58 · en hausse', 'warning'],
        ['Varicelle', '4 · stable', 'neutral'],
      ],
    );
    assert.equal(caption.text, 'Semaine 43 · pour 100 000 hab. · Sentinelles');
  } finally {
    await world.cleanup();
  }
});

test('settings: one area, some diseases, no caption', async () => {
  const world = await createWorld({ created: ['76', '11'], config: { areas: ['76', '11'] } });
  try {
    const area = world.gladys.externalIds('area', '11').device;
    const content = await widget(world, {
      settings: { area, diseases: ['diarrhea'], show_source: false },
      language: 'en',
    });
    valid(content);
    assert.equal(content.components.length, 2);
    assert.deepEqual(
      content.components[1].items.map((i) => [i.label, i.value, i.color]),
      [['Acute diarrhoea', '46 · falling', 'success']],
    );
  } finally {
    await world.cleanup();
  }
});

test('no area created, or an area no longer followed', async () => {
  const world = await createWorld({ config: { areas: ['76'] } });
  try {
    const empty = await widget(world, { settings: {}, language: 'de' });
    valid(empty);
    assert.match(empty.components[0].text, /^Noch kein Gebiet/);
    const gone = await widget(world, {
      settings: { area: world.gladys.externalIds('area', '94').device },
      language: 'es',
    });
    assert.equal(gone.components[0].text, 'Esta zona ya no se sigue.');
  } finally {
    await world.cleanup();
  }
});

test('the scene action sums the week up in the configured language', async () => {
  const world = await createWorld({
    created: ['76', 'FR'],
    config: { areas: ['76', 'FR'], language: 'fr' },
  });
  try {
    const first = await summary(world, {});
    assert.equal(
      first.summary,
      'Device 76, semaine 43 (cas pour 100 000 habitants) : Infections respiratoires 196 (en hausse), Diarrhée aiguë 58 (en hausse), Varicelle 4 (stable).',
    );
    assert.equal(first.week, 43);
    assert.equal(first.ari_incidence, 196);
    const france = await summary(world, {
      area: world.gladys.externalIds('area', 'FR').device,
    });
    assert.equal(france.area_name, 'Device FR');
    assert.equal(france.diarrhea_incidence, 58);
    await assert.rejects(
      summary(world, {
        area: world.gladys.externalIds('area', '94').device,
      }),
    );
  } finally {
    await world.cleanup();
  }
});
