'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { universityDraftCoverage, universityDraftCoverageReport, parseOpenAiWebSearchResponse, officialSearchItemsFromJson, searchProviderError, isUsefulExternalResearchUrl, extractGeminiGroundingUrls, sourceFidelityReport, sourceBlockCoverageReport, meaningfulSourceText, usableDraftContent, fallbackDraft } = require('../lib/editorialAi');

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

test('strict generated university profiles require at least 1,800 words and every mandatory group', () => {
  const report = universityDraftCoverageReport(comprehensiveDraft(), { minimumWords: 1800, minimumHeadings: 11, minimumGroups: 11 });
  assert.equal(report.complete, false);
  assert.ok(report.wordCount >= 900);
  assert.ok(report.missingGroups.includes('chương trình tiếng Hàn'));
});

test('universityDraftCoverage rejects untranslated Hangul', () => {
  const draft = comprehensiveDraft();
  draft.content += '<p>대학 입학 안내</p>';
  assert.equal(universityDraftCoverage(draft), false);
});

test('partial official information creates a draft without missing-data boilerplate', () => {
  const sourceText = `[MÃ SRC-0001 | NHÓM GENERAL | THỨ TỰ 1]\nThông báo tuyển sinh dành cho sinh viên quốc tế được nhận hồ sơ từ ngày 01/10/2026 đến ngày 30/10/2026.\n\n[MÃ SRC-0002 | NHÓM FEES | THỨ TỰ 2]\nLệ phí xét hồ sơ là 100.000 won và nộp trực tuyến cùng đơn đăng ký.`;
  const draft = fallbackDraft({ title: 'Thông báo tuyển sinh quốc tế', sourceText, section: 'Cẩm nang & Thông tin' });
  assert.equal(draft.hasSourceContent, true);
  assert.match(draft.content, /01\/10\/2026/);
  assert.match(draft.content, /100\.000 won/);
  assert.doesNotMatch(draft.content, /chưa xác minh|nguồn chính thức không công bố|thông tin cần kiểm tra/i);
});

test('missing-data notices are removed while real crawled facts remain usable', () => {
  const source = meaningfulSourceText('Dữ liệu được đối chiếu qua chỉ mục tìm kiếm; bắt buộc duyệt thủ công.\nNguồn chính thức không công bố học phí.\nThời gian nhận hồ sơ từ 01/10/2026 đến 30/10/2026 dành cho sinh viên quốc tế.');
  assert.doesNotMatch(source, /bắt buộc duyệt thủ công|không công bố/i);
  assert.match(source, /01\/10\/2026/);
  const content = usableDraftContent('<p>Nguồn chính thức không công bố mức phí.</p><h2>Lịch nhận hồ sơ</h2><p>Thời gian nhận hồ sơ từ 01/10/2026 đến 30/10/2026 dành cho sinh viên quốc tế và được nộp trực tuyến theo hướng dẫn của trường.</p>');
  assert.equal(content.usable, true);
  assert.doesNotMatch(content.cleaned, /không công bố/i);
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

test('external research keeps grounded public sources and rejects social/search-result URLs', () => {
  const response = {
    text: 'Dữ kiện từ https://www.studyinkorea.go.kr/ko/plan/scholarship.do và https://www.google.com/search?q=hoc+bong',
    candidates: [{ groundingMetadata: { groundingChunks: [
      { web: { uri: 'https://www.hannam.ac.kr/kor/guide/notice.html' } },
      { web: { uri: 'https://facebook.com/unverified-post' } },
    ] } }],
  };
  assert.deepEqual(extractGeminiGroundingUrls(response), [
    'https://www.studyinkorea.go.kr/ko/plan/scholarship.do',
    'https://www.hannam.ac.kr/kor/guide/notice.html',
  ]);
  assert.equal(isUsefulExternalResearchUrl('https://overseas.mofa.go.kr/vn-vi/index.do'), true);
  assert.equal(isUsefulExternalResearchUrl('https://www.youtube.com/watch?v=1'), false);
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

