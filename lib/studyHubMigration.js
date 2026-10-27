'use strict';

// Only replace the previous shipped copy. Editors' subsequent changes win.
function applyStudyHubCopy(db) {
  const key = 'nationwide_study_hub_copy_20261028_v1';
  if (db.prepare('SELECT 1 FROM system_meta WHERE key=?').get(key)) return null;
  return db.transaction(() => {
    let updated = 0, preserved = 0;
    for (const row of require('../data/study-hub-copy-20261028.json')) {
      const current = db.prepare('SELECT value FROM site_copy WHERE key=?').get(row.key);
      if (!current) continue;
      if (current.value === row.expectedValue) {
        updated += db.prepare('UPDATE site_copy SET value=?,default_value=?,updated_at=CURRENT_TIMESTAMP WHERE key=? AND value=?')
          .run(row.value, row.value, row.key, row.expectedValue).changes;
      } else {
        db.prepare('UPDATE site_copy SET default_value=? WHERE key=? AND default_value IS NOT ?').run(row.value, row.key, row.value);
        if (current.value !== row.value) preserved++;
      }
    }
    db.prepare('INSERT INTO system_meta(key,value) VALUES (?,?)').run(key, JSON.stringify({updated,preserved}));
    return {updated,preserved};
  })();
}
module.exports = {applyStudyHubCopy};
