'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { universityDraftCoverage, parseOpenAiWebSearchResponse, officialSearchItemsFromJson, searchProviderError, sourceFidelityReport, sourceBlockCoverageReport } = require('../lib/editorialAi');

function comprehensiveDraft() {
  const headings = [
    'Tổng quan và điểm nổi bật', 'Địa chỉ và thông tin liên hệ', 'Hệ thống khoa và ngành học',
    'Chương trình dành cho sinh viên quốc tế', 'Điều kiện và hồ sơ tuyển sinh', 'Học phí và các khoản phí',
    'Học bổng', 'Ký túc xá và đời sống', 'Các thông báo mới nhất', 'Tài liệu và nguồn chính thức',
  ];
  const paragraph = 'Trường cung cấp thông tin chính thức cho sinh viên quốc tế và quản trị viên cần đối chiếu thời hạn áp dụng trước khi xuất bản. '.repeat(24);
  return { title: 'Đại học kiểm thử', excerpt: 'Thông tin trường dành cho sinh viên quốc tế tại Hàn Quốc.', content: headings.map((heading) => `<h2>${heading}</h2><p>${paragraph}</p>`).join('') };
}

test('universityDraftCoverage accepts a comprehensive Vietnamese university profile', () => {
  assert.equal(universityDraftCoverage(comprehensiveDraft()), true);
});

test('universityDraftCoverage rejects sparse placeholder content', () => {
  assert.equal(universityDraftCoverage({ title: 'Trường', content: '<h2>Thông tin cần kiểm tra</h2><p>Đang chờ biên tập.</p>' }), false);
});

test('universityDraftCoverage rejects untranslated Hangul', () => {
  const draft = comprehensiveDraft();
  draft.content += '<p>대학 입학 안내</p>';
  assert.equal(universityDraftCoverage(draft), false);
});

test('parses OpenAI web-search text and official citations', () => {
  const parsed = parseOpenAiWebSearchResponse({
    output: [{ type: 'message', content: [{ type: 'output_text', text: '{"items":[]}', annotations: [
      { type: 'url_citation', url: 'https://overseas.mofa.go.kr/vn-vi/brd/m_2164/list.do' },
    ] }] }],
  });
  assert.equal(parsed.text, '{"items":[]}');
  assert.deepEqual(parsed.citations, ['https://overseas.mofa.go.kr/vn-vi/brd/m_2164/list.do']);
});

test('keeps only search results from the configured official hostname', () => {
  const items = officialSearchItemsFromJson({ items: [
    { title: 'Thông báo visa du học', url: 'https://www.visaforkorea-vt.com/customercenter/notice/view/960', excerpt: 'Thông tin chính thức dành cho người nộp hồ sơ.', publishedAt: '2026-02-09' },
    { title: 'Bản sao', url: 'https://example.com/copied', excerpt: 'Không được sử dụng.' },
  ] }, 'https://www.visaforkorea-vt.com/customercenter/notice/list', 'openai-web-search');
  assert.equal(items.length, 1);
  assert.equal(items[0].discoveryProvider, 'openai-web-search');
  assert.equal(items[0].discoveryMode, 'official-search-index');
});

test('turns provider billing errors into useful admin diagnostics', () => {
  assert.equal(searchProviderError('Gemini', { status: 402, message: 'prepayment credits are depleted' }), 'Gemini đã hết credit (HTTP 402)');
  assert.equal(searchProviderError('OpenAI', new Error('You have no credits remaining.')), 'OpenAI đã hết credit (HTTP 402)');
});

test('detects when a generated notice omits dates, fees, contacts or visa codes', () => {
  const source = 'Áp dụng từ 21/09/2026. Lệ phí 1.200.000 won. Visa D-4. Liên hệ visa@example.kr hoặc +84 24 7100 1212.';
  const complete = sourceFidelityReport(source, '<p>Áp dụng ngày 21/09/2026, lệ phí 1.200.000 won, diện D-4. Email visa@example.kr, điện thoại +84 24 7100 1212.</p>');
  assert.equal(complete.complete, true);
  const incomplete = sourceFidelityReport(source, '<p>Thông báo mới dành cho người xin visa.</p>');
  assert.equal(incomplete.complete, false);
  assert.ok(incomplete.missing.length >= 4);
});

test('requires every classified source block in both coverage map and article HTML', () => {
  const input = { sourceClassification: { blocks: [
    { id: 'SRC-0001', order: 1 },
    { id: 'SRC-0002', order: 2 },
  ] } };
  const complete = sourceBlockCoverageReport(input, {
    sourceCoverage: [{ id: 'SRC-0001' }, { id: 'SRC-0002' }],
    content: '<div data-source-blocks="SRC-0001"><p>Thông tin chung</p></div><table data-source-blocks="SRC-0002"><tr><td>Lệ phí</td></tr></table>',
  });
  assert.equal(complete.complete, true);
  const incomplete = sourceBlockCoverageReport(input, {
    sourceCoverage: [{ id: 'SRC-0001' }, { id: 'SRC-0002' }],
    content: '<div data-source-blocks="SRC-0001"><p>Chỉ có khối đầu tiên</p></div>',
  });
  assert.equal(incomplete.complete, false);
  assert.deepEqual(incomplete.missing, ['SRC-0002']);
});

