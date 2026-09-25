'use strict';
const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const router = express.Router();
const db = require('../db');
const { requireAdmin } = require('../lib/auth');
const { slugify, uniqueSlug, decorate, normalizeSourceUrls, normalizeOptionalUrl, programPublicPath } = require('../lib/util');
const { sanitizeRichHtml } = require('../lib/contentSanitizer');
const { queueIndexNow } = require('../lib/indexNow');
const { assessContent } = require('../lib/contentQuality');
const { syncWebsiteKnowledge, getIndexStats } = require('../lib/websiteKnowledge');
const { runResearchBot, buildEditorialSource, coverImageForPage, searchExternalUniversityCover, attachmentMarkup } = require('../lib/researchBot');
const { generateEditorialDraft, generateUniversityProfileDraft, universityDraftCoverage, suggestResearchKeywords } = require('../lib/editorialAi');
const { finalizePublishedContent, removePublishedContent } = require('../lib/publicationPipeline');
const { isOfficialUniversityUrl } = require('../lib/koreaScope');
const { getAboutSections, normaliseAboutSection } = require('../lib/aboutContent');

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || (process.env.NODE_ENV === 'production' ? '' : 'soldream@2026');
const layout = 'admin/layout';
const loginAttempts = new Map();

if (!ADMIN_PASSWORD) throw new Error('ADMIN_PASSWORD bắt buộc phải được cấu hình trong môi trường production.');

router.use((req, res, next) => {
  if (req.method !== 'POST') return next();
  if (req.get('sec-fetch-site') === 'cross-site') return res.status(403).send('Yêu cầu quản trị không hợp lệ.');
  const origin = req.get('origin');
  if (origin) {
    try { if (new URL(origin).host !== req.get('host')) return res.status(403).send('Yêu cầu quản trị không hợp lệ.'); }
    catch (_) { return res.status(403).send('Yêu cầu quản trị không hợp lệ.'); }
  }
  return next();
});

// Any content mutation automatically refreshes the chatbot's persistent index
// after the admin response has completed.
router.use((req, res, next) => {
  if (req.method === 'POST' && /^\/(tin-tuc|du-hoc|khoa-hoc|faq|nghien-cuu|cam-nhan|so-lieu-trang-chu|gioi-thieu)(?:\/|$)/.test(req.path)) {
    res.once('finish', () => {
      if (res.statusCode >= 400) return;
      try { syncWebsiteKnowledge({ force: true }); }
      catch (error) { console.error('[chat] admin re-index error:', error.message); }
    });
  }
  next();
});

function securePasswordMatch(value) {
  const supplied = Buffer.from(String(value || ''));
  const expected = Buffer.from(ADMIN_PASSWORD);
  return supplied.length === expected.length && crypto.timingSafeEqual(supplied, expected);
}

function allowLogin(ip) {
  const now = Date.now();
  const attempts = (loginAttempts.get(ip) || []).filter((time) => now - time < 15 * 60 * 1000);
  loginAttempts.set(ip, attempts);
  return attempts.length < 8;
}

// ---------- Upload setup (multer) ----------
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const UPLOAD_DIR = path.join(PUBLIC_DIR, 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const EXTENSION_BY_MIME = Object.freeze({
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/avif': '.avif',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/quicktime': '.mov',
  'video/x-m4v': '.m4v',
});
const IMAGE_MIMES = new Set(Object.keys(EXTENSION_BY_MIME).filter((type) => type.startsWith('image/')));
const EDITOR_MEDIA_MIMES = new Set(Object.keys(EXTENSION_BY_MIME));
const configuredMediaLimit = Number(process.env.MAX_EDITOR_MEDIA_MB || 500);
const MAX_EDITOR_MEDIA_MB = Number.isFinite(configuredMediaLimit)
  ? Math.min(1024, Math.max(50, configuredMediaLimit))
  : 500;

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = EXTENSION_BY_MIME[String(file.mimetype || '').toLowerCase()] || '.bin';
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
  }
});
const coverUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => cb(null, IMAGE_MIMES.has(String(file.mimetype || '').toLowerCase()))
});
const editorMediaUpload = multer({
  storage,
  limits: { fileSize: MAX_EDITOR_MEDIA_MB * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (EDITOR_MEDIA_MIMES.has(String(file.mimetype || '').toLowerCase())) return cb(null, true);
    const error = new Error('UNSUPPORTED_MEDIA_TYPE');
    error.code = 'UNSUPPORTED_MEDIA_TYPE';
    return cb(error);
  }
});
// wrap so multer errors become a friendly message instead of a crash
function uploadCover(req, res, next) {
  coverUpload.single('cover_image')(req, res, (err) => {
    if (err) req.uploadError = (err.code === 'LIMIT_FILE_SIZE') ? 'Ảnh quá lớn (tối đa 5MB).' : 'Không tải được ảnh. Vui lòng thử lại.';
    next();
  });
}

function uploadAvatar(req, res, next) {
  coverUpload.single('avatar_image')(req, res, (err) => {
    if (err) req.uploadError = (err.code === 'LIMIT_FILE_SIZE') ? 'Ảnh đại diện quá lớn (tối đa 5MB).' : 'Không tải được ảnh đại diện.';
    next();
  });
}

function uploadEditorMedia(fieldName) {
  return (req, res, next) => editorMediaUpload.single(fieldName)(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: `Tệp quá lớn (tối đa ${MAX_EDITOR_MEDIA_MB}MB).` });
    if (err.code === 'UNSUPPORTED_MEDIA_TYPE') return res.status(415).json({ error: 'Chỉ hỗ trợ ảnh JPG, PNG, WebP, GIF, AVIF và video MP4, WebM, MOV, M4V.' });
    return res.status(400).json({ error: 'Không tải được tệp media. Vui lòng thử lại.' });
  });
}
function removeUpload(coverUrl) {
  if (!coverUrl || !coverUrl.startsWith('/uploads/')) return;
  try { fs.unlinkSync(path.join(PUBLIC_DIR, coverUrl)); } catch (e) { /* ignore */ }
}

