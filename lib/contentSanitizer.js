'use strict';

// Sanitizer dành cho nội dung do quản trị viên dán từ Word/Google Docs/web.
// Giữ cấu trúc trình bày hữu ích nhưng loại script, event handler và URL nguy hiểm.
const ALLOWED_TAGS = new Set([
  'p', 'div', 'span', 'br', 'hr',
  'h2', 'h3', 'h4', 'h5', 'h6',
  'strong', 'b', 'em', 'i', 'u', 's', 'sub', 'sup', 'mark',
  'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
  'table', 'caption', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
  'a', 'img', 'video', 'source', 'figure', 'figcaption'
]);

const VOID_TAGS = new Set(['br', 'hr', 'img', 'source']);
const DROP_WITH_CONTENT = /<(script|style|iframe|object|embed|form|input|button|textarea|select|option|meta|link|base|svg|math)\b[^>]*>[\s\S]*?<\/\1\s*>/gi;
const DROP_SINGLE = /<\/?(?:script|style|iframe|object|embed|form|input|button|textarea|select|option|meta|link|base|svg|math)\b[^>]*>/gi;
const SAFE_STYLE_PROPERTIES = new Set([
  'text-align', 'vertical-align', 'font-weight', 'font-style', 'text-decoration',
  'color', 'background-color', 'width', 'height', 'min-width', 'max-width',
  'font-size', 'font-family', 'line-height', 'letter-spacing', 'white-space',
  'text-indent', 'list-style-type',
  'border', 'border-top', 'border-right', 'border-bottom', 'border-left',
  'border-collapse', 'padding', 'padding-top', 'padding-right', 'padding-bottom',
  'padding-left', 'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left'
]);

function escapeAttribute(value) {
  return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function safeUrl(value, image = false) {
  const url = String(value || '').trim();
  if (!url) return '';
  if (/^(?:javascript|vbscript|file|data):/i.test(url)) return '';
  if (image && !/^(?:https?:\/\/|\/uploads\/)/i.test(url)) return '';
  if (!image && !/^(?:https?:\/\/|mailto:|tel:|\/|#)/i.test(url)) return '';
  return url;
}

function cleanStyle(value) {
  return String(value || '').split(';').map((rule) => {
    const separator = rule.indexOf(':');
    if (separator < 1) return '';
    const property = rule.slice(0, separator).trim().toLowerCase();
    const val = rule.slice(separator + 1).trim();
    if (!SAFE_STYLE_PROPERTIES.has(property) || !val) return '';
    if (/expression|url\s*\(|javascript|behavior\s*:/i.test(val)) return '';
    return `${property}: ${val}`;
  }).filter(Boolean).join('; ');
}

function sanitizeAttributes(tag, source) {
  const attributes = [];
  const attrPattern = /([:\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match;
  while ((match = attrPattern.exec(source))) {
    const name = match[1].toLowerCase();
    const value = match[2] ?? match[3] ?? match[4] ?? '';
    if (name.startsWith('on') || name === 'id' || name === 'class') continue;
    // Mã truy vết khối nguồn không hiển thị với độc giả nhưng cho phép hệ
    // thống kiểm toán rằng bản biên tập đã bao phủ toàn bộ dữ liệu đã phân loại.
    if (['div', 'p', 'table', 'ul', 'ol'].includes(tag) && name === 'data-source-blocks' && /^(?:SRC-\d{4})(?:\s*,\s*SRC-\d{4})*$/i.test(value)) {
      attributes.push(`data-source-blocks="${escapeAttribute(value.toUpperCase().replace(/\s+/g, ''))}"`);
      continue;
    }
    if (name === 'style') {
      const style = cleanStyle(value);
      if (style) attributes.push(`style="${escapeAttribute(style)}"`);
      continue;
    }
    if (tag === 'a' && name === 'href') {
      const href = safeUrl(value);
      if (href) attributes.push(`href="${escapeAttribute(href)}"`);
      continue;
    }
    if (tag === 'a' && name === 'title') attributes.push(`title="${escapeAttribute(value)}"`);
    if (tag === 'img' && name === 'src') {
      const src = safeUrl(value, true);
      if (src) attributes.push(`src="${escapeAttribute(src)}"`);
      continue;
    }
    if (tag === 'img' && ['alt', 'title', 'width', 'height'].includes(name)) attributes.push(`${name}="${escapeAttribute(value)}"`);
    if (tag === 'video' && name === 'src') {
      const src = safeUrl(value, true);
      if (src) attributes.push(`src="${escapeAttribute(src)}"`);
      continue;
    }
    if (tag === 'video' && name === 'poster') {
      const poster = safeUrl(value, true);
      if (poster) attributes.push(`poster="${escapeAttribute(poster)}"`);
      continue;
    }
    if (tag === 'video' && ['controls', 'playsinline'].includes(name)) {
      attributes.push(name);
      continue;
    }
    if (tag === 'video' && name === 'preload' && ['none', 'metadata'].includes(value.toLowerCase())) {
      attributes.push(`preload="${value.toLowerCase()}"`);
      continue;
    }
    if (tag === 'video' && ['width', 'height'].includes(name) && /^\d{1,4}$/.test(value)) {
      attributes.push(`${name}="${value}"`);
      continue;
    }
    if (tag === 'source' && name === 'src') {
      const src = safeUrl(value, true);
      if (src) attributes.push(`src="${escapeAttribute(src)}"`);
      continue;
    }
    if (tag === 'source' && name === 'type' && /^video\/(?:mp4|webm|quicktime|x-m4v)$/i.test(value)) {
      attributes.push(`type="${escapeAttribute(value.toLowerCase())}"`);
      continue;
    }
    if (['td', 'th'].includes(tag) && ['colspan', 'rowspan'].includes(name) && /^\d{1,2}$/.test(value)) attributes.push(`${name}="${value}"`);
    if (['ol', 'li'].includes(tag) && ['start', 'value'].includes(name) && /^-?\d+$/.test(value)) attributes.push(`${name}="${value}"`);
  }
  if (tag === 'a' && attributes.some((item) => item.startsWith('href="http'))) attributes.push('target="_blank"', 'rel="noopener noreferrer"');
  if (tag === 'img') attributes.push('loading="lazy"', 'decoding="async"');
  if (tag === 'video') attributes.push('controls', 'playsinline', 'preload="metadata"');
  return attributes.length ? ` ${[...new Set(attributes)].join(' ')}` : '';
}

function sanitizeRichHtml(input) {
  let html = String(input || '').replace(/\0/g, '').replace(DROP_WITH_CONTENT, '').replace(DROP_SINGLE, '');
  html = html.replace(/<!--([\s\S]*?)-->/g, '');
  html = html.replace(/<\/?([a-zA-Z][\w:-]*)([^>]*)>/g, (whole, rawTag, rawAttributes) => {
    const tag = rawTag.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) return '';
    if (whole.startsWith('</')) return VOID_TAGS.has(tag) ? '' : `</${tag}>`;
    return `<${tag}${sanitizeAttributes(tag, rawAttributes)}>`;
  });
  return html.trim();
}

module.exports = { sanitizeRichHtml, cleanStyle, safeUrl };
