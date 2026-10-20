'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {sanitizeRichHtml}=require('../lib/contentSanitizer');
const {decodeAttributeEntities}=require('../lib/htmlEntities');
const {repairMapLinks}=require('../lib/sevenContentFixesMigration');
const {automaticDescription,storedDescription,cleanSourceText,truncateAtBoundary}=require('../lib/seoDescription');
const {publicationEvidence,calendarDate}=require('../lib/publicationHistory');
const {articleDates}=require('../lib/articleMetadata');

test('Maps URL survives repeated editor saves with one HTML entity layer',()=>{
  let html='<p><a href="https://www.google.com/maps/search/?api=1&amp;amp;query=SolDream%20TP.HCM">Bản đồ</a><img src="/img/logo.png" alt="A &amp; B"></p>';
  html=sanitizeRichHtml(html);
  for(let i=0;i<5;i++)assert.equal(sanitizeRichHtml(html),html);
  assert.ok(!html.includes('&amp;amp;'));
  assert.equal(new URL(decodeAttributeEntities(html.match(/href="([^"]+)"/)[1])).searchParams.get('query'),'SolDream TP.HCM');
  assert.match(html,/src="\/img\/logo.png"/);
});
test('attribute decoding does not admit encoded executable URLs or quote injection',()=>{
  const html=sanitizeRichHtml('<a href="java&amp;#x73;cript:alert(1)">X</a><img src="https://a.example/x&amp;quot; onerror=&amp;quot;alert(1)">');
  assert.ok(!html.includes('javascript:'));
  assert.ok(!html.includes(' onerror='));
});
test('Maps repair leaves non-map HTML and content untouched',()=>{
  const original='<div class="keep"><a href="/article?a=1&amp;amp;b=2">Text</a><a href="https://www.google.com/maps/search/?api=1&amp;amp;amp;query=Seoul">Map</a></div>';
  const fixed=repairMapLinks(original);
  assert.ok(fixed.includes('/article?a=1&amp;amp;b=2'));
  assert.ok(fixed.includes('?api=1&amp;query=Seoul'));
  assert.equal(repairMapLinks(fixed),fixed);
});
test('manual SEO descriptions are preserved even when short',()=>{
  const manual='Một mô tả do biên tập viên chọn.';
  assert.equal(storedDescription({meta_description:manual,excerpt:'Khác'}),manual);
});
test('external UI is removed before building descriptions and article text',()=>{
  const html='<nav>Trang chủ › Tin tức</nav><div class="breadcrumb"><span>Home</span> School</div><div class="font-size"><button>A+</button>A−</div><p>0 lượt thích</p><article><h2>Dịch vụ hỗ trợ</h2><p>Tư vấn cho người nước ngoài và gia đình đa văn hóa.</p></article>';
  const clean=cleanSourceText(html);
  assert.ok(!/Trang chủ|Home|A−|lượt thích/.test(clean));
  assert.match(automaticDescription('',html),/Dịch vụ hỗ trợ Tư vấn/);
});
test('automatic descriptions stop at complete words',()=>{
  const text='Tìm hiểu ngành học, học phí và điều kiện tuyển sinh tại các trường Hàn Quốc để lựa chọn chương trình phù hợp với năng lực và ngân sách. '.repeat(3);
  const result=truncateAtBoundary(text,160);
  assert.ok(result.length<=160);
  assert.ok(text.startsWith(result.slice(0,-1)));
  assert.match(text.slice(result.length-1),/^\s/);
});
test('original publication history wins over an edited display date',()=>{
  const evidence=publicationEvidence({published:1,created_at:'2026-10-20 12:00:00'},[{row:{published:1,created_at:'2022-11-07 10:00:00'},observedAt:'2026-10-19T00:00:00Z',source:'revision:1'}]);
  assert.equal(evidence.value,'2022-11-07');
  assert.equal(evidence.precision,'date');
  assert.equal(articleDates({published:1,first_published_at:evidence.value,created_at:'2026-10-20',content_modified_at:'2026-10-20T14:54:58Z'}).publishedTime,'2022-11-07');
});
test('exact publication timestamps remain intact and unpublished drafts get no invented date',()=>{
  assert.equal(publicationEvidence({first_published_at:'2022-11-07T03:00:00Z'}).value,'2022-11-07T03:00:00Z');
  assert.equal(publicationEvidence({published:0,created_at:'2026-10-20'}),null);
  assert.equal(calendarDate('2026-02-30'),'');
});
