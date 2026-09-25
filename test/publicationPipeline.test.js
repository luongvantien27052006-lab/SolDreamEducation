'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  makeExtractableSummary, makeSeoTitle, makeMetaDescription, deriveFaqs,
} = require('../lib/publicationPipeline');
const { optimizeCrawledItem } = require('../lib/researchBot');
const { countWords } = require('../lib/util');

test('publication pipeline creates extractable SEO and GEO fields without inventing facts', () => {
  const content = '<p>Trường công bố kỳ tuyển sinh tháng 9. Hồ sơ gồm bằng tốt nghiệp, bảng điểm và kế hoạch học tập. Học phí cần được xác nhận theo ngành.</p>';
  const summary = makeExtractableSummary('Thông tin tuyển sinh Đại học A', '', content);
  const title = makeSeoTitle('Thông tin tuyển sinh Đại học A');
  const description = makeMetaDescription(summary, content);
  assert.ok(countWords(summary) >= 30 && countWords(summary) <= 60);
  assert.ok(title.length <= 65);
  assert.ok(description.length <= 160);
  assert.match(summary, /Hồ sơ|Trường công bố/);
});

test('publication pipeline derives related FAQs from approved headings and answers', () => {
  const faqs = deriveFaqs('program', {
    id: 99, title: 'Chương trình du học Đại học A', category: 'Trường đại học', excerpt: 'Thông tin tuyển sinh dành cho sinh viên quốc tế được trường công bố cho kỳ tháng 9 và cần kiểm tra lại trước khi nộp hồ sơ.',
    content: '<h2>Điều kiện tuyển sinh gồm những gì?</h2><p>Ứng viên chuẩn bị bằng tốt nghiệp, bảng điểm và kế hoạch học tập. Yêu cầu chi tiết phụ thuộc ngành đăng ký và thông báo của trường.</p><h2>Học phí được xác định thế nào?</h2><p>Học phí phụ thuộc chuyên ngành và số tín chỉ. Người học cần đối chiếu bảng phí của kỳ tuyển sinh trước khi đóng tiền.</p>',
  });
  assert.ok(faqs.length >= 2);
  assert.ok(faqs.every((faq) => faq.question.endsWith('?') && faq.answer.length >= 35));
  assert.match(faqs.map((faq) => faq.answer).join(' '), /bằng tốt nghiệp|Học phí/);
});

test('crawler normalizes and scores discovered official data before editorial review', () => {
  const item = optimizeCrawledItem({
    title: '  • 2027  Tuyển sinh sinh viên quốc tế  ',
    url: 'https://university.example/admission/2027', excerpt: '', suggestedSection: 'Thông tin trường',
  }, { name: 'Đại học A – Nguồn chính thức' });
  assert.equal(item.title, '2027 Tuyển sinh sinh viên quốc tế');
  assert.ok(item.qualityScore >= 70);
  assert.match(item.excerpt, /đối chiếu nguồn/);
  assert.match(item.optimizationNote, /chuẩn hóa/);
});
