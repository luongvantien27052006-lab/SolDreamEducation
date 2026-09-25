'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  extractCandidates, extractUniversityDirectoryCandidates, directoryPageCount,
  extractPageTitle, sourcePageCandidate,
  extractPublishedDate, structuredTextFromHtml, extractSitemapLocations, extractFeedLinks, extractFeedEntries, classifySourceContent, classifiedSourceText,
  extractUniversityResourceCandidates,
  extractOfficialUniversityWebsite, extractClientRedirect,
  extractMediaFromHtml, extractFaqsFromHtml, extractAttachmentsFromHtml, parseRobots, classifySection, requiresManualApproval, fingerprint, optimizeCrawledItem,
  parseWikimediaImageResults, parseOpenverseImageResults,
} = require('../lib/researchBot');
const { isKoreaStudyRelevant, isOfficialUniversityUrl } = require('../lib/koreaScope');
const { placementForPath, localSqlDate } = require('../lib/sitePopup');

test('research parser keeps relevant same-host official links and removes duplicates', () => {
  const html = `<a href="/notice/1?utm_source=x">2027 외국인 유학생 입학 모집요강</a>
    <a href="/notice/1">2027 외국인 유학생 입학 모집요강</a>
    <a href="https://other.example/item">Tuyển sinh quốc tế</a>
    <a href="/sports">Kết quả thể thao</a>`;
  const rows = extractCandidates(html, 'https://university.example/admissions', 'tuyển sinh,외국인,입학');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].url, 'https://university.example/notice/1');
  assert.equal(rows[0].suggestedSection, 'Thông tin trường');
});

test('crawler extracts official FAQ schema and safe page media', () => {
  const html = `<meta property="og:image" content="/assets/guide.jpg">
    <video src="https://cdn.example/guide.mp4"></video>
    <script type="application/ld+json">{"@context":"https://schema.org","@type":"FAQPage","mainEntity":[{"@type":"Question","name":"Visa D-2 cần gì?","acceptedAnswer":{"@type":"Answer","text":"Hồ sơ phụ thuộc chương trình và cơ quan tiếp nhận."}}]}</script>`;
  assert.deepEqual(extractMediaFromHtml(html, 'https://official.example/guide'), {
    imageUrl: 'https://official.example/assets/guide.jpg', videoUrl: 'https://cdn.example/guide.mp4',
  });
  assert.deepEqual(extractFaqsFromHtml(html), [{ question: 'Visa D-2 cần gì?', answer: 'Hồ sơ phụ thuộc chương trình và cơ quan tiếp nhận.' }]);
});

test('crawler keeps official attachments and rejects files hosted by third parties', () => {
  const html = `<a href="/files/admission-guide.pdf">Admission guide</a>
    <a href="https://files.example.net/unverified.pdf">Unverified copy</a>
    <a href="/notice/1">Read notice</a>`;
  assert.deepEqual(extractAttachmentsFromHtml(html, 'https://university.ac.kr/admission'), [{
    url: 'https://university.ac.kr/files/admission-guide.pdf', title: 'Admission guide',
  }]);
});

test('Korea scope excludes other destinations and accepts official Korean university sources', () => {
  assert.equal(isKoreaStudyRelevant({ title: 'Hội thảo du học Nhật Bản 2026', url: 'https://example.vn/japan' }), false);
  assert.equal(isKoreaStudyRelevant({ title: 'Tuyển sinh sinh viên quốc tế', url: 'https://admission.snu.ac.kr/notice', source_type: 'university' }), true);
  assert.equal(isOfficialUniversityUrl('https://admission.snu.ac.kr/notice'), true);
  assert.equal(isOfficialUniversityUrl('https://www.studyinkorea.go.kr/ko/search/universityInfo.do'), false);
});

test('crawler chooses the article photo over site logos when open graph media is missing', () => {
  const html = `<header><img src="/assets/ministry-logo.png" width="180" height="70" alt="Logo"></header>
    <article><h1>Cẩm nang sinh hoạt</h1><img data-src="/photos/korea-living.webp" width="1280" height="720" alt="Sinh viên tại Hàn Quốc"></article>`;
  assert.deepEqual(extractMediaFromHtml(html, 'https://official.example/guide'), {
    imageUrl: 'https://official.example/photos/korea-living.webp', videoUrl: '',
  });
});

