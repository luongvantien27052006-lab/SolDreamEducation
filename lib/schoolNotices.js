'use strict';
const { allowedResearchItem } = require('./researchPolicy');
const WEEK_MS = 7 * 24 * 3600000;
const text = value => String(value || '').replace(/<[^>]*>/g, ' ').replace(/&amp;/gi, '&').replace(/&nbsp;/gi, ' ').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
function canonicalNoticeUrl(value, base) {
  try {
    const u = new URL(String(value || '').replace(/&amp;/g, '&'), base);
    if (u.protocol === 'http:' && base && u.hostname === new URL(base).hostname) u.protocol = 'https:';
    if (u.protocol !== 'https:' || u.username || u.password) return '';
    u.hash = '';
    for (const key of [...u.searchParams.keys()]) {
      if (/^(?:utm_.+|fbclid|gclid|page|s_page|pageindex|startpage|paging|article.offset|search_target|search_keyword|sort_index|order_type|s_search_text|s_search_type)$/i.test(key)) u.searchParams.delete(key);
    }
    u.searchParams.sort(); return u.toString();
  } catch (_) { return ''; }
}
function isNoticeDetail(value) {
  try {
    const u = new URL(value);
    if (/\.(?:pdf|docx?|xlsx?|hwp|hwpx|zip|jpg|png|webp)(?:$)/i.test(u.pathname)) return false;
    if (/\/page\/\d+\/?$/i.test(u.pathname) || /download|filedown|procFileOutput/i.test(u.pathname + u.search)) return false;
    if ([...u.searchParams].some(([key, val]) => /^(?:articleNo|nttId|nttSn|dataSid|BBS_NO|BOARD_IDX|board_seq|p_board_idx|bbsIdx|boardIdx|bbscttSeq|uid|seq|idx|no|num|p)$/i.test(key) && /[1-9]/.test(val))) return true;
    if (/\/view\.do$/i.test(u.pathname) && /^\d{4,}$/.test(u.searchParams.get('boardId') || '')) return true;
    if (/artclView|articleView|noticeView|boardview|(?:\/|_)read\.(?:php|jsp)|(?:\/|_)view\.(?:asp|htm)/i.test(u.pathname)) return true;
    const enc = u.searchParams.get('enc');
    if (enc && /artclView|articleView/i.test(Buffer.from(decodeURIComponent(enc), 'base64').toString())) return true;
    return /\/(?:notice|news|article|board|bbs)\/(?!page(?:\/|$))(?:[^/?]+\/)*\d{3,}\/?$/i.test(u.pathname)
      || /\/(?:archives|posts)\/\d+\/?$/i.test(u.pathname)
      || /\/(?!page\/)[a-z_][a-z0-9_-]*\/\d{5,}\/?$/i.test(u.pathname)
      || /\/20\d{2}(?:\/\d{1,2}\/|[-_])[^/]+/i.test(u.pathname);
  } catch (_) { return false; }
}
function anchorLinks(html, base) {
  const output = [];
  for (const m of String(html || '').matchAll(/<a\b[^>]*href\s*=\s*(?:"([^"]+)"|'([^']+)')[^>]*>([\s\S]*?)(?=<\/a\s*>|<a\b|<\/tr\s*>|<\/li\s*>|$)/gi)) {
    let href = m[1] || m[2];
    // Interpret two known public board link formats; never evaluate page JS.
    const khu = m[0].match(/(?:javascript:)?view\(['"](\d+)['"]/i);
    const sogang = m[0].match(/viewData\(['"](\d+)['"]/i);
    const hannam = m[0].match(/viewBoardProcess\(['"](\d+)['"]/i);
    if (khu && /\.khu\.ac\.kr$/.test(new URL(base).hostname) && /\/bbs\/.+\/list\.do/.test(base)) {
      const u = new URL(base); u.pathname = u.pathname.replace(/list\.do$/, 'view.do'); u.searchParams.set('boardId', khu[1]); href = u.toString();
    } else if (sogang && /\.sogang\.ac\.kr$/.test(new URL(base).hostname) && /\/notice\.asp/.test(base)) {
      const u = new URL('notice_view.asp', base); u.searchParams.set('BOARD_IDX', sogang[1]); href = u.toString();
    } else if (hannam && /\.hannam\.ac\.kr$/.test(new URL(base).hostname)) {
      const u = new URL('5_1_view.asp', base); u.searchParams.set('p_board_idx', hannam[1]); href = u.toString();
    }
    const url = canonicalNoticeUrl(href, base), title = text(m[3]);
    if (url && title) output.push({ url, title, offset: m.index });
  }
  return output;
}
function extractNoticeLists(html, base, source) {
  const links = anchorLinks(html, base).filter(a => allowedResearchItem(source, a) && !isNoticeDetail(a.url)
    && /공지사항|새소식|알림|게시판|notice|announcement|news|thông báo/i.test(a.title)
    && !/faq|q&a|gallery|photo|사진|포토|언론|press|취업/i.test(a.title));
  return [...new Set(links.sort((a, b) => Number(/입학|국제|유학생|admission|international/i.test(b.title + b.url)) - Number(/입학|국제|유학생|admission|international/i.test(a.title + a.url))).map(a => a.url))].slice(0, 2);
}
function extractNoticeLinks(html, base, source) {
  const sourceHtml = String(html || ''); const rows = [];
  for (const m of sourceHtml.matchAll(/<(?:tr|li)\b[^>]*>[\s\S]*?<\/(?:tr|li)>/gi)) rows.push({ start: m.index, end: m.index + m[0].length, html: m[0] });
  const seen = new Set(), output = [];
  for (const a of anchorLinks(sourceHtml, base)) {
    if (a.title.length < 6 || a.title.length > 400 || seen.has(a.url) || !isNoticeDetail(a.url) || !allowedResearchItem(source, a)) continue;
    if (/^(?:next|previous|more|목록|이전|다음|상세보기|더보기|view|read more)$/i.test(a.title)) continue;
    const row = rows.find(r => r.start <= a.offset && r.end >= a.offset);
    const visible = text(row?.html || a.title);
    const date = visible.match(/\b(20\d{2})[.\/-]\s*(\d{1,2})[.\/-]\s*(\d{1,2})\b/);
    const shortDate = !date && visible.match(/(?:^|\s)(\d{2})[.\/-](\d{2})[.\/-](\d{2})(?:\s|$)/);
    const publishedAt = date ? `${date[1]}-${date[2].padStart(2, '0')}-${date[3].padStart(2, '0')}`
      : shortDate ? `20${shortDate[1]}-${shortDate[2]}-${shortDate[3]}` : '';
    seen.add(a.url); output.push({ title: a.title, url: a.url, publishedAt, suggestedSection: 'Thông tin Hàn Quốc', contentKind: 'school-update' });
    if (output.length === 50) break;
  }
  return output;
}
function extractNoticeBody(html) {
  const source = String(html || '').replace(/<(?:nav|header|footer|aside|script|style)\b[^>]*>[\s\S]*?<\/(?:nav|header|footer|aside|script|style)>/gi, '');
  const candidates = [...source.matchAll(/<(div|section|article)\b[^>]*(?:id|class)=["'][^"']*(?:bo_v_con|xe_content|entry-content|article-content|artclView|view[_-]?(?:con|content|body)|board[_-]?(?:content|view)|bbs[_-]?(?:content|view)|document_[0-9]+)[^"']*["'][^>]*>/gi)];
  for (const m of candidates) {
    const tags = /<\/?(div|section|article)\b[^>]*>/gi; tags.lastIndex = m.index; let depth = 0, tag;
    while ((tag = tags.exec(source))) {
      if (tag[1].toLowerCase() !== m[1].toLowerCase()) continue;
      depth += /^<\//.test(tag[0]) ? -1 : 1;
      if (!depth) { const body = source.slice(m.index, tags.lastIndex); if (text(body).length > 30) return body; break; }
    }
  }
  return source.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)?.[1]
    || source.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] || source;
}
module.exports = { WEEK_MS, canonicalNoticeUrl, isNoticeDetail, extractNoticeLists, extractNoticeLinks, extractNoticeBody };
