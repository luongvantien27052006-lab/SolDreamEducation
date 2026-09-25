'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const ejs = require('ejs');
const { getCourses } = require('../lib/courseKnowledge');

test('header course dropdown renders every currently published database course', async () => {
  const courses = getCourses();
  const html = await ejs.renderFile(path.join(__dirname, '..', 'views', 'partials', 'header.ejs'), {
    navigationCourses: courses,
  });
  assert.ok(courses.some((course) => course.language === 'Tiếng Anh'));
  courses.forEach((course) => {
    assert.match(html, new RegExp(`href="${course.url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`));
    assert.match(html, new RegExp(course.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  });
  assert.doesNotMatch(html, /href="\/khoa-hoc\/tieng-han-cap-toc">Tiếng Hàn du học cấp tốc/);
});
