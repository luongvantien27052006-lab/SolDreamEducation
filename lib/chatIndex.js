'use strict';

const crypto = require('crypto');
const db = require('../db');
const { normalise } = require('./universityKnowledge');
const { redactSensitiveText } = require('./sensitiveData');

function hashDocument(document) {
  return crypto.createHash('sha256').update([
    document.type, document.title, document.url, document.updatedAt, document.text,
  ].map((value) => String(value || '')).join('\n')).digest('hex');
}

function baseTitle(title) {
  let value = String(title || '').split(/\s+—\s+/)[0].trim();
  if (value.includes(':')) value = value.split(':')[0].trim();
  return value;
}

function questionCandidates(document) {
  const title = baseTitle(document.title);
  const text = normalise(`${document.title} ${document.text}`);
  if (!title || document.type === 'catalog' || document.type === 'page') return [];
  if (document.type === 'organization') return ['Địa chỉ, Hotline và thời gian làm việc của SOL DREAM EDUCATION là gì?'];
  if (document.type === 'faq') return [normalizeQuestionTitle(title)];
  if (document.type === 'course') return [`${title} phù hợp với ai?`, `Học phí ${title} là bao nhiêu?`];
  if (document.type === 'post') return [`Bài viết “${title}” có những thông tin chính nào?`];
  if (/^Điều kiện du học Hàn Quốc/i.test(title)) return ['Điều kiện du học Hàn Quốc hiện nay gồm những gì?'];

  const questions = [`Cho tôi thông tin tổng quan về ${title}.`];
  if (/hoc phi|chi phi|bao nhieu|krw|vnd|won/.test(text)) questions.push(`Học phí và chi phí của ${title} là bao nhiêu?`);
  if (/dieu kien|tuyen sinh|visa|gpa|topik|ho so/.test(text)) questions.push(`Điều kiện tuyển sinh và visa của ${title} là gì?`);
  if (/nganh hoc|chuyen nganh|dao tao/.test(text)) questions.push(`${title} có những ngành học nào?`);
  if (/hoc bong|mien hoc phi|giam hoc phi/.test(text)) questions.push(`Chính sách học bổng của ${title} như thế nào?`);
  return questions.slice(0, 4);
}

function normalizeQuestionTitle(title) {
  const value = String(title || '').trim().replace(/[?.!]+$/u, '');
  return value ? `${value}?` : '';
}

function buildQuestions(documents) {
  const pages = new Map();
  for (const document of documents) {
    // Keep each FAQ as its own retrievable question even when it links back to
    // the same article/course as the main document.
    const key = document.type === 'faq' ? document.id : (document.url || document.id);
    const current = pages.get(key);
    if (!current) pages.set(key, { ...document });
    else {
      current.text += `\n${document.text}`;
      if (document.title.length < current.title.length) current.title = document.title;
      if (String(document.updatedAt) > String(current.updatedAt)) current.updatedAt = document.updatedAt;
    }
  }

  const seen = new Set();
  const rows = [];
  for (const document of pages.values()) {
    const priority = ['university', 'program'].includes(document.type) ? 90
      : document.type === 'course' ? 80
        : document.type === 'organization' ? 70 : 55;
    questionCandidates(document).forEach((question, questionIndex) => {
      const key = normalise(question);
      if (!key || seen.has(key)) return;
      seen.add(key);
      rows.push({ question, documentId: document.id, title: baseTitle(document.title), url: document.url || '', priority: priority - questionIndex });
    });
  }
  return rows;
}

