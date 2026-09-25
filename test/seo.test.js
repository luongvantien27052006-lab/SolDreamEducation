'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildRobotsTxt, generateUniversitySchema, generateFAQSchema,
  generateAuthorSchema, generateBreadcrumbSchema,
} = require('../lib/seo');
const { getAllUniversities } = require('../lib/universityPages');
const { getUniversityFaqs } = require('../lib/siteFaq');
const { getCourses } = require('../lib/courseKnowledge');
const rawUniversityData = require('../data/universities.json');

test('keeps quantitative university data machine-readable without invented admissions facts', () => {
  for (const university of getAllUniversities()) {
    assert.ok(university.blufSummary.split(/\s+/u).length >= 40, university.id);
    assert.ok(university.blufSummary.split(/\s+/u).length <= 50, university.id);
    assert.ok(Number.isFinite(university.financials.tuitionKrwYear), university.id);
    assert.ok(Number.isFinite(university.financials.tuitionVndYear), university.id);
    assert.ok(university.financials.dormitoryHalfYear.minKrw > 0, university.id);
    assert.equal(university.topCategory, null);
    assert.equal(university.requirements.minGpa, null);
    assert.deepEqual(university.caseStudies, []);
  }
});

test('keeps course summaries and published prices structured', () => {
  for (const course of getCourses()) {
    const words = course.blufSummary.split(/\s+/u).length;
    assert.ok(words >= 40 && words <= 50, course.id);
    assert.ok(Object.hasOwn(course.financials, 'priceVndTotal'), course.id);
    assert.ok(course.requirements.status, course.id);
  }
});

test('uses the certificate family appropriate to each course language', () => {
  const courses = getCourses();
  const english = courses.find((course) => course.id === 'tieng-anh-giao-tiep');
  assert.ok(english);
  assert.equal(english.entryExamLabel, 'TOEIC/IELTS');
  assert.notEqual(english.entryExamLabel, 'TOPIK');
  courses.filter((course) => course.language === 'Tiếng Hàn')
    .forEach((course) => assert.equal(course.entryExamLabel, 'TOPIK'));
});

test('keeps requested representative templates inactive until verified', () => {
  assert.deepEqual(rawUniversityData.pendingUniversityTemplates.map((item) => item.id), [
    'seoul-national-university', 'chung-ang-university', 'daegu-university',
  ]);
  for (const item of rawUniversityData.pendingUniversityTemplates) {
    assert.equal(item.topCategory, null);
    assert.equal(item.financials.tuitionD4KrwYear, null);
    assert.deepEqual(item.caseStudies, []);
    assert.match(item.verificationStatus, /Chưa kích hoạt/);
  }
});

test('generates University, Course, FAQ, Person and Breadcrumb JSON-LD', () => {
  const university = getAllUniversities()[0];
  const universitySchema = generateUniversitySchema(university);
  assert.equal(universitySchema['@graph'][0]['@type'], 'CollegeOrUniversity');
  assert.equal(universitySchema['@graph'][0].address['@type'], 'PostalAddress');
  assert.equal(universitySchema['@graph'][1]['@type'], 'Course');
  assert.equal(universitySchema['@graph'][1].offers[0].priceCurrency, 'KRW');

  const faqSchema = generateFAQSchema(getUniversityFaqs(university));
  assert.equal(faqSchema['@type'], 'FAQPage');
  assert.equal(faqSchema.mainEntity.length, 4);

  const author = generateAuthorSchema({
    name: 'Nguyễn An', jobTitle: 'Chuyên gia tư vấn du học',
    hasCredential: ['Chứng chỉ tư vấn'], sameAs: ['https://www.linkedin.com/in/example'],
  });
  assert.equal(author['@type'], 'Person');
  assert.equal(author.hasCredential[0]['@type'], 'EducationalOccupationalCredential');

  const breadcrumb = generateBreadcrumbSchema([{ name: 'Trang chủ', url: '/' }, { name: university.name, url: university.url }]);
  assert.equal(breadcrumb['@type'], 'BreadcrumbList');
  assert.equal(breadcrumb.itemListElement[1].position, 2);
});

test('builds robots policy from the configured base URL', () => {
  const robots = buildRobotsTxt('https://example.edu.vn/');
  for (const bot of ['GPTBot', 'PerplexityBot', 'ClaudeBot', 'Google-Extended', 'Bingbot', 'Applebot-Extended']) {
    assert.match(robots, new RegExp(`User-agent: ${bot}`));
  }
  assert.match(robots, /User-agent: Googlebot\nAllow: \/\n/);
  assert.match(robots, /User-agent: \*\nDisallow: \//);
  assert.match(robots, /Sitemap: https:\/\/example\.edu\.vn\/sitemap\.xml/);
});
