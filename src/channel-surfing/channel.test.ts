/// <reference types="node" />
import { test } from 'node:test';
import { equal, ok } from 'node:assert/strict';
import { BUILD_CHANNEL, parseChannelName, prChannel, surfLink } from './channel.ts';

test('accepts production and pr-<positive integer>', () => {
  for (const name of ['production', 'pr-1', 'pr-12', 'pr-9999999']) {
    equal(parseChannelName(name), name);
  }
});

test('rejects anything outside the allowlist', () => {
  const rejected: unknown[] = [
    '',
    'pr-0',
    'pr-01',
    'pr-abc',
    'pr-',
    'PR-1',
    'Production',
    'pr-1; rm',
    'pr-1\n',
    ' pr-1',
    'pr-12345678',
    'staging',
    'main',
    12,
    null,
    undefined,
    ['pr-1'],
    { channel: 'pr-1' },
  ];
  for (const raw of rejected) {
    equal(parseChannelName(raw), null, `expected ${JSON.stringify(raw)} to be rejected`);
  }
});

test('builds PR channels only from positive integers', () => {
  equal(prChannel(42), 'pr-42');
  equal(prChannel(0), null);
  equal(prChannel(-3), null);
  equal(prChannel(1.5), null);
  equal(prChannel(Number.NaN), null);
});

test('build channel is production', () => {
  equal(BUILD_CHANNEL, 'production');
});

test('surf link deep-links into the surf route', () => {
  const channel = parseChannelName('pr-12');
  ok(channel);
  equal(surfLink(channel), 'channelsurfing://surf?channel=pr-12');
  equal(surfLink(BUILD_CHANNEL), 'channelsurfing://surf?channel=production');
});
