'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('../db');
const { assessContent } = require('../lib/contentQuality');
const { generateLlmsTxt } = require('../lib/llms');
const { authorEntity } = require('../lib/seo');

test('database migration provides per-page SEO and indexing controls', () => {
  for (const table of ['posts', 'programs']) {
    const columns = new Set(db.prepare(`PRAGMA table_info(${table})`).all().map((column) => column.name));
    for (const field of ['seo_title', 'meta_description', 'focus_keyword', 'author_url', 'noindex']) assert.ok(columns.has(field), `${table}.${field}`);
  }
});

test('content quality scoring rewards complete, sourced and structured content', () => {
  const weak = assessContent({ title: 'Ngắn', excerpt: 'Mô tả ngắn', content: '<p>Ít nội dung</p>' });
  const strong = assessContent({
    title: 'Học phí du học Hàn Quốc năm 2026 cần bao nhiêu?',
    seo_title: 'Học phí du học Hàn Quốc 2026: Bảng chi tiết',
    meta_description: 'Bảng dự toán học phí, ký túc xá, bảo hiểm và sinh hoạt phí du học Hàn Quốc năm 2026 kèm điều kiện áp dụng và nguồn đối chiếu chính thức.',
    excerpt: 'Chi phí du học Hàn Quốc phụ thuộc trường, thành phố, chương trình và thời gian học. Bảng dưới đây tách học phí, ký túc xá, bảo hiểm và sinh hoạt phí để học viên dự toán ngân sách trước khi nộp hồ sơ.',
    content: `<h2>Chi phí gồm những gì?</h2><table><tr><th>Khoản</th><th>Chi phí</th></tr><tr><td>Học phí</td><td>5.000.000 KRW</td></tr></table>${'<p>Nội dung tư vấn chi tiết có điều kiện áp dụng và giải thích theo hồ sơ thực tế.</p>'.repeat(80)}`,
    source_urls: 'https://www.studyinkorea.go.kr/', author_name: 'Nguyễn An', author_url: 'https://linkedin.com/in/nguyen-an', cover_image: '/uploads/cover.webp', focus_keyword: 'chi phí du học Hàn Quốc',
  });
  assert.ok(strong.score > weak.score);
  assert.ok(strong.score >= 75);
});

test('llms index exposes canonical public knowledge links without full duplicated articles', () => {
  const text = generateLlmsTxt({ posts: [{ title: 'Bài mới', slug: 'bai-moi', excerpt: 'Tóm tắt bài.' }], programs: [{ title: 'Pusan', slug: 'pusan', excerpt: 'Thông tin Pusan.' }] });
  assert.match(text, /# SOL DREAM EDUCATION/);
  assert.match(text, /\/tin-tuc\/bai-moi/);
  assert.match(text, /\/du-hoc\/pusan/);
  assert.match(text, /sitemap\.xml/);
});

test('article author schema includes a verifiable profile URL when supplied', () => {
  const author = authorEntity({ author_name: 'Nguyễn An', author_role: 'Cố vấn', author_url: 'https://linkedin.com/in/nguyen-an' });
  assert.equal(author.url, 'https://linkedin.com/in/nguyen-an');
  assert.deepEqual(author.sameAs, ['https://linkedin.com/in/nguyen-an']);
});
