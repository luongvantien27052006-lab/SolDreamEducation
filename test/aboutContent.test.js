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
  const sections = getAboutSections('page');
  const tabs = sections.filter((section) => section.section_style === 'tab');
  assert.deepEqual(tabs.map((section) => section.title), ['Lời chào', 'Tầm nhìn & Sứ mệnh', 'Bộ máy tổ chức']);
  assert.match(tabs[0].content, /Tiến sĩ Đào Duy Thắng/);
  assert.match(tabs[0].content, /\/img\/dao-duy-thang\.jpg/);
  assert.ok(tabs[0].content.indexOf('/img/dao-duy-thang.jpg') < tabs[0].content.indexOf('Gửi những thế hệ trẻ'));
  const slogan = sections.find((section) => section.title === 'Slogan SOL DREAM');
  assert.ok(slogan);
  assert.match(slogan.content, /Kỷ nguyên vươn mình/);
  assert.doesNotMatch(tabs[1].content, /Kỷ nguyên vươn mình/);
  assert.match(tabs[2].content, /\/img\/nguyen-huynh-nhu\.jpg/);
  assert.match(tabs[2].content, /\/img\/pham-vuong-kha-tran\.jpg/);
  assert.match(tabs[2].content, /\/img\/dao-duy-thang\.jpg/);
  assert.ok(tabs[2].content.indexOf('/img/dao-duy-thang.jpg') < tabs[2].content.indexOf('/img/nguyen-huynh-nhu.jpg'));
  assert.match(tabs[2].content, /Thạc sĩ Đại học Seoul/);
  assert.doesNotMatch(tabs[2].content, /Nguyễn Huỳnh Như[\s\S]{0,180}Đại học Woosong/);
  assert.match(tabs[2].content, /Khối chuyên môn/);
  assert.match(tabs[2].content, /Khối tư vấn/);
  assert.match(tabs[2].content, /Khối kinh doanh/);
  assert.match(tabs[2].content, /Thạc sĩ Kinh doanh Quốc Tế, Đại học Woosong Hàn Quốc/);
  assert.match(tabs[2].content, /Đạt chứng nhận “Xuất Sắc hoàn thành nghiệp vụ tư vấn Du học” do Sở GDDT Tp\.Hồ Chí Minh tổ chức/);
  assert.doesNotMatch(tabs[2].content, /Phụ trách Khối tư vấn/);
  assert.doesNotMatch(tabs[2].content, /Khối Hành chính|Ban kiểm soát|Marketing/);
});

test('director portrait sits above the letter on mobile and lets desktop text flow below it', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'public', 'css', 'style.css'), 'utf8');
  assert.match(css, /about-tabs__panel--greeting \.about-tabs__content>figure:first-child\{float:right;/);
  assert.match(css, /@media\(max-width:640px\)[\s\S]*about-tabs__panel--greeting \.about-tabs__content>figure:first-child\{float:none;/);
});

test('mobile introduction navigation uses the company tree mark without horizontal overflow', () => {
  const root = path.join(__dirname, '..');
  const css = fs.readFileSync(path.join(root, 'public', 'css', 'style.css'), 'utf8');
  const view = fs.readFileSync(path.join(root, 'views', 'about.ejs'), 'utf8');
  assert.match(view, /about-slogan[\s\S]*logo-mark\.png[\s\S]*knowledge-hero/);
  assert.match(view, /about-tabs__tree-mark/);
  assert.match(css, /@media\(max-width:640px\)[\s\S]*about-tabs__list::before/);
  assert.match(css, /about-tabs__tree-mark[\s\S]*display:grid/);
  assert.doesNotMatch(css, /@media\(max-width:640px\)[^}]*\.about-tabs__list\{[^}]*overflow-x:auto/);
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
