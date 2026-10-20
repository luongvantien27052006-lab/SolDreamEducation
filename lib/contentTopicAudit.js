'use strict';
const crypto = require('crypto');
const { normalizeTopic } = require('./contentTopics');

const MIGRATION_KEY = 'reviewed_content_topics_20261020_v1';
function contentFingerprint(type, row) {
  const fields = type === 'post'
    ? ['id', 'title', 'excerpt', 'content', 'category', 'slug']
    : ['id', 'title', 'url', 'excerpt', 'source_text', 'suggested_section', 'published_post_id', 'source_type'];
  return crypto.createHash('sha256').update(JSON.stringify(fields.map((key) => row[key] ?? null))).digest('hex');
}

// The manifest records an editorial review of the production inventory. A later
// administrator edit wins over this snapshot; never silently reclassify it.
function applyContentTopicAudit(db, manifest) {
  if (db.prepare('SELECT 1 FROM system_meta WHERE key=?').get(MIGRATION_KEY)) return null;
  db.exec(`CREATE TABLE IF NOT EXISTS content_topic_audit (
    migration_key TEXT NOT NULL, content_type TEXT NOT NULL, content_id INTEGER NOT NULL,
    previous_topic TEXT, reviewed_topic TEXT NOT NULL, reason TEXT NOT NULL,
    status TEXT NOT NULL, reviewed_hash TEXT NOT NULL, previous_state TEXT NOT NULL,
    applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    PRIMARY KEY(migration_key,content_type,content_id)
  )`);
  return db.transaction(() => {
    const findPost = db.prepare('SELECT * FROM posts WHERE id=?');
    const findResearch = db.prepare(`SELECT i.*,s.source_type FROM research_items i
      JOIN research_sources s ON s.id=i.source_id WHERE i.id=?`);
    const postUpdate = db.prepare('UPDATE posts SET topic=? WHERE id=?');
    const researchUpdate = db.prepare('UPDATE research_items SET topic=? WHERE id=?');
    const detachResearch = db.prepare(`UPDATE research_items SET published_post_id=NULL,status='pending',optimization_note=? WHERE id=?`);
    const verifiedModified = db.prepare("UPDATE posts SET content_modified_at=? WHERE id=? AND content_modified_at='' AND updated_at=?");
    const log = db.prepare(`INSERT INTO content_topic_audit
      (migration_key,content_type,content_id,previous_topic,reviewed_topic,reason,status,reviewed_hash,previous_state)
      VALUES (?,?,?,?,?,?,?,?,?)`);
    const counts = { reviewed: 0, changed: 0, skipped: 0, postsChanged: 0, researchChanged: 0, linksCorrected: 0 };
    for (const entry of manifest.entries) {
      if (!normalizeTopic(entry.topic) || !['post', 'research'].includes(entry.type)) throw new Error('Invalid topic audit entry');
      const row = (entry.type === 'post' ? findPost : findResearch).get(entry.id);
      let status = 'unchanged';
      if (!row) status = 'missing';
      else if (contentFingerprint(entry.type, row) !== entry.hash) status = 'content_changed';
      else if (row.topic !== entry.previousTopic && row.topic !== entry.topic) status = 'topic_changed';
      else if (row.topic !== entry.topic) {
        (entry.type === 'post' ? postUpdate : researchUpdate).run(entry.topic, entry.id);
        status = 'changed';
      }
      log.run(MIGRATION_KEY, entry.type, entry.id, row?.topic ?? null, entry.topic, entry.reason, status, entry.hash,
        JSON.stringify(row ? { topic: row.topic, published_post_id: row.published_post_id, status: row.status, optimization_note: row.optimization_note } : null));
      if (entry.type === 'research' && entry.detachIncorrectLink && ['changed', 'unchanged'].includes(status)) {
        detachResearch.run('Tạm dừng tự đăng: Mục nguồn đã bị gắn với bài khác nội dung. Đã gỡ liên kết sai trong đợt rà soát 20/10/2026; cần biên tập riêng trước khi xuất bản.', entry.id);
        counts.linksCorrected++;
      }
      if (entry.type === 'post' && entry.verifiedModifiedAt && ['changed', 'unchanged'].includes(status)) {
        verifiedModified.run(entry.verifiedModifiedAt, entry.id, entry.verifiedLegacyUpdatedAt);
      }
      counts.reviewed++;
      if (status === 'changed') {
        counts.changed++;
        counts[entry.type === 'post' ? 'postsChanged' : 'researchChanged']++;
      } else if (status !== 'unchanged') counts.skipped++;
    }
    db.prepare('INSERT INTO system_meta(key,value,updated_at) VALUES (?,?,?)')
      .run(MIGRATION_KEY, JSON.stringify(counts), new Date().toISOString());
    return counts;
  }).immediate();
}

module.exports = { contentFingerprint, applyContentTopicAudit, MIGRATION_KEY };
