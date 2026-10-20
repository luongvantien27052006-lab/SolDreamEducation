'use strict';

const data = require('../data/courses.json');
const db = require('../db');
const { classFacts, courseNarrative } = require('./courseEditing');
const { makeBluf } = require('./util');

function parseJson(value, fallback = {}) {
  try { const parsed = JSON.parse(value || '{}'); return parsed && typeof parsed === 'object' ? parsed : fallback; }
  catch (_) { return fallback; }
}

function rowToCourse(row) {
  const financials=parseJson(row.financials_json);const spec=financials.tuition2026||financials.classDetails||{};
  const requirements = parseJson(row.requirements_json);
  const isEnglish = /tiếng anh|english/i.test(row.language || '');
  const entryExamLabel = isEnglish ? 'TOEIC/IELTS' : 'TOPIK';
  const entryExamRequirement = isEnglish
    ? (requirements.certificateRequired || requirements.englishCertificateRequired || null)
    : (requirements.certificateRequired || requirements.topikRequired || null);
  const course = {
    id: row.id, slug: row.slug, name: row.name, seoTitle:row.seo_title,metaDescription:row.meta_description,blufSummary: courseNarrative(row.bluf_summary,spec),
    audience: row.audience, description: courseNarrative(row.description,spec), price: row.price, language: row.language,
    financials, requirements,
    entryExamLabel, entryExamRequirement,
    lastUpdated: row.last_updated || String(row.updated_at || '').slice(0, 10),
  };
  return {
    ...course,
    slug: course.slug || course.id,
    url: `/khoa-hoc/${course.slug || course.id}`,
    classFacts: classFacts(course),
    bluf: course.blufSummary || makeBluf(course.name, `${course.description} Khóa học phù hợp với ${(course.audience || 'người học phù hợp').toLowerCase()}. Học phí được công bố: ${course.price}.`),
  };
}

function getCourses(options = {}) {
  const publishedOnly = options.publishedOnly !== false;
  return db.prepare(`SELECT * FROM courses ${publishedOnly ? 'WHERE published=1' : ''} ORDER BY sort_order ASC, name ASC`).all().map(rowToCourse);
}

function getCourseById(id) {
  return getCourses().find((course) => course.id === id || course.slug === id);
}

function getCourseNotice() {
  return require('./siteContent').siteText('course.notice');
}

function getCourseUpdatedDate() {
  const row = db.prepare("SELECT MAX(CASE WHEN last_updated!='' THEN last_updated ELSE substr(updated_at,1,10) END) updated FROM courses WHERE published=1").get();
  return row?.updated || data.updated_at;
}

module.exports = { getCourses, getCourseById, getCourseNotice, getCourseUpdatedDate, rowToCourse, parseJson };
