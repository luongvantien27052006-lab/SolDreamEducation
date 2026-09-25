'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  htmlToText, getPublishedPrograms, getPublishedPosts,
  getWebsiteDocuments, getRelevantWebsiteDocuments, getWebsiteKnowledge,
  syncWebsiteKnowledge, getSuggestedWebsiteQuestions, getIndexStats,
} = require('../lib/websiteKnowledge');
const { getCourses } = require('../lib/courseKnowledge');
const { getSiteFaqs } = require('../lib/siteFaq');

test('converts pasted rich text and tables into searchable plain text', () => {
  const result = htmlToText('<h2>Học phí</h2><table><tr><th>Khoản</th><th>KRW</th></tr><tr><td>Học phí</td><td>5.000.000</td></tr></table>');
  assert.match(result, /Học phí/);
  assert.match(result, /Khoản \| KRW/);
  assert.match(result, /5\.000\.000/);
});

test('indexes every published post, university/program, course and FAQ', () => {
  const documents = getWebsiteDocuments();
  for (const row of [...getPublishedPrograms(), ...getPublishedPosts()]) {
    assert.ok(documents.some((document) => document.title.includes(row.title)), `missing ${row.title}`);
  }
  for (const row of getPublishedPosts()) {
    assert.ok(documents.some((document) => document.id === `post:${row.id}:summary`), `missing full post index ${row.id}`);
  }
  for (const course of getCourses()) {
    assert.ok(documents.some((document) => document.type === 'course' && document.title === course.name), `missing course ${course.name}`);
  }
  for (const faq of getSiteFaqs()) {
    assert.ok(documents.some((document) => document.type === 'faq' && document.id === `faq:${faq.id}`), `missing FAQ ${faq.id}`);
  }
});

test('prioritizes the complete handbook catalogue for broad handbook questions', () => {
  const documents = getRelevantWebsiteDocuments('Website có những cẩm nang nào?', { maxDocuments: 5 });
  assert.equal(documents[0]?.id, 'catalog:handbooks');
  assert.ok(documents[0].text.includes(getPublishedPosts()[0].title));
});

test('retrieves the newly published Pusan page and its quantitative content', () => {
  const documents = getRelevantWebsiteDocuments('Học phí và điều kiện visa D4-1 Đại học Pusan', { maxDocuments: 12 });
  assert.ok(documents.some((document) => /Pusan/i.test(document.title)));
  const knowledge = getWebsiteKnowledge('Học phí và điều kiện visa D4-1 Đại học Pusan', { maxDocuments: 12, maxChars: 24000 });
  assert.match(knowledge, /Pusan/i);
  assert.match(knowledge, /\/truong-dai-hoc\/du-hoc-dai-hoc-quoc-gia-pusan/);
});

test('returns complete dynamic catalogues for broad programme and news questions', () => {
  const programmes = getWebsiteKnowledge('Có tất cả những chương trình du học nào?');
  const schools = getWebsiteKnowledge('Có tất cả những thông tin trường nào?');
  const news = getWebsiteKnowledge('Tin tức mới nhất');
  for (const row of getPublishedPrograms().filter((item) => item.category !== 'Thông tin trường')) assert.match(programmes, new RegExp(row.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  for (const row of getPublishedPrograms().filter((item) => item.category === 'Thông tin trường')) assert.match(schools, new RegExp(row.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  for (const row of getPublishedPosts()) assert.match(news, new RegExp(row.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

test('persists the website knowledge index and generates questions from current content', () => {
  const result = syncWebsiteKnowledge({ force: true });
  const stats = getIndexStats();
  assert.ok(result.documents >= getWebsiteDocuments().length);
  assert.equal(stats.documents, result.documents);
  assert.ok(stats.questions > 0);

  const suggestions = getSuggestedWebsiteQuestions('Đại học Quốc gia Seoul học phí visa', 4);
  assert.equal(suggestions.length, 4);
  assert.ok(suggestions.every((item) => item.url === '/truong-dai-hoc/dai-hoc-quoc-gia-seoul'));
  assert.ok(suggestions.some((item) => /visa/i.test(item.question)));
  assert.ok(suggestions.some((item) => /ngành học/i.test(item.question)));
});
