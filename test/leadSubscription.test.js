'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { programPublicPath } = require('../lib/util');
const { leadMatchesContent, emailPayload } = require('../lib/subscriberNotifier');

test('school profiles and study programmes use separate public routes', () => {
  assert.equal(programPublicPath({ category: 'Thông tin trường', slug: 'dai-hoc-hannam' }), '/truong-dai-hoc/dai-hoc-hannam');
  assert.equal(programPublicPath({ category: 'Chương trình du học', slug: 'he-tieng-d4' }), '/du-hoc/he-tieng-d4');
});

test('subscriber matching keeps school updates scoped to the requested school', () => {
  const lead = { email: 'student@example.com', subscription_active: 1, lead_type: 'school_info', source_path: '/', interest: 'Thông tin trường', interest_detail: 'Đại học Hannam' };
  assert.equal(leadMatchesContent(lead, { group: 'school_info', type: 'program', path: '/truong-dai-hoc/hannam', title: 'Trường Đại học Hannam', excerpt: 'Thông báo tuyển sinh mới' }), true);
  assert.equal(leadMatchesContent(lead, { group: 'school_info', type: 'program', path: '/truong-dai-hoc/yonsei', title: 'Trường Đại học Yonsei', excerpt: 'Thông báo tuyển sinh mới' }), false);
});

test('subscriber email contains a short update, detail link and unsubscribe link', () => {
  const payload = emailPayload({ name: 'Nguyễn Văn A', interest: 'Thông tin về Trường Đại học Hannam', content_title: 'Thông báo tuyển sinh Hannam', content_excerpt: 'Trường vừa công bố lịch tuyển sinh mới.', content_path: '/truong-dai-hoc/hannam', unsubscribe_token: 'a'.repeat(48) });
  assert.match(payload.html, /Thông báo tuyển sinh Hannam/);
  assert.match(payload.html, /Xem chi tiết trên website/);
  assert.match(payload.html, /\/truong-dai-hoc\/hannam/);
  assert.match(payload.html, /\/api\/unsubscribe\?token=/);
});
