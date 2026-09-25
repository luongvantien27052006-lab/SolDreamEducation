'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { buildSitemapEntries, generateSitemapXml } = require('../lib/sitemap');

test('sitemap scans every active university and course', () => {
  const entries = buildSitemapEntries();
  for (const id of ['hannam', 'woosong', 'hanyang', 'daeduk', 'dongyang', 'gimhae']) {
    assert.ok(entries.some((entry) => entry.loc.endsWith(`/truong-dai-hoc/${id}`)), id);
  }
  for (const id of ['giao-tiep-giao-vien-han', 'tieng-han-giao-tiep', 'tieng-han-so-cap-1', 'tieng-han-cap-toc', 'phat-am-tieng-han', 'tieng-anh-giao-tiep']) {
    assert.ok(entries.some((entry) => entry.loc.endsWith(`/khoa-hoc/${id}`)), id);
  }
  assert.ok(entries.every((entry) => entry.changefreq === 'weekly'));
  assert.ok(entries.every((entry) => entry.priority === '0.8'));
  assert.ok(entries.some((entry) => entry.loc.endsWith('/tro-ly-du-hoc')));
});

test('sitemap XML contains required metadata and escapes URLs', () => {
  const xml = generateSitemapXml();
  assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  assert.match(xml, /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9" xmlns:image="http:\/\/www\.google\.com\/schemas\/sitemap-image\/1\.1">/);
  assert.match(xml, /<lastmod>2026-08-27<\/lastmod>/);
  assert.match(xml, /<changefreq>weekly<\/changefreq>/);
  assert.match(xml, /<priority>0\.8<\/priority>/);
});

test('sitemap exposes crawlable cover images', () => {
  const xml = generateSitemapXml({ posts: [{ title: 'Hướng dẫn hồ sơ', slug: 'huong-dan', cover_image: '/uploads/cover.jpg', updated_at: '2026-08-28' }] });
  assert.match(xml, /<image:image>/);
  assert.match(xml, /<image:loc>https:\/\/soldream\.edu\.vn\/uploads\/cover\.jpg<\/image:loc>/);
  assert.match(xml, /<image:title>Hướng dẫn hồ sơ<\/image:title>/);
});
