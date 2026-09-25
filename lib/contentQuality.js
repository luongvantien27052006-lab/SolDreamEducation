'use strict';

const { countWords, stripHtml, parseSourceUrls } = require('./util');

function includesKeyword(item, keyword) {
  if (!keyword) return true;
  const haystack = `${item.title || ''} ${item.excerpt || ''} ${stripHtml(item.content)}`.toLocaleLowerCase('vi');
  return haystack.includes(String(keyword).trim().toLocaleLowerCase('vi'));
}

function assessContent(item = {}) {
  const title = String(item.seo_title || item.title || '').trim();
  const description = String(item.meta_description || item.excerpt || '').trim();
  const excerptWords = countWords(item.excerpt);
  const words = countWords(`${item.excerpt || ''} ${item.content || ''}`);
  const html = String(item.content || '');
  const sources = parseSourceUrls(item.source_urls);
  const vagueVerificationCount = (stripHtml(html).match(/(?:cần|chưa) xác minh/gi) || []).length;
  const issues = [];
  let score = 0;

  if (title.length >= 35 && title.length <= 65) score += 12;
  else { score += title ? 6 : 0; issues.push(`Tiêu đề SEO nên dài 35–65 ký tự (hiện ${title.length}).`); }
  if (description.length >= 120 && description.length <= 165) score += 14;
  else { score += description ? 7 : 0; issues.push(`Mô tả SEO nên dài 120–165 ký tự (hiện ${description.length}).`); }
  if (excerptWords >= 30 && excerptWords <= 60) score += 10;
  else { score += excerptWords >= 15 ? 5 : 0; issues.push(`Tóm tắt BLUF nên khoảng 30–60 từ (hiện ${excerptWords}).`); }
  if (words >= 600) score += 16;
  else if (words >= 300) score += 11;
  else if (words >= 150) score += 6;
  else issues.push(`Nội dung còn ngắn (${words} từ); nên bổ sung dữ liệu, trải nghiệm và câu trả lời độc lập.`);
  if (/<h2\b/i.test(html)) score += 9; else issues.push('Nên có ít nhất một H2 dạng câu hỏi người dùng.');
  if (/<(?:table|ul|ol)\b/i.test(html)) score += 8; else issues.push('Nên có bảng hoặc danh sách để AI trích xuất dễ hơn.');
  if (sources.length) score += 13; else issues.push('Chưa có nguồn chính thức để đối chiếu.');
  if (item.author_name) score += 8; else issues.push('Chưa khai báo chuyên viên hoặc tác giả chịu trách nhiệm.');
  if (item.author_url) score += 3;
  if (item.cover_image) score += 4; else issues.push('Nên bổ sung ảnh bìa riêng, rõ nét.');
  if (item.focus_keyword && includesKeyword(item, item.focus_keyword)) score += 3;
  else if (item.focus_keyword) issues.push('Từ khóa trọng tâm chưa xuất hiện tự nhiên trong tiêu đề/tóm tắt/nội dung.');
  if (vagueVerificationCount) {
    score -= Math.min(20, vagueVerificationCount * 4);
    issues.push(`Còn ${vagueVerificationCount} chỗ ghi “cần xác minh”; hãy đối chiếu nguồn hoặc ghi rõ nguồn không công bố dữ kiện đó.`);
  }

  return { score: Math.max(0, Math.min(100, score)), issues, words, titleLength: title.length, descriptionLength: description.length, sourceCount: sources.length, vagueVerificationCount };
}

module.exports = { assessContent };
