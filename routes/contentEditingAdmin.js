'use strict';
const db=require('../db');const {requireAdmin}=require('../lib/auth');
const {sanitizeRichHtml,decorate,normalizeReferenceUrl,normalizeSourceUrls,dateInputToLocalDateTime,fmtFull}=require('../lib/util');
const {getBlocks}=require('../lib/sharedBlocks');const {articleOptions,manualFaqInput}=require('../lib/articleEditing');
const {courseFinancials}=require('../lib/courseEditing');
const tables=['posts','programs','courses','faqs','about_sections','shared_blocks','testimonials','site_copy','site_datasets'];
module.exports=function(router,{uploadCover}){
  require('../lib/siteContentAdmin')(router);
  router.get('/noi-dung-chung',requireAdmin,(req,res)=>res.render('admin/shared-blocks',{layout:'admin/layout',title:'Nội dung dùng chung',active:'shared',blocks:getBlocks(true),flash:req.query.flash||''}));
  router.get('/noi-dung-chung/:key/sua',requireAdmin,(req,res,next)=>{const block=db.prepare('SELECT * FROM shared_blocks WHERE key=?').get(req.params.key);if(!block)return next();res.render('admin/shared-block-form',{layout:'admin/layout',title:'Sửa nội dung dùng chung',active:'shared',block,error:null});});
  function input(body,existing){return {...existing,title:String(body.title||'').trim().slice(0,300),eyebrow:String(body.eyebrow||'').trim().slice(0,180),content:sanitizeRichHtml(body.content),link_url:normalizeReferenceUrl(body.link_url),link_label:String(body.link_label||'').trim().slice(0,180),sort_order:Math.max(-10000,Math.min(10000,Number(body.sort_order)||0)),active:body.active==='1'?1:0};}
  router.post('/noi-dung-chung/:key/sua',requireAdmin,(req,res,next)=>{const old=db.prepare('SELECT * FROM shared_blocks WHERE key=?').get(req.params.key);if(!old)return next();const b=input(req.body,old);
    if(req.body.link_url&&!b.link_url)return res.status(400).render('admin/shared-block-form',{layout:'admin/layout',title:'Sửa nội dung',active:'shared',block:b,error:'Liên kết không hợp lệ.'});
    if(['title','eyebrow','content','link_url','link_label','sort_order','active'].some(key=>b[key]!==old[key]))
      db.prepare("UPDATE shared_blocks SET title=?,eyebrow=?,content=?,link_url=?,link_label=?,sort_order=?,active=?,updated_at=CURRENT_TIMESTAMP WHERE key=?").run(b.title,b.eyebrow,b.content,b.link_url,b.link_label,b.sort_order,b.active,b.key);
    require('../lib/indexNow').queueIndexNow(['/','/gioi-thieu','/llms.txt']);res.redirect('/admin/noi-dung-chung?flash='+encodeURIComponent('Đã lưu nội dung. Website dùng ngay bản hiện hành.'));
  });
  router.post('/noi-dung-chung/:key/xem-truoc',requireAdmin,(req,res,next)=>{const old=db.prepare('SELECT * FROM shared_blocks WHERE key=?').get(req.params.key);if(!old)return next();res.set('Cache-Control','no-store').render('admin/block-preview',{layout:'layout',title:'Xem trước nội dung',robots:'noindex, nofollow',jsonLd:'',previewMode:true,previewBlock:input(req.body,old)});});
  router.get('/lich-su/:table/:id',requireAdmin,(req,res,next)=>{if(!tables.includes(req.params.table))return next();const revisions=db.prepare('SELECT * FROM content_revisions WHERE table_name=? AND record_id=? ORDER BY id DESC LIMIT 100').all(req.params.table,req.params.id);res.render('admin/revisions',{layout:'admin/layout',active:'shared',title:'Lịch sử chỉnh sửa',revisions});});
  router.post('/xem-truoc/:type',requireAdmin,uploadCover,(req,res,next)=>{
    const type=req.params.type;if(!['post','program','course','about'].includes(type))return next();
    if(req.uploadError)return res.status(400).send(req.uploadError);
    const table={post:'posts',program:'programs',course:'courses',about:'about_sections'}[type];const old=req.body.preview_id?db.prepare(`SELECT * FROM ${table} WHERE id=?`).get(req.body.preview_id)||{}:{};
    const b=req.body;const now=old.created_at||new Date().toISOString();const row={...old,...b,...articleOptions(b,old),title:String(b.title||b.name||''),slug:b.slug||old.slug||'xem-truoc',category:b.category||old.category||'',content:sanitizeRichHtml(b.content||''),excerpt:String(b.excerpt||''),created_at:dateInputToLocalDateTime(b.publication_date)||now,updated_at:old.updated_at||now,source_urls:normalizeSourceUrls(b.source_urls),cover_image:req.file?'/uploads/'+req.file.filename:b.remove_cover==='1'?'':old.cover_image||'',published:0};
    // Previews are authenticated, uncached and never publish or notify.
    res.set('Cache-Control','no-store');const common={previewMode:true,layout:'layout',title:'Xem trước: '+row.title,robots:'noindex, nofollow',jsonLd:'',sitePopup:null,leadPopup:null};
    if(type==='about')return res.render('admin/block-preview',{...common,previewBlock:{...row,active:1,link_url:'',eyebrow:b.eyebrow||''}});
    if(type==='course'){
      let f={};try{f=JSON.parse(old.financials_json||'{}');}catch(_){}
      const course=require('../lib/courseKnowledge').rowToCourse({...row,id:old.id||'preview',name:b.name||'',language:b.language||'Tiếng Hàn',price:b.price||'',audience:b.audience||'',description:b.description||'',bluf_summary:b.bluf_summary||'',financials_json:JSON.stringify(courseFinancials(b,f)),requirements_json:JSON.stringify({entryLevel:b.entry_level||'',certificateRequired:b.certificate_required||'',status:b.requirement_status||''})});
      return res.render('course-detail',{...common,course,courseFaqs:[],courseNotice:require('../lib/courseKnowledge').getCourseNotice()});
    }
    const item=decorate(row);const relatedFaqs=row.faq_mode==='manual'?manualFaqInput(b):row.faq_mode==='auto'?require('../lib/publicationPipeline').deriveFaqs(type,row):[];
    if(type==='post')return res.render('news-detail',{...common,post:item,relatedFaqs,relatedPosts:[],coverMeta:require('../lib/articleMetadata').coverMetadata(item),displayTime:String(row.created_at).slice(0,10),contentModifiedTime:row.updated_at});
    return res.render('duhoc-detail',{...common,program:item,relatedFaqs,relatedPrograms:[],isSchoolPage:row.category==='Thông tin trường',modifiedTime:row.updated_at});
  });
};
