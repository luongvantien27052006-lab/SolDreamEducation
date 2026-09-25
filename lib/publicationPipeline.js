'use strict';

const db = require('../db');
const { stripHtml, countWords, sanitizeRichHtml, programPublicPath } = require('./util');
const { notifySubscribersForContent } = require('./subscriberNotifier');

const TYPE_CONFIG = Object.freeze({
  post: { table: 'posts', path: '/tin-tuc', titleField: 'title' },
  program: { table: 'programs', path: '/du-hoc', titleField: 'title' },
  course: { table: 'courses', path: '/khoa-hoc', titleField: 'name' },
});

function words(value) {
  return stripHtml(value).replace(/\s+/g, ' ').trim().split(/\s+/u).filter(Boolean);
}

function wordExcerpt(value, maximum = 55) {
  const list = words(value);
  if (list.length <= maximum) return list.join(' ');
  return `${list.slice(0, maximum).join(' ').replace(/[,;:]$/u, '')}…`;
}

function makeExtractableSummary(title, preferred, content) {
  const preferredWords = words(preferred);
  if (preferredWords.length >= 30 && preferredWords.length <= 60) return preferredWords.join(' ');
  const combined = `${preferred || ''} ${stripHtml(content || '')}`.replace(/\s+/g, ' ').trim();
  let summary = wordExcerpt(combined, 48);
  if (countWords(summary) < 30) {
    summary = `${summary}${summary ? ' ' : ''}Nội dung do SOL DREAM EDUCATION tổng hợp để tham khảo; học viên cần xác nhận nguồn, thời hạn áp dụng, điều kiện và chi phí mới nhất trước khi đăng ký.`;
  }
  const cleanTitle = stripHtml(title).replace(/[.:;!?]+$/u, '').trim();
  if (cleanTitle && !summary.toLocaleLowerCase('vi').includes(cleanTitle.toLocaleLowerCase('vi'))) summary = `${cleanTitle}: ${summary}`;
  return wordExcerpt(summary, 60);
}

function truncateCharacters(value, maximum) {
  const clean = stripHtml(value).replace(/\s+/g, ' ').trim();
  if (clean.length <= maximum) return clean;
  return `${clean.slice(0, maximum - 1).replace(/\s+\S*$/u, '').replace(/[,;:]$/u, '')}…`;
}

function makeSeoTitle(title, existing = '') {
  let value = stripHtml(existing || title).replace(/\s+/g, ' ').trim();
  if (value.length < 35 && !/du học hàn quốc/i.test(value)) value += ' | Du học Hàn Quốc';
  if (value.length < 35) value += ' | SOL DREAM';
  return truncateCharacters(value, 65);
}

function makeMetaDescription(summary, content, existing = '') {
  const current = stripHtml(existing).replace(/\s+/g, ' ').trim();
  if (current.length >= 120 && current.length <= 165) return current;
  const combined = `${summary} ${stripHtml(content)}`.replace(/\s+/g, ' ').trim();
  return truncateCharacters(combined, 160);
}

function makeFocusKeyword(title, existing = '') {
  const current = stripHtml(existing).trim();
  if (current) return truncateCharacters(current, 160);
  return words(title).slice(0, 8).join(' ');
}

function normalizeQuestion(value) {
  const question = stripHtml(value).replace(/\s+/g, ' ').replace(/[.:;]+$/u, '').trim();
  if (!question) return '';
  return `${question.replace(/\?+$/u, '')}?`;
}

function ensureFaqAnswer(value) {
  let answer = stripHtml(value).replace(/\s+/g, ' ').trim();
  if (words(answer).length < 30) {
    answer += `${answer ? ' ' : ''}Thông tin áp dụng có thể thay đổi theo lớp học, chương trình hoặc kỳ tuyển sinh; người học cần đối chiếu nguồn và xác nhận với SOL DREAM EDUCATION trước khi đăng ký.`;
  }
  return wordExcerpt(answer, 60);
}

function sectionFaqs(content) {
  const result = [];
  const pattern = /<h([2-3])\b[^>]*>([\s\S]*?)<\/h\1>([\s\S]*?)(?=<h[2-3]\b|$)/gi;
  let match;
  while ((match = pattern.exec(String(content || ''))) && result.length < 3) {
    const question = normalizeQuestion(match[2]);
    const answer = wordExcerpt(match[3], 85);
    if (question.length < 12 || answer.split(/\s+/u).length < 12) continue;
    result.push({ question, answer });
  }
  return result;
}

function parseObject(value) {
  try { const parsed = JSON.parse(value || '{}'); return parsed && typeof parsed === 'object' ? parsed : {}; }
  catch (_) { return {}; }
}

