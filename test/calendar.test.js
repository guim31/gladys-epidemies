// -----------------------------------------------------------------------------
// ISO weeks and trends.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { latestOf, previousWeek, trendOf } from '../src/incidence.js';
import { mondayOf, weekText } from '../src/weeks.js';

test('Monday of an ISO week', () => {
  assert.equal(new Date(mondayOf(202643)).toISOString().slice(0, 10), '2026-10-19');
  assert.equal(new Date(mondayOf(202601)).toISOString().slice(0, 10), '2025-12-29');
  assert.equal(new Date(mondayOf(202053)).toISOString().slice(0, 10), '2020-12-28');
});

test('previous ISO week, across years of 52 and 53 weeks', () => {
  assert.equal(previousWeek(202643), 202642);
  assert.equal(previousWeek(202101), 202053);
  assert.equal(previousWeek(202601), 202552);
});

test('week texts in the four languages', () => {
  assert.equal(weekText(202643, 'en'), '43 (19 – 25 Oct 2026)');
  assert.equal(weekText(202643, 'fr'), '43 (19 – 25 oct. 2026)');
  assert.match(weekText(202643, 'de'), /^43 \(19 – 25\. Okt\. 2026\)$/);
  assert.match(weekText(202643, 'es'), /^43 \(19 – 25 oct 2026\)$/);
  assert.match(weekText(202601, 'fr'), /^1 \(29 déc\. – 4 janv\. 2026\)$/);
});

test('trend: 15 % and 5 per 100,000 at least', () => {
  assert.equal(trendOf(196, 135), 'rising');
  assert.equal(trendOf(115, 140), 'falling');
  assert.equal(trendOf(58, 55), 'stable');
  assert.equal(trendOf(4, 1), 'stable', 'small rates do not swing');
  assert.equal(trendOf(12, null), null);
});

test('latest week of an area, with the week before', () => {
  const datasets = {
    'inc-6-RDD': [
      { week: 202642, area: '76', inc100: 47 },
      { week: 202643, area: '76', inc100: 58 },
      { week: 202643, area: '11', inc100: 46 },
    ],
  };
  assert.deepEqual(latestOf(datasets, '76', 'diarrhea'), {
    week: 202643,
    value: 58,
    previous: 47,
    trend: 'rising',
  });
  assert.equal(latestOf(datasets, '11', 'diarrhea').trend, null);
  assert.equal(latestOf(datasets, 'FR', 'diarrhea'), null);
});
