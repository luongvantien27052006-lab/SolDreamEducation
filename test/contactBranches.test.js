'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { buildLocalReply } = require('../lib/chatFallback');
const { getWebsiteDocuments } = require('../lib/websiteKnowledge');

const root = path.join(__dirname, '..');

test('footer displays the northern branch without an unconfirmed hotline', () => {
  const footer = fs.readFileSync(path.join(root, 'views', 'partials', 'footer.ejs'), 'utf8');
  const northernBranch = footer.split('Chi nhánh miền Bắc')[1].split('</div>\n      </div>')[0];
  assert.match(northernBranch, /098, đường Thủy Nguyên, khu đô thị Ecopark, Xuân Quan, Phụng Công, Hưng Yên/);
  assert.match(northernBranch, /T2–T6: 8:00–21:00 · T7: 8:00–12:00/);
  assert.doesNotMatch(northernBranch, /tel:/);
});

test('chatbot knowledge includes both official contact locations', () => {
  assert.match(buildLocalReply('Địa chỉ chi nhánh miền Bắc ở đâu?'), /098, đường Thủy Nguyên/);
  const profile = getWebsiteDocuments().find((document) => document.id === 'site:profile');
  assert.ok(profile);
  assert.match(profile.text, /Chi nhánh miền Bắc tại 098, đường Thủy Nguyên/);
});
