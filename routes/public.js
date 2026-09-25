'use strict';
const express = require('express');
const router = express.Router();
const db = require('../db');
const { decorate, programPublicPath, slugify } = require('../lib/util');
const {
  abs, SITE_URL, LOGO_URL, authorEntity, buildRobotsTxt, generateUniversitySchema,
  generateFAQSchema, generateBreadcrumbSchema, getVerifiedAdvisor,
} = require('../lib/seo');
const { getAllUniversities, getUniversityById } = require('../lib/universityPages');
const { getCourses, getCourseById, getCourseNotice, getCourseUpdatedDate } = require('../lib/courseKnowledge');
const { getSiteFaqs, groupFaqs, getUniversityFaqs } = require('../lib/siteFaq');
const { generateSitemapXml } = require('../lib/sitemap');
const { generateRssXml } = require('../lib/feed');
const { INDEXNOW_KEY } = require('../lib/indexNow');
const { generateLlmsTxt } = require('../lib/llms');
const { getHomepageStats, getHomepageStatsSource } = require('../lib/homepageStats');
const { getAboutSections } = require('../lib/aboutContent');
const koreaLife = require('../data/korea-life.json');

function jsonLdScript(payload) {
  return `<script type="application/ld+json">${JSON.stringify(payload).replace(/</g, '\\u003c')}</script>`;
}

function isoDateTime(value) {
  const text = String(value || '').trim().replace(' ', 'T');
  if (!text) return '';
  return /(?:Z|[+-]\d{2}:?\d{2})$/i.test(text) ? text : `${text}+07:00`;
}

function detailRobots(item) {
  return item.noindex ? 'noindex, follow, max-snippet:-1, max-image-preview:large' : 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1';
}

function setFreshnessHeaders(res, value) {
  const date = new Date(String(value || '').replace(' ', 'T'));
  if (!Number.isNaN(date.getTime())) res.set('Last-Modified', date.toUTCString());
  res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
}

function getRelatedFaqs(originType, originId) {
  return db.prepare(`SELECT id,question,answer,source_url FROM faqs
    WHERE published=1 AND origin_type=? AND origin_id=? ORDER BY sort_order,id`).all(originType, String(originId));
}

