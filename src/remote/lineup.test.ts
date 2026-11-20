/// <reference types="node" />
import { test } from 'node:test';
import { deepEqual, equal } from 'node:assert/strict';
import { LINEUP, stepChannel, toggleFavorite, tuneTo } from './lineup.ts';

test('channel up and down wrap around the lineup', () => {
  const last = LINEUP.length - 1;
  equal(stepChannel(0, 1), 1);
  equal(stepChannel(last, 1), 0);
  equal(stepChannel(0, -1), last);
});

test('tunes only to channels in the lineup', () => {
  deepEqual(tuneTo('7'), { ok: true, index: 2 });
  deepEqual(tuneTo(' 11 '), { ok: true, index: 4 });
  deepEqual(tuneTo('5'), { ok: false, message: 'Channel 5 is off the air.' });
  for (const bad of ['', 'abc', '-2', '2.5', '1234']) {
    deepEqual(tuneTo(bad), { ok: false, message: 'Enter a channel number.' });
  }
});

test('favorites toggle and stay sorted', () => {
  deepEqual(toggleFavorite([], 9), [9]);
  deepEqual(toggleFavorite([9], 4), [4, 9]);
  deepEqual(toggleFavorite([4, 9], 9), [4]);
});
