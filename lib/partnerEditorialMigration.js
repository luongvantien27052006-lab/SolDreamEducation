'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const KEY = 'partner_profiles_editorial_20261028_v1';
const hash = value => crypto.createHash('sha256').update(String(value)).digest('hex');
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function schoolHtml(school) {
  const paragraphs = rows => rows.map(text => '<p>' + escape(text) + '</p>').join('\n');
  return paragraphs([school.intro]) + '\n<h2>Chương trình và hướng học cần tìm hiểu</h2>\n<ul>' + school.programs.map(text => '<li>' + escape(text) + '</li>').join('\n') + '</ul>\n'
    + '<h2>' + escape(school.selectionTitle) + '</h2>\n' + paragraphs(school.selection)
    + '\n<h2>Đối chiếu hồ sơ, học phí và nơi ở</h2>\n' + paragraphs(school.planning)
    + '\n<p>Để sắp xếp công việc, xem <a href="/du-hoc/5-buoc-chuan-bi-ho-so-du-hoc-han-quoc">các bước chuẩn bị hồ sơ</a>, <a href="/du-hoc/chi-phi-du-hoc-han-quoc-2026-2027">cách tách chi phí dịch vụ và khoản trường thu</a> và <a href="/du-hoc">trang tổng quan du học Hàn Quốc</a>.</p>';
}

