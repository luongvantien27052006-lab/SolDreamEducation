'use strict';
const db = require('../db');

function placementForPath(path) { if (path === '/') return 'home'; if (/^\/(?:tin-tuc|du-hoc|truong-dai-hoc|khoa-hoc)\//.test(path)) return 'content'; return 'other'; }
function localSqlDate(now) {
  const pad = (value) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}
function getActivePopup(path, now = new Date()) {
  const current = localSqlDate(now); const placement = placementForPath(path);
  return db.prepare(`SELECT * FROM popups WHERE active=1 AND system_key='' AND (starts_at='' OR starts_at<=?) AND (ends_at='' OR ends_at>=?) AND (placement='sitewide' OR placement=?) ORDER BY id DESC LIMIT 1`).get(current, current, placement) || null;
}

function getLeadPopup(path, now = new Date()) {
  if (placementForPath(path) !== 'content') return null;
  const current = localSqlDate(now);
  return db.prepare(`SELECT * FROM popups WHERE system_key='lead_capture' AND active=1 AND (starts_at='' OR starts_at<=?) AND (ends_at='' OR ends_at>=?) LIMIT 1`).get(current, current) || null;
}

module.exports = { getActivePopup, getLeadPopup, placementForPath, localSqlDate };
