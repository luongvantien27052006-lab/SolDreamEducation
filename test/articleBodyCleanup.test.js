'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { cleanExistingArticleContent } = require('../lib/articleBodyCleanup');

test('removes flattened article controls and scripts while preserving the article facts', () => {
  const dirty = `<h2>Thông báo lãnh sự</h2><p>Trang chủ &gt; Tin tức &gt; THÔNG BÁO Aa 396 | 23/09/2026 Thích 2368 Tăng cỡ chữ Cỡ chữ mặc định Giảm cỡ chữ - Việt Nam áp dụng chứng nhận Apostille từ ngày 11/09/2026.</p><p>Chứng nhận Apostille xác nhận chữ ký và con dấu trên giấy tờ công.</p><p>Thích 6 Chia sẻ --&gt; Tin cùng chuyên mục printDoc.write('x'); document.body.removeChild(frame); var commentIcon = document.getElementById('commentIcon'); 🔗 Liên kết -- Chọn Link liên kết</p>`;
  const clean = cleanExistingArticleContent(dirty);
  assert.match(clean, /Việt Nam áp dụng chứng nhận Apostille từ ngày 11\/09\/2026/);
  assert.match(clean, /xác nhận chữ ký và con dấu/);
  assert.doesNotMatch(clean, /Trang chủ|Aa 396|Tăng cỡ chữ|Thích 6|Tin cùng chuyên mục|printDoc|document\.body|commentIcon|Liên kết/);
});

test('removes source citation paragraphs and table rows but leaves useful article content', () => {
  const dirty = `<p>HiKorea cung cấp hướng dẫn về tư cách lưu trú.</p><p>Nguồn tham khảo chính thức: <a href="https://hikorea.go.kr">HiKorea</a></p><table><tr><th>Nội dung</th><th>Chi tiết</th></tr><tr><td>Nguồn dữ liệu</td><td><a href="https://example.org">Xem nguồn</a></td></tr><tr><td>Thời hạn</td><td>Đến ngày 30/10/2026</td></tr></table>`;
  const clean = cleanExistingArticleContent(dirty);
  assert.match(clean, /HiKorea cung cấp hướng dẫn/);
  assert.match(clean, /30\/10\/2026/);
  assert.doesNotMatch(clean, /Nguồn tham khảo|Nguồn dữ liệu|example\.org/);
});

test('removes crawler report labels but preserves the factual text after them', () => {
  const dirty = `<p>DỮ LIỆU TÌM KIẾM MỞ RỘNG THEO TỪ KHÓA: NGUỒN NGHIÊN CỨU 1: Kaya University — EduRank Dữ kiện: Trường được thành lập năm 1993 tại Gimhae.</p>`;
  const clean = cleanExistingArticleContent(dirty);
  assert.doesNotMatch(clean, /DỮ LIỆU TÌM KIẾM|NGUỒN NGHIÊN CỨU|Dữ kiện:/i);
  assert.match(clean, /Trường được thành lập năm 1993 tại Gimhae/);
});

test('removes bot-style missing-data sentences and placeholder rows while retaining published facts', () => {
  const dirty = `<p>Thông báo được đăng ngày 17/09/2026 và dành cho lưu học sinh Việt Nam. Tuy nhiên, hạn nộp hồ sơ chưa được nêu rõ trong nguồn.</p><table><tr><th>Nội dung</th><th>Chi tiết</th></tr><tr><td>Ngày đăng</td><td>17/09/2026</td></tr><tr><td>Hạn nộp hồ sơ</td><td>nguồn chính thức hiện không nêu rõ</td></tr></table>`;
  const clean = cleanExistingArticleContent(dirty);
  assert.match(clean, /Thông báo được đăng ngày 17\/09\/2026/);
  assert.match(clean, /<td>17\/09\/2026<\/td>/);
  assert.doesNotMatch(clean, /Tuy nhiên|chưa được nêu rõ|nguồn chính thức hiện không nêu rõ|Hạn nộp hồ sơ/);
});

test('removes generic source-status disclosures and source footer lines', () => {
  const dirty = `<h2>Nguồn chính thức và phạm vi cập nhật</h2><p>Nội dung được biên tập từ tài liệu công khai của cơ quan phát hành. Các mức phí, thời hạn và thủ tục có thể được cập nhật; hãy mở trang nguồn chính thức trước khi thực hiện.</p><p>Thông báo được đăng ngày 26/03/2026.</p><p>Nguồn tham khảo chi tiết tại: <a href="https://example.org">Cơ quan</a>.</p>`;
  const clean = cleanExistingArticleContent(dirty);
  assert.match(clean, /Thông báo được đăng ngày 26\/03\/2026/);
  assert.doesNotMatch(clean, /Nguồn chính thức và phạm vi cập nhật|Nội dung được biên tập|mức phí, thời hạn|Nguồn tham khảo|example\.org/);
});