function faqCategory(type, row) {
  if (type === 'course') return 'Đào tạo tiếng';
  if (type === 'program' && String(row.category || '').toLocaleLowerCase('vi').includes('trường')) return 'Thông tin trường';
  if (type === 'post' && /sinh hoạt|đời sống|văn hóa|cuộc sống|living|생활/i.test(`${row.category || ''} ${row.title || ''} ${row.excerpt || ''}`)) return 'Thông tin sinh hoạt tại Hàn Quốc';
  return 'Du học';
}

function deriveFaqs(type, row) {
  const title = stripHtml(row.title || row.name);
  const content = type === 'course'
    ? [row.bluf_summary, row.description, row.audience, row.price, row.financials_json, row.requirements_json].filter(Boolean).join(' ')
    : row.content;
  const summary = makeExtractableSummary(title, row.excerpt || row.bluf_summary, content);
  const financials = type === 'course' ? parseObject(row.financials_json) : {};
  const requirements = type === 'course' ? parseObject(row.requirements_json) : {};
  const courseExamLabel = /tiếng anh|english/i.test(row.language || '') ? 'TOEIC/IELTS' : 'TOPIK';
  const courseExamRequirement = /tiếng anh|english/i.test(row.language || '')
    ? (requirements.certificateRequired || requirements.englishCertificateRequired)
    : (requirements.certificateRequired || requirements.topikRequired);
  const coursePrice = [row.price, financials.priceNote].filter(Boolean).join('. ') || 'Học phí chưa được công bố và cần xác nhận tại thời điểm đăng ký.';
  const courseRequirements = [
    requirements.entryLevel ? `Trình độ đầu vào: ${requirements.entryLevel}.` : '',
    courseExamRequirement ? `${courseExamLabel}: ${courseExamRequirement}.` : '',
    requirements.status || '',
  ].filter(Boolean).join(' ') || 'Điều kiện đầu vào sẽ được kiểm tra theo trình độ và mục tiêu học tập thực tế.';
  const initial = type === 'course' ? [
    { question: `${title} phù hợp với ai?`, answer: wordExcerpt(`${row.audience || summary} ${row.description || ''}`, 80) },
    { question: `Học phí ${title} là bao nhiêu?`, answer: wordExcerpt(coursePrice, 80) },
    { question: `${title} có điều kiện đầu vào nào?`, answer: wordExcerpt(courseRequirements, 80) },
  ] : [
    { question: `${title} có những thông tin chính nào?`, answer: wordExcerpt(summary, 80) },
    ...sectionFaqs(content),
  ];
  const seen = new Set();
  return initial.filter((faq) => {
    const question = normalizeQuestion(faq.question);
    const answer = stripHtml(faq.answer).replace(/\s+/g, ' ').trim();
    const key = question.toLocaleLowerCase('vi');
    if (!question || answer.length < 35 || seen.has(key)) return false;
    faq.question = question;
    faq.answer = ensureFaqAnswer(answer);
    seen.add(key);
    return true;
  }).slice(0, 4);
}

function contentPath(type, row) {
  if (type === 'program') return programPublicPath(row);
  const config = TYPE_CONFIG[type];
  return `${config.path}/${row.slug || row.id}`;
}

function optimizeRecord(type, row) {
  if (type === 'course') {
    const bluf = makeExtractableSummary(row.name, row.bluf_summary, `${row.description} ${row.audience} ${row.price}`);
    db.prepare("UPDATE courses SET bluf_summary=?,updated_at=datetime('now','localtime') WHERE id=?").run(bluf, row.id);
    return db.prepare('SELECT * FROM courses WHERE id=?').get(row.id);
  }
  const excerpt = makeExtractableSummary(row.title, row.excerpt, row.content);
  const seoTitle = makeSeoTitle(row.title, row.seo_title);
  const metaDescription = makeMetaDescription(excerpt, row.content, row.meta_description);
  const focusKeyword = makeFocusKeyword(row.title, row.focus_keyword);
  const content = sanitizeRichHtml(row.content || '');
  db.prepare(`UPDATE ${TYPE_CONFIG[type].table} SET excerpt=?,content=?,seo_title=?,meta_description=?,focus_keyword=? WHERE id=?`)
    .run(excerpt, content, seoTitle, metaDescription, focusKeyword, row.id);
  return db.prepare(`SELECT * FROM ${TYPE_CONFIG[type].table} WHERE id=?`).get(row.id);
}

