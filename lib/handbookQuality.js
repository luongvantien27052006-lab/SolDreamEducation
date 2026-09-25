'use strict';

const db = require('../db');

function replaceVagueVerificationLanguage(value) {
  return String(value || '')
    .replace(/cần xác minh(?: thêm)? (?:qua|trong) (?:các )?tệp đính kèm/giu, 'chỉ được công bố trong tệp đính kèm; hãy xem tệp tại nguồn')
    .replace(/cần xác minh(?: thêm)? với cơ quan có thẩm quyền/giu, 'cần hỏi trực tiếp cơ quan có thẩm quyền')
    .replace(/cần xác minh(?: thêm)? (?:tại|trong) từng thông báo/giu, 'cần xem trong từng thông báo chính thức')
    .replace(/cần xác minh(?: thêm)? (?:từ|trên) (?:trang |nguồn )?chính thức/giu, 'cần đối chiếu trên nguồn chính thức')
    .replace(/cần xác minh(?: thêm)? từ (?:bộ phận|phòng|đơn vị|cơ quan) ([^<.!?]{1,80})/giu, 'cần hỏi trực tiếp $1')
    .replace(/cần xác minh thời hạn cụ thể/giu, 'thời hạn không được nguồn bài công bố; cần xem thông báo của kỳ cụ thể')
    .replace(/cần xác minh ngày cụ thể/giu, 'ngày cụ thể không được nguồn bài công bố')
    .replace(/(?:cần|chưa) xác minh(?: thêm)?/giu, 'cần đối chiếu với nguồn chính thức')
    // Repair the mechanical wording written by an earlier migration. These
    // context-aware replacements keep the surrounding Vietnamese sentence
    // natural instead of exposing an editorial placeholder to readers.
    .replace(/nguồn bài chưa công bố chi tiết này cập nhật mới nhất/giu, 'cần đối chiếu theo bản cập nhật mới nhất')
    .replace(/nguồn bài chưa công bố chi tiết này trực tiếp (?:với|tại) ([^<.!?]{1,100})/giu, 'cần hỏi trực tiếp $1')
    .replace(/nguồn bài chưa công bố chi tiết này trực tiếp qua/giu, 'cần kiểm tra trực tiếp qua')
    .replace(/nguồn bài chưa công bố chi tiết này trực tiếp từ/giu, 'cần kiểm tra trực tiếp từ')
    .replace(/nguồn bài chưa công bố chi tiết này theo/giu, 'cần đối chiếu theo')
    .replace(/nguồn bài chưa công bố chi tiết này qua/giu, 'cần đối chiếu qua')
    .replace(/nguồn bài chưa công bố chi tiết này từ/giu, 'cần đối chiếu từ')
    .replace(/nguồn bài chưa công bố chi tiết này tại/giu, 'cần đối chiếu tại')
    .replace(/nguồn bài chưa công bố chi tiết này chi tiết/giu, 'xem chi tiết trong nguồn chính thức')
    .replace(/nguồn bài chưa công bố chi tiết này thông tin/giu, 'cần kiểm tra thông tin')
    .replace(/nguồn bài chưa công bố chi tiết này/giu, 'nguồn chính thức hiện không nêu rõ')
    .replace(/cần đối chiếu với nguồn chính thức chi tiết/giu, 'cần xem chi tiết trong nguồn chính thức')
    .replace(/cần đối chiếu với nguồn chính thức trực tiếp/giu, 'cần kiểm tra trực tiếp');
}

function repairPublishedHandbookLanguage() {
  const rows = db.prepare(`SELECT id,title,excerpt,content FROM posts WHERE published=1 AND (
    content LIKE '%cần xác minh%' OR content LIKE '%Cần xác minh%'
    OR content LIKE '%chưa xác minh%' OR content LIKE '%Chưa xác minh%'
    OR content LIKE '%nguồn bài chưa công bố chi tiết này%'
    OR excerpt LIKE '%cần xác minh%' OR excerpt LIKE '%Cần xác minh%'
    OR excerpt LIKE '%chưa xác minh%' OR excerpt LIKE '%Chưa xác minh%'
    OR excerpt LIKE '%nguồn bài chưa công bố chi tiết này%')`).all();
  const update = db.prepare("UPDATE posts SET excerpt=?,content=?,updated_at=datetime('now','localtime') WHERE id=?");
  const transaction = db.transaction(() => {
    rows.forEach((row) => update.run(
      replaceVagueVerificationLanguage(row.excerpt),
      replaceVagueVerificationLanguage(row.content),
      row.id,
    ));
    db.prepare(`UPDATE posts SET title='Visa du học và tư cách lưu trú tại Hàn Quốc',
      seo_title=CASE WHEN seo_title='Student Visa and Stay Status' THEN 'Visa du học và tư cách lưu trú tại Hàn Quốc' ELSE seo_title END,
      updated_at=datetime('now','localtime') WHERE id=21 AND title='Student Visa and Stay Status'`).run();
    db.prepare(`UPDATE posts SET
      title='Thông báo lịch đào tạo nghiệp vụ xuất nhập cảnh tháng 9/2026',
      seo_title='Thông báo lịch đào tạo nghiệp vụ xuất nhập cảnh tháng 9/2026',
      updated_at=datetime('now','localtime')
      WHERE id=27 AND title LIKE '%đạicơ quan%'`).run();
  });
  transaction();
  return { updated: rows.length };
}

function auditPublishedHandbooks() {
  const summary = db.prepare(`SELECT COUNT(*) total,
    SUM(CASE WHEN length(trim(content))<1200 THEN 1 ELSE 0 END) short,
    SUM(CASE WHEN trim(COALESCE(source_urls,''))='' THEN 1 ELSE 0 END) missing_source,
    SUM(CASE WHEN content LIKE '%cần xác minh%' OR content LIKE '%Cần xác minh%'
      OR content LIKE '%chưa xác minh%' OR content LIKE '%Chưa xác minh%'
      OR content LIKE '%nguồn bài chưa công bố chi tiết này%' THEN 1 ELSE 0 END) vague
    FROM posts WHERE published=1`).get();
  return {
    total: Number(summary.total || 0), short: Number(summary.short || 0),
    missingSource: Number(summary.missing_source || 0), vague: Number(summary.vague || 0),
  };
}

module.exports = { replaceVagueVerificationLanguage, repairPublishedHandbookLanguage, auditPublishedHandbooks };

