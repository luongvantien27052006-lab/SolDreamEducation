'use strict';
const profile = require('../data/partner-schools.json');
const MONTHLY_DOMAINS = Object.freeze([
  'overseas.mofa.go.kr', 'moe.go.kr', 'studyinkorea.go.kr', 'hikorea.go.kr',
  'visaforkorea-vt.com', 'visaforkorea-hc.com', 'cied.vn', 'mofa.gov.vn',
  'global.seoul.go.kr', 'immigration.go.kr', 'nhis.or.kr', 'incheon.go.kr',
  'moel.go.kr', 'liveinkorea.kr',
]);
function host(url) { try { const u = new URL(url); return u.protocol === 'https:' && !u.username && !u.password ? u.hostname.toLowerCase() : ''; } catch (_) { return ''; } }
function within(hostname, domain) { return hostname === domain || hostname.endsWith(`.${domain}`); }
function schoolDomain(url) {
  const hostname = host(url);
  return hostname.split('.').slice(hostname.endsWith('.ac.kr') ? -3 : -2).join('.');
}
const SCHOOL_DOMAINS = Object.freeze([...new Set([...profile.schools.map(s => schoolDomain(s.website)), 'yonsei.ac.kr'])]);
function partnerDomain(url) { const hostname = host(url); return SCHOOL_DOMAINS.find(domain => within(hostname, domain)) || ''; }
function sourcePolicy(source = {}) {
  if (source.source_type === 'university-directory') return { allowed: false, group: 'disabled', label: 'Tắt: danh mục trường toàn quốc' };
  const domain = partnerDomain(source.url);
  if (domain) return { allowed: true, group: 'schools', domain, label: 'Trường trong profile' };
  if (source.source_type === 'university' || source.source_type === 'official-news') return { allowed: false, group: 'disabled', label: 'Ngoài phạm vi nguồn đã chọn' };
  const official = MONTHLY_DOMAINS.find(domain => within(host(source.url), domain));
  return official ? { allowed: true, group: 'monthly', domain: official, label: 'Thông báo chính thức · mỗi tháng' }
    : { allowed: false, group: 'disabled', label: 'Nguồn chưa thuộc danh sách chính thức' };
}
function allowedResearchItem(source, item = {}) {
  const policy = sourcePolicy(source);
  if (!policy.allowed) return false;
  const url = item.url;
  if (policy.group === 'schools') return within(host(url), policy.domain)
    && (!item.official_url || within(host(item.official_url), policy.domain));
  if (partnerDomain(url)) return true;
  if (!MONTHLY_DOMAINS.some(domain => within(host(url), domain))) return false;
  // A government directory must not reintroduce profiles of unrelated schools.
  const schoolSpecific = /Thông tin trường|Chương trình du học/.test(item.suggested_section || item.suggestedSection || '');
  const title = String(item.title || '').toLowerCase();
  const mentionsPartner = profile.schools.some(school => title.includes(school.name.toLowerCase()) || title.includes(school.englishName.split(' — ')[0].toLowerCase()));
  return !schoolSpecific || mentionsPartner;
}
function nextMonthlyAt(timestamp) {
  // Same local day/time next calendar month in Vietnam, clamped to month-end.
  const local = new Date(Number(timestamp) + 7 * 3600000);
  const year = local.getUTCFullYear(), month = local.getUTCMonth() + 1;
  const day = Math.min(local.getUTCDate(), new Date(Date.UTC(year, month + 1, 0)).getUTCDate());
  return Date.UTC(year, month, day, local.getUTCHours(), local.getUTCMinutes(), local.getUTCSeconds(), local.getUTCMilliseconds()) - 7 * 3600000;
}
function nextSourceCrawl(source, now, schoolIntervalMs) {
  return sourcePolicy(source).group === 'monthly' ? nextMonthlyAt(now) : now + schoolIntervalMs;
}
function nextCrawlLabel(source) {
  if (!source.active || !sourcePolicy(source).allowed) return 'Không tự quét';
  return Number(source.next_crawl_at_ms) > 0
    ? new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short' }).format(new Date(source.next_crawl_at_ms))
    : 'Lượt tự động tiếp theo';
}
module.exports = { MONTHLY_DOMAINS, SCHOOL_DOMAINS, sourcePolicy, partnerDomain, allowedResearchItem, nextMonthlyAt, nextSourceCrawl, nextCrawlLabel };
