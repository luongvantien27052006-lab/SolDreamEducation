'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const guidePath = path.join(__dirname, '..', 'data', 'editorial-cache-guide.md');
const guide = fs.readFileSync(guidePath, 'utf8');

test('editorial cache guide is long, human-readable and protects factual coverage', () => {
  const words = guide.trim().split(/\s+/u).length;
  assert.ok(words > 40_000, `guide is too short: ${words} words`);
  assert.match(guide, /không lược bỏ quá nhiều/i);
  assert.match(guide, /Bảo toàn toàn bộ dữ kiện trọng yếu/i);
  assert.match(guide, /Mẫu hồ sơ trường đại học đầy đủ/i);
  assert.match(guide, /TỪ ĐIỂN BIÊN TẬP HÀN–VIỆT/i);
  assert.match(guide, /SEO, GEO và khả năng trích xuất/i);
});

test('editorial cache guide includes mandatory source, table, attachment and indexing rules', () => {
  for (const rule of ['website chính thức của chính trường', 'bảng HTML', 'tệp đính kèm', 'chỉ mục chatbot', 'sitemap.xml', 'IndexNow']) {
    assert.match(guide, new RegExp(rule, 'i'));
  }
});
