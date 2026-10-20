'use strict';
const { sourcePolicy, allowedResearchItem } = require('./researchPolicy');
const { WEEK_MS, canonicalNoticeUrl } = require('./schoolNotices');
const KEY = 'weekly_school_notices_20261020_v1';
function applySchoolNoticePolicy(db) {
  if (db.prepare('SELECT 1 FROM system_meta WHERE key=?').get(KEY)) return;
  return db.transaction(() => {
    let schools = 0, seen = 0, baselinedLists = 0;
    const entries = require('../data/school-notice-entrypoints.json');
    const baseline = require('../data/school-notice-baseline-20261020.json');
    const update = db.prepare('UPDATE research_sources SET notice_urls=?,next_crawl_at_ms=? WHERE id=?');
    const mark = db.prepare('INSERT OR IGNORE INTO research_school_seen(source_id,url,first_seen_at_ms) VALUES (?,?,?)');
    const saveList = db.prepare(`INSERT OR IGNORE INTO research_school_lists
      (source_id,url,baseline_at_ms,etag,last_modified,last_checked_at_ms) VALUES (?,?,?,?,?,?)`);
    for (const source of db.prepare('SELECT * FROM research_sources').all()) {
      if (sourcePolicy(source).group !== 'schools') continue;
      const urls = entries[new URL(source.url).hostname] || [];
      if (urls.some(url => !allowedResearchItem(source, { url }))) throw new Error('Invalid school notice entrypoint');
      const date = String(source.last_crawled_at || '').replace(' ', 'T');
      const parsed = Date.parse(date && !/(?:Z|[+-]\d\d:\d\d)$/.test(date) ? date + 'Z' : date);
      update.run(JSON.stringify(urls), (Number.isFinite(parsed) ? parsed : Date.now()) + WEEK_MS, source.id);
      for (const item of db.prepare('SELECT url FROM research_items WHERE source_id=?').all(source.id)) {
        const url = canonicalNoticeUrl(item.url); if (url) seen += mark.run(source.id, url, Date.now()).changes;
      }
      for (const list of baseline.lists.filter(list => list.schoolHost === new URL(source.url).hostname
        && urls.includes(list.url) && list.status === 200 && list.urls.length && Number.isFinite(list.capturedAtMs))) {
        for (const value of list.urls) {
          const url = canonicalNoticeUrl(value);
          if (url && allowedResearchItem(source, { url })) seen += mark.run(source.id, url, list.capturedAtMs).changes;
        }
        baselinedLists += saveList.run(source.id, list.url, list.capturedAtMs, list.etag || '', list.lastModified || '', list.capturedAtMs).changes;
      }
      schools++;
    }
    const result = { schools, seededSeenLinks: seen, baselinedLists, intervalMs: WEEK_MS };
    db.prepare('INSERT INTO system_meta(key,value,updated_at) VALUES (?,?,?)').run(KEY, JSON.stringify(result), new Date().toISOString());
    return result;
  }).immediate();
}
module.exports = { applySchoolNoticePolicy };