function isEnabled(value) { return value === '1' || value === 1 || value === true; }
const SCHOOL_CATEGORY = 'Thông tin trường';
const STUDY_CATEGORY = 'Chương trình du học';
function canonicalProgramCategory(value) {
  return ['Trường đại học', SCHOOL_CATEGORY].includes(String(value || '').trim()) ? SCHOOL_CATEGORY : STUDY_CATEGORY;
}
function programAdminUrl(category, flash = '') {
  const query = new URLSearchParams({ category: canonicalProgramCategory(category) });
  if (flash) query.set('flash', flash);
  return `/admin/du-hoc?${query.toString()}`;
}
function withQuality(row) {
  const item = decorate(row);
  return { ...item, quality: assessContent(item) };
}
function listContent(table, req, orderBy) {
  const q = String(req.query.q || '').trim().slice(0, 120);
  const status = ['published', 'draft', 'noindex'].includes(req.query.status) ? req.query.status : 'all';
  const category = String(req.query.category || '').trim().slice(0, 80);
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const perPage = 20;
  const where = [];
  const params = [];
  if (q) { where.push('(title LIKE ? OR excerpt LIKE ? OR content LIKE ?)'); params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
  if (status === 'published') where.push('published = 1');
  if (status === 'draft') where.push('published = 0');
  if (status === 'noindex') where.push('noindex = 1');
  if (category) { where.push('category = ?'); params.push(category); }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const total = db.prepare(`SELECT COUNT(*) c FROM ${table} ${clause}`).get(...params).c;
  const pages = Math.max(1, Math.ceil(total / perPage));
  const currentPage = Math.min(page, pages);
  const rows = db.prepare(`SELECT * FROM ${table} ${clause} ORDER BY ${orderBy} LIMIT ? OFFSET ?`).all(...params, perPage, (currentPage - 1) * perPage).map(withQuality);
  const categories = db.prepare(`SELECT DISTINCT category FROM ${table} WHERE category != '' ORDER BY category`).all().map((row) => row.category);
  return { rows, categories, filters: { q, status, category }, pagination: { page: currentPage, pages, total } };
}

function uniqueCourseSlug(base, ignoreId = '') {
  let slug = base; let number = 1;
  const query = db.prepare('SELECT id FROM courses WHERE slug=? AND id!=?');
  while (query.get(slug, ignoreId)) { number += 1; slug = `${base}-${number}`; }
  return slug;
}

function homepageStatInput(body) {
  const label = String(body.label || '').trim().slice(0, 120);
  const rawValue = String(body.value_number ?? '').trim();
  if (!label) throw new Error('Vui lòng nhập tên số liệu.');
  if (!/^\d{1,10}$/.test(rawValue)) throw new Error('Giá trị phải là số nguyên từ 0 đến 1.000.000.000.');
  const valueNumber = Number(rawValue);
  if (!Number.isSafeInteger(valueNumber) || valueNumber > 1000000000) throw new Error('Giá trị phải là số nguyên từ 0 đến 1.000.000.000.');
  return {
    valueNumber,
    prefix: String(body.prefix || '').trim().slice(0, 12),
    suffix: String(body.suffix || '').trim().slice(0, 12),
    label,
    sortOrder: Math.min(100000, Math.max(-100000, Number.parseInt(body.sort_order, 10) || 0)),
  };
}

function courseRequirementInput(body) {
  const language = String(body.language || 'Tiếng Hàn').trim().slice(0, 80) || 'Tiếng Hàn';
  const isEnglish = /tiếng anh|english/i.test(language);
  let certificateRequired = String(body.certificate_required || body.topik_required || '').trim().slice(0, 160) || null;
  let status = String(body.requirement_status || '').trim();
  // Do not let a copied Korean-course field leak TOPIK into an English
  // course. TOEIC/IELTS are the relevant certificate families here.
  if (isEnglish) {
    if (certificateRequired) certificateRequired = certificateRequired.replace(/\bTOPIK\b/gi, 'TOEIC/IELTS');
    status = status.replace(/\bTOPIK\b/gi, 'TOEIC/IELTS');
  }
  return {
    language,
    requirements: {
      entryLevel: String(body.entry_level || '').trim() || null,
      certificateRequired,
      topikRequired: isEnglish ? null : certificateRequired,
      status,
    },
  };
}

// ---------- Auth ----------
router.get('/login', (req, res) => {
  if (req.session.admin) return res.redirect('/admin');
  res.render('admin/login', { layout, title: 'Đăng nhập Admin', error: null });
});
router.post('/login', (req, res) => {
  const ip = req.ip || req.socket?.remoteAddress || 'unknown';
  if (!allowLogin(ip)) return res.status(429).render('admin/login', { layout, title: 'Đăng nhập Admin', error: 'Đã thử quá nhiều lần. Vui lòng chờ 15 phút.' });
  if (securePasswordMatch(req.body.password)) {
    loginAttempts.delete(ip);
    return req.session.regenerate((error) => {
      if (error) return res.status(500).render('admin/login', { layout, title: 'Đăng nhập Admin', error: 'Không thể tạo phiên đăng nhập.' });
      req.session.admin = true;
      return res.redirect('/admin');
    });
  }
  loginAttempts.set(ip, [...(loginAttempts.get(ip) || []), Date.now()]);
  res.status(401).render('admin/login', { layout, title: 'Đăng nhập Admin', error: 'Mật khẩu không đúng.' });
});
router.post('/logout', (req, res) => { req.session.destroy(() => res.redirect('/admin/login')); });

function mediaUploadResponse(req, res) {
  if (!req.file) return res.status(400).json({ error: 'Vui lòng chọn một tệp ảnh hoặc video hợp lệ.' });
  const type = req.file.mimetype.startsWith('video/') ? 'video' : 'image';
  return res.json({
    url: `/uploads/${req.file.filename}`,
    type,
    mimeType: req.file.mimetype,
    size: req.file.size,
  });
}

// Media is stored byte-for-byte without recompression, preserving the uploaded quality.
router.post('/upload-media', requireAdmin, uploadEditorMedia('media'), mediaUploadResponse);
// Compatibility endpoint for an older cached version of the editor.
router.post('/upload-image', requireAdmin, uploadEditorMedia('image'), mediaUploadResponse);

// ---------- Dashboard ----------
router.get('/', requireAdmin, (req, res) => {
  const totalViews = db.prepare('SELECT COUNT(*) c FROM page_views').get().c;
  const uniqueVisitors = db.prepare('SELECT COUNT(DISTINCT visitor_id) c FROM page_views').get().c;
  const todayViews = db.prepare("SELECT COUNT(*) c FROM page_views WHERE date(created_at) = date('now','localtime')").get().c;
  const todayVisitors = db.prepare("SELECT COUNT(DISTINCT visitor_id) c FROM page_views WHERE date(created_at) = date('now','localtime')").get().c;
  const rows = db.prepare(
    "SELECT date(created_at) d, COUNT(*) views, COUNT(DISTINCT visitor_id) visitors " +
    "FROM page_views WHERE date(created_at) >= date('now','localtime','-13 days') GROUP BY d"
  ).all();
  const map = Object.fromEntries(rows.map(r => [r.d, r]));
  const series = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const r = map[key] || { views: 0, visitors: 0 };
    series.push({ key, label: `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`, views: r.views, visitors: r.visitors });
  }
  const maxViews = Math.max(1, ...series.map(s => s.views));
  const topPages = db.prepare('SELECT path, COUNT(*) c FROM page_views GROUP BY path ORDER BY c DESC LIMIT 6').all();
  const postCount = db.prepare('SELECT COUNT(*) c FROM posts').get().c;
  const programCount = db.prepare('SELECT COUNT(*) c FROM programs').get().c;
  const publishedCount = db.prepare('SELECT (SELECT COUNT(*) FROM posts WHERE published=1) + (SELECT COUNT(*) FROM programs WHERE published=1) c').get().c;
  const draftCount = postCount + programCount - publishedCount;
  const latestContent = [
    ...db.prepare("SELECT id,title,slug,updated_at,published,'post' type FROM posts ORDER BY datetime(updated_at) DESC LIMIT 5").all(),
    ...db.prepare("SELECT id,title,slug,updated_at,published,'program' type FROM programs ORDER BY datetime(updated_at) DESC LIMIT 5").all(),
  ].sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at))).slice(0, 6);
  const qualityRows = [
    ...db.prepare('SELECT * FROM posts').all().map((row) => ({ ...withQuality(row), type: 'post' })),
    ...db.prepare('SELECT * FROM programs').all().map((row) => ({ ...withQuality(row), type: 'program' })),
  ];
  const needsImprovement = qualityRows.filter((item) => item.quality.score < 60).sort((a, b) => a.quality.score - b.quality.score).slice(0, 6);
  res.render('admin/dashboard', { layout, title: 'Bảng điều khiển', active: 'dashboard', totalViews, uniqueVisitors, todayViews, todayVisitors, series, maxViews, topPages, postCount, programCount, publishedCount, draftCount, latestContent, needsImprovement });
});

// ---------- News CRUD ----------
router.get('/tin-tuc', requireAdmin, (req, res) => {
  const result = listContent('posts', req, 'datetime(updated_at) DESC, id DESC');
  res.render('admin/news-list', { layout, title: 'Quản lý tin tức', active: 'news', posts: result.rows, categories: result.categories, filters: result.filters, pagination: result.pagination, flash: req.query.flash || null });
});

router.get('/tin-tuc/moi', requireAdmin, (req, res) => {
  res.render('admin/news-form', { layout, title: 'Thêm bài viết', active: 'news', mode: 'create', post: { category: 'Tin tức', cover: 'p1', published: 1 }, error: null });
});

router.post('/tin-tuc/moi', requireAdmin, uploadCover, (req, res) => {
  const b = req.body;
  const back = (error) => res.render('admin/news-form', { layout, title: 'Thêm bài viết', active: 'news', mode: 'create', post: b, error });
  if (req.uploadError) { return back(req.uploadError); }
  if (!b.title || !b.title.trim()) { if (req.file) removeUpload('/uploads/' + req.file.filename); return back('Vui lòng nhập tiêu đề.'); }
  const slug = uniqueSlug(db, b.slug && b.slug.trim() ? slugify(b.slug) : slugify(b.title));
  const coverImage = req.file ? '/uploads/' + req.file.filename : null;
  const result = db.prepare(`INSERT INTO posts (title,slug,excerpt,content,category,cover,cover_image,author_name,author_role,author_url,source_urls,seo_title,meta_description,focus_keyword,noindex,published,created_at,updated_at)
              VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now','localtime'),datetime('now','localtime'))`)
    .run(b.title.trim(), slug, (b.excerpt||'').trim(), sanitizeRichHtml(b.content), (b.category||'Tin tức').trim(), b.cover||'p1', coverImage, (b.author_name||'').trim(), (b.author_role||'').trim(), normalizeOptionalUrl(b.author_url), normalizeSourceUrls(b.source_urls), (b.seo_title||'').trim(), (b.meta_description||'').trim(), (b.focus_keyword||'').trim(), isEnabled(b.noindex) ? 1 : 0, isEnabled(b.published) ? 1 : 0);
  if (isEnabled(b.published)) finalizePublishedContent('post', result.lastInsertRowid, { notify: true });
  if (isEnabled(b.published) && !isEnabled(b.noindex)) queueIndexNow([`/tin-tuc/${slug}`, '/tin-tuc', '/feed.xml', '/sitemap.xml', '/llms.txt']);
  res.redirect('/admin/tin-tuc?flash=Đã thêm bài viết');
});

router.get('/tin-tuc/:id/sua', requireAdmin, (req, res, next) => {
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
  if (!post) return next();
  res.render('admin/news-form', { layout, title: 'Sửa bài viết', active: 'news', mode: 'edit', post, error: null });
});

router.post('/tin-tuc/:id/sua', requireAdmin, uploadCover, (req, res, next) => {
  const existing = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
  if (!existing) { if (req.file) removeUpload('/uploads/' + req.file.filename); return next(); }
  const b = req.body;
  const back = (error) => res.render('admin/news-form', { layout, title: 'Sửa bài viết', active: 'news', mode: 'edit', post: { ...existing, ...b }, error });
  if (req.uploadError) { return back(req.uploadError); }
  if (!b.title || !b.title.trim()) { if (req.file) removeUpload('/uploads/' + req.file.filename); return back('Vui lòng nhập tiêu đề.'); }

  const base = b.slug && b.slug.trim() ? slugify(b.slug) : slugify(b.title);
  const slug = uniqueSlug(db, base, existing.id);
  let coverImage = existing.cover_image;
  if (b.remove_cover === '1' && existing.cover_image) { removeUpload(existing.cover_image); coverImage = null; }
  if (req.file) { if (existing.cover_image) removeUpload(existing.cover_image); coverImage = '/uploads/' + req.file.filename; }

  db.prepare(`UPDATE posts SET title=?, slug=?, excerpt=?, content=?, category=?, cover=?, cover_image=?, author_name=?, author_role=?, author_url=?, source_urls=?, seo_title=?, meta_description=?, focus_keyword=?, noindex=?, published=?, updated_at=datetime('now','localtime') WHERE id=?`)
    .run(b.title.trim(), slug, (b.excerpt||'').trim(), sanitizeRichHtml(b.content), (b.category||'Tin tức').trim(), b.cover||'p1', coverImage, (b.author_name||'').trim(), (b.author_role||'').trim(), normalizeOptionalUrl(b.author_url), normalizeSourceUrls(b.source_urls), (b.seo_title||'').trim(), (b.meta_description||'').trim(), (b.focus_keyword||'').trim(), isEnabled(b.noindex) ? 1 : 0, isEnabled(b.published) ? 1 : 0, existing.id);
  finalizePublishedContent('post', existing.id, { notify: isEnabled(b.published) });
  queueIndexNow([`/tin-tuc/${existing.slug}`, `/tin-tuc/${slug}`, '/tin-tuc', '/feed.xml', '/sitemap.xml', '/llms.txt']);
  res.redirect('/admin/tin-tuc?flash=Đã cập nhật bài viết');
});

