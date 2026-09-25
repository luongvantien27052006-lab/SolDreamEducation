'use strict';

const { getCourses } = require('./courseKnowledge');
const { getUniversityKnowledge, normalise } = require('./universityKnowledge');
const { getRelevantKnowledge } = require('./chatKnowledge');
const { getPublishedPrograms, getPublishedPosts, getRelevantWebsiteDocuments } = require('./websiteKnowledge');
const universityData = require('../data/universities.json');
const { toVietnameseVisibleText } = require('./visibleVietnamese');

const CONTACT = 'Hotline/Zalo: 0364 648 282\nEmail: soldream.edu@gmail.com\nĐịa chỉ: 89 đường S11, phường Tây Thạnh, quận Tân Phú, TP.HCM.';

function cleanKnowledge(value, maxLength = 4800) {
  const text = String(value || '')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/^BỘ NHỚ KIẾN THỨC ĐÃ LƯU TRƯỚC ĐÂY.*$/gmi, '')
    .replace(/^Bộ nhớ đã lưu không có mục nào khớp chắc chắn.*$/gmi, '')
    .replace(/^\[(?:program|post|course|page|faq|catalog|organization)\]\s*/gmi, '')
    .replace(/^Trang nội bộ:\s*\S+\s*$/gmi, '')
    .replace(/^Cập nhật:\s*.*$/gmi, '')
    .replace(/\*\*/g, '')
    .replace(/^QUY TẮC DỮ LIỆU:.*$/gmi, '')
    .replace(/^DỮ LIỆU ĐƯỢC TRUY XUẤT.*$/gmi, '')
    .replace(/Khi người dùng[^.]+\./gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  const vietnameseText = toVietnameseVisibleText(text);
  return vietnameseText.length > maxLength ? `${vietnameseText.slice(0, maxLength).replace(/\s+\S*$/, '')}…` : vietnameseText;
}

function pageReference(url) {
  return url ? `Bạn có thể xem thêm thông tin tại trang [**${url}**](${url}).` : '';
}

function findStructuredUniversity(message) {
  const query = normalise(message);
  return universityData.universities.find((university) => {
    const aliases = university.aliases || [university.name, university.english_name, university.englishName, university.korean_name, university.koreanName];
    return aliases.filter(Boolean).some((alias) => query.includes(normalise(alias)));
  });
}

function findNamedPublishedSchool(message) {
  const query = normalise(message);
  const generic = new Set(['dai', 'hoc', 'quoc', 'gia', 'truong', 'thong', 'tin']);
  return getPublishedPrograms().find((program) => {
    if (program.category !== 'Thông tin trường') return false;
    const title = normalise(program.title);
    if (query.includes(title)) return true;
    const identifyingTerms = title.split(/\s+/)
      .filter((term) => term.length >= 5 && !generic.has(term));
    return identifyingTerms.length > 0 && identifyingTerms.every((term) => query.includes(term));
  });
}

function publishedPageReply(message, preferredUrl = '') {
  const query = normalise(message);
  const documents = getRelevantWebsiteDocuments(message, { maxDocuments: 30 });
  const candidates = documents.filter((document) => ['program', 'post', 'course'].includes(document.type));
  const entityQuery = query
    .replace(/\b(?:thong tin|cho toi|toi muon biet|giup toi|ve|truong)\b/g, ' ')
    .replace(/\s+/g, ' ').trim();
  // A question normally contains extra intent words (for example “học phí” or
  // “visa”), so also match when it contains the complete published page title.
  // This keeps a named school ahead of a newer unrelated article sharing those
  // generic terms.
  const explicitlyNamedPage = candidates.find((document) => {
    const title = normalise(document.title);
    return title.length >= 8 && query.includes(title);
  });
  const exactNamedPage = entityQuery.length >= 8
    ? candidates.find((document) => normalise(document.title).includes(entityQuery))
    : null;
  const primary = candidates.find((document) => preferredUrl && document.url === preferredUrl)
    || explicitlyNamedPage || exactNamedPage || candidates[0];
  const nearestOtherPage = candidates.find((document) => document.url !== primary?.url);
  const hasNamedMatch = Boolean(preferredUrl || explicitlyNamedPage || exactNamedPage);
  if (!primary || primary.score < 7 || (!hasNamedMatch && nearestOtherPage && primary.score - nearestOtherPage.score < 3)) return '';

  const samePage = documents.filter((document) => document.url === primary.url);
  const ordered = [primary, ...samePage.filter((document) => document.id !== primary.id)];
  const seen = new Set();
  const lines = [];
  for (const document of ordered) {
    for (const rawLine of cleanKnowledge(document.text, 5000).split(/\r?\n/)) {
      const line = rawLine.trim();
      const key = normalise(line);
      const isTableLine = line.includes('|');
      if (!line || (!isTableLine && key.length < 3) || seen.has(key) || (!isTableLine && line.length < 25 && !/\d/.test(line))) continue;
      seen.add(key);
      lines.push(line);
      if (lines.join('\n').length >= 2200) break;
    }
    if (lines.join('\n').length >= 2200) break;
  }
  const joined = lines.join('\n');
  const content = joined.length > 2200
    ? `${joined.slice(0, 2200).replace(/\s+\S*$/, '').trim()}…`
    : joined.trim();
  return [content, pageReference(primary.url)].filter(Boolean).join('\n\n');
}