function replaceKnowledgeIndex(documents) {
  const safeDocuments = documents.filter((document) => document?.id && document?.text).map((document) => ({
    ...document,
    title: redactSensitiveText(document.title),
    text: redactSensitiveText(document.text),
  }));
  const prepared = safeDocuments.map((document) => ({
    id: String(document.id), type: String(document.type || 'page'), title: String(document.title || ''),
    url: String(document.url || ''), content: String(document.text || ''),
    sourceUpdatedAt: String(document.updatedAt || ''), contentHash: hashDocument(document),
  }));
  const questions = buildQuestions(safeDocuments);
  const existing = db.prepare('SELECT id,content_hash FROM chat_knowledge_documents').all();
  const existingMap = new Map(existing.map((row) => [row.id, row.content_hash]));
  const existingQuestions = new Set(db.prepare('SELECT question,url,priority FROM chat_suggested_questions').all()
    .map((row) => `${row.question}\u0000${row.url}\u0000${row.priority}`));
  const unchanged = existing.length === prepared.length
    && prepared.every((document) => existingMap.get(document.id) === document.contentHash)
    && existingQuestions.size === questions.length
    && questions.every((row) => existingQuestions.has(`${row.question}\u0000${row.url}\u0000${row.priority}`));
  if (unchanged) return { changed: false, documents: prepared.length, questions: questions.length };

  const insertDocument = db.prepare(`INSERT INTO chat_knowledge_documents
    (id,type,title,url,content,source_updated_at,content_hash,indexed_at)
    VALUES (@id,@type,@title,@url,@content,@sourceUpdatedAt,@contentHash,datetime('now','localtime'))`);
  const insertQuestion = db.prepare(`INSERT OR IGNORE INTO chat_suggested_questions
    (question,document_id,title,url,priority,updated_at)
    VALUES (@question,@documentId,@title,@url,@priority,datetime('now','localtime'))`);
  db.transaction(() => {
    db.prepare('DELETE FROM chat_knowledge_documents').run();
    db.prepare('DELETE FROM chat_suggested_questions').run();
    prepared.forEach((document) => insertDocument.run(document));
    questions.forEach((question) => insertQuestion.run(question));
  })();
  return { changed: true, documents: prepared.length, questions: questions.length };
}

function getIndexedDocuments() {
  return db.prepare(`SELECT id,type,title,url,source_updated_at updatedAt,content text
    FROM chat_knowledge_documents`).all();
}

function getIndexStats() {
  return {
    documents: db.prepare('SELECT COUNT(*) c FROM chat_knowledge_documents').get().c,
    questions: db.prepare('SELECT COUNT(*) c FROM chat_suggested_questions').get().c,
    indexedAt: db.prepare('SELECT MAX(indexed_at) value FROM chat_knowledge_documents').get().value || null,
  };
}

function getSuggestedQuestions(context = '', limit = 4) {
  const safeLimit = Math.min(8, Math.max(1, Number(limit) || 4));
  const genericTerms = new Set(['cho', 'toi', 'thong', 'tin', 'tong', 'quan', 'truong', 'dai', 'hoc', 'du', 'han', 'quoc', 'gia', 'dieu', 'kien', 'tuyen', 'sinh', 'cua', 'nhu', 'the', 'nao']);
  const topicTerms = new Set(['phi', 'chi', 'visa', 'gpa', 'topik', 'bong', 'nganh', 'ky', 'tuc', 'xa']);
  const terms = [...new Set(normalise(context).split(/\s+/).filter((term) => term.length > 2 && !genericTerms.has(term)))];
  const rows = db.prepare('SELECT question,title,url,priority FROM chat_suggested_questions').all();
  const ranked = rows.map((row) => {
    const haystack = normalise(`${row.question} ${row.title}`);
    const relevance = terms.reduce((score, term) => score + (haystack.includes(term) ? (topicTerms.has(term) ? 12 : 60) : 0), 0);
    return { ...row, score: relevance + row.priority };
  }).sort((a, b) => b.score - a.score || a.question.localeCompare(b.question, 'vi'));

  if (terms.length) return ranked.slice(0, safeLimit).map(({ question, url }) => ({ question, url }));

  const selected = [];
  const usedUrls = new Set();
  for (const row of ranked) {
    if (usedUrls.has(row.url)) continue;
    selected.push(row);
    usedUrls.add(row.url);
    if (selected.length === safeLimit) break;
  }
  if (selected.length < safeLimit) {
    for (const row of ranked) {
      if (selected.includes(row)) continue;
      selected.push(row);
      if (selected.length === safeLimit) break;
    }
  }
  return selected.map(({ question, url }) => ({ question, url }));
}

module.exports = {
  replaceKnowledgeIndex, getIndexedDocuments, getIndexStats, getSuggestedQuestions,
  buildQuestions, questionCandidates,
};
