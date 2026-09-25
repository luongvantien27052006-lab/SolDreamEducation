'use strict';
require('dotenv').config();
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const expressLayouts = require('express-ejs-layouts');

const db = require('./db');
const { seoDefaults, buildRobotsTxt } = require('./lib/seo');
const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');
const chatRoutes = require('./routes/chat');
const contactRoutes = require('./routes/contact');
const { syncWebsiteKnowledge } = require('./lib/websiteKnowledge');
const { startResearchScheduler } = require('./lib/researchScheduler');
const { getActivePopup, getLeadPopup } = require('./lib/sitePopup');
const { getLeadContext } = require('./lib/leadContext');
const { ensurePublicationPipeline } = require('./lib/publicationPipeline');
const { ensureStoredResearchOptimization } = require('./lib/researchBot');
const { ensureKoreaScopeCleanup } = require('./lib/koreaDataCleanup');
const SQLiteSessionStore = require('./lib/sqliteSessionStore');
const { createBotProtection } = require('./lib/botProtection');
const { startSubscriberNotificationWorker } = require('./lib/subscriberNotifier');
const { getCourses } = require('./lib/courseKnowledge');
const { repairPublishedHandbookLanguage, auditPublishedHandbooks } = require('./lib/handbookQuality');

const app = express();
app.disable('x-powered-by');
const PORT = process.env.PORT || 3000;
const ADMIN_SESSION_MINUTES = Math.min(30, Math.max(15, Number(process.env.ADMIN_SESSION_MINUTES) || 30));
const ADMIN_SESSION_MAX_AGE = ADMIN_SESSION_MINUTES * 60 * 1000;

try {
  const publicationResult = ensurePublicationPipeline();
  if (publicationResult.applied) console.log(`[content] SEO/GEO pipeline applied: ${publicationResult.items} published items, ${publicationResult.faqs} related FAQs`);
  const researchResult = ensureStoredResearchOptimization();
  if (researchResult.applied) console.log(`[research] optimized ${researchResult.optimized} stored crawl items`);
  const scopeCleanup = ensureKoreaScopeCleanup();
  if (scopeCleanup.applied) console.log(`[research] Korea-only cleanup: removed ${scopeCleanup.deletedPosts} posts, ${scopeCleanup.deletedPrograms} programs and ${scopeCleanup.deletedResearchItems} queued items`);
  const handbookRepair = repairPublishedHandbookLanguage();
  const handbookAudit = auditPublishedHandbooks();
  if (handbookRepair.updated) console.log(`[content] clarified source status in ${handbookRepair.updated} handbook posts`);
  console.log(`[content] handbook audit: ${handbookAudit.total} published, ${handbookAudit.short} short, ${handbookAudit.missingSource} without source, ${handbookAudit.vague} vague source notes`);
  const indexResult = syncWebsiteKnowledge({ force: true });
  console.log(`[chat] knowledge index ready: ${indexResult.documents} documents, ${indexResult.questions} questions`);
} catch (error) {
  console.error('[chat] knowledge index startup error:', error.message);
}

// Asset version (busts browser cache automatically whenever CSS/JS change on disk)
let ASSET_VER;
try {
  const fs = require('fs');
  const files = ['css/style.css', 'css/admin.css', 'css/chatbot.css', 'js/site.js', 'js/admin-rich-editor.js', 'js/admin-content.js', 'js/chatbot.js'];
  ASSET_VER = String(Math.floor(Math.max(...files.map((file) => fs.statSync(path.join(__dirname, 'public', file)).mtimeMs))));
} catch (e) { ASSET_VER = String(Date.now()); }

// If deployed behind a proxy (Railway, Nginx) so secure cookies / IPs work
app.set('trust proxy', 1);

// Views
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');

