'use strict';
const { sanitizeRichHtml } = require('./contentSanitizer');

// Vietnamese-aware slug
function slugify(str) {
  return String(str)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-').replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'bai-viet';
}

function uniqueSlug(db, base, ignoreId, table) {
  const tbl = (table === 'programs') ? 'programs' : 'posts';
  let slug = base, n = 1;
  const q = db.prepare(`SELECT id FROM ${tbl} WHERE slug = ? AND id != ?`);
  while (true) {
    const row = q.get(slug, ignoreId || 0);
    if (!row) return slug;
    n += 1; slug = `${base}-${n}`;
  }
}

const MONTHS = ['01','02','03','04','05','06','07','08','09','10','11','12'];
function parseDate(s) { // "YYYY-MM-DD HH:MM:SS" (localtime)
  const d = new Date(String(s).replace(' ', 'T'));
  return isNaN(d) ? new Date() : d;
}
function fmtCard(s) {
  const d = parseDate(s);
  return { day: String(d.getDate()).padStart(2,'0'), monthYear: `${MONTHS[d.getMonth()]} / ${d.getFullYear()}` };
}
function fmtFull(s) {
  const d = parseDate(s);
  return `${String(d.getDate()).padStart(2,'0')}/${MONTHS[d.getMonth()]}/${d.getFullYear()}`;
}
// minimal nl->p for plain-text content; if content already has tags, leave as-is
function contentToHtml(content) {
  const c = String(content || '').trim();
  if (/<\/?(p|div|h[1-6]|ul|ol|li|br|img|blockquote|strong|em|table|figure)/i.test(c)) return sanitizeRichHtml(c);
  return sanitizeRichHtml(c.split(/\n{2,}/).map(p => `<p>${p.replace(/\n/g,'<br>')}</p>`).join('\n'));
}

function stripHtml(content) {
  return String(content || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function countWords(content) {
  const plain = stripHtml(content);
  return plain ? plain.split(/\s+/u).length : 0;
}

function parseSourceUrls(value) {
  const seen = new Set();
  return String(value || '').split(/[\r\n,]+/).map((item) => item.trim()).filter((item) => {
    if (!/^https?:\/\/[^\s]+$/i.test(item) || seen.has(item)) return false;
    seen.add(item);
    return true;
  }).slice(0, 20);
}

function normalizeSourceUrls(value) {
  return parseSourceUrls(value).join('\n');
}

// Build a self-contained, extractable answer for cards and section openings.
// The fallback sentence adds provenance/currency context without inventing facts.
function makeBluf(subject, content, maxWords = 55) {
  const cleanSubject = stripHtml(subject).replace(/[.:;!?]+$/u, '').trim();
  const cleanContent = stripHtml(content);
  let text = `${cleanSubject}: ${cleanContent}`.replace(/\s+/g, ' ').trim();
  if (countWords(text) < 30) {
    text += ' Thông tin do SOL DREAM EDUCATION tổng hợp để tham khảo ban đầu; học viên nên xác nhận lịch học, chi phí, điều kiện và thời hạn áp dụng trước khi đăng ký.';
  }
  const words = text.split(/\s+/u);
  if (words.length > maxWords) text = `${words.slice(0, maxWords).join(' ').replace(/[,;:]$/u, '')}…`;
  return text;
}

function decorate(p) {
  const card = fmtCard(p.created_at);
  const plainText = stripHtml(p.content);
  return {
    ...p,
    day: card.day,
    monthYear: card.monthYear,
    dateFull: fmtFull(p.created_at),
    updatedDateFull: fmtFull(p.updated_at || p.created_at),
    contentHtml: contentToHtml(p.content),
    plainText,
    wordCount: countWords(`${p.excerpt || ''} ${plainText}`),
    geoBluf: makeBluf(p.title || 'Thông tin', `${p.excerpt || ''} ${plainText}`),
    sourceLinks: parseSourceUrls(p.source_urls),
  };
}

function normalizeOptionalUrl(value) {
  const url = String(value || '').trim();
  return /^https?:\/\/[^\s]+$/i.test(url) ? url : '';
}

function programPublicPath(program) {
  const prefix = String(program?.category || '').trim() === 'Thông tin trường' ? '/truong-dai-hoc' : '/du-hoc';
  return `${prefix}/${program.slug}`;
}

module.exports = { slugify, uniqueSlug, decorate, fmtCard, fmtFull, contentToHtml, stripHtml, countWords, makeBluf, sanitizeRichHtml, parseSourceUrls, normalizeSourceUrls, normalizeOptionalUrl, programPublicPath };
