'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { targets, buildProfileContent } = require('../scripts/repair-remaining-school-profiles');
const { profiles: legacyProfiles } = require('../scripts/upgrade-legacy-school-profiles');
const { universityDraftCoverageReport } = require('../lib/editorialAi');

test('remaining school repair covers all nine profiles with exactly three official sources', () => {
  assert.equal(targets.length, 9);
  assert.equal(new Set(targets.map((profile) => profile.slug)).size, 9);
  targets.forEach((profile) => {
    assert.equal(profile.sources.length, 3, profile.slug);
    profile.sources.forEach((url) => assert.match(url, /^https:\/\//));
  });
});

test('six legacy school profiles become full Vietnamese profiles without visible source links', () => {
  legacyProfiles.forEach((profile) => {
    const spec = targets.find((item) => item.slug === profile.slug);
    assert.ok(spec, profile.slug);
    const content = buildProfileContent(spec, { title: profile.title, content: '' });
    const report = universityDraftCoverageReport({ ...profile, content });
    assert.equal(report.complete, true, `${profile.slug}: ${JSON.stringify(report)}`);
    assert.ok(report.characterCount >= 9000, profile.slug);
    assert.ok(report.wordCount >= 1800, profile.slug);
    assert.doesNotMatch(content, /https?:\/\//i);
    assert.doesNotMatch(content, /Nguồn bài viết|Nguồn chính thức và thời điểm kiểm tra/i);
  });
});

test('crawler-created profile bases are cleaned before the deep editorial sections are added', () => {
  const spec = targets.find((profile) => profile.slug === 'dai-hoc-suwon');
  const content = buildProfileContent(spec, {
    title: spec.title,
    content: '<p>Đại học Suwon có chương trình quốc tế.</p><h2>Nguồn chính thức</h2><ul><li><a href="https://example.com">https://example.com</a></li></ul>',
  });
  assert.match(content, /Nên chọn lộ trình nào tại Đại học Suwon/);
  assert.doesNotMatch(content, /example\.com|Nguồn chính thức/i);
});