function escapeSvgText(value) {
  return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function coverTitleLines(value) {
  const words = String(value || 'Cẩm nang du học Hàn Quốc').trim().split(/\s+/u).filter(Boolean);
  const lines = [];
  let line = '';
  // Vietnamese uppercase glyphs and wide letters take more space than a raw
  // character count suggests. This weighted wrap keeps every title inside the
  // dedicated text column and away from the illustration.
  const width = (text) => Array.from(text).reduce((sum, char) => sum + (/\s/u.test(char) ? 0.45 : /[MWQĐÔƠƯ]/iu.test(char) ? 1.28 : /[ilI1]/u.test(char) ? 0.55 : 1), 0);
  for (let index = 0; index < words.length; index += 1) {
    const candidate = line ? `${line} ${words[index]}` : words[index];
    if (line && width(candidate) > 25) {
      lines.push(line);
      line = words[index];
    } else line = candidate;
    if (lines.length === 2) {
      const rest = [line, ...words.slice(index + 1)].join(' ');
      line = width(rest) > 27 ? `${Array.from(rest).slice(0, 25).join('').replace(/\s+\S*$/u, '')}…` : rest;
      break;
    }
  }
  if (line && lines.length < 3) lines.push(line);
  return lines.slice(0, 3);
}

function sendDynamicEditorialCover(res, item, id, label) {
  const palettes = [
    ['#25133d', '#bd1e67', '#ffd166'], ['#14294a', '#7e2a73', '#77dce5'],
    ['#3a174c', '#d54e72', '#ffd274'], ['#152b43', '#16818a', '#83e3d7'],
    ['#421342', '#9f1d67', '#f8c94f'], ['#291742', '#b52c83', '#ffcc69'],
  ];
  const colors = palettes[id % palettes.length];
  const titleLines = coverTitleLines(item.title);
  const titleSize = titleLines.some((line) => line.length > 25) ? 40 : 44;
  const lines = titleLines.map((line, index) => `<text x="76" y="${274 + index * 57}" fill="#fff" font-family="Segoe UI,Arial,sans-serif" font-size="${titleSize}" font-weight="750">${escapeSvgText(line)}</text>`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" role="img" aria-label="${escapeSvgText(item.title)}"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="${colors[0]}"/><stop offset="1" stop-color="${colors[1]}"/></linearGradient><clipPath id="title-safe"><rect x="70" y="210" width="690" height="220" rx="8"/></clipPath></defs><rect width="1200" height="630" rx="36" fill="url(#g)"/><circle cx="1050" cy="92" r="230" fill="${colors[2]}" opacity=".17"/><path d="M0 505c230-135 405 65 635-48 225-110 385-25 565-105v278H0Z" fill="#fff" opacity=".08"/><g transform="translate(875 158) scale(.82)" fill="none" stroke="#fff" stroke-width="16" stroke-linejoin="round" opacity=".92"><path d="M150 0c45 28 92 51 150 63v137c0 110-72 185-150 220C72 385 0 310 0 200V63C58 51 105 28 150 0Z"/><path d="m76 211 48 48 102-113"/></g><g transform="translate(76 74)"><text x="0" y="44" fill="${colors[2]}" font-family="Segoe UI Light,Helvetica Neue,Arial,sans-serif" font-size="43" font-weight="300" letter-spacing="-2">Sol Dream</text><path d="M0 66h42M222 66h42" stroke="${colors[2]}" stroke-width="2"/><text x="55" y="72" fill="${colors[2]}" font-family="Segoe UI,Arial,sans-serif" font-size="15" font-weight="600" letter-spacing="8">EDUCATION</text></g><text x="76" y="194" fill="#fff" opacity=".78" font-family="Segoe UI,Arial,sans-serif" font-size="22" font-weight="600" letter-spacing="1.5">${escapeSvgText(label || item.category || 'Du học Hàn Quốc')}</text><g clip-path="url(#title-safe)">${lines}</g></svg>`;
  res.set('Content-Type', 'image/svg+xml; charset=utf-8');
  res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
  return res.send(svg);
}

router.get('/anh-cam-nang/:id.svg', (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return next();
  const post = db.prepare('SELECT id,title,category FROM posts WHERE id=?').get(id);
  if (!post) return next();
  return sendDynamicEditorialCover(res, post, id, post.category || 'Cẩm nang du học');
});

router.get('/anh-truong/:id.svg', (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return next();
  const program = db.prepare('SELECT id,title,category FROM programs WHERE id=?').get(id);
  if (!program) return next();
  return sendDynamicEditorialCover(res, program, id, 'HỒ SƠ TRƯỜNG HÀN QUỐC');
});

// Home
router.get('/', (req, res) => {
  const posts = db.prepare('SELECT * FROM posts WHERE published = 1 ORDER BY datetime(created_at) DESC LIMIT 3').all().map(decorate);
  const programs = db.prepare('SELECT * FROM programs WHERE published = 1 ORDER BY sort_order ASC, id ASC LIMIT 6').all().map(decorate);
  const testimonials = db.prepare('SELECT * FROM testimonials WHERE published = 1 ORDER BY sort_order ASC, id ASC LIMIT 8').all();
  const courses = getCourses();
  const homepageStats = getHomepageStats();
  const homepageStatsSource = getHomepageStatsSource();
  const homepageAboutSections = getAboutSections('home');
  const jsonLd = jsonLdScript({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${abs('/')}#page`,
    url: abs('/'),
    name: 'SOL DREAM EDUCATION - Trung tâm Hàn ngữ và Du học Hàn Quốc',
    description: 'Thông tin khóa học tiếng Hàn và dịch vụ tư vấn du học Hàn Quốc tại SOL DREAM EDUCATION.',
    inLanguage: 'vi-VN',
    about: { '@id': `${SITE_URL}/#organization` },
    mainEntity: {
      '@type': 'ItemList',
      name: 'Khóa học tại SOL DREAM EDUCATION',
      itemListElement: courses.map((course, index) => ({
        '@type': 'ListItem', position: index + 1, name: course.name, url: abs(course.url),
      })),
    },
  });
  res.render('home', { posts, programs, testimonials, homepageStats, homepageStatsSource, homepageAboutSections, jsonLd, showChatHint: true });
});

router.get('/tro-ly-du-hoc', (req, res) => {
  const url = abs('/tro-ly-du-hoc');
  const jsonLd = jsonLdScript([
    {
      '@context': 'https://schema.org', '@type': 'WebPage', '@id': `${url}#page`, url,
      name: 'Trợ lý tư vấn du học Hàn Quốc SolDream Support',
      description: 'Trợ lý tra cứu khóa học, trường đại học, chương trình du học Hàn Quốc và thông tin tư vấn đã công bố của SOL DREAM EDUCATION.',
      inLanguage: 'vi-VN', isPartOf: { '@id': `${SITE_URL}/#website` },
      about: { '@id': `${SITE_URL}/#organization` },
    },
    generateBreadcrumbSchema([{ name: 'Trang chủ', url: '/' }, { name: 'Trợ lý tư vấn du học', url: '/tro-ly-du-hoc' }]),
  ]);
  res.render('chat-page', {
    title: 'Trợ lý tư vấn du học Hàn Quốc | SOL DREAM EDUCATION',
    description: 'Hỏi đáp về khóa học tiếng Hàn, trường đại học, học phí, học bổng, hồ sơ và chương trình du học Hàn Quốc cùng SolDream Support.',
    canonical: url,
    jsonLd,
    hideFloatingChat: true,
    hideFooter: true,
    chatPageMode: true,
  });
});

router.get('/gioi-thieu', (req, res) => {
  const url = abs('/gioi-thieu');
  const aboutSections = getAboutSections('page');
  const jsonLd = jsonLdScript([
    {
      '@context': 'https://schema.org', '@type': 'AboutPage', '@id': `${url}#page`, url,
      name: 'Giới thiệu SOL DREAM EDUCATION',
      description: 'Thông tin nhận diện, dịch vụ, địa chỉ và phạm vi hoạt động của SOL DREAM EDUCATION.',
      inLanguage: 'vi-VN', isPartOf: { '@id': `${SITE_URL}/#website` },
      mainEntity: { '@id': `${SITE_URL}/#organization` },
    },
    generateBreadcrumbSchema([{ name: 'Trang chủ', url: '/' }, { name: 'Giới thiệu', url: '/gioi-thieu' }]),
  ]);
  res.render('about', {
    aboutSections,
    title: 'Giới thiệu SOL DREAM EDUCATION | Trung tâm Hàn ngữ & Du học Hàn Quốc',
    description: 'SOL DREAM EDUCATION là trung tâm Hàn ngữ và tư vấn du học Hàn Quốc tại Tân Phú, TP.HCM, hoạt động từ năm 2019.',
    canonical: url,
    jsonLd,
  });
});

router.get('/cau-hoi-thuong-gap', (req, res) => {
  const faqs = getSiteFaqs();
  const url = abs('/cau-hoi-thuong-gap');
  const jsonLd = jsonLdScript([
    {
      ...generateFAQSchema(faqs), '@id': `${url}#page`, url,
      name: 'Câu hỏi thường gặp về khóa học và du học Hàn Quốc', inLanguage: 'vi-VN',
      isPartOf: { '@id': `${SITE_URL}/#website` }, publisher: { '@id': `${SITE_URL}/#organization` },
    },
    generateBreadcrumbSchema([{ name: 'Trang chủ', url: '/' }, { name: 'Câu hỏi thường gặp', url: '/cau-hoi-thuong-gap' }]),
  ]);
  res.render('faq', {
    faqs,
    faqGroups: groupFaqs(faqs),
    title: 'Câu hỏi thường gặp | SOL DREAM EDUCATION',
    description: 'Giải đáp về khóa học tiếng Hàn, tư vấn du học, dữ liệu trường đại học và cách liên hệ SOL DREAM EDUCATION.',
    canonical: url,
    jsonLd,
  });
});

router.get('/cuoc-song-han-quoc', (req, res) => {
  const url = abs('/cuoc-song-han-quoc');
  const lifeFaqs = koreaLife.topics.map((topic) => ({ question: `${topic.title}: du học sinh cần lưu ý gì?`, answer: topic.summary }));
  const jsonLd = jsonLdScript([
    { '@context': 'https://schema.org', '@type': 'WebPage', '@id': `${url}#page`, url, name: koreaLife.title,
      description: koreaLife.blufSummary, dateModified: koreaLife.lastUpdated, inLanguage: 'vi-VN',
      isPartOf: { '@id': `${SITE_URL}/#website` }, publisher: { '@id': `${SITE_URL}/#organization` },
      citation: [...new Set(koreaLife.topics.map((topic) => topic.sourceUrl))] },
    { ...generateFAQSchema(lifeFaqs), '@id': `${url}#faq`, url, inLanguage: 'vi-VN' },
    generateBreadcrumbSchema([{ name: 'Trang chủ', url: '/' }, { name: 'Sinh hoạt tại Hàn Quốc', url: '/cuoc-song-han-quoc' }]),
  ]);
  res.render('korea-life', { life: koreaLife, title: `${koreaLife.title} | SOL DREAM EDUCATION`, description: koreaLife.blufSummary, canonical: url, jsonLd });
});

// Course hub: exposes course information as crawlable text instead of home-page cards only.
router.get('/khoa-hoc', (req, res) => {
  const courses = getCourses();
  const url = abs('/khoa-hoc');
  const jsonLd = jsonLdScript({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage', '@id': `${url}#page`, url,
        name: 'Khóa học tại SOL DREAM EDUCATION',
        description: 'Danh sách khóa học tiếng Hàn và tiếng Anh tại SOL DREAM EDUCATION.',
        inLanguage: 'vi-VN', isPartOf: { '@id': `${SITE_URL}/#website` },
        publisher: { '@id': `${SITE_URL}/#organization` }, mainEntity: { '@id': `${url}#list` },
      },
      {
        '@type': 'ItemList', '@id': `${url}#list`, name: 'Danh sách khóa học tại SOL DREAM EDUCATION',
        itemListElement: courses.map((course, index) => ({
          '@type': 'ListItem', position: index + 1, url: abs(course.url),
        })),
      },
      ...courses.map((course) => ({
        '@type': 'Course', '@id': `${abs(course.url)}#course`, name: course.name,
        description: course.description.slice(0, 60), url: abs(course.url),
        provider: { '@id': `${SITE_URL}/#organization` },
      })),
      generateBreadcrumbSchema([{ name: 'Trang chủ', url: '/' }, { name: 'Khóa học', url: '/khoa-hoc' }]),
    ],
  });
  res.render('courses', {
    courses,
    courseNotice: getCourseNotice(),
    title: 'Khóa học tiếng Hàn tại TP.HCM | SOL DREAM EDUCATION',
    description: 'Các khóa tiếng Hàn sơ cấp, giao tiếp, phát âm và cấp tốc tại SOL DREAM EDUCATION, Tân Phú, TP.HCM.',
    canonical: url,
    jsonLd,
  });
});

router.get('/khoa-hoc/:id', (req, res, next) => {
  const course = getCourseById(req.params.id);
  if (!course) return next();
  const url = abs(course.url);
  const price = Number(course.financials?.priceVndTotal);
  const generatedCourseFaqs = getRelatedFaqs('course', course.id);
  const courseFaqs = generatedCourseFaqs.length ? generatedCourseFaqs : [
    { question: `${course.name} phù hợp với ai?`, answer: `${course.name} phù hợp với ${course.audience.toLowerCase()}. SOL DREAM EDUCATION kiểm tra mục tiêu, nền tảng hiện tại và thời gian dự kiến trước khi tư vấn lớp để học viên không đăng ký một lộ trình không phù hợp.` },
    { question: `Học phí ${course.name} là bao nhiêu?`, answer: `${course.price}. ${course.financials.priceNote}. Lịch học, thời lượng, ưu đãi và khoản phí áp dụng cần được xác nhận trực tiếp với SOL DREAM EDUCATION tại thời điểm đăng ký.` },
    { question: `${course.name} có yêu cầu ${course.entryExamLabel} đầu vào không?`, answer: `${course.entryExamRequirement || `Website chưa công bố yêu cầu ${course.entryExamLabel} đầu vào cho khóa học này.`} ${course.requirements.status}. Học viên sẽ được kiểm tra mục tiêu và trình độ thực tế trước khi xếp lớp.` },
  ];
  const jsonLd = jsonLdScript([
    {
      '@context': 'https://schema.org', '@type': 'Course', '@id': `${url}#course`,
      name: course.name, description: course.blufSummary, url,
      inLanguage: course.language === 'Tiếng Anh' ? 'en' : 'ko',
      provider: { '@id': `${SITE_URL}/#organization` },
      dateModified: getCourseUpdatedDate(),
      ...(Number.isFinite(price) && price > 0 ? { offers: { '@type': 'Offer', price, priceCurrency: 'VND', url, availability: 'https://schema.org/InStock' } } : {}),
    },
    { ...generateFAQSchema(courseFaqs), '@id': `${url}#faq`, url, inLanguage: 'vi-VN' },
    generateBreadcrumbSchema([{ name: 'Trang chủ', url: '/' }, { name: 'Khóa học', url: '/khoa-hoc' }, { name: course.name, url: course.url }]),
  ]);
  res.render('course-detail', {
    course, courseFaqs, courseNotice: getCourseNotice(),
    title: `${course.name} | SOL DREAM EDUCATION`, description: course.blufSummary,
    canonical: url, jsonLd,
  });
});

// News listing
router.get('/tin-tuc', (req, res) => {
  const posts = db.prepare('SELECT * FROM posts WHERE published = 1 ORDER BY datetime(created_at) DESC').all().map(decorate);
  const url = abs('/tin-tuc');
  const jsonLd = jsonLdScript({
    '@context': 'https://schema.org', '@graph': [{
    '@type': 'CollectionPage', '@id': `${url}#page`, url,
    name: 'Tin tức và cẩm nang từ SOL DREAM EDUCATION',
    description: 'Cẩm nang, kinh nghiệm và câu chuyện du học Hàn Quốc từ SOL DREAM EDUCATION.',
    inLanguage: 'vi-VN', isPartOf: { '@id': `${SITE_URL}/#website` }, publisher: { '@id': `${SITE_URL}/#organization` },
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: posts.map((post, index) => ({
        '@type': 'ListItem', position: index + 1, name: post.title, url: abs(`/tin-tuc/${post.slug}`),
      })),
    }}, generateBreadcrumbSchema([{ name: 'Trang chủ', url: '/' }, { name: 'Cẩm nang du học', url: '/tin-tuc' }])],
  });
  res.render('news-list', {
    posts,
    title: 'Cẩm nang du học Hàn Quốc | SOL DREAM EDUCATION',
    description: 'Cẩm nang, kinh nghiệm và câu chuyện du học Hàn Quốc từ Trung tâm Hàn ngữ Sol Dream Education.',
    canonical: url,
    jsonLd,
  });
});

