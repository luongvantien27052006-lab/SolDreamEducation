'use strict';
function applySiteContent(db){
 db.exec(`CREATE TABLE IF NOT EXISTS site_copy(key TEXT PRIMARY KEY,group_name TEXT NOT NULL,label TEXT NOT NULL,kind TEXT NOT NULL DEFAULT 'text',value TEXT NOT NULL,default_value TEXT NOT NULL,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
 CREATE TABLE IF NOT EXISTS site_datasets(key TEXT PRIMARY KEY,title TEXT NOT NULL,content TEXT NOT NULL,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);`);
 const result=db.transaction(()=>{
  let fields=0,datasets=0;const insert=db.prepare('INSERT OR IGNORE INTO site_copy(key,group_name,label,kind,value,default_value) VALUES (?,?,?,?,?,?)');
  for(const row of require('../data/site-copy.json'))fields+=insert.run(row.key,row.group_name,row.label,row.kind,row.value,row.value).changes;
  const dataset=db.prepare('INSERT OR IGNORE INTO site_datasets(key,title,content) VALUES (?,?,?)');
  const add=(key,title,content)=>{datasets+=dataset.run(key,title,JSON.stringify(content)).changes;};
  add('korea-life','Cẩm nang sinh hoạt – nội dung, ngân sách và nguồn',require('../data/korea-life.json'));
  add('partners','Danh mục trường hợp tác',require('../data/partner-schools.json'));
  add('organization','Thông tin thương hiệu, liên hệ và dữ liệu SEO',require('../data/organization-schema.json'));
  add('editorial-responsibility','Người chịu trách nhiệm nội dung visa và học phí',require('../data/editorial-responsibility.json'));
  add('study-abroad-hub','Trang tổng quan du học Hàn Quốc',require('../data/study-abroad-hub.json'));
  const universities=require('./universityPages').baselineUniversities;
  for(const university of universities){
   const key='university-'+university.id;
   add(key,'Hồ sơ trường: '+university.name,{...university,firstPublishedAt:university.updatedDate,faqs:require('./siteFaq').getUniversityFaqs(university)});
   const row=db.prepare('SELECT content FROM site_datasets WHERE key=?').get(key);const content=JSON.parse(row.content);
   if(!content.firstPublishedAt){content.firstPublishedAt=university.updatedDate;db.prepare('UPDATE site_datasets SET content=? WHERE key=?').run(JSON.stringify(content),key);}
  }
  for(const table of ['site_copy','site_datasets']){
   const cols=db.prepare('PRAGMA table_info('+table+')').all().map(c=>c.name);
   db.exec(`CREATE TRIGGER IF NOT EXISTS editing_${table}_update BEFORE UPDATE ON ${table} WHEN ${cols.filter(c=>c!=='updated_at').map(c=>`OLD.${c} IS NOT NEW.${c}`).join(' OR ')} BEGIN INSERT INTO content_revisions(table_name,record_id,action,snapshot) VALUES ('${table}',OLD.key,'before-update',json_object(${cols.map(c=>`'${c}',OLD.${c}`).join(',')})); END;`);
  }
  require('./partnerSchools').addPartnerHomepageFields(db);
  // Apply the requested rename once; later CMS edits must remain authoritative.
  const renameKey='soldream_life_topic_label_20261021_v1';
  if(!db.prepare('SELECT 1 FROM system_meta WHERE key=?').get(renameKey)){
   const rows=require('../data/site-copy.json');
   for(const key of ['topic.hoat-dong-soldream.label','view.home-sections.news.007']){
    const row=rows.find(item=>item.key===key);
    db.prepare('UPDATE site_copy SET value=?,updated_at=CURRENT_TIMESTAMP WHERE key=? AND value=?').run(row.value,key,'Hoạt động SolDream');
   }
   for(const key of ['topic.hoat-dong-soldream.label','topic.hoat-dong-soldream.description','view.home-sections.news.007','navigation.soldream-life.url']){
    const row=rows.find(item=>item.key===key);
    db.prepare('UPDATE site_copy SET label=?,default_value=?,updated_at=CURRENT_TIMESTAMP WHERE key=?').run(row.label,row.value,key);
   }
   db.prepare('INSERT INTO system_meta(key,value) VALUES (?,?)').run(renameKey,'1');
  }
  return {fields,datasets};
 })();
 return result;
}
module.exports={applySiteContent};
