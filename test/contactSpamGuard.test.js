'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const db = require('../db');
const {
  ContactSpamGuard, normalizePhone, isValidVietnamesePhone, isValidName, assessFormTiming,
} = require('../lib/contactSpamGuard');

test('normalizes and validates Vietnamese consultation details', () => {
  assert.equal(normalizePhone('+84 364 648 282'), '0364648282');
  assert.equal(normalizePhone('0364.648.282'), '0364648282');
  assert.equal(isValidVietnamesePhone('0364648282'), true);
  assert.equal(isValidVietnamesePhone('0000000000'), false);
  assert.equal(isValidName('Nguyễn Văn An'), true);
  assert.equal(isValidName('https://spam.example'), false);
});

test('rejects forms submitted unrealistically fast or after expiry', () => {
  const now = 2_000_000_000_000;
  assert.equal(assessFormTiming(now - 2_000, now).ok, true);
  assert.equal(assessFormTiming(now - 100, now).reason, 'too-fast');
  assert.equal(assessFormTiming(now - (5 * 60 * 60 * 1000), now).reason, 'expired');
  assert.equal(assessFormTiming('', now).reason, 'missing');
});

test('persists rate limits by anonymized IP and phone', () => {
  const suffix = crypto.randomUUID();
  const now = 2_000_000_000_000;
  const guard = new ContactSpamGuard({ database: db, secret: `test-${suffix}`, now: () => now });
  const ip = `test-ip-${suffix}`;
  const phone = `test-phone-${suffix}`;
  const ipHash = guard.fingerprint(ip);
  const phoneHash = guard.fingerprint(phone);

  try {
    for (let index = 0; index < 4; index += 1) assert.equal(guard.consume(ip, phone).allowed, true);
    assert.equal(guard.consume(ip, phone).allowed, false);

    const restartedGuard = new ContactSpamGuard({ database: db, secret: `test-${suffix}`, now: () => now });
    assert.equal(restartedGuard.consume(ip, `another-${suffix}`).allowed, false);
  } finally {
    db.prepare('DELETE FROM contact_attempts WHERE ip_hash=? OR phone_hash=?').run(ipHash, phoneHash);
  }
});
