'use strict';

const crypto = require('crypto');
const db = require('../db');

const FIFTEEN_MINUTES = 15 * 60 * 1000;
const ONE_DAY = 24 * 60 * 60 * 1000;
const RETENTION = 7 * ONE_DAY;

function normalizePhone(value) {
  let phone = String(value || '').trim().replace(/[^\d+]/g, '');
  if (phone.startsWith('+84')) phone = `0${phone.slice(3)}`;
  else if (phone.startsWith('84') && phone.length >= 10) phone = `0${phone.slice(2)}`;
  return phone.replace(/\D/g, '').slice(0, 12);
}

function isValidVietnamesePhone(phone) {
  return /^0\d{8,10}$/.test(phone) && !/^(\d)\1+$/.test(phone);
}

function isValidName(value) {
  const name = String(value || '').trim();
  const letters = name.match(/\p{L}/gu) || [];
  return name.length >= 2
    && name.length <= 100
    && letters.length >= 2
    && !/(?:https?:\/\/|www\.|@)/i.test(name)
    && !/(.)\1{5,}/u.test(name);
}

function assessFormTiming(value, now = Date.now()) {
  if (value === null || value === undefined || String(value).trim() === '') return { ok: false, reason: 'missing' };
  const startedAt = Number(value);
  if (!Number.isFinite(startedAt)) return { ok: false, reason: 'missing' };
  const elapsed = now - startedAt;
  if (elapsed < 800) return { ok: false, reason: 'too-fast' };
  if (elapsed > 4 * 60 * 60 * 1000 || elapsed < 0) return { ok: false, reason: 'expired' };
  return { ok: true, elapsed };
}

class ContactSpamGuard {
  constructor({ database = db, secret, now = () => Date.now() } = {}) {
    this.db = database;
    this.now = now;
    this.secret = secret || process.env.CONTACT_SPAM_SECRET || process.env.SESSION_SECRET || 'soldream-contact-rate-limit';
    this.countIp = database.prepare('SELECT COUNT(*) count FROM contact_attempts WHERE ip_hash=? AND created_at_ms>=?');
    this.countPhone = database.prepare('SELECT COUNT(*) count FROM contact_attempts WHERE phone_hash=? AND created_at_ms>=?');
    this.insert = database.prepare('INSERT INTO contact_attempts (ip_hash,phone_hash,outcome,created_at_ms) VALUES (?,?,?,?)');
    this.prune = database.prepare('DELETE FROM contact_attempts WHERE created_at_ms<?');
    this.operationsUntilPrune = 0;
  }

  fingerprint(value) {
    if (!value) return '';
    return crypto.createHmac('sha256', this.secret).update(String(value)).digest('hex');
  }

  consume(ip, phone, outcome = 'attempt') {
    const now = this.now();
    const ipHash = this.fingerprint(ip || 'unknown');
    const phoneHash = this.fingerprint(phone);
    const recentIp = this.countIp.get(ipHash, now - FIFTEEN_MINUTES).count;
    const dailyIp = this.countIp.get(ipHash, now - ONE_DAY).count;
    const dailyPhone = phoneHash ? this.countPhone.get(phoneHash, now - ONE_DAY).count : 0;
    const allowed = recentIp < 5 && dailyIp < 15 && dailyPhone < 4;

    this.insert.run(ipHash, phoneHash, allowed ? outcome : 'rate-limited', now);
    this.operationsUntilPrune += 1;
    if (this.operationsUntilPrune >= 25) {
      this.prune.run(now - RETENTION);
      this.operationsUntilPrune = 0;
    }

    return { allowed, retryAfterSeconds: allowed ? 0 : 15 * 60 };
  }
}

module.exports = {
  ContactSpamGuard,
  normalizePhone,
  isValidVietnamesePhone,
  isValidName,
  assessFormTiming,
};