test('keeps a useful contact action when attached to a generic missing-data disclaimer', () => {
  const dirty = `<p>Mọi thông tin chi tiết hoặc nguồn chính thức hiện không nêu rõ về quy trình, bạn đọc có thể liên hệ trực tiếp trung tâm thông tin di trú qua tổng đài 1345 hoặc tham khảo nguồn chính thức tại https://example.org.</p>`;
  const clean = cleanExistingArticleContent(dirty);
  assert.match(clean, /liên hệ trực tiếp trung tâm thông tin di trú qua tổng đài 1345/);
  assert.doesNotMatch(clean, /nguồn chính thức hiện không nêu rõ|example\.org|tham khảo nguồn/);
});

test('removes source-only table columns and trailing source subsections', () => {
  const dirty = `<table><thead><tr><th>Visa</th><th>Đặc điểm</th><th>Nguồn tham khảo</th></tr></thead><tbody><tr><td>D-2</td><td>Chương trình chính quy</td><td>Cổng thông tin Visa</td></tr></tbody></table><h2>Nguồn chính thức</h2><p><a href="https://example.org">Tải tài liệu tuyển sinh</a></p>`;
  const clean = cleanExistingArticleContent(dirty);
  assert.match(clean, /<td>D-2<\/td>/);
  assert.match(clean, /Chương trình chính quy/);
  assert.doesNotMatch(clean, /Nguồn tham khảo|Cổng thông tin Visa|Nguồn chính thức|example\.org|Tải tài liệu tuyển sinh/);
});

test('cleans report sentences from legacy br-based text and verification placeholders from tables', () => {
  const dirty = `<p>Thông báo được đăng ngày 18/09/2026.</p><div>Hiện tại, nguồn tin chính thức không đề cập cụ thể ngày tuyển sinh. Mọi dữ liệu về học phí, thời gian xét tuyển và chỉ tiêu cụ thể đều cần đối chiếu từ cổng thông tin của trường.<br><br>Trung tâm tiếp nhận hồ sơ tại Seoul.</div><table><tr><th>Dịch vụ</th><th>Thông tin</th></tr><tr><td>Khóa học trực tuyến</td><td>cần đối chiếu qua cổng thông tin</td></tr></table>`;
  const clean = cleanExistingArticleContent(dirty);
  assert.match(clean, /18\/09\/2026/);
  assert.match(clean, /Trung tâm tiếp nhận hồ sơ tại Seoul/);
  assert.doesNotMatch(clean, /nguồn tin chính thức không đề cập|Mọi dữ liệu|cần đối chiếu qua cổng thông tin|Khóa học trực tuyến/);
});

test('removes source link paragraphs, source notes, and headings left without section content', () => {
  const dirty = `<h2>Chi tiết đăng ký</h2><p>Hạn nộp hồ sơ là ngày 20/10/2026.</p><h2>Thông tin tuyển sinh và học phí được quy định ra sao?</h2><br><p>Nguồn thông tin chính thức được tham khảo tại: <a href="https://example.org">Cổng chính thức</a></p><p>Để biết thêm thông tin chi tiết, người quan tâm có thể tham khảo tệp đính kèm trong thông báo chính thức tại https://example.org/file.pdf.</p>`;
  const clean = cleanExistingArticleContent(dirty);
  assert.match(clean, /Hạn nộp hồ sơ là ngày 20\/10\/2026/);
  assert.doesNotMatch(clean, /Nguồn thông tin chính thức|Cổng chính thức|Để biết thêm|example\.org|Thông tin tuyển sinh và học phí/);
});

test('strips only source-note parentheticals from otherwise factual table cells', () => {
  const clean = cleanExistingArticleContent(`<table><tr><th>Thông tin</th><th>Chi tiết</th></tr><tr><td>Đối tượng</td><td>Người nước ngoài tại Seoul (xem chi tiết trong nguồn chính thức)</td></tr></table>`);
  assert.match(clean, /Người nước ngoài tại Seoul/);
  assert.doesNotMatch(clean, /xem chi tiết trong nguồn chính thức/);
});

test('removes scraper notices about source-page limitations but preserves the announcement facts', () => {
  const dirty = `<p>Trung tâm đăng thông báo tuyển dụng mã 2026-03 ngày 31/08/2026.</p><p>Do hệ thống hiển thị hạn chế, ứng viên bắt buộc phải truy cập nguồn chính thống để tải toàn bộ tài liệu hướng dẫn chi tiết trước khi nộp hồ sơ.</p><p>Do giao diện trang web không hiển thị toàn bộ văn bản gốc, ứng viên cần tải toàn bộ tệp đính kèm để nắm yêu cầu.</p>`;
  const clean = cleanExistingArticleContent(dirty);
  assert.match(clean, /mã 2026-03 ngày 31\/08\/2026/);
  assert.doesNotMatch(clean, /hệ thống hiển thị hạn chế|giao diện trang web|bắt buộc phải truy cập|tải toàn bộ tài liệu/);
});
