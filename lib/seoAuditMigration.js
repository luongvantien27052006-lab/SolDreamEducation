'use strict';
const {cleanSourceText,truncateAtBoundary}=require('./seoDescription');
const KEY='seo_metadata_verified_20261028_v1';
function applySeoAuditFixes(db){
 if(db.prepare('SELECT 1 FROM system_meta WHERE key=?').get(KEY))return null;
 return db.transaction(()=>{
  const result={titles:0,descriptions:0,footer:0,skipped:[]};
  for(const fix of require('../data/seo-editorial-fixes-20261028.json').fixes){
   if(!['posts','programs','courses'].includes(fix.table))continue;
   const row=db.prepare('SELECT * FROM '+fix.table+' WHERE slug=?').get(fix.slug);
   if(!row||String(row.title||row.name).trim()!==fix.expectedContentTitle.trim()){result.skipped.push(fix.slug+':title changed');continue;}
   const edits=[],values=[];
   if(fix.newSeoTitle){
    if(String(row.seo_title||'').trim()===fix.expectedSeoTitle){edits.push('seo_title=?');values.push(fix.newSeoTitle);result.titles++;}
    else result.skipped.push(fix.slug+':SEO title changed');
   }
   if(fix.newDescription){
    let previous=String(row.meta_description||'').trim();
    if(!previous){
     const model=fix.table==='courses'?require('./courseKnowledge').rowToCourse(row):row;
     const summary=fix.table==='courses'?model.blufSummary:row.excerpt;
     const content=fix.table==='courses'?model.description:row.content;
     previous=truncateAtBoundary(cleanSourceText(summary||content).replace(/\s+/g,' ').trim());
    }
    if(previous===fix.expectedDescription){edits.push('meta_description=?');values.push(fix.newDescription);result.descriptions++;}
    else result.skipped.push(fix.slug+':description changed');
   }
   // Only metadata columns are written. Existing timestamp triggers record the
   // real metadata edit; no publication, schedule, fee or policy field is set.
   if(edits.length)db.prepare('UPDATE '+fix.table+' SET '+edits.join(',')+' WHERE id=?').run(...values,row.id);
  }
  const footer=db.prepare("SELECT content FROM shared_blocks WHERE key='footer-links'").get();
  if(footer){const content=footer.content.replace(/(<a\b[^>]*href=["']\/tin-tuc\?muc=hoat-dong-soldream["'][^>]*>)\s*Hoạt động SolDream\s*(<\/a>)/gi,'$1Cuộc sống SolDream$2');if(content!==footer.content)result.footer=db.prepare("UPDATE shared_blocks SET content=?,updated_at=datetime('now','localtime') WHERE key='footer-links'").run(content).changes;}
  db.prepare('INSERT INTO system_meta(key,value) VALUES (?,?)').run(KEY,JSON.stringify(result));
  return result;
 })();
}
module.exports={applySeoAuditFixes};
