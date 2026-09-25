'use strict';

const db = require('../db');
const { isKoreaStudyRelevant, isAggregatorUrl, mostlyForeignLanguage, hostname } = require('./koreaScope');

const TITLE_TRANSLATIONS = new Map([
  [25, 'Hướng dẫn tra cứu xuất nhập cảnh và lưu trú trên HiKorea'],
  [33, 'Hội chợ việc làm KOTRA dành cho du học sinh quốc tế'],
  [38, 'Triển lãm hợp tác công nghiệp – học thuật – nghiên cứu 2025 dành cho du học sinh'],
  [128, 'Tuyển nhân viên phúc lợi xã hội thay thế nghỉ thai sản tại Trung tâm Cư trú Người nước ngoài Geumcheon năm 2026'],
  [132, 'Lớp luyện thi chứng chỉ ITQ tại Trung tâm Cư dân Nước ngoài Seoul'],
  [133, 'Hội thảo làm video truyện bằng AI tại Trung tâm Cư dân Nước ngoài Seoul'],
  [135, 'Chương trình đào tạo nhà tiếp thị toàn cầu Seoul 2026 dành cho sinh viên quốc tế'],
  [167, 'Chương trình học tiếng Hàn tại Incheon'],
]);
const EXCERPT_TRANSLATIONS = new Map([
  [33, 'Hội chợ việc làm do KOTRA tổ chức ngày 17/11/2026 tại Seoul, kết nối du học sinh quốc tế với các doanh nghiệp đang tuyển dụng. Người quan tâm cần kiểm tra lại điều kiện tham gia và lịch đăng ký trên thông báo chính thức.'],
  [38, 'Triển lãm hợp tác công nghiệp – học thuật – nghiên cứu năm 2025 diễn ra từ ngày 29 đến 31/10/2025 tại khu triển lãm phía Tây EXCO, Daegu. Chương trình có hoạt động tư vấn việc làm và giới thiệu doanh nghiệp cho sinh viên quốc tế tại Hàn Quốc.'],
  [132, 'Trung tâm Cư dân Nước ngoài Seoul mở lớp luyện thi chứng chỉ ITQ, nhận đăng ký từ ngày 17/09 đến 09/10/2026 và tổ chức học từ ngày 11 đến 29/10/2026. Người quan tâm cần kiểm tra hướng dẫn và điều kiện đăng ký trên trang chính thức.'],
]);

function vietnameseScore(row) {
  const text = `${row.title || ''} ${row.excerpt || ''}`;
  return (text.match(/\b(?:và|của|cho|tại|được|với|trường|học|thông tin|chương trình|sinh viên)\b/gi) || []).length
    - (String(row.title || '').match(/[\uac00-\ud7af]/g) || []).length;
}

