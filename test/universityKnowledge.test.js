'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { getRelevantKnowledge } = require('../lib/chatKnowledge');
const { getUniversityKnowledge } = require('../lib/universityKnowledge');

test('retrieves the correct tuition section for an accentless school query', () => {
  const result = getUniversityKnowledge('hoc phi truong Hanyang bao nhieu?');
  assert.match(result, /Trường Đại học Hanyang/);
  assert.match(result, /Seoul Campus: ~1\.800\.000 won/);
  assert.match(result, /ERICA Campus: ~1\.360\.000/);
  assert.doesNotMatch(result, /Trường Đại học Hannam/);
});

test('returns a complete profile for one explicitly named university', () => {
  const result = getUniversityKnowledge('Cho tôi thông tin đầy đủ về đại học Gimhae');
  assert.match(result, /1\. Thông tin chung/);
  assert.match(result, /2\. Chương trình đào tạo/);
  assert.match(result, /3\. Học phí/);
  assert.match(result, /4\. Chính sách Học bổng/);
  assert.match(result, /5\. Ký túc xá/);
  assert.match(result, /Điều dưỡng, Cấp cứu Y tế/);
});

test('returns comparable tuition data across the imported university list', () => {
  const result = getUniversityKnowledge('So sánh học phí tất cả các trường đại học trong list');
  for (const name of ['Hannam', 'Woosong', 'Hanyang', 'Daeduk', 'Dongyang', 'Gimhae']) {
    assert.match(result, new RegExp(`Trường Đại học ${name}`));
  }
  assert.doesNotMatch(result, /5\. Ký túc xá/);
});

test('integrates detailed university knowledge into the chatbot context', () => {
  const result = getRelevantKnowledge('Đại học Dongyang có ngành nào và học phí bao nhiêu?');
  assert.match(result, /Kỹ thuật Vận tải Đường sắt/);
  assert.match(result, /Khối Kỹ thuật Đường sắt & CNTT/);
  assert.match(result, /Lưu ý về dữ liệu/);
});

test('does not confuse a university degree-program cost with the general programme list', () => {
  const result = getRelevantKnowledge('Học phí chương trình đại học Hanyang là bao nhiêu?');
  assert.match(result, /Trường Đại học Hanyang/);
  assert.match(result, /Kỹ thuật, Điện toán/);
  assert.doesNotMatch(result, /Cao đẳng tỉnh lập Gangwon/);
});

test('combines previously stored chatbot memory with current website knowledge', () => {
  const legacy = getRelevantKnowledge('Thạc sĩ Hannam ngành Golf cần chuẩn bị tài chính thế nào?');
  assert.match(legacy, /BỘ NHỚ KIẾN THỨC ĐÃ LƯU TRƯỚC ĐÂY/);
  assert.match(legacy, /8\.000\.000 KRW/);
  assert.match(legacy, /DỮ LIỆU ĐƯỢC TRUY XUẤT TỪ CÁC TRANG/);

  const current = getRelevantKnowledge('Học phí và visa D4-1 Đại học Pusan');
  assert.match(current, /BỘ NHỚ KIẾN THỨC ĐÃ LƯU TRƯỚC ĐÂY/);
  assert.match(current, /du-hoc-dai-hoc-quoc-gia-pusan/i);
});