// News detail
router.get('/tin-tuc/:slug', (req, res, next) => {
  const row = db.prepare('SELECT * FROM posts WHERE slug = ? AND published = 1').get(req.params.slug);
  if (!row) return next();
  const post = decorate(row);
  if (post.noindex) res.set('X-Robots-Tag', 'noindex, follow');
  const url = abs('/tin-tuc/' + post.slug);
  const ogImg = post.cover_image ? abs(post.cover_image) : (process.env.OG_IMAGE || (SITE_URL + '/img/logo.png'));
  const publishedTime = isoDateTime(post.created_at);
  const modifiedTime = isoDateTime(post.updated_at || post.created_at);
  const relatedPosts = db.prepare('SELECT * FROM posts WHERE published = 1 AND id != ? ORDER BY CASE WHEN category = ? THEN 0 ELSE 1 END, datetime(updated_at) DESC LIMIT 3').all(post.id, post.category).map(decorate);
  const relatedFaqs = getRelatedFaqs('post', post.id);
  setFreshnessHeaders(res, post.updated_at || post.created_at);
  const jsonLd = jsonLdScript({
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Trang chủ', item: abs('/') },
        { '@type': 'ListItem', position: 2, name: 'Cẩm nang du học', item: abs('/tin-tuc') },
        { '@type': 'ListItem', position: 3, name: post.title, item: url },
      ] },
      {
        '@type': 'Article', '@id': `${url}#article`, headline: post.title,
        description: post.excerpt, image: [ogImg], articleSection: post.category,
        wordCount: post.wordCount, inLanguage: 'vi-VN', isAccessibleForFree: true,
        datePublished: publishedTime,
        dateModified: modifiedTime,
        author: authorEntity(post),
        publisher: { '@id': `${SITE_URL}/#organization`, '@type': 'EducationalOrganization', name: 'SOL DREAM EDUCATION', logo: { '@type': 'ImageObject', url: LOGO_URL } },
        mainEntityOfPage: { '@type': 'WebPage', '@id': url },
        ...(post.sourceLinks.length ? { citation: post.sourceLinks } : {}),
        ...(post.focus_keyword ? { keywords: post.focus_keyword } : {}),
      },
      ...(relatedFaqs.length ? [{ ...generateFAQSchema(relatedFaqs), '@id': `${url}#faq`, url, inLanguage: 'vi-VN' }] : []),
    ],
  });
  res.render('news-detail', {
    post, relatedPosts, relatedFaqs,
    title: post.seo_title || `${post.title} - SOL DREAM EDUCATION`,
    description: post.meta_description || post.excerpt,
    canonical: url,
    ogType: 'article',
    ogImage: ogImg,
    ogImageAlt: post.title,
    publishedTime,
    modifiedTime,
    robots: detailRobots(post),
    jsonLd
  });
});

