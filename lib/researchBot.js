'use strict';

const crypto = require('crypto');
const dns = require('dns').promises;
const fs = require('fs');
const net = require('net');
const path = require('path');
const db = require('../db');
const { slugify, uniqueSlug, parseSourceUrls } = require('./util');
const { sanitizeRichHtml } = require('./contentSanitizer');
const { generateEditorialDraft, resolveOfficialUniversityWebsite, discoverOfficialSourceItems, researchOfficialUrlViaSearch } = require('./editorialAi');
const { finalizePublishedContent } = require('./publicationPipeline');
const { queueIndexNow } = require('./indexNow');
const { isKoreaStudyRelevant, isOfficialUniversityUrl, hostname } = require('./koreaScope');
const { renderPublicPage } = require('./browserPage');

const USER_AGENT = 'SolDreamResearchBot/1.0 (+https://soldream.edu.vn/robots.txt)';
const MAX_BYTES = 2 * 1024 * 1024;
const MAX_SITEMAP_BYTES = 8 * 1024 * 1024;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_UNIVERSITY_PAGES = Math.min(60, Math.max(24, Number(process.env.RESEARCH_UNIVERSITY_MAX_PAGES || 42)));
const RESEARCH_IMAGE_DIR = path.join(__dirname, '..', 'public', 'uploads', 'research');
// Luôn dùng một tài nguyên cùng miền làm phương án cuối cùng. Trình duyệt sẽ
// không còn phải hot-link ảnh của nguồn (thường bị chặn referer hoặc hết hạn).
const DEFAULT_RESEARCH_COVER = '/img/research-cover.svg';
const THEMED_RESEARCH_COVERS = [
  '/img/research-cover-study.svg',
  '/img/research-cover-visa.svg',
  '/img/research-cover-life.svg',
  '/img/research-cover-job.svg',
  '/img/research-cover-scholarship.svg',
  '/img/research-cover-language.svg',
];
const TIMEOUT_MS = Math.max(5000, Number(process.env.RESEARCH_TIMEOUT_MS || 12000));
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const robotsCache = new Map();

function decodeHtml(value) {
  return String(value || '').replace(/&#(x?[0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code.replace(/^x/i, ''), /^x/i.test(code) ? 16 : 10)))
    .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/&lt;/gi, '<').replace(/&gt;/gi, '>');
}

function stripHtml(value) {
  return decodeHtml(String(value || '').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function fallbackCoverFor(value = '') {
  const digest = crypto.createHash('sha256').update(String(value || 'Sol Dream')).digest();
  return THEMED_RESEARCH_COVERS[digest[0] % THEMED_RESEARCH_COVERS.length] || DEFAULT_RESEARCH_COVER;
}

function isFallbackCover(value) {
  return value === DEFAULT_RESEARCH_COVER
    || THEMED_RESEARCH_COVERS.includes(String(value || ''))
    || /^\/anh-cam-nang\/\d+\.svg$/i.test(String(value || ''));
}

function isPrivateIp(address) {
  if (!net.isIP(address)) return false;
  const mapped = String(address).match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (mapped) return isPrivateIp(mapped[1]);
  if (address === '::1' || address.startsWith('fc') || address.startsWith('fd') || address.startsWith('fe80:')) return true;
  const parts = address.split('.').map(Number);
  return parts.length === 4 && (parts[0] === 10 || parts[0] === 127 || parts[0] === 0 || (parts[0] === 169 && parts[1] === 254) || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) || (parts[0] === 192 && parts[1] === 168));
}

async function validatePublicUrl(input) {
  const url = new URL(String(input));
  if (url.protocol !== 'https:' || url.username || url.password || /^(?:localhost|.+\.localhost)$/i.test(url.hostname)) throw new Error('URL nguồn phải là HTTPS công khai.');
  if (net.isIP(url.hostname) && isPrivateIp(url.hostname)) throw new Error('Không được truy cập địa chỉ nội bộ.');
  const addresses = await dns.lookup(url.hostname, { all: true });
  if (!addresses.length || addresses.some((entry) => isPrivateIp(entry.address))) throw new Error('Tên miền nguồn trỏ tới địa chỉ không an toàn.');
  return url;
}

async function fetchWithLimitsOnce(input, options = {}) {
  let url = await validatePublicUrl(input);
  for (let redirects = 0; redirects <= 4; redirects += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let response;
    try {
      response = await fetch(url, {
        method: options.method || 'GET',
        headers: { 'user-agent': USER_AGENT, accept: options.accept || 'text/html,text/plain;q=0.9', ...(options.headers || {}) },
        body: options.body, redirect: 'manual', signal: controller.signal,
      });
    }
    finally { clearTimeout(timer); }
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      if (!location) throw new Error('Nguồn chuyển hướng nhưng thiếu địa chỉ đích.');
      url = await validatePublicUrl(new URL(location, url).toString());
      continue;
    }
    if (!response.ok) throw new Error(`Nguồn trả về HTTP ${response.status}.`);
    const maxBytes = Math.max(MAX_BYTES, Number(options.maxBytes) || 0);
    const length = Number(response.headers.get('content-length') || 0);
    if (length > maxBytes) throw new Error(`Trang nguồn vượt quá giới hạn ${Math.round(maxBytes / 1024 / 1024)}MB.`);
    const contentType = response.headers.get('content-type') || '';
    if (!/text\/(?:html|plain|xml)|application\/(?:xhtml\+xml|xml|rss\+xml|atom\+xml|json)/i.test(contentType)) throw new Error('Nguồn không phải trang văn bản.');
    const text = await response.text();
    if (Buffer.byteLength(text) > maxBytes) throw new Error(`Trang nguồn vượt quá giới hạn ${Math.round(maxBytes / 1024 / 1024)}MB.`);
    return { text, url: url.toString(), contentType };
  }
  throw new Error('Nguồn chuyển hướng quá nhiều lần.');
}

async function fetchWithLimits(input, options = {}) {
  try { return await fetchWithLimitsOnce(input, options); }
  catch (error) {
    const retryDelay = Math.min(15000, Math.max(0, Number(options.retry404DelayMs) || 0));
    if (!retryDelay || !/HTTP 404/.test(String(error.message))) throw error;
    await wait(retryDelay);
    return fetchWithLimitsOnce(input, { ...options, retry404DelayMs: 0 });
  }
}

async function fetchImageWithLimits(input, referer = '') {
  let url = await validatePublicUrl(input);
  for (let redirects = 0; redirects <= 4; redirects += 1) {
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let response;
    try {
      response = await fetch(url, {
        redirect: 'manual', signal: controller.signal,
        headers: { 'user-agent': USER_AGENT, accept: 'image/avif,image/webp,image/png,image/jpeg,image/gif;q=0.9,*/*;q=0.3', ...(referer ? { referer } : {}) },
      });
    } finally { clearTimeout(timer); }
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      if (!location) throw new Error('Ảnh nguồn chuyển hướng nhưng thiếu địa chỉ đích.');
      url = await validatePublicUrl(new URL(location, url).toString()); continue;
    }
    if (!response.ok) throw new Error(`Ảnh nguồn trả về HTTP ${response.status}.`);
    const contentType = String(response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    const announced = Number(response.headers.get('content-length') || 0);
    if (announced > MAX_IMAGE_BYTES) throw new Error('Ảnh nguồn vượt quá giới hạn 8MB.');
    const chunks = []; let size = 0;
    for await (const chunk of response.body) {
      const buffer = Buffer.from(chunk); size += buffer.length;
      if (size > MAX_IMAGE_BYTES) throw new Error('Ảnh nguồn vượt quá giới hạn 8MB.');
      chunks.push(buffer);
    }
    const buffer = Buffer.concat(chunks);
    if (buffer.length < 256) throw new Error('Ảnh nguồn không hợp lệ.');
    const extension = detectImageExtension(buffer, contentType);
    if (!extension) throw new Error('Định dạng ảnh nguồn không được hỗ trợ.');
    const dimensions = readRasterDimensions(buffer, extension);
    if (dimensions && (dimensions.width < 300 || dimensions.height < 120)) {
      throw new Error(`Ảnh nguồn quá nhỏ (${dimensions.width}×${dimensions.height}px).`);
    }
    if (dimensions && dimensions.width / Math.max(1, dimensions.height) > 4.5) {
      throw new Error(`Ảnh nguồn quá dẹt (${dimensions.width}×${dimensions.height}px), không phù hợp làm ảnh bìa.`);
    }
    return { buffer, extension, url: url.toString(), ...dimensions };
  }
  throw new Error('Ảnh nguồn chuyển hướng quá nhiều lần.');
}

function detectImageExtension(buffer, contentType = '') {
  if (buffer.length >= 12 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return 'jpg';
  if (/^GIF8[79]a/.test(buffer.subarray(0, 6).toString('ascii'))) return 'gif';
  if (buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') return 'webp';
  if (buffer.subarray(4, 12).toString('ascii').includes('ftyp') && /(?:avif|avis)/.test(buffer.subarray(8, 32).toString('ascii'))) return 'avif';
  const extensions = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif', 'image/gif': 'gif' };
  return extensions[contentType] || '';
}

function readRasterDimensions(buffer, extension) {
  try {
    if (extension === 'png' && buffer.length >= 24) return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
    if (extension === 'gif' && buffer.length >= 10) return { width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8) };
    if (extension === 'jpg') {
      let offset = 2;
      while (offset + 9 < buffer.length) {
        if (buffer[offset] !== 0xff) { offset += 1; continue; }
        const marker = buffer[offset + 1];
        if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
          return { width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5) };
        }
        if (marker === 0xd8 || marker === 0xd9) { offset += 2; continue; }
        const length = buffer.readUInt16BE(offset + 2);
        if (length < 2) break;
        offset += length + 2;
      }
    }
    if (extension === 'webp' && buffer.length >= 30) {
      const type = buffer.subarray(12, 16).toString('ascii');
      if (type === 'VP8X') return { width: 1 + buffer.readUIntLE(24, 3), height: 1 + buffer.readUIntLE(27, 3) };
      if (type === 'VP8 ' && buffer[23] === 0x9d && buffer[24] === 0x01 && buffer[25] === 0x2a) {
        return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff };
      }
      if (type === 'VP8L' && buffer[20] === 0x2f) {
        const bits = buffer.readUInt32LE(21);
        return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
      }
    }
  } catch (_) { return null; }
  return null;
}

async function cacheResearchImage(imageUrl, referer = '') {
  if (!imageUrl) return '';
  const image = await fetchImageWithLimits(imageUrl, referer);
  const filename = `${crypto.createHash('sha256').update(image.url).digest('hex').slice(0, 28)}.${image.extension}`;
  await fs.promises.mkdir(RESEARCH_IMAGE_DIR, { recursive: true });
  const destination = path.join(RESEARCH_IMAGE_DIR, filename);
  try { await fs.promises.writeFile(destination, image.buffer, { flag: 'wx' }); }
  catch (error) { if (error.code !== 'EEXIST') throw error; }
  return `/uploads/research/${filename}`;
}

async function coverImageForPage(page) {
  const imageUrl = page?.media?.imageUrl || '';
  if (!imageUrl) return '';
  try { return await cacheResearchImage(imageUrl, page.url); }
  catch (error) {
    console.warn(`[research] không thể lưu ảnh ${imageUrl}: ${error.message}`);
    return '';
  }
}

async function coverImageForSource(source) {
  if (!source?.url) return '';
  const page = await fetchPageDocument(source.url, { retry404DelayMs: Number(source.crawl_delay_ms) || 5000 });
  return coverImageForPage(page);
}

const EXTERNAL_IMAGE_STOP_WORDS = new Set([
  'the', 'university', 'college', 'school', 'national', 'of', 'korea',
  'dai', 'hoc', 'quoc', 'gia', 'truong',
]);

function normalizedSearchText(value) {
  return slugify(stripHtml(value)).replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
}

function universityImageIdentityTerms(title, subtitle = '') {
  const preferred = normalizedSearchText(subtitle) || normalizedSearchText(title);
  return [...new Set(preferred.split(/\s+/)
    .filter((term) => term.length >= 4 && !EXTERNAL_IMAGE_STOP_WORDS.has(term)))];
}

function externalUniversityImageScore(candidate, school = {}) {
  const terms = universityImageIdentityTerms(school.title, school.subtitle);
  const fullName = normalizedSearchText(school.subtitle || school.title);
  const haystack = normalizedSearchText([
    candidate.title, candidate.description, candidate.sourceUrl, candidate.creator,
  ].filter(Boolean).join(' '));
  if (/\b(?:flag|logo|seal|emblem|coat of arms|map|icon|portrait)\b/i.test(`${candidate.title || ''} ${candidate.description || ''}`)) return -1;
  const matched = terms.filter((term) => haystack.includes(term));
  if (terms.length && !matched.length) return -1;
  let score = matched.length * 35;
  if (fullName.length >= 8 && haystack.includes(fullName)) score += 90;
  if (/\b(?:campus|building|hall|library|aerial|gate)\b/i.test(`${candidate.title || ''} ${candidate.description || ''}`)) score += 25;
  const width = Number(candidate.width) || 0; const height = Number(candidate.height) || 0;
  if (width >= 1200) score += 15;
  if (width && height && width / height >= 1.25 && width / height <= 2.5) score += 18;
  return score;
}

function cleanExternalAttribution(value) {
  return stripHtml(value).replace(/\s+/g, ' ').trim().slice(0, 500);
}

