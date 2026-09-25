'use strict';
const SITE_URL = (process.env.BASE_URL || process.env.SITE_URL || 'https://soldream.edu.vn').replace(/\/$/, '');
const SITE_NAME = 'SOL DREAM EDUCATION';
const DEFAULT_TITLE = 'SOL DREAM EDUCATION - Trung Tâm Hàn Ngữ & Du Học Hàn Quốc Uy Tín';
const DEFAULT_DESC = 'Trung tâm Hàn ngữ Sol Dream Education chuyên đào tạo tiếng Hàn cấp tốc, tiếng Hàn giao tiếp và tư vấn du học Hàn Quốc uy tín tại TP.HCM. Đăng ký nhận tư vấn ngay!';
const OG_IMAGE = process.env.OG_IMAGE || (SITE_URL + '/img/logo.png');
const LOGO_URL = SITE_URL + '/img/logo.png';
const DEFAULT_OG_ALT = 'SOL DREAM EDUCATION - Tư vấn du học Hàn Quốc và đào tạo tiếng Hàn';

const abs = (p = '/') => SITE_URL + (p.startsWith('/') ? p : '/' + p);

const AI_BOTS = [
  'GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'PerplexityBot', 'ClaudeBot', 'Claude-SearchBot',
  'Claude-User', 'Google-Extended', 'Bingbot', 'Applebot-Extended',
];
const SEARCH_BOTS = [
  'Googlebot', 'Googlebot-Image', 'Googlebot-News', 'Googlebot-Video', 'GoogleOther',
  'Applebot', 'DuckDuckBot', 'Yeti',
];

function buildRobotsTxt(baseUrl = SITE_URL) {
  const groups = [...new Set([...AI_BOTS, ...SEARCH_BOTS])].map((bot) =>
    `User-agent: ${bot}\nAllow: /\nDisallow: /admin\nDisallow: /api/`
  ).join('\n\n');
  const unknownBots = 'User-agent: *\nDisallow: /';
  return `${groups}\n\n${unknownBots}\n\nSitemap: ${String(baseUrl).replace(/\/$/, '')}/sitemap.xml\n`;
}

function generateUniversitySchema(uni = {}, author = null) {
  const url = abs(uni.url || `/truong-dai-hoc/${uni.id || ''}`);
  const tuitionD4 = Number(uni.financials?.tuitionD4KrwYear ?? uni.financials?.tuitionKrwYear) || null;
  const tuitionD2 = Number(uni.financials?.tuitionD2KrwYear) || null;
  const address = uni.address || {};
  const universityId = `${url}#university`;
  const courseId = `${url}#korean-language-course`;
  const authorRef = author?.name ? { '@id': author['@id'] || `${SITE_URL}/#advisor` } : { '@id': `${SITE_URL}/#organization` };
  const modified = String(uni.lastUpdated || uni.updatedDate || '2026-08-01').length === 7
    ? `${uni.lastUpdated}-01` : (uni.lastUpdated || uni.updatedDate || '2026-08-01');
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollegeOrUniversity',
        '@id': universityId,
        name: uni.name,
        alternateName: [uni.english_name || uni.englishName, uni.korean_name || uni.koreanName].filter(Boolean),
        description: uni.blufSummary || uni.description,
        url,
        ...(uni.officialWebsite ? { sameAs: [uni.officialWebsite] } : {}),
        mainEntityOfPage: url,
        address: {
          '@type': 'PostalAddress',
          ...(address.streetAddress ? { streetAddress: address.streetAddress } : {}),
          addressLocality: address.addressLocality || uni.city || uni.location_terms?.[0],
          ...(address.addressRegion ? { addressRegion: address.addressRegion } : {}),
          addressCountry: 'KR',
        },
        subjectOf: { '@id': courseId },
        dateModified: modified,
      },
      {
        '@type': 'Course',
        '@id': courseId,
        name: `Chương trình tiếng Hàn tại ${uni.name || ''}`.trim(),
        description: uni.blufSummary || uni.description,
        provider: { '@id': universityId },
        author: authorRef,
        dateModified: modified,
        inLanguage: ['ko', 'vi'],
        ...((tuitionD4 || tuitionD2) ? {
          offers: [
            ...(tuitionD4 ? [{ '@type': 'Offer', name: 'Học phí hệ tiếng D4', price: tuitionD4, priceCurrency: 'KRW', description: uni.financials?.tuitionBasis || 'Học phí chương trình tiếng Hàn một năm', url }] : []),
            ...(tuitionD2 ? [{ '@type': 'Offer', name: 'Học phí chuyên ngành D2', price: tuitionD2, priceCurrency: 'KRW', description: 'Học phí chuyên ngành tham khảo một năm', url }] : []),
          ],
        } : {}),
      },
    ],
  };
}

