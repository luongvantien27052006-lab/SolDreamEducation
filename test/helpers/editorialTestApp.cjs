'use strict';
// Isolated integration environment: never loads .env, never starts workers,
// never connects to the production database or sends external notifications.
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const http=require('node:http');
const root=path.resolve(__dirname,'../..');
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'soldream-editorial-test-'));
process.env.DATABASE_PATH=path.join(directory,'test.sqlite');
process.env.UPLOADS_DIR=path.join(directory,'uploads');
process.env.NODE_ENV='test';
process.env.ADMIN_PASSWORD='isolated-editorial-test-only';
for(const key of ['GEMINI_API_KEY','OPENAI_API_KEY','RESEND_API_KEY','INDEXNOW_KEY'])process.env[key]='';
const originalFetch=global.fetch;
global.fetch=(url,options)=>{
  if(!['127.0.0.1','localhost'].includes(new URL(typeof url==='string'?url:url.url||url.href).hostname))throw new Error('External network disabled in editorial fixture');
  return originalFetch(url,options);
};
const db=require('../../db');
require('../../lib/indexNow').queueIndexNow=()=>{};
require('../../lib/subscriberNotifier').notifySubscribersForContent=()=>0;

const paragraph='Người học có thể liên hệ dịch vụ tư vấn để tìm hiểu các kênh hỗ trợ đời sống tại Hàn Quốc. Trước khi trao đổi, hãy chuẩn bị câu hỏi, ngôn ngữ mong muốn và thông tin cần thiết để nhân viên hướng dẫn đúng nội dung.';
const sourceHtml='<main><div class=breadcrumb>Trang chủ › Cẩm nang</div><div class=article-controls>In bài Chia sẻ</div><p>Lượt thích (12)</p><p>Cỡ chữ: A− A A+</p>'+Array.from({length:24},(_,i)=>'<p>Hướng dẫn hỗ trợ số '+(i+1)+'. '+paragraph+'</p>').join('')+'</main>';
const research=require('../../lib/researchBot');
const editorial=require('../../lib/editorialAi');
let lastDraftInput;
research.buildEditorialSource=async item=>({url:item.url,text:research.structuredTextFromHtml(sourceHtml),sourceUrls:[item.url],attachments:[],faqs:[]});
research.coverImageForPage=async()=>'/img/logo.png';
research.coverImageForSchoolUpdate=async()=>'/img/logo.png';
research.searchExternalContentCover=async()=>{throw new Error('Unexpected external image search in fixture');};
// Deterministic provider fixture only. Real extraction, validation, sanitizing,
// import persistence, CMS publication and public rendering remain active.
editorial.generateEditorialDraft=async input=>{lastDraftInput=input;return {...editorial.fallbackDraft(input),aiAvailable:true,faqs:[],attachments:[]};};

const express=require('express');
const session=require('express-session');
const app=express();
app.set('view engine','ejs');app.set('views',path.join(root,'views'));
app.use(require('express-ejs-layouts'));app.set('layout','layout');
app.use(express.urlencoded({extended:true,limit:'2mb'}));
app.use(session({secret:'isolated-fixture-session-only',resave:false,saveUninitialized:false}));
app.use(express.static(path.join(root,'public')));
app.use((req,res,next)=>{Object.assign(res.locals,require('../../lib/seo').seoDefaults(req),require('../../lib/siteContent').siteContentLocals(),require('../../lib/sharedBlocks').blockLocals(),{assetVer:'editorial-test',navigationCourses:require('../../lib/courseKnowledge').getCourses(),sitePopup:null,leadPopup:null,leadContext:null});next();});
app.use('/admin',require('../../routes/admin'));
app.use('/',require('../../routes/public'));
app.use((error,req,res,next)=>{console.error(error);res.status(500).send(error.message);});

const originalDates={1:'2025-07-31',3:'2022-10-31',183:'2026-09-20',210:'2026-09-28',211:'2026-09-28',269:'2026-10-19',270:'2026-10-19',271:'2026-10-19'};
const modified='2026-10-20T14:54:58.872Z';
db.prepare('DELETE FROM posts').run();db.prepare('DELETE FROM programs').run();
const insert=db.prepare(`INSERT INTO posts(id,title,slug,excerpt,content,published,first_published_at,content_modified_at,created_at,updated_at,faq_mode,editorial_locked,meta_description,category) VALUES(?,?,?,?,?,1,?,?,?,?,'off',1,'Mô tả ngày xuất bản được biên tập.','Thông tin Hàn Quốc')`);
for(const [id,date] of Object.entries(originalDates))insert.run(+id,'Bài thử ngày xuất bản '+id,'schema-test-'+id,'Lời dẫn do người biên tập lưu.', '<p>'+paragraph+'</p>',date,modified,date+' 12:00:00',modified);
const programSlugs=['phan-biet-visa-du-hoc-han-quoc-d4-1-d2','hoc-phi-truong-doi-tac-han-quoc-2026'];
for(const [i,slug] of programSlugs.entries())db.prepare(`INSERT INTO programs(id,title,slug,excerpt,content,category,published,show_summary,faq_mode,editorial_locked,first_published_at,content_modified_at) VALUES(?,?,?,?,?,'Du học Hàn Quốc',1,1,'off',1,?,?)`).run(20+i,'Chương trình thử '+i,slug,'Lời dẫn do người biên tập lưu, không tự thêm câu tổng hợp.','<p>'+paragraph+'</p>','2026-09-28',modified);
db.prepare(`UPDATE shared_blocks SET content=?,active=1 WHERE key='footer-contact'`).run('<p>03 6464 8282</p><h4>Chi nhánh Đồng Nai</h4><h4>VPĐD miền Bắc</h4>');
db.prepare(`UPDATE shared_blocks SET content=?,active=1 WHERE key='footer-links'`).run('<p>Trợ lý tư vấn du học</p>');

async function start(){
  const server=await new Promise(resolve=>{const server=app.listen(Number(process.env.EDITORIAL_TEST_PORT)||0,'127.0.0.1',()=>resolve(server));});
  const base='http://127.0.0.1:'+server.address().port;
  let cookie='';
  async function request(route,options={}){
    const headers={...options.headers};if(cookie)headers.Cookie=cookie;
    let body;if(options.form){body=new URLSearchParams(options.form).toString();headers['Content-Type']='application/x-www-form-urlencoded';headers.Origin=base;headers['Content-Length']=Buffer.byteLength(body);}
    return new Promise((resolve,reject)=>{const req=http.request(base+route,{method:options.form?'POST':'GET',headers},res=>{let html='';res.setEncoding('utf8');res.on('data',part=>html+=part);res.on('end',()=>{if(res.headers['set-cookie'])cookie=res.headers['set-cookie'].map(v=>v.split(';')[0]).join('; ');resolve({status:res.statusCode,headers:res.headers,html});});});req.on('error',reject);req.end(body);});
  }
  try{
    const login=await request('/admin/login',{form:{password:process.env.ADMIN_PASSWORD}});
    if(login.status!==302)throw new Error('Fixture CMS login failed');
  }catch(error){await new Promise(resolve=>server.close(resolve));db.close();global.fetch=originalFetch;throw error;}
  return {base,request,close:async()=>{await new Promise(resolve=>server.close(resolve));db.close();global.fetch=originalFetch;}};
}
module.exports={start,db,directory,originalDates,modified,programSlugs,sourceHtml,lastDraftInput:()=>lastDraftInput};
if(require.main===module&&process.env.EDITORIAL_TEST_PORT)start().then(({base})=>console.log(JSON.stringify({base,directory}))).catch(error=>{console.error(error);process.exitCode=1;});
