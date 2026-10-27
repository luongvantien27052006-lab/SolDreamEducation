'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const KEY = 'editorial_study_guides_20261028_v1';

function contentHash(content) {
  return crypto.createHash('sha256').update(String(content)).digest('hex');
}

function expandedContent(row, edit) {
  const addition = fs.readFileSync(path.join(__dirname, '../data/editorial-guides-20261028', edit.file), 'utf8').trim();
  if (!addition || /<(?:script|iframe|form)\b/i.test(addition)) throw new Error('Invalid editorial addition: ' + edit.file);
  if (!edit.before) return {content: row.content + '\n' + addition, addition, inserted: '\n' + addition};
  const index = row.content.indexOf(edit.before);
  if (index < 0 || row.content.indexOf(edit.before, index + edit.before.length) >= 0) throw new Error('Editorial insertion point changed: ' + edit.slug);
  return {content: row.content.slice(0, index) + addition + '\n' + row.content.slice(index), addition, inserted: addition + '\n'};
}

function applyEditorialGuides(db) {
  if (db.prepare('SELECT 1 FROM system_meta WHERE key=?').get(KEY)) return null;
  return db.transaction(() => {
    const result = {updated: [], skipped: []};
    for (const edit of require('../data/editorial-guides-20261028.json')) {
      const row = db.prepare('SELECT * FROM programs WHERE slug=?').get(edit.slug);
      if (!row || row.title !== edit.expectedTitle || contentHash(row.content) !== edit.expectedContentHash) {
        result.skipped.push({slug: edit.slug, reason: 'CMS title or content changed since editorial snapshot'});
        continue;
      }
      const {content, inserted} = expandedContent(row, edit);
      // Every byte of the existing article, including tables and terms, remains.
      if (content.replace(inserted, '') !== row.content) throw new Error('Original content would change: ' + edit.slug);
      const previousSources = new Set(String(row.source_urls || '').split(/\r?\n/).map(value => value.trim()).filter(Boolean));
      const additionalSources = edit.addSources.filter(url => !previousSources.has(url));
      const sources = String(row.source_urls || '') + (additionalSources.length ? (row.source_urls ? '\n' : '') + additionalSources.join('\n') : '');
      const now = new Date().toISOString();
      // Never write publication dates, fees, SEO descriptions, authors or FAQ.
      const changed = db.prepare('UPDATE programs SET content=?,source_urls=?,updated_at=?,content_modified_at=? WHERE id=? AND content=?')
        .run(content, sources, now, now, row.id, row.content).changes;
      if (changed !== 1) throw new Error('Concurrent editorial update: ' + edit.slug);
      result.updated.push({id: row.id, slug: edit.slug, beforeHash: contentHash(row.content), afterHash: contentHash(content)});
    }
    db.prepare('INSERT INTO system_meta(key,value) VALUES (?,?)').run(KEY, JSON.stringify(result));
    return result;
  })();
}

module.exports = {applyEditorialGuides, contentHash, expandedContent};
