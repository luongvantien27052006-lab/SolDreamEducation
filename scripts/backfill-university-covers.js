'use strict';

require('dotenv').config();

async function run() {
  const db = require('../db');
  const { repairUniversityProgramCovers } = require('../lib/researchBot');
  const result = await repairUniversityProgramCovers({
    limit: Number(process.env.UNIVERSITY_COVER_BACKFILL_LIMIT || 100),
  });
  console.log(JSON.stringify(result, null, 2));
  db.close();
}

run().catch((error) => {
  console.error(error);
  try { require('../db').close(); } catch (_) { /* noop */ }
  process.exitCode = 1;
});

