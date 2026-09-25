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

test('official introduction content is available as three editable tabs', () => {
  const tabs = getAboutSections('page').filter((section) => section.section_style === 'tab');
  assert.deepEqual(tabs.map((section) => section.title), ['Lời chào', 'Tầm nhìn & Sứ mệnh', 'Bộ máy tổ chức']);
  assert.match(tabs[0].content, /Tiến sĩ Đào Duy Thắng/);
  assert.match(tabs[0].content, /\/img\/dao-duy-thang\.jpg/);
  assert.ok(tabs[0].content.indexOf('/img/dao-duy-thang.jpg') < tabs[0].content.indexOf('Gửi những thế hệ trẻ'));
  assert.match(tabs[1].content, /Kỷ nguyên vươn mình/);
  assert.match(tabs[2].content, /\/img\/nguyen-huynh-nhu\.jpg/);
  assert.match(tabs[2].content, /\/img\/pham-vuong-kha-tran\.jpg/);
  assert.match(tabs[2].content, /\/img\/dao-duy-thang\.jpg/);
  assert.match(tabs[2].content, /Khối chuyên môn/);
  assert.match(tabs[2].content, /Khối tư vấn/);
  assert.match(tabs[2].content, /Khối kinh doanh/);
  assert.doesNotMatch(tabs[2].content, /Khối Hành chính|Ban kiểm soát|Marketing/);
});

test('director portrait sits above the letter on mobile and lets desktop text flow below it', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'public', 'css', 'style.css'), 'utf8');
  assert.match(css, /about-tabs__panel--greeting \.about-tabs__content>figure:first-child\{float:right;/);
  assert.match(css, /@media\(max-width:640px\)[\s\S]*about-tabs__panel--greeting \.about-tabs__content>figure:first-child\{float:none;/);
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
