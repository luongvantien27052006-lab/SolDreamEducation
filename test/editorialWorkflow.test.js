'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fixture=require('./helpers/editorialTestApp.cjs');
const {decodeAttributeEntities}=require('../lib/htmlEntities');
const {automaticDescription}=require('../lib/seoDescription');
let environment;
test.before(async()=>{environment=await fixture.start();});
test.after(async()=>environment?.close());
const db=fixture.db;
const request=(...args)=>environment.request(...args);
function article(html){const nodes=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap(m=>{const v=JSON.parse(m[1]);return v['@graph']||[v];});return nodes.find(v=>v['@type']==='Article');}
function meta(html,name){const tag=[...html.matchAll(/<meta\b[^>]+>/g)].map(m=>m[0]).find(tag=>tag.includes('"'+name+'"'));return decodeAttributeEntities(tag?.match(/content="([^"]*)"/)?.[1]||'');}
function form(row,extra={}){return {title:row.title,slug:row.slug,excerpt:row.excerpt,content:row.content,topic:row.topic||'cam-nang-sinh-hoat',category:row.category,cover:row.cover||'p1',meta_description:row.meta_description||'',source_urls:row.source_urls||'',author_type:row.author_type||'organization',published:String(row.published),publication_date:row.created_at?.slice(0,10)||'',faq_mode:'off',show_summary:String(row.show_summary??0),show_sources:String(row.show_sources??0),...extra};}
function assertSeo(response,description){assert.equal(response.status,200,response.html.slice(0,300));assert.equal(meta(response.html,'description'),description);assert.equal(meta(response.html,'og:description'),description);assert.equal(article(response.html).description,description);}

test('all eight historical posts retain their original Article dates through CMS save/reopen',async()=>{
  for(const [id,date] of Object.entries(fixture.originalDates)){
    const row=db.prepare('SELECT * FROM posts WHERE id=?').get(id);
    const first=await request('/tin-tuc/'+row.slug);
    assert.equal(article(first.html).datePublished,date);assert.equal(article(first.html).dateModified,fixture.modified);
    assert.equal((await request('/admin/tin-tuc/'+id+'/sua',{form:form(row)})).status,302);
    const reopened=await request('/admin/tin-tuc/'+id+'/sua');assert.equal(reopened.status,200);assert.ok(reopened.html.includes('value="'+date+'"'));
    const saved=db.prepare('SELECT * FROM posts WHERE id=?').get(id);
    assert.equal(saved.first_published_at,date);assert.equal(saved.content_modified_at,fixture.modified,JSON.stringify(Object.fromEntries(Object.keys(row).filter(key=>row[key]!==saved[key]).map(key=>[key,[row[key],saved[key]]]))));
    assert.equal(article((await request('/tin-tuc/'+row.slug)).html).datePublished,date);
  }
  const row=db.prepare('SELECT * FROM posts WHERE id=1').get();
  await request('/admin/tin-tuc/1/sua',{form:form(row,{content:row.content+'<p>Đoạn biên tập bổ sung trong dữ liệu thử.</p>',publication_date:'2026-10-21'})});
  const updated=db.prepare('SELECT * FROM posts WHERE id=1').get();
  assert.equal(updated.first_published_at,'2025-07-31');assert.notEqual(updated.content_modified_at,fixture.modified);
  const schema=article((await request('/tin-tuc/'+row.slug)).html);
  assert.equal(schema.datePublished,'2025-07-31');assert.equal(schema.dateModified,updated.content_modified_at);
});

test('manual SEO survives create, update, omitted fields and CMS reopen; blank SEO is generated cleanly',async()=>{
  const manual='Mô tả tự biên tập & giữ nguyên, kể cả khi lưu lại.';
  const content='<div class=breadcrumb>Trang chủ › Cẩm nang</div><div class=article-controls>In bài Chia sẻ</div><p>Lượt thích (12)</p><p>Cỡ chữ: A− A A+</p><p>'+('Các dịch vụ hỗ trợ đời sống và tư vấn giúp người học liên hệ đúng đơn vị tại Hàn Quốc. '.repeat(5))+'</p>';
  const input={title:'Bài thử quy trình CMS và SEO',slug:'workflow-seo-test',content,excerpt:'',meta_description:manual,published:'1',topic:'cam-nang-sinh-hoat',faq_mode:'off'};
  assert.equal((await request('/admin/tin-tuc/moi',{form:input})).status,302);
  let row=db.prepare('SELECT * FROM posts WHERE slug=?').get(input.slug);
  assert.equal(row.meta_description,manual);assertSeo(await request('/tin-tuc/'+row.slug),manual);
  const editor=await request('/admin/tin-tuc/'+row.id+'/sua');assert.ok(editor.html.includes('Mô tả tự biên tập &amp; giữ nguyên'));
  const omitted=form(row,{content:row.content+'<p>Cập nhật thử.</p>'});delete omitted.meta_description;
  await request('/admin/tin-tuc/'+row.id+'/sua',{form:omitted});
  row=db.prepare('SELECT * FROM posts WHERE id=?').get(row.id);assert.equal(row.meta_description,manual);assertSeo(await request('/tin-tuc/'+row.slug),manual);
  await request('/admin/tin-tuc/'+row.id+'/sua',{form:form(row,{meta_description:'',content})});
  row=db.prepare('SELECT * FROM posts WHERE id=?').get(row.id);
  const expected=automaticDescription('',content);assert.equal(row.meta_description,expected);assert.ok(!/Trang chủ|Chia sẻ|lượt thích|Cỡ chữ|A−/i.test(expected));assert.ok(expected.length<=160);
  const prefix=expected.replace(/…$/,'');assert.match(('Các dịch vụ hỗ trợ đời sống và tư vấn giúp người học liên hệ đúng đơn vị tại Hàn Quốc. '.repeat(5)).slice(prefix.length),/^\s/);
  assertSeo(await request('/tin-tuc/'+row.slug),expected);
  const reopened=await request('/admin/tin-tuc/'+row.id+'/sua');assert.ok(reopened.html.includes(expected));
  await request('/admin/tin-tuc/'+row.id+'/sua',{form:form(row)});assert.equal(db.prepare('SELECT meta_description FROM posts WHERE id=?').get(row.id).meta_description,expected);
});

test('both study pages use current shared CMS blocks and complete-render cache validation',async()=>{
  for(const slug of fixture.programSlugs){
    const row=db.prepare('SELECT * FROM programs WHERE slug=?').get(slug),route='/du-hoc/'+slug;
    const manual='Lời mô tả chương trình được biên tập & giữ nguyên.';
    assert.equal((await request('/admin/du-hoc/'+row.id+'/sua',{form:form(row,{meta_description:manual})})).status,302);
    assertSeo(await request(route),manual);
    const first=await request(route);assert.ok(first.headers.etag);assert.equal(first.headers['last-modified'],undefined);assert.match(first.headers['cache-control'],/no-cache/);
    assert.equal((await request(route,{headers:{'If-Modified-Since':new Date(fixture.modified).toUTCString()}})).status,200);
    assert.equal((await request(route,{headers:{'If-None-Match':first.headers.etag}})).status,304);
    const old=db.prepare("SELECT * FROM shared_blocks WHERE key='footer-contact'").get();
    const marker='Cập nhật liên hệ từ CMS cho '+row.id;
    assert.equal((await request('/admin/noi-dung-chung/footer-contact/sua',{form:{...old,content:old.content+'<p>'+marker+'</p>',active:'1'}})).status,302);
    assert.ok((await request('/admin/noi-dung-chung/footer-contact/sua')).html.includes(marker));
    const after=await request(route,{headers:{'If-None-Match':first.headers.etag,'If-Modified-Since':new Date(fixture.modified).toUTCString()}});
    assert.equal(after.status,200);assert.notEqual(after.headers.etag,first.headers.etag);
    for(const text of ['03 6464 8282','Chi nhánh Đồng Nai','VPĐD miền Bắc','Trợ lý tư vấn du học',marker,row.excerpt])assert.ok(after.html.includes(text),text);
    assert.ok(!after.html.includes('SOL DREAM EDUCATION tổng hợp'));
    const current=db.prepare('SELECT * FROM programs WHERE id=?').get(row.id);assert.equal(article(after.html).dateModified,current.content_modified_at);
  }
});

test('site-copy edits from another connection appear on the next page request',async()=>{
  const Database=require('better-sqlite3'),other=new Database(process.env.DATABASE_PATH);
  try{const entry=db.prepare("SELECT key,value FROM site_copy WHERE key='view.duhoc-detail.004'").get();assert.ok(entry);
    await request('/du-hoc/'+fixture.programSlugs[0]);
    other.prepare('UPDATE site_copy SET value=? WHERE key=?').run('Nhãn mới từ kết nối CMS khác',entry.key);
    assert.ok((await request('/du-hoc/'+fixture.programSlugs[0])).html.includes('Nhãn mới từ kết nối CMS khác'));
  }finally{other.close();}
});

test('research import uses cleaned source and preserves SEO after editor publication (provider fixture)',async()=>{
  const source=db.prepare("SELECT * FROM research_sources WHERE url LIKE '%liveinkorea.kr%' LIMIT 1").get();assert.ok(source);
  const id=db.prepare(`INSERT INTO research_items(source_id,title,url,fingerprint,suggested_section,topic,source_text) VALUES(?,?,?,?,?,?,?)`).run(source.id,'Dịch vụ hỗ trợ đời sống cho người học tại Hàn Quốc',source.url+'?editorial-test=1','editorial-import-fixture','Cẩm nang & Thông tin','cam-nang-sinh-hoat',fixture.sourceHtml).lastInsertRowid;
  const imported=await request('/admin/nghien-cuu/'+id+'/tao-ban-nhap',{form:{}});
  assert.match(imported.headers.location,/\/admin\/tin-tuc\/\d+\/sua\?ai=1$/,imported.headers.location);
  assert.ok(!/Trang chủ|Chia sẻ|lượt thích|Cỡ chữ|A−/i.test(fixture.lastDraftInput().sourceText));
  const item=db.prepare('SELECT * FROM research_items WHERE id=?').get(id);assert.equal(item.status,'converted');
  let row=db.prepare('SELECT * FROM posts WHERE id=?').get(item.published_post_id);assert.equal(row.published,0);assert.ok(row.meta_description.length<=160);assert.ok(!/Trang chủ|Chia sẻ|lượt thích|Cỡ chữ|A−/i.test(row.meta_description));
  assert.equal((await request('/admin/tin-tuc/'+row.id+'/sua')).status,200);
  const manual='Bản nhập được biên tập lại: các kênh tư vấn hỗ trợ đời sống.';
  await request('/admin/tin-tuc/'+row.id+'/sua',{form:form(row,{published:'1',meta_description:manual})});
  row=db.prepare('SELECT * FROM posts WHERE id=?').get(row.id);assert.equal(row.published,1);assert.equal(row.meta_description,manual);assertSeo(await request('/tin-tuc/'+row.slug),manual);
  assert.ok((await request('/admin/tin-tuc/'+row.id+'/sua')).html.includes(manual));
});

test('startup does not regenerate existing FAQs with either completed migration marker',()=>{
  const upsert=db.prepare('INSERT INTO system_meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
  upsert.run('publication_pipeline_version','seo-geo-publication-v1');
  const before=db.prepare('SELECT * FROM faqs ORDER BY id').all();
  for(const marker of ['1','editable-20261020']){upsert.run('course_tuition_2026_faqs',marker);assert.deepEqual(require('../lib/publicationPipeline').ensurePublicationPipeline(),{applied:false});assert.deepEqual(db.prepare('SELECT * FROM faqs ORDER BY id').all(),before);}
});