function parseWikimediaImageResults(payload, school = {}) {
  const pages = Object.values(payload?.query?.pages || {});
  return pages.map((page) => {
    const info = page?.imageinfo?.[0] || {};
    const meta = info.extmetadata || {};
    const license = cleanExternalAttribution(meta.LicenseShortName?.value || meta.UsageTerms?.value || '');
    return {
      provider: 'Wikimedia Commons',
      title: String(page.title || '').replace(/^File:/i, ''),
      description: cleanExternalAttribution(meta.ImageDescription?.value || meta.ObjectName?.value || ''),
      imageUrl: info.thumburl || info.url || '',
      sourceUrl: info.descriptionurl || info.descriptionshorturl || '',
      creator: cleanExternalAttribution(meta.Artist?.value || meta.Credit?.value || ''),
      license,
      width: Number(info.thumbwidth || info.width) || 0,
      height: Number(info.thumbheight || info.height) || 0,
      mime: info.mime || '',
    };
  }).filter((candidate) => candidate.imageUrl && candidate.sourceUrl && candidate.license
    && /^image\/(?:jpeg|png|webp)$/i.test(candidate.mime)
    && candidate.width >= 500 && candidate.height >= 200)
    .map((candidate) => ({ ...candidate, score: externalUniversityImageScore(candidate, school) }))
    .filter((candidate) => candidate.score >= 35)
    .sort((a, b) => b.score - a.score);
}

function parseOpenverseImageResults(payload, school = {}) {
  return (payload?.results || []).map((item) => ({
    provider: 'Openverse',
    title: item.title || '',
    description: item.description || item.tags?.map((tag) => tag.name).join(' ') || '',
    imageUrl: item.thumbnail || item.url || '',
    sourceUrl: item.foreign_landing_url || item.detail_url || '',
    creator: cleanExternalAttribution(item.creator || ''),
    license: cleanExternalAttribution([item.license, item.license_version].filter(Boolean).join(' ')),
    width: Number(item.width) || 0,
    height: Number(item.height) || 0,
    mime: item.filetype ? `image/${String(item.filetype).replace('jpg', 'jpeg')}` : '',
  })).filter((candidate) => candidate.imageUrl && candidate.sourceUrl && candidate.license
    && !/all rights reserved/i.test(candidate.license)
    && (!candidate.width || candidate.width >= 500) && (!candidate.height || candidate.height >= 200))
    .map((candidate) => ({ ...candidate, score: externalUniversityImageScore(candidate, school) }))
    .filter((candidate) => candidate.score >= 35)
    .sort((a, b) => b.score - a.score);
}

async function searchExternalUniversityCover(school = {}) {
  if (String(process.env.EXTERNAL_UNIVERSITY_IMAGE_SEARCH || 'true').toLowerCase() === 'false') return null;
  const query = String(school.subtitle || school.title || '').trim();
  if (!query) return null;
  const providers = [
    {
      name: 'Wikimedia Commons',
      url: (() => {
        const url = new URL('https://commons.wikimedia.org/w/api.php');
        Object.entries({ action: 'query', generator: 'search', gsrsearch: `${query} campus`, gsrnamespace: '6', gsrlimit: '12', prop: 'imageinfo', iiprop: 'url|mime|size|extmetadata', iiurlwidth: '1600', format: 'json', origin: '*' })
          .forEach(([key, value]) => url.searchParams.set(key, value));
        return url.toString();
      })(),
      parse: parseWikimediaImageResults,
    },
    {
      name: 'Openverse',
      url: (() => {
        const url = new URL('https://api.openverse.org/v1/images/');
        url.searchParams.set('q', `${query} campus`);
        url.searchParams.set('page_size', '20');
        url.searchParams.set('license_type', 'commercial');
        return url.toString();
      })(),
      parse: parseOpenverseImageResults,
    },
  ];
  for (const provider of providers) {
    let candidates = [];
    try {
      const result = await fetchWithLimits(provider.url, { accept: 'application/json' });
      candidates = provider.parse(JSON.parse(result.text), school);
    } catch (error) {
      console.warn(`[research] tìm ảnh ${school.title || query} qua ${provider.name} thất bại: ${error.message}`);
      continue;
    }
    for (const candidate of candidates.slice(0, 5)) {
      try {
        const cachedImageUrl = await cacheResearchImage(candidate.imageUrl, candidate.sourceUrl);
        const attribution = [candidate.creator, candidate.license, candidate.provider].filter(Boolean).join(' — ');
        return { ...candidate, cachedImageUrl, attribution };
      } catch (error) {
        console.warn(`[research] ảnh ngoài ${candidate.imageUrl} không dùng được: ${error.message}`);
      }
    }
  }
  return null;
}

function parseRobots(text, pathname) {
  const groups = [];
  let current = null;
  String(text || '').split(/\r?\n/).forEach((raw) => {
    const line = raw.replace(/#.*$/, '').trim();
    const match = line.match(/^([^:]+):\s*(.*)$/);
    if (!match) return;
    const key = match[1].trim().toLowerCase(); const value = match[2].trim();
    if (key === 'user-agent') { current = { agents: [value.toLowerCase()], rules: [] }; groups.push(current); }
    else if (current && (key === 'allow' || key === 'disallow')) current.rules.push({ type: key, path: value });
  });
  const applicable = groups.filter((group) => group.agents.some((agent) => agent === '*' || agent === 'soldreamresearchbot'));
  const rules = applicable.flatMap((group) => group.rules).filter((rule) => rule.path && pathname.startsWith(rule.path)).sort((a, b) => b.path.length - a.path.length);
  return !rules.length || rules[0].type === 'allow';
}

async function robotsAllows(url) {
  const origin = new URL(url).origin;
  const cached = robotsCache.get(origin);
  if (cached && cached.expiresAt > Date.now()) return cached.missing ? true : parseRobots(cached.text, new URL(url).pathname);
  try {
    const robotsUrl = new URL('/robots.txt', url).toString();
    const result = await fetchWithLimits(robotsUrl, { accept: 'text/plain' });
    robotsCache.set(origin, { text: result.text, missing: false, expiresAt: Date.now() + 30 * 60 * 1000 });
    return parseRobots(result.text, new URL(url).pathname);
  } catch (error) {
    if (/HTTP 404/.test(error.message)) {
      robotsCache.set(origin, { text: '', missing: true, expiresAt: Date.now() + 30 * 60 * 1000 });
      return true;
    }
    return false;
  }
}

function normalizeUrl(href, base) {
  try {
    const url = new URL(decodeHtml(href), base); url.hash = '';
    if (url.protocol !== 'https:' || url.origin !== new URL(base).origin) return '';
    ['utm_source', 'utm_medium', 'utm_campaign', 'fbclid', 'gclid'].forEach((key) => url.searchParams.delete(key));
    return url.toString();
  } catch (_) { return ''; }
}

function classifySection(text) {
  const value = String(text || '').toLowerCase();
  if (/\bchương trình\b|study program|exchange program|degree program|어학당|교육과정/.test(value)) return 'Chương trình du học';
  if (/\btrường\b|đại học|university|college|대학교|대학정보|tuyển sinh|admission|입학|모집/.test(value)) return 'Thông tin trường';
  if (/visa|thị thực|du học|học bổng|gks|유학|비자|사증|장학/.test(value)) return 'Du học Hàn Quốc';
  return 'Cẩm nang & Thông tin';
}

function requiresManualApproval(section) {
  return section === 'Thông tin trường' || section === 'Chương trình du học';
}

function normalizeExternalMedia(value, baseUrl) {
  try {
    const url = new URL(decodeHtml(value), baseUrl);
    if (url.protocol !== 'https:' || url.username || url.password) return '';
    return url.toString();
  } catch (_) { return ''; }
}

function normalizePublicHref(value, baseUrl) {
  try {
    const url = new URL(decodeHtml(value), baseUrl); url.hash = '';
    if (url.protocol !== 'https:' || url.username || url.password) return '';
    return url.toString();
  } catch (_) { return ''; }
}

function tagAttribute(tag, name) {
  const escaped = String(name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = String(tag || '').match(new RegExp(`\\b${escaped}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'));
  return decodeHtml(match ? (match[1] || match[2] || match[3] || '') : '');
}

function largestSrcsetCandidate(value) {
  const candidates = String(value || '').split(',').map((part) => {
    const pieces = part.trim().split(/\s+/); const descriptor = pieces[1] || '';
    return { value: pieces[0] || '', size: Number.parseFloat(descriptor) || 0 };
  }).filter((item) => item.value && !/^data:/i.test(item.value));
  return candidates.sort((a, b) => b.size - a.size)[0]?.value || '';
}

function imageCandidatePenalty(url, context, width, height) {
  const value = `${url} ${context}`.toLowerCase();
  if (/\b(?:spacer|tracking|pixel|blank|loading|spinner|transparent)\b/.test(value)
    || /(?:icon[-_]?flag|flag\s+of|\/flags?\/|languages\/images\/icon)/.test(value)) return 1000;
  let penalty = /\b(?:logo|favicon|sprite|icon|avatar|emblem|symbol|mark)\b/.test(value) ? 115 : 0;
  if ((width && width < 220) || (height && height < 120)) penalty += 90;
  if (width && height && width * height < 50000) penalty += 120;
  return penalty;
}

function extractJsonLdImages(html, addCandidate) {
  function addImage(value, score) {
    if (typeof value === 'string') addCandidate(value, score, 'json-ld image');
    else if (Array.isArray(value)) value.forEach((entry) => addImage(entry, score));
    else if (value && typeof value === 'object') addImage(value.url || value.contentUrl || value.thumbnailUrl, score);
  }
  function visit(value) {
    if (!value || typeof value !== 'object') return;
    if (!Array.isArray(value)) {
      addImage(value.image, 100); addImage(value.thumbnailUrl, 92);
    }
    if (Array.isArray(value)) value.forEach(visit); else Object.values(value).forEach(visit);
  }
  for (const match of String(html || '').matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { visit(JSON.parse(decodeHtml(match[1]).trim())); } catch (_) { /* Bỏ qua JSON-LD không hợp lệ. */ }
  }
}

function extractMediaFromHtml(html, baseUrl) {
  const source = String(html || '');
  const meta = (property) => {
    const patterns = [
      new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'),
      new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`, 'i'),
    ];
    for (const pattern of patterns) { const match = source.match(pattern); if (match) return normalizeExternalMedia(match[1], baseUrl); }
    return '';
  };
  const imageCandidates = []; const seenImages = new Set();
  function addImage(raw, score, context = '', width = 0, height = 0) {
    if (!String(raw || '').trim()) return;
    const url = normalizeExternalMedia(raw, baseUrl);
    if (!url || seenImages.has(url) || /^data:/i.test(url)) return;
    const penalty = imageCandidatePenalty(url, context, Number(width) || 0, Number(height) || 0);
    if (penalty >= 1000) return;
    seenImages.add(url); imageCandidates.push({ url, score: score - penalty });
  }
  // Ảnh nằm trong nội dung bài thường riêng cho từng tin. Open Graph của
  // nhiều cổng thông tin chỉ là ảnh đại diện dùng chung cho toàn website.
  addImage(meta('og:image(?::secure_url)?'), 84, 'open graph cover');
  addImage(meta('twitter:image(?::src)?'), 80, 'twitter cover');
  extractJsonLdImages(source, addImage);
  for (const link of source.match(/<link\b[^>]*\brel\s*=\s*["'][^"']*(?:image_src|preload)[^"']*["'][^>]*>/gi) || []) {
    if (/\b(?:as\s*=\s*["']image["']|image_src)\b/i.test(link)) addImage(tagAttribute(link, 'href'), 91, link);
  }
  function collectImages(fragment, baseScore) {
    for (const tag of String(fragment || '').match(/<img\b[^>]*>/gi) || []) {
      const context = `${tagAttribute(tag, 'alt')} ${tagAttribute(tag, 'title')} ${tagAttribute(tag, 'class')} ${tagAttribute(tag, 'id')}`;
      const width = Number.parseInt(tagAttribute(tag, 'width'), 10) || 0; const height = Number.parseInt(tagAttribute(tag, 'height'), 10) || 0;
      const values = [largestSrcsetCandidate(tagAttribute(tag, 'srcset') || tagAttribute(tag, 'data-srcset')), tagAttribute(tag, 'data-original'), tagAttribute(tag, 'data-lazy-src'), tagAttribute(tag, 'data-src'), tagAttribute(tag, 'src')];
      values.forEach((value, index) => addImage(value, baseScore - index * 2, context, width, height));
    }
  }
  for (const match of source.matchAll(/<article\b[^>]*>([\s\S]*?)<\/article>/gi)) collectImages(match[1], 124);
  for (const match of source.matchAll(/<main\b[^>]*>([\s\S]*?)<\/main>/gi)) collectImages(match[1], 108);
  collectImages(source, 62);
  for (const match of source.matchAll(/background(?:-image)?\s*:\s*url\(\s*["']?([^"')]+)["']?\s*\)/gi)) addImage(match[1], 68, 'background image');
  const imageUrl = imageCandidates.sort((a, b) => b.score - a.score)[0]?.url || '';
  const videoTag = source.match(/<(?:video|source)\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/i);
  const videoUrl = meta('og:video(?::url)?') || (videoTag ? normalizeExternalMedia(videoTag[1], baseUrl) : '');
  return { imageUrl, videoUrl };
}

function extractFaqsFromHtml(html) {
  const output = []; const seen = new Set();
  function visit(value) {
    if (!value || typeof value !== 'object') return;
    const types = Array.isArray(value['@type']) ? value['@type'] : [value['@type']];
    if (types.includes('Question')) {
      const question = stripHtml(value.name || value.headline || '');
      const answer = stripHtml(value.acceptedAnswer?.text || value.suggestedAnswer?.text || '');
      const key = question.toLocaleLowerCase('vi');
      if (question.length >= 8 && answer.length >= 20 && !seen.has(key)) { seen.add(key); output.push({ question, answer }); }
    }
    if (Array.isArray(value)) value.forEach(visit);
    else Object.values(value).forEach(visit);
  }
  for (const match of String(html || '').matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { visit(JSON.parse(decodeHtml(match[1]).trim())); } catch (_) { /* Bỏ qua JSON-LD không hợp lệ. */ }
  }
  return output;
}

function extractAttachmentsFromHtml(html, baseUrl) {
  const output = []; const seen = new Set();
  const baseHost = hostname(baseUrl);
  const pattern = /<a\b([^>]*?)href\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))([^>]*)>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = pattern.exec(String(html || '')))) {
    const rawHref = match[2] || match[3] || match[4];
    const url = normalizePublicHref(String(rawHref || '').replace(/^http:/i, 'https:'), baseUrl);
    const title = stripHtml(match[6] || tagAttribute(`${match[1]} ${match[5]}`, 'title'));
    if (!url || hostname(url) !== baseHost || seen.has(url)) continue;
    const value = `${url} ${title}`.toLowerCase();
    const pathname = new URL(url).pathname;
    if (!/\.(?:pdf|docx?|xlsx?|pptx?|hwp|hwpx|zip)$/i.test(pathname)
      && !/(?:download|filedown|atchfile|attachment|bbsfile|file_no|fileid)/i.test(value)) continue;
    seen.add(url);
    output.push({ url, title: (title || decodeURIComponent(new URL(url).pathname.split('/').pop() || 'Tệp đính kèm')).slice(0, 240) });
  }
  return output;
}

function extractOfficialUniversityWebsite(html, baseUrl) {
  const candidates = [];
  const pattern = /<a\b([^>]*?)href\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))([^>]*)>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = pattern.exec(String(html || '')))) {
    const rawHref = match[2] || match[3] || match[4];
    const url = normalizePublicHref(String(rawHref || '').replace(/^http:/i, 'https:'), baseUrl);
    if (!url || !isOfficialUniversityUrl(url)) continue;
    const label = stripHtml(match[6]);
    let score = 20;
    if (/official|homepage|website|대학\s*홈페이지|학교\s*홈페이지|홈페이지/i.test(label)) score += 80;
    if (/international|global|admission|입학|유학생/i.test(`${label} ${url}`)) score += 25;
    candidates.push({ url, score });
  }
  for (const match of String(html || '').matchAll(/https?:\/\/[\w.-]+\.ac\.kr(?:\/[\w./?=&%+~-]*)?/gi)) {
    const url = normalizePublicHref(match[0].replace(/^http:/i, 'https:'), baseUrl);
    if (url && isOfficialUniversityUrl(url)) candidates.push({ url, score: 35 });
  }
  return candidates.sort((a, b) => b.score - a.score)[0]?.url || '';
}