router.post('/tin-tuc/:id/xoa', requireAdmin, (req, res) => {
  const post = db.prepare('SELECT slug, cover_image FROM posts WHERE id = ?').get(req.params.id);
  if (post && post.cover_image) removeUpload(post.cover_image);
  db.prepare('DELETE FROM posts WHERE id = ?').run(req.params.id);
  removePublishedContent('post', req.params.id);
  if (post) queueIndexNow([`/tin-tuc/${post.slug}`, '/tin-tuc', '/feed.xml', '/sitemap.xml', '/llms.txt']);
  res.redirect('/admin/tin-tuc?flash=Đã xoá bài viết');
});

router.post('/tin-tuc/:id/toggle', requireAdmin, (req, res, next) => {
  const post = db.prepare('SELECT id,slug,published,noindex FROM posts WHERE id=?').get(req.params.id);
  if (!post) return next();
  const published = post.published ? 0 : 1;
  // Bản nháp vừa được duyệt phải có thể lập chỉ mục ngay.
  db.prepare("UPDATE posts SET published=?, noindex=CASE WHEN ?=1 THEN 0 ELSE noindex END, updated_at=datetime('now','localtime') WHERE id=?").run(published, published, post.id);
  finalizePublishedContent('post', post.id, { notify: published === 1 });
  queueIndexNow([`/tin-tuc/${post.slug}`, '/tin-tuc', '/feed.xml', '/sitemap.xml', '/llms.txt']);
  return res.redirect('/admin/tin-tuc?flash=' + encodeURIComponent(published ? 'Đã xuất bản bài viết' : 'Đã chuyển bài về bản nháp'));
});

// ================= STUDY-ABROAD PROGRAMS CRUD =================
router.get('/du-hoc', requireAdmin, (req, res) => {
  const category = canonicalProgramCategory(req.query.category);
  const scopedRequest = { query: { ...req.query, category } };
  const result = listContent('programs', scopedRequest, 'sort_order ASC, datetime(updated_at) DESC, id ASC');
  const active = category === SCHOOL_CATEGORY ? 'schools' : 'programs';
  res.render('admin/programs-list', { layout, title: active === 'schools' ? 'Quản lý thông tin trường' : 'Quản lý chương trình du học', active, programs: result.rows, categories: result.categories, filters: result.filters, pagination: result.pagination, flash: req.query.flash || null });
});

router.get('/du-hoc/moi', requireAdmin, (req, res) => {
  const category = canonicalProgramCategory(req.query.category);
  res.render('admin/programs-form', { layout, title: category === SCHOOL_CATEGORY ? 'Thêm thông tin trường' : 'Thêm chương trình du học', active: category === SCHOOL_CATEGORY ? 'schools' : 'programs', mode: 'create', program: { category, cover: 'p1', published: 1, sort_order: 0 }, error: null });
});

router.post('/du-hoc/moi', requireAdmin, uploadCover, (req, res) => {
  const b = req.body;
  const category = canonicalProgramCategory(b.category);
  const isSchool = category === SCHOOL_CATEGORY;
  const back = (error) => res.render('admin/programs-form', { layout, title: isSchool ? 'Thêm thông tin trường' : 'Thêm chương trình du học', active: isSchool ? 'schools' : 'programs', mode: 'create', program: { ...b, category }, error });
  if (req.uploadError) return back(req.uploadError);
  if (!b.title || !b.title.trim()) { if (req.file) removeUpload('/uploads/' + req.file.filename); return back('Vui lòng nhập tên chương trình.'); }
  const slug = uniqueSlug(db, b.slug && b.slug.trim() ? slugify(b.slug) : slugify(b.title), 0, 'programs');
  const coverImage = req.file ? '/uploads/' + req.file.filename : null;
  const result = db.prepare(`INSERT INTO programs (title,subtitle,slug,excerpt,content,category,cover,cover_image,author_name,author_role,author_url,source_urls,seo_title,meta_description,focus_keyword,noindex,sort_order,published,created_at,updated_at)
              VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now','localtime'),datetime('now','localtime'))`)
    .run(b.title.trim(), (b.subtitle||'').trim(), slug, (b.excerpt||'').trim(), sanitizeRichHtml(b.content), category, b.cover||'p1', coverImage, (b.author_name||'').trim(), (b.author_role||'').trim(), normalizeOptionalUrl(b.author_url), normalizeSourceUrls(b.source_urls), (b.seo_title||'').trim(), (b.meta_description||'').trim(), (b.focus_keyword||'').trim(), isEnabled(b.noindex) ? 1 : 0, parseInt(b.sort_order||'0',10)||0, isEnabled(b.published) ? 1 : 0);
  if (isEnabled(b.published)) finalizePublishedContent('program', result.lastInsertRowid, { notify: true });
  if (isEnabled(b.published) && !isEnabled(b.noindex)) queueIndexNow([programPublicPath({ category, slug }), category === SCHOOL_CATEGORY ? '/truong-dai-hoc' : '/du-hoc', '/feed.xml', '/sitemap.xml', '/llms.txt']);
  res.redirect(programAdminUrl(category, isSchool ? 'Đã thêm thông tin trường' : 'Đã thêm chương trình'));
});

router.get('/du-hoc/:id/sua', requireAdmin, (req, res, next) => {
  const program = db.prepare('SELECT * FROM programs WHERE id = ?').get(req.params.id);
  if (!program) return next();
  program.category = canonicalProgramCategory(program.category);
  const isSchool = program.category === SCHOOL_CATEGORY;
  res.render('admin/programs-form', { layout, title: isSchool ? 'Sửa thông tin trường' : 'Sửa chương trình du học', active: isSchool ? 'schools' : 'programs', mode: 'edit', program, error: null });
});

router.post('/du-hoc/:id/sua', requireAdmin, uploadCover, (req, res, next) => {
  const existing = db.prepare('SELECT * FROM programs WHERE id = ?').get(req.params.id);
  if (!existing) { if (req.file) removeUpload('/uploads/' + req.file.filename); return next(); }
  const b = req.body;
  const category = canonicalProgramCategory(b.category || existing.category);
  const isSchool = category === SCHOOL_CATEGORY;
  const back = (error) => res.render('admin/programs-form', { layout, title: isSchool ? 'Sửa thông tin trường' : 'Sửa chương trình du học', active: isSchool ? 'schools' : 'programs', mode: 'edit', program: { ...existing, ...b, category }, error });
  if (req.uploadError) return back(req.uploadError);
  if (!b.title || !b.title.trim()) { if (req.file) removeUpload('/uploads/' + req.file.filename); return back('Vui lòng nhập tên chương trình.'); }
  const slug = uniqueSlug(db, b.slug && b.slug.trim() ? slugify(b.slug) : slugify(b.title), existing.id, 'programs');
  let coverImage = existing.cover_image;
  if (b.remove_cover === '1' && existing.cover_image) { removeUpload(existing.cover_image); coverImage = null; }
  if (req.file) { if (existing.cover_image) removeUpload(existing.cover_image); coverImage = '/uploads/' + req.file.filename; }
  db.prepare(`UPDATE programs SET title=?, subtitle=?, slug=?, excerpt=?, content=?, category=?, cover=?, cover_image=?, author_name=?, author_role=?, author_url=?, source_urls=?, seo_title=?, meta_description=?, focus_keyword=?, noindex=?, sort_order=?, published=?, updated_at=datetime('now','localtime') WHERE id=?`)
    .run(b.title.trim(), (b.subtitle||'').trim(), slug, (b.excerpt||'').trim(), sanitizeRichHtml(b.content), category, b.cover||'p1', coverImage, (b.author_name||'').trim(), (b.author_role||'').trim(), normalizeOptionalUrl(b.author_url), normalizeSourceUrls(b.source_urls), (b.seo_title||'').trim(), (b.meta_description||'').trim(), (b.focus_keyword||'').trim(), isEnabled(b.noindex) ? 1 : 0, parseInt(b.sort_order||'0',10)||0, isEnabled(b.published) ? 1 : 0, existing.id);
  if (req.file || b.remove_cover === '1') {
    db.prepare("UPDATE programs SET cover_source_url='', cover_attribution='' WHERE id=?").run(existing.id);
  }
  finalizePublishedContent('program', existing.id, { notify: isEnabled(b.published) });
  queueIndexNow([programPublicPath(existing), programPublicPath({ category, slug }), '/du-hoc', '/truong-dai-hoc', '/feed.xml', '/sitemap.xml', '/llms.txt']);
  res.redirect(programAdminUrl(category, isSchool ? 'Đã cập nhật thông tin trường' : 'Đã cập nhật chương trình'));
});

