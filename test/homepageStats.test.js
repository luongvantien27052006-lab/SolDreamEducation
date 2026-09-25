'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { getHomepageStats, getHomepageStatsSource, formatHomepageStat } = require('../lib/homepageStats');
const { getWebsiteDocuments } = require('../lib/websiteKnowledge');

test('homepage statistics are database-backed, ordered and indexed for chatbot use', () => {
  const rows = getHomepageStats();
  assert.ok(rows.length >= 4);
  // Values are intentionally editable in Admin, so this test must validate
  // the live persisted values instead of resetting them to seed defaults.
  rows.forEach((row) => assert.match(formatHomepageStat(row), /\d/));
  assert.ok(getHomepageStatsSource().length > 20);
  const document = getWebsiteDocuments().find((item) => item.id === 'site:homepage-stats');
  assert.ok(document);
  rows.forEach((row) => assert.match(document.text, new RegExp(row.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))));
});

test('homepage and Admin views render statistics dynamically', () => {
  const root = path.join(__dirname, '..');
  const homepage = fs.readFileSync(path.join(root, 'views', '_home_main.ejs'), 'utf8');
  const admin = fs.readFileSync(path.join(root, 'views', 'admin', 'homepage-stats.ejs'), 'utf8');
  assert.match(homepage, /visibleHomepageStats\.forEach/);
  assert.doesNotMatch(homepage, /data-count="1000"/);
  assert.match(admin, /so-lieu-trang-chu\/moi/);
  assert.match(admin, /Ẩn khỏi website/);
});

test('deleting every homepage statistic does not make seed items return after restart', () => {
  const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'sol-dream-homepage-stats-'));
  const databasePath = path.join(tempDirectory, 'stats.sqlite');
  const run = (source) => execFileSync(process.execPath, ['-e', source], {
    cwd: path.join(__dirname, '..'), env: { ...process.env, DATABASE_PATH: databasePath }, encoding: 'utf8',
  }).trim().split(/\r?\n/).at(-1);
  try {
    assert.equal(run("const db=require('./db');console.log(db.prepare('SELECT COUNT(*) c FROM homepage_stats').get().c);db.prepare('DELETE FROM homepage_stats').run();db.close();"), '4');
    assert.equal(run("const db=require('./db');console.log(db.prepare('SELECT COUNT(*) c FROM homepage_stats').get().c);db.close();"), '0');
  } finally {
    fs.rmSync(tempDirectory, { recursive: true, force: true });
  }
});
