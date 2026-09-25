'use strict';

const crypto = require('crypto');

const APPROVED_BOT_PATTERN = new RegExp([
  'Googlebot', 'GoogleOther', 'Google-InspectionTool', 'AdsBot-Google',
  'bingbot', 'BingPreview', 'DuckDuckBot',
  'GPTBot', 'OAI-SearchBot', 'ChatGPT-User',
  'PerplexityBot', 'Perplexity-User',
  'ClaudeBot', 'Claude-SearchBot', 'Claude-User',
  'Applebot', 'Applebot-Extended',
  'Yeti', 'NaverBot',
  'facebookexternalhit', 'Facebot', 'Twitterbot', 'LinkedInBot',
].join('|'), 'i');

const AUTOMATION_TOOL_PATTERN = /(?:curl|wget|python-requests|python-urllib|scrapy|aiohttp|httpclient|go-http-client|okhttp|libwww-perl|httpunit|postmanruntime|headlesschrome|phantomjs|selenium|puppeteer|playwright|node-fetch|undici|httrack)/i;
const GENERIC_BOT_PATTERN = /(?:bot\b|spider|crawler|crawl\b|scraper|archiver|harvest|extractor|slurp)/i;
const PUBLIC_FILE_PATTERN = /\.(?:css|js|mjs|png|jpe?g|gif|webp|avif|svg|ico|woff2?|ttf|map|mp4|webm|mov|m4v)$/i;

function classifyUserAgent(value) {
  const userAgent = String(value || '').trim().slice(0, 500);
  if (!userAgent) return 'missing';
  if (APPROVED_BOT_PATTERN.test(userAgent)) return 'approved-bot';
  if (AUTOMATION_TOOL_PATTERN.test(userAgent) || GENERIC_BOT_PATTERN.test(userAgent)) return 'blocked-bot';
  return 'browser';
}

function isPublicDocumentRequest(req) {
  if (!['GET', 'HEAD'].includes(req.method)) return false;
  if (req.path === '/healthz' || req.path.startsWith('/admin') || req.path.startsWith('/api/')) return false;
  return !PUBLIC_FILE_PATTERN.test(req.path);
}

function isLoopback(value) {
  const ip = String(value || '').replace(/^::ffff:/, '');
  return ip === '127.0.0.1' || ip === '::1';
}

function createBotProtection({
  enabled = process.env.BOT_PROTECTION_ENABLED !== '0',
  windowMs = 10 * 60 * 1000,
  pageLimit = Number(process.env.BOT_PAGE_LIMIT_10_MIN || 120),
  now = () => Date.now(),
  secret = process.env.BOT_PROTECTION_SECRET || process.env.SESSION_SECRET || 'soldream-bot-protection',
} = {}) {
  const requestBuckets = new Map();
  const limit = Math.max(10, Number(pageLimit) || 120);

  function fingerprint(value) {
    return crypto.createHmac('sha256', secret).update(String(value || 'unknown')).digest('hex');
  }

  return function botProtection(req, res, next) {
    if (!enabled || !isPublicDocumentRequest(req)) return next();
    const userAgentType = classifyUserAgent(req.get('user-agent'));
    if (userAgentType === 'approved-bot') return next();

    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    if (!isLoopback(ip) && (userAgentType === 'missing' || userAgentType === 'blocked-bot')) {
      res.set('Cache-Control', 'no-store');
      res.set('X-Robots-Tag', 'noindex, nofollow');
      return res.status(403).type('text/plain').send('Truy cập tự động không được phép.');
    }

    if (isLoopback(ip)) return next();
    const currentTime = now();
    const key = fingerprint(ip);
    const recent = (requestBuckets.get(key) || []).filter((time) => currentTime - time < windowMs);
    if (recent.length >= limit) {
      requestBuckets.set(key, recent);
      res.set('Retry-After', String(Math.ceil(windowMs / 1000)));
      res.set('Cache-Control', 'no-store');
      return res.status(429).type('text/plain').send('Bạn đang mở quá nhiều trang. Vui lòng thử lại sau ít phút.');
    }
    recent.push(currentTime);
    requestBuckets.set(key, recent);

    if (requestBuckets.size > 2000) {
      for (const [bucketKey, times] of requestBuckets) {
        if (!times.some((time) => currentTime - time < windowMs)) requestBuckets.delete(bucketKey);
      }
    }
    return next();
  };
}

module.exports = { classifyUserAgent, isPublicDocumentRequest, createBotProtection };
