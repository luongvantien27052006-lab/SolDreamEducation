'use strict';

const { SITE_URL, SITE_NAME, abs } = require('./seo');
const { stripHtml } = require('./util');
const { programPublicPath } = require('./util');
const { xmlEscape } = require('./sitemap');

function rssDate(value) {
  const date = new Date(String(value || '').replace(' ', 'T'));
  return Number.isNaN(date.getTime()) ? new Date().toUTCString() : date.toUTCString();
}

function generateRssXml({ posts = [], programs = [] } = {}) {
  const items = [
    ...posts.map((item) => ({ ...item, path: `/tin-tuc/${item.slug}`, type: item.category || 'Cẩm nang' })),
    ...programs.map((item) => ({ ...item, path: programPublicPath(item), type: item.category || 'Du học Hàn Quốc' })),
  ].sort((a, b) => String(b.updated_at || b.created_at).localeCompare(String(a.updated_at || a.created_at))).slice(0, 30);
  const body = items.map((item) => {
    const url = abs(item.path);
    return [
      '    <item>',
      `      <title>${xmlEscape(item.title)}</title>`,
      `      <link>${xmlEscape(url)}</link>`,
      `      <guid isPermaLink="true">${xmlEscape(url)}</guid>`,
      `      <description>${xmlEscape(stripHtml(item.excerpt || item.content).slice(0, 500))}</description>`,
      `      <category>${xmlEscape(item.type)}</category>`,
      `      <pubDate>${xmlEscape(rssDate(item.updated_at || item.created_at))}</pubDate>`,
      '    </item>',
    ].join('\n');
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0">\n  <channel>\n    <title>${xmlEscape(SITE_NAME)} - Cẩm nang du học Hàn Quốc</title>\n    <link>${xmlEscape(SITE_URL)}</link>\n    <description>Thông tin chọn trường, khóa học tiếng Hàn và chuẩn bị hồ sơ du học Hàn Quốc từ SOL DREAM EDUCATION.</description>\n    <language>vi-VN</language>\n    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>\n${body}\n  </channel>\n</rss>`;
}

module.exports = { generateRssXml, rssDate };
