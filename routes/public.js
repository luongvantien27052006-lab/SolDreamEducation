'use strict';
const {siteText}=require('../lib/siteContent');
const express = require('express');
const router = express.Router();
const PINNED_NEWS_POST_SLUG = 'tuyen-dung-giao-vien-day-tieng-anh';
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
const { TOPICS, getTopics, normalizeTopic } = require('../lib/contentTopics');
const { articleDates, coverMetadata } = require('../lib/articleMetadata');
const { storedDescription, automaticDescription } = require('../lib/seoDescription');
const { aboutPageMetadata } = require('../lib/aboutPageMetadata');



function jsonLdScript(payload) {
  return `<script type="application/ld+json">${JSON.stringify(payload).replace(/</g, '\\u003c')}</script>`;
}

function detailRobots(item) {
  return item.noindex ? 'noindex, follow, max-snippet:-1, max-image-preview:large' : 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1';
}

function setFreshnessHeaders(res) {
  // Article timestamps do not describe the whole HTML: footer, shared copy and
  // templates can change independently. Let Express validate the rendered ETag.
  res.removeHeader('Last-Modified');
  res.set('Cache-Control', 'no-cache, must-revalidate');
}

function getRelatedFaqs(originType, originId) {
 if(originType!=='course') { const table=originType==='post'?'posts':'programs';const row=db.prepare('SELECT faq_mode FROM '+table+' WHERE id=?').get(originId);if(!row||row.faq_mode==='off') return []; }

  return db.prepare(`SELECT id,question,answer,source_url FROM faqs
    WHERE published=1 AND origin_type=? AND origin_id=? AND (generated=0 OR origin_type='course' OR EXISTS(SELECT 1 FROM posts WHERE origin_type='post' AND CAST(posts.id AS TEXT)=origin_id AND faq_mode='auto') OR EXISTS(SELECT 1 FROM programs WHERE origin_type='program' AND CAST(programs.id AS TEXT)=origin_id AND faq_mode='auto')) ORDER BY sort_order,id`).all(originType, String(originId));
}

function escapeSvgText(value) {
  return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function coverTitleLines(value) {
  const words = String(value || siteText("cover.default")).trim().split(/\s+/u).filter(Boolean);
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
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" role="img" aria-label="${escapeSvgText(item.title)}"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="${colors[0]}"/><stop offset="1" stop-color="${colors[1]}"/></linearGradient><clipPath id="title-safe"><rect x="70" y="210" width="690" height="220" rx="8"/></clipPath></defs><rect width="1200" height="630" rx="36" fill="url(#g)"/><circle cx="1050" cy="92" r="230" fill="${colors[2]}" opacity=".17"/><path d="M0 505c230-135 405 65 635-48 225-110 385-25 565-105v278H0Z" fill="#fff" opacity=".08"/><g transform="translate(875 158) scale(.82)" fill="none" stroke="#fff" stroke-width="16" stroke-linejoin="round" opacity=".92"><path d="M150 0c45 28 92 51 150 63v137c0 110-72 185-150 220C72 385 0 310 0 200V63C58 51 105 28 150 0Z"/><path d="m76 211 48 48 102-113"/></g><g transform="translate(76 74)"><text x="0" y="44" fill="${colors[2]}" font-family="Segoe UI Light,Helvetica Neue,Arial,sans-serif" font-size="43" font-weight="300" letter-spacing="-2">${escapeSvgText(siteText('cover.brand'))}</text><path d="M0 66h42M222 66h42" stroke="${colors[2]}" stroke-width="2"/><text x="55" y="72" fill="${colors[2]}" font-family="Segoe UI,Arial,sans-serif" font-size="15" font-weight="600" letter-spacing="8">${escapeSvgText(siteText('cover.brand-line'))}</text></g><text x="76" y="194" fill="#fff" opacity=".78" font-family="Segoe UI,Arial,sans-serif" font-size="22" font-weight="600" letter-spacing="1.5">${escapeSvgText(label || item.category || 'Du học Hàn Quốc')}</text><g clip-path="url(#title-safe)">${lines}</g></svg>`;
  res.set('Content-Type', 'image/svg+xml; charset=utf-8');
  res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
  return res.send(svg);
}

router.get('/anh-cam-nang/:id.svg', (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return next();
  const post = db.prepare('SELECT id,title,category FROM posts WHERE id=?').get(id);
  if (!post) return next();
  return sendDynamicEditorialCover(res, post, id, post.category || siteText("cover.category"));
});

router.get('/anh-truong/:id.svg', (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return next();
  const program = db.prepare('SELECT id,title,category FROM programs WHERE id=?').get(id);
  if (!program) return next();
  return sendDynamicEditorialCover(res, program, id, siteText("cover.school"));
});

// Home
router.get('/', (req, res) => {
  const posts = db.prepare(`SELECT * FROM posts WHERE published = 1
    ORDER BY CASE WHEN slug = ? THEN 0 ELSE 1 END, datetime(created_at) DESC LIMIT 3`)
    .all(PINNED_NEWS_POST_SLUG).map(decorate);
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
    name: siteText("server.routes.public.001"),
    description: siteText("server.routes.public.002"),
    inLanguage: 'vi-VN',
    about: { '@id': `${SITE_URL}/#organization` },
    mainEntity: {
      '@type': 'ItemList',
      name: siteText("server.routes.public.003"),
      itemListElement: courses.map((course, index) => ({
        '@type': 'ListItem', position: index + 1, name: course.name, url: abs(course.url),
      })),
    },
  });
  res.render('home', { homeCourses: courses.filter(c => ['giao-tiep-giao-vien-han','tieng-han-giao-tiep','tieng-han-so-cap-1','tieng-han-cap-toc','phat-am-tieng-han','tieng-anh-giao-tiep'].includes(c.slug)).slice(0,6), posts, programs, testimonials, homepageStats, homepageStatsSource, homepageAboutSections, jsonLd, showChatHint: true });
});