// Study-abroad programs listing
router.get('/du-hoc', (req, res) => {
  const programs = db.prepare("SELECT * FROM programs WHERE published = 1 AND category='Chương trình du học' ORDER BY sort_order ASC, id ASC").all().map(decorate);
  const url = abs('/du-hoc');
  const jsonLd = jsonLdScript({
    '@context': 'https://schema.org', '@graph': [{ '@type': 'CollectionPage', '@id': `${url}#page`, url,
    name: 'Chương trình du học Hàn Quốc | SOL DREAM EDUCATION',
    description: 'Chương trình tư vấn du học Hàn Quốc, chọn trường, dự toán chi phí và chuẩn bị hồ sơ cùng SOL DREAM EDUCATION.',
    inLanguage: 'vi-VN', isPartOf: { '@id': `${SITE_URL}/#website` }, publisher: { '@id': `${SITE_URL}/#organization` },
    mainEntity: { '@type': 'ItemList', itemListElement: programs.map((program, index) => ({
      '@type': 'ListItem', position: index + 1, name: program.title, url: abs(`/du-hoc/${program.slug}`),
    })) } }, generateBreadcrumbSchema([{ name: 'Trang chủ', url: '/' }, { name: 'Du học Hàn Quốc', url: '/du-hoc' }])],
  });
  res.render('duhoc-list', {
    programs,
    title: 'Chương trình du học Hàn Quốc | SOL DREAM EDUCATION',
    description: 'Thông tin chương trình du học Hàn Quốc, điều kiện, chi phí và lộ trình hồ sơ do SOL DREAM EDUCATION tổng hợp.',
    canonical: url,
    jsonLd,
  });
});

