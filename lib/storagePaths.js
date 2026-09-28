'use strict';

const fs = require('fs');
const path = require('path');

const APP_ROOT = path.join(__dirname, '..');
const UPLOADS_DIR = path.resolve(
  process.env.UPLOADS_DIR || path.join(APP_ROOT, 'public', 'uploads')
);
const RESEARCH_UPLOADS_DIR = path.join(UPLOADS_DIR, 'research');

fs.mkdirSync(UPLOADS_DIR, { recursive: true });

module.exports = { UPLOADS_DIR, RESEARCH_UPLOADS_DIR };
