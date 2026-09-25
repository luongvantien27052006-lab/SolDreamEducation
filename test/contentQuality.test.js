'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { decorate, stripHtml, countWords, makeBluf, parseSourceUrls, normalizeSourceUrls } = require('../lib/util');
const { authorEntity } = require('../lib/seo');
const { getCourses } = require('../lib/courseKnowledge');
const { faqs } = require('../lib/siteFaq');
const { sanitizeRichHtml } = require('../lib/contentSanitizer');
const { generateRssXml } = require('../lib/feed');
const { INDEXNOW_KEY, buildIndexNowPayload } = require('../lib/indexNow');
const { hasHangul, toVietnameseVisibleText } = require('../lib/visibleVietnamese');

test('computes visible word counts for GEO editorial warnings', () => {
  assert.equal(stripHtml('<p>Sol Dream &amp; học viên</p>'), 'Sol Dream & học viên');
  assert.equal(countWords('<p>Sol Dream hỗ trợ học viên.</p>'), 6);
  const item = decorate({
    created_at: '2026-08-01 09:00:00',
    updated_at: '2026-08-27 10:00:00',
    excerpt: 'Tóm tắt hữu ích',
    content: '<p>Nội dung do Sol Dream biên soạn.</p>',
  });
  assert.equal(item.updatedDateFull, '27/08/2026');
  assert.ok(item.wordCount > 5);
});

test('removes untranslated Korean fragments from user-facing text', () => {
  const text = toVietnameseVisibleText('Thông tin 서울대학교 và 출입국/체류안내');
  assert.equal(hasHangul(text), false);
  assert.match(text, /Đại học Quốc gia Seoul/);
  assert.match(text, /hướng dẫn xuất nhập cảnh và cư trú/);
});

test('creates 30–60 word extractable BLUF blocks', () => {
  const bluf = makeBluf('Khóa học mẫu', 'Dành cho người mới bắt đầu.');
  assert.ok(countWords(bluf) >= 30);
  assert.ok(countWords(bluf) <= 60);
  for (const course of getCourses()) {
    assert.ok(countWords(course.bluf) >= 30, course.name);
    assert.ok(countWords(course.bluf) <= 60, course.name);
  }
  for (const faq of faqs) {
    assert.ok(countWords(faq.answer) >= 30, faq.question);
    assert.ok(countWords(faq.answer) <= 60, faq.question);
  }
});

test('uses Person schema only when a real named author is supplied', () => {
  assert.deepEqual(authorEntity({}), { '@id': 'https://soldream.edu.vn/#organization' });
  assert.deepEqual(authorEntity({ author_name: 'Nguyễn An', author_role: 'Biên tập viên' }), {
    '@type': 'Person', name: 'Nguyễn An', jobTitle: 'Biên tập viên',
    worksFor: { '@id': 'https://soldream.edu.vn/#organization' },
  });
});

test('keeps pasted tables and useful formatting while removing executable HTML', () => {
  const html = sanitizeRichHtml('<h2 style="text-align:center" onclick="alert(1)">Học phí</h2><table><tr><th>Khoản</th><th>KRW</th></tr><tr><td>Học phí</td><td style="color:#333">6.000.000</td></tr></table><script>alert(1)</script><a href="javascript:alert(1)">xấu</a><img src="/uploads/test.png" onerror="alert(1)">');
  assert.match(html, /<h2 style="text-align: center">Học phí<\/h2>/);
  assert.match(html, /<table>/);
  assert.match(html, /<th>KRW<\/th>/);
  assert.match(html, /src="\/uploads\/test.png"/);
  assert.doesNotMatch(html, /script|onclick|onerror|javascript/i);
});

test('keeps valid source coverage markers and rejects arbitrary data attributes', () => {
  const html = sanitizeRichHtml('<div data-source-blocks="SRC-0001, SRC-0002" data-private="x">Nội dung đã đối chiếu</div>');
  assert.match(html, /data-source-blocks="SRC-0001,SRC-0002"/);
  assert.doesNotMatch(html, /data-private/);
});

test('keeps safe high-quality video embeds while removing executable media attributes', () => {
  const html = sanitizeRichHtml('<figure><video src="/uploads/tu-van.mp4" controls autoplay onplay="steal()"><source src="/uploads/tu-van.webm" type="video/webm"><track onload="steal()"></video><figcaption>Hướng dẫn hồ sơ</figcaption></figure>');
  assert.match(html, /<video[^>]+src="\/uploads\/tu-van\.mp4"/);
  assert.match(html, /controls/);
  assert.match(html, /playsinline/);
  assert.match(html, /preload="metadata"/);
  assert.match(html, /<source src="\/uploads\/tu-van\.webm" type="video\/webm">/);
  assert.doesNotMatch(html, /autoplay|onplay|track|steal/i);
});

test('normalizes official citations for visible links and Article schema', () => {
  assert.deepEqual(parseSourceUrls('https://studyinkorea.go.kr/a\njavascript:bad\nhttps://studyinkorea.go.kr/a\nhttps://example.edu/b'), [
    'https://studyinkorea.go.kr/a', 'https://example.edu/b',
  ]);
  assert.equal(normalizeSourceUrls('https://example.edu/a, https://example.edu/b'), 'https://example.edu/a\nhttps://example.edu/b');
  const item = decorate({ created_at: '2026-08-28', content: 'Nội dung', source_urls: 'https://example.edu/a' });
  assert.deepEqual(item.sourceLinks, ['https://example.edu/a']);
});

test('builds RSS discovery and same-host IndexNow payloads', () => {
  const rss = generateRssXml({ posts: [{ title: 'Hồ sơ D4', slug: 'ho-so-d4', excerpt: 'Hướng dẫn', category: 'Du học', updated_at: '2026-08-28' }] });
  assert.match(rss, /<rss version="2\.0">/);
  assert.match(rss, /https:\/\/soldream\.edu\.vn\/tin-tuc\/ho-so-d4/);
  const payload = buildIndexNowPayload(['/tin-tuc/ho-so-d4', 'https://outside.example/x'], 'test-key');
  assert.deepEqual(payload.urlList, ['https://soldream.edu.vn/tin-tuc/ho-so-d4']);
  assert.equal(payload.key, 'test-key');
  assert.match(INDEXNOW_KEY, /^[a-z0-9-]{8,128}$/i);
});
