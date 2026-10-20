'use strict';
const fs=require('fs'),path=require('path');
const {calendarDate,publicationEvidence}=require('./publicationHistory');
const {decodeAttributeEntities}=require('./htmlEntities');
const KEY='seven_content_fixes_20261020_v1';
function repairMapLinks(value){
  return String(value||'').replace(/<a\b[^>]*\bhref\s*=\s*(["'])(.*?)\1[^>]*>/gi,(tag,quote,raw)=>{
    const url=decodeAttributeEntities(raw);let parsed;try{parsed=new URL(url);}catch(_){return tag;}
    if(!/^(?:www\.|maps\.)?google\.[a-z.]+$/i.test(parsed.hostname)||!/(?:\/maps(?:\/|$))/.test(parsed.pathname)||!/^https?:$/.test(parsed.protocol))return tag;
    const escaped=url.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    return tag.replace(/(\bhref\s*=\s*)(["'])(.*?)\2/i,(_,prefix,q)=>prefix+q+escaped+q);
  });
}
function applySevenContentFixes(db){
  db.exec(`CREATE TABLE IF NOT EXISTS page_versions(path TEXT PRIMARY KEY,published_at TEXT NOT NULL DEFAULT '',modified_at TEXT NOT NULL DEFAULT '');`);
  for(const table of ['posts','programs']){
    const cols=db.prepare(`PRAGMA table_info(${table})`).all().map(c=>c.name);
    for(const column of ['first_published_at','content_modified_at','publication_date_source'])if(!cols.includes(column))db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} TEXT NOT NULL DEFAULT ''`);
  }
  const blockCols=db.prepare('PRAGMA table_info(shared_blocks)').all().map(c=>c.name);
  if(!blockCols.includes('created_at'))db.exec("ALTER TABLE shared_blocks ADD COLUMN created_at TEXT NOT NULL DEFAULT ''");
  if(db.prepare('SELECT 1 FROM system_meta WHERE key=?').get(KEY))return;
  return db.transaction(()=>{
    const result={restoredPosts:0,restoredPrograms:0,unresolved:[],mapRowsRepaired:0};
    // Preserve newly added publication evidence in subsequent content history.
    for(const table of ['posts','programs']){
      const columns=db.prepare(`PRAGMA table_info(${table})`).all().map(c=>c.name);
      const json=columns.map(c=>`'${c}',OLD."${c}"`).join(',');
      db.exec(`DROP TRIGGER IF EXISTS editing_${table}_update;DROP TRIGGER IF EXISTS editing_${table}_delete;
        CREATE TRIGGER editing_${table}_update BEFORE UPDATE ON ${table} WHEN ${columns.map(c=>`OLD."${c}" IS NOT NEW."${c}"`).join(' OR ')} BEGIN
        INSERT INTO content_revisions(table_name,record_id,action,snapshot) VALUES ('${table}',OLD.id,'before-update',json_object(${json})); END;
        CREATE TRIGGER editing_${table}_delete BEFORE DELETE ON ${table} BEGIN
        INSERT INTO content_revisions(table_name,record_id,action,snapshot) VALUES ('${table}',OLD.id,'before-delete',json_object(${json})); END;`);
    }
    const histories=new Map();const remember=(table,row,source,observedAt)=>{const key=table+':'+row.id;const list=histories.get(key)||[];list.push({row,source,observedAt});histories.set(key,list);};
    const directory=path.dirname(process.env.DATABASE_PATH||path.join(__dirname,'../db/data.sqlite'));
    for(const filename of ['content-editing-before-20261020.json','seven-content-fixes-before-20261020.json']){
      try{const data=JSON.parse(fs.readFileSync(path.join(directory,filename),'utf8'));for(const table of ['posts','programs'])for(const row of data[table]||[])remember(table,row,'archive:'+filename,data.at||data.capturedAt||'');}catch(error){if(error.code!=='ENOENT')throw error;}
    }
    for(const history of db.prepare("SELECT id,table_name,snapshot,created_at FROM content_revisions WHERE table_name IN ('posts','programs') ORDER BY id").all()){
      const row=JSON.parse(history.snapshot);remember(history.table_name,row,'revision:'+history.id,String(history.created_at).replace(' ','T')+'Z');
    }
    for(const table of ['posts','programs'])for(const row of db.prepare(`SELECT * FROM ${table}`).all()){
      const evidence=publicationEvidence(row,histories.get(table+':'+row.id)||[]);
      if(!row.first_published_at&&evidence){
        db.prepare(`UPDATE ${table} SET first_published_at=?,publication_date_source=? WHERE id=?`).run(evidence.value,evidence.source+':'+evidence.precision,row.id);
        result[table==='posts'?'restoredPosts':'restoredPrograms']++;
      }else if(row.published&&!evidence)result.unresolved.push(table+':'+row.id);
      if(!row.content_modified_at){const day=calendarDate(row.updated_at||row.created_at);if(day)db.prepare(`UPDATE ${table} SET content_modified_at=? WHERE id=?`).run(day,row.id);}
    }
    const about=db.prepare("SELECT * FROM about_sections WHERE location='page'").all();
    const first=about.map(s=>calendarDate(s.created_at)).filter(Boolean).sort()[0]||'';
    const latest=about.map(s=>calendarDate(s.updated_at||s.created_at)).filter(Boolean).sort().pop()||first;
    db.prepare("INSERT OR IGNORE INTO page_versions(path,published_at,modified_at) VALUES ('/gioi-thieu',?,?)").run(first,latest);
    db.exec(`DROP TRIGGER IF EXISTS posts_publication_update_utc;
      CREATE TRIGGER posts_publication_update_utc AFTER UPDATE OF published ON posts
      WHEN OLD.published=0 AND NEW.published=1 AND NEW.first_published_at='' BEGIN
      UPDATE posts SET first_published_at=strftime('%Y-%m-%dT%H:%M:%fZ','now'),publication_date_source='publication_event:timestamp',content_modified_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=NEW.id; END;
      CREATE TRIGGER IF NOT EXISTS programs_publication_insert_utc AFTER INSERT ON programs BEGIN
      UPDATE programs SET first_published_at=CASE WHEN NEW.published=1 AND NEW.first_published_at='' THEN strftime('%Y-%m-%dT%H:%M:%fZ','now') ELSE NEW.first_published_at END,
        publication_date_source=CASE WHEN NEW.published=1 AND NEW.first_published_at='' THEN 'publication_event:timestamp' ELSE NEW.publication_date_source END,
        content_modified_at=CASE WHEN NEW.content_modified_at='' THEN strftime('%Y-%m-%dT%H:%M:%fZ','now') ELSE NEW.content_modified_at END WHERE id=NEW.id; END;
      CREATE TRIGGER IF NOT EXISTS programs_publication_update_utc AFTER UPDATE OF published ON programs WHEN OLD.published=0 AND NEW.published=1 AND NEW.first_published_at='' BEGIN
      UPDATE programs SET first_published_at=strftime('%Y-%m-%dT%H:%M:%fZ','now'),publication_date_source='publication_event:timestamp',content_modified_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=NEW.id; END;`);
    const modifiedFields=['title','subtitle','slug','excerpt','content','cover_image','cover_alt','cover_caption','author_name','author_role','author_url','author_type','seo_title','meta_description','focus_keyword','source_urls','show_summary','show_sources','faq_mode','source_note','summary_title'];
    db.exec(`CREATE TRIGGER IF NOT EXISTS programs_content_update_utc AFTER UPDATE OF ${modifiedFields.join(',')} ON programs
      WHEN ${modifiedFields.map(c=>`OLD.${c} IS NOT NEW.${c}`).join(' OR ')} BEGIN UPDATE programs SET content_modified_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=NEW.id; END;`);
    const stamp="UPDATE page_versions SET modified_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE path='/gioi-thieu';";
    db.exec(`CREATE TRIGGER IF NOT EXISTS about_page_insert_version AFTER INSERT ON about_sections WHEN NEW.location='page' BEGIN ${stamp} END;
      CREATE TRIGGER IF NOT EXISTS about_page_delete_version AFTER DELETE ON about_sections WHEN OLD.location='page' BEGIN ${stamp} END;
      CREATE TRIGGER IF NOT EXISTS about_page_update_version AFTER UPDATE ON about_sections
      WHEN (OLD.location='page' OR NEW.location='page') AND (OLD.location IS NOT NEW.location OR OLD.title IS NOT NEW.title OR OLD.eyebrow IS NOT NEW.eyebrow OR OLD.content IS NOT NEW.content OR OLD.section_style IS NOT NEW.section_style OR OLD.sort_order IS NOT NEW.sort_order OR OLD.active IS NOT NEW.active) BEGIN ${stamp} END;
      CREATE TRIGGER IF NOT EXISTS about_linked_story_version AFTER UPDATE ON posts WHEN NEW.id IN (269,270,271) AND (OLD.title IS NOT NEW.title OR OLD.slug IS NOT NEW.slug OR OLD.published IS NOT NEW.published) BEGIN ${stamp} END;
      CREATE TRIGGER IF NOT EXISTS about_shared_insert_version AFTER INSERT ON shared_blocks WHEN NEW.zone='about-page' BEGIN ${stamp} END;
      CREATE TRIGGER IF NOT EXISTS about_shared_update_version AFTER UPDATE ON shared_blocks WHEN (OLD.zone='about-page' OR NEW.zone='about-page') AND (OLD.zone IS NOT NEW.zone OR OLD.title IS NOT NEW.title OR OLD.eyebrow IS NOT NEW.eyebrow OR OLD.content IS NOT NEW.content OR OLD.link_url IS NOT NEW.link_url OR OLD.link_label IS NOT NEW.link_label OR OLD.sort_order IS NOT NEW.sort_order OR OLD.active IS NOT NEW.active) BEGIN ${stamp} END;
      CREATE TRIGGER IF NOT EXISTS about_shared_delete_version AFTER DELETE ON shared_blocks WHEN OLD.zone='about-page' BEGIN ${stamp} END;
      CREATE TRIGGER IF NOT EXISTS about_linked_story_delete_version AFTER DELETE ON posts WHEN OLD.id IN (269,270,271) BEGIN ${stamp} END;`);
    const insert=db.prepare("INSERT OR IGNORE INTO shared_blocks(key,zone,title,eyebrow,content,link_url,link_label,sort_order,active,created_at) VALUES (?,?,?,?,?,?,?,?,1,strftime('%Y-%m-%dT%H:%M:%fZ','now'))");
    const blocks=[
      ['about-page-header','about-page','SOL DREAM EDUCATION là ai?','VỀ SOLDREAM','<p>SOL DREAM EDUCATION là trung tâm Hàn ngữ và tư vấn du học Hàn Quốc tại Tân Phú, TP.HCM, hoạt động từ năm 2019 với định hướng đào tạo ngoại ngữ và đồng hành hồ sơ du học.</p>','','',0],
      ['about-profile-download','about-page','','','<p>Thông tin trong hồ sơ áp dụng đến khi có thông báo mới.</p>','/documents/sol-dream-profile-2026-2027.pdf','Tải hồ sơ giới thiệu SOL DREAM 2026–2027 (PDF) →',10],
      ['about-stories-heading','about-page','Hoạt động và câu chuyện học viên','','','','',20],
      ['course-fee-link','course-page','','','','/tin-tuc/bang-hoc-phi-tieng-han-sol-dream-2026','Xem bảng học phí các lớp tiếng Hàn →',0],
      ['school-featured-intro','home','Trường đại học & chương trình du học nổi bật','','<p>Tìm hiểu ngành học, học phí và điều kiện tuyển sinh tại các trường Hàn Quốc để lựa chọn chương trình phù hợp với năng lực và ngân sách.</p>','','',100]
    ];
    blocks.forEach(values=>insert.run(...values));
    for(const table of ['posts','programs','about_sections','shared_blocks'])for(const row of db.prepare(`SELECT * FROM ${table} WHERE content LIKE '%maps%'`).all()){
      const content=repairMapLinks(row.content);if(content===row.content)continue;
      const key=table==='shared_blocks'?'key':'id';db.prepare(`UPDATE ${table} SET content=? WHERE ${key}=?`).run(content,row[key]);result.mapRowsRepaired++;
    }
    db.prepare('INSERT INTO system_meta(key,value,updated_at) VALUES (?,?,?)').run(KEY,JSON.stringify(result),new Date().toISOString());
    return result;
  })();
}
module.exports={applySevenContentFixes,repairMapLinks};
