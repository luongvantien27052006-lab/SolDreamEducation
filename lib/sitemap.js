'use strict';

const universitiesData = require('../data/universities.json');
const { getCourses } = require('./courseKnowledge');
const { abs } = require('./seo');
const { programPublicPath } = require('./util');

function xmlEscape(value) {
  return String(value).replace(/[<>&'\"]/g, (character) => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;',
  })[character]);
}

function toIsoDate(value, fallback = '2026-08-27') {
  const text = String(value || fallback);
  const match = text.match(/^(\d{4}-\d{2}(?:-\d{2})?)/);
  if (!match) return fallback;
  return match[1].length === 7 ? `${match[1]}-01` : match[1];
}

function uniqueEntries(entries) {
  const seen = new Set();
  return entries.filter((entry) => {
    if (!entry.loc || seen.has(entry.loc)) return false;
    seen.add(entry.loc);
    return true;
  });
}

function buildSitemapEntries({ posts = [], programs = [] } = {}) {
  const defaults = { changefreq: 'weekly', priority: '0.8' };
  const staticEntries = ['/', '/gioi-thieu', '/khoa-hoc', '/du-hoc', '/truong-dai-hoc', '/tin-tuc', '/cau-hoi-thuong-gap', '/cuoc-song-han-quoc', '/tro-ly-du-hoc']
    .map((path) => ({ loc: abs(path), lastmod: '2026-09-20', ...defaults }));
  const universityEntries = universitiesData.universities.map((university) => ({
    loc: abs(`/truong-dai-hoc/${university.slug || university.id}`),
    lastmod: toIsoDate(university.lastUpdated || universitiesData.source?.imported_at, '2026-08-26'),
    ...defaults,
  }));
  const courseEntries = getCourses().map((course) => ({
    loc: abs(`/khoa-hoc/${course.slug || course.id}`),
    lastmod: toIsoDate(course.lastUpdated),
    ...defaults,
  }));
  const programEntries = programs.map((program) => ({
    loc: abs(programPublicPath(program)), lastmod: toIsoDate(program.updated_at || program.created_at),
    ...(program.cover_image ? { imageLoc: abs(program.cover_image), imageTitle: program.title } : {}), ...defaults,
  }));
  const postEntries = posts.map((post) => ({
    loc: abs(`/tin-tuc/${post.slug}`), lastmod: toIsoDate(post.updated_at || post.created_at),
    ...(post.cover_image ? { imageLoc: abs(post.cover_image), imageTitle: post.title } : {}), ...defaults,
  }));
  return uniqueEntries([...staticEntries, ...universityEntries, ...courseEntries, ...programEntries, ...postEntries]);
}

function generateSitemapXml(options = {}) {
  const rows = buildSitemapEntries(options).map((entry) => [
    '  <url>',
    `    <loc>${xmlEscape(entry.loc)}</loc>`,
    `    <lastmod>${xmlEscape(entry.lastmod)}</lastmod>`,
    `    <changefreq>${entry.changefreq}</changefreq>`,
    `    <priority>${entry.priority}</priority>`,
    ...(entry.imageLoc ? [
      '    <image:image>',
      `      <image:loc>${xmlEscape(entry.imageLoc)}</image:loc>`,
      `      <image:title>${xmlEscape(entry.imageTitle || '')}</image:title>`,
      '    </image:image>',
    ] : []),
    '  </url>',
  ].join('\n')).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${rows}\n</urlset>`;
}

module.exports = { buildSitemapEntries, generateSitemapXml, toIsoDate, xmlEscape };
