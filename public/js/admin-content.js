(function () {
  'use strict';
  var form = document.querySelector('[data-content-form]');
  if (!form) return;
  var title = form.querySelector('[name="title"]');
  var slug = form.querySelector('[name="slug"]');
  var excerpt = form.querySelector('[name="excerpt"]');
  var seoTitle = form.querySelector('[data-seo-title]');
  var description = form.querySelector('[data-meta-description]');
  var focusKeyword = form.querySelector('[data-focus-keyword]');
  var author = form.querySelector('[name="author_name"]');
  var authorUrl = form.querySelector('[name="author_url"]');
  var sources = form.querySelector('[name="source_urls"]');
  var surface = form.querySelector('.rich-editor__surface');
  var scoreNode = form.querySelector('[data-quality-score]');
  var issueList = form.querySelector('[data-quality-list]');
  var dirty = false;
  function words(value) { return String(value || '').trim().split(/\s+/).filter(Boolean).length; }
  function slugify(value) { return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-'); }
  function update() {
    var effectiveTitle = (seoTitle.value || title.value).trim();
    var effectiveDescription = (description.value || excerpt.value).trim();
    var contentText = surface ? surface.textContent.trim() : '';
    var excerptWords = words(excerpt.value);
    var contentWords = words(excerpt.value + ' ' + contentText);
    var sourceCount = sources.value.split(/[\r\n,]+/).filter(function (url) { return /^https?:\/\//i.test(url.trim()); }).length;
    var issues = []; var score = 0;
    if (effectiveTitle.length >= 35 && effectiveTitle.length <= 65) score += 12; else { score += effectiveTitle ? 6 : 0; issues.push('Tiêu đề SEO nên dài 35–65 ký tự.'); }
    if (effectiveDescription.length >= 120 && effectiveDescription.length <= 165) score += 14; else { score += effectiveDescription ? 7 : 0; issues.push('Mô tả SEO nên dài 120–165 ký tự.'); }
    if (excerptWords >= 30 && excerptWords <= 60) score += 10; else { score += excerptWords >= 15 ? 5 : 0; issues.push('Tóm tắt BLUF nên có 30–60 từ.'); }
    if (contentWords >= 600) score += 16; else if (contentWords >= 300) score += 11; else if (contentWords >= 150) score += 6; else issues.push('Nội dung nên có thêm dữ liệu và trải nghiệm thực tế.');
    if (surface && surface.querySelector('h2')) score += 9; else issues.push('Thêm ít nhất một H2 dạng câu hỏi người dùng.');
    if (surface && surface.querySelector('table,ul,ol')) score += 8; else issues.push('Thêm bảng hoặc danh sách có cấu trúc.');
    if (sourceCount) score += 13; else issues.push('Thêm ít nhất một nguồn chính thức.');
    if (author.value.trim()) score += 8; else issues.push('Khai báo tác giả/chuyên viên chịu trách nhiệm.');
    if (authorUrl.value.trim()) score += 3;
    if (form.querySelector('#coverPreview[src]:not([src=""])') || (form.querySelector('#coverInput') && form.querySelector('#coverInput').files.length)) score += 4; else issues.push('Nên có ảnh bìa riêng.');
    var keyword = focusKeyword.value.trim().toLowerCase();
    if (keyword && (title.value + ' ' + excerpt.value + ' ' + contentText).toLowerCase().includes(keyword)) score += 3; else if (keyword) issues.push('Chủ đề trọng tâm chưa xuất hiện tự nhiên trong nội dung.');
    scoreNode.textContent = Math.min(100, score) + '/100';
    scoreNode.className = 'quality-score ' + (score >= 75 ? 'good' : (score >= 55 ? 'medium' : 'low'));
    issueList.innerHTML = '';
    issues.slice(0, 6).forEach(function (issue) { var li = document.createElement('li'); li.textContent = issue; issueList.append(li); });
    form.querySelector('[data-title-count]').textContent = effectiveTitle.length + '/65';
    form.querySelector('[data-description-count]').textContent = effectiveDescription.length + '/165';
    form.querySelector('[data-preview-title]').textContent = effectiveTitle || 'Tiêu đề trang';
    form.querySelector('[data-preview-description]').textContent = effectiveDescription || 'Mô tả trang sẽ xuất hiện tại đây.';
    form.querySelector('[data-preview-path]').textContent = (form.dataset.contentType || 'noi-dung') + ' › ' + (slug.value || slugify(title.value) || 'duong-dan');
    var editorStatus = form.querySelector('.rich-editor__status');
    if (editorStatus) editorStatus.textContent = contentWords.toLocaleString('vi-VN') + ' từ · ' + (surface ? surface.querySelectorAll('h2,h3').length : 0) + ' tiêu đề · ' + (surface ? surface.querySelectorAll('table').length : 0) + ' bảng. Có thể dán trực tiếp từ Word, Google Docs, Excel hoặc trang web.';
  }
  form.addEventListener('input', function () { dirty = true; window.clearTimeout(form._qualityTimer); form._qualityTimer = window.setTimeout(update, 120); });
  form.addEventListener('submit', function () { dirty = false; });
  window.addEventListener('beforeunload', function (event) { if (dirty) { event.preventDefault(); event.returnValue = ''; } });
  document.addEventListener('keydown', function (event) { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') { event.preventDefault(); dirty = false; form.requestSubmit(); } });
  update();
})();