function publishedFaqReply(message) {
  const query = normalise(message);
  const rankedFaqs = getRelevantWebsiteDocuments(message, { maxDocuments: 20 })
    .filter((document) => document.type === 'faq');
  const exactFaq = rankedFaqs.find((document) => {
      if (document.score < 35) return false;
      const title = normalise(document.title);
      return query === title || query.includes(title) || (query.length >= 18 && title.includes(query));
    });
  const first = rankedFaqs[0];
  const second = rankedFaqs[1];
  // Short natural questions rarely repeat the stored FAQ verbatim. Accept a
  // clearly dominant FAQ while keeping a score gap so an ambiguous topic is
  // still handled by the page/topic retriever below.
  const hasNamedSchool = Boolean(findStructuredUniversity(message) || findNamedPublishedSchool(message));
  const strongFaq = !hasNamedSchool && first && first.score >= 24 && (!second || first.score - second.score >= 4) ? first : null;
  const faq = exactFaq || strongFaq;
  if (!faq) return '';
  const answer = cleanKnowledge(faq.text, 1800)
    .replace(/^(?:Du học|Đào tạo tiếng|Thông tin sinh hoạt tại Hàn Quốc|Thông tin trường)\.\s*/u, '');
  return [answer, pageReference(faq.url)].filter(Boolean).join('\n\n');
}

function courseCatalog(includePrice = false) {
  const courses = getCourses();
  if (!includePrice) return courses.map((course) => `- ${course.name} — ${course.audience}`).join('\n');
  const cell = (value) => String(value || 'Chưa công bố').replace(/\r?\n/g, ' ').replace(/\|/g, '\\|').trim();
  return [
    '| Khóa học | Học phí đã công bố |',
    '| --- | --- |',
    ...courses.map((course) => `| ${cell(course.name)} | ${cell(course.price)} |`),
  ].join('\n');
}

function handbookCatalogReply() {
  const posts = getPublishedPosts();
  if (!posts.length) return 'Website hiện chưa có cẩm nang hoặc bài viết nào được xuất bản.';
  const categoryCounts = new Map();
  posts.forEach((post) => categoryCounts.set(post.category || 'Cẩm nang & Thông tin', (categoryCounts.get(post.category || 'Cẩm nang & Thông tin') || 0) + 1));
  const categories = [...categoryCounts.entries()].map(([category, count]) => `${category}: ${count}`).join('; ');
  const visible = posts.slice(0, 25).map((post) => `- [${post.title}](/tin-tuc/${post.slug})`).join('\n');
  const remaining = posts.length > 25 ? `\n\nCòn ${posts.length - 25} bài khác đã được lập chỉ mục. Bạn có thể hỏi theo tên bài hoặc chủ đề để mình đọc đúng nội dung chi tiết.` : '';
  return `Website hiện có ${posts.length} bài trong mục Cẩm nang & Thông tin (${categories}). Các bài mới nhất:\n${visible}${remaining}\n\nXem toàn bộ tại [**/tin-tuc**](/tin-tuc).`;
}

const TOPIC_INTENTS = Object.freeze([
  { name: 'insurance', triggers: ['bao hiem', 'nhis', 'an sinh xa hoi', 'bao hiem y te'], evidence: ['bao hiem', 'nhis', 'an sinh'] },
  { name: 'visa', triggers: ['visa', 'thi thuc', 'd2', 'd4'], evidence: ['visa', 'thi thuc', 'd-2', 'd-4', 'd2', 'd4'] },
  { name: 'scholarship', triggers: ['hoc bong', 'gks'], evidence: ['hoc bong', 'gks'] },
  { name: 'housing', triggers: ['ky tuc xa', 'nha o sinh vien', 'cho o'], evidence: ['ky tuc xa', 'nha o', 'cho o'] },
  { name: 'work', triggers: ['viec lam', 'lam them', 'di lam'], evidence: ['viec lam', 'lam them', 'lao dong'] },
  { name: 'admission', triggers: ['tuyen sinh', 'ho so du hoc', 'dieu kien nhap hoc'], evidence: ['tuyen sinh', 'ho so', 'nhap hoc'] },
]);