// Program detail
router.get('/du-hoc/:slug', (req, res, next) => {
  const row = db.prepare('SELECT * FROM programs WHERE slug = ? AND published = 1').get(req.params.slug);
  if (!row) return next();
  if (row.category === 'Thông tin trường') return res.redirect(301, `/truong-dai-hoc/${row.slug}`);
  const program = decorate(row);
  if (program.noindex) res.set('X-Robots-Tag', 'noindex, follow');
  const url = abs('/du-hoc/' + program.slug);
  const ogImg = program.cover_image ? abs(program.cover_image) : (process.env.OG_IMAGE || (SITE_URL + '/img/logo.png'));
  const publishedTime = isoDateTime(program.created_at);
  const modifiedTime = isoDateTime(program.updated_at || program.created_at);
  const relatedPrograms = db.prepare('SELECT * FROM programs WHERE published = 1 AND category = ? AND id != ? ORDER BY sort_order ASC, datetime(updated_at) DESC LIMIT 3').all(program.category, program.id).map(decorate);
  const relatedFaqs = getRelatedFaqs('program', program.id);
  setFreshnessHeaders(res, program.updated_at || program.created_at);
  const jsonLd = jsonLdScript({
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Trang chủ', item: abs('/') },
        { '@type': 'ListItem', position: 2, name: 'Du học Hàn Quốc', item: abs('/du-hoc') },
        { '@type': 'ListItem', position: 3, name: program.title, item: url },
      ] },
      {
        '@type': 'Article', '@id': `${url}#article`, headline: program.title,
        description: program.excerpt, image: [ogImg], articleSection: program.category,
        wordCount: program.wordCount, inLanguage: 'vi-VN', isAccessibleForFree: true,
        datePublished: publishedTime,
        dateModified: modifiedTime,
        author: authorEntity(program), publisher: { '@id': `${SITE_URL}/#organization` },
        mainEntityOfPage: { '@type': 'WebPage', '@id': url },
        ...(program.sourceLinks.length ? { citation: program.sourceLinks } : {}),
        ...(program.focus_keyword ? { keywords: program.focus_keyword } : {}),
      },
      ...(relatedFaqs.length ? [{ ...generateFAQSchema(relatedFaqs), '@id': `${url}#faq`, url, inLanguage: 'vi-VN' }] : []),
    ],
  });
  res.render('duhoc-detail', {
    program, relatedPrograms, relatedFaqs, isSchoolPage: false,
    title: program.seo_title || `${program.title} - Du học Hàn Quốc | SOL DREAM EDUCATION`,
    description: program.meta_description || program.excerpt,
    canonical: url,
    ogType: 'article',
    ogImage: ogImg,
    ogImageAlt: program.title,
    publishedTime,
    modifiedTime,
    robots: detailRobots(program),
    jsonLd,
  });
});

