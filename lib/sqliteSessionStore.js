'use strict';

const session = require('express-session');
const db = require('../db');

class SQLiteSessionStore extends session.Store {
  constructor({ ttlMs = 30 * 60 * 1000 } = {}) {
    super();
    this.ttlMs = Math.max(1000, Number(ttlMs) || 30 * 60 * 1000);
    this.getStatement = db.prepare('SELECT session_json,expires_at FROM web_sessions WHERE sid=?');
    this.setStatement = db.prepare(`INSERT INTO web_sessions (sid,session_json,expires_at,updated_at)
      VALUES (?,?,?,datetime('now','localtime'))
      ON CONFLICT(sid) DO UPDATE SET session_json=excluded.session_json,expires_at=excluded.expires_at,updated_at=excluded.updated_at`);
    this.deleteStatement = db.prepare('DELETE FROM web_sessions WHERE sid=?');
    this.clearStatement = db.prepare('DELETE FROM web_sessions');
    this.pruneStatement = db.prepare('DELETE FROM web_sessions WHERE expires_at<=?');
    this.countStatement = db.prepare('SELECT COUNT(*) count FROM web_sessions WHERE expires_at>?');
    this.allStatement = db.prepare('SELECT session_json FROM web_sessions WHERE expires_at>?');
    this.operationsUntilPrune = 0;
  }

  expiryFor(sessionValue) {
    if (sessionValue?.cookie?.expires) {
      const cookieExpiry = new Date(sessionValue.cookie.expires).getTime();
      if (Number.isFinite(cookieExpiry)) return cookieExpiry;
    }
    return Date.now() + this.ttlMs;
  }

  pruneIfNeeded() {
    this.operationsUntilPrune += 1;
    if (this.operationsUntilPrune < 30) return;
    this.operationsUntilPrune = 0;
    this.pruneStatement.run(Date.now());
  }

  get(sid, callback) {
    try {
      const row = this.getStatement.get(sid);
      if (!row) return process.nextTick(callback, null, null);
      if (row.expires_at <= Date.now()) {
        this.deleteStatement.run(sid);
        return process.nextTick(callback, null, null);
      }
      const value = JSON.parse(row.session_json);
      return process.nextTick(callback, null, value);
    } catch (error) { return process.nextTick(callback, error); }
  }

  set(sid, sessionValue, callback = () => {}) {
    try {
      this.setStatement.run(sid, JSON.stringify(sessionValue), this.expiryFor(sessionValue));
      this.pruneIfNeeded();
      return process.nextTick(callback, null);
    } catch (error) { return process.nextTick(callback, error); }
  }

  touch(sid, sessionValue, callback = () => {}) {
    return this.set(sid, sessionValue, callback);
  }

  destroy(sid, callback = () => {}) {
    try { this.deleteStatement.run(sid); return process.nextTick(callback, null); }
    catch (error) { return process.nextTick(callback, error); }
  }

  clear(callback = () => {}) {
    try { this.clearStatement.run(); return process.nextTick(callback, null); }
    catch (error) { return process.nextTick(callback, error); }
  }

  length(callback) {
    try { return process.nextTick(callback, null, this.countStatement.get(Date.now()).count); }
    catch (error) { return process.nextTick(callback, error); }
  }

  all(callback) {
    try {
      const rows = this.allStatement.all(Date.now()).map((row) => JSON.parse(row.session_json));
      return process.nextTick(callback, null, rows);
    } catch (error) { return process.nextTick(callback, error); }
  }
}

module.exports = SQLiteSessionStore;
