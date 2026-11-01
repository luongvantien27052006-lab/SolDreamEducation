'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fixture=require('./helpers/editorialTestApp.cjs');
let app;
test.before(async()=>{app=await fixture.start();});
test.after(async()=>{if(app)await app.close();});

test('English introduction uses CMS copy and real photos without changing course terms',async()=>{
  const before=fixture.db.prepare('SELECT * FROM courses ORDER BY id').all();
  const page=await app.request('/khoa-hoc/tieng-anh-giao-tiep');
  assert.equal(page.status,200);
  assert.equal((page.html.match(/<h1\b/g)||[]).length,1);
  assert.match(page.html,/Vững nền tảng\. Tự tin giao tiếp\./);
  assert.match(page.html,/Định hướng IELTS/);
  for(let i=1;i<=5;i++)assert.ok(page.html.includes(`/img/english/classroom-${i}-1280.jpg`));
  assert.match(page.html,/srcset="\/img\/english\//);
  assert.match(page.html,/value="Tiếng Anh giao tiếp" selected/);
  assert.match(page.html,/data-lead-form/);
  assert.doesNotMatch(page.html,/IELTS Master|5,200|98\.5%|Cambridge 2026|Voucher|Trần Minh Anh|7\.5\+ Trong/);
  const note=page.html.match(/<aside class="source-note">([\s\S]*?)<\/aside>/)[1];
  assert.doesNotMatch(note,/tiếng Hàn|90 phút|3 buổi/);
  assert.deepEqual(fixture.db.prepare('SELECT * FROM courses ORDER BY id').all(),before);
});

test('CMS save/reopen survives reinitialization, escapes copy and changes only English page freshness',async()=>{
  const db=fixture.db;
  const protectedBefore=Object.fromEntries(['courses','posts','programs','faqs','shared_blocks'].map(t=>[t,db.prepare('SELECT * FROM '+t+' ORDER BY rowid').all()]));
  const row=db.prepare("SELECT * FROM site_datasets WHERE key='english-course'").get();
  const data=JSON.parse(row.content);
  const oldKorean=await app.request('/khoa-hoc/tieng-han-so-cap-1');
  const oldEnglish=await app.request('/khoa-hoc/tieng-anh-giao-tiep');
  const token=Buffer.from(JSON.stringify(['intro'])).toString('base64url');
  const intro='Lời giới thiệu từ CMS & mục tiêu tiếng Anh. <script>không thực thi</script>';
  const saved=await app.request('/admin/du-lieu-trang/english-course',{form:{['values['+token+']']:intro,page:'1'}});
  assert.equal(saved.status,302);
  const reopened=await app.request('/admin/du-lieu-trang/english-course');
  assert.equal(reopened.status,200);
  assert.ok(reopened.html.includes('Lời giới thiệu từ CMS &amp; mục tiêu tiếng Anh.'));
  require('../lib/siteContentMigration').applySiteContent(db);
  assert.equal(JSON.parse(db.prepare("SELECT content FROM site_datasets WHERE key='english-course'").get().content).intro,intro);
  const updated=await app.request('/khoa-hoc/tieng-anh-giao-tiep');
  assert.ok(updated.html.includes('&lt;script&gt;không thực thi&lt;/script&gt;'));
  assert.notEqual(updated.headers.etag,oldEnglish.headers.etag);
  const korean=await app.request('/khoa-hoc/tieng-han-so-cap-1');
  assert.equal(korean.html,oldKorean.html);
  for(const [table,rows]of Object.entries(protectedBefore))assert.deepEqual(db.prepare('SELECT * FROM '+table+' ORDER BY rowid').all(),rows);
  const freshness=require('../lib/pageFreshness').getPageFreshness({database:db});
  assert.ok(freshness.get('/khoa-hoc/tieng-anh-giao-tiep'));
  db.prepare("UPDATE site_datasets SET content=?,updated_at=? WHERE key='english-course'").run(JSON.stringify(data),row.updated_at);
});

test('hiding the new introduction retains the original English course and its own notice',async()=>{
  const row=fixture.db.prepare("SELECT * FROM site_datasets WHERE key='english-course'").get();
  const data=JSON.parse(row.content);data.enabled=false;
  fixture.db.prepare("UPDATE site_datasets SET content=? WHERE key='english-course'").run(JSON.stringify(data));
  try{
    const page=await app.request('/khoa-hoc/tieng-anh-giao-tiep');
    assert.equal(page.status,200);
    assert.doesNotMatch(page.html,/<header class="english-hero">/);
    assert.equal((page.html.match(/<h1\b/g)||[]).length,1);
    assert.doesNotMatch(page.html.match(/<aside class="source-note">([\s\S]*?)<\/aside>/)[1],/tiếng Hàn|90 phút/);
  }finally{fixture.db.prepare("UPDATE site_datasets SET content=?,updated_at=? WHERE key='english-course'").run(row.content,row.updated_at);}
});
