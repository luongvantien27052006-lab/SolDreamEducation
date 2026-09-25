'use strict';

const knowledge = require('../data/universities.json');
const { toVietnameseVisibleText } = require('./visibleVietnamese');

const SECTION_TOPICS = {
  overview: ['thông tin', 'tổng quan', 'địa chỉ', 'ở đâu', 'website', 'điện thoại', 'thành lập', 'loại hình', 'tư thục', 'xếp hạng', 'top', 'thế mạnh', 'nổi bật', 'cơ sở', 'campus'],
  programs: ['chương trình', 'đào tạo', 'ngành', 'chuyên ngành', 'học gì', 'nhập học', 'kỳ nhập học', 'học tiếng', 'tiếng hàn', 'cao học', 'sau đại học', 'thạc sĩ', 'tiến sĩ'],
  tuition: ['học phí', 'chi phí học', 'bao nhiêu tiền', 'won một kỳ', 'won mỗi kỳ', 'phí nhập học', 'phí xét tuyển'],
  scholarships: ['học bổng', 'topik', 'miễn học phí', 'giảm học phí', 'gpa', 'điều kiện duy trì'],
  dormitory: ['ký túc xá', 'kí túc xá', 'ktx', 'phòng ở', 'chi phí ở', 'chỗ ở'],
};

const STOP_WORDS = new Set(['cho', 'cua', 'cac', 'va', 've', 'truong', 'dai', 'hoc', 'thong', 'tin', 'toi', 'minh', 'muon', 'biet', 'giup', 'voi', 'co', 'la', 'o', 'nao']);