router.get('/tro-ly-du-hoc', (req, res) => {
  const url = abs('/tro-ly-du-hoc');
  const jsonLd = jsonLdScript([
    {
      '@context': 'https://schema.org', '@type': 'WebPage', '@id': `${url}#page`, url,
      name: siteText("server.routes.public.004"),
      description: siteText("server.routes.public.005"),
      inLanguage: 'vi-VN', isPartOf: { '@id': `${SITE_URL}/#website` },
      about: { '@id': `${SITE_URL}/#organization` },
    },
    generateBreadcrumbSchema([{ name: siteText("server.routes.public.006"), url: '/' }, { name: siteText("server.routes.public.007"), url: '/tro-ly-du-hoc' }]),
  ]);
  res.render('chat-page', {
    title: siteText("server.routes.public.008"),
    description: siteText("server.routes.public.009"),
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
  const aboutPageDates = aboutPageMetadata();
  const aboutStories = db.prepare('SELECT id,title,slug FROM posts WHERE id IN (269,270,271) AND published=1 ORDER BY id').all();
  const jsonLd = jsonLdScript([
    {
      '@context': 'https://schema.org', '@type': 'AboutPage', '@id': `${url}#page`, url,
      name: siteText("server.routes.public.010"),
      description: siteText("server.routes.public.011"),
      inLanguage: 'vi-VN', isPartOf: { '@id': `${SITE_URL}/#website` },
      mainEntity: { '@id': `${SITE_URL}/#organization` },
      ...(aboutPageDates.publishedTime ? {datePublished:aboutPageDates.publishedTime} : {}),
      ...(aboutPageDates.modifiedTime ? {dateModified:aboutPageDates.modifiedTime} : {}),
    },
    generateBreadcrumbSchema([{ name: siteText("server.routes.public.012"), url: '/' }, { name: siteText("server.routes.public.013"), url: '/gioi-thieu' }]),
  ]);
  res.render('about', {
    aboutSections, aboutStories, aboutPageDates,
    title: siteText("server.routes.public.014"),
    description: siteText("server.routes.public.015"),
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
      name: siteText("server.routes.public.016"), inLanguage: 'vi-VN',
      isPartOf: { '@id': `${SITE_URL}/#website` }, publisher: { '@id': `${SITE_URL}/#organization` },
    },
    generateBreadcrumbSchema([{ name: siteText("server.routes.public.017"), url: '/' }, { name: siteText("server.routes.public.018"), url: '/cau-hoi-thuong-gap' }]),
  ]);
  res.render('faq', {
    faqs,
    faqGroups: groupFaqs(faqs),
    title: siteText("server.routes.public.019"),
    description: siteText("server.routes.public.020"),
    canonical: url,
    jsonLd,
  });
});

router.get('/cuoc-song-han-quoc', (req, res) => {
  const koreaLife=require('../lib/siteContent').getDataset('korea-life');
  const url = abs('/cuoc-song-han-quoc');
  const lifeFaqs = koreaLife.topics.map((topic) => ({ question: siteText('life.faq-template',{v0:topic.title}), answer: topic.summary }));
  const jsonLd = jsonLdScript([
    { '@context': 'https://schema.org', '@type': 'WebPage', '@id': `${url}#page`, url, name: koreaLife.title,
      description: koreaLife.blufSummary, dateModified: koreaLife.lastUpdated, inLanguage: 'vi-VN',
      isPartOf: { '@id': `${SITE_URL}/#website` }, publisher: { '@id': `${SITE_URL}/#organization` },
      citation: [...new Set(koreaLife.topics.map((topic) => topic.sourceUrl))] },
    { ...generateFAQSchema(lifeFaqs), '@id': `${url}#faq`, url, inLanguage: 'vi-VN' },
    generateBreadcrumbSchema([{ name: siteText("server.routes.public.021"), url: '/' }, { name: siteText("server.routes.public.022"), url: '/cuoc-song-han-quoc' }]),
  ]);
  res.render('korea-life', { life: koreaLife, title: siteText("server.routes.public.023",{v0:(koreaLife.title)}), description: koreaLife.blufSummary, canonical: url, jsonLd });
});

// Course hub: exposes course information as crawlable text instead of home-page cards only.
router.get('/khoa-hoc', (req, res) => {
  const courses = getCourses();
  const courseTracks = [
    { key: 'foundation', title: siteText("server.routes.public.024") },
    { key: 'topik', title: siteText("server.routes.public.025") },
    { key: 'speaking', title: siteText("server.routes.public.026") },
  ];
  const tuitionOrder = ['SC1A', 'SC1B', 'SC2A', 'SC2B', 'TC3A', 'TC3B', 'TC4A', 'TC4B', 'TOPIK I', 'TOPIK cấp 3', 'TOPIK cấp 4', 'Giao tiếp Sơ cấp', 'Giao tiếp TC1', 'Giao tiếp TC2', 'Luyện phát âm'];
  const tuitionGroups = courseTracks.map((track) => ({
    title: track.title,
    courses: courses.filter((course) => course.financials?.tuition2026?.track === track.key)
      .sort((a, b) => tuitionOrder.indexOf(a.financials.tuition2026.code) - tuitionOrder.indexOf(b.financials.tuition2026.code)),
  })).filter((track) => track.courses.length);
  const otherCourses = courses.filter((course) => !course.financials?.tuition2026);
  const updatedDate = getCourseUpdatedDate();
  const updatedDateLabel = updatedDate ? updatedDate.split('-').reverse().join('/') : '';
  const url = abs('/khoa-hoc');
  const jsonLd = jsonLdScript({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage', '@id': `${url}#page`, url,
        name: siteText("server.routes.public.027"),
        description: siteText("server.routes.public.028"),
        inLanguage: 'vi-VN', isPartOf: { '@id': `${SITE_URL}/#website` },
        publisher: { '@id': `${SITE_URL}/#organization` }, mainEntity: { '@id': `${url}#list` },
      },
      {
        '@type': 'ItemList', '@id': `${url}#list`, name: siteText("server.routes.public.029"),
        itemListElement: courses.map((course, index) => ({
          '@type': 'ListItem', position: index + 1, url: abs(course.url),
        })),
      },
      ...courses.map((course) => ({
        '@type': 'Course', '@id': `${abs(course.url)}#course`, name: course.name,
        description: course.description.slice(0, 60), url: abs(course.url),
        provider: { '@id': `${SITE_URL}/#organization` },
      })),
      generateBreadcrumbSchema([{ name: siteText("server.routes.public.030"), url: '/' }, { name: siteText("server.routes.public.031"), url: '/khoa-hoc' }]),
    ],
  });
  res.render('courses', {
    courses,
    tuitionGroups,
    otherCourses,
    updatedDateLabel,
    courseNotice: getCourseNotice(),
    title: siteText("server.routes.public.032"),
    description: siteText("server.routes.public.033"),
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
    {question:siteText('course.faq.audience-question',{v0:course.name}),answer:siteText('course.faq.audience-answer',{v0:course.name,v1:course.audience.toLowerCase()})},
    {question:siteText('course.faq.fee-question',{v0:course.name}),answer:siteText('course.faq.fee-answer',{v0:course.price,v1:course.financials.priceNote})},
    {question:siteText('course.faq.exam-question',{v0:course.name,v1:course.entryExamLabel}),answer:siteText('course.faq.exam-answer',{v0:course.entryExamRequirement||siteText('course.faq.exam-missing',{v0:course.entryExamLabel}),v1:course.requirements.status})},
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
    generateBreadcrumbSchema([{ name: siteText("server.routes.public.034"), url: '/' }, { name: siteText("server.routes.public.035"), url: '/khoa-hoc' }, { name: course.name, url: course.url }]),
  ]);
  res.render('course-detail', {
    course, courseFaqs, courseNotice: getCourseNotice(),
    title: course.seoTitle || `${course.name} | SOL DREAM EDUCATION`, description: course.metaDescription || automaticDescription(course.blufSummary, course.description),
    canonical: url, jsonLd,
  });
});

