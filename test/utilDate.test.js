'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { dateInputToLocalDateTime, decorate } = require('../lib/util');

test('custom article publication date accepts a valid date-only value', () => {
  assert.equal(dateInputToLocalDateTime('2026-10-01'), '2026-10-01 12:00:00');
  assert.equal(decorate({ title: 'Bài', content: '', created_at: '2026-10-01 12:00:00' }).dateFull, '01/10/2026');
});

test('custom article publication date allows blank fallback and rejects invalid dates', () => {
  assert.equal(dateInputToLocalDateTime(''), '');
  assert.equal(dateInputToLocalDateTime('2026-02-29'), null);
  assert.equal(dateInputToLocalDateTime('2026-10-01T00:00'), null);
});
