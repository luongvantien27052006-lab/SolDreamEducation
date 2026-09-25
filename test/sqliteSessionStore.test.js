'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const SQLiteSessionStore = require('../lib/sqliteSessionStore');

function invoke(store, method, ...args) {
  return new Promise((resolve, reject) => {
    store[method](...args, (error, value) => {
      if (error) reject(error);
      else resolve(value);
    });
  });
}

test('admin session persists between store instances and can be destroyed', async () => {
  const sid = `session-test-${crypto.randomUUID()}`;
  const firstStore = new SQLiteSessionStore({ ttlMs: 30 * 60 * 1000 });
  const restartedStore = new SQLiteSessionStore({ ttlMs: 30 * 60 * 1000 });
  const sessionValue = {
    admin: true,
    cookie: { expires: new Date(Date.now() + 60_000).toISOString(), maxAge: 60_000 }
  };

  try {
    await invoke(firstStore, 'set', sid, sessionValue);
    const loaded = await invoke(restartedStore, 'get', sid);
    assert.equal(loaded.admin, true);

    await invoke(restartedStore, 'destroy', sid);
    assert.equal(await invoke(firstStore, 'get', sid), null);
  } finally {
    await invoke(firstStore, 'destroy', sid);
  }
});

test('expired admin session is rejected and removed', async () => {
  const sid = `expired-session-test-${crypto.randomUUID()}`;
  const store = new SQLiteSessionStore({ ttlMs: 30 * 60 * 1000 });

  try {
    await invoke(store, 'set', sid, {
      admin: true,
      cookie: { expires: new Date(Date.now() - 1_000).toISOString(), maxAge: 0 }
    });
    assert.equal(await invoke(store, 'get', sid), null);
  } finally {
    await invoke(store, 'destroy', sid);
  }
});
