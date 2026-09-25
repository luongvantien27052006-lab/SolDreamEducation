'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const express = require('express');
const { getAllUniversities, getUniversityById, parseContent } = require('../lib/universityPages');
const { countWords } = require('../lib/util');

test('builds six complete crawlable university profiles', () => {
  const universities = getAllUniversities();
  assert.equal(universities.length, 6);
  for (const university of universities) {
    assert.equal(university.sections.length, 5);
    assert.ok(university.highlight);
    assert.match(university.officialWebsite, /^https:\/\//);
    assert.equal(university.updatedDate, '2026-08-26');
    assert.ok(countWords(university.bluf) >= 30);
    assert.ok(countWords(university.bluf) <= 60);
    for (const section of university.sections) {
      assert.ok(countWords(section.lead) >= 30, `${university.id}/${section.id}`);
      assert.ok(countWords(section.lead) <= 60, `${university.id}/${section.id}`);
      for (const heading of section.blocks.filter((block) => block.type === 'heading')) {
        assert.ok(countWords(heading.lead) >= 30, heading.text);
        assert.ok(countWords(heading.lead) <= 60, heading.text);
      }
    }
  }
});

test('converts the knowledge tables and lists into semantic page blocks', () => {
  const university = getUniversityById('hanyang');
  const tuition = university.sections.find((section) => section.id === 'tuition');
  assert.ok(tuition.blocks.some((block) => block.type === 'table'));
  assert.ok(tuition.blocks.some((block) => block.type === 'list'));
  assert.match(JSON.stringify(tuition.blocks), /Kỹ thuật, Điện toán/);

  const blocks = parseContent('#### Tiêu đề\n- Mục một\n- Mục hai');
  assert.deepEqual(blocks, [
    { type: 'heading', text: 'Tiêu đề' },
    { type: 'list', items: ['Mục một', 'Mục hai'] },
  ]);
});

test('serves public university pages and includes them in the sitemap', async (context) => {
  const app = express();
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, '..', 'views'));
  app.use(require('../routes/public'));
  const server = app.listen(0);
  context.after(() => new Promise((resolve) => server.close(resolve)));
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;

  const listResponse = await fetch(`${base}/truong-dai-hoc`);
  const listHtml = await listResponse.text();
  assert.equal(listResponse.status, 200);
  assert.match(listHtml, /SOL DREAM EDUCATION tổng hợp/);
  assert.match(listHtml, /\/truong-dai-hoc\/hanyang/);

  const detailResponse = await fetch(`${base}/truong-dai-hoc/hanyang`);
  const detailHtml = await detailResponse.text();
  assert.equal(detailResponse.status, 200);
  assert.match(detailHtml, /Hanyang University có cơ sở tại Seoul và Ansan/);
  assert.match(detailHtml, /<table class="geo-data-table">/);
  assert.doesNotMatch(detailHtml, /Case study hồ sơ thực tế/);
  assert.match(detailHtml, /Câu hỏi thường gặp về Trường Đại học Hanyang/);
  assert.match(detailHtml, /<table class="knowledge-table">/);
  assert.match(detailHtml, /Nguồn và phạm vi thông tin/);

  const courseResponse = await fetch(`${base}/khoa-hoc`);
  const courseHtml = await courseResponse.text();
  assert.equal(courseResponse.status, 200);
  assert.match(courseHtml, /Khóa học tại SOL DREAM EDUCATION/);
  assert.match(courseHtml, /2\.020\.000 VNĐ trọn khóa/);
  assert.match(courseHtml, /Nên chọn khóa học nào/);
  assert.match(courseHtml, /href="\/khoa-hoc\/tieng-anh-giao-tiep"[^>]*>Tiếng Anh giao tiếp</);

  const courseDetailResponse = await fetch(`${base}/khoa-hoc/tieng-han-so-cap-1`);
  const courseDetailHtml = await courseDetailResponse.text();
  assert.equal(courseDetailResponse.status, 200);
  assert.match(courseDetailHtml, /Tiếng Hàn sơ cấp 1 phù hợp với ai/);
  assert.match(courseDetailHtml, /2\.020\.000 VND trọn khóa/);

  const englishCourseResponse = await fetch(`${base}/khoa-hoc/tieng-anh-giao-tiep`);
  const englishCourseHtml = await englishCourseResponse.text();
  assert.equal(englishCourseResponse.status, 200);
  assert.match(englishCourseHtml, /TOEIC\/IELTS/);
  assert.doesNotMatch(englishCourseHtml, /<strong>TOPIK:<\/strong>/);

  const aboutResponse = await fetch(`${base}/gioi-thieu`);
  const aboutHtml = await aboutResponse.text();
  assert.equal(aboutResponse.status, 200);
  assert.match(aboutHtml, /SOL DREAM EDUCATION là ai/);
  assert.match(aboutHtml, /Minh bạch nguồn thông tin/);

  const faqResponse = await fetch(`${base}/cau-hoi-thuong-gap`);
  const faqHtml = await faqResponse.text();
  assert.equal(faqResponse.status, 200);
  assert.match(faqHtml, /SOL DREAM EDUCATION cung cấp những dịch vụ nào/);
  assert.match(faqHtml, /Học phí, học bổng và điều kiện visa/);

  const chatResponse = await fetch(`${base}/tro-ly-du-hoc`);
  const chatHtml = await chatResponse.text();
  assert.equal(chatResponse.status, 200);
  assert.match(chatHtml, /data-chat-interface/);
  assert.match(chatHtml, /Trợ lý tư vấn du học Hàn Quốc/);

  const robotsResponse = await fetch(`${base}/robots.txt`);
  const robots = await robotsResponse.text();
  for (const bot of ['GPTBot', 'OAI-SearchBot', 'PerplexityBot', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'Google-Extended', 'Bingbot', 'Applebot-Extended']) {
    assert.match(robots, new RegExp(`User-agent: ${bot}\\nAllow: /\\nDisallow: /admin`));
  }

  const newsResponse = await fetch(`${base}/tin-tuc/cuoc-song-du-hoc-han-quoc-lieu-co-mau-hong`);
  const newsHtml = await newsResponse.text();
  assert.equal(newsResponse.status, 200);
  assert.match(newsHtml, /Thông tin hỗ trợ du học từ SOL DREAM EDUCATION/);
  assert.match(newsHtml, /Nguồn và phạm vi nội dung/);

  const programmeResponse = await fetch(`${base}/du-hoc/dieu-kien-du-hoc-han-quoc`);
  const programmeHtml = await programmeResponse.text();
  assert.equal(programmeResponse.status, 200);
  assert.match(programmeHtml, /SOL DREAM EDUCATION tổng hợp/);
  assert.match(programmeHtml, /Nguồn và phạm vi thông tin/);

  const sitemapResponse = await fetch(`${base}/sitemap.xml`);
  const sitemap = await sitemapResponse.text();
  assert.equal(sitemapResponse.status, 200);
  assert.match(sitemap, /https:\/\/soldream\.edu\.vn\/truong-dai-hoc\/hanyang/);
  assert.match(sitemap, /https:\/\/soldream\.edu\.vn\/khoa-hoc/);
  assert.match(sitemap, /https:\/\/soldream\.edu\.vn\/khoa-hoc\/tieng-han-so-cap-1/);
  assert.match(sitemap, /https:\/\/soldream\.edu\.vn\/gioi-thieu/);
  assert.match(sitemap, /https:\/\/soldream\.edu\.vn\/cau-hoi-thuong-gap/);
  assert.match(sitemap, /https:\/\/soldream\.edu\.vn\/tro-ly-du-hoc/);
  assert.match(sitemap, /<lastmod>2026-08-26<\/lastmod>/);
});
