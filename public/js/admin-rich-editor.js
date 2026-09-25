(function () {
  'use strict';

  var ALLOWED = new Set(['P','DIV','SPAN','BR','HR','H2','H3','H4','H5','H6','STRONG','B','EM','I','U','S','SUB','SUP','MARK','UL','OL','LI','BLOCKQUOTE','PRE','CODE','TABLE','CAPTION','THEAD','TBODY','TFOOT','TR','TH','TD','A','IMG','VIDEO','SOURCE','FIGURE','FIGCAPTION']);
  var DROP = new Set(['SCRIPT','STYLE','IFRAME','OBJECT','EMBED','FORM','INPUT','BUTTON','TEXTAREA','SELECT','OPTION','META','LINK','BASE','SVG','MATH']);
  var SAFE_STYLES = new Set(['text-align','vertical-align','font-weight','font-style','text-decoration','color','background-color','width','height','min-width','max-width','font-size','font-family','line-height','letter-spacing','white-space','text-indent','list-style-type','border','border-top','border-right','border-bottom','border-left','border-collapse','padding','padding-top','padding-right','padding-bottom','padding-left','margin','margin-top','margin-right','margin-bottom','margin-left']);

  function cleanUrl(value, image) {
    var url = String(value || '').trim();
    if (!url || /^(javascript|vbscript|file|data):/i.test(url)) return '';
    return (image ? /^(https?:\/\/|\/uploads\/)/i : /^(https?:\/\/|mailto:|tel:|\/|#)/i).test(url) ? url : '';
  }

  function cleanHtml(html) {
    var template = document.createElement('template');
    template.innerHTML = String(html || '');
    Array.from(template.content.querySelectorAll('*')).forEach(function (node) {
      if (DROP.has(node.tagName)) { node.remove(); return; }
      if (!ALLOWED.has(node.tagName)) { node.replaceWith.apply(node, Array.from(node.childNodes)); return; }
      Array.from(node.attributes).forEach(function (attr) {
        var name = attr.name.toLowerCase();
        if (name.indexOf('on') === 0 || name === 'class' || name === 'id') { node.removeAttribute(attr.name); return; }
        if (name === 'style') {
          Array.from(node.style).forEach(function (property) {
            if (!SAFE_STYLES.has(property.toLowerCase()) || /expression|url\s*\(|javascript|behavior\s*:/i.test(node.style.getPropertyValue(property))) node.style.removeProperty(property);
          });
          if (!node.getAttribute('style')) node.removeAttribute('style');
          return;
        }
        var permitted = (node.tagName === 'A' && ['href','title'].includes(name)) ||
          (node.tagName === 'IMG' && ['src','alt','title','width','height'].includes(name)) ||
          (node.tagName === 'VIDEO' && ['src','poster','controls','playsinline','preload','width','height'].includes(name)) ||
          (node.tagName === 'SOURCE' && ['src','type'].includes(name)) ||
          (['TD','TH'].includes(node.tagName) && ['colspan','rowspan'].includes(name)) ||
          (['OL','LI'].includes(node.tagName) && ['start','value'].includes(name));
        if (!permitted) node.removeAttribute(attr.name);
      });
      if (node.tagName === 'A') {
        var href = cleanUrl(node.getAttribute('href'), false);
        if (href) { node.setAttribute('href', href); if (/^https?:/i.test(href)) { node.target = '_blank'; node.rel = 'noopener noreferrer'; } }
        else node.removeAttribute('href');
      }
      if (node.tagName === 'IMG') {
        var src = cleanUrl(node.getAttribute('src'), true);
        if (src) node.setAttribute('src', src); else node.remove();
      }
      if (node.tagName === 'VIDEO') {
        var videoSrc = node.getAttribute('src');
        if (videoSrc) {
          videoSrc = cleanUrl(videoSrc, true);
          if (videoSrc) node.setAttribute('src', videoSrc); else node.removeAttribute('src');
        }
        var poster = node.getAttribute('poster');
        if (poster) {
          poster = cleanUrl(poster, true);
          if (poster) node.setAttribute('poster', poster); else node.removeAttribute('poster');
        }
        node.setAttribute('controls', '');
        node.setAttribute('playsinline', '');
        node.setAttribute('preload', 'metadata');
      }
      if (node.tagName === 'SOURCE') {
        var sourceSrc = cleanUrl(node.getAttribute('src'), true);
        if (sourceSrc) node.setAttribute('src', sourceSrc); else node.remove();
      }
    });
    return template.innerHTML;
  }

  function insertHtml(html) {
    document.execCommand('insertHTML', false, html);
  }

  function escapeAttribute(value) {
    return String(value || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function tableHtml(rows, columns) {
    var body = '';
    for (var row = 0; row < rows; row += 1) {
      body += '<tr>';
      for (var column = 0; column < columns; column += 1) body += row === 0 ? '<th>Tiêu đề</th>' : '<td>Nội dung</td>';
      body += '</tr>';
    }
    return '<div style="overflow-x: auto"><table><tbody>' + body + '</tbody></table></div><p><br></p>';
  }

  function isSupportedMedia(file) {
    return file && /^(?:image\/(?:jpeg|jpg|png|webp|gif|avif)|video\/(?:mp4|webm|quicktime|x-m4v))$/i.test(file.type || '');
  }

  function uploadMedia(file, status) {
    if (!isSupportedMedia(file)) return Promise.reject(new Error('Định dạng chưa được hỗ trợ. Hãy dùng ảnh JPG/PNG/WebP/GIF/AVIF hoặc video MP4/WebM/MOV/M4V.'));
    var isVideo = file.type.indexOf('video/') === 0;
    status.textContent = isVideo ? 'Đang tải video lên… 0%' : 'Đang tải ảnh lên… 0%';
    var data = new FormData();
    data.append('media', file, file.name || (isVideo ? 'video.mp4' : 'anh.png'));

    return new Promise(function (resolve, reject) {
      var request = new XMLHttpRequest();
      request.open('POST', '/admin/upload-media');
      request.withCredentials = true;
      request.upload.addEventListener('progress', function (event) {
        if (!event.lengthComputable) return;
        var percent = Math.min(99, Math.round((event.loaded / event.total) * 100));
        status.textContent = (isVideo ? 'Đang tải video lên… ' : 'Đang tải ảnh lên… ') + percent + '%';
      });
      request.addEventListener('load', function () {
        var result = {};
        try { result = JSON.parse(request.responseText || '{}'); } catch (_) { /* server or proxy returned HTML */ }
        if (request.status < 200 || request.status >= 300) return reject(new Error(result.error || 'Không tải được tệp media. Vui lòng kiểm tra dung lượng và thử lại.'));
        status.textContent = (result.type === 'video' ? 'Video' : 'Ảnh') + ' đã tải xong và được chèn vào nội dung.';
        return resolve(result);
      });
      request.addEventListener('error', function () { reject(new Error('Mất kết nối khi tải tệp. Vui lòng thử lại.')); });
      request.addEventListener('abort', function () { reject(new Error('Đã hủy tải tệp.')); });
      request.send(data);
    });
  }

  function mediaHtml(result, description) {
    var url = escapeAttribute(result.url || '');
    var text = escapeAttribute(description || '');
    if (result.type === 'video') {
      return '<figure><video src="' + url + '" controls playsinline preload="metadata" aria-label="' + (text || 'Video trong nội dung') + '"></video><figcaption>' + (text || 'Chú thích video') + '</figcaption></figure><p><br></p>';
    }
    return '<figure><img src="' + url + '" alt="' + text + '"><figcaption>' + (text || 'Chú thích ảnh') + '</figcaption></figure><p><br></p>';
  }

  document.querySelectorAll('[data-rich-editor]').forEach(function (root) {
    var surface = root.querySelector('.rich-editor__surface');
    var source = root.querySelector('.rich-editor__source');
    var status = root.querySelector('.rich-editor__status');
    var sourceMode = false;
    surface.innerHTML = cleanHtml(source.value);

    function sync() { source.value = sourceMode ? cleanHtml(source.value) : cleanHtml(surface.innerHTML); }
    root.closest('form').addEventListener('submit', sync);
    surface.addEventListener('input', sync);

    root.querySelectorAll('[data-command]').forEach(function (button) {
      button.addEventListener('click', function () { surface.focus(); document.execCommand(button.dataset.command, false, null); sync(); });
    });
    root.querySelector('[data-block-format]').addEventListener('change', function () {
      surface.focus(); document.execCommand('formatBlock', false, this.value); sync();
    });
    root.querySelector('[data-action="link"]').addEventListener('click', function () {
      var url = window.prompt('Nhập đường dẫn liên kết (https://...):');
      if (url && cleanUrl(url, false)) { surface.focus(); document.execCommand('createLink', false, url); sync(); }
    });
    root.querySelector('[data-action="table"]').addEventListener('click', function () {
      var rows = Math.min(30, Math.max(2, parseInt(window.prompt('Số hàng (gồm hàng tiêu đề):', '3'), 10) || 3));
      var columns = Math.min(12, Math.max(1, parseInt(window.prompt('Số cột:', '3'), 10) || 3));
      surface.focus(); insertHtml(tableHtml(rows, columns)); sync();
    });
    root.querySelector('[data-action="source"]').addEventListener('click', function () {
      if (sourceMode) { surface.innerHTML = cleanHtml(source.value); source.hidden = true; surface.hidden = false; }
      else { sync(); surface.hidden = true; source.hidden = false; }
      sourceMode = !sourceMode;
      this.classList.toggle('is-active', sourceMode);
    });

    var mediaInput = root.querySelector('[data-media-input]');
    mediaInput.addEventListener('change', async function () {
      try {
        var file = this.files[0];
        if (!file) return;
        var result = await uploadMedia(file, status);
        var promptText = result.type === 'video'
          ? 'Nhập mô tả ngắn cho video (hỗ trợ SEO và khả năng tiếp cận):'
          : 'Mô tả ngắn nội dung ảnh (hỗ trợ SEO và người dùng trình đọc màn hình):';
        var description = window.prompt(promptText, '') || '';
        surface.focus(); insertHtml(mediaHtml(result, description)); sync();
      }
      catch (error) { status.textContent = error.message; }
      this.value = '';
    });

    surface.addEventListener('paste', async function (event) {
      var items = Array.from(event.clipboardData && event.clipboardData.items || []);
      var mediaItems = items.filter(function (item) { return item.kind === 'file' && /^(?:image|video)\//.test(item.type); });
      var rich = event.clipboardData && event.clipboardData.getData('text/html');
      var plain = event.clipboardData && event.clipboardData.getData('text/plain');
      event.preventDefault();
      if (rich) insertHtml(cleanHtml(rich));
      else if (plain) insertHtml(cleanHtml(plain.split(/\n{2,}/).map(function (p) { return '<p>' + p.replace(/\n/g, '<br>') + '</p>'; }).join('')));
      for (var index = 0; index < mediaItems.length; index += 1) {
        try { var result = await uploadMedia(mediaItems[index].getAsFile(), status); if (result.url) insertHtml(mediaHtml(result, result.type === 'video' ? 'Video trong nội dung' : 'Ảnh trong nội dung')); }
        catch (error) { status.textContent = error.message; }
      }
      sync();
    });

    surface.addEventListener('drop', async function (event) {
      var file = event.dataTransfer && Array.from(event.dataTransfer.files).find(isSupportedMedia);
      if (!file) return;
      event.preventDefault();
      try { var result = await uploadMedia(file, status); surface.focus(); insertHtml(mediaHtml(result, result.type === 'video' ? 'Video trong nội dung' : 'Ảnh trong nội dung')); sync(); }
      catch (error) { status.textContent = error.message; }
    });
  });
})();
