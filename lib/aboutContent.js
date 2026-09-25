'use strict';

const db = require('../db');

const LOCATIONS = Object.freeze(['home', 'page']);
const STYLES = Object.freeze(['standard', 'direct-answer', 'source-box', 'tab']);

function getAboutSections(location, options = {}) {
  if (!LOCATIONS.includes(location)) return [];
  const activeClause = options.includeInactive ? '' : 'AND active=1';
  return db.prepare(`SELECT * FROM about_sections WHERE location=? ${activeClause} ORDER BY sort_order,id`).all(location);
}

function normaliseAboutSection(body) {
  const location = LOCATIONS.includes(body.location) ? body.location : 'page';
  const sectionStyle = STYLES.includes(body.section_style) ? body.section_style : 'standard';
  const title = String(body.title || '').trim().slice(0, 180);
  if (!title) throw new Error('Vui lòng nhập tiêu đề phần giới thiệu.');
  return {
    location,
    sectionStyle,
    eyebrow: String(body.eyebrow || '').trim().slice(0, 100),
    title,
    sortOrder: Math.min(100000, Math.max(-100000, Number.parseInt(body.sort_order, 10) || 0)),
  };
}

module.exports = { LOCATIONS, STYLES, getAboutSections, normaliseAboutSection };
