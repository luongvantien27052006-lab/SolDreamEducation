'use strict';

const db = require('../db');
const { getUniversityById } = require('./universityPages');
const { getCourseById } = require('./courseKnowledge');

function cleanPath(value) {
  const path = String(value || '/').trim().split(/[?#]/, 1)[0];
  return /^\/[\w\-/]+$/u.test(path) ? path.slice(0, 300) : '/';
}

function safeDecode(value) {
  try { return decodeURIComponent(value); }
  catch (_) { return ''; }
}

function getLeadContext(value) {
  const path = cleanPath(value);
  let match = path.match(/^\/tin-tuc\/([^/]+)$/);
  if (match) {
    const row = db.prepare('SELECT id,title,slug FROM posts WHERE slug=? AND published=1').get(safeDecode(match[1]));
    if (row) return { interest: `Thông tin về bài viết ${row.title}`, sourceTitle: row.title, sourcePath: path, leadType: 'study_abroad', contentType: 'post', contentId: row.id };
  }
  match = path.match(/^\/(du-hoc|truong-dai-hoc)\/([^/]+)$/);
  if (match) {
    const row = db.prepare('SELECT id,title,slug,category FROM programs WHERE slug=? AND published=1').get(safeDecode(match[2]));
    if (row) {
      const school = row.category === 'Thông tin trường';
      return { interest: school ? `Thông tin về ${row.title}` : `Thông tin về chương trình ${row.title}`, sourceTitle: row.title, sourcePath: path, leadType: school ? 'school_info' : 'study_abroad', contentType: 'program', contentId: row.id };
    }
    if (match[1] === 'truong-dai-hoc') {
      const university = getUniversityById(safeDecode(match[2]));
      if (university) return { interest: `Thông tin về ${university.name}`, sourceTitle: university.name, sourcePath: path, leadType: 'school_info', contentType: 'university', contentId: university.id };
    }
  }
  match = path.match(/^\/khoa-hoc\/([^/]+)$/);
  if (match) {
    const course = getCourseById(safeDecode(match[1]));
    if (course) return { interest: `Thông tin về khóa học ${course.name}`, sourceTitle: course.name, sourcePath: path, leadType: 'course', contentType: 'course', contentId: course.id };
  }
  return null;
}

module.exports = { cleanPath, getLeadContext };
