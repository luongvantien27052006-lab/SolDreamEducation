'use strict';

const KOREA_RE = /(?:hàn\s*quốc|korea(?:n)?|seoul|busan|pusan|incheon|daegu|daejeon|gwangju|jeju|대한민국|한국|서울|부산|인천|대구|대전|광주|제주|\.kr\b)/i;
const STUDY_RE = /(?:du\s*học|du\s*hoc|sinh\s*viên\s*quốc\s*tế|học\s*bổng|tuyển\s*sinh|nhập\s*học|đại\s*học|trường\s+đại\s+học|ngành\s*học|học\s*phí|ký\s*túc|tiếng\s*hàn|topik|visa|d-?2|d-?4|gks|admission|international\s+student|foreign\s+student|global\s+student|university|college|scholarship|tuition|major|department|dormitory|korean\s+language|study\s+in\s+korea|유학|유학생|대학교|대학|입학|모집|장학|학비|학과|기숙사|한국어|어학당|비자)/i;
const LIFE_RE = /(?:người\s+nước\s+ngoài|cư\s+dân\s+nước\s+ngoài|cư\s+trú|xuất\s+nhập\s+cảnh|sinh\s+hoạt|sinh\s+sống|đời\s+sống|cuộc\s+sống|định\s+cư|nhà\s+ở|bảo\s+hiểm|y\s+tế|sức\s+khỏe|thai\s+sản|khám\s+chữa|bảo\s+hộ\s+công\s+dân|làm\s+thêm|việc\s+làm|tuyển\s+dụng\s+nhân\s+sự|lao\s+động|an\s+toàn\s+lao\s+động|lãnh\s+sự|foreign\s+resident|expatriate|immigration|residence|housing|medical|health\s+insurance|part-time|employment|labor|worker|living\s+in\s+korea|외국인|체류|출입국|생활|주거|건강보험|취업|근로)/i;
const FOREIGN_RE = /(?:nhật\s*bản|japan(?:ese)?|singapore|hà\s*lan|netherlands|canada|hungary|đài\s*loan|taiwan|hồng\s*kông|hong\s*kong|trung\s*quốc|china|australia|new\s*zealand|pháp|france|đức|germany|ba\s*lan|poland|malaysia|thái\s*lan|thailand|indonesia|philippines|vương\s*quốc\s*anh|united\s*kingdom|hoa\s*kỳ|united\s*states|study\s+in\s+(?:singapore|japan|canada|australia|netherlands))/i;

const AGGREGATOR_HOSTS = [
  'studyinkorea.go.kr', 'cied.vn', 'facebook.com', 'youtube.com', 'instagram.com',
  'wikipedia.org', 'naver.com', 'blog.naver.com', 'daum.net', 'tistory.com',
];

function plain(value) {
  return String(value || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function hostname(value) {
  try { return new URL(String(value || '')).hostname.toLowerCase().replace(/^www\./, ''); }
  catch (_) { return ''; }
}

function isAggregatorUrl(value) {
  const host = hostname(value);
  return AGGREGATOR_HOSTS.some((entry) => host === entry || host.endsWith(`.${entry}`));
}

function isOfficialUniversityUrl(value) {
  const host = hostname(value);
  if (!host || isAggregatorUrl(value)) return false;
  return /(?:^|\.)[a-z0-9-]+\.ac\.kr$/i.test(host)
    || /(?:^|\.)(?:snu|yonsei|korea|hansung|pusan|pknu|knu|cau|ewha|hanyang|sogang|skku|konkuk|hongik|sejong|kyunghee|ajou|inha)\.ac\.kr$/i.test(host);
}

function isKoreaStudyRelevant(record = {}) {
  const url = String(record.url || record.source_url || record.source_urls || '');
  const text = plain([record.title, url].filter(Boolean).join(' '));
  if (!text) return false;

  // A Korean university's own domain is sufficient; its navigation can omit
  // the country name while still being an authoritative Korean source.
  if (isOfficialUniversityUrl(url)) return true;
  if (FOREIGN_RE.test(text) && !KOREA_RE.test(text)) return false;
  const declaredSchoolContent = /^(?:university|university-directory)$/i.test(String(record.source_type || ''))
    || /(?:Thông tin trường|Chương trình du học)/i.test(String(record.suggested_section || record.category || ''));
  return KOREA_RE.test(text) && (STUDY_RE.test(text) || LIFE_RE.test(text) || declaredSchoolContent);
}

function mostlyForeignLanguage(value) {
  const text = plain(value);
  if (!text) return false;
  const hangul = (text.match(/[\uac00-\ud7af]/g) || []).length;
  const vietnameseSignals = (text.match(/\b(?:và|của|cho|tại|được|với|trường|học|thông tin|chương trình|sinh viên)\b/gi) || []).length;
  const latinWords = text.match(/[A-Za-z]{3,}/g) || [];
  return hangul >= 5 || (latinWords.length >= 6 && vietnameseSignals < 2);
}

module.exports = {
  KOREA_RE, STUDY_RE, LIFE_RE, FOREIGN_RE, plain, hostname, isAggregatorUrl,
  isOfficialUniversityUrl, isKoreaStudyRelevant, mostlyForeignLanguage,
};