function detectTopicIntent(message) {
  const query = normalise(message);
  return TOPIC_INTENTS.find((intent) => intent.triggers.some((trigger) => query.includes(trigger))) || null;
}

function topicKnowledgeReply(message) {
  const intent = detectTopicIntent(message);
  if (!intent) return '';
  const candidates = getRelevantWebsiteDocuments(message, { maxDocuments: 40 })
    .filter((document) => ['post', 'program', 'course'].includes(document.type))
    .filter((document) => {
      const haystack = normalise(`${document.title} ${document.text}`);
      return intent.evidence.some((term) => haystack.includes(term));
    });
  if (!candidates.length) return '';

  // Rank complete pages instead of individual chunks. A query may match one
  // subsection very strongly; all chunks from that page are then used to
  // produce a complete answer with the canonical internal link.
  const pageScores = new Map();
  for (const document of candidates) {
    const current = pageScores.get(document.url) || { url: document.url, score: 0, matches: 0 };
    current.score = Math.max(current.score, Number(document.score) || 0);
    current.matches += 1;
    pageScores.set(document.url, current);
  }
  const best = [...pageScores.values()]
    .sort((left, right) => (right.score + Math.min(right.matches, 4)) - (left.score + Math.min(left.matches, 4)))[0];
  if (!best || best.score < 7) return '';
  return publishedPageReply(message, best.url);
}

