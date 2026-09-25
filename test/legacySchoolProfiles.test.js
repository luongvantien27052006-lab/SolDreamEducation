'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('../db');
const { universityDraftCoverage } = require('../lib/editorialAi');

const LEGACY_SCHOOL_SLUGS = [
  'dai-hoc-quoc-gia-seoul',
  'dai-hoc-yonsei',
  'dai-hoc-korea',
  'dai-hoc-woosong',
  'dai-hoc-hansung',
  'du-hoc-dai-hoc-quoc-gia-pusan-2026-dieu-kien-tuyen-sinh-hoc-phi-va-visa-d-4-1-chi-tiet',
];

test('legacy school cards use complete Vietnamese official-source profiles', () => {
  const rowBySlug = db.prepare(`SELECT id,title,subtitle,excerpt,content,source_urls,published,noindex,
    seo_title,meta_description,author_name FROM programs WHERE slug=?`);
  const faqCount = db.prepare("SELECT COUNT(*) AS count FROM faqs WHERE origin_type='program' AND origin_id=? AND published=1");

  for (const slug of LEGACY_SCHOOL_SLUGS) {
    const row = rowBySlug.get(slug);
    assert.ok(row, `missing school profile: ${slug}`);
    assert.equal(row.published, 1);
    assert.equal(row.noindex, 0);
    assert.equal(universityDraftCoverage(row), true, `${slug} does not meet the full-profile coverage standard`);
    assert.doesNotMatch(`${row.title} ${row.subtitle} ${row.excerpt} ${row.content}`, /[가-힣]/);
    assert.ok(String(row.source_urls).split(/\r?\n/).filter(Boolean).length >= 4, `${slug} needs at least four official sources`);
    assert.ok(row.seo_title && row.meta_description && row.author_name, `${slug} is missing publication metadata`);
    assert.ok(faqCount.get(String(row.id)).count >= 4, `${slug} is missing generated FAQs`);
  }
});

