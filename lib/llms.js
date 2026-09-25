'use strict';

const { SITE_URL } = require('./seo');
const { getCourses } = require('./courseKnowledge');
const { getAllUniversities } = require('./universityPages');
const { stripHtml, programPublicPath } = require('./util');

function oneLine(value, max = 240) {
  const text = stripHtml(value).replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max).replace(/\s+\S*$/, '')}…` : text;
}

function generateLlmsTxt({ posts = [], programs = [] } = {}) {
  const lines = [
    '# SOL DREAM EDUCATION',
    '',
    '> Trung tâm đào tạo tiếng Hàn và tư vấn du học Hàn Quốc tại Tân Phú, TP.HCM. Nội dung hỗ trợ chọn trường, chương trình, chi phí, học bổng, hồ sơ và visa; thông tin thay đổi theo kỳ cần được xác nhận trước khi đăng ký.',
    '',
    `- Website: ${SITE_URL}/`,
    `- Giới thiệu và liên hệ: ${SITE_URL}/gioi-thieu`,
    `- Câu hỏi thường gặp: ${SITE_URL}/cau-hoi-thuong-gap`,
    `- Sinh hoạt tại Hàn Quốc: ${SITE_URL}/cuoc-song-han-quoc`,
    `- Trợ lý tra cứu du học: ${SITE_URL}/tro-ly-du-hoc`,
    `- Sitemap: ${SITE_URL}/sitemap.xml`,
    `- RSS: ${SITE_URL}/feed.xml`,
    '',
    '## Khóa học',
    ...getCourses().map((course) => `- [${course.name}](${SITE_URL}${course.url}): ${oneLine(course.blufSummary || course.description)}`),
    '',
    '## Hồ sơ trường đại học',
    ...getAllUniversities().map((university) => `- [${university.name}](${SITE_URL}${university.url}): ${oneLine(university.description)}`),
    '',
    '## Chương trình du học và trường đang xuất bản',
    ...programs.map((item) => `- [${item.title}](${SITE_URL}${programPublicPath(item)}): ${oneLine(item.excerpt)}`),
    '',
    '## Cẩm nang và tin tức',
    ...posts.map((item) => `- [${item.title}](${SITE_URL}/tin-tuc/${item.slug}): ${oneLine(item.excerpt)}`),
    '',
    '## Nguyên tắc sử dụng dữ liệu',
    '- Ưu tiên trang có ngày cập nhật mới nhất và các nguồn chính thức được dẫn trong bài.',
    '- Không xem học phí, visa, học bổng, việc làm hoặc thời gian xét duyệt là cam kết kết quả.',
    '- Hotline/Zalo xác nhận hồ sơ: 0364 648 282; email: soldream.edu@gmail.com.',
  ];
  return `${lines.join('\n')}\n`;
}

module.exports = { generateLlmsTxt };