function buildLocalReply(message) {
  const query = normalise(message);
  if (['lien he', 'hotline', 'zalo', 'so dien thoai', 'dia chi', 'email', 'tu van vien'].some((term) => query.includes(term))) {
    return `Bạn có thể liên hệ chuyên viên SOL DREAM EDUCATION qua:\n${CONTACT}`;
  }

  const asksCourse = query === 'tieng han' || [
    'khoa hoc', 'lop hoc', 'hoc tieng', 'khoa tieng han',
    'tieng han giao tiep', 'tieng han cap toc', 'tieng han so cap', 'tieng han trung cap',
  ].some((term) => query.includes(term));
  // Do not use the bare token "gia" here: it is also present in common
  // phrases such as "quoc gia" and previously made an NHIS article question
  // fall into the language-course price answer.
  const asksPrice = ['hoc phi', 'chi phi', 'bao nhieu tien', 'muc gia', 'bao gia', 'gia khoa hoc', 'gia bao nhieu']
    .some((term) => query.includes(term));
  const hasExplicitStudyAbroadIntent = ['du hoc', 'dai hoc', 'truong', 'visa', 'd2', 'd4', 'topik', 'gpa'].some((term) => query.includes(term));
  if ((asksCourse || (asksPrice && asksCourse)) && !hasExplicitStudyAbroadIntent) {
    return `Các khóa học đang có tại SOL DREAM EDUCATION:\n${courseCatalog(asksPrice)}\n\nLịch học, thời lượng và ưu đãi cần được xác nhận tại thời điểm đăng ký. Hotline/Zalo: 0364 648 282.`;
  }

  // When the user explicitly names an article, answer from all indexed
  // sections of that page instead of stopping at its short generated FAQ.
  if (/(?:bai viet|cam nang|tin tuc)/.test(query)) {
    // A generic phrase such as “bài bảo hiểm mới nhất” names a topic, not an
    // exact article title. Resolve that topic first so generic words like
    // “bài” and “mới nhất” cannot outrank the requested subject.
    const hasQuotedTitle = /[“"][^”"]{8,}[”"]/.test(String(message || ''));
    const topicArticleReply = !hasQuotedTitle && detectTopicIntent(message) ? topicKnowledgeReply(message) : '';
    if (topicArticleReply) return topicArticleReply;
    const articleReply = publishedPageReply(message);
    if (articleReply) return articleReply;
  }

  // Topic intent must run before generic FAQ/page matching. Otherwise common
  // words such as “Hàn Quốc”, “mới nhất” and “gồm những gì” can select an
  // unrelated recent article even though the user clearly asked about NHIS,
  // visa, học bổng, nhà ở or việc làm.
  // A named school is more specific than a broad topic token. For example,
  // “Đại học Pusan ... visa D4-1” must be answered from Pusan's profile,
  // rather than from the newest generic visa article.
  const hasNamedUniversity = Boolean(findStructuredUniversity(message) || findNamedPublishedSchool(message));
  const earlyTopicReply = !hasNamedUniversity && detectTopicIntent(message) ? topicKnowledgeReply(message) : '';
  if (earlyTopicReply) return earlyTopicReply;

  const faqReply = publishedFaqReply(message);
  if (faqReply) return faqReply;

  const asksHandbookCatalog = /(?:cam nang|bai viet|tin tuc)/.test(query)
    && /(?:tat ca|danh sach|co nhung|hien co|tren web|tren website|website co)/.test(query);
  if (asksHandbookCatalog) return handbookCatalogReply();

  const structuredUniversity = findStructuredUniversity(message);
  if (structuredUniversity) {
    const university = getUniversityKnowledge(message);
    const url = `/truong-dai-hoc/${structuredUniversity.slug || structuredUniversity.id}`;
    const needsStoredProgramme = /thac si|tien si|golf|beauty|make up|e visa|visa dien tu/.test(query);
    const knowledge = needsStoredProgramme ? getRelevantKnowledge(message) : university;
    return `${cleanKnowledge(knowledge, 5200)}\n\n${pageReference(url)}`;
  }

  const namedPublishedSchool = findNamedPublishedSchool(message);
  if (namedPublishedSchool) {
    const schoolUrl = `/truong-dai-hoc/${namedPublishedSchool.slug || namedPublishedSchool.id}`;
    const schoolReply = publishedPageReply(message, schoolUrl);
    if (schoolReply) return schoolReply;
  }

  const pageReply = publishedPageReply(message);
  if (pageReply) return pageReply;

  const topicReply = topicKnowledgeReply(message);
  if (topicReply) return topicReply;

  const university = getUniversityKnowledge(message);
  if (university) return cleanKnowledge(university, 4200);

  const asksPrograms = ['chuong trinh du hoc', 'cac chuong trinh', 'co chuong trinh nao', 'cac he du hoc'].some((term) => query.includes(term));
  if (asksPrograms) {
    const programs = getPublishedPrograms();
    return `Các chương trình và hồ sơ trường đang được công bố trên website:\n${programs.map((program) => `- ${program.title}: ${program.excerpt}`).join('\n')}\n\nBạn hãy cho mình biết chương trình hoặc trường muốn tìm hiểu chi tiết.`;
  }

  if (['tin moi', 'tin tuc moi', 'bai viet moi', 'cam nang moi'].some((term) => query.includes(term))) {
    const posts = getPublishedPosts();
    return `Tin tức và cẩm nang đang được công bố, mới nhất trước:\n${posts.map((post) => `- ${post.title}: ${post.excerpt}`).join('\n')}`;
  }

  const hasPublishedStudyAbroadMatch = getRelevantWebsiteDocuments(message, { maxDocuments: 4 })
    .some((document) => document.type === 'program' && document.score >= 9);
  const asksStudyAbroad = hasPublishedStudyAbroadMatch || ['du hoc', 'dai hoc', 'truong', 'visa', 'd2', 'd4', 'topik', 'gpa'].some((term) => query.includes(term));
  if (asksCourse) {
    return `Các khóa học đang có tại SOL DREAM EDUCATION:\n${courseCatalog(asksPrice)}\n\nLịch học, thời lượng và ưu đãi cần được xác nhận tại thời điểm đăng ký. Hotline/Zalo: 0364 648 282.`;
  }

  if (asksStudyAbroad || ['hoc bong', 'lam them', 'hoc phi', 'chi phi'].some((term) => query.includes(term))) {
    return `${cleanKnowledge(getRelevantKnowledge(message), 6500)}\n\nThông tin visa, học phí và kỳ tuyển sinh có thể thay đổi; vui lòng xác nhận theo hồ sơ thực tế qua Hotline/Zalo 0364 648 282.`;
  }

  return [
    'Mình có thể tra cứu ngay các nội dung sau:',
    '- Khóa tiếng Hàn và học phí đã công bố.',
    '- Chương trình D2-1, D2-6, D4-1 và D2-2.',
    '- Thông tin trường, ngành học, học phí, học bổng và ký túc xá.',
    '- Điều kiện GPA, TOPIK, hồ sơ và lộ trình du học Hàn Quốc.',
    'Bạn hãy cho mình biết tên trường hoặc nội dung muốn tìm hiểu nhé.',
  ].join('\n');
}

module.exports = {
  buildLocalReply, cleanKnowledge, courseCatalog, handbookCatalogReply, pageReference,
  publishedPageReply, publishedFaqReply, detectTopicIntent, topicKnowledgeReply, CONTACT,
};
