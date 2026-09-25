'use strict';

const db = require('../db');

const FAQ_CATEGORIES = [
  'Du học',
  'Đào tạo tiếng',
  'Thông tin sinh hoạt tại Hàn Quốc',
  'Thông tin trường',
];

function getSiteFaqs(options = {}) {
  const publishedOnly = options.publishedOnly !== false;
  const rows = db.prepare(`SELECT * FROM faqs ${publishedOnly ? 'WHERE published = 1' : ''}
    ORDER BY CASE category
      WHEN 'Du học' THEN 1 WHEN 'Đào tạo tiếng' THEN 2
      WHEN 'Thông tin sinh hoạt tại Hàn Quốc' THEN 3 WHEN 'Thông tin trường' THEN 4 ELSE 9 END,
      sort_order ASC, id ASC`).all();
  return rows.map((row) => ({ ...row, generated: Boolean(row.generated), published: Boolean(row.published) }));
}

function groupFaqs(rows = getSiteFaqs()) {
  const groups = FAQ_CATEGORIES.map((category) => ({
    category,
    items: rows.filter((faq) => faq.category === category),
  })).filter((group) => group.items.length);
  const known = new Set(FAQ_CATEGORIES);
  const extra = [...new Set(rows.map((faq) => faq.category).filter((category) => !known.has(category)))];
  extra.forEach((category) => groups.push({ category, items: rows.filter((faq) => faq.category === category) }));
  return groups;
}

const faqs = getSiteFaqs();

function formatNumber(value) {
  return value == null ? 'chưa xác minh' : new Intl.NumberFormat('vi-VN').format(value);
}

function getUniversityFaqs(university) {
  const financials = university.financials || {};
  const requirements = university.admissionCriteria || university.requirements || {};
  const dorm = financials.dormitoryHalfYear || (financials.dormitoryHalfYearKrw != null
    ? { minKrw: financials.dormitoryHalfYearKrw, maxKrw: financials.dormitoryHalfYearKrw } : null);
  const dormText = dorm?.minKrw == null ? 'chưa xác minh' :
    `${formatNumber(dorm.minKrw)}${dorm.maxKrw !== dorm.minKrw ? `–${formatNumber(dorm.maxKrw)}` : ''} KRW mỗi 6 tháng`;
  return [
    {
      question: `Học phí một năm tại ${university.name} là bao nhiêu?`,
      answer: `Theo dữ liệu SOL DREAM EDUCATION cập nhật năm 2026, học phí chương trình tiếng Hàn là khoảng ${formatNumber(financials.tuitionD4KrwYear ?? financials.tuitionKrwYear)} KRW một năm, tương đương khoảng ${formatNumber(financials.tuitionVndEstimate ?? financials.tuitionVndYear)} VND theo tỷ giá tham khảo. Mức thực tế cần được trường xác nhận.`,
    },
    {
      question: `${university.name} yêu cầu GPA và TOPIK bao nhiêu?`,
      answer: `${requirements.status || 'Tài liệu nguồn chưa cung cấp điều kiện đầu vào đã xác minh.'} GPA tối thiểu, số năm trống tối đa và TOPIK có thể khác theo hệ tiếng, chuyên ngành hoặc học bổng; học viên cần đối chiếu thông báo tuyển sinh của trường cho kỳ dự kiến.`,
    },
    {
      question: `${university.name} thuộc nhóm visa nào và cần sổ đóng băng bao nhiêu?`,
      answer: `Tài liệu hiện có chưa xác minh phân hạng visa hoặc mức sổ đóng băng K-study của ${university.name}. Hai thông tin này có thể thay đổi theo thời điểm và diện hồ sơ, vì vậy SOL DREAM EDUCATION không gán Top 1%, Top 2, Top 3 hoặc số tiền khi chưa có nguồn chính thức.`,
    },
    {
      question: `Ký túc xá ${university.name} có chi phí bao nhiêu?`,
      answer: `Chi phí ký túc xá tham khảo của ${university.name} là ${dormText}. Khoản này có thể phụ thuộc loại phòng, cơ sở, tiền ăn và phí quản lý; người nộp hồ sơ nên kiểm tra thông báo mới nhất và tổng chi phí trước khi đăng ký chỗ ở.`,
    },
  ];
}

module.exports = { faqs, FAQ_CATEGORIES, getSiteFaqs, groupFaqs, getUniversityFaqs };