function replaceGeneratedFaqs(type, row) {
  const originId = String(row.id);
  const linked = db.prepare('SELECT question,answer,source_url,generated FROM faqs WHERE origin_type=? AND origin_id=? ORDER BY id').all(type, originId);
  const existing = linked.filter((faq) => faq.generated);
  // Prefer FAQs derived from the current article. Existing generated rows are
  // only a fallback; putting them first kept stale titles, answers and routes
  // after an admin changed a programme into a school profile.
  const candidates = [...deriveFaqs(type, row), ...existing];
  const globalQuestions = db.prepare('SELECT question FROM faqs WHERE NOT (origin_type=? AND origin_id=?)').all(type, originId);
  const seen = new Set([
    ...globalQuestions.map((faq) => normalizeQuestion(faq.question).toLocaleLowerCase('vi')),
    ...linked.filter((faq) => !faq.generated).map((faq) => normalizeQuestion(faq.question).toLocaleLowerCase('vi')),
  ]);
  const selected = candidates.filter((faq) => {
    const question = normalizeQuestion(faq.question);
    const answer = stripHtml(faq.answer).replace(/\s+/g, ' ').trim();
    const key = question.toLocaleLowerCase('vi');
    if (!question || answer.length < 35 || seen.has(key)) return false;
    faq.question = question; faq.answer = ensureFaqAnswer(answer); seen.add(key); return true;
  }).slice(0, 4);
  const category = faqCategory(type, row);
  const internalUrl = contentPath(type, row);
  const insert = db.prepare(`INSERT INTO faqs
    (category,question,answer,source_url,sort_order,published,generated,origin_type,origin_id)
    VALUES (?,?,?,?,?,1,1,?,?)`);
  db.transaction(() => {
    db.prepare('UPDATE faqs SET published=1 WHERE generated=0 AND origin_type=? AND origin_id=?').run(type, originId);
    db.prepare('DELETE FROM faqs WHERE generated=1 AND origin_type=? AND origin_id=?').run(type, originId);
    selected.forEach((faq, index) => insert.run(category, faq.question, faq.answer, faq.source_url || internalUrl, (index + 1) * 10, type, originId));
  })();
  return selected;
}

function refreshChatIndex() {
  // Lazy require prevents a database-initialisation cycle.
  return require('./websiteKnowledge').syncWebsiteKnowledge({ force: true });
}

function finalizePublishedContent(type, id, options = {}) {
  const config = TYPE_CONFIG[type];
  if (!config) throw new Error(`Loại nội dung không được hỗ trợ: ${type}`);
  const row = db.prepare(`SELECT * FROM ${config.table} WHERE id=?`).get(id);
  if (!row) return { found: false, faqs: 0 };
  if (!row.published) {
    db.prepare('UPDATE faqs SET published=0 WHERE origin_type=? AND origin_id=?').run(type, String(id));
    return { found: true, published: false, faqs: 0, index: options.sync === false ? null : refreshChatIndex() };
  }
  const optimized = optimizeRecord(type, row);
  const faqs = replaceGeneratedFaqs(type, optimized);
  const notifications = options.notify ? notifySubscribersForContent(type, id) : 0;
  return {
    found: true, published: true, faqs: faqs.length,
    notifications,
    index: options.sync === false ? null : refreshChatIndex(),
  };
}

function removePublishedContent(type, id, options = {}) {
  db.prepare('DELETE FROM faqs WHERE origin_type=? AND origin_id=?').run(type, String(id));
  return options.sync === false ? null : refreshChatIndex();
}

function rebuildAllPublishedContent() {
  const results = [];
  for (const [type, config] of Object.entries(TYPE_CONFIG)) {
    const rows = db.prepare(`SELECT id FROM ${config.table} WHERE published=1 ORDER BY id`).all();
    rows.forEach((row) => results.push({ type, id: row.id, ...finalizePublishedContent(type, row.id, { sync: false }) }));
  }
  return { items: results.length, faqs: results.reduce((sum, row) => sum + (row.faqs || 0), 0), index: refreshChatIndex() };
}

function ensurePublicationPipeline() {
  const version = 'seo-geo-publication-v1';
  const applied = db.prepare('SELECT value FROM system_meta WHERE key=?').get('publication_pipeline_version');
  if (applied?.value === version) return { applied: false };
  const result = rebuildAllPublishedContent();
  db.prepare(`INSERT INTO system_meta (key,value,updated_at) VALUES (?,?,datetime('now','localtime'))
    ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at`)
    .run('publication_pipeline_version', version);
  return { applied: true, ...result };
}

module.exports = {
  makeExtractableSummary, makeSeoTitle, makeMetaDescription, makeFocusKeyword,
  deriveFaqs, finalizePublishedContent, removePublishedContent, rebuildAllPublishedContent, ensurePublicationPipeline,
};
