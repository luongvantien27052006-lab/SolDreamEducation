'use strict';
const {sourcePolicy,allowedResearchContent}=require('./researchPolicy');
const {GUIDANCE_KEYWORDS}=require('./guidanceScope');
const KEY='living_support_guidance_scope_20261020_v1';
function applyGuidanceScope(db){
  if(db.prepare('SELECT 1 FROM system_meta WHERE key=?').get(KEY))return;
  return db.transaction(()=>{
    const counts={schoolSourcesUntouched:0,monthlySupportSources:0,disabledSources:0,pendingDismissed:0,pendingKept:0};
    const sources=db.prepare('SELECT * FROM research_sources').all();
    for(const source of sources){
      const policy=sourcePolicy(source);
      if(policy.group==='schools'){counts.schoolSourcesUntouched++;continue;}
      if(policy.group==='monthly'){
        db.prepare("UPDATE research_sources SET keywords=?,updated_at=datetime('now','localtime') WHERE id=?").run(GUIDANCE_KEYWORDS,source.id);
        counts.monthlySupportSources++;
      }else if(source.active){
        // Preserve the stored deadline for audit; disabled sources cannot run.
        db.prepare("UPDATE research_sources SET active=0,updated_at=datetime('now','localtime') WHERE id=?").run(source.id);
        counts.disabledSources++;
      }
      for(const item of db.prepare("SELECT * FROM research_items WHERE source_id=? AND status='pending'").all(source.id)){
        if(policy.group==='monthly'&&allowedResearchContent(source,item)){
          db.prepare("UPDATE research_items SET topic='cam-nang-sinh-hoat',suggested_section='Cẩm nang & Thông tin' WHERE id=?").run(item.id);
          counts.pendingKept++;
        }else{
          db.prepare("UPDATE research_items SET status='dismissed',optimization_note='Bỏ qua theo phạm vi mới: bot cẩm nang chỉ nhận dịch vụ hỗ trợ đời sống/tư vấn cho người nước ngoài và gia đình đa văn hóa.',updated_at=datetime('now','localtime') WHERE id=?").run(item.id);
          counts.pendingDismissed++;
        }
      }
    }
    db.prepare('INSERT INTO system_meta(key,value,updated_at) VALUES (?,?,?)').run(KEY,JSON.stringify(counts),new Date().toISOString());
    return counts;
  })();
}
module.exports={applyGuidanceScope};