// Crawlable knowledge hub: detailed university profiles used by people and search AI.
router.get('/truong-dai-hoc', (req, res) => {
  const schoolPrograms = db.prepare("SELECT * FROM programs WHERE published=1 AND category='Thông tin trường' ORDER BY sort_order ASC,datetime(updated_at) DESC,id ASC").all().map(decorate);
  const dynamicKeys = new Set(schoolPrograms.map((item) => slugify(item.title).replace(/^(?:truong-)?dai-hoc-/, '')));
  const universities = getAllUniversities().filter((item) => !dynamicKeys.has(slugify(item.name).replace(/^(?:truong-)?dai-hoc-/, '')));
  const url = abs('/truong-dai-hoc');
  const jsonLd = jsonLdScript({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage', '@id': `${url}#page`, url,
        name: 'Thông tin trường đại học Hàn Quốc | SOL DREAM EDUCATION',
        description: 'Hồ sơ trường đại học Hàn Quốc do SOL DREAM EDUCATION tổng hợp: ngành học, học phí, học bổng và ký túc xá.',
        inLanguage: 'vi-VN', isPartOf: { '@id': `${SITE_URL}/#website` }, publisher: { '@id': `${SITE_URL}/#organization` },
        mainEntity: { '@id': `${url}#dataset` },
      },
      generateBreadcrumbSchema([{ name: 'Trang chủ', url: '/' }, { name: 'Trường đại học Hàn Quốc', url: '/truong-dai-hoc' }]),
      {
        '@type': 'Dataset', '@id': `${url}#dataset`, url,
        name: 'Bộ dữ liệu trường đại học Hàn Quốc của SOL DREAM EDUCATION',
        description: `Bộ dữ liệu gồm ${universities.length + schoolPrograms.length} hồ sơ về tổng quan, ngành học, học phí, học bổng và ký túc xá.`,
        creator: { '@id': `${SITE_URL}/#organization` },
        dateModified: '2026-08-26', inLanguage: 'vi-VN',
        variableMeasured: ['Tên trường', 'Địa chỉ', 'Ngành học', 'Học phí', 'Học bổng', 'Ký túc xá'],
        hasPart: [
          ...schoolPrograms.map((program) => ({ '@type': 'Dataset', name: program.title, url: abs(programPublicPath(program)) })),
          ...universities.map((university) => ({ '@type': 'Dataset', name: university.name, url: abs(university.url) })),
        ],
      },
    ],
  });
  res.render('universities-list', {
    universities, schoolPrograms,
    title: 'Thông tin trường đại học Hàn Quốc | SOL DREAM EDUCATION',
    description: 'Tra cứu thông tin trường đại học Hàn Quốc: ngành học, học phí, học bổng và ký túc xá do SOL DREAM EDUCATION tổng hợp.',
    canonical: url,
    jsonLd,
  });
});

