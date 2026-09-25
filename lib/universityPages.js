'use strict';

const knowledge = require('../data/universities.json');
const { toVietnameseVisibleText } = require('./visibleVietnamese');
const { makeBluf } = require('./util');

function stripBullet(value) {
  return String(value || '').replace(/^-\s*/, '').trim();
}

function stripLabel(value) {
  return stripBullet(value).replace(/^[^:]{2,40}:\s*/, '').trim();
}

function findLine(section, pattern) {
  return String(section?.content || '').split('\n').find((line) => pattern.test(line)) || '';
}

function formatNumber(value) {
  return Number.isFinite(Number(value)) ? new Intl.NumberFormat('vi-VN').format(Number(value)) : 'Chưa xác minh';
}

function formatKrwRange(range) {
  if (!range || range.minKrw == null) return 'Chưa xác minh';
  if (range.minKrw === range.maxKrw) return `${formatNumber(range.minKrw)} KRW`;
  return `${formatNumber(range.minKrw)}–${formatNumber(range.maxKrw)} KRW`;
}

function parseTableRow(line) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim());
}

function parseContent(content) {
  const lines = String(content || '').split('\n').map((line) => line.trim()).filter(Boolean);
  const blocks = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (line.startsWith('#### ')) {
      blocks.push({ type: 'heading', text: line.slice(5).trim() });
      index += 1;
      continue;
    }

    if (line.startsWith('- ')) {
      const items = [];
      while (index < lines.length && lines[index].startsWith('- ')) {
        items.push(stripBullet(lines[index]));
        index += 1;
      }
      blocks.push({ type: 'list', items });
      continue;
    }

    if (line.startsWith('|') && index + 1 < lines.length && /^\|[\s:|-]+\|$/.test(lines[index + 1])) {
      const headers = parseTableRow(line);
      const rows = [];
      index += 2;
      while (index < lines.length && lines[index].startsWith('|')) {
        rows.push(parseTableRow(lines[index]));
        index += 1;
      }
      blocks.push({ type: 'table', headers, rows });
      continue;
    }

    blocks.push({ type: 'paragraph', text: line });
    index += 1;
  }

  return blocks;
}

function blockText(block) {
  if (block.type === 'paragraph') return block.text;
  if (block.type === 'list') return block.items.join('. ');
  if (block.type === 'table') {
    return [block.headers.join(': '), ...block.rows.slice(0, 3).map((row) => row.join(': '))].join('. ');
  }
  return '';
}

function addSectionLeads(universityName, section) {
  const blocks = parseContent(section.content);
  const sectionText = blocks.filter((block) => block.type !== 'heading').map(blockText).join(' ');
  const withLeads = blocks.map((block, index) => {
    if (block.type !== 'heading') return block;
    const following = [];
    for (let cursor = index + 1; cursor < blocks.length && blocks[cursor].type !== 'heading'; cursor += 1) {
      following.push(blockText(blocks[cursor]));
    }
    return { ...block, lead: makeBluf(`${universityName} – ${block.text}`, following.join(' ')) };
  });
  return {
    ...section,
    lead: makeBluf(`${universityName} – ${section.title}`, sectionText),
    blocks: withLeads,
  };
}

