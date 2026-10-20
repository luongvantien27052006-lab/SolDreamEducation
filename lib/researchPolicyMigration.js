'use strict';
const { sourcePolicy, nextSourceCrawl } = require('./researchPolicy');
const KEY = 'partner_school_monthly_research_20261020_v1';
function applyResearchPolicy(db) {
  if (db.prepare('SELECT 1 FROM system_meta WHERE key=?').get(KEY)) return;
  return db.transaction(() => {
    const keywords = 'international admission,foreign student,admission guide,tuyển sinh quốc tế,học phí,học bổng,ký túc xá,visa,외국인,유학생,입학,모집요강,등록금,장학금,기숙사';
    const insert = db.prepare(`INSERT OR IGNORE INTO research_sources
      (name,url,source_type,language,keywords,active,crawl_delay_ms,auto_publish_non_school)
      VALUES (?,?,'university','ko,en',?,1,1500,1)`);
    for (const source of require('../data/partner-research-sources.json')) {
      if (sourcePolicy(source).group !== 'schools') throw new Error('Partner source outside profile');
      insert.run(source.name, source.url, keywords);
    }
    const counts = { schools: 0, monthly: 0, disabled: 0 };
    const interval = Math.max(3600000, Number(process.env.RESEARCH_BOT_INTERVAL_MS) || 7 * 24 * 3600000);
    const update = db.prepare('UPDATE research_sources SET active=?,next_crawl_at_ms=? WHERE id=?');
    for (const source of db.prepare('SELECT * FROM research_sources').all()) {
      const policy = sourcePolicy(source);
      counts[policy.group]++;
      const parsed = Date.parse(source.last_crawled_at ? source.last_crawled_at.replace(' ', 'T') + 'Z' : '');
      const baseline = Number.isFinite(parsed) ? parsed : Date.now();
      const next = policy.group === 'schools' && !source.last_crawled_at ? 0 : nextSourceCrawl(source, baseline, interval);
      update.run(policy.allowed ? source.active : 0, policy.allowed ? next : 0, source.id);
    }
    db.prepare('INSERT INTO system_meta(key,value,updated_at) VALUES (?,?,?)').run(KEY, JSON.stringify(counts), new Date().toISOString());
    return counts;
  }).immediate();
}
module.exports = { applyResearchPolicy };
