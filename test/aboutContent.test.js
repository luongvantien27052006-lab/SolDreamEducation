'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { getAboutSections } = require('../lib/aboutContent');
const { getWebsiteDocuments } = require('../lib/websiteKnowledge');

test('introduction sections are database-backed and indexed for chatbot answers', () => {
  const sections = [...getAboutSections('home'), ...getAboutSections('page')];
  assert.ok(sections.length >= 2);
  const indexed = getWebsiteDocuments().filter((document) => document.id.startsWith('about:'));
  assert.equal(indexed.length, sections.length);
  sections.forEach((section) => assert.ok(indexed.some((document) => document.title === section.title)));
});

test('Admin provides add, edit, visibility and delete controls for introduction content', () => {
  const root = path.join(__dirname, '..');
  const routes = fs.readFileSync(path.join(root, 'routes', 'admin.js'), 'utf8');
  const list = fs.readFileSync(path.join(root, 'views', 'admin', 'about-list.ejs'), 'utf8');
  assert.match(routes, /\/gioi-thieu\/moi/);
  assert.match(routes, /\/gioi-thieu\/:id\/sua/);
  assert.match(routes, /\/gioi-thieu\/:id\/toggle/);
  assert.match(routes, /\/gioi-thieu\/:id\/xoa/);
  assert.match(list, /Giới thiệu trên trang chủ/);
  assert.match(list, /Nội dung trang \/gioi-thieu/);
});