function generateFAQSchema(faqs = []) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.filter((faq) => faq?.question && faq?.answer).map((faq) => ({
      '@type': 'Question',
      name: String(faq.question).trim(),
      acceptedAnswer: { '@type': 'Answer', text: String(faq.answer).trim() },
    })),
  };
}

function generateAuthorSchema(author = {}) {
  const credentials = Array.isArray(author.hasCredential) ? author.hasCredential : (author.hasCredential ? [author.hasCredential] : []);
  const sameAs = Array.isArray(author.sameAs) ? author.sameAs : (author.sameAs ? [author.sameAs] : []);
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': author['@id'] || `${SITE_URL}/#advisor`,
    name: String(author.name || '').trim(),
    jobTitle: String(author.jobTitle || 'Chuyên gia Tư vấn Du học Hàn Quốc').trim(),
    worksFor: author.worksFor || { '@id': `${SITE_URL}/#organization` },
    ...(credentials.length ? {
      hasCredential: credentials.map((credential) => typeof credential === 'string'
        ? { '@type': 'EducationalOccupationalCredential', name: credential }
        : { '@type': 'EducationalOccupationalCredential', ...credential }),
    } : {}),
    ...(sameAs.length ? { sameAs } : {}),
  };
}

function getVerifiedAdvisor() {
  const name = String(process.env.ADVISOR_NAME || '').trim();
  if (!name) return null;
  const credentials = String(process.env.ADVISOR_CREDENTIALS || '').split('|').map((item) => item.trim()).filter(Boolean);
  const sameAs = String(process.env.ADVISOR_SAME_AS || '').split('|').map((item) => item.trim()).filter(Boolean);
  return generateAuthorSchema({ name, jobTitle: process.env.ADVISOR_JOB_TITLE, hasCredential: credentials, sameAs });
}

function generateBreadcrumbSchema(items = []) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem', position: index + 1,
      name: item.name,
      item: item.url ? abs(item.url) : undefined,
    })),
  };
}

function authorEntity(item = {}) {
  const name = String(item.author_name || '').trim();
  if (!name) return { '@id': `${SITE_URL}/#organization` };
  return {
    '@type': 'Person',
    name,
    ...(String(item.author_role || '').trim() ? { jobTitle: String(item.author_role).trim() } : {}),
    ...(/^https?:\/\//i.test(String(item.author_url || '').trim()) ? { url: String(item.author_url).trim(), sameAs: [String(item.author_url).trim()] } : {}),
    worksFor: { '@id': `${SITE_URL}/#organization` },
  };
}

// default SEO locals for every render
function seoDefaults(req) {
  return {
    siteUrl: SITE_URL,
    siteName: SITE_NAME,
    title: DEFAULT_TITLE,
    description: DEFAULT_DESC,
    canonical: abs(req.path === '/' ? '/' : req.path),
    ogImage: OG_IMAGE,
    ogImageAlt: DEFAULT_OG_ALT,
    ogType: 'website',
    robots: 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1',
    publishedTime: '',
    modifiedTime: '',
    jsonLd: ''
  };
}
module.exports = {
  SITE_URL, SITE_NAME, DEFAULT_TITLE, DEFAULT_DESC, OG_IMAGE, LOGO_URL, DEFAULT_OG_ALT, abs, seoDefaults,
  authorEntity, AI_BOTS, SEARCH_BOTS, buildRobotsTxt, generateUniversitySchema, generateFAQSchema,
  generateAuthorSchema, generateBreadcrumbSchema, getVerifiedAdvisor,
};