function decorateUniversity(university) {
  const sections = (university.sections || []).map((section) => addSectionLeads(university.name, section));
  const overview = sections.find((section) => section.id === 'overview');
  const tuition = sections.find((section) => section.id === 'tuition');
  const highlight = stripLabel(
    findLine(overview, /^- Thế mạnh đào tạo:/i)
      || findLine(overview, /^- Đặc điểm:/i)
      || findLine(overview, /^- Vị trí/i)
  );
  const location = stripLabel(
    findLine(overview, /^- Địa chỉ/i)
      || findLine(overview, /^- Vị trí:/i)
      || university.location_terms.join(', ')
  );
  const tuitionSummary = stripLabel(findLine(tuition, /^- (Mức học phí|Seoul Campus):/i));
  const websiteLine = findLine(overview, /^- Website:/i);
  const officialWebsite = websiteLine.match(/https?:\/\/[^\s]+/)?.[0] || '';
  const rawAddress = stripLabel(findLine(overview, /^- Địa chỉ (cơ sở|các cơ sở):/i))
    || stripLabel(findLine(overview, /^- .+ Campus:/i));
  const description = university.blufSummary || `${university.name}: ${highlight || 'thông tin chương trình, học phí, học bổng và ký túc xá'} — hồ sơ do SOL DREAM EDUCATION tổng hợp.`;
  const financials = {
    ...university.financials,
    tuitionKrwYear: university.financials?.tuitionD4KrwYear ?? university.financials?.tuitionKrwYear,
    tuitionVndYear: university.financials?.tuitionVndEstimate ?? university.financials?.tuitionVndYear,
    dormitoryHalfYear: university.financials?.dormitoryHalfYear || (university.financials?.dormitoryHalfYearKrw != null
      ? { minKrw: university.financials.dormitoryHalfYearKrw, maxKrw: university.financials.dormitoryHalfYearKrw } : null),
    kStudyDeposit: university.financials?.kStudyDeposit || {
      amountUsd: university.financials?.kStudyDepositUsd ?? null,
      status: university.financials?.kStudyDepositUsd ? 'Theo dữ liệu đã nhập' : 'Chưa có dữ liệu xác minh',
    },
  };
  const requirements = university.admissionCriteria || university.requirements || {};
  const rate = financials.conversion?.rateVndPerKrw;
  const dorm = financials.dormitoryHalfYear;
  const dormVnd = dorm?.minKrw != null && rate ? {
    min: Math.round(dorm.minKrw * rate / 100000) * 100000,
    max: Math.round(dorm.maxKrw * rate / 100000) * 100000,
  } : null;
  const scholarshipMatch = String(sections.find((section) => section.id === 'scholarships')?.content || '')
    .match(/\d+%\s*(?:-|–)\s*\d+%|100%/u)?.[0];
  const costComparison = [
    {
      item: 'Học phí hệ tiếng / năm',
      foreignAmount: financials.tuitionKrwYear ? `${formatNumber(financials.tuitionKrwYear)} KRW` : 'Chưa xác minh',
      vndAmount: financials.tuitionVndYear ? `≈ ${formatNumber(financials.tuitionVndYear)} VND` : 'Chưa quy đổi',
      note: financials.tuitionBasis || 'Cần xác nhận theo kỳ tuyển sinh',
    },
    {
      item: 'Ký túc xá / 6 tháng',
      foreignAmount: formatKrwRange(dorm),
      vndAmount: dormVnd ? `≈ ${formatNumber(dormVnd.min)}–${formatNumber(dormVnd.max)} VND` : 'Chưa quy đổi',
      note: 'Tùy loại phòng; kiểm tra phí ăn và phí quản lý',
    },
    {
      item: 'Sổ đóng băng K-study',
      foreignAmount: financials.kStudyDeposit?.amountUsd
        ? `${formatNumber(financials.kStudyDeposit.amountUsd)} USD`
        : 'Chưa xác minh',
      vndAmount: 'Không tự quy đổi',
      note: financials.kStudyDeposit?.status || 'Cần xác nhận theo trường và diện visa',
    },
  ];
  const admissionRows = [
    { criterion: 'GPA tối thiểu', value: requirements.minGpa != null ? String(requirements.minGpa) : 'Chưa xác minh', note: 'Không suy ra từ tiêu chí học bổng' },
    { criterion: 'Số năm trống tối đa', value: requirements.maxGapYears != null ? `${requirements.maxGapYears} năm` : 'Chưa xác minh', note: 'Đánh giá theo hồ sơ và kỳ tuyển sinh' },
    { criterion: 'TOPIK hệ D4', value: requirements.topikRequirementD4 || requirements.topikRequired || 'Chưa xác minh', note: 'Hệ tiếng và từng kỳ có thể khác nhau' },
    { criterion: 'TOPIK hệ D2', value: requirements.topikRequirementD2 || 'Chưa xác minh', note: 'Phụ thuộc chuyên ngành' },
    { criterion: 'Nhóm trường / visa', value: university.topCategory || 'Chưa xác minh', note: 'Cần nguồn chính thức còn hiệu lực' },
  ];
  const caseStudies = (university.caseStudies || []).map((item) => ({
    ...item,
    studentInitials: item.studentInitials || item.student || item.hocVien,
    visaProcessingTime: item.visaProcessingTime || item.visaProcessingDays || item.thoiGianRaVisa,
    intake: item.intake || item.kyNhapHoc,
    graduationYear: item.graduationYear || item.namTotNghiep,
    summary: item.summary || `Hồ sơ ${item.studentInitials || item.student || 'học viên'} có GPA ${item.gpa ?? 'chưa công bố'}, tốt nghiệp năm ${item.graduationYear || item.namTotNghiep || 'chưa công bố'}, nhận kết quả visa sau ${item.visaProcessingTime || item.visaProcessingDays || item.thoiGianRaVisa || 'thời gian chưa công bố'} cho kỳ ${item.intake || item.kyNhapHoc || 'chưa công bố'}.`,
  }));

  return {
    ...university,
    slug: university.slug || university.id,
    english_name: university.english_name || university.englishName || university.name,
    korean_name: university.korean_name || university.koreanName || '',
    location_terms: university.location_terms || [university.city].filter(Boolean),
    aliases: university.aliases || [university.name, university.koreanName].filter(Boolean),
    financials,
    requirements,
    caseStudies,
    sections,
    highlight,
    location,
    tuitionSummary,
    officialWebsite,
    description: description.slice(0, 320),
    address: { streetAddress: rawAddress, addressLocality: university.location_terms[0] },
    costComparison,
    admissionRows,
    freshnessLabel: `Cập nhật tuyển sinh ${String(university.lastUpdated || knowledge.source.imported_at).slice(0, 4)}`,
    coreFacts: {
      firstYearTotal: financials.firstYearTotalVnd ? `≈ ${formatNumber(financials.firstYearTotalVnd)} VND` : 'Chưa đủ dữ liệu xác minh',
      tuition: financials.tuitionKrwYear ? `${formatNumber(financials.tuitionKrwYear)} KRW/năm` : 'Chưa xác minh',
      gpa: requirements.minGpa != null ? `Từ ${requirements.minGpa}` : 'Chưa có mức đầu vào xác minh',
      visa: university.topCategory || 'Chưa có phân hạng visa xác minh',
      scholarship: scholarshipMatch ? `Có mức hỗ trợ đến ${scholarshipMatch.split(/\s*(?:-|–)\s*/u).pop()}` : 'Xem chính sách từng kỳ',
    },
    updatedDate: String(university.lastUpdated || knowledge.source.imported_at).length === 7 ? `${university.lastUpdated}-01` : (university.lastUpdated || knowledge.source.imported_at),
    updatedDateDisplay: '26/08/2026',
    sourceNotice: knowledge.source.notice,
    bluf: university.blufSummary || makeBluf(university.name, `${description} Trường tọa lạc tại ${location}. ${tuitionSummary ? `Học phí tiếng Hàn tham khảo: ${tuitionSummary}.` : ''}`),
    url: `/truong-dai-hoc/${university.id}`,
  };
}

function sanitizeVisibleValue(value) {
  if (typeof value === 'string') return toVietnameseVisibleText(value);
  if (Array.isArray(value)) return value.map(sanitizeVisibleValue).filter((item) => item !== '');
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sanitizeVisibleValue(item)]));
  }
  return value;
}

const universities = knowledge.universities.map(decorateUniversity).map(sanitizeVisibleValue);

function getAllUniversities() {
  return universities;
}

function getUniversityById(id) {
  return universities.find((university) => university.id === String(id || '').toLowerCase());
}

module.exports = { getAllUniversities, getUniversityById, parseContent };