function cleanupKoreaContent({ apply = false } = {}) {
  const posts = db.prepare(`SELECT p.*,i.source_id,s.name source_name,s.source_type
    FROM posts p LEFT JOIN research_items i ON i.published_post_id=p.id
    LEFT JOIN research_sources s ON s.id=i.source_id ORDER BY p.id`).all();
  const postIds = new Set(posts.filter((row) => row.source_urls && !isKoreaStudyRelevant({ ...row, url: row.source_urls })).map((row) => row.id));

  // One URL must produce one Vietnamese article. Keep the best Vietnamese row.
  const groups = new Map();
  posts.filter((row) => row.source_urls && !postIds.has(row.id)).forEach((row) => {
    const key = String(row.source_urls).trim();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  });
  groups.forEach((rows) => {
    if (rows.length < 2) return;
    rows.sort((a, b) => vietnameseScore(b) - vietnameseScore(a) || b.id - a.id);
    rows.slice(1).forEach((row) => postIds.add(row.id));
  });

  // Some portals expose the same notice under two language URLs. Same cover +
  // same host lets us retain the Vietnamese article and remove its foreign copy.
  posts.filter((row) => !TITLE_TRANSLATIONS.has(row.id) && row.cover_image && mostlyForeignLanguage(row.title)
    && mostlyForeignLanguage(row.excerpt) && /[\uac00-\ud7af]{5,}/.test(String(row.content || ''))).forEach((row) => {
    const counterpart = posts.find((other) => other.id !== row.id && other.cover_image === row.cover_image
      && hostname(other.source_urls) === hostname(row.source_urls) && !mostlyForeignLanguage(other.title));
    if (counterpart) postIds.add(row.id);
  });

  const programs = db.prepare('SELECT * FROM programs ORDER BY id').all();
  const programIds = programs.filter((row) => row.source_urls && (
    !isKoreaStudyRelevant({ ...row, url: row.source_urls })
    || (/(?:trường|chương trình)/i.test(row.category) && isAggregatorUrl(row.source_urls))
  )).map((row) => row.id);

  const items = db.prepare(`SELECT i.*,s.name source_name,s.source_type,s.url source_url
    FROM research_items i JOIN research_sources s ON s.id=i.source_id`).all();
  const itemIds = items.filter((row) => !isKoreaStudyRelevant(row)).map((row) => row.id);

  const preview = {
    posts: [...postIds].sort((a, b) => a - b),
    programs: programIds,
    researchItems: itemIds,
    translatedTitles: [...TITLE_TRANSLATIONS.entries()].filter(([id]) => posts.some((row) => row.id === id) && !postIds.has(id)),
  };
  if (!apply) return preview;

  db.transaction(() => {
    for (const id of postIds) {
      db.prepare("DELETE FROM faqs WHERE origin_type='post' AND origin_id=?").run(String(id));
      db.prepare('UPDATE research_items SET published_post_id=NULL WHERE published_post_id=?').run(id);
      db.prepare('DELETE FROM posts WHERE id=?').run(id);
    }
    for (const id of programIds) {
      db.prepare("DELETE FROM faqs WHERE origin_type='program' AND origin_id=?").run(String(id));
      db.prepare('DELETE FROM programs WHERE id=?').run(id);
    }
    for (const id of itemIds) db.prepare('DELETE FROM research_items WHERE id=?').run(id);
    for (const [id, title] of TITLE_TRANSLATIONS) {
      if (!postIds.has(id)) db.prepare("UPDATE posts SET title=?,seo_title=?,updated_at=datetime('now','localtime') WHERE id=?").run(title, title, id);
    }
    for (const [id, excerpt] of EXCERPT_TRANSLATIONS) {
      if (!postIds.has(id)) db.prepare("UPDATE posts SET excerpt=?,meta_description=?,updated_at=datetime('now','localtime') WHERE id=?").run(excerpt, excerpt.slice(0, 320), id);
    }
    // This source banner is mostly an empty white gradient. Use the local,
    // sharp Korean-study cover instead of presenting a washed-out card.
    db.prepare("UPDATE posts SET cover_image='/img/research-cover.svg',updated_at=datetime('now','localtime') WHERE cover_image='/uploads/research/e38807033cb36855a7d8c07be143.png'").run();
  })();
  return preview;
}

function ensureKoreaScopeCleanup() {
  const version = 'korea-only-vietnamese-v1';
  const applied = db.prepare('SELECT value FROM system_meta WHERE key=?').get('korea_scope_cleanup_version');
  if (applied?.value === version) return { applied: false };
  const result = cleanupKoreaContent({ apply: true });
  db.prepare(`INSERT INTO system_meta (key,value,updated_at) VALUES (?,?,datetime('now','localtime'))
    ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at`)
    .run('korea_scope_cleanup_version', version);
  return { applied: true, deletedPosts: result.posts.length, deletedPrograms: result.programs.length, deletedResearchItems: result.researchItems.length };
}

module.exports = { cleanupKoreaContent, ensureKoreaScopeCleanup, TITLE_TRANSLATIONS, EXCERPT_TRANSLATIONS };