router.post('/du-hoc/:id/xoa', requireAdmin, (req, res) => {
  const program = db.prepare('SELECT slug, cover_image, category FROM programs WHERE id = ?').get(req.params.id);
  if (program && program.cover_image) removeUpload(program.cover_image);
  db.prepare('DELETE FROM programs WHERE id = ?').run(req.params.id);
  removePublishedContent('program', req.params.id);
  if (program) queueIndexNow([programPublicPath(program), program.category === SCHOOL_CATEGORY ? '/truong-dai-hoc' : '/du-hoc', '/feed.xml', '/sitemap.xml', '/llms.txt']);
  res.redirect(programAdminUrl(program?.category, program && canonicalProgramCategory(program.category) === SCHOOL_CATEGORY ? 'Đã xoá thông tin trường' : 'Đã xoá chương trình'));
});

router.post('/du-hoc/:id/toggle', requireAdmin, (req, res, next) => {
  const program = db.prepare('SELECT id,slug,category,published,noindex FROM programs WHERE id=?').get(req.params.id);
  if (!program) return next();
  const published = program.published ? 0 : 1;
  db.prepare("UPDATE programs SET published=?, noindex=CASE WHEN ?=1 THEN 0 ELSE noindex END, updated_at=datetime('now','localtime') WHERE id=?").run(published, published, program.id);
  finalizePublishedContent('program', program.id, { notify: published === 1 });
  queueIndexNow([programPublicPath(program), program.category === SCHOOL_CATEGORY ? '/truong-dai-hoc' : '/du-hoc', '/feed.xml', '/sitemap.xml', '/llms.txt']);
  return res.redirect(programAdminUrl(program.category, published ? 'Đã xuất bản nội dung' : 'Đã chuyển nội dung về bản nháp'));
});

