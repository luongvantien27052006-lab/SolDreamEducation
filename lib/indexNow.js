'use strict';

const crypto = require('crypto');
const db = require('../db');
const { SITE_URL, abs } = require('./seo');

function getPersistentIndexNowKey() {
  const configured = String(process.env.INDEXNOW_KEY || '').trim();
  if (/^[a-z0-9-]{8,128}$/i.test(configured)) return configured;
  const stored = String(db.prepare("SELECT value FROM system_meta WHERE key='indexnow_key'").get()?.value || '').trim();
  if (/^[a-z0-9-]{8,128}$/i.test(stored)) return stored;

  // Đây là mã xác minh công khai, không phải khóa bí mật. Lưu trong SQLite để
  // IndexNow tiếp tục hoạt động ổn định dù quản trị viên không cấu hình .env.
  const generated = crypto.randomBytes(24).toString('hex');
  db.prepare(`INSERT INTO system_meta (key,value,updated_at) VALUES ('indexnow_key',?,datetime('now','localtime'))
    ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at`).run(generated);
  return generated;
}

const INDEXNOW_KEY = getPersistentIndexNowKey();

function buildIndexNowPayload(paths = [], key = INDEXNOW_KEY) {
  const host = new URL(SITE_URL).host;
  const urlList = [...new Set(paths.map((path) => path.startsWith('http') ? path : abs(path)))]
    .filter((url) => {
      try { return new URL(url).host === host; } catch (error) { return false; }
    }).slice(0, 10000);
  return { host, key, keyLocation: `${SITE_URL}/indexnow-key.txt`, urlList };
}

async function notifyIndexNow(paths = []) {
  if (!INDEXNOW_KEY) return { skipped: true, reason: 'INDEXNOW_KEY is not configured' };
  const payload = buildIndexNowPayload(paths);
  if (!payload.urlList.length) return { skipped: true, reason: 'No valid URLs' };
  try {
    const response = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST', headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify(payload), signal: AbortSignal.timeout(5000),
    });
    return { ok: response.ok, status: response.status };
  } catch (error) {
    console.warn('[IndexNow] Không thể gửi URL:', error.message);
    return { ok: false, error: error.message };
  }
}

function queueIndexNow(paths) {
  void notifyIndexNow(paths);
}

module.exports = { INDEXNOW_KEY, buildIndexNowPayload, notifyIndexNow, queueIndexNow };
