'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { getResearchBotIntervalMs, getNextResearchDelay, isResearchRunDue } = require('../lib/researchScheduler');

test('automatic research defaults to once every seven days', () => {
  assert.equal(getResearchBotIntervalMs({}), 7 * 24 * 60 * 60 * 1000);
});

test('an explicit valid research interval remains configurable', () => {
  assert.equal(getResearchBotIntervalMs({ RESEARCH_BOT_INTERVAL_MS: String(10 * 24 * 60 * 60 * 1000) }), 10 * 24 * 60 * 60 * 1000);
});

test('scheduler waits for the persisted weekly deadline after a restart', () => {
  const interval = 7 * 24 * 60 * 60 * 1000;
  const now = 2_000_000_000;
  assert.equal(getNextResearchDelay(now - interval + 60_000, 60_000, interval, now), 60_000);
  assert.equal(getNextResearchDelay(now - interval - 60_000, 60_000, interval, now), 10_000);
});

test('first scheduled research still uses its startup delay', () => {
  assert.equal(getNextResearchDelay(0, 60_000, 7 * 24 * 60 * 60 * 1000, 2_000_000_000), 60_000);
});

test('research is due exactly at or after the persisted interval', () => {
  const interval = 7 * 24 * 60 * 60 * 1000;
  const now = 2_000_000_000;
  assert.equal(isResearchRunDue(now - interval + 1, interval, now), false);
  assert.equal(isResearchRunDue(now - interval, interval, now), true);
});
