'use strict';
const db=require('../db');
function manualFaqInput(body){const list=v=>Array.isArray(v)?v:[v||''];const answers=list(body.faq_answers);return list(body.faq_questions).map((q,i)=>({question:String(q).trim().slice(0,500),answer:String(answers[i]||'').trim().slice(0,6000)})).filter(f=>f.question&&f.answer).slice(0,30);}
function articleOptions(body,existing={}){return {show_summary:body.show_summary==='1'?1:0,show_sources:body.show_sources==='1'?1:0,
  faq_mode:['off','manual','auto'].includes(body.faq_mode)?body.faq_mode:(existing.faq_mode||'off'),
  summary_title:String(body.summary_title??existing.summary_title??'Tóm tắt').trim().slice(0,180),source_note:String(body.source_note??existing.source_note??'').trim().slice(0,4000),
  cover_alt:String(body.cover_alt??existing.cover_alt??'').trim().slice(0,500),cover_caption:String(body.cover_caption??existing.cover_caption??'').trim().slice(0,2000),
  author_type:body.author_type==='person'?'person':'organization'};}
function saveArticleOptions(type,id,body){const table=type==='post'?'posts':'programs';const row=db.prepare(`SELECT * FROM ${table} WHERE id=?`).get(id);const o=articleOptions(body,row);
  db.transaction(()=>{db.prepare(`UPDATE ${table} SET show_summary=?,show_sources=?,faq_mode=?,summary_title=?,source_note=?,cover_alt=?,cover_caption=?,author_type=?,editorial_locked=1 WHERE id=?`).run(o.show_summary,o.show_sources,o.faq_mode,o.summary_title,o.source_note,o.cover_alt,o.cover_caption,o.author_type,id);
    if(body.faq_questions!==undefined && o.faq_mode==='manual'){
      db.prepare('DELETE FROM faqs WHERE origin_type=? AND origin_id=?').run(type,String(id));
      const insert=db.prepare('INSERT INTO faqs(category,question,answer,source_url,sort_order,published,generated,origin_type,origin_id) VALUES (?,?,?,?,?,?,0,?,?)');
      const path=type==='post'?`/tin-tuc/${row.slug}`:require('./util').programPublicPath(row);
      manualFaqInput(body).forEach((f,i)=>insert.run(type==='program'&&row.category==='Thông tin trường'?'Thông tin trường':row.topic==='cam-nang-sinh-hoat'?'Thông tin sinh hoạt tại Hàn Quốc':'Du học',f.question,f.answer,path,i*10,1,type,String(id)));
    }
    if(type==='program' && body.publication_date){const value=require('./util').dateInputToLocalDateTime(body.publication_date);if(value)db.prepare('UPDATE programs SET created_at=? WHERE id=?').run(value,id);}
  })();
}
module.exports={manualFaqInput,articleOptions,saveArticleOptions};