// News listing
router.get('/tin-tuc', (req, res) => {
  const selectedTopic = normalizeTopic(req.query.muc);
  const currentTopic = getTopics().find((topic) => topic.id === selectedTopic) || null;
  const posts = selectedTopic
    ? db.prepare(`SELECT * FROM posts WHERE published = 1 AND topic = ?
      ORDER BY CASE WHEN slug = ? THEN 0 ELSE 1 END, datetime(created_at) DESC`)
      .all(selectedTopic, PINNED_NEWS_POST_SLUG).map(decorate)
    : db.prepare(`SELECT * FROM posts WHERE published = 1
      ORDER BY CASE WHEN slug = ? THEN 0 ELSE 1 END, datetime(created_at) DESC`)
      .all(PINNED_NEWS_POST_SLUG).map(decorate);
  const topicCounts = Object.fromEntries(db.prepare('SELECT topic, COUNT(*) count FROM posts WHERE published=1 GROUP BY topic').all()
    .map((row) => [row.topic, row.count]));
  const url = abs(selectedTopic ? `/tin-tuc?muc=${selectedTopic}` : '/tin-tuc');
  const pageName = currentTopic?.label || siteText("news.default-name");
  const pageDescription = currentTopic?.description || siteText("news.default-description");
  const jsonLd = jsonLdScript({
    '@context': 'https://schema.org', '@graph': [{
    '@type': 'CollectionPage', '@id': `${url}#page`, url,
    name: siteText("server.routes.public.036",{v0:(pageName)}),
    description: pageDescription,
    inLanguage: 'vi-VN', isPartOf: { '@id': `${SITE_URL}/#website` }, publisher: { '@id': `${SITE_URL}/#organization` },
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: posts.map((post, index) => ({
        '@type': 'ListItem', position: index + 1, name: post.title, url: abs(`/tin-tuc/${post.slug}`),
      })),
    }}, generateBreadcrumbSchema([
      { name: siteText("server.routes.public.037"), url: '/' }, { name: siteText("server.routes.public.038"), url: '/tin-tuc' },
      ...(currentTopic ? [{ name: currentTopic.label, url: `/tin-tuc?muc=${selectedTopic}` }] : []),
    ])],
  });
  res.render('news-list', {
    posts, topics: getTopics(), selectedTopic, currentTopic, topicCounts,
    title: siteText("server.routes.public.039",{v0:(pageName)}),
    description: pageDescription,
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
  const { publishedTime, modifiedTime, displayTime, modifiedDate } = articleDates(post);
  const coverMeta = coverMetadata(post);
  if (modifiedDate) post.updatedDateFull = modifiedDate;
  const relatedPosts = db.prepare('SELECT * FROM posts WHERE published = 1 AND id != ? ORDER BY CASE WHEN topic = ? THEN 0 ELSE 1 END, datetime(updated_at) DESC LIMIT 3').all(post.id, post.topic).map(decorate);
  const relatedFaqs = getRelatedFaqs('post', post.id);
  setFreshnessHeaders(res);
  const jsonLd = jsonLdScript({
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: siteText("server.routes.public.040"), item: abs('/') },
        { '@type': 'ListItem', position: 2, name: post.topicLabel, item: abs(`/tin-tuc?muc=${post.topic}`) },
        { '@type': 'ListItem', position: 3, name: post.title, item: url },
      ] },
      {
        '@type': 'Article', '@id': `${url}#article`, headline: post.title,
        description: storedDescription(post), image: [{ '@type': 'ImageObject', url: ogImg, description: coverMeta.alt, ...(coverMeta.caption ? { caption: coverMeta.caption } : {}), ...(coverMeta.width ? { width: coverMeta.width, height: coverMeta.height } : {}) }], articleSection: post.topicLabel,
        wordCount: post.wordCount, inLanguage: 'vi-VN', isAccessibleForFree: true,
        ...(publishedTime ? { datePublished: publishedTime } : {}),
        ...(modifiedTime ? { dateModified: modifiedTime } : {}),
        author: authorEntity(post),
        publisher: { '@id': `${SITE_URL}/#organization`, '@type': 'EducationalOrganization', name: siteText("server.routes.public.041"), logo: { '@type': 'ImageObject', url: LOGO_URL } },
        mainEntityOfPage: { '@type': 'WebPage', '@id': url },
        ...(post.sourceLinks.length ? { citation: post.sourceLinks } : {}),
        ...(post.focus_keyword ? { keywords: post.focus_keyword } : {}),
      },
      ...(relatedFaqs.length ? [{ ...generateFAQSchema(relatedFaqs), '@id': `${url}#faq`, url, inLanguage: 'vi-VN' }] : []),
    ],
  });
  res.render('news-detail', {
    post, relatedPosts, relatedFaqs, coverMeta, displayTime, contentModifiedTime: modifiedTime,
    title: post.seo_title || siteText("server.routes.public.063",{v0:(post.title)}),
    description: storedDescription(post),
    canonical: url,
    ogType: 'article',
    ogImage: ogImg,
    ogImageAlt: coverMeta.alt,
    publishedTime,
    modifiedTime: modifiedTime.includes('T') ? modifiedTime : '',
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
    name: siteText("server.routes.public.042"),
    description: siteText("server.routes.public.043"),
    inLanguage: 'vi-VN', isPartOf: { '@id': `${SITE_URL}/#website` }, publisher: { '@id': `${SITE_URL}/#organization` },
    mainEntity: { '@type': 'ItemList', itemListElement: programs.map((program, index) => ({
      '@type': 'ListItem', position: index + 1, name: program.title, url: abs(`/du-hoc/${program.slug}`),
    })) } }, generateBreadcrumbSchema([{ name: siteText("server.routes.public.044"), url: '/' }, { name: siteText("server.routes.public.045"), url: '/du-hoc' }])],
  });
  res.render('duhoc-list', {
    programs,
    title: siteText("server.routes.public.046"),
    description: siteText("server.routes.public.047"),
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
  const { publishedTime, modifiedTime, modifiedDate } = articleDates(program);
  if (modifiedDate) program.updatedDateFull = modifiedDate;
  const relatedPrograms = db.prepare('SELECT * FROM programs WHERE published = 1 AND category = ? AND id != ? ORDER BY sort_order ASC, datetime(updated_at) DESC LIMIT 3').all(program.category, program.id).map(decorate);
  const relatedFaqs = getRelatedFaqs('program', program.id);
  setFreshnessHeaders(res);
  const jsonLd = jsonLdScript({
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: siteText("server.routes.public.048"), item: abs('/') },
        { '@type': 'ListItem', position: 2, name: siteText("server.routes.public.049"), item: abs('/du-hoc') },
        { '@type': 'ListItem', position: 3, name: program.title, item: url },
      ] },
      {
        '@type': 'Article', '@id': `${url}#article`, headline: program.title,
        description: storedDescription(program), image: [{'@type':'ImageObject',url:ogImg,description:program.cover_alt||program.title,...(program.cover_caption?{caption:program.cover_caption}:{})}], articleSection: program.category,
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
    title: program.seo_title || siteText("server.routes.public.064",{v0:(program.title)}),
    description: storedDescription(program),
    canonical: url,
    ogType: 'article',
    ogImage: ogImg,
    ogImageAlt: program.cover_alt || program.title,
    publishedTime,
    modifiedTime,
    robots: detailRobots(program),
    jsonLd,
  });
});

