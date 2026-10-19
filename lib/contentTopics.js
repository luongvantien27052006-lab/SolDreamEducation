'use strict';

const TOPICS = Object.freeze([
  { id: 'thong-tin-han-quoc', label: 'Thông tin Hàn Quốc', description: 'Thông tin về học tiếng, trường, chương trình và chuẩn bị du học Hàn Quốc.' },
  { id: 'cam-nang-sinh-hoat', label: 'Cẩm nang sinh hoạt', description: 'Kinh nghiệm chuẩn bị chỗ ở, chi tiêu và thích nghi với đời sống tại Hàn Quốc.' },
  { id: 'hoat-dong-soldream', label: 'Hoạt động SolDream', description: 'Hành trình, đội ngũ, lớp học và các hoạt động được SOL DREAM EDUCATION công bố.' },
]);

const TOPIC_IDS = new Set(TOPICS.map((topic) => topic.id));

function normalizeTopic(value) {
  return TOPIC_IDS.has(String(value || '').trim()) ? String(value).trim() : '';
}

function topicLabel(value) {
  return TOPICS.find((topic) => topic.id === value)?.label || TOPICS[0].label;
}

function inferTopic(item = {}) {
  const category = String(item.category || item.suggested_section || '').toLocaleLowerCase('vi');
  const title = String(item.title || '').toLocaleLowerCase('vi');
  const rawExcerpt = String(item.excerpt || '').toLocaleLowerCase('vi');
  const excerpt = /^bot phát hiện nội dung này/.test(rawExcerpt) ? '' : rawExcerpt;
  const subject = `${title} ${excerpt}`;
  if (/hoạt động soldream|hoạt động sol dream|hoat dong soldream|tuyển dụng/.test(category)
    || /(?:sol\s*dream|soldream|sde).{0,80}(?:hoạt động|cuộc thi|giao lưu|tuyển dụng|khai giảng|đội ngũ|hành trình|văn phòng|trung tâm|giá trị)/i.test(subject)
    || /(?:tuyển dụng|cuộc thi).{0,80}(?:sol\s*dream|soldream|sde|giáo viên)/i.test(subject)) {
    return 'hoat-dong-soldream';
  }
  if (/^(?:thông tin trường|trường đại học|chương trình du học|du học hàn quốc)$/.test(category)) return 'thong-tin-han-quoc';
  if (/cẩm nang sinh hoạt|sinh hoạt tại hàn quốc|đời sống|cuộc sống/.test(category)
    || /(?:sinh hoạt|đời sống|cuộc sống|ký túc xá|thuê nhà|nhà ở|bảo hiểm y tế|giao thông|đi lại|ẩm thực|văn hóa|làm thêm|ngân hàng|living|housing|dormitory|생활|기숙사)/i.test(subject)) {
    return 'cam-nang-sinh-hoat';
  }
  return 'thong-tin-han-quoc';
}

module.exports = { TOPICS, normalizeTopic, topicLabel, inferTopic };
