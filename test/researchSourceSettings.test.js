'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

function runWithDatabase(databasePath, source) {
  return execFileSync(process.execPath, ['-e', source], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, DATABASE_PATH: databasePath },
    encoding: 'utf8',
  }).trim();
}

test('admin research-source switches survive an application restart', () => {
  const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'sol-dream-source-settings-'));
  const databasePath = path.join(tempDirectory, 'settings.sqlite');

  try {
    runWithDatabase(databasePath, `
      const db = require('./db');
      db.prepare("UPDATE research_sources SET active=1,auto_publish_non_school=1 WHERE source_type='official-news'").run();
      db.close();
    `);
    const output = runWithDatabase(databasePath, `
      const db = require('./db');
      const rows = db.prepare("SELECT active,auto_publish_non_school FROM research_sources WHERE source_type='official-news'").all();
      console.log(JSON.stringify(rows));
      db.close();
    `);
    const rows = JSON.parse(output);
    assert.ok(rows.length > 0);
    assert.ok(rows.every((row) => row.active === 1 && row.auto_publish_non_school === 1));
  } finally {
    fs.rmSync(tempDirectory, { recursive: true, force: true });
  }
});
