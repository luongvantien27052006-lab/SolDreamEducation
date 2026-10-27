'use strict';

// These predicates affect the public presentation only. Stored CMS values,
// amounts, policies and dates remain unchanged.
function text(value) {
  return value == null ? '' : String(value).replace(/\s+/g, ' ').trim();
}

function isMissingValue(value) {
  const valueText = text(value).replace(/[.!]+$/, '').trim();
  return !valueText || /^(?:chưa xác minh|chưa đủ dữ liệu(?: để)? xác minh|chưa đủ dữ liệu|chưa có dữ liệu xác minh|chưa có mức đầu vào xác minh|chưa có phân hạng visa xác minh|chưa có thông tin(?: chính thức)?|chưa công bố|đang cập nhật|chưa quy đổi|không tự quy đổi|cần xác nhận theo kỳ tuyển sinh|cần xác nhận theo trường và diện visa)$/iu.test(valueText);
}

function isMeaningfulText(value) {
  const valueText = text(value);
  if (isMissingValue(valueText)) return false;
  const labeled = valueText.match(/^[^:]{1,100}:\s*(.*)$/u);
  return !labeled || !isMissingValue(labeled[1]);
}

const GENERIC_DETAILS = new Set([
  'tùy loại phòng; kiểm tra phí ăn và phí quản lý',
  'không suy ra từ tiêu chí học bổng',
  'đánh giá theo hồ sơ và kỳ tuyển sinh',
  'hệ tiếng và từng kỳ có thể khác nhau',
  'phụ thuộc chuyên ngành',
  'cần nguồn chính thức còn hiệu lực',
]);

function meaningfulDetail(value) {
  return isMeaningfulText(value) && !GENERIC_DETAILS.has(text(value).toLocaleLowerCase('vi').replace(/[.!]+$/, ''));
}

function containsPolicyOrAmount(value) {
  return /\b(?:KRW|USD|VND|WON)\b|[₩$₫%]|miễn (?:phí|học phí)|(?:đã|chưa|không) (?:bao )?gồm|hoàn (?:phí|tiền)|đặt cọc|không (?:yêu cầu|bắt buộc)|tối (?:thiểu|đa)/iu.test(text(value));
}

function displayValue(value) {
  return isMissingValue(value) ? '' : value;
}

function getUniversityPresentation(university, parseContent) {
  let omitted = false;
  const sections = (university.sections || []).map(section => {
    const originalBlocks = Array.isArray(section.blocks) ? section.blocks : parseContent(section.content);
    const blocks = originalBlocks.map(block => {
      if (block.type === 'list') {
        const items = (block.items || []).filter(isMeaningfulText);
        if (items.length !== (block.items || []).length) omitted = true;
        return items.length ? { ...block, items } : null;
      }
      if (block.type === 'table') {
        const rows = (block.rows || []).filter(row => {
          const details = row.length > 1 ? row.slice(1) : row;
          const keep = details.some(meaningfulDetail) || containsPolicyOrAmount(row[0]);
          if (!keep) omitted = true;
          return keep;
        }).map(row => row.map(cell => {
          if (isMissingValue(cell) && text(cell)) omitted = true;
          return displayValue(cell);
        }));
        return rows.length ? { ...block, rows } : null;
      }
      if (block.type === 'heading') return block;
      if (!isMeaningfulText(block.text)) { omitted = true; return null; }
      return block;
    }).filter(Boolean);
    const visibleBlocks = blocks.filter((block, index) => {
      if (block.type !== 'heading') return true;
      for (let next = index + 1; next < blocks.length && blocks[next].type !== 'heading'; next += 1) {
        if (blocks[next].type !== 'heading') return true;
      }
      omitted = true;
      return false;
    });
    const lead = isMeaningfulText(section.lead) ? section.lead : '';
    if (!visibleBlocks.length && !containsPolicyOrAmount(lead)) { omitted = true; return null; }
    return { ...section, lead, blocks: visibleBlocks };
  }).filter(Boolean);

  const originalCostRows = university.costComparison || [];
  const knownCostRows = originalCostRows.filter(row => {
    const keep = !isMissingValue(row.foreignAmount) || !isMissingValue(row.vndAmount);
    if (!keep) omitted = true;
    return keep;
  });
  const costRows = knownCostRows.map(row => ({ ...row, foreignAmount: displayValue(row.foreignAmount), vndAmount: displayValue(row.vndAmount), note: displayValue(row.note) }));
  // Keep substantive custom fee/policy notes even if their amount is absent.
  // Generic generated fallback instructions are covered by the single note.
  const costNotes = originalCostRows.filter(row => !knownCostRows.includes(row))
    .map(row => row.note).filter(meaningfulDetail);
  const admissionRows = (university.admissionRows || []).filter(row => {
    const keep = !isMissingValue(row.value) || (meaningfulDetail(row.note) && containsPolicyOrAmount(row.note));
    if (!keep) omitted = true;
    return keep;
  }).map(row => ({ ...row, value: displayValue(row.value), note: displayValue(row.note) }));

  const core = university.coreFacts || {};
  const deposit = university.financials?.kStudyDeposit?.amountUsd;
  const facts = [
    { labelKey: 'view.university-detail.008', value: core.firstYearTotal },
    { labelKey: 'view.university-detail.009', value: core.visa },
    { labelKey: 'view.university-detail.010', value: deposit != null && deposit !== '' && Number.isFinite(Number(deposit)) ? `${Number(deposit).toLocaleString('en-US')} USD` : '' },
    { labelKey: 'view.university-detail.011', value: core.gpa },
  ].filter(fact => {
    const keep = !isMissingValue(fact.value);
    if (!keep) omitted = true;
    return keep;
  });

  return {
    facts, costRows, admissionRows, sections,
    costNotes: [...new Set(costNotes)],
    showForeignAmounts: costRows.some(row => !isMissingValue(row.foreignAmount)),
    showVndAmounts: costRows.some(row => !isMissingValue(row.vndAmount)),
    hasMissingData: omitted,
  };
}

module.exports = { getUniversityPresentation };