router.get('/truong-dai-hoc/:id', (req, res, next) => {
  const storedRow = db.prepare("SELECT * FROM programs WHERE slug=? AND published=1 AND category='Thông tin trường'").get(req.params.id);
  if (storedRow) {
    const program = decorate(storedRow);
    if (program.noindex) res.set('X-Robots-Tag', 'noindex, follow');
    const url = abs(programPublicPath(program));
    const ogImg = program.cover_image ? abs(program.cover_image) : (process.env.OG_IMAGE || (SITE_URL + '/img/logo.png'));
    const publishedTime = isoDateTime(program.created_at);
    const modifiedTime = isoDateTime(program.updated_at || program.created_at);
    const relatedPrograms = db.prepare("SELECT * FROM programs WHERE published=1 AND category='Thông tin trường' AND id!=? ORDER BY sort_order ASC,datetime(updated_at) DESC LIMIT 3").all(program.id).map(decorate);
    const relatedFaqs = getRelatedFaqs('program', program.id);
    setFreshnessHeaders(res, program.updated_at || program.created_at);
    const jsonLd = jsonLdScript({ '@context': 'https://schema.org', '@graph': [
      generateBreadcrumbSchema([{ name: 'Trang chủ', url: '/' }, { name: 'Thông tin trường', url: '/truong-dai-hoc' }, { name: program.title, url: programPublicPath(program) }]),
      { '@type': 'Article', '@id': `${url}#article`, headline: program.title, description: program.excerpt, image: [ogImg], articleSection: program.category,
        wordCount: program.wordCount, inLanguage: 'vi-VN', isAccessibleForFree: true, datePublished: publishedTime, dateModified: modifiedTime,
        author: authorEntity(program), publisher: { '@id': `${SITE_URL}/#organization` }, mainEntityOfPage: { '@type': 'WebPage', '@id': url },
        ...(program.sourceLinks.length ? { citation: program.sourceLinks } : {}), ...(program.focus_keyword ? { keywords: program.focus_keyword } : {}) },
      ...(relatedFaqs.length ? [{ ...generateFAQSchema(relatedFaqs), '@id': `${url}#faq`, url, inLanguage: 'vi-VN' }] : []),
    ] });
    return res.render('duhoc-detail', { program, relatedPrograms, relatedFaqs, isSchoolPage: true,
      title: program.seo_title || `${program.title} - Thông tin trường | SOL DREAM EDUCATION`, description: program.meta_description || program.excerpt,
      canonical: url, ogType: 'article', ogImage: ogImg, ogImageAlt: program.title, publishedTime, modifiedTime, robots: detailRobots(program), jsonLd });
  }
  const university = getUniversityById(req.params.id);
  if (!university) return next();
  const url = abs(university.url);
  const universityFaqs = getUniversityFaqs(university);
  const advisor = getVerifiedAdvisor();
  const jsonLd = jsonLdScript([
    generateUniversitySchema(university, advisor),
    ...(advisor ? [advisor] : []),
    { ...generateFAQSchema(universityFaqs), '@id': `${url}#faq`, url, inLanguage: 'vi-VN' },
    generateBreadcrumbSchema([
      { name: 'Trang chủ', url: '/' },
      { name: 'Trường đại học Hàn Quốc', url: '/truong-dai-hoc' },
      { name: university.name, url: university.url },
    ]),
    {
        '@context': 'https://schema.org',
        '@type': 'Article',
        '@id': `${url}#article`,
        headline: `${university.name}: ngành học, học phí, học bổng và ký túc xá`,
        description: university.description,
        datePublished: university.updatedDate,
        dateModified: university.updatedDate,
        inLanguage: 'vi-VN',
        mainEntityOfPage: { '@type': 'WebPage', '@id': url },
        author: advisor ? { '@id': advisor['@id'] } : { '@id': `${SITE_URL}/#organization` },
        publisher: { '@id': `${SITE_URL}/#organization` },
        about: { '@id': `${url}#university` },
        ...(university.officialWebsite ? { citation: [university.officialWebsite] } : {}),
    },
  ]);
  res.render('university-detail', {
    university,
    universityFaqs,
    advisor,
    relatedUniversities: getAllUniversities().filter((item) => item.id !== university.id).slice(0, 5),
    title: `${university.name}: ngành học, học phí, học bổng | SOL DREAM EDUCATION`,
    description: university.description,
    canonical: url,
    ogType: 'article',
    ogImageAlt: `${university.name} - thông tin tuyển sinh và chi phí du học`,
    publishedTime: `${university.updatedDate}T00:00:00+07:00`,
    modifiedTime: `${university.updatedDate}T00:00:00+07:00`,
    jsonLd,
  });
});

