'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { assessContent } = require('../lib/contentQuality');
const { universityDraftCoverageReport } = require('../lib/editorialAi');
const { profiles, renderContent } = require('../scripts/repair-incomplete-school-profiles');

test('repaired school profiles are long, Vietnamese, structured and publishable', () => {
  assert.equal(profiles.length, 3);
  for (const profile of profiles) {
    const content = renderContent(profile);
    const item = {
      ...profile,
      content,
      seo_title: profile.seoTitle,
      meta_description: profile.metaDescription,
      focus_keyword: profile.focusKeyword,
      source_urls: profile.sources.join('\n'),
      author_name: 'Ban biên tập SOL DREAM EDUCATION',
      author_url: '/gioi-thieu',
      cover_image: '/uploads/school.webp',
    };
    const quality = assessContent(item);
    const coverage = universityDraftCoverageReport(item, { minimumCharacters: 7000 });

    assert.ok(content.length >= 9000, `${profile.slug} is too short`);
    assert.equal(quality.score, 100, `${profile.slug}: ${quality.issues.join('; ')}`);
    assert.equal(quality.sourceCount, 3, `${profile.slug} should use exactly three official sources`);
    assert.equal(coverage.complete, true, `${profile.slug}: missing ${coverage.missingGroups.join(', ')}`);
    assert.ok(coverage.wordCount >= 900, `${profile.slug} needs at least 900 words`);
    assert.doesNotMatch(content, /(?:NGUỒN NGHIÊN CỨU|DỮ LIỆU TÌM KIẾM MỞ RỘNG|vertexaisearch)/i);
    assert.doesNotMatch(content, /<h2>\s*(?:Nguồn|Liên kết)/i);
    assert.ok(profile.sources.every((url) => /^https:\/\//.test(url)));
  }
});

test('Daehan profile does not misstate undergraduate or transfer-year admissions', () => {
  const profile = profiles.find((item) => item.slug === 'dai-hoc-than-hoc-daehan');
  const text = renderContent(profile);
  assert.match(text, /trường đại học sau đại học/i);
  assert.doesNotMatch(text, /năm nhất|năm hai|năm ba|năm bốn/i);
  assert.match(text, /100\.000 KRW/);
  assert.match(text, /120\.000 KRW/);
});
