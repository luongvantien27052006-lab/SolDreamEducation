'use strict';

function vietnamDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}

function articleDates(post) {
  // created_at is editable in this CMS and historically contains a synthetic
  // noon value. It is a display date, not proof of the first publication time.
  const displayTime = String(post.created_at || '').slice(0, 10);
  const publishedTime = post.first_published_at || '';
  const modifiedTime = post.content_modified_at || String(post.updated_at || post.created_at || '').slice(0, 10);
  return {
    publishedTime, modifiedTime, displayTime,
    modifiedDate: vietnamDate(modifiedTime),
  };
}

function coverMetadata(post) {
  const html = String(post.contentHtml || '');
  const decode = (value) => String(value || '').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  const attr = (tag, name) => decode(tag.match(new RegExp(`\\s${name}\\s*=\\s*(["'])(.*?)\\1`, 'i'))?.[2]);
  const tag = (html.match(/<img\b[^>]*>/gi) || []).find((img) => attr(img, 'src') === post.cover_image);
  const width = Number(attr(tag || '', 'width')), height = Number(attr(tag || '', 'height'));
  const figure = (html.match(/<figure\b[^>]*>[\s\S]*?<\/figure>/gi) || []).find((part) => tag && part.includes(tag));
  const caption = decode(figure?.match(/<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/i)?.[1]?.replace(/<[^>]*>/g, '').trim());
  return { alt: attr(tag || '', 'alt') || post.title, ...(caption ? { caption } : {}), ...(width > 0 && height > 0 ? { width, height } : {}) };
}

module.exports = { articleDates, coverMetadata, vietnamDate };