// Crawlable knowledge hub: detailed university profiles used by people and search AI.
router.get('/truong-dai-hoc', (req, res) => {
  const partnerSchools=require('../lib/siteContent').getDataset('partners').schools;
  const schoolPrograms = db.prepare("SELECT * FROM programs WHERE published=1 AND category='Thông tin trường' ORDER BY sort_order ASC,datetime(updated_at) DESC,id ASC").all().map(decorate);
  const dynamicKeys = new Set(schoolPrograms.map((item) => slugify(item.title).replace(/^(?:truong-)?dai-hoc-/, '')));
  const universities = getAllUniversities().filter((item) => !dynamicKeys.has(slugify(item.name).replace(/^(?:truong-)?dai-hoc-/, '')));
  const url = abs('/truong-dai-hoc');
  const jsonLd = jsonLdScript({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage', '@id': `${url}#page`, url,
        name: siteText("server.routes.public.050"),
        description: siteText("server.routes.public.051"),
        inLanguage: 'vi-VN', isPartOf: { '@id': `${SITE_URL}/#website` }, publisher: { '@id': `${SITE_URL}/#organization` },
        mainEntity: { '@id': `${url}#dataset` },
      },
      generateBreadcrumbSchema([{ name: siteText("server.routes.public.052"), url: '/' }, { name: siteText("server.routes.public.053"), url: '/truong-dai-hoc' }]),
      {
        '@type': 'Dataset', '@id': `${url}#dataset`, url,
        name: siteText("server.routes.public.054"),
        description: siteText("server.routes.public.055",{v0:(partnerSchools.length),v1:(universities.length + schoolPrograms.length)}),
        creator: { '@id': `${SITE_URL}/#organization` },
        dateModified: '2026-10-17', inLanguage: 'vi-VN',
        variableMeasured: ['Tên trường', 'Địa chỉ', 'Ngành học', 'Học phí', 'Học bổng', 'Ký túc xá'],
        hasPart: [
          ...partnerSchools.map((school) => ({ '@type': 'EducationalOrganization', name: school.englishName, sameAs: school.website })),
          ...schoolPrograms.map((program) => ({ '@type': 'Dataset', name: program.title, url: abs(programPublicPath(program)) })),
          ...universities.map((university) => ({ '@type': 'Dataset', name: university.name, url: abs(university.url) })),
        ],
      },
    ],
  });
  res.render('universities-list', {
    universities, schoolPrograms, partnerSchools,
    title: siteText("server.routes.public.056"),
    description: siteText("server.routes.public.057"),
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
    const { publishedTime, modifiedTime, modifiedDate } = articleDates(program);
  if (modifiedDate) program.updatedDateFull = modifiedDate;
    const relatedPrograms = db.prepare("SELECT * FROM programs WHERE published=1 AND category='Thông tin trường' AND id!=? ORDER BY sort_order ASC,datetime(updated_at) DESC LIMIT 3").all(program.id).map(decorate);
    const relatedFaqs = getRelatedFaqs('program', program.id);
    setFreshnessHeaders(res);
    const jsonLd = jsonLdScript({ '@context': 'https://schema.org', '@graph': [
      generateBreadcrumbSchema([{ name: siteText("server.routes.public.058"), url: '/' }, { name: siteText("server.routes.public.059"), url: '/truong-dai-hoc' }, { name: program.title, url: programPublicPath(program) }]),
      { '@type': 'Article', '@id': `${url}#article`, headline: program.title, description: storedDescription(program), image: [{'@type':'ImageObject',url:ogImg,description:program.cover_alt||program.title,...(program.cover_caption?{caption:program.cover_caption}:{})}], articleSection: program.category,
        wordCount: program.wordCount, inLanguage: 'vi-VN', isAccessibleForFree: true, datePublished: publishedTime, dateModified: modifiedTime,
        author: authorEntity(program), publisher: { '@id': `${SITE_URL}/#organization` }, mainEntityOfPage: { '@type': 'WebPage', '@id': url },
        ...(program.sourceLinks.length ? { citation: program.sourceLinks } : {}), ...(program.focus_keyword ? { keywords: program.focus_keyword } : {}) },
      ...(relatedFaqs.length ? [{ ...generateFAQSchema(relatedFaqs), '@id': `${url}#faq`, url, inLanguage: 'vi-VN' }] : []),
    ] });
    return res.render('duhoc-detail', { program, relatedPrograms, relatedFaqs, isSchoolPage: true,
      title: program.seo_title || siteText("server.routes.public.065",{v0:(program.title)}), description: storedDescription(program),
      canonical: url, ogType: 'article', ogImage: ogImg, ogImageAlt: program.cover_alt || program.title, publishedTime, modifiedTime, robots: detailRobots(program), jsonLd });
  }
  const university = getUniversityById(req.params.id);
  if (!university) return next();
  setFreshnessHeaders(res);
  const url = abs(university.url);
  const universityFaqs = getUniversityFaqs(university);
  const advisor = getVerifiedAdvisor();
  const jsonLd = jsonLdScript([
    generateUniversitySchema(university, advisor),
    ...(advisor ? [advisor] : []),
    { ...generateFAQSchema(universityFaqs), '@id': `${url}#faq`, url, inLanguage: 'vi-VN' },
    generateBreadcrumbSchema([
      { name: siteText("server.routes.public.060"), url: '/' },
      { name: siteText("server.routes.public.061"), url: '/truong-dai-hoc' },
      { name: university.name, url: university.url },
    ]),
    {
        '@context': 'https://schema.org',
        '@type': 'Article',
        '@id': `${url}#article`,
        headline: siteText('school.article-headline',{v0:university.name}),
        description: university.description,
        datePublished: university.firstPublishedAt || university.updatedDate,
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
    title: siteText("server.routes.public.062",{v0:(university.name)}),
    description: university.description,
    canonical: url,
    ogType: 'article',
    ogImageAlt: siteText('school.og-alt',{v0:university.name}),
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
  const posts = db.prepare('SELECT title, slug, cover_image, updated_at, created_at, content_modified_at FROM posts WHERE published = 1 AND noindex = 0 ORDER BY datetime(created_at) DESC').all();
  const programs = db.prepare('SELECT title, slug, category, cover_image, updated_at, created_at, content_modified_at FROM programs WHERE published = 1 AND noindex = 0 ORDER BY sort_order ASC').all();
  res.set('Cache-Control', 'public, max-age=60, must-revalidate').type('application/xml').send(generateSitemapXml({ posts, programs }));
});

router.get('/feed.xml', (req, res) => {
  const posts = db.prepare('SELECT title, slug, excerpt, content, category, topic, updated_at, created_at, first_published_at, meta_description FROM posts WHERE published = 1 AND noindex = 0').all();
  const programs = db.prepare('SELECT title, slug, excerpt, content, category, updated_at, created_at, first_published_at, meta_description FROM programs WHERE published = 1 AND noindex = 0').all();
  res.set('Cache-Control', 'public, max-age=60, must-revalidate').type('application/rss+xml').send(generateRssXml({ posts, programs }));
});

router.get('/llms.txt', (req, res) => {
  const posts = db.prepare('SELECT title,slug,excerpt FROM posts WHERE published=1 AND noindex=0 ORDER BY datetime(updated_at) DESC').all();
  const programs = db.prepare('SELECT title,slug,excerpt,category FROM programs WHERE published=1 AND noindex=0 ORDER BY sort_order ASC, datetime(updated_at) DESC').all();
  res.set('Cache-Control', 'public, max-age=60, must-revalidate').type('text/plain').send(generateLlmsTxt({ posts, programs }));
});

router.get('/indexnow-key.txt', (req, res, next) => {
  if (!INDEXNOW_KEY) return next();
  return res.set('Cache-Control', 'public, max-age=86400').type('text/plain').send(INDEXNOW_KEY);
});

module.exports = router;
