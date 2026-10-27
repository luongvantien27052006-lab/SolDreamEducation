'use strict';
// The owner explicitly approved hiding these two articles while retaining
// their records, content and original publication dates on 28/10/2026.
function applySeoTopicReview(db){
 const key='seo_topic_review_owner_approved_20261028_v1';
 if(db.prepare('SELECT 1 FROM system_meta WHERE key=?').get(key))return null;
 return db.transaction(()=>{
  const hidden=[];
  for(const slug of ['hanh-trinh-phat-trien-va-cac-cot-moc-quan-trong-dan-den-vu-phong-ten-lua-nuri-lan-thu-5-cua-han-quoc','bao-cao-quoc-te-trieu-tien-co-the-nang-cao-nang-luc-may-bay-khong-nguoi-lai-thong-qua-lao-dong-tai-nha-may-nga']){
   const row=db.prepare('SELECT id,published FROM posts WHERE slug=?').get(slug);
   if(row&&row.published){db.prepare('UPDATE posts SET published=0 WHERE id=?').run(row.id);hidden.push(row.id);}
  }
  db.prepare('INSERT INTO system_meta(key,value) VALUES (?,?)').run(key,JSON.stringify(hidden));
  return {hidden};
 })();
}
module.exports={applySeoTopicReview};