test('crawler prefers a page-specific article photo over a shared open graph cover', () => {
  const html = `<meta property="og:image" content="/assets/shared-seoul-cover.jpg">
    <article><h1>Thông báo tuyển sinh</h1><img src="/uploads/admission-2027.jpg" width="1280" height="720" alt="Thông báo tuyển sinh 2027"></article>`;
  assert.equal(extractMediaFromHtml(html, 'https://official.example/news/2027').imageUrl, 'https://official.example/uploads/admission-2027.jpg');
});

test('crawler uses structured-data images as a cover fallback', () => {
  const html = `<script type="application/ld+json">{"@context":"https://schema.org","@type":"Article","image":{"url":"/media/visa-guide.jpg"}}</script>`;
  assert.equal(extractMediaFromHtml(html, 'https://official.example/news/visa').imageUrl, 'https://official.example/media/visa-guide.jpg');
});

test('crawler rejects language flags and can use a source logo instead', () => {
  const html = `<img alt="flag of USA" src="/languages/images/icon-flag-usa.png">
    <img alt="NHIS Korea" src="/assets/nhis-logo.svg">`;
  assert.equal(extractMediaFromHtml(html, 'https://official.example/guide').imageUrl, 'https://official.example/assets/nhis-logo.svg');
});

test('external school-image search keeps attributable matching campus photos', () => {
  const commons = parseWikimediaImageResults({ query: { pages: {
    1: { title: 'File:The University of Suwon campus building.jpg', imageinfo: [{
      thumburl: 'https://upload.wikimedia.org/suwon-campus.jpg',
      descriptionurl: 'https://commons.wikimedia.org/wiki/File:Suwon_campus.jpg',
      thumbwidth: 1400, thumbheight: 850, mime: 'image/jpeg',
      extmetadata: { LicenseShortName: { value: 'CC BY-SA 4.0' }, Artist: { value: '<b>Nguyen A</b>' }, ImageDescription: { value: 'The University of Suwon campus building' } },
    }] },
    2: { title: 'File:Flag of the United States.png', imageinfo: [{
      thumburl: 'https://upload.wikimedia.org/us-flag.png', descriptionurl: 'https://commons.wikimedia.org/wiki/File:US_flag.png',
      thumbwidth: 1200, thumbheight: 700, mime: 'image/png', extmetadata: { LicenseShortName: { value: 'Public domain' } },
    }] },
  } } }, { title: 'Đại học Suwon', subtitle: 'The University of Suwon' });
  assert.equal(commons.length, 1);
  assert.equal(commons[0].provider, 'Wikimedia Commons');
  assert.equal(commons[0].creator, 'Nguyen A');
  assert.equal(commons[0].license, 'CC BY-SA 4.0');

  const openverse = parseOpenverseImageResults({ results: [{
    title: 'Wonkwang University campus library', thumbnail: 'https://images.example/wonkwang.jpg',
    foreign_landing_url: 'https://photos.example/wonkwang-campus', creator: 'Photographer B',
    license: 'by-sa', license_version: '4.0', width: 1600, height: 900, filetype: 'jpg',
  }] }, { title: 'Đại học Wonkwang', subtitle: 'Wonkwang University' });
  assert.equal(openverse.length, 1);
  assert.equal(openverse[0].sourceUrl, 'https://photos.example/wonkwang-campus');
});

test('only school and study-program research requires manual approval', () => {
  assert.equal(requiresManualApproval(classifySection('Thông tin trường đại học Seoul')), true);
  assert.equal(requiresManualApproval(classifySection('Chương trình trao đổi sinh viên')), true);
  assert.equal(requiresManualApproval(classifySection('Cẩm nang chuẩn bị hành lý và visa')), false);
});