function applyPartnerEditorial(db) {
  if (db.prepare('SELECT 1 FROM system_meta WHERE key=?').get(KEY)) return null;
  const manifest = require('../data/partner-editorial-20261028/manifest.json');
  const additions = require('../data/partner-editorial-20261028/existing-schools.json');
  const schools = require('../data/partner-editorial-20261028/new-schools.json');
  return db.transaction(() => {
    const conflicts = [];
    const datasets = manifest.datasets.map(edit => {
      const row = db.prepare('SELECT * FROM site_datasets WHERE key=?').get(edit.key);
      if (!row || hash(row.content) !== edit.expectedHash) conflicts.push(edit.key);
      return row;
    });
    const yonsei = db.prepare('SELECT * FROM programs WHERE id=? AND slug=? AND published=1').get(manifest.yonsei.id, manifest.yonsei.slug);
    if (!yonsei || hash(yonsei.content) !== manifest.yonsei.expectedHash) conflicts.push(manifest.yonsei.slug);
    const partners = db.prepare("SELECT * FROM site_datasets WHERE key='partners'").get();
    if (!partners || hash(partners.content) !== manifest.partners.expectedHash) conflicts.push('partners');
    for (const school of schools) if (db.prepare('SELECT 1 FROM programs WHERE slug=?').get(school.slug)) conflicts.push(school.slug);
    // A concurrent editor's changes are never overwritten or auto-published.
    if (conflicts.length) return {applied:false, conflicts};

    const now = new Date().toISOString();
    const day = new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Ho_Chi_Minh'}).format(new Date());
    const display = new Intl.DateTimeFormat('vi-VN', {timeZone:'Asia/Ho_Chi_Minh',day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date());
    const result = {applied:true, updatedDatasets:[], updatedPrograms:[], created:[], mapped:[]};
    for (const row of datasets) {
      const data = JSON.parse(row.content), edit = additions.find(item => item.key === row.key);
      const section = JSON.parse(JSON.stringify(edit.section));
      section.content = section.blocks.map(block => block.type === 'heading' ? '#### ' + block.text : block.type === 'list' ? block.items.map(item => '- ' + item).join('\n') : block.text).join('\n');
      data.sections.splice(1, 0, section);
      data.sourceUrls = [...new Set([...(data.sourceUrls || []), ...edit.sources])];
      data.updatedDate = day; data.updatedDateDisplay = display; data.lastUpdated = day;
      db.prepare('UPDATE site_datasets SET content=?,updated_at=? WHERE key=?').run(JSON.stringify(data), now, row.key);
      result.updatedDatasets.push(row.key);
    }

    const extra = fs.readFileSync(path.join(__dirname, '../data/partner-editorial-20261028/yonsei.html'), 'utf8').trim();
    const sources = ['https://uic.yonsei.ac.kr/main/admission.php?mid=m04_02_02','https://ihs.yonsei.ac.kr/yiec_en/info/admission01.do'];
    const known = new Set(String(yonsei.source_urls || '').split(/\r?\n/));
    const missing = sources.filter(url => !known.has(url));
    db.prepare('UPDATE programs SET content=?,source_urls=?,updated_at=?,content_modified_at=? WHERE id=?')
      .run(yonsei.content + '\n' + extra, yonsei.source_urls + (missing.length ? '\n' + missing.join('\n') : ''), now, now, yonsei.id);
    result.updatedPrograms.push(yonsei.id);

    const catalogue = JSON.parse(partners.content);
    const insert = db.prepare(`INSERT INTO programs (title,subtitle,slug,excerpt,content,category,cover,cover_image,sort_order,published,created_at,updated_at,author_name,author_role,author_url,source_urls,seo_title,meta_description,focus_keyword,noindex,show_summary,show_sources,faq_mode,editorial_locked,author_type,first_published_at,content_modified_at,publication_date_source)
      VALUES (@title,@subtitle,@slug,@excerpt,@content,'Thông tin trường','p1',@cover_image,@sort_order,1,@now,@now,'SOL DREAM EDUCATION','Biên tập thông tin trường','/gioi-thieu',@source_urls,@seo_title,@meta_description,@focus_keyword,0,0,1,'off',1,'organization',@now,@now,'new_content_publication_utc')`);
    for (const [index, school] of schools.entries()) {
      const savedImage = catalogue.schools.find(item => item.name === school.name && item.englishName === school.englishName)?.image;
      const cover = /^\/uploads\/[\w.-]+\.(?:png|jpe?g|webp|avif)$/i.test(savedImage || '') ? savedImage : '';
      const inserted = insert.run({title:school.name, subtitle:school.englishName, slug:school.slug, excerpt:school.intro, content:schoolHtml(school), cover_image:cover, sort_order:300+index, now, source_urls:school.sources.join('\n'), seo_title:school.name+' | Ngành học và tuyển sinh', meta_description:school.meta, focus_keyword:school.name});
      result.created.push({id:Number(inserted.lastInsertRowid), slug:school.slug});
    }

    for (const school of catalogue.schools) {
      const added = schools.find(item => item.name === school.name && item.englishName === school.englishName);
      if (!added) continue;
      school.profilePath = '/truong-dai-hoc/' + added.slug;
      result.mapped.push({name:school.name, path:school.profilePath});
    }
    db.prepare("UPDATE site_datasets SET content=?,updated_at=? WHERE key='partners'").run(JSON.stringify(catalogue), now);
    db.prepare('INSERT INTO system_meta(key,value) VALUES (?,?)').run(KEY, JSON.stringify(result));
    return result;
  })();
}

function applyPartnerCovers(db) {
  const key = 'partner_profiles_saved_images_20261028_v1';
  if (db.prepare('SELECT 1 FROM system_meta WHERE key=?').get(key)) return null;
  const marker = db.prepare('SELECT value FROM system_meta WHERE key=?').get(KEY);
  if (!marker || !JSON.parse(marker.value).applied) return null;
  return db.transaction(() => {
    const catalogue = JSON.parse(db.prepare("SELECT content FROM site_datasets WHERE key='partners'").get().content);
    const result = {updated:[], preserved:[]};
    for (const school of require('../data/partner-editorial-20261028/new-schools.json')) {
      const image = catalogue.schools.find(item => item.name === school.name && item.englishName === school.englishName)?.image;
      const row = db.prepare('SELECT id,cover_image FROM programs WHERE slug=? AND published=1').get(school.slug);
      if (!row || row.cover_image || !/^\/uploads\/[\w.-]+\.(?:png|jpe?g|webp|avif)$/i.test(image || '')) {result.preserved.push(school.slug);continue;}
      const now = new Date().toISOString();
      db.prepare("UPDATE programs SET cover_image=?,cover_alt=?,updated_at=?,content_modified_at=? WHERE id=? AND (cover_image IS NULL OR cover_image='')")
        .run(image,'Hình ảnh '+school.name+' trong danh mục SolDream',now,now,row.id);
      result.updated.push(school.slug);
    }
    db.prepare('INSERT INTO system_meta(key,value) VALUES (?,?)').run(key,JSON.stringify(result));
    return result;
  })();
}
module.exports = {applyPartnerEditorial, applyPartnerCovers, schoolHtml, hash};
