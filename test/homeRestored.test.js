'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ejs = require('ejs');
const root = path.join(__dirname, '..');
const data = {
  homepageStats: [{ value_number: 7, prefix: '', suffix: '+', label: 'Năm đồng hành' }],
  homepageStatsSource: 'Số liệu biên tập được giữ nguyên.',
  homepageAboutSections: [{ title: 'Giới thiệu', content: '<p>Nội dung từ quản trị.</p>' }],
  programs: [{ title: 'Đại học Yonsei', slug: 'dai-hoc-yonsei', category: 'Thông tin trường', cover_image: '' }],
  posts: [{ title: 'Câu chuyện học viên', slug: 'cau-chuyen-hoc-vien', category: 'Cẩm nang', cover_image: '', geoBluf: 'Thông tin học viên.' }],
  testimonials: [{ quote: 'Một trải nghiệm đáng nhớ.', name: 'Học viên', role: 'Cựu học viên', rating: 5 }],
};
test('original homepage keeps approved hero, CMS content, links and consultation form', async () => {
  const html = await ejs.renderFile(path.join(root, 'views', 'home.ejs'), data);
  assert.match(html, /Học tiếng Hàn, chạm tới/);
  assert.match(html, /data-flight-ticket/);
  assert.match(html, /Nội dung từ quản trị/);
  assert.match(html, /Năm đồng hành/);
  assert.match(html, /href="\/truong-dai-hoc\/dai-hoc-yonsei"/);
  assert.match(html, /href="\/tin-tuc\/cau-chuyen-hoc-vien"/);
  assert.match(html, /id="lienhe"/);
  assert.match(html, /data-lead-form/);
  assert.match(html, /name="interestDetail"/);
  assert.doesNotMatch(html, /Dám mơ|home-immersive|hx-hero/);
});
test('original public navigation works even if a legacy caller supplies homeExperience', async () => {
  const html = await ejs.renderFile(path.join(root, 'views', 'partials', 'header.ejs'), {
    homeExperience: true, navigationCourses: [{ url: '/khoa-hoc/tieng-han', name: 'Khóa học tiếng Hàn' }],
  });
  for (const href of ['/gioi-thieu', '/khoa-hoc', '/du-hoc', '/truong-dai-hoc', '/tin-tuc', '/#lienhe']) {
    assert.ok(html.includes('href="' + href + '"'), href);
  }
  assert.match(html, /Khóa học tiếng Hàn/);
  assert.doesNotMatch(html, /Bắt đầu hành trình|site-header--experience/);
});
test('retired immersive assets are removed and are not loaded by layout or server', () => {
  for (const name of ['views/home.ejs', 'views/layout.ejs', 'views/partials/head.ejs', 'server.js', 'routes/public.js']) {
    assert.doesNotMatch(fs.readFileSync(path.join(root, name), 'utf8'), /home-immersive|_home_immersive|home-experience-page|homeExperience/);
  }
  for (const name of ['views/_home_immersive.ejs', 'public/css/home-immersive.css', 'public/js/home-immersive.js']) {
    assert.equal(fs.existsSync(path.join(root, name)), false, name);
  }
});