// ---------- Language course CRUD ----------
router.get('/khoa-hoc', requireAdmin, (req, res) => {
  const courses = db.prepare('SELECT * FROM courses ORDER BY sort_order ASC,name ASC').all();
  res.render('admin/courses-list', { layout, title: 'Quản lý khóa học', active: 'courses', courses, flash: req.query.flash || null });
});
router.get('/khoa-hoc/moi', requireAdmin, (req, res) => res.render('admin/course-form', {
  layout, title: 'Thêm khóa học', active: 'courses', mode: 'create',
  course: { language: 'Tiếng Hàn', published: 0, sort_order: 0, financials: {}, requirements: {} }, error: null,
}));
router.post('/khoa-hoc/moi', requireAdmin, (req, res) => {
  const b = req.body;
  if (!String(b.name || '').trim()) return res.status(400).render('admin/course-form', { layout, title: 'Thêm khóa học', active: 'courses', mode: 'create', course: { ...b, financials: {}, requirements: {} }, error: 'Vui lòng nhập tên khóa học.' });
  const slug = uniqueCourseSlug(slugify(b.slug || b.name));
  const financials = { priceVndTotal: b.price_vnd_total === '' ? null : (Number(b.price_vnd_total) || null), priceNote: String(b.price_note || '').trim() };
  const { language, requirements } = courseRequirementInput(b);
  db.prepare(`INSERT INTO courses (id,slug,name,bluf_summary,audience,description,price,language,financials_json,requirements_json,sort_order,published,last_updated)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(slug, slug, b.name.trim(), String(b.bluf_summary || '').trim(), String(b.audience || '').trim(), String(b.description || '').trim(), String(b.price || '').trim(), language, JSON.stringify(financials), JSON.stringify(requirements), Number(b.sort_order) || 0, isEnabled(b.published) ? 1 : 0, String(b.last_updated || '').slice(0, 10));
  if (isEnabled(b.published)) finalizePublishedContent('course', slug, { notify: true });
  if (isEnabled(b.published)) queueIndexNow([`/khoa-hoc/${slug}`, '/khoa-hoc', '/sitemap.xml', '/llms.txt']);
  res.redirect('/admin/khoa-hoc?flash=' + encodeURIComponent('Đã thêm khóa học'));
});
router.get('/khoa-hoc/:id/sua', requireAdmin, (req, res, next) => {
  const row = db.prepare('SELECT * FROM courses WHERE id=?').get(req.params.id); if (!row) return next();
  let financials = {}; let requirements = {};
  try { financials = JSON.parse(row.financials_json || '{}'); } catch (_) {}
  try { requirements = JSON.parse(row.requirements_json || '{}'); } catch (_) {}
  res.render('admin/course-form', { layout, title: 'Sửa khóa học', active: 'courses', mode: 'edit', course: { ...row, financials, requirements }, error: null });
});
router.post('/khoa-hoc/:id/sua', requireAdmin, (req, res, next) => {
  const row = db.prepare('SELECT * FROM courses WHERE id=?').get(req.params.id); if (!row) return next();
  const b = req.body; if (!String(b.name || '').trim()) return res.redirect(`/admin/khoa-hoc/${row.id}/sua`);
  const slug = uniqueCourseSlug(slugify(b.slug || b.name), row.id);
  const financials = { priceVndTotal: b.price_vnd_total === '' ? null : (Number(b.price_vnd_total) || null), priceNote: String(b.price_note || '').trim() };
  const { language, requirements } = courseRequirementInput(b);
  db.prepare(`UPDATE courses SET slug=?,name=?,bluf_summary=?,audience=?,description=?,price=?,language=?,financials_json=?,requirements_json=?,sort_order=?,published=?,last_updated=?,updated_at=datetime('now','localtime') WHERE id=?`)
    .run(slug, b.name.trim(), String(b.bluf_summary || '').trim(), String(b.audience || '').trim(), String(b.description || '').trim(), String(b.price || '').trim(), language, JSON.stringify(financials), JSON.stringify(requirements), Number(b.sort_order) || 0, isEnabled(b.published) ? 1 : 0, String(b.last_updated || '').slice(0, 10), row.id);
  finalizePublishedContent('course', row.id, { notify: isEnabled(b.published) });
  queueIndexNow([`/khoa-hoc/${row.slug}`, `/khoa-hoc/${slug}`, '/khoa-hoc', '/sitemap.xml', '/llms.txt']);
  res.redirect('/admin/khoa-hoc?flash=' + encodeURIComponent('Đã cập nhật khóa học'));
});
router.post('/khoa-hoc/:id/toggle', requireAdmin, (req, res, next) => {
  const row = db.prepare('SELECT id,slug,published FROM courses WHERE id=?').get(req.params.id); if (!row) return next();
  db.prepare("UPDATE courses SET published=?,updated_at=datetime('now','localtime') WHERE id=?").run(row.published ? 0 : 1, row.id);
  finalizePublishedContent('course', row.id, { notify: !row.published });
  queueIndexNow([`/khoa-hoc/${row.slug}`, '/khoa-hoc', '/sitemap.xml', '/llms.txt']);
  res.redirect('/admin/khoa-hoc?flash=' + encodeURIComponent(row.published ? 'Đã ẩn khóa học' : 'Đã xuất bản khóa học'));
});
router.post('/khoa-hoc/:id/xoa', requireAdmin, (req, res) => {
  const row = db.prepare('SELECT slug FROM courses WHERE id=?').get(req.params.id); db.prepare('DELETE FROM courses WHERE id=?').run(req.params.id);
  removePublishedContent('course', req.params.id);
  if (row) queueIndexNow([`/khoa-hoc/${row.slug}`, '/khoa-hoc', '/sitemap.xml', '/llms.txt']);
  res.redirect('/admin/khoa-hoc?flash=' + encodeURIComponent('Đã xóa khóa học'));
});

// ---------- Student testimonials ----------
function testimonialInitials(name, preferred) {
  const explicit = String(preferred || '').trim().replace(/\s+/g, '').slice(0, 3).toUpperCase();
  if (explicit) return explicit;
  return String(name || '').trim().split(/\s+/u).filter(Boolean).slice(-2).map((part) => part[0]).join('').toUpperCase().slice(0, 3) || 'SD';
}
router.get('/cam-nhan', requireAdmin, (req, res) => {
  const testimonials = db.prepare('SELECT * FROM testimonials ORDER BY sort_order ASC,id ASC').all();
  res.render('admin/testimonials-list', { layout, title: 'Cảm nhận học viên', active: 'testimonials', testimonials, flash: req.query.flash || null });
});
router.get('/cam-nhan/moi', requireAdmin, (req, res) => res.render('admin/testimonial-form', {
  layout, title: 'Thêm cảm nhận học viên', active: 'testimonials', mode: 'create', testimonial: { rating: 5, published: 1, sort_order: 0 }, error: null,
}));
router.post('/cam-nhan/moi', requireAdmin, uploadAvatar, (req, res) => {
  const b = req.body;
  if (!String(b.name || '').trim() || !String(b.quote || '').trim()) {
    if (req.file) removeUpload(`/uploads/${req.file.filename}`);
    return res.status(400).render('admin/testimonial-form', { layout, title: 'Thêm cảm nhận học viên', active: 'testimonials', mode: 'create', testimonial: b, error: 'Vui lòng nhập tên và nội dung cảm nhận.' });
  }
  const avatar = req.file ? `/uploads/${req.file.filename}` : '';
  db.prepare(`INSERT INTO testimonials (name,role,quote,avatar_image,initials,rating,sort_order,published)
    VALUES (?,?,?,?,?,?,?,?)`).run(b.name.trim().slice(0, 160), String(b.role || '').trim().slice(0, 200), b.quote.trim().slice(0, 3000), avatar, testimonialInitials(b.name, b.initials), Math.min(5, Math.max(1, Number(b.rating) || 5)), Number(b.sort_order) || 0, isEnabled(b.published) ? 1 : 0);
  return res.redirect('/admin/cam-nhan?flash=' + encodeURIComponent(req.uploadError || 'Đã thêm cảm nhận học viên'));
});
router.get('/cam-nhan/:id/sua', requireAdmin, (req, res, next) => {
  const testimonial = db.prepare('SELECT * FROM testimonials WHERE id=?').get(req.params.id); if (!testimonial) return next();
  return res.render('admin/testimonial-form', { layout, title: 'Sửa cảm nhận học viên', active: 'testimonials', mode: 'edit', testimonial, error: null });
});
router.post('/cam-nhan/:id/sua', requireAdmin, uploadAvatar, (req, res, next) => {
  const existing = db.prepare('SELECT * FROM testimonials WHERE id=?').get(req.params.id); if (!existing) return next();
  const b = req.body;
  if (!String(b.name || '').trim() || !String(b.quote || '').trim()) {
    if (req.file) removeUpload(`/uploads/${req.file.filename}`);
    return res.status(400).render('admin/testimonial-form', { layout, title: 'Sửa cảm nhận học viên', active: 'testimonials', mode: 'edit', testimonial: { ...existing, ...b }, error: 'Vui lòng nhập tên và nội dung cảm nhận.' });
  }
  const avatar = req.file ? `/uploads/${req.file.filename}` : (isEnabled(b.remove_avatar) ? '' : existing.avatar_image);
  db.prepare(`UPDATE testimonials SET name=?,role=?,quote=?,avatar_image=?,initials=?,rating=?,sort_order=?,published=?,updated_at=datetime('now','localtime') WHERE id=?`)
    .run(b.name.trim().slice(0, 160), String(b.role || '').trim().slice(0, 200), b.quote.trim().slice(0, 3000), avatar, testimonialInitials(b.name, b.initials), Math.min(5, Math.max(1, Number(b.rating) || 5)), Number(b.sort_order) || 0, isEnabled(b.published) ? 1 : 0, existing.id);
  if ((req.file || isEnabled(b.remove_avatar)) && existing.avatar_image && existing.avatar_image !== avatar) removeUpload(existing.avatar_image);
  return res.redirect('/admin/cam-nhan?flash=' + encodeURIComponent(req.uploadError || 'Đã cập nhật cảm nhận học viên'));
});
router.post('/cam-nhan/:id/toggle', requireAdmin, (req, res, next) => {
  const row = db.prepare('SELECT id,published FROM testimonials WHERE id=?').get(req.params.id); if (!row) return next();
  db.prepare("UPDATE testimonials SET published=?,updated_at=datetime('now','localtime') WHERE id=?").run(row.published ? 0 : 1, row.id);
  return res.redirect('/admin/cam-nhan?flash=' + encodeURIComponent(row.published ? 'Đã ẩn cảm nhận' : 'Đã hiển thị cảm nhận'));
});
router.post('/cam-nhan/:id/xoa', requireAdmin, (req, res) => {
  const row = db.prepare('SELECT avatar_image FROM testimonials WHERE id=?').get(req.params.id);
  db.prepare('DELETE FROM testimonials WHERE id=?').run(req.params.id);
  if (row) removeUpload(row.avatar_image);
  return res.redirect('/admin/cam-nhan?flash=' + encodeURIComponent('Đã xóa cảm nhận học viên'));
});

// ---------- FAQ: automatic suggestions remain fully editable ----------
const FAQ_CATEGORIES = ['Du học', 'Đào tạo tiếng', 'Thông tin sinh hoạt tại Hàn Quốc', 'Thông tin trường'];
router.get('/faq', requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT * FROM faqs ORDER BY category, sort_order, id').all();
  res.render('admin/faq-list', { layout, title: 'Quản lý FAQ', active: 'faq', faqs: rows, categories: FAQ_CATEGORIES, flash: req.query.flash || null });
});
router.get('/faq/moi', requireAdmin, (req, res) => res.render('admin/faq-form', { layout, title: 'Thêm FAQ', active: 'faq', mode: 'create', faq: { category: FAQ_CATEGORIES[0], published: 0, sort_order: 0 }, categories: FAQ_CATEGORIES, error: null }));
router.post('/faq/moi', requireAdmin, (req, res) => {
  const b = req.body; const category = FAQ_CATEGORIES.includes(b.category) ? b.category : FAQ_CATEGORIES[0];
  if (!String(b.question || '').trim() || !String(b.answer || '').trim()) return res.status(400).render('admin/faq-form', { layout, title: 'Thêm FAQ', active: 'faq', mode: 'create', faq: b, categories: FAQ_CATEGORIES, error: 'Vui lòng nhập câu hỏi và câu trả lời.' });
  db.prepare('INSERT INTO faqs (category,question,answer,source_url,sort_order,published,generated) VALUES (?,?,?,?,?,?,0)').run(category, b.question.trim(), b.answer.trim(), normalizeOptionalUrl(b.source_url), Number(b.sort_order) || 0, isEnabled(b.published) ? 1 : 0);
  if (isEnabled(b.published)) queueIndexNow(['/cau-hoi-thuong-gap', '/sitemap.xml', '/llms.txt']);
  res.redirect('/admin/faq?flash=' + encodeURIComponent('Đã thêm FAQ'));
});
router.get('/faq/:id/sua', requireAdmin, (req, res, next) => {
  const faq = db.prepare('SELECT * FROM faqs WHERE id=?').get(req.params.id); if (!faq) return next();
  res.render('admin/faq-form', { layout, title: 'Sửa FAQ', active: 'faq', mode: 'edit', faq, categories: FAQ_CATEGORIES, error: null });
});
router.post('/faq/:id/sua', requireAdmin, (req, res, next) => {
  const faq = db.prepare('SELECT * FROM faqs WHERE id=?').get(req.params.id); if (!faq) return next();
  const b = req.body; const category = FAQ_CATEGORIES.includes(b.category) ? b.category : FAQ_CATEGORIES[0];
  if (!String(b.question || '').trim() || !String(b.answer || '').trim()) return res.status(400).render('admin/faq-form', { layout, title: 'Sửa FAQ', active: 'faq', mode: 'edit', faq: { ...faq, ...b }, categories: FAQ_CATEGORIES, error: 'Vui lòng nhập câu hỏi và câu trả lời.' });
  db.prepare("UPDATE faqs SET category=?,question=?,answer=?,source_url=?,sort_order=?,published=?,generated=0,updated_at=datetime('now','localtime') WHERE id=?").run(category, b.question.trim(), b.answer.trim(), normalizeOptionalUrl(b.source_url), Number(b.sort_order) || 0, isEnabled(b.published) ? 1 : 0, faq.id);
  queueIndexNow(['/cau-hoi-thuong-gap', '/sitemap.xml', '/llms.txt']);
  res.redirect('/admin/faq?flash=' + encodeURIComponent('Đã cập nhật FAQ'));
});
router.post('/faq/:id/toggle', requireAdmin, (req, res, next) => { const faq = db.prepare('SELECT id,published FROM faqs WHERE id=?').get(req.params.id); if (!faq) return next(); db.prepare("UPDATE faqs SET published=?,updated_at=datetime('now','localtime') WHERE id=?").run(faq.published ? 0 : 1, faq.id); queueIndexNow(['/cau-hoi-thuong-gap', '/sitemap.xml', '/llms.txt']); res.redirect('/admin/faq?flash=' + encodeURIComponent('Đã đổi trạng thái FAQ')); });
router.post('/faq/:id/xoa', requireAdmin, (req, res) => { db.prepare('DELETE FROM faqs WHERE id=?').run(req.params.id); queueIndexNow(['/cau-hoi-thuong-gap', '/sitemap.xml', '/llms.txt']); res.redirect('/admin/faq?flash=' + encodeURIComponent('Đã xóa FAQ')); });

// ---------- Homepage proof-point statistics ----------
router.get('/so-lieu-trang-chu', requireAdmin, (req, res) => {
  const stats = db.prepare('SELECT * FROM homepage_stats ORDER BY sort_order,id').all();
  const sourceNote = db.prepare("SELECT value FROM system_meta WHERE key='homepage_stats_source'").get()?.value || '';
  res.render('admin/homepage-stats', {
    layout, title: 'Số liệu trang chủ', active: 'homepage-stats', stats, sourceNote,
    flash: req.query.flash || null, error: req.query.error || null,
  });
});
router.post('/so-lieu-trang-chu/moi', requireAdmin, (req, res) => {
  try {
    const item = homepageStatInput(req.body);
    db.prepare(`INSERT INTO homepage_stats
      (value_number,prefix,suffix,label,sort_order,active) VALUES (?,?,?,?,?,1)`)
      .run(item.valueNumber, item.prefix, item.suffix, item.label, item.sortOrder);
    queueIndexNow(['/']);
    return res.redirect('/admin/so-lieu-trang-chu?flash=' + encodeURIComponent('Đã thêm mục số liệu'));
  } catch (error) {
    return res.redirect('/admin/so-lieu-trang-chu?error=' + encodeURIComponent(error.message));
  }
});
router.post('/so-lieu-trang-chu/ghi-chu', requireAdmin, (req, res) => {
  const note = String(req.body.source_note || '').trim().slice(0, 500);
  db.prepare(`INSERT INTO system_meta (key,value,updated_at) VALUES ('homepage_stats_source',?,datetime('now','localtime'))
    ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at`).run(note);
  queueIndexNow(['/']);
  return res.redirect('/admin/so-lieu-trang-chu?flash=' + encodeURIComponent('Đã cập nhật ghi chú số liệu'));
});
router.post('/so-lieu-trang-chu/:id/sua', requireAdmin, (req, res, next) => {
  const existing = db.prepare('SELECT id FROM homepage_stats WHERE id=?').get(req.params.id);
  if (!existing) return next();
  try {
    const item = homepageStatInput(req.body);
    db.prepare(`UPDATE homepage_stats SET value_number=?,prefix=?,suffix=?,label=?,sort_order=?,updated_at=datetime('now','localtime') WHERE id=?`)
      .run(item.valueNumber, item.prefix, item.suffix, item.label, item.sortOrder, existing.id);
    queueIndexNow(['/']);
    return res.redirect('/admin/so-lieu-trang-chu?flash=' + encodeURIComponent('Đã cập nhật mục số liệu'));
  } catch (error) {
    return res.redirect('/admin/so-lieu-trang-chu?error=' + encodeURIComponent(error.message));
  }
});
router.post('/so-lieu-trang-chu/:id/toggle', requireAdmin, (req, res, next) => {
  const row = db.prepare('SELECT id,active FROM homepage_stats WHERE id=?').get(req.params.id);
  if (!row) return next();
  db.prepare("UPDATE homepage_stats SET active=?,updated_at=datetime('now','localtime') WHERE id=?").run(row.active ? 0 : 1, row.id);
  queueIndexNow(['/']);
  return res.redirect('/admin/so-lieu-trang-chu?flash=' + encodeURIComponent(row.active ? 'Đã ẩn mục số liệu' : 'Đã hiển thị mục số liệu'));
});
router.post('/so-lieu-trang-chu/:id/xoa', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM homepage_stats WHERE id=?').run(req.params.id);
  queueIndexNow(['/']);
  return res.redirect('/admin/so-lieu-trang-chu?flash=' + encodeURIComponent('Đã xóa mục số liệu'));
});

// ---------- Editable introduction sections ----------
router.get('/gioi-thieu', requireAdmin, (req, res) => {
  res.render('admin/about-list', {
    layout, title: 'Giới thiệu website', active: 'about',
    homeSections: getAboutSections('home', { includeInactive: true }),
    pageSections: getAboutSections('page', { includeInactive: true }),
    flash: req.query.flash || null,
  });
});

router.get('/gioi-thieu/moi', requireAdmin, (req, res) => {
  res.render('admin/about-form', {
    layout, title: 'Thêm phần giới thiệu', active: 'about', mode: 'create',
    section: { location: req.query.location === 'home' ? 'home' : 'page', section_style: 'standard', sort_order: 50, active: 1 },
    error: null,
  });
});

router.post('/gioi-thieu/moi', requireAdmin, (req, res) => {
  try {
    const input = normaliseAboutSection(req.body);
    const content = sanitizeRichHtml(req.body.content);
    if (!content.replace(/<[^>]*>/g, '').trim()) throw new Error('Vui lòng nhập nội dung phần giới thiệu.');
    db.prepare(`INSERT INTO about_sections
      (location,eyebrow,title,content,section_style,sort_order,active) VALUES (?,?,?,?,?,?,?)`)
      .run(input.location, input.eyebrow, input.title, content, input.sectionStyle, input.sortOrder, isEnabled(req.body.active) ? 1 : 0);
    queueIndexNow(['/', '/gioi-thieu', '/llms.txt', '/sitemap.xml']);
    return res.redirect('/admin/gioi-thieu?flash=' + encodeURIComponent('Đã thêm phần giới thiệu'));
  } catch (error) {
    return res.status(400).render('admin/about-form', {
      layout, title: 'Thêm phần giới thiệu', active: 'about', mode: 'create', section: req.body, error: error.message,
    });
  }
});

router.get('/gioi-thieu/:id/sua', requireAdmin, (req, res, next) => {
  const section = db.prepare('SELECT * FROM about_sections WHERE id=?').get(req.params.id);
  if (!section) return next();
  return res.render('admin/about-form', { layout, title: 'Sửa phần giới thiệu', active: 'about', mode: 'edit', section, error: null });
});

router.post('/gioi-thieu/:id/sua', requireAdmin, (req, res, next) => {
  const existing = db.prepare('SELECT * FROM about_sections WHERE id=?').get(req.params.id);
  if (!existing) return next();
  try {
    const input = normaliseAboutSection(req.body);
    const content = sanitizeRichHtml(req.body.content);
    if (!content.replace(/<[^>]*>/g, '').trim()) throw new Error('Vui lòng nhập nội dung phần giới thiệu.');
    db.prepare(`UPDATE about_sections SET location=?,eyebrow=?,title=?,content=?,section_style=?,sort_order=?,active=?,updated_at=datetime('now','localtime') WHERE id=?`)
      .run(input.location, input.eyebrow, input.title, content, input.sectionStyle, input.sortOrder, isEnabled(req.body.active) ? 1 : 0, existing.id);
    queueIndexNow(['/', '/gioi-thieu', '/llms.txt', '/sitemap.xml']);
    return res.redirect('/admin/gioi-thieu?flash=' + encodeURIComponent('Đã cập nhật phần giới thiệu'));
  } catch (error) {
    return res.status(400).render('admin/about-form', {
      layout, title: 'Sửa phần giới thiệu', active: 'about', mode: 'edit', section: { ...existing, ...req.body }, error: error.message,
    });
  }
});

router.post('/gioi-thieu/:id/toggle', requireAdmin, (req, res, next) => {
  const section = db.prepare('SELECT id,active FROM about_sections WHERE id=?').get(req.params.id);
  if (!section) return next();
  db.prepare("UPDATE about_sections SET active=?,updated_at=datetime('now','localtime') WHERE id=?").run(section.active ? 0 : 1, section.id);
  queueIndexNow(['/', '/gioi-thieu', '/llms.txt']);
  return res.redirect('/admin/gioi-thieu?flash=' + encodeURIComponent(section.active ? 'Đã ẩn phần giới thiệu' : 'Đã hiển thị phần giới thiệu'));
});

router.post('/gioi-thieu/:id/xoa', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM about_sections WHERE id=?').run(req.params.id);
  queueIndexNow(['/', '/gioi-thieu', '/llms.txt']);
  return res.redirect('/admin/gioi-thieu?flash=' + encodeURIComponent('Đã xóa phần giới thiệu'));
});

// ---------- Official-source research and AI-assisted drafts ----------
router.get('/nghien-cuu', requireAdmin, (req, res) => {
  const sources = db.prepare('SELECT * FROM research_sources ORDER BY id').all();
  const activeSources = sources.filter((source) => source.active);
  const sourceHealth = {
    total: activeSources.length,
    readable: activeSources.filter((source) => source.last_crawled_at && !source.last_error).length,
    blocked: activeSources.filter((source) => /robots\.txt|không cho phép thu thập/i.test(source.last_error || '')).length,
    failed: activeSources.filter((source) => source.last_error && !/robots\.txt|không cho phép thu thập/i.test(source.last_error)).length,
  };
  const items = db.prepare(`SELECT i.id,i.source_id,i.title,i.url,i.excerpt,i.published_at,i.suggested_section,
    i.quality_score,i.optimization_note,i.official_url,i.published_post_id,i.published_program_id,i.status,
    i.source_captured_at,length(i.source_text) source_text_chars,i.created_at,i.updated_at,
    s.name source_name,s.source_type
    FROM research_items i JOIN research_sources s ON s.id=i.source_id
    ORDER BY CASE i.status WHEN 'pending' THEN 0 WHEN 'converted' THEN 1 ELSE 2 END, datetime(i.created_at) DESC LIMIT 100`).all();
  const suggestedKeywords = req.session.researchKeywordSuggestions || [];
  delete req.session.researchKeywordSuggestions;
  const chatIndex = {
    ...getIndexStats(),
    publishedPosts: db.prepare('SELECT COUNT(*) c FROM posts WHERE published=1').get().c,
    indexedPosts: db.prepare("SELECT COUNT(*) c FROM chat_knowledge_documents WHERE id GLOB 'post:*:summary'").get().c,
    publishedPrograms: db.prepare('SELECT COUNT(*) c FROM programs WHERE published=1').get().c,
    indexedPrograms: db.prepare("SELECT COUNT(*) c FROM chat_knowledge_documents WHERE id GLOB 'program:*:summary'").get().c,
  };
  res.render('admin/research', { layout, title: 'Dữ liệu & AI', active: 'research', sources, sourceHealth, items, suggestedKeywords, chatIndex, flash: req.query.flash || null });
});
router.post('/nghien-cuu/lap-chi-muc', requireAdmin, (req, res) => {
  try {
    const result = syncWebsiteKnowledge({ force: true });
    return res.redirect('/admin/nghien-cuu?flash=' + encodeURIComponent(`Đã lập lại chỉ mục chatbot: ${result.documents} đoạn dữ liệu và ${result.questions} câu hỏi gợi ý`));
  } catch (error) {
    return res.redirect('/admin/nghien-cuu?flash=' + encodeURIComponent(`Không thể lập chỉ mục chatbot: ${error.message}`));
  }
});
router.post('/nghien-cuu/de-xuat-tu-khoa', requireAdmin, async (req, res) => {
  const sourceNames = db.prepare('SELECT name FROM research_sources WHERE active=1').all().map((row) => row.name).join(', ');
  req.session.researchKeywordSuggestions = await suggestResearchKeywords(sourceNames);
  res.redirect('/admin/nghien-cuu?flash=' + encodeURIComponent('Đã tạo danh sách từ khóa gợi ý; hãy chọn và bổ sung vào nguồn phù hợp'));
});
router.post('/nghien-cuu/chay', requireAdmin, async (req, res) => {
  try { const result = await runResearchBot({ sourceId: Number(req.body.source_id) || undefined }); const added = result.reduce((sum, row) => sum + (row.added || 0), 0); const published = result.reduce((sum, row) => sum + (row.autoPublished || 0), 0); res.redirect('/admin/nghien-cuu?flash=' + encodeURIComponent(`Đã kiểm tra nguồn: thêm ${added} mục, tự xuất bản ${published} cẩm nang, bổ sung ${result.coverImagesUpdated || 0} ảnh bài viết và ${result.universityCoverImagesUpdated || 0} ảnh trường`)); }
  catch (error) { res.redirect('/admin/nghien-cuu?flash=' + encodeURIComponent(`Không thể kiểm tra nguồn: ${error.message}`)); }
});
router.post('/nghien-cuu/nguon', requireAdmin, (req, res) => {
  try {
    const url = new URL(String(req.body.url || '')); if (url.protocol !== 'https:') throw new Error('URL phải dùng HTTPS');
    db.prepare('INSERT INTO research_sources (name,url,source_type,language,keywords,active,crawl_delay_ms,auto_publish_non_school) VALUES (?,?,?,?,?,1,?,?)').run(String(req.body.name || url.hostname).trim().slice(0, 160), url.toString(), String(req.body.source_type || 'official').slice(0, 60), String(req.body.language || 'vi').slice(0, 20), String(req.body.keywords || '').slice(0, 2000), Math.min(15000, Math.max(0, Number(req.body.crawl_delay_ms) || 0)), isEnabled(req.body.auto_publish_non_school) ? 1 : 0);
    res.redirect('/admin/nghien-cuu?flash=' + encodeURIComponent('Đã thêm nguồn chính thức'));
  } catch (error) { res.redirect('/admin/nghien-cuu?flash=' + encodeURIComponent(`Không thể thêm nguồn: ${error.message}`)); }
});
router.post('/nghien-cuu/nguon/:id/toggle', requireAdmin, (req, res, next) => { const row = db.prepare('SELECT id,active FROM research_sources WHERE id=?').get(req.params.id); if (!row) return next(); db.prepare("UPDATE research_sources SET active=?,updated_at=datetime('now','localtime') WHERE id=?").run(row.active ? 0 : 1, row.id); res.redirect('/admin/nghien-cuu?flash=' + encodeURIComponent('Đã đổi trạng thái nguồn')); });
router.post('/nghien-cuu/nguon/:id/tu-khoa', requireAdmin, (req, res, next) => { const row = db.prepare('SELECT id FROM research_sources WHERE id=?').get(req.params.id); if (!row) return next(); db.prepare("UPDATE research_sources SET keywords=?,crawl_delay_ms=?,auto_publish_non_school=?,updated_at=datetime('now','localtime') WHERE id=?").run(String(req.body.keywords || '').slice(0, 4000), Math.min(15000, Math.max(0, Number(req.body.crawl_delay_ms) || 0)), isEnabled(req.body.auto_publish_non_school) ? 1 : 0, row.id); res.redirect('/admin/nghien-cuu?flash=' + encodeURIComponent('Đã cập nhật từ khóa, độ trễ và chế độ tự đăng')); });
router.post('/nghien-cuu/:id/bo-qua', requireAdmin, (req, res, next) => { const row = db.prepare('SELECT id FROM research_items WHERE id=?').get(req.params.id); if (!row) return next(); db.prepare("UPDATE research_items SET status='dismissed',updated_at=datetime('now','localtime') WHERE id=?").run(row.id); res.redirect('/admin/nghien-cuu?flash=' + encodeURIComponent('Đã bỏ qua mục này')); });
router.post('/nghien-cuu/:id/website-truong', requireAdmin, (req, res, next) => {
  const row = db.prepare('SELECT id FROM research_items WHERE id=?').get(req.params.id); if (!row) return next();
  const officialUrl = String(req.body.official_url || '').trim();
  let officialProtocol = '';
  try { officialProtocol = officialUrl ? new URL(officialUrl).protocol : ''; } catch (_) { officialProtocol = 'invalid:'; }
  if (officialUrl && (officialProtocol !== 'https:' || !isOfficialUniversityUrl(officialUrl))) {
    return res.redirect('/admin/nghien-cuu?flash=' + encodeURIComponent('Website trường phải là URL HTTPS chính thức thuộc tên miền .ac.kr'));
  }
  db.prepare("UPDATE research_items SET official_url=?,optimization_note=?,updated_at=datetime('now','localtime') WHERE id=?")
    .run(officialUrl, officialUrl ? 'Đã lưu website chính thức do quản trị viên xác nhận; bot sẽ dùng URL này ở lần tạo hồ sơ tiếp theo.' : 'Đã xóa website trường đã nhập; bot sẽ tự tìm lại.', row.id);
  return res.redirect('/admin/nghien-cuu?flash=' + encodeURIComponent(officialUrl ? 'Đã lưu website chính thức của trường' : 'Đã xóa website trường'));
});
router.post('/nghien-cuu/:id/tao-ban-nhap', requireAdmin, async (req, res, next) => {
  const item = db.prepare(`SELECT i.*,s.name source_name,s.url source_url,s.source_type,s.crawl_delay_ms FROM research_items i JOIN research_sources s ON s.id=i.source_id WHERE i.id=?`).get(req.params.id); if (!item) return next();
  try {
    const page = await buildEditorialSource(item, item);
    const isUniversityProfile = item.suggested_section === SCHOOL_CATEGORY
      || item.source_type === 'university-directory';
    const discoverySummary = page.discovery
      ? `Đã đọc ${page.discovery.pagesRead} trang chính thức, tìm ${page.discovery.attachments} tệp; nhóm dữ liệu: ${Object.entries(page.discovery.coverage || {}).map(([key, value]) => `${key} ${value}`).join(', ')}.${page.discovery.governmentDirectoryFallback ? ' Website trường hiện không phản hồi; dữ liệu tạm thời lấy từ hồ sơ chính phủ Study in Korea và bắt buộc đối chiếu lại trước khi xuất bản.' : ''}`
      : '';
    if (isUniversityProfile && discoverySummary) db.prepare("UPDATE research_items SET optimization_note=?,updated_at=datetime('now','localtime') WHERE id=?").run(discoverySummary, item.id);
    const draftInput = {
      title: item.title, sourceUrl: page.url, sourceUrls: page.sourceUrls || [page.url], sourceText: page.text,
      sourceClassification: page.classification,
      section: item.suggested_section, sourceFaqs: page.faqs || [], sourceAttachments: page.attachments || [],
    };
    const draft = isUniversityProfile
      ? await generateUniversityProfileDraft(draftInput)
      : await generateEditorialDraft(draftInput);
    if (isUniversityProfile && (!draft.aiAvailable || !universityDraftCoverage(draft))) {
      throw new Error(draft.aiError || 'Nguồn hoặc AI chưa tạo được hồ sơ trường đầy đủ; mục vẫn được giữ trong hàng chờ.');
    }
    if (!isUniversityProfile && !draft.aiAvailable) {
      throw new Error(draft.aiError || 'AI chưa tạo được bản dịch đầy đủ; mục vẫn được giữ trong hàng chờ.');
    }
    let fetchedCover = await coverImageForPage(page);
    let externalCover = null;
    if (!fetchedCover && isUniversityProfile) {
      externalCover = await searchExternalUniversityCover({ title: draft.title, subtitle: draft.subtitle });
      fetchedCover = externalCover?.cachedImageUrl || '';
    }
    const isStudyProgram = item.suggested_section === STUDY_CATEGORY || draft.category === STUDY_CATEGORY;
    const target = isUniversityProfile || isStudyProgram || req.body.target === 'program' ? 'programs' : 'posts';
    const sourceUrls = normalizeSourceUrls((page.sourceUrls || [page.url]).join('\n'));
    const transactionResult = db.transaction(() => {
      const relatedGuides = [];
      if (target === 'programs') {
        for (const guide of (draft.relatedGuides || [])) {
          let record = db.prepare("SELECT id,slug FROM posts WHERE published=0 AND lower(title)=lower(?) ORDER BY id DESC LIMIT 1").get(guide.title);
          if (!record) {
            const guideSlug = uniqueSlug(db, slugify(guide.title), 0, 'posts');
            const guideResult = db.prepare(`INSERT INTO posts (title,slug,excerpt,content,category,cover_image,source_urls,seo_title,meta_description,focus_keyword,published,noindex,created_at,updated_at)
              VALUES (?,?,?,?,?,'',?,?,?,?,0,0,datetime('now','localtime'),datetime('now','localtime'))`)
              .run(guide.title, guideSlug, guide.excerpt, sanitizeRichHtml(guide.content), 'Cẩm nang du học', normalizeSourceUrls(guide.sourceUrl), guide.seoTitle, guide.metaDescription, guide.focusKeyword);
            const guideId = Number(guideResult.lastInsertRowid);
            db.prepare('UPDATE posts SET cover_image=? WHERE id=?').run(`/anh-cam-nang/${guideId}.svg`, guideId);
            record = { id: guideId, slug: guideSlug };
          }
          relatedGuides.push({ ...record, title: guide.title });
        }
      }
      const relatedMarkup = relatedGuides.length
        ? `<h2>Cẩm nang liên quan đến trường</h2><ul>${relatedGuides.map((guide) => `<li><a href="/tin-tuc/${guide.slug}">${guide.title}</a></li>`).join('')}</ul>`
        : '';
      const draftContent = sanitizeRichHtml(`${draft.content}${attachmentMarkup(draft.attachments, page.url)}${relatedMarkup}`);
      const slug = uniqueSlug(db, slugify(draft.title), 0, target);
      let result;
      if (target === 'programs') {
        const programCategory = isUniversityProfile ? SCHOOL_CATEGORY : STUDY_CATEGORY;
        result = db.prepare(`INSERT INTO programs (title,subtitle,slug,excerpt,content,category,cover_image,source_urls,seo_title,meta_description,focus_keyword,published,noindex,created_at,updated_at)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,0,0,datetime('now','localtime'),datetime('now','localtime'))`)
          .run(draft.title, draft.subtitle || '', slug, draft.excerpt, draftContent, programCategory, fetchedCover || '', sourceUrls, draft.seoTitle, draft.metaDescription, draft.focusKeyword);
        const programId = Number(result.lastInsertRowid);
        if (!fetchedCover) db.prepare('UPDATE programs SET cover_image=? WHERE id=?').run(`/anh-truong/${programId}.svg`, programId);
        if (externalCover) db.prepare('UPDATE programs SET cover_source_url=?,cover_attribution=? WHERE id=?')
          .run(externalCover.sourceUrl, externalCover.attribution, programId);
      } else {
        result = db.prepare(`INSERT INTO posts (title,slug,excerpt,content,category,cover_image,source_urls,seo_title,meta_description,focus_keyword,published,noindex,created_at,updated_at)
          VALUES (?,?,?,?,?,?,?,?,?,?,0,0,datetime('now','localtime'),datetime('now','localtime'))`)
          .run(draft.title, slug, draft.excerpt, draftContent, draft.category, fetchedCover || '', sourceUrls, draft.seoTitle, draft.metaDescription, draft.focusKeyword);
        const postId = Number(result.lastInsertRowid);
        if (!fetchedCover) db.prepare('UPDATE posts SET cover_image=? WHERE id=?').run(`/anh-cam-nang/${postId}.svg`, postId);
      }
      const originId = Number(result.lastInsertRowid);
      const faqCategory = isUniversityProfile ? SCHOOL_CATEGORY : 'Du học';
      const originType = target === 'programs' ? 'program' : 'post';
      const insertFaq = db.prepare('INSERT INTO faqs (category,question,answer,source_url,sort_order,published,generated,origin_type,origin_id) VALUES (?,?,?,?,0,0,1,?,?)');
      (draft.faqs || []).forEach((faq) => insertFaq.run(faqCategory, String(faq.question).slice(0, 300), String(faq.answer).slice(0, 2000), page.url, originType, String(originId)));
      if (target === 'programs') {
        db.prepare("UPDATE research_items SET status='converted',published_program_id=?,published_post_id=NULL,optimization_note=?,updated_at=datetime('now','localtime') WHERE id=?")
          .run(originId, `${discoverySummary} ${isUniversityProfile ? 'Đã tạo hồ sơ trường chuyên sâu' : 'Đã tạo bản nháp chương trình du học'}; đang chờ quản trị viên duyệt.`.trim(), item.id);
      } else {
        db.prepare("UPDATE research_items SET status='converted',published_post_id=?,published_program_id=NULL,optimization_note='Đã tạo bản nháp tiếng Việt; đang chờ quản trị viên duyệt.',updated_at=datetime('now','localtime') WHERE id=?").run(originId, item.id);
      }
      return { id: originId, target };
    })();
    const editor = transactionResult.target === 'programs' ? `/admin/du-hoc/${transactionResult.id}/sua` : `/admin/tin-tuc/${transactionResult.id}/sua`;
    res.redirect(`${editor}?ai=${draft.aiAvailable ? '1' : '0'}`);
  } catch (error) {
    db.prepare("UPDATE research_items SET status='pending',optimization_note=?,updated_at=datetime('now','localtime') WHERE id=?")
      .run(`Chưa tạo bản nháp: ${String(error.message || error).slice(0, 420)}`, item.id);
    res.redirect('/admin/nghien-cuu?flash=' + encodeURIComponent(`Chưa tạo bản nháp: ${error.message}`));
  }
});

// ---------- Pop-up management ----------
router.get('/popup', requireAdmin, (req, res) => res.render('admin/popup-list', { layout, title: 'Quản lý pop-up', active: 'popup', popups: db.prepare('SELECT * FROM popups ORDER BY id DESC').all(), flash: req.query.flash || null }));
router.get('/popup/moi', requireAdmin, (req, res) => res.render('admin/popup-form', { layout, title: 'Tạo pop-up', active: 'popup', mode: 'create', popup: { placement: 'sitewide', delay_seconds: 3, show_once: 1, active: 0 }, error: null }));
function popupImage(value) { const url = String(value || '').trim(); return /^(?:https:\/\/[^\s]+|\/uploads\/[\w.-]+)$/i.test(url) ? url : ''; }
function savePopup(req, res, existing) {
  const b = req.body; if (!String(b.title || '').trim()) return res.status(400).render('admin/popup-form', { layout, title: existing ? 'Sửa pop-up' : 'Tạo pop-up', active: 'popup', mode: existing ? 'edit' : 'create', popup: { ...existing, ...b }, error: 'Vui lòng nhập tiêu đề.' });
  const isLeadCapture = existing?.system_key === 'lead_capture';
  const placement = isLeadCapture ? 'content' : (['sitewide','home','content'].includes(b.placement) ? b.placement : 'sitewide');
  const values = [b.title.trim(), sanitizeRichHtml(b.content), popupImage(b.image_url), String(b.button_text || '').trim().slice(0, 80), normalizeOptionalUrl(b.button_url) || (/^\/[\w\-/]*$/.test(b.button_url || '') ? b.button_url : ''), placement, Math.min(60, Math.max(0, Number(b.delay_seconds) || 0)), isEnabled(b.show_once) ? 1 : 0, isEnabled(b.active) ? 1 : 0, String(b.starts_at || '').slice(0, 19).replace('T', ' '), String(b.ends_at || '').slice(0, 19).replace('T', ' ')];
  if (existing) db.prepare("UPDATE popups SET title=?,content=?,image_url=?,button_text=?,button_url=?,placement=?,delay_seconds=?,show_once=?,active=?,starts_at=?,ends_at=?,updated_at=datetime('now','localtime') WHERE id=?").run(...values, existing.id);
  else db.prepare('INSERT INTO popups (title,content,image_url,button_text,button_url,placement,delay_seconds,show_once,active,starts_at,ends_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)').run(...values);
  return res.redirect('/admin/popup?flash=' + encodeURIComponent(existing ? 'Đã cập nhật pop-up' : 'Đã tạo pop-up'));
}
router.post('/popup/moi', requireAdmin, (req, res) => savePopup(req, res, null));
router.get('/popup/:id/sua', requireAdmin, (req, res, next) => { const popup = db.prepare('SELECT * FROM popups WHERE id=?').get(req.params.id); if (!popup) return next(); res.render('admin/popup-form', { layout, title: 'Sửa pop-up', active: 'popup', mode: 'edit', popup, error: null }); });
router.post('/popup/:id/sua', requireAdmin, (req, res, next) => { const popup = db.prepare('SELECT * FROM popups WHERE id=?').get(req.params.id); if (!popup) return next(); return savePopup(req, res, popup); });
router.post('/popup/:id/toggle', requireAdmin, (req, res, next) => { const row = db.prepare('SELECT id,active FROM popups WHERE id=?').get(req.params.id); if (!row) return next(); db.prepare("UPDATE popups SET active=?,updated_at=datetime('now','localtime') WHERE id=?").run(row.active ? 0 : 1, row.id); res.redirect('/admin/popup?flash=' + encodeURIComponent('Đã đổi trạng thái pop-up')); });
router.post('/popup/:id/xoa', requireAdmin, (req, res, next) => {
  const popup = db.prepare('SELECT id,system_key FROM popups WHERE id=?').get(req.params.id);
  if (!popup) return next();
  if (popup.system_key) return res.redirect('/admin/popup?flash=' + encodeURIComponent('Pop-up đăng ký hệ thống không thể xóa; bạn có thể tắt nó.'));
  db.prepare('DELETE FROM popups WHERE id=?').run(popup.id);
  return res.redirect('/admin/popup?flash=' + encodeURIComponent('Đã xóa pop-up'));
});

// ---------- Hotline contact requests ----------
router.get('/lien-he', requireAdmin, (req, res) => {
  const leads = db.prepare('SELECT * FROM leads ORDER BY CASE status WHEN \'new\' THEN 0 ELSE 1 END, datetime(created_at) DESC LIMIT 300').all();
  const leadGroups = [
    { key: 'study_abroad', title: 'Tư vấn chương trình du học', rows: leads.filter((lead) => lead.lead_type === 'study_abroad') },
    { key: 'course', title: 'Tư vấn khóa học', rows: leads.filter((lead) => !lead.lead_type || lead.lead_type === 'course') },
    { key: 'school_info', title: 'Đăng ký nhận thông tin trường', rows: leads.filter((lead) => lead.lead_type === 'school_info') },
  ];
  res.render('admin/leads', { layout, title: 'Yêu cầu liên hệ', active: 'leads', leads, leadGroups, flash: req.query.flash || null });
});
router.post('/lien-he/:id/status', requireAdmin, (req, res, next) => { const row = db.prepare('SELECT id FROM leads WHERE id=?').get(req.params.id); if (!row) return next(); const status = ['new','contacted','closed'].includes(req.body.status) ? req.body.status : 'contacted'; db.prepare("UPDATE leads SET status=?,updated_at=datetime('now','localtime') WHERE id=?").run(status, row.id); res.redirect('/admin/lien-he?flash=' + encodeURIComponent('Đã cập nhật yêu cầu')); });

module.exports = router;