function extractClientRedirect(html, baseUrl) {
  const source = String(html || '');
  const candidates = [];
  const meta = source.match(/<meta\b[^>]*http-equiv\s*=\s*["']?refresh["']?[^>]*content\s*=\s*["'][^"']*?url\s*=\s*([^"';>\s]+)[^"']*["']/i)
    || source.match(/<meta\b[^>]*content\s*=\s*["'][^"']*?url\s*=\s*([^"';>\s]+)[^"']*["'][^>]*http-equiv\s*=\s*["']?refresh["']?/i);
  if (meta?.[1]) candidates.push(meta[1]);
  for (const match of source.matchAll(/(?:window\.)?location(?:\.href)?\s*=\s*["']([^"']+)["']/gi)) candidates.push(match[1]);
  for (const match of source.matchAll(/(?:window\.)?location\.replace\(\s*["']([^"']+)["']\s*\)/gi)) candidates.push(match[1]);
  const family = universityDomainFamily(baseUrl);
  return candidates.map((candidate) => normalizePublicHref(candidate, baseUrl))
    .find((candidate) => candidate && isOfficialUniversityUrl(candidate) && universityDomainFamily(candidate) === family) || '';
}

function universityDomainFamily(input) {
  const host = hostname(input); const labels = host.split('.').filter(Boolean);
  return labels.slice(-(host.endsWith('.ac.kr') ? 3 : 2)).join('.');
}

function universityResourceKind(value) {
  let decoded = String(value || '');
  try { decoded = decodeURIComponent(decoded); } catch (_) { /* Một số CMS để ký tự % thô trong nhãn hoặc URL. */ }
  const text = decoded.toLocaleLowerCase('en-US');
  if (/(?:notice|news|announcement|board|bbs|press|공지|새소식|알림|입학소식|입학공지)/i.test(text)) return 'notice';
  if (/(?:admission|apply|application|entrance|recruit|guideline|calendar|tuyển\s*sinh|입학|모집|전형|지원)/i.test(text)) return 'admission';
  if (/(?:department|major|faculty|college|academics?|curriculum|course|ngành|khoa|chuyên\s*ngành|학과|전공|학부|대학원|교육과정)/i.test(text)) return 'academics';
  if (/(?:tuition|fee|scholarship|financial|học\s*phí|học\s*bổng|등록금|학비|장학)/i.test(text)) return 'finance';
  if (/(?:dorm|housing|campus\s*life|student\s*life|ký\s*túc|기숙사|생활관|학생생활)/i.test(text)) return 'housing';
  if (/(?:international|global|foreign|overseas|exchange|유학생|외국인|국제|교환)/i.test(text)) return 'international';
  if (/(?:korean\s*language|language\s*center|language\s*institute|tiếng\s*hàn|한국어|어학당|언어교육)/i.test(text)) return 'language';
  if (/(?:contact|location|directions|address|liên\s*hệ|địa\s*chỉ|연락처|오시는길|캠퍼스맵)/i.test(text)) return 'contact';
  if (/(?:about|overview|introduction|history|organization|president|giới\s*thiệu|대학소개|학교소개|연혁|조직)/i.test(text)) return 'overview';
  if (/(?:download|reference|archive|자료실|서식|다운로드)/i.test(text)) return 'documents';
  return 'other';
}

function universityResourceScore(value, kind = universityResourceKind(value), contextKind = '') {
  const priorities = { notice: 150, admission: 140, academics: 125, finance: 115, international: 110, language: 105, housing: 100, contact: 90, overview: 85, documents: 80, other: 25 };
  let text = String(value || '');
  try { text = decodeURIComponent(text); } catch (_) { /* Giữ nguyên URL/nhãn CMS không mã hóa hợp lệ. */ }
  let score = priorities[kind] || priorities.other;
  if (contextKind === 'notice' && /(?:view|read|article|detail|idx|seq|no=|nttId|bbs)/i.test(text)) score += 45;
  const years = [...text.matchAll(/20(\d{2})/g)].map((match) => Number(`20${match[1]}`));
  const newest = years.length ? Math.max(...years) : 0;
  if (newest) score += Math.max(-20, 30 - Math.abs(new Date().getFullYear() - newest) * 10);
  if (/(?:\/en\/|\/eng\/|english)/i.test(text)) score += 4;
  return score;
}

function extractUniversityResourceCandidates(html, baseUrl, contextKind = '') {
  const family = universityDomainFamily(baseUrl); const output = []; const seen = new Set();
  const pattern = /<a\b([^>]*?)href\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))([^>]*)>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = pattern.exec(String(html || '')))) {
    const url = normalizePublicHref(match[2] || match[3] || match[4], baseUrl);
    const attributes = `${match[1]} ${match[5]}`;
    const label = stripHtml(match[6]) || tagAttribute(attributes, 'aria-label') || tagAttribute(attributes, 'title');
    const targetHost = hostname(url);
    if (!url || (!targetHost.endsWith(`.${family}`) && targetHost !== family) || !isOfficialUniversityUrl(url) || seen.has(url)) continue;
    const value = `${label} ${url}`; const kind = universityResourceKind(value);
    const looksLikeNoticeDetail = contextKind === 'notice' && label.length >= 4
      && /(?:view|read|article|detail|idx|seq|no=|nttId|bbs|board)/i.test(url);
    if (kind === 'other' && !looksLikeNoticeDetail) continue;
    if (/\.(?:pdf|docx?|xlsx?|pptx?|hwp|hwpx|zip)(?:$|[?#])/i.test(url)) continue;
    seen.add(url); output.push({ url, label: label.slice(0, 240), kind: looksLikeNoticeDetail ? 'notice' : kind, score: universityResourceScore(value, looksLikeNoticeDetail ? 'notice' : kind, contextKind) });
    if (output.length >= 120) break;
  }
  return output.sort((left, right) => right.score - left.score);
}

function extractUniversityResourceLinks(html, baseUrl, contextKind = '') {
  return extractUniversityResourceCandidates(html, baseUrl, contextKind).map((entry) => entry.url);
}

function extractCandidates(html, baseUrl, keywords = '') {
  const terms = String(keywords).split(',').map((term) => term.trim().toLowerCase()).filter((term) => term.length > 1);
  const results = []; const seen = new Set();
  const pattern = /<a\b([^>]*?)href\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))([^>]*)>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = pattern.exec(String(html || '')))) {
    const title = stripHtml(match[6]); const url = normalizeUrl(match[2] || match[3] || match[4], baseUrl);
    if (!url || title.length < 8 || title.length > 240 || seen.has(url)) continue;
    const haystack = `${title} ${decodeURIComponent(url)}`.toLowerCase();
    if (terms.length && !terms.some((term) => haystack.includes(term))) continue;
    seen.add(url); results.push({ title, url, excerpt: '', publishedAt: '', suggestedSection: classifySection(haystack) });
    if (results.length >= 60) break;
  }
  return results;
}

function extractPageTitle(html) {
  const source = String(html || '');
  const patterns = [
    /<meta[^>]+(?:property|name)=["']og:title["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']og:title["']/i,
    /<h1\b[^>]*>([\s\S]*?)<\/h1>/i,
    /<title\b[^>]*>([\s\S]*?)<\/title>/i,
  ];
  for (const pattern of patterns) {
    const match = source.match(pattern);
    const title = stripHtml(match?.[1] || '').replace(/\s+/g, ' ').trim();
    if (title.length >= 2) return title.slice(0, 220);
  }
  return '';
}

// Some official portals publish a complete guide on the landing page itself
// instead of linking to a separate article. Convert only explicitly marked
// guide sources into a candidate; generic home/news pages remain link-only.
function sourcePageCandidate(html, pageUrl, source = {}) {
  if (source.source_type !== 'official-guide') return null;
  const text = stripHtml(html);
  if (text.length < 350) return null;
  const pageTitle = extractPageTitle(html);
  if (/^(?:home|trang chủ|main|news|news\s*&\s*notices)$/i.test(pageTitle)) return null;
  const title = pageTitle.length >= 8 ? pageTitle : stripHtml(source.name || 'Cẩm nang du học Hàn Quốc');
  if (!title) return null;
  const terms = String(source.keywords || '').split(',').map((term) => term.trim().toLocaleLowerCase()).filter((term) => term.length > 1);
  const haystack = `${title} ${text.slice(0, 20000)}`.toLocaleLowerCase();
  if (terms.length && !terms.some((term) => haystack.includes(term))) return null;
  return {
    title,
    url: String(pageUrl || source.url || ''),
    excerpt: text.slice(0, 1000),
    publishedAt: '',
    suggestedSection: 'Cẩm nang & Thông tin',
  };
}

function extractUniversityDirectoryCandidates(html, baseUrl) {
  const results = []; const seen = new Set();
  const pattern = /<a\b([^>]*?)href\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))([^>]*)>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = pattern.exec(String(html || '')))) {
    const url = normalizeUrl(match[2] || match[3] || match[4], baseUrl);
    if (!url || !/\/search\/universityInfo\.do\?.*\bunivCd=\d+/i.test(url) || seen.has(url)) continue;
    const title = stripHtml(match[6]);
    if (title.length < 2 || title.length > 240) continue;
    seen.add(url);
    results.push({ title, url, excerpt: 'Hồ sơ trường dành cho sinh viên quốc tế trên danh mục chính thức Study in Korea. Trạng thái mở tuyển cần đối chiếu thông báo mới nhất của trường.', publishedAt: '', suggestedSection: 'Thông tin trường' });
  }
  return results;
}

