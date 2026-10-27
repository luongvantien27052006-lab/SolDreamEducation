'use strict';


const { getCourses } = require('./courseKnowledge');
const { abs } = require('./seo');
const { programPublicPath } = require('./util');
const { TOPICS } = require('./contentTopics');
const { getPageFreshness, recordedDate, contentModifiedDate } = require('./pageFreshness');

function xmlEscape(value) {
  return String(value).replace(/[<>&'\"]/g, (character) => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;',
  })[character]);
}

function toIsoDate(value, fallback = '') {
  return recordedDate(value) || recordedDate(fallback);
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
  const freshness = getPageFreshness();
  const dated = (path, fallback) => ({ loc: abs(path), lastmod: freshness.get(path) || toIsoDate(fallback) });
  const defaults = { changefreq: 'weekly', priority: '0.8' };
  const staticEntries = ['/', '/gioi-thieu', '/khoa-hoc', '/du-hoc', '/truong-dai-hoc', '/tin-tuc', '/cau-hoi-thuong-gap', '/cuoc-song-han-quoc', '/tro-ly-du-hoc']
    .map((path) => ({ ...dated(path), ...defaults }));
  const topicEntries = TOPICS.map((topic) => ({ ...dated(`/tin-tuc?muc=${topic.id}`), ...defaults }));
  const universityEntries = require('./universityPages').getAllUniversities().map((university) => ({
    ...dated(`/truong-dai-hoc/${university.slug || university.id}`, university.lastUpdated || university.updatedDate),
    ...defaults,
  }));
  const courseEntries = getCourses().map((course) => ({
    ...dated(`/khoa-hoc/${course.slug || course.id}`, course.lastUpdated),
    ...defaults,
  }));
  const programEntries = programs.map((program) => ({
    ...dated(programPublicPath(program), contentModifiedDate(program)),
    ...(program.cover_image ? { imageLoc: /^https?:\/\//i.test(program.cover_image) ? program.cover_image : abs(program.cover_image) } : {}), ...defaults,
  }));
  const postEntries = posts.map((post) => ({
    ...dated(`/tin-tuc/${post.slug}`, contentModifiedDate(post)),
    ...(post.cover_image ? { imageLoc: /^https?:\/\//i.test(post.cover_image) ? post.cover_image : abs(post.cover_image) } : {}), ...defaults,
  }));
  // Stored profiles are what the public route renders when they share a baseline URL.
  return uniqueEntries([...staticEntries, ...topicEntries, ...programEntries, ...universityEntries, ...courseEntries, ...postEntries]);
}

function generateSitemapXml(options = {}) {
  const rows = buildSitemapEntries(options).map((entry) => [
    '  <url>',
    `    <loc>${xmlEscape(entry.loc)}</loc>`,
    ...(entry.lastmod ? [`    <lastmod>${xmlEscape(entry.lastmod)}</lastmod>`] : []),
    `    <changefreq>${entry.changefreq}</changefreq>`,
    `    <priority>${entry.priority}</priority>`,
    ...(entry.imageLoc ? [
      '    <image:image>',
      `      <image:loc>${xmlEscape(entry.imageLoc)}</image:loc>`,
      '    </image:image>',
    ] : []),
    '  </url>',
  ].join('\n')).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${rows}\n</urlset>`;
}

module.exports = { buildSitemapEntries, generateSitemapXml, toIsoDate, xmlEscape };