test('robots rules and editorial classifications are deterministic', () => {
  const robots = 'User-agent: *\nDisallow: /private\nAllow: /private/public';
  assert.equal(parseRobots(robots, '/private/file'), false);
  assert.equal(parseRobots(robots, '/private/public/news'), true);
  assert.equal(classifySection('visa D-2 du học'), 'Du học Hàn Quốc');
  assert.equal(fingerprint({ title: '  Thông báo   tuyển sinh ', url: 'https://a' }), fingerprint({ title: 'thông báo tuyển sinh', url: 'https://b' }));
});

test('Study in Korea directory parser keeps every unique university profile and reads pagination', () => {
  const html = `
    <input id="number" type="number" max="23" value="1">
    <a href="/ko/search/universityInfo.do?tab=univ-basic-info&univCd=100001">Seoul National University</a>
    <a href="/ko/search/universityInfo.do?tab=univ-basic-info&univCd=100001">Seoul National University</a>
    <a href="/ko/search/universityInfo.do?tab=univ-basic-info&univCd=100002">Chung-Ang University</a>
    <a href="/ko/notice/list.do">Thông báo chung</a>`;
  const rows = extractUniversityDirectoryCandidates(html, 'https://www.studyinkorea.go.kr/ko/search_v1.do');
  assert.equal(rows.length, 2);
  assert.equal(rows[0].suggestedSection, 'Thông tin trường');
  assert.equal(directoryPageCount(html), 23);
});

test('directory profile extracts the official university website', () => {
  const html = `<a href="https://www.kaya.ac.kr" target="_blank">Website</a>
    <a href="https://www.studyinkorea.go.kr/notice">Portal notice</a>`;
  assert.equal(extractOfficialUniversityWebsite(html, 'https://www.studyinkorea.go.kr/ko/search/universityInfo.do'), 'https://www.kaya.ac.kr/');
});

test('crawler follows safe client redirects inside the same official university domain', () => {
  const html = `<script>window.location="https://lily.sunmoon.ac.kr/";</script>`;
  assert.equal(extractClientRedirect(html, 'https://www.sunmoon.ac.kr/'), 'https://lily.sunmoon.ac.kr/');
  assert.equal(extractClientRedirect(`<script>window.location="https://example.com/";</script>`, 'https://www.sunmoon.ac.kr/'), '');
});

test('deep university discovery prioritizes notices and follows CMS detail links', () => {
  const html = `<a href="/about/history">History</a>
    <a href="/academics/departments">Departments and majors</a>
    <a href="/bbs/notice/view.do?nttId=991">2026 International admission update</a>`;
  const rows = extractUniversityResourceCandidates(html, 'https://www.sample.ac.kr/en/', 'notice');
  assert.equal(rows[0].kind, 'notice');
  assert.match(rows[0].url, /nttId=991/);
  assert.ok(rows.some((row) => row.kind === 'academics'));
});

test('search-index fallback is always marked for manual review', () => {
  const item = optimizeCrawledItem({
    title: 'Thông báo tuyển sinh quốc tế mới nhất', url: 'https://official.go.kr/notice/10',
    excerpt: 'Thông báo chính thức được phát hiện qua chỉ mục của đúng website cơ quan ban hành và cần quản trị viên đối chiếu.',
    suggestedSection: 'Du học Hàn Quốc', discoveryMode: 'official-search-index',
  }, { name: 'Nguồn chính thức', source_type: 'ministry' });
  assert.match(item.optimizationNote, /chỉ mục tìm kiếm/);
  assert.match(item.optimizationNote, /bắt buộc quản trị viên duyệt/i);
});

test('crawler discovers official sitemap and RSS URLs for deep pages', () => {
  const sitemap = `<urlset><url><loc>https://sample.ac.kr/admission/2026</loc></url><url><loc>https://sample.ac.kr/notice/991</loc></url></urlset>`;
  assert.deepEqual(extractSitemapLocations(sitemap, 'https://sample.ac.kr/'), [
    'https://sample.ac.kr/admission/2026', 'https://sample.ac.kr/notice/991',
  ]);
  const home = `<link rel="alternate" type="application/rss+xml" href="/news/rss.xml">`;
  assert.deepEqual(extractFeedLinks(home, 'https://sample.ac.kr/'), ['https://sample.ac.kr/news/rss.xml']);
  const feed = `<rss><channel><item><title>Latest admission notice</title><link>https://sample.ac.kr/notice/991</link></item></channel></rss>`;
  assert.equal(extractFeedEntries(feed, 'https://sample.ac.kr/')[0].kind, 'notice');
});

