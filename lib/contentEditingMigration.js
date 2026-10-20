'use strict';
function applyContentEditing(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS shared_blocks (
    key TEXT PRIMARY KEY, zone TEXT NOT NULL, title TEXT NOT NULL DEFAULT '', eyebrow TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL DEFAULT '', link_url TEXT NOT NULL DEFAULT '',link_label TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0,active INTEGER NOT NULL DEFAULT 1,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS content_revisions (id INTEGER PRIMARY KEY,table_name TEXT NOT NULL,record_id TEXT NOT NULL,
      action TEXT NOT NULL,snapshot TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE INDEX IF NOT EXISTS revisions_record ON content_revisions(table_name,record_id,id);`);
  for (const table of ['posts','programs']) {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all().map(c=>c.name);
    const fields = { show_summary:'INTEGER NOT NULL DEFAULT 0',show_sources:'INTEGER NOT NULL DEFAULT 1',faq_mode:"TEXT NOT NULL DEFAULT 'off'",
      cover_alt:"TEXT NOT NULL DEFAULT ''",cover_caption:"TEXT NOT NULL DEFAULT ''",summary_title:"TEXT NOT NULL DEFAULT 'Tóm tắt'",source_note:"TEXT NOT NULL DEFAULT ''",editorial_locked:'INTEGER NOT NULL DEFAULT 0',author_type:"TEXT NOT NULL DEFAULT 'organization'" };
    for(const [key,type] of Object.entries(fields)) if(!cols.includes(key))db.exec(`ALTER TABLE ${table} ADD COLUMN ${key} ${type}`);
  }
  const courseCols=db.prepare('PRAGMA table_info(courses)').all().map(c=>c.name);
  for(const col of ['seo_title','meta_description'])if(!courseCols.includes(col))db.exec(`ALTER TABLE courses ADD COLUMN ${col} TEXT NOT NULL DEFAULT ''`);
  db.exec(`CREATE TRIGGER IF NOT EXISTS posts_extra_content_modified AFTER UPDATE OF cover_alt,cover_caption,show_summary,show_sources,faq_mode,source_note,summary_title,source_urls ON posts
    WHEN OLD.cover_alt IS NOT NEW.cover_alt OR OLD.cover_caption IS NOT NEW.cover_caption OR OLD.show_summary IS NOT NEW.show_summary OR OLD.show_sources IS NOT NEW.show_sources OR OLD.faq_mode IS NOT NEW.faq_mode OR OLD.source_note IS NOT NEW.source_note OR OLD.summary_title IS NOT NEW.summary_title OR OLD.source_urls IS NOT NEW.source_urls BEGIN
    UPDATE posts SET content_modified_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=NEW.id; END;`);
  // SQLite triggers retain both CMS and automatic edits, including old media paths.
  for(const table of ['posts','programs','courses','faqs','about_sections','shared_blocks','testimonials']) {
    const cols=db.prepare(`PRAGMA table_info(${table})`).all().map(c=>c.name);
    const id=table==='shared_blocks'?'key':'id';
    const json=alias=>`json_object(${cols.map(c=>`'${c}',${alias}."${c}"`).join(',')})`;
    db.exec(`CREATE TRIGGER IF NOT EXISTS editing_${table}_update BEFORE UPDATE ON ${table}
      WHEN ${cols.map(c=>`OLD."${c}" IS NOT NEW."${c}"`).join(' OR ')} BEGIN
      INSERT INTO content_revisions(table_name,record_id,action,snapshot) VALUES ('${table}',OLD."${id}",'before-update',${json('OLD')}); END;
      CREATE TRIGGER IF NOT EXISTS editing_${table}_delete BEFORE DELETE ON ${table} BEGIN
      INSERT INTO content_revisions(table_name,record_id,action,snapshot) VALUES ('${table}',OLD."${id}",'before-delete',${json('OLD')}); END;`);
  }
  const key='content_editing_20261020_v1';if(db.prepare('SELECT 1 FROM system_meta WHERE key=?').get(key))return;
  db.transaction(()=>{
    const {sanitizeRichHtml}=require('./contentSanitizer');
    const insert=db.prepare('INSERT OR IGNORE INTO shared_blocks(key,zone,title,eyebrow,content,link_url,link_label,sort_order,active) VALUES (?,?,?,?,?,?,?,?,?)');
    for(const b of require('../data/editable-blocks.json'))insert.run(b.key,b.zone,b.title,b.eyebrow,sanitizeRichHtml(b.content),b.link_url||'',b.link_label||'',b.sort_order,b.active);
    for(const row of db.prepare('SELECT * FROM courses').all()){
      const f=JSON.parse(row.financials_json||'{}');if(!/hàn|korean/i.test(row.language))continue;
      const spec=f.tuition2026||f.classDetails||{};spec.classSize='8–10';spec.textbook='Vitamin';if(/^Vitamin$/i.test(spec.materials||''))spec.materials='';
      if(f.tuition2026)f.tuition2026=spec;else f.classDetails=spec;
      const fix=s=>String(s||'').replace(/(sĩ số\s*)(?:3|4)\s*[–—-]\s*6/gi,(_,lead)=>lead+'8–10');
      db.prepare('UPDATE courses SET financials_json=?,description=?,bluf_summary=? WHERE id=?').run(JSON.stringify(f),fix(row.description),fix(row.bluf_summary),row.id);
    }
    // Convert the existing homepage introduction link into the separate CTA block.
    for(const row of db.prepare("SELECT id,content FROM about_sections WHERE location='home'").all()){
      const content=row.content.replace(/<(?:p|a)\b[^>]*>\s*(?:<a\b[^>]*>)?Tìm hiểu về Sol\s*Dream(?:<\/a>)?\s*<\/(?:p|a)>/gi,'');
      if(content!==row.content)db.prepare('UPDATE about_sections SET content=? WHERE id=?').run(content,row.id);
    }
    const tuition = db.prepare("SELECT id,content,excerpt FROM posts WHERE slug='bang-hoc-phi-tieng-han-sol-dream-2026'").get();
    if(tuition){
      let first=true;
      const content=tuition.content.replace(/<table\b[^>]*>[\s\S]*?<\/table>/gi,()=>{if(!first)return '';first=false;return '{{course-catalog}}';})
        .replace(/(sĩ số\s*)(?:3|4)\s*[–—-]\s*6/gi,(_,lead)=>lead+'8–10');
      db.prepare('UPDATE posts SET content=? WHERE id=?').run(content,tuition.id);
    }
    for(const [type,table] of [['post','posts'],['program','programs']]) {
      db.prepare(`UPDATE ${table} SET editorial_locked=1`).run();
      db.prepare(`UPDATE ${table} SET faq_mode='manual' WHERE EXISTS(SELECT 1 FROM faqs WHERE origin_type=? AND origin_id=CAST(${table}.id AS TEXT) AND generated=0)`).run(type);
    }
    db.prepare('INSERT INTO system_meta(key,value) VALUES (?,?)').run(key,'1');
  })();
}
module.exports={applyContentEditing};
