'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const ejs = require('ejs');

const homeView = path.join(__dirname, '..', 'views', 'home.ejs');

test('editorial homepage keeps school, story and consultation routes wired', async () => {
  const html = await ejs.renderFile(homeView, {
    assetVer: 'test',
    homepageStats: [],
    homepageStatsSource: '',
    homepageAboutSections: [{ title: 'Giới thiệu', content: '<p>Nội dung biên tập.</p>' }],
    programs: [{ title: 'Đại học Yonsei', slug: 'dai-hoc-yonsei', category: 'Thông tin trường', cover_image: '' }],
    posts: [{ title: 'Câu chuyện học viên', slug: 'toi-da-tim-thay-chinh-minh-giua-xu-lanh-han-quoc', category: 'Cẩm nang du học', cover_image: '' }],
    testimonials: [{ quote: 'Một trải nghiệm đáng nhớ.', name: 'Học viên', role: 'Cựu học viên' }],
  });

  assert.match(html, /id="hanh-trinh"/);
  assert.match(html, /href="\/truong-dai-hoc\/dai-hoc-yonsei"/);
  assert.match(html, /href="\/tin-tuc\/toi-da-tim-thay-chinh-minh-giua-xu-lanh-han-quoc"/);
  assert.match(html, /Nội dung biên tập/);
  assert.match(html, /data-lead-form/);
  assert.match(html, /name="interestDetail"/);
  assert.match(html, /home-immersive\.js/);
});