function directoryPageCount(html) {
  const direct = String(html || '').match(/id=["']number["'][^>]*\bmax=["'](\d+)["']/i)
    || String(html || '').match(/\bmax=["'](\d+)["'][^>]*id=["']number["']/i);
  if (direct) return Math.min(50, Math.max(1, Number(direct[1])));
  const pages = [...String(html || '').matchAll(/clickFldSet\([^)]*?["']st["'][^)]*?(\d+)\s*\)/gi)].map((match) => Number(match[1]));
  return Math.min(50, Math.max(1, ...pages.filter(Number.isFinite)));
}

function optimizeCrawledItem(item, source) {
  const title = stripHtml(item.title)
    .replace(/[\u0080-\u009f]/g, "'")
    .replace(/^[\s|•·»›-]+|[\s|•·»›-]+$/g, '')
    .replace(/\s+/g, ' ')
    .slice(0, 220);
  if (!title || /^(?:xem thêm|chi tiết|more|view|home|trang chủ)$/i.test(title)) return null;
  const sourceName = stripHtml(source.name || new URL(item.url).hostname).slice(0, 120);
  const excerpt = stripHtml(item.excerpt).replace(/\s+/g, ' ').trim()
    || `Bot phát hiện nội dung này tại nguồn ${sourceName}. Toàn văn sẽ được đọc, đối chiếu nguồn và tối ưu thành bản nháp trước khi quản trị viên duyệt xuất bản.`;
  const suggestedSection = item.suggestedSection || classifySection(`${title} ${item.url}`);
  const inKoreaScope = isKoreaStudyRelevant({ ...item, title, excerpt, suggested_section: suggestedSection, source_name: source.name, source_type: source.source_type, source_url: source.url });
  const legacyExplicitOfficial = !source.source_type && /nguồn chính thức/i.test(String(source.name || ''));
  if (!inKoreaScope && !legacyExplicitOfficial) return null;
  let qualityScore = 25;
  if (/^https:\/\//i.test(item.url)) qualityScore += 20;
  if (title.length >= 20 && title.length <= 120) qualityScore += 20;
  if (excerpt.length >= 80) qualityScore += 20;
  if (suggestedSection) qualityScore += 15;
  return {
    ...item, title, excerpt: excerpt.slice(0, 1000), suggestedSection,
    qualityScore: Math.min(100, qualityScore),
    optimizationNote: item.discoveryMode === 'official-search-index'
      ? 'Phát hiện qua chỉ mục tìm kiếm của đúng website chính thức vì nguồn chặn crawler; bắt buộc quản trị viên duyệt trước khi xuất bản.'
      : requiresManualApproval(suggestedSection)
      ? 'Đã chuẩn hóa SEO–GEO; thông tin trường/chương trình phải được quản trị viên duyệt trước khi xuất bản.'
      : 'Đã chuẩn hóa SEO–GEO; nguồn được phép có thể tự tạo cẩm nang, FAQ và media có dẫn nguồn.',
  };
}

function insertResearchItems(source, items, options = {}) {
  const insert = db.prepare(`INSERT OR IGNORE INTO research_items
    (source_id,title,url,excerpt,published_at,fingerprint,suggested_section,quality_score,optimization_note,status)
    VALUES (?,?,?,?,?,?,?,?,?,'pending')`);
  const update = db.prepare(`UPDATE research_items SET title=?,excerpt=?,published_at=?,suggested_section=?,quality_score=?,optimization_note=?,updated_at=datetime('now','localtime') WHERE url=?`);
  const findByUrl = db.prepare('SELECT id FROM research_items WHERE url=?');
  let added = 0; const ids = [];
  db.transaction(() => items.forEach((item) => {
    const optimized = optimizeCrawledItem(item, source);
    if (!optimized) return;
    const existing = findByUrl.get(optimized.url);
    if (existing) {
      update.run(optimized.title, optimized.excerpt, optimized.publishedAt, optimized.suggestedSection, optimized.qualityScore, optimized.optimizationNote, optimized.url);
      return;
    }
    const itemFingerprint = options.fingerprintByUrl
      ? crypto.createHash('sha256').update(`directory:${optimized.url}`).digest('hex')
      : fingerprint(optimized);
    const result = insert.run(source.id, optimized.title, optimized.url, optimized.excerpt, optimized.publishedAt, itemFingerprint, optimized.suggestedSection, optimized.qualityScore, optimized.optimizationNote);
    added += result.changes;
    if (result.changes) ids.push(Number(result.lastInsertRowid));
  }))();
  return { added, ids };
}

async function crawlUniversityDirectory(source) {
  const first = await fetchWithLimits(source.url, { retry404DelayMs: Number(source.crawl_delay_ms) || 5000 });
  const totalPages = directoryPageCount(first.text);
  const all = [...extractUniversityDirectoryCandidates(first.text, first.url)];
  for (let pageNumber = 2; pageNumber <= totalPages; pageNumber += 1) {
    const body = new URLSearchParams({ section: '대학', nh: '30', st: String(pageNumber), adv: '0', sw: '0', searchType: '0', menu: '대학', rf: '@date', field: '@all', delmyquery: 'null' }).toString();
    const page = await fetchWithLimits(source.url, {
      method: 'POST', body, headers: { 'content-type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      retry404DelayMs: Number(source.crawl_delay_ms) || 5000,
    });
    all.push(...extractUniversityDirectoryCandidates(page.text, page.url));
    if (pageNumber < totalPages) await wait(200);
  }
  const unique = [...new Map(all.map((item) => [item.url, item])).values()];
  // A directory can legitimately contain campuses/records with the same display name.
  // URL-based fingerprints retain every official profile while URL UNIQUE still prevents duplicates.
  const inserted = insertResearchItems(source, unique, { fingerprintByUrl: true });
  const added = inserted.added;
  const currentUrls = new Set(unique.map((item) => item.url));
  const staleRows = db.prepare("SELECT id,url FROM research_items WHERE source_id=? AND status='pending'").all(source.id)
    .filter((row) => !currentUrls.has(row.url));
  if (staleRows.length) {
    const dismiss = db.prepare(`UPDATE research_items SET status='dismissed',
      optimization_note='Hồ sơ cũ không còn xuất hiện trong danh mục Study in Korea hiện hành; đã ẩn khỏi hàng chờ để tránh tạo nhầm bản nháp.',
      updated_at=datetime('now','localtime') WHERE id=?`);
    db.transaction(() => staleRows.forEach((row) => dismiss.run(row.id)))();
  }
  const directoryStatus = added
    ? `Đọc thành công ${totalPages} trang; tìm ${unique.length} hồ sơ trường; có ${added} hồ sơ mới; ẩn ${staleRows.length} hồ sơ cũ`
    : `Đọc thành công ${totalPages} trang; ${unique.length} hồ sơ đã có sẵn, không có hồ sơ mới; ẩn ${staleRows.length} hồ sơ cũ`;
  db.prepare("UPDATE research_sources SET last_crawled_at=datetime('now','localtime'),last_status=?,last_error='',updated_at=datetime('now','localtime') WHERE id=?").run(directoryStatus, source.id);
  return { source: source.name, found: unique.length, added, pages: totalPages, staleDismissed: staleRows.length };
}

function fingerprint(item) { return crypto.createHash('sha256').update(item.title.toLowerCase().replace(/\s+/g, ' ').trim()).digest('hex'); }

function structuredTextFromHtml(html) {
  const source = String(html || '');
  const mainParts = [];
  for (const pattern of [/<main\b[^>]*>([\s\S]*?)<\/main>/gi, /<article\b[^>]*>([\s\S]*?)<\/article>/gi]) {
    for (const match of source.matchAll(pattern)) if (stripHtml(match[1]).length >= 150) mainParts.push(match[1]);
  }
  const body = source.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] || source;
  let content = mainParts.sort((a, b) => stripHtml(b).length - stripHtml(a).length)[0] || body;
  // Thông tin liên hệ thường nằm ở footer và sẽ bị mất nếu chỉ lấy <main>.
  const footer = source.match(/<footer\b[^>]*>([\s\S]*?)<\/footer>/i)?.[1] || '';
  const addresses = [...source.matchAll(/<address\b[^>]*>([\s\S]*?)<\/address>/gi)].map((match) => match[1]).join('\n');
  content = `${content}\n${footer}\n${addresses}`
    .replace(/<(?:script|style|noscript|svg|canvas|form|nav|header|aside|dialog)\b[^>]*>[\s\S]*?<\/(?:script|style|noscript|svg|canvas|form|nav|header|aside|dialog)>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n').replace(/<\/(?:p|div|section|article|h[1-6]|li|tr|table|ul|ol)>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '- ').replace(/<t[dh]\b[^>]*>/gi, ' | ');
  const lines = decodeHtml(content.replace(/<[^>]+>/g, ' '))
    .replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').replace(/\n{3,}/g, '\n\n').trim().split('\n');
  const seen = new Set();
  return lines.filter((line) => {
    const normalized = line.replace(/\s+/g, ' ').trim();
    if (!normalized) return false;
    const key = normalized.toLocaleLowerCase('vi-VN');
    // Chỉ bỏ dòng trùng tuyệt đối do menu/footer lặp lại; mọi dữ kiện khác
    // được giữ nguyên để phân loại trước khi biên tập.
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).join('\n');
}

function classifyInformationBlock(value) {
  const text = String(value || '');
  if (/https?:\/\/|\.(?:pdf|docx?|xlsx?|pptx?|hwp|hwpx|zip)\b|tệp đính kèm|첨부/i.test(text)) return 'attachments';
  if (/\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b|điện thoại|hotline|email|địa chỉ|liên hệ|contact|address|tel\b|fax\b/i.test(text)) return 'contact';
  if (/học phí|lệ phí|chi phí|phí\b|₩|\bkrw\b|\busd\b|\bvnd\b|won\b|đồng\b|tuition|fee/i.test(text)) return 'fees';
  if (/học bổng|miễn giảm|scholarship|장학/i.test(text)) return 'scholarship';
  if (/hồ sơ|giấy tờ|tài liệu cần|passport|hộ chiếu|chứng minh|application document/i.test(text)) return 'documents';
  if (/điều kiện|đối tượng|yêu cầu|đủ điều kiện|eligib|requirement|qualification/i.test(text)) return 'eligibility';
  if (/ngành|chuyên ngành|khoa\b|major|department|faculty|curriculum/i.test(text)) return 'academics';
  if (/ký túc|nhà ở|dormitory|housing|accommodation/i.test(text)) return 'housing';
  if (/visa|thị thực|d-[24]\b|c-3\b|f-[1-6]\b|xuất nhập cảnh|immigration/i.test(text)) return 'visa';
  if (/\b20\d{2}[.\/-]\d{1,2}[.\/-]\d{1,2}\b|\b\d{1,2}[.\/-]\d{1,2}[.\/-]20\d{2}\b|thời hạn|hạn nộp|lịch\b|ngày đăng|deadline|schedule/i.test(text)) return 'dates';
  if (/thông báo|notice|announcement|áp dụng|hiệu lực|cập nhật/i.test(text)) return 'notice';
  return 'general';
}

function splitLongInformationPiece(value, maxCharacters = 2200) {
  const output = [];
  let remaining = String(value || '').trim();
  while (remaining.length > maxCharacters) {
    let boundary = remaining.lastIndexOf(' ', maxCharacters);
    if (boundary < Math.floor(maxCharacters * 0.6)) boundary = maxCharacters;
    output.push(remaining.slice(0, boundary).trim());
    remaining = remaining.slice(boundary).trim();
  }
  if (remaining) output.push(remaining);
  return output;
}

function classifySourceContent(text, meta = {}) {
  const cleaned = String(text || '').replace(/\r/g, '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  // HTML đã được chuyển thành từng dòng nội dung có nghĩa. Tách theo mọi
  // dòng giúp các hàng bảng và từng mục của thông báo có mã kiểm toán riêng;
  // đoạn quá dài được chia tại khoảng trắng, không cắt hay bỏ ký tự.
  const pieces = cleaned.split(/\n+/).flatMap((value) => splitLongInformationPiece(value)).filter(Boolean);
  const blocks = [];
  for (const piece of pieces) {
    const category = classifyInformationBlock(piece);
    const previous = blocks[blocks.length - 1];
    if (previous && previous.category === category && previous.text.length + piece.length + 2 <= 2400) previous.text += `\n${piece}`;
    else {
      const order = blocks.length + 1;
      blocks.push({ id: `SRC-${String(order).padStart(4, '0')}`, order, category, text: piece });
    }
  }
  return {
    version: 2,
    title: String(meta.title || ''),
    sourceUrl: String(meta.url || ''),
    publishedAt: String(meta.publishedAt || ''),
    totalCharacters: cleaned.length,
    totalBlocks: blocks.length,
    categories: blocks.reduce((result, block) => { result[block.category] = (result[block.category] || 0) + 1; return result; }, {}),
    blocks,
  };
}

function classifiedSourceText(classification) {
  if (!classification?.blocks?.length) return '';
  return classification.blocks.map((block) => `[MÃ ${block.id || `SRC-${String(block.order).padStart(4, '0')}`} | NHÓM ${String(block.category).toUpperCase()} | THỨ TỰ ${block.order}]\n${block.text}`).join('\n\n');
}

function persistResearchSourceSnapshot(itemId, page) {
  if (!Number(itemId) || !page?.classification) return;
  const sourceText = String(page.rawText || page.text || '');
  const hash = crypto.createHash('sha256').update(sourceText).digest('hex');
  const snapshot = {
    version: 2,
    title: page.title || '',
    url: page.url || '',
    officialUrl: page.officialUrl || '',
    sourceUrls: page.sourceUrls || [page.url].filter(Boolean),
    publishedAt: page.publishedAt || '',
    classification: page.classification,
    attachments: page.attachments || [],
    faqs: page.faqs || [],
    media: page.media || {},
    discovery: page.discovery || null,
  };
  db.prepare(`UPDATE research_items SET source_text=?,source_data_json=?,source_content_hash=?,
    source_captured_at=datetime('now','localtime'),updated_at=datetime('now','localtime') WHERE id=?`)
    .run(sourceText, JSON.stringify(snapshot), hash, Number(itemId));
}

function finalizeEditorialSource(item, page) {
  const classification = classifySourceContent(page.text, { title: page.title || item.title, url: page.url, publishedAt: page.publishedAt });
  const result = { ...page, text: classifiedSourceText(classification), rawText: String(page.text || ''), classification };
  persistResearchSourceSnapshot(item?.id, result);
  return result;
}

function storedEditorialSource(item) {
  const rawText = String(item?.source_text || '').trim();
  if (!rawText) return null;
  let snapshot = {};
  try { snapshot = JSON.parse(String(item.source_data_json || '{}')); } catch (_) { snapshot = {}; }
  const classification = snapshot.classification?.blocks?.length
    ? snapshot.classification
    : classifySourceContent(rawText, { title: snapshot.title || item.title, url: snapshot.url || item.url, publishedAt: snapshot.publishedAt || item.published_at });
  return {
    url: snapshot.url || item.url,
    officialUrl: snapshot.officialUrl || item.official_url || item.url,
    sourceUrls: snapshot.sourceUrls || [snapshot.url || item.url],
    title: snapshot.title || item.title,
    publishedAt: snapshot.publishedAt || item.published_at || '',
    text: classifiedSourceText(classification),
    rawText,
    html: '',
    media: snapshot.media || {},
    faqs: snapshot.faqs || [],
    attachments: snapshot.attachments || [],
    discovery: snapshot.discovery || { pagesRead: 1, attachments: (snapshot.attachments || []).length, coverage: { storedSnapshot: 1 }, failedPages: 0 },
    classification,
    fromStoredSnapshot: true,
  };
}

function extractPublishedDate(html) {
  const source = String(html || '');
  const candidates = [];
  for (const pattern of [
    /<meta[^>]+(?:property|name)=["'](?:article:published_time|datePublished|date|pubdate)["'][^>]+content=["']([^"']+)/gi,
    /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:article:published_time|datePublished|date|pubdate)["']/gi,
    /<time[^>]+datetime=["']([^"']+)/gi,
  ]) for (const match of source.matchAll(pattern)) candidates.push(match[1]);
  const visible = stripHtml(source).slice(0, 8000);
  const visibleDate = visible.match(/\b(20\d{2})[.\/-]\s*(0?[1-9]|1[0-2])[.\/-]\s*(0?[1-9]|[12]\d|3[01])\b/);
  if (visibleDate) candidates.push(`${visibleDate[1]}-${String(visibleDate[2]).padStart(2, '0')}-${String(visibleDate[3]).padStart(2, '0')}`);
  for (const value of candidates) {
    const match = String(value).match(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (match) return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
  }
  return '';
}

function extractSitemapLocations(xml, baseUrl) {
  const output = [];
  for (const match of String(xml || '').matchAll(/<loc\b[^>]*>([\s\S]*?)<\/loc>/gi)) {
    const url = normalizePublicHref(stripHtml(match[1]), baseUrl);
    if (url) output.push(url);
  }
  return [...new Set(output)];
}

function extractFeedLinks(html, baseUrl) {
  const output = [];
  for (const tag of String(html || '').match(/<link\b[^>]*>/gi) || []) {
    if (!/\brel\s*=\s*["'][^"']*alternate/i.test(tag) || !/application\/(?:rss|atom)\+xml/i.test(tag)) continue;
    const url = normalizePublicHref(tagAttribute(tag, 'href'), baseUrl);
    if (url) output.push(url);
  }
  return [...new Set(output)];
}

function extractFeedEntries(xml, baseUrl) {
  const output = [];
  for (const blockMatch of String(xml || '').matchAll(/<(?:item|entry)\b[^>]*>([\s\S]*?)<\/(?:item|entry)>/gi)) {
    const block = blockMatch[1];
    const rawUrl = block.match(/<link\b[^>]*href=["']([^"']+)/i)?.[1] || block.match(/<link\b[^>]*>([\s\S]*?)<\/link>/i)?.[1] || '';
    const url = normalizePublicHref(stripHtml(rawUrl), baseUrl);
    const label = stripHtml(block.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '');
    if (url && label) output.push({ url, label, kind: 'notice', score: universityResourceScore(`${label} ${url}`, 'notice', 'notice') + 30 });
  }
  return output;
}

async function discoverUniversitySitemapResources(rootUrl) {
  const origin = new URL(rootUrl).origin; const family = universityDomainFamily(rootUrl);
  const sitemapQueue = [`${origin}/sitemap.xml`, `${origin}/sitemap_index.xml`];
  try {
    const robots = await fetchWithLimits(`${origin}/robots.txt`, { accept: 'text/plain', maxBytes: MAX_SITEMAP_BYTES });
    for (const match of robots.text.matchAll(/^\s*Sitemap:\s*(\S+)/gim)) sitemapQueue.unshift(match[1]);
  } catch (_) { /* Nhiều trường không khai báo sitemap. */ }
  const seenMaps = new Set(); const candidates = new Map();
  while (sitemapQueue.length && seenMaps.size < 8 && candidates.size < 240) {
    const sitemapUrl = sitemapQueue.shift();
    if (!sitemapUrl || seenMaps.has(sitemapUrl)) continue;
    seenMaps.add(sitemapUrl);
    try {
      const map = await fetchWithLimits(sitemapUrl, { accept: 'application/xml,text/xml,text/plain;q=0.8', maxBytes: MAX_SITEMAP_BYTES });
      for (const url of extractSitemapLocations(map.text, map.url)) {
        const host = hostname(url);
        if (url.endsWith('.xml') && (host === hostname(rootUrl) || universityDomainFamily(url) === family)) {
          if (!seenMaps.has(url)) sitemapQueue.push(url);
          continue;
        }
        if ((!host.endsWith(`.${family}`) && host !== family) || !isOfficialUniversityUrl(url)) continue;
        const kind = universityResourceKind(url);
        if (kind === 'other') continue;
        const record = { url, label: '', kind, score: universityResourceScore(url, kind) };
        if (!candidates.has(url) || candidates.get(url).score < record.score) candidates.set(url, record);
      }
    } catch (_) { /* Thử sitemap tiếp theo. */ }
  }
  return [...candidates.values()].sort((left, right) => right.score - left.score);
}

async function fetchPageDocument(url, options = {}) {
  if (!(await robotsAllows(url))) throw new Error('robots.txt không cho phép đọc trang này.');
  const page = await fetchWithLimits(url, options);
  return {
    url: page.url,
    html: page.text,
    title: extractPageTitle(page.text),
    publishedAt: extractPublishedDate(page.text),
    text: structuredTextFromHtml(page.text),
    media: extractMediaFromHtml(page.text, page.url),
    faqs: extractFaqsFromHtml(page.text),
    attachments: extractAttachmentsFromHtml(page.text, page.url),
  };
}

async function fetchRenderedPageDocument(url, options = {}) {
  const page = await renderPublicPage(url, {
    waitMs: Math.max(5000, Number(options.waitMs) || 5000),
    timeoutMs: Number(options.timeoutMs) || 45000,
  });
  return {
    url: page.url,
    html: page.html,
    title: extractPageTitle(page.html),
    publishedAt: extractPublishedDate(page.html),
    text: structuredTextFromHtml(page.html),
    media: extractMediaFromHtml(page.html, page.url),
    faqs: extractFaqsFromHtml(page.html),
    attachments: extractAttachmentsFromHtml(page.html, page.url),
  };
}

async function buildEditorialSource(item, source = {}) {
  const delay = Number(source.crawl_delay_ms) || 5000;
  const isDirectoryItem = source.source_type === 'university-directory';
  const isSchoolItem = isDirectoryItem || ['Thông tin trường', 'Chương trình du học'].includes(item.suggested_section);
  if (!isSchoolItem) {
    try { return finalizeEditorialSource(item, await fetchPageDocument(item.url, { retry404DelayMs: delay })); }
    catch (error) {
      const stored = storedEditorialSource(item);
      if (stored) return stored;
      if (!/chỉ mục tìm kiếm/i.test(String(item.optimization_note || ''))) throw error;
      const indexed = await researchOfficialUrlViaSearch({ title: item.title, sourceUrl: item.url, sourceName: source.name });
      if (!indexed) throw new Error('Nguồn chặn crawler và chỉ mục tìm kiếm chưa cung cấp đủ dữ kiện để tạo bản nháp an toàn.');
      return finalizeEditorialSource(item, {
        url: item.url, officialUrl: item.url, sourceUrls: [item.url], title: item.title,
        text: `DỮ LIỆU ĐƯỢC ĐỐI CHIẾU QUA CHỈ MỤC TÌM KIẾM CỦA WEBSITE CHÍNH THỨC; BẮT BUỘC DUYỆT THỦ CÔNG.\n${indexed.text}`,
        html: '', media: {}, faqs: [], attachments: [], discovery: { pagesRead: 0, attachments: 0, coverage: { searchIndex: 1 }, failedPages: 0 },
      });
    }
  }
  let officialUrl = String(item.official_url || '').trim();
  let directoryError = '';
  let directorySupportPage = null;

  if (!officialUrl && !isDirectoryItem && isOfficialUniversityUrl(item.url)) officialUrl = item.url;
  if (!officialUrl && isDirectoryItem) {
    try {
      const directoryPage = await fetchPageDocument(item.url, { retry404DelayMs: delay });
      officialUrl = extractOfficialUniversityWebsite(directoryPage.html, directoryPage.url);
      if (officialUrl && directoryPage.text.length >= 1200) directorySupportPage = directoryPage;
      if (!officialUrl) directoryError = 'Trang phản hồi nhưng chưa dựng liên kết website trường.';
    } catch (error) { directoryError = error.message; }
    if (!officialUrl) {
      // Study in Korea và một số cổng tuyển sinh trả 404 ở lần tải đầu,
      // sau đó JavaScript mới dựng nội dung. Với thao tác chủ động của admin,
      // mở bằng trình duyệt thật và chờ tối thiểu 5 giây để lấy đúng liên kết
      // website trường. Luồng thu thập định kỳ không dùng cơ chế này.
      try {
        const directoryPage = await fetchRenderedPageDocument(item.url, { waitMs: Math.max(5000, delay), timeoutMs: 45000 });
        officialUrl = extractOfficialUniversityWebsite(directoryPage.html, directoryPage.url);
        if (officialUrl) {
          directoryError = '';
          if (directoryPage.text.length >= 1200) directorySupportPage = directoryPage;
        }
      } catch (browserError) {
        directoryError = `${directoryError}; trình duyệt: ${browserError.message}`;
      }
    }
  }

  // Danh mục đôi khi giữ hai mã cho cùng một trường, trong đó một mã cũ trả
  // hồ sơ rỗng. Tái sử dụng website đã xác minh ở bản ghi tên tương đương,
  // hoặc thử tối đa hai hồ sơ song sinh trước khi gọi AI tìm kiếm.
  if (!officialUrl && isDirectoryItem) {
    const siblings = db.prepare(`SELECT id,title,url,official_url FROM research_items
      WHERE source_id=? AND id<>? ORDER BY CASE WHEN TRIM(COALESCE(official_url,''))<>'' THEN 0 ELSE 1 END,id ASC LIMIT 1000`)
      .all(item.source_id, Number(item.id) || 0)
      .map((row) => ({ ...row, similarity: titleSimilarity(item.title, row.title) }))
      .filter((row) => row.similarity >= 0.86)
      .sort((left, right) => Number(Boolean(right.official_url)) - Number(Boolean(left.official_url)) || right.similarity - left.similarity)
      .slice(0, 2);
    officialUrl = siblings.map((row) => String(row.official_url || '').trim()).find(isOfficialUniversityUrl) || '';
    if (officialUrl && !directorySupportPage) {
      const supportingSibling = siblings.find((row) => isOfficialUniversityUrl(String(row.official_url || '').trim()));
      if (supportingSibling) {
        try {
          const siblingPage = await fetchRenderedPageDocument(supportingSibling.url, { waitMs: Math.max(5000, delay), timeoutMs: 45000 });
          if (siblingPage.text.length >= 1200) directorySupportPage = siblingPage;
        } catch (_) { /* Website trường vẫn được ưu tiên; hồ sơ chính phủ chỉ là dự phòng. */ }
      }
    }
    for (const sibling of siblings) {
      if (officialUrl) break;
      try {
        const siblingPage = await fetchRenderedPageDocument(sibling.url, { waitMs: Math.max(5000, delay), timeoutMs: 45000 });
        officialUrl = extractOfficialUniversityWebsite(siblingPage.html, siblingPage.url);
        if (officialUrl && siblingPage.text.length >= 1200) directorySupportPage = siblingPage;
      } catch (_) { /* Thử bản ghi tên tương đương tiếp theo. */ }
    }
  }

  // Tái sử dụng tên miền đã được quản trị viên duyệt ở hồ sơ cùng trường.
  if (!officialUrl) {
    const known = db.prepare("SELECT title,source_urls FROM programs WHERE TRIM(COALESCE(source_urls,''))<>'' ORDER BY published DESC,id DESC LIMIT 500").all()
      .find((row) => titleSimilarity(item.title, row.title) >= 0.72);
    officialUrl = String(known?.source_urls || '').split(/\r?\n|,/).map((url) => url.trim()).find(isOfficialUniversityUrl) || '';
  }

  // Phương án cuối: dùng tìm kiếm có grounding để tìm URL, sau đó bắt buộc
  // đọc lại và kiểm chứng toàn bộ dữ liệu ở chính tên miền *.ac.kr đó.
  if (!officialUrl) officialUrl = await resolveOfficialUniversityWebsite(item.title);
  if (!isOfficialUniversityUrl(officialUrl)) {
    throw new Error(`Chưa xác định được website chính thức *.ac.kr của trường${directoryError ? ` (${directoryError})` : ''}. Có thể nhập URL chính thức trong hàng chờ rồi thử lại.`);
  }

  const rootCandidates = [...new Set([officialUrl, `${new URL(officialUrl).origin}/`])];
  const triedRoots = new Set();
  let root = null; let rootError = '';
  for (const candidate of rootCandidates) {
    if (triedRoots.has(candidate)) continue;
    triedRoots.add(candidate);
    try {
      const fetched = await fetchPageDocument(candidate, { retry404DelayMs: delay });
      const clientRedirect = fetched.text.length < 350 ? extractClientRedirect(fetched.html, fetched.url) : '';
      if (clientRedirect && !triedRoots.has(clientRedirect)) {
        rootCandidates.push(clientRedirect);
        continue;
      }
      if (fetched.text.length >= 350) {
        root = fetched;
        break;
      }
      rootError = 'Trang gốc chỉ trả về trang trung gian, chưa có đủ nội dung trường.';
      try {
        const rendered = await fetchRenderedPageDocument(candidate, { waitMs: 5000, timeoutMs: 45000 });
        if (rendered.text.length >= 350) {
          root = rendered;
          break;
        }
      } catch (browserError) {
        rootError = `${rootError}; trình duyệt: ${browserError.message}`;
      }
    }
    catch (error) {
      rootError = error.message;
      // Dựng trang gốc bằng trình duyệt khi yêu cầu HTTP thuần bị chặn.
      // Việc đọc vẫn giới hạn trong tên miền *.ac.kr và hạn mức hồ sơ.
      try {
        const rendered = await fetchRenderedPageDocument(candidate, { waitMs: 5000, timeoutMs: 45000 });
        if (rendered.text.length >= 350) {
          root = rendered;
          break;
        }
        rootError = `${rootError}; trang sau khi dựng không có đủ nội dung.`;
      } catch (browserError) {
        rootError = `${rootError}; trình duyệt: ${browserError.message}`;
      }
    }
  }
  let governmentDirectoryFallback = false;
  if (!root && directorySupportPage?.text?.length >= 1200) {
    root = directorySupportPage;
    governmentDirectoryFallback = true;
  }
  if (!root) {
    const stored = storedEditorialSource(item);
    if (stored) return stored;
    throw new Error(`Website chính thức đã được tìm thấy nhưng chưa đọc được: ${rootError}`);
  }
  if (item.id) {
    db.prepare("UPDATE research_items SET official_url=?,updated_at=datetime('now','localtime') WHERE id=?").run(officialUrl, item.id);
  }

  const pages = [{ ...root, resourceKind: universityResourceKind(`${root.title} ${root.url}`), resourceScore: 1000 }];
  const seen = new Set([root.url]); const queued = new Map(); const failures = [];
  let renderedSubpages = 0;
  const kindCounts = new Map([[pages[0].resourceKind, 1]]);
  const kindCaps = { notice: 12, admission: 8, academics: 7, finance: 5, international: 5, language: 4, housing: 4, contact: 3, overview: 4, documents: 4, other: 2 };
  function enqueue(entries) {
    for (const entry of entries || []) {
      if (!entry?.url || seen.has(entry.url)) continue;
      const previous = queued.get(entry.url);
      if (!previous || Number(previous.score || 0) < Number(entry.score || 0)) queued.set(entry.url, entry);
    }
  }
  if (!governmentDirectoryFallback) {
    enqueue(extractUniversityResourceCandidates(root.html, root.url, pages[0].resourceKind));
    if (root.url !== `${new URL(root.url).origin}/`) enqueue([{ url: `${new URL(root.url).origin}/`, label: 'Trang chủ', kind: 'overview', score: 190 }]);

    // Sitemap giúp tìm được trang sâu dù menu dùng JavaScript; RSS/Atom giúp
    // lấy đúng các thông báo mới nhất mà không phải đoán cấu trúc CMS.
    enqueue(await discoverUniversitySitemapResources(root.url));
    for (const feedUrl of extractFeedLinks(root.html, root.url).slice(0, 4)) {
      try {
        const feed = await fetchWithLimits(feedUrl, { accept: 'application/rss+xml,application/atom+xml,text/xml', maxBytes: MAX_SITEMAP_BYTES });
        enqueue(extractFeedEntries(feed.text, feed.url));
      } catch (error) { failures.push(`${feedUrl}: ${error.message}`); }
    }
  }

  while (queued.size && pages.length < MAX_UNIVERSITY_PAGES) {
    const next = [...queued.values()].sort((left, right) => Number(right.score || 0) - Number(left.score || 0))[0];
    queued.delete(next.url);
    if (seen.has(next.url)) continue;
    seen.add(next.url);
    const count = kindCounts.get(next.kind) || 0;
    if (count >= (kindCaps[next.kind] || 2)) continue;
    try {
      const page = await fetchPageDocument(next.url, { retry404DelayMs: delay });
      const kind = next.kind || universityResourceKind(`${page.title} ${page.url}`);
      pages.push({ ...page, resourceKind: kind, resourceScore: next.score || universityResourceScore(page.url, kind) });
      kindCounts.set(kind, (kindCounts.get(kind) || 0) + 1);
      enqueue(extractUniversityResourceCandidates(page.html, page.url, kind).map((entry) => ({ ...entry, score: entry.score - Math.min(25, pages.length) })));
      for (const feedUrl of extractFeedLinks(page.html, page.url).slice(0, 2)) {
        try {
          const feed = await fetchWithLimits(feedUrl, { accept: 'application/rss+xml,application/atom+xml,text/xml', maxBytes: MAX_SITEMAP_BYTES });
          enqueue(extractFeedEntries(feed.text, feed.url));
        } catch (_) { /* Trang vẫn dùng được khi feed lỗi. */ }
      }
    } catch (error) {
      let rendered = null;
      let renderedError = '';
      // Một số website trường cho người dùng xem bình thường nhưng chặn yêu
      // cầu HTTP thuần hoặc dựng nội dung bằng JavaScript. Chỉ dùng trình
      // duyệt cho tối đa 8 trang con có độ ưu tiên cao trong lần admin tạo
      // bản nháp, tránh tạo lưu lượng hàng loạt.
      if (renderedSubpages < 8 && next.kind !== 'other') {
        try {
          rendered = await fetchRenderedPageDocument(next.url, { waitMs: 5000, timeoutMs: 45000 });
          renderedSubpages += 1;
        } catch (browserError) {
          renderedError = browserError.message;
        }
      }
      if (rendered?.text?.length >= 200) {
        const kind = next.kind || universityResourceKind(`${rendered.title} ${rendered.url}`);
        pages.push({ ...rendered, resourceKind: kind, resourceScore: next.score || universityResourceScore(rendered.url, kind) });
        kindCounts.set(kind, (kindCounts.get(kind) || 0) + 1);
        enqueue(extractUniversityResourceCandidates(rendered.html, rendered.url, kind)
          .map((entry) => ({ ...entry, score: entry.score - Math.min(25, pages.length) })));
      } else if (rendered) {
        failures.push(`${next.url}: trang sau khi dựng không có đủ nội dung.`);
      } else {
        failures.push(`${next.url}: ${error.message}${renderedError ? `; trình duyệt: ${renderedError}` : ''}`);
      }
      if (failures.length > 30) failures.splice(0, failures.length - 30);
    }
    await wait(100);
  }

  const attachments = [...new Map(pages.flatMap((page) => page.attachments || []).map((file) => [file.url, file])).values()];
  const faqs = [...new Map(pages.flatMap((page) => page.faqs || []).map((faq) => [faq.question.toLowerCase(), faq])).values()];
  const orderedPages = [...pages].sort((left, right) => Number(right.resourceScore || 0) - Number(left.resourceScore || 0));
  const text = orderedPages.map((page) => `NHÓM DỮ LIỆU: ${page.resourceKind || 'other'}\nTIÊU ĐỀ NGUỒN: ${page.title || 'Không có tiêu đề'}\nNGÀY ĐĂNG PHÁT HIỆN: ${page.publishedAt || 'Không xác định'}\nNGUỒN CHÍNH THỨC: ${page.url}\n${page.text}`).join('\n\n');
  const media = orderedPages.map((page) => page.media).find((entry) => entry?.imageUrl) || root.media;
  const coverage = Object.fromEntries([...kindCounts.entries()].sort());
  return finalizeEditorialSource(item, {
    ...root, url: root.url, officialUrl, sourceUrls: pages.map((page) => page.url),
    text, media, faqs, attachments,
    discovery: { pagesRead: pages.length, attachments: attachments.length, coverage, failedPages: failures.length, governmentDirectoryFallback },
  });
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
}

function attachmentMarkup(attachments, sourceUrl) {
  if (!Array.isArray(attachments) || !attachments.length) return '';
  const items = attachments.map((file) => `<li><a href="${escapeHtml(file.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(file.titleVi || file.title || 'Tệp đính kèm chính thức')}</a></li>`).join('');
  return `<section class="source-attachments"><h2>Tệp đính kèm chính thức</h2><p>Các tệp dưới đây được dẫn trực tiếp từ website nguồn và có thể được cập nhật theo từng kỳ.</p><ul>${items}</ul><p><a href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener noreferrer">Kiểm tra trang nguồn chính thức</a></p></section>`;
}

function normalizedTitleTokens(value) {
  return new Set(String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((word) => word.length > 2 && !/^(?:thong|tin|cap|nhat|han|quoc|chuong|trinh|nam|moi|nhat)$/.test(word)));
}

function titleSimilarity(left, right) {
  const a = normalizedTitleTokens(left); const b = normalizedTitleTokens(right);
  if (!a.size || !b.size) return 0;
  const common = [...a].filter((word) => b.has(word)).length;
  return common / Math.max(a.size, b.size);
}

function findDuplicatePost(title, sourceUrl) {
  const host = hostname(sourceUrl);
  const rows = db.prepare("SELECT id,title,source_urls FROM posts WHERE published=1 ORDER BY id DESC LIMIT 500").all();
  return rows.find((row) => {
    const sameHost = host && hostname(row.source_urls) === host;
    return sameHost && titleSimilarity(title, row.title) >= 0.68;
  });
}

function mediaMarkup(media, sourceName, sourceUrl) {
  if (!media?.videoUrl) return '';
  const label = stripHtml(sourceName || 'nguồn chính thức').slice(0, 160);
  return `<figure><video src="${media.videoUrl}" controls playsinline preload="metadata"${media.imageUrl ? ` poster="${media.imageUrl}"` : ''}></video><figcaption>Video từ ${label}. <a href="${sourceUrl}">Xem nguồn gốc</a></figcaption></figure>`;
}

async function publishResearchItem(source, item) {
  if (!source.auto_publish_non_school || requiresManualApproval(item.suggested_section)) return { skipped: true };
  if (!isKoreaStudyRelevant({ ...item, source_name: source.name, source_type: source.source_type, source_url: source.url })) {
    db.prepare("UPDATE research_items SET status='dismissed',optimization_note='Tự động loại vì không thuộc phạm vi du học Hàn Quốc.',updated_at=datetime('now','localtime') WHERE id=?").run(item.id);
    return { skipped: true, irrelevant: true };
  }
  const existing = db.prepare('SELECT id,cover_image FROM posts WHERE source_urls=? LIMIT 1').get(item.url);
  if (existing) {
    db.prepare("UPDATE research_items SET status='auto_published',published_post_id=?,updated_at=datetime('now','localtime') WHERE id=?").run(existing.id, item.id);
    return { published: false, existing: true };
  }
  const page = await buildEditorialSource(item, source);
  const draft = await generateEditorialDraft({
    title: item.title, sourceUrl: page.url, sourceText: page.text, sourceClassification: page.classification,
    section: 'Cẩm nang & Thông tin', sourceFaqs: page.faqs, sourceAttachments: page.attachments,
  });
  if (!draft.aiAvailable || stripHtml(draft.content).length < 350 || !draft.excerpt) {
    throw new Error(draft.aiError || 'AI chưa tạo được nội dung đủ chất lượng để tự đăng.');
  }
  const duplicate = findDuplicatePost(draft.title, page.url);
  if (duplicate) {
    db.prepare("UPDATE research_items SET title=?,excerpt=?,status='auto_published',published_post_id=?,optimization_note='Đã gộp với bài tiếng Việt tương đương để tránh trùng lặp.',updated_at=datetime('now','localtime') WHERE id=?")
      .run(draft.title, draft.excerpt, duplicate.id, item.id);
    return { published: false, existing: true };
  }
  let coverImage = await coverImageForPage(page);
  if (!coverImage) {
    try { coverImage = await coverImageForSource(source); }
    catch (error) { console.warn(`[research] nguồn ${source.name} không có ảnh dự phòng: ${error.message}`); }
  }
  if (!coverImage) coverImage = fallbackCoverFor(`${draft.title} ${page.url}`);
  const usedFallbackCover = isFallbackCover(coverImage);
  const content = sanitizeRichHtml(`${draft.content}${attachmentMarkup(draft.attachments, page.url)}${mediaMarkup(page.media, source.name, page.url)}`);
  const slug = uniqueSlug(db, slugify(draft.title), 0, 'posts');
  const result = db.prepare(`INSERT INTO posts
    (title,slug,excerpt,content,category,cover_image,author_name,author_role,source_urls,seo_title,meta_description,focus_keyword,published,noindex,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,1,0,datetime('now','localtime'),datetime('now','localtime'))`)
    .run(draft.title, slug, draft.excerpt, content, 'Cẩm nang du học', coverImage || null, source.name, 'Nguồn thông tin tham khảo', page.url, draft.seoTitle, draft.metaDescription, draft.focusKeyword);
  if (usedFallbackCover) {
    coverImage = `/anh-cam-nang/${Number(result.lastInsertRowid)}.svg`;
    db.prepare('UPDATE posts SET cover_image=? WHERE id=?').run(coverImage, result.lastInsertRowid);
  }
  const insertFaq = db.prepare(`INSERT INTO faqs
    (category,question,answer,source_url,sort_order,published,generated,origin_type,origin_id)
    VALUES (?,?,?,?,?,1,1,'post',?)`);
  db.transaction((faqs) => faqs.forEach((faq, index) => insertFaq.run(
    /sinh hoạt|đời sống|văn hóa|living|생활/i.test(`${draft.title} ${draft.excerpt}`) ? 'Thông tin sinh hoạt tại Hàn Quốc' : 'Du học',
    String(faq.question).slice(0, 300), String(faq.answer).slice(0, 2500), page.url, (index + 1) * 10, String(result.lastInsertRowid),
  )))(draft.faqs || []);
  finalizePublishedContent('post', result.lastInsertRowid, { sync: false });
  db.prepare("UPDATE research_items SET status='auto_published',media_json=?,published_post_id=?,optimization_note=?,updated_at=datetime('now','localtime') WHERE id=?")
    .run(JSON.stringify({ ...page.media, cachedImageUrl: coverImage, fallbackCover: usedFallbackCover }), result.lastInsertRowid, usedFallbackCover ? 'Đã tối ưu SEO–GEO, dẫn nguồn và FAQ; nguồn không có ảnh phù hợp nên hệ thống dùng ảnh cẩm nang dự phòng.' : 'Đã được AI viết lại, kiểm tra cấu trúc SEO–GEO, gắn nguồn, FAQ và ảnh đại diện từ bài gốc rồi tự xuất bản vào Cẩm nang.', item.id);
  queueIndexNow([`/tin-tuc/${slug}`, '/tin-tuc', '/cau-hoi-thuong-gap', '/feed.xml', '/sitemap.xml', '/llms.txt']);
  return { published: true, postId: Number(result.lastInsertRowid) };
}

async function backfillResearchPostCovers({ sourceId, limit = 18 } = {}) {
  const params = []; let sourceFilter = '';
  if (sourceId) { sourceFilter = 'AND i.source_id=?'; params.push(Number(sourceId)); }
  params.push(Math.min(50, Math.max(1, Number(limit) || 18)));
  const rows = db.prepare(`SELECT p.id post_id,i.id item_id,i.url,s.name source_name,s.url source_url,s.crawl_delay_ms
    FROM posts p JOIN research_items i ON i.published_post_id=p.id JOIN research_sources s ON s.id=i.source_id
    WHERE p.published=1 AND TRIM(COALESCE(p.cover_image,''))='' ${sourceFilter}
    ORDER BY datetime(p.created_at) DESC LIMIT ?`).all(...params);
  let updated = 0; let missing = 0; let failed = 0; const sourceCoverCache = new Map();
  for (const row of rows) {
    try {
      let page = null; let coverImage = '';
      try { page = await fetchPageDocument(row.url, { retry404DelayMs: Number(row.crawl_delay_ms) || 5000 }); coverImage = await coverImageForPage(page); }
      catch (error) { console.warn(`[research] không đọc được ảnh bài ${row.post_id}, thử ảnh đại diện của nguồn: ${error.message}`); }
      if (!coverImage) {
        if (!sourceCoverCache.has(row.source_url)) {
          try { sourceCoverCache.set(row.source_url, await coverImageForSource({ url: row.source_url, crawl_delay_ms: row.crawl_delay_ms, name: row.source_name })); }
          catch (error) { sourceCoverCache.set(row.source_url, ''); console.warn(`[research] không đọc được ảnh nguồn ${row.source_name}: ${error.message}`); }
        }
        coverImage = sourceCoverCache.get(row.source_url) || '';
      }
      const usedFallback = !coverImage;
      if (!coverImage) { coverImage = `/anh-cam-nang/${row.post_id}.svg`; missing += 1; }
      db.transaction(() => {
        db.prepare("UPDATE posts SET cover_image=?,updated_at=datetime('now','localtime') WHERE id=?").run(coverImage, row.post_id);
        db.prepare("UPDATE research_items SET media_json=?,optimization_note=?,updated_at=datetime('now','localtime') WHERE id=?")
          .run(JSON.stringify({ ...(page?.media || {}), cachedImageUrl: coverImage, fallbackCover: usedFallback }), usedFallback ? 'Nguồn không cung cấp ảnh phù hợp hoặc không cho bot đọc lại; đã dùng ảnh cẩm nang dự phòng để tránh thẻ nội dung bị trống.' : 'Đã tự động bổ sung ảnh đại diện lấy từ bài hoặc website nguồn và lưu trong thư viện website.', row.item_id);
      })();
      updated += 1;
    } catch (error) {
      failed += 1;
      console.warn(`[research] chưa thể bổ sung ảnh cho bài ${row.post_id}: ${error.message}`);
    }
    await wait(120);
  }
  return { checked: rows.length, updated, missing, failed };
}

function localCoverExists(coverImage) {
  const value = String(coverImage || '').trim();
  if (/^\/anh-cam-nang\/\d+\.svg$/i.test(value)) return true;
  if (!value.startsWith('/') || value.startsWith('//')) return false;
  const publicRoot = path.resolve(__dirname, '..', 'public');
  const target = path.resolve(publicRoot, value.replace(/^\/+/, ''));
  return target.toLowerCase().startsWith(`${publicRoot.toLowerCase()}${path.sep}`) && fs.existsSync(target);
}

function localCoverIsUsable(coverImage) {
  if (!localCoverExists(coverImage)) return false;
  if (isFallbackCover(coverImage)) return true;
  const publicRoot = path.resolve(__dirname, '..', 'public');
  const target = path.resolve(publicRoot, String(coverImage).replace(/^\/+/, ''));
  const extension = path.extname(target).slice(1).toLowerCase().replace('jpeg', 'jpg');
  if (!['png', 'jpg', 'gif', 'webp'].includes(extension)) return true;
  try {
    const dimensions = readRasterDimensions(fs.readFileSync(target), extension);
    return !dimensions || (dimensions.width >= 300 && dimensions.height >= 120 && dimensions.width / Math.max(1, dimensions.height) <= 4.5);
  } catch (_) { return false; }
}

function isUniversityFallbackCover(value) {
  return !String(value || '').trim()
    || /^\/anh-truong\/\d+\.svg$/i.test(String(value || ''))
    || String(value || '') === '/img/logo.png';
}

/**
 * Sửa ảnh hồ sơ trường theo ba tầng: nguồn chính thức, tìm kiếm ảnh mở bên
 * ngoài, rồi mới giữ ảnh SVG động. Ảnh thật luôn được tải về local để tránh
 * hot-link hỏng và nguồn/giấy phép được lưu riêng trong bản ghi chương trình.
 */
async function repairUniversityProgramCovers({ limit = 60 } = {}) {
  const rows = db.prepare(`SELECT id,title,subtitle,cover_image,source_urls,cover_source_url,cover_attribution
    FROM programs WHERE category='Thông tin trường' ORDER BY published DESC,id ASC LIMIT ?`)
    .all(Math.min(200, Math.max(1, Number(limit) || 60)));
  let checked = 0; let updated = 0; let official = 0; let external = 0; let fallback = 0; let failed = 0;
  for (const row of rows) {
    const current = String(row.cover_image || '').trim();
    if (!isUniversityFallbackCover(current) && localCoverIsUsable(current)) continue;
    checked += 1;
    try {
      let coverImage = '';
      let coverSourceUrl = '';
      let coverAttribution = '';

      if (/^https:\/\//i.test(current)) {
        try {
          coverImage = await cacheResearchImage(current, row.cover_source_url || '');
          coverSourceUrl = row.cover_source_url || current;
          coverAttribution = row.cover_attribution || 'Ảnh đã được lưu lại từ nguồn bên ngoài.';
        } catch (error) {
          console.warn(`[research] ảnh từ xa của ${row.title} không còn dùng được: ${error.message}`);
        }
      }

      for (const sourceUrl of coverImage ? [] : parseSourceUrls(row.source_urls).slice(0, 5)) {
        try {
          const page = await fetchPageDocument(sourceUrl);
          coverImage = await coverImageForPage(page);
          if (coverImage) {
            coverSourceUrl = page.media?.imageUrl || page.url || sourceUrl;
            coverAttribution = `Ảnh từ website chính thức của ${row.title}.`;
            official += 1;
            break;
          }
        } catch (error) {
          console.warn(`[research] chưa lấy được ảnh chính thức cho ${row.title} tại ${sourceUrl}: ${error.message}`);
        }
      }

      if (!coverImage) {
        const found = await searchExternalUniversityCover(row);
        if (found?.cachedImageUrl) {
          coverImage = found.cachedImageUrl;
          coverSourceUrl = found.sourceUrl;
          coverAttribution = found.attribution;
          external += 1;
        }
      }

      if (!coverImage) {
        fallback += 1;
        if (!current) db.prepare("UPDATE programs SET cover_image=?,updated_at=datetime('now','localtime') WHERE id=?")
          .run(`/anh-truong/${row.id}.svg`, row.id);
        continue;
      }
      db.prepare(`UPDATE programs SET cover_image=?,cover_source_url=?,cover_attribution=?,updated_at=datetime('now','localtime') WHERE id=?`)
        .run(coverImage, coverSourceUrl, coverAttribution, row.id);
      updated += 1;
    } catch (error) {
      failed += 1;
      console.warn(`[research] chưa thể sửa ảnh trường ${row.title}: ${error.message}`);
    }
    await wait(150);
  }
  return { checked, updated, official, external, fallback, failed };
}

function parseStoredMedia(value) {
  try { return value ? JSON.parse(value) : {}; }
  catch (_) { return {}; }
}

/**
 * Chuyển ảnh hot-link thành tệp cục bộ và sửa mọi ảnh trống/hỏng.
 * Thứ tự ưu tiên: ảnh đang lưu -> ảnh bài gốc -> ảnh/logo website nguồn -> logo Sol Dream.
 */
async function repairResearchPostCovers({ limit = 250 } = {}) {
  const rows = db.prepare(`SELECT p.id post_id,p.cover_image,i.id item_id,i.url item_url,i.media_json,
      s.name source_name,s.url source_site_url,s.crawl_delay_ms
    FROM posts p
    LEFT JOIN research_items i ON i.published_post_id=p.id
    LEFT JOIN research_sources s ON s.id=i.source_id
    WHERE p.published=1
    ORDER BY datetime(p.updated_at) DESC
    LIMIT ?`).all(Math.min(500, Math.max(1, Number(limit) || 250)));
  let checked = 0; let updated = 0; let sourceFallbacks = 0; let brandFallbacks = 0; let failed = 0;
  const sourceCoverCache = new Map();
  for (const row of rows) {
    const current = String(row.cover_image || '').trim();
    if (localCoverIsUsable(current) && current !== '/img/logo.png') continue;
    checked += 1;
    try {
      let coverImage = '';
      let page = null;

      // Ảnh từ xa còn hợp lệ được tải về thư viện để không phụ thuộc hot-link.
      if (/^https:\/\//i.test(current)) {
        try { coverImage = await cacheResearchImage(current, row.item_url || row.source_site_url || ''); }
        catch (error) { console.warn(`[research] ảnh bìa bài ${row.post_id} không còn dùng được: ${error.message}`); }
      }

      if (!coverImage && row.item_url) {
        try {
          page = await fetchPageDocument(row.item_url, { retry404DelayMs: Number(row.crawl_delay_ms) || 5000 });
          coverImage = await coverImageForPage(page);
        } catch (error) {
          console.warn(`[research] không lấy được ảnh mới cho bài ${row.post_id}: ${error.message}`);
        }
      }

      if (!coverImage && row.source_site_url) {
        if (!sourceCoverCache.has(row.source_site_url)) {
          try {
            sourceCoverCache.set(row.source_site_url, await coverImageForSource({
              url: row.source_site_url,
              crawl_delay_ms: row.crawl_delay_ms,
              name: row.source_name,
            }));
          } catch (error) {
            sourceCoverCache.set(row.source_site_url, '');
            console.warn(`[research] không lấy được logo/ảnh nguồn ${row.source_name || row.source_site_url}: ${error.message}`);
          }
        }
        coverImage = sourceCoverCache.get(row.source_site_url) || '';
        if (coverImage) sourceFallbacks += 1;
      }

      if (!coverImage) { coverImage = `/anh-cam-nang/${row.post_id}.svg`; brandFallbacks += 1; }
      const media = { ...parseStoredMedia(row.media_json), ...(page?.media || {}), cachedImageUrl: coverImage, fallbackCover: isFallbackCover(coverImage) };
      db.transaction(() => {
        db.prepare("UPDATE posts SET cover_image=?,updated_at=datetime('now','localtime') WHERE id=?").run(coverImage, row.post_id);
        if (row.item_id) {
          db.prepare("UPDATE research_items SET media_json=?,optimization_note=?,updated_at=datetime('now','localtime') WHERE id=?")
            .run(JSON.stringify(media), isFallbackCover(coverImage)
              ? 'Ảnh gốc không còn truy cập được hoặc quá nhỏ; đã dùng ảnh cẩm nang Sol Dream cục bộ để thẻ bài viết luôn hiển thị ổn định.'
              : 'Đã kiểm tra và lưu ảnh bài viết hoặc ảnh/logo của website nguồn vào thư viện cục bộ.', row.item_id);
        }
      })();
      updated += 1;
    } catch (error) {
      failed += 1;
      console.warn(`[research] chưa thể sửa ảnh bài ${row.post_id}: ${error.message}`);
    }
    await wait(120);
  }
  return { checked, updated, sourceFallbacks, brandFallbacks, failed };
}

/**
 * Làm mới các nhóm ảnh đang bị lặp. Ưu tiên ảnh nội dung của từng bài; nếu
 * nguồn không còn cho đọc hoặc không có ảnh riêng thì phân phối ảnh chủ đề
 * cục bộ để danh sách không lặp một ảnh đại diện chung trên nhiều thẻ.
 */
async function refreshDuplicateResearchPostCovers({ limit = 120, fetchOriginals = true } = {}) {
  const rows = db.prepare(`SELECT p.id post_id,p.title,p.cover_image,i.id item_id,i.url item_url,i.media_json,
      s.crawl_delay_ms
    FROM posts p
    LEFT JOIN research_items i ON i.published_post_id=p.id
    LEFT JOIN research_sources s ON s.id=i.source_id
    WHERE p.published=1 AND p.cover_image IN (
      SELECT cover_image FROM posts WHERE published=1 AND TRIM(COALESCE(cover_image,''))<>''
      GROUP BY cover_image HAVING COUNT(*)>1
    )
    ORDER BY p.cover_image,p.id
    LIMIT ?`).all(Math.min(500, Math.max(1, Number(limit) || 120)));
  const keptByCover = new Set();
  const assigned = new Set();
  let checked = 0; let refreshed = 0; let themed = 0; let failed = 0;
  for (const row of rows) {
    const current = String(row.cover_image || '');
    // Giữ một đại diện của mỗi nhóm nếu đó là ảnh thật; những bản còn lại
    // phải có ảnh riêng hoặc ảnh chủ đề khác.
    if (!isFallbackCover(current) && !keptByCover.has(current)) {
      keptByCover.add(current); assigned.add(current); continue;
    }
    checked += 1;
    try {
      let coverImage = '';
      let page = null;
      if (fetchOriginals && row.item_url) {
        try {
          page = await fetchPageDocument(row.item_url, { retry404DelayMs: Number(row.crawl_delay_ms) || 5000 });
          coverImage = await coverImageForPage(page);
        } catch (error) {
          console.warn(`[research] chưa lấy được ảnh riêng cho bài ${row.post_id}: ${error.message}`);
        }
      }
      if (!coverImage || coverImage === current || assigned.has(coverImage)) {
        coverImage = `/anh-cam-nang/${row.post_id}.svg`;
        themed += 1;
      }
      assigned.add(coverImage);
      const media = { ...parseStoredMedia(row.media_json), ...(page?.media || {}), cachedImageUrl: coverImage, fallbackCover: isFallbackCover(coverImage) };
      db.transaction(() => {
        db.prepare("UPDATE posts SET cover_image=?,updated_at=datetime('now','localtime') WHERE id=?").run(coverImage, row.post_id);
        if (row.item_id) db.prepare("UPDATE research_items SET media_json=?,optimization_note=?,updated_at=datetime('now','localtime') WHERE id=?")
          .run(JSON.stringify(media), isFallbackCover(coverImage)
            ? 'Nguồn không có ảnh riêng dùng được; hệ thống đã chọn ảnh chủ đề cục bộ để tránh lặp ảnh giữa các bài.'
            : 'Đã thay ảnh đại diện dùng chung bằng ảnh riêng lấy từ nội dung bài gốc.', row.item_id);
      })();
      refreshed += 1;
    } catch (error) {
      failed += 1;
      console.warn(`[research] chưa thể tách ảnh trùng của bài ${row.post_id}: ${error.message}`);
    }
    await wait(120);
  }
  return { checked, refreshed, themed, failed };
}

async function autoPublishResearchItems(source, insertedIds = []) {
  if (!source.auto_publish_non_school || source.source_type === 'university-directory') return { published: 0, failed: 0 };
  const backlog = db.prepare(`SELECT id FROM research_items WHERE source_id=? AND status='pending'
    AND suggested_section NOT IN ('Thông tin trường','Chương trình du học')
    AND optimization_note NOT LIKE '%chỉ mục tìm kiếm%'
    ORDER BY datetime(created_at) ASC LIMIT 8`).all(source.id).map((row) => row.id);
  const ids = [...new Set([...insertedIds, ...backlog])].slice(0, 12);
  let published = 0; let failed = 0;
  for (const id of ids) {
    const item = db.prepare('SELECT * FROM research_items WHERE id=?').get(id);
    if (!item || item.status !== 'pending' || requiresManualApproval(item.suggested_section)) continue;
    try { const result = await publishResearchItem(source, item); if (result.published) published += 1; }
    catch (error) {
      failed += 1;
      const errorMessage = String(error.message || '');
      db.prepare("UPDATE research_items SET optimization_note=?,updated_at=datetime('now','localtime') WHERE id=?")
        .run(`Chưa tự đăng: ${errorMessage.slice(0, 360)} Mục vẫn được giữ để thử lại hoặc biên tập thủ công.`, item.id);
      // A quota/rate-limit applies to the whole run, not just this article.
      // Stop here so the scheduler can retry the untouched queue later.
      if (/\b429\b|quota|RESOURCE_EXHAUSTED|rate.?limit|tạm nghỉ/i.test(errorMessage)) break;
    }
  }
  if (published) {
    try { require('./websiteKnowledge').syncWebsiteKnowledge({ force: true }); }
    catch (error) { console.error('[research] chat index refresh error:', error.message); }
  }
  return { published, failed };
}

async function runPendingEditorialQueue({ limit } = {}) {
  const leaseKey = 'research_editorial_queue_lease';
  const leaseToken = crypto.randomUUID();
  const leaseUntil = Date.now() + 60 * 60 * 1000;
  const acquired = db.transaction(() => {
    const current = db.prepare('SELECT value FROM system_meta WHERE key=?').get(leaseKey)?.value || '';
    const currentUntil = Number(String(current).split('|')[1] || 0);
    if (currentUntil > Date.now()) return false;
    db.prepare(`INSERT INTO system_meta (key,value,updated_at) VALUES (?,?,datetime('now','localtime'))
      ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at`)
      .run(leaseKey, `${leaseToken}|${leaseUntil}`);
    return true;
  })();
  if (!acquired) return { checked: 0, published: 0, failed: 0, remaining: -1, stoppedByQuota: false, alreadyRunning: true };

  try {
  const batchSize = Math.min(200, Math.max(1, Number(limit || process.env.GEMINI_EDITOR_BATCH_SIZE || 80)));
  const rows = db.prepare(`SELECT i.id item_id,s.* FROM research_items i
    JOIN research_sources s ON s.id=i.source_id
    WHERE i.status='pending' AND s.active=1 AND s.auto_publish_non_school=1
      AND i.suggested_section NOT IN ('Thông tin trường','Chương trình du học')
      AND i.optimization_note NOT LIKE '%chỉ mục tìm kiếm%'
    ORDER BY datetime(i.created_at) ASC,i.id ASC LIMIT ?`).all(batchSize);
  let checked = 0; let published = 0; let failed = 0; let stoppedByQuota = false;
  for (const row of rows) {
    checked += 1;
    const item = db.prepare('SELECT * FROM research_items WHERE id=?').get(row.item_id);
    if (!item || item.status !== 'pending') continue;
    try {
      const result = await publishResearchItem(row, item);
      if (result.published) published += 1;
    } catch (error) {
      failed += 1;
      const errorMessage = String(error.message || '');
      db.prepare("UPDATE research_items SET optimization_note=?,updated_at=datetime('now','localtime') WHERE id=?")
        .run(`Chưa tự đăng: ${errorMessage.slice(0, 360)} Hệ thống sẽ tự chuyển model và thử lại ở lượt tiếp theo.`, item.id);
      if (/\b429\b|quota|RESOURCE_EXHAUSTED|tất cả model|giới hạn lượt gọi|tạm nghỉ/i.test(errorMessage)) {
        stoppedByQuota = true;
        break;
      }
    }
  }
  if (published) {
    try { require('./websiteKnowledge').syncWebsiteKnowledge({ force: true }); }
    catch (error) { console.error('[research] chat index refresh error:', error.message); }
  }
  const remaining = db.prepare(`SELECT COUNT(*) count FROM research_items i
    JOIN research_sources s ON s.id=i.source_id
    WHERE i.status='pending' AND s.active=1 AND s.auto_publish_non_school=1
      AND i.suggested_section NOT IN ('Thông tin trường','Chương trình du học')
      AND i.optimization_note NOT LIKE '%chỉ mục tìm kiếm%'`).get().count;
  return { checked, published, failed, remaining, stoppedByQuota, alreadyRunning: false };
  } finally {
    db.prepare('DELETE FROM system_meta WHERE key=? AND value LIKE ?').run(leaseKey, `${leaseToken}|%`);
  }
}

async function crawlSource(source) {
  const delay = Math.min(15000, Math.max(0, Number(source.crawl_delay_ms) || 0));
  if (delay) await wait(delay);
  if (!(await robotsAllows(source.url))) {
    const indexedItems = await discoverOfficialSourceItems(source);
    if (!indexedItems.length) throw new Error('Nguồn không cho phép thu thập trực tiếp qua robots.txt; Google Search và OpenAI Web Search chưa trả về dữ liệu chính thức đủ tin cậy.');
    const inserted = insertResearchItems(source, indexedItems);
    db.prepare("UPDATE research_sources SET last_crawled_at=datetime('now','localtime'),last_status=?,last_error='',updated_at=datetime('now','localtime') WHERE id=?")
      .run(`Đã đọc qua chỉ mục website chính thức: tìm ${indexedItems.length} mục, có ${inserted.added} mục mới; tất cả chờ duyệt`, source.id);
    return { source: source.name, found: indexedItems.length, added: inserted.added, autoPublished: 0, discoveryMode: 'official-search-index' };
  }
  if (source.source_type === 'university-directory') return crawlUniversityDirectory(source);
  const page = await fetchWithLimits(source.url, { retry404DelayMs: delay || 5000 });
  const landingPage = sourcePageCandidate(page.text, page.url, source);
  const linkedItems = extractCandidates(page.text, page.url, source.keywords);
  const items = [...new Map([...(landingPage ? [landingPage] : []), ...linkedItems].map((item) => [item.url, item])).values()];
  const inserted = insertResearchItems(source, items);
  const automatic = source.auto_publish_non_school ? await autoPublishResearchItems(source, inserted.ids) : { published: 0, failed: 0 };
  const status = inserted.added
    ? `Đọc thành công ${items.length} liên kết; có ${inserted.added} mục mới; tự đăng ${automatic.published}`
    : `Đọc thành công ${items.length} liên kết; không có mục mới (dữ liệu đã tồn tại)`;
  db.prepare("UPDATE research_sources SET last_crawled_at=datetime('now','localtime'),last_status=?,last_error='',updated_at=datetime('now','localtime') WHERE id=?").run(status, source.id);
  return { source: source.name, found: items.length, added: inserted.added, autoPublished: automatic.published, autoFailed: automatic.failed };
}

async function runResearchBot({ sourceId } = {}) {
  const sources = sourceId ? db.prepare('SELECT * FROM research_sources WHERE id=? AND active=1').all(sourceId) : db.prepare('SELECT * FROM research_sources WHERE active=1 ORDER BY id').all();
  const results = [];
  for (const source of sources) {
    try { results.push(await crawlSource(source)); }
    catch (error) {
      const blocked = /robots\.txt|không cho phép thu thập/i.test(String(error.message || ''));
      db.prepare("UPDATE research_sources SET last_crawled_at=datetime('now','localtime'),last_status=?,last_error=?,updated_at=datetime('now','localtime') WHERE id=?")
        .run(blocked ? 'Nguồn chặn thu thập tự động' : 'Lỗi kết nối nguồn', String(error.message).slice(0, 500), source.id);
      results.push({ source: source.name, error: error.message });
    }
  }
  const covers = await backfillResearchPostCovers({ sourceId });
  const universityCovers = await repairUniversityProgramCovers();
  results.coverImagesUpdated = covers.updated;
  results.coverImagesChecked = covers.checked;
  results.universityCoverImagesUpdated = universityCovers.updated;
  results.universityCoverImagesChecked = universityCovers.checked;
  return results;
}

async function fetchPageText(url) {
  const page = await fetchPageDocument(url);
  return { url: page.url, text: page.text, media: page.media, faqs: page.faqs, attachments: page.attachments, html: page.html };
}

function optimizeStoredResearchItems() {
  const rows = db.prepare(`SELECT i.*,s.name source_name,s.source_type FROM research_items i
    JOIN research_sources s ON s.id=i.source_id`).all();
  const update = db.prepare(`UPDATE research_items SET title=?,excerpt=?,suggested_section=?,quality_score=?,optimization_note=?,updated_at=datetime('now','localtime') WHERE id=?`);
  let optimized = 0;
  db.transaction(() => rows.forEach((row) => {
    const item = optimizeCrawledItem({
      title: row.title, url: row.url, excerpt: row.excerpt,
      publishedAt: row.published_at, suggestedSection: row.suggested_section,
    }, { name: row.source_name, source_type: row.source_type });
    if (!item) return;
    update.run(item.title, item.excerpt, item.suggestedSection, item.qualityScore, item.optimizationNote, row.id);
    optimized += 1;
  }))();
  return optimized;
}

function ensureStoredResearchOptimization() {
  const version = 'crawler-normalization-v1';
  const applied = db.prepare('SELECT value FROM system_meta WHERE key=?').get('research_optimization_version');
  if (applied?.value === version) return { applied: false, optimized: 0 };
  const optimized = optimizeStoredResearchItems();
  db.prepare(`INSERT INTO system_meta (key,value,updated_at) VALUES (?,?,datetime('now','localtime'))
    ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at`)
    .run('research_optimization_version', version);
  return { applied: true, optimized };
}

module.exports = {
  runResearchBot, crawlSource, fetchPageText, fetchPageDocument, fetchRenderedPageDocument, buildEditorialSource, autoPublishResearchItems,
  runPendingEditorialQueue,
  backfillResearchPostCovers, repairResearchPostCovers, refreshDuplicateResearchPostCovers, repairUniversityProgramCovers,
  cacheResearchImage, coverImageForPage, coverImageForSource, searchExternalUniversityCover,
  parseWikimediaImageResults, parseOpenverseImageResults, externalUniversityImageScore, fallbackCoverFor, DEFAULT_RESEARCH_COVER,
  extractCandidates, extractUniversityDirectoryCandidates, extractMediaFromHtml, extractFaqsFromHtml, extractAttachmentsFromHtml,
  extractOfficialUniversityWebsite, extractClientRedirect,
  extractPageTitle, extractPublishedDate, structuredTextFromHtml, extractSitemapLocations, extractFeedLinks, extractFeedEntries,
  classifyInformationBlock, classifySourceContent, classifiedSourceText, persistResearchSourceSnapshot, finalizeEditorialSource,
  storedEditorialSource,
  extractUniversityResourceCandidates, universityResourceKind, universityResourceScore,
  sourcePageCandidate, directoryPageCount, optimizeCrawledItem, optimizeStoredResearchItems, ensureStoredResearchOptimization,
  parseRobots, classifySection, requiresManualApproval, fingerprint, attachmentMarkup,
};