function normalise(value) {
  return String(value || '')
    .toLocaleLowerCase('vi-VN')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function includesTerm(query, term) {
  return query.includes(normalise(term));
}

function queryTokens(query) {
  return [...new Set(normalise(query).split(' ').filter((token) => token.length > 2 && !STOP_WORDS.has(token)))];
}

function universityAliases(university) {
  return university.aliases || [university.name, university.english_name, university.englishName, university.korean_name, university.koreanName].filter(Boolean);
}

function universitySections(university) {
  return Array.isArray(university.sections) ? university.sections : [];
}

function universityLocations(university) {
  return university.location_terms || [university.city].filter(Boolean);
}

function schoolSearchText(university) {
  return normalise([
    university.name,
    university.english_name || university.englishName,
    university.korean_name || university.koreanName,
    ...universityAliases(university),
    ...universityLocations(university),
    university.blufSummary,
    JSON.stringify(university.financials || {}),
    JSON.stringify(university.admissionCriteria || university.requirements || {}),
    ...universitySections(university).map((section) => `${section.title} ${section.content}`),
  ].join(' '));
}

function findMentionedUniversities(query) {
  return knowledge.universities.filter((university) => universityAliases(university).some((alias) => {
    const candidate = normalise(alias);
    return candidate.length >= 3 && query.includes(candidate);
  }));
}

function requestedSectionIds(query) {
  return Object.entries(SECTION_TOPICS)
    .filter(([, terms]) => terms.some((term) => includesTerm(query, term)))
    .map(([id]) => id);
}

function asksForFullProfile(query) {
  return ['đầy đủ', 'chi tiết', 'toàn bộ', 'tất cả thông tin', 'full thông tin', 'profile'].some((term) => includesTerm(query, term));
}

function isCatalogRequest(query) {
  return ['danh sách trường', 'list trường', 'các trường đại học', 'có trường nào', 'những trường nào'].some((term) => includesTerm(query, term));
}

function hasUniversityIntent(rawQuery) {
  const query = normalise(rawQuery);
  if (findMentionedUniversities(query).length) return true;
  return ['trường đại học', 'đại học hàn', 'cao đẳng hàn', 'các trường', 'so sánh trường', 'trường nào'].some((term) => includesTerm(query, term));
}

function scoreUniversity(university, tokens) {
  const text = schoolSearchText(university);
  return tokens.reduce((score, token) => score + (text.includes(token) ? 1 : 0), 0);
}

function overviewHighlight(university) {
  const overview = universitySections(university).find((section) => section.id === 'overview')?.content || '';
  const lines = overview.split('\n');
  return lines.find((line) => /^- Thế mạnh đào tạo:/i.test(line))
    || lines.find((line) => /^- Đặc điểm:/i.test(line))
    || lines.find((line) => /^- Vị trí/i.test(line))
    || '- Có hồ sơ chi tiết trong bộ nhớ chatbot.';
}

function formatCatalog() {
  const rows = knowledge.universities.map((university) => `- ${university.name} (${university.english_name || university.englishName || ''}): ${university.blufSummary || overviewHighlight(university).replace(/^- /, '')}`);
  return toVietnameseVisibleText([
    '## Dữ liệu trường đại học được nhập từ tài liệu mới',
    ...rows,
    `Lưu ý nguồn: ${knowledge.source.notice}`,
  ].join('\n'));
}

function formatUniversity(university, sectionIds) {
  const sections = universitySections(university).filter((section) => sectionIds.includes(section.id));
  const financials = university.financials || {};
  const admission = university.admissionCriteria || university.requirements || {};
  const dorm = financials.dormitoryHalfYear || (financials.dormitoryHalfYearKrw != null ? { minKrw: financials.dormitoryHalfYearKrw, maxKrw: financials.dormitoryHalfYearKrw } : null);
  return toVietnameseVisibleText([
    `## ${university.name} (${university.english_name || university.englishName || ''})`,
    `BLUF: ${university.blufSummary || 'Chưa có tóm tắt định lượng.'}`,
    `Tên gọi có thể gặp: ${universityAliases(university).join(', ')}.`,
    `Dữ liệu định lượng: học phí D4/năm ${financials.tuitionD4KrwYear ?? financials.tuitionKrwYear ?? 'chưa xác minh'} KRW; học phí D2/năm ${financials.tuitionD2KrwYear ?? 'chưa xác minh'} KRW; ký túc xá 6 tháng ${dorm ? `${dorm.minKrw}-${dorm.maxKrw} KRW` : 'chưa xác minh'}; sổ đóng băng ${financials.kStudyDepositUsd ?? financials.kStudyDeposit?.amountUsd ?? 'chưa xác minh'} USD.`,
    `Điều kiện 2026: GPA ${admission.minGpa ?? 'chưa xác minh'}; gap year ${admission.maxGapYears ?? 'chưa xác minh'}; TOPIK D4 ${admission.topikRequirementD4 ?? admission.topikRequired ?? 'chưa xác minh'}; TOPIK D2 ${admission.topikRequirementD2 ?? 'chưa xác minh'}; nhóm visa ${university.topCategory || 'chưa xác minh'}.`,
    ...sections.map((section) => `### ${section.title}\n${section.content}`),
  ].join('\n\n'));
}

function getUniversityKnowledge(rawQuery) {
  if (!hasUniversityIntent(rawQuery)) return '';

  const query = normalise(rawQuery);
  const mentioned = findMentionedUniversities(query);
  if (!mentioned.length && isCatalogRequest(query)) return formatCatalog();

  const topics = requestedSectionIds(query);
  const fullProfile = asksForFullProfile(query);
  const comparison = ['so sánh', 'đối chiếu', 'trường nào', 'tất cả các trường', 'các trường này'].some((term) => includesTerm(query, term));
  let selected = mentioned;

  if (!selected.length) {
    const tokens = queryTokens(query);
    selected = knowledge.universities
      .map((university) => ({ university, score: scoreUniversity(university, tokens) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, comparison ? 6 : 3)
      .map(({ university }) => university);
  }

  if (!selected.length) return formatCatalog();

  let sectionIds;
  if (fullProfile || (mentioned.length === 1 && topics.length === 0)) {
    sectionIds = ['overview', 'programs', 'tuition', 'scholarships', 'dormitory'];
  } else if (topics.length) {
    sectionIds = [...new Set(topics)];
  } else {
    sectionIds = ['overview', 'programs'];
  }

  return [
    selected.map((university) => formatUniversity(university, sectionIds)).join('\n\n'),
    `## Lưu ý về dữ liệu\n${knowledge.source.notice}`,
  ].join('\n\n');
}

module.exports = { getUniversityKnowledge, hasUniversityIntent, normalise };