// Parsers
// Rich text pasted from Word/Google Docs can be substantially larger than a plain textarea.
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(express.json({ limit: '32kb' }));
app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({ error: 'Dữ liệu gửi lên chưa đúng định dạng. Bạn vui lòng thử lại nhé.' });
  }
  return next(error);
});
app.use(cookieParser());
app.use(session({
  name: 'soldream.admin.sid',
  secret: process.env.SESSION_SECRET || 'sol-dream-session-secret-change-me',
  store: new SQLiteSessionStore({ ttlMs: ADMIN_SESSION_MAX_AGE }),
  resave: false,
  saveUninitialized: false,
  rolling: true,
  unset: 'destroy',
  cookie: { httpOnly: true, sameSite: 'lax', maxAge: ADMIN_SESSION_MAX_AGE, secure: 'auto', path: '/' }
}));

// Consolidate duplicate trailing-slash URLs into one canonical URL.
app.use((req, res, next) => {
  if ((req.method === 'GET' || req.method === 'HEAD') && req.path.length > 1 && req.path.endsWith('/')) {
    const queryIndex = req.originalUrl.indexOf('?');
    const query = queryIndex >= 0 ? req.originalUrl.slice(queryIndex) : '';
    return res.redirect(301, `${req.path.replace(/\/+$/, '')}${query}`);
  }
  return next();
});

// Dynamic robots response supports BASE_URL/SITE_URL; public/robots.txt remains a deploy fallback.
app.get('/robots.txt', (req, res) => res.type('text/plain').send(buildRobotsTxt()));
app.get('/healthz', (req, res) => res.status(200).type('text/plain').send('ok'));

// Preserve approved SEO/GEO crawlers while blocking generic scrapers and abnormal bulk reads.
app.use(createBotProtection());

// Static
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '7d' }));

// Clear MIME/caching signals help crawlers and browsers process public pages consistently.
app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.set('Content-Language', 'vi-VN');
  next();
});

// ---- Visitor tracking (server-side, counts real page visits) ----
const SKIP = /^\/(admin|css|js|img|api)|\.(css|js|png|jpe?g|svg|ico|gif|webp|xml|txt|woff2?|map)$/i;
app.use((req, res, next) => {
  if (req.method === 'GET' && !SKIP.test(req.path)) {
    let vid = req.cookies.vid;
    if (!vid) {
      vid = crypto.randomUUID();
      res.cookie('vid', vid, { httpOnly: true, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 24 * 365 });
    }
    try { db.prepare('INSERT INTO page_views (path, visitor_id) VALUES (?, ?)').run(req.path.slice(0, 300), vid); }
    catch (e) { /* ignore tracking errors */ }
  }
  next();
});

// Inject SEO defaults into every render
app.use((req, res, next) => { res.locals = Object.assign({}, seoDefaults(req), { assetVer: ASSET_VER }, res.locals); next(); });
// The course dropdown is sourced from the live published catalogue so every
// Admin add/edit/hide/delete operation is reflected on the next page request.
app.use((req, res, next) => {
  res.locals.navigationCourses = getCourses();
  next();
});
app.use((req, res, next) => {
  const isPublicPage = req.method === 'GET' && !req.path.startsWith('/admin');
  res.locals.sitePopup = isPublicPage ? getActivePopup(req.path) : null;
  res.locals.leadPopup = isPublicPage ? getLeadPopup(req.path) : null;
  res.locals.leadContext = isPublicPage ? getLeadContext(req.path) : null;
  next();
});

// Routes
app.use('/admin', adminRoutes);
app.use('/api', contactRoutes);
app.use('/api', chatRoutes);
app.use('/', publicRoutes);

// 404
app.use((req, res) => {
  res.set('Cache-Control', 'no-store').status(404).render('404', {
    layout: 'layout',
    title: 'Không tìm thấy trang - SOL DREAM EDUCATION',
    description: 'Trang bạn tìm không tồn tại.',
    robots: 'noindex, follow, max-snippet:-1, max-image-preview:large'
  });
});

app.listen(PORT, () => {
  console.log(`✅ Sol Dream đang chạy tại http://localhost:${PORT}  (admin: /admin)`);
  startResearchScheduler();
  startSubscriberNotificationWorker();
});
