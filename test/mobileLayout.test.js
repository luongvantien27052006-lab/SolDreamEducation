'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'public', 'css', 'style.css'), 'utf8');
const adminCss = fs.readFileSync(path.join(root, 'public', 'css', 'admin.css'), 'utf8');
const siteJs = fs.readFileSync(path.join(root, 'public', 'js', 'site.js'), 'utf8');
const head = fs.readFileSync(path.join(root, 'views', 'partials', 'head.ejs'), 'utf8');
const leadPopup = fs.readFileSync(path.join(root, 'views', 'partials', 'lead-popup.ejs'), 'utf8');
const dbIndex = fs.readFileSync(path.join(root, 'db', 'index.js'), 'utf8');

test('public pages use a mobile-safe viewport and shrinkable hero columns', () => {
  assert.match(head, /viewport-fit=cover/);
  assert.match(css, /grid-template-columns:minmax\(0,1\.05fr\) minmax\(0,\.95fr\)/);
  assert.match(css, /\.hero__text,\.hero__visual\{min-width:0;max-width:100%\}/);
});

test('long mobile calls to action wrap instead of widening the page', () => {
  assert.match(css, /\.hero__actions \.btn\{[^}]*white-space:normal/);
  assert.match(css, /\.hero__chips\{display:grid;grid-template-columns:minmax\(0,1fr\)/);
  assert.match(css, /\.pass__grid\{grid-template-columns:repeat\(2,minmax\(0,1fr\)/);
});

test('mobile handbook cards cannot expand the page beyond the viewport', () => {
  assert.match(css, /\.wrap>\*\{min-width:0;max-width:100%\}/);
  assert.match(css, /\.news-grid,\.card-grid,\.why-grid,\.journey,\.footer__grid\{grid-template-columns:minmax\(0,1fr\)\}/);
  assert.match(css, /\.news-grid>\*\{min-width:0;max-width:100%\}/);
});

test('all public content tables are wrapped in a local horizontal scroller', () => {
  assert.match(siteJs, /querySelectorAll\('main table'\)/);
  assert.match(css, /\.table-scroll\{[^}]*overflow-x:auto/);
});

test('admin content keeps wide tables inside a mobile-safe main column', () => {
  assert.match(adminCss, /\.adm__main\{width:100%;min-width:0;max-width:1100px/);
  assert.match(adminCss, /\.tbl-scroll\{overflow-x:auto/);
  assert.match(adminCss, /\.source-keywords textarea\{width:100%;min-width:0/);
});

test('consultation popup defaults to 30 seconds and follows the admin value', () => {
  assert.match(dbIndex, /VALUES \(\?,\?,\?,\?,30,0,1,'lead_capture'\)/);
  assert.match(leadPopup, /data-popup-delay="<%= leadPopup\.delay_seconds %>"/);
  assert.match(siteJs, /Math\.max\(0,Number\(leadPopup\.dataset\.popupDelay\)\|\|0\)\*1000/);
});

test('consultation popup uses page context and offers session dismissal choices', () => {
  assert.match(leadPopup, /leadContext\.interest/);
  assert.match(leadPopup, /data-lead-dismiss-session/);
  assert.match(leadPopup, /data-lead-remind/);
  assert.match(siteJs, /10\*60\*1000/);
  assert.match(siteJs, /sessionStorage\.setItem\(dismissKey,'1'\)/);
});
