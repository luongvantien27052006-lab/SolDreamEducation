'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {articleDates}=require('../lib/articleMetadata');
const {automaticDescription,cleanSourceText,storedDescription}=require('../lib/seoDescription');

test('publication_date fallback never replaces a recorded first publication date',()=>{
  assert.equal(articleDates({published:1,first_published_at:'2022-10-31',publication_date:'2026-10-21',created_at:'2026-10-21'}).publishedTime,'2022-10-31');
  assert.equal(articleDates({published:1,first_published_at:' ',publication_date:'2025-07-31',created_at:'2026-10-21'}).publishedTime,'2025-07-31');
  assert.equal(articleDates({published:1,publication_date:'2026-02-30',created_at:'2022-10-31'}).publishedTime,'2022-10-31');
  assert.equal(articleDates({published:1,content_modified_at:'2026-10-20T14:54:58.872Z',updated_at:'2026-10-21'}).modifiedTime,'2026-10-20T14:54:58.872Z');
});
test('automatic descriptions discard unquoted source UI containers',()=>{
  const html='<div class=breadcrumb>Trang chủ › Cẩm nang</div><div class=article-controls>In bài Chia sẻ</div><p>Dịch vụ tư vấn hỗ trợ người nước ngoài tại Hàn Quốc.</p>';
  assert.equal(automaticDescription('',html),'Dịch vụ tư vấn hỗ trợ người nước ngoài tại Hàn Quốc.');
});
test('plain copied controls and nonbreaking spaces do not enter SEO descriptions',()=>{
  const html='<p>Trang&nbsp;chủ › Cẩm nang</p><p>Lượt thích (12)</p><p>Cỡ chữ: A− A A+</p><p>Thông tin về dịch vụ hỗ trợ, tư vấn đời sống cho người nước ngoài.</p>';
  assert.equal(automaticDescription('',html),'Thông tin về dịch vụ hỗ trợ, tư vấn đời sống cho người nước ngoài.');
});
test('UI removal retains real article references to likes and font size',()=>{
  const text='Người học cần kiểm tra lượt thích của bài viết trong nghiên cứu và tăng cỡ chữ khi đọc tài liệu.';
  assert.equal(cleanSourceText('<p>'+text+'</p>'),text);
  assert.equal(storedDescription({meta_description:'Mô tả biên tập viên chọn & giữ nguyên.'}),'Mô tả biên tập viên chọn & giữ nguyên.');
});
test('automatically generated descriptions end on full words for different limits',()=>{
  const text='Các dịch vụ tư vấn giúp học viên chuẩn bị hồ sơ, tìm hiểu đời sống và liên hệ đơn vị hỗ trợ phù hợp tại Hàn Quốc. '.repeat(5);
  for(const limit of [80,120,160]){
    const description=automaticDescription(text,'',limit),prefix=description.replace(/…$/,'');
    assert.ok(description.length<=limit);
    assert.ok(text.startsWith(prefix));
    assert.match(text.slice(prefix.length),/^[\s.,;:!?]/u);
  }
});