// robots.txt
router.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(buildRobotsTxt());
});

// sitemap.xml (dynamic)
router.get('/sitemap.xml', (req, res) => {
  const posts = db.prepare('SELECT title, slug, cover_image, updated_at, created_at FROM posts WHERE published = 1 AND noindex = 0 ORDER BY datetime(created_at) DESC').all();
  const programs = db.prepare('SELECT title, slug, category, cover_image, updated_at, created_at FROM programs WHERE published = 1 AND noindex = 0 ORDER BY sort_order ASC').all();
  res.set('Cache-Control', 'public, max-age=900').type('application/xml').send(generateSitemapXml({ posts, programs }));
});

router.get('/feed.xml', (req, res) => {
  const posts = db.prepare('SELECT title, slug, excerpt, content, category, updated_at, created_at FROM posts WHERE published = 1 AND noindex = 0').all();
  const programs = db.prepare('SELECT title, slug, excerpt, content, category, updated_at, created_at FROM programs WHERE published = 1 AND noindex = 0').all();
  res.set('Cache-Control', 'public, max-age=900').type('application/rss+xml').send(generateRssXml({ posts, programs }));
});

router.get('/llms.txt', (req, res) => {
  const posts = db.prepare('SELECT title,slug,excerpt FROM posts WHERE published=1 AND noindex=0 ORDER BY datetime(updated_at) DESC').all();
  const programs = db.prepare('SELECT title,slug,excerpt,category FROM programs WHERE published=1 AND noindex=0 ORDER BY sort_order ASC, datetime(updated_at) DESC').all();
  res.set('Cache-Control', 'public, max-age=900').type('text/plain').send(generateLlmsTxt({ posts, programs }));
});

router.get('/indexnow-key.txt', (req, res, next) => {
  if (!INDEXNOW_KEY) return next();
  return res.set('Cache-Control', 'public, max-age=86400').type('text/plain').send(INDEXNOW_KEY);
});

module.exports = router;