test('page extraction keeps table structure, contact footer and publication date', () => {
  const html = `<html><head><meta property="article:published_time" content="2026-09-20T09:00:00+09:00"></head><body>
    <main><h1>Admissions</h1><table><tr><th>Program</th><th>Deadline</th></tr><tr><td>Bachelor</td><td>2026-11-01</td></tr></table></main>
    <footer><address>admission@sample.ac.kr · +82 2 123 4567</address></footer></body></html>`;
  const text = structuredTextFromHtml(html);
  assert.match(text, /Program\s*\|\s*Deadline/);
  assert.match(text, /admission@sample\.ac\.kr/);
  assert.equal(extractPublishedDate(html), '2026-09-20');
});

test('classifies every cleaned notice block before editorial generation without truncating it', () => {
  const source = [
    'THÔNG BÁO THỜI GIAN THẨM TRA VISA',
    '',
    'Áp dụng từ ngày 21/09/2026 cho người xin visa D-4.',
    '',
    'Lệ phí tiếp nhận: 1.200.000 won.',
    '',
    'Liên hệ: visa@example.kr - 024 7100 1212.',
    '',
    'Tệp đính kèm: huong-dan-visa.pdf',
  ].join('\n');
  const classified = classifySourceContent(source, { title: 'Thông báo', url: 'https://official.example/notice/1' });
  assert.equal(classified.totalCharacters, source.length);
  assert.match(classifiedSourceText(classified), /21\/09\/2026/);
  assert.match(classifiedSourceText(classified), /1\.200\.000 won/);
  assert.match(classifiedSourceText(classified), /visa@example\.kr/);
  assert.match(classifiedSourceText(classified), /huong-dan-visa\.pdf/);
  assert.equal(classified.blocks[0].id, 'SRC-0001');
  assert.match(classifiedSourceText(classified), /MÃ SRC-0001/);
  assert.ok(classified.totalBlocks >= 4, 'mỗi nhóm thông tin của thông báo cần được kiểm toán độc lập');
  assert.ok(classified.categories.visa || classified.categories.notice);
});

test('crawler turns an official static guide page into an extractable handbook item', () => {
  const html = `<html><head><meta property="og:title" content="Health Insurance Guide for Foreign Students"></head>
    <body><main><h1>Health Insurance</h1><p>${'International students with D-2 and D-4 visas can review health insurance enrollment and contribution guidance. '.repeat(8)}</p></main></body></html>`;
  assert.equal(extractPageTitle(html), 'Health Insurance Guide for Foreign Students');
  const item = sourcePageCandidate(html, 'https://official.example/insurance', {
    source_type: 'official-guide', name: 'Official insurance guide', keywords: 'student,D-2,insurance',
  });
  assert.equal(item.url, 'https://official.example/insurance');
  assert.equal(item.suggestedSection, 'Cẩm nang & Thông tin');
  assert.match(item.excerpt, /International students/);
});

test('crawler does not publish a generic landing page as a handbook article', () => {
  const html = `<html><head><title>Home</title></head><body>${'Student visa and living information. '.repeat(20)}</body></html>`;
  assert.equal(sourcePageCandidate(html, 'https://official.example/', {
    source_type: 'official-guide', keywords: 'student,visa',
  }), null);
  assert.equal(sourcePageCandidate(html.replace('<title>Home</title>', '<title>Useful guide</title>'), 'https://official.example/', {
    source_type: 'official-news', keywords: 'student,visa',
  }), null);
});

test('popup placement and local database timestamps are stable', () => {
  assert.equal(placementForPath('/'), 'home');
  assert.equal(placementForPath('/tin-tuc/visa-moi'), 'content');
  assert.equal(placementForPath('/cau-hoi-thuong-gap'), 'other');
  assert.match(localSqlDate(new Date(2026, 8, 20, 9, 5, 7)), /^2026-09-20 09:05:07$/);
});
