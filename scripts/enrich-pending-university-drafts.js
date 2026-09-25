'use strict';

const path = require('path');
const fs = require('fs');
const db = require('../db');
const { slugify, uniqueSlug, normalizeSourceUrls } = require('../lib/util');
const { sanitizeRichHtml } = require('../lib/contentSanitizer');

const profiles = [
  {
    programId: 12,
    researchItemId: 120,
    title: 'Đại học Suwon',
    subtitle: 'The University of Suwon',
    slug: 'dai-hoc-suwon',
    excerpt: 'Đại học Suwon là trường đại học tại Hwaseong, tỉnh Gyeonggi, có hệ đào tạo đa ngành, chương trình cử nhân dành cho sinh viên quốc tế, viện tiếng Hàn, học bổng theo TOPIK hoặc IELTS và hệ thống hỗ trợ đời sống. Hồ sơ này tổng hợp từ các trang chính thức của trường và đang chờ quản trị viên duyệt.',
    seoTitle: 'Đại học Suwon: ngành học, học phí, học bổng 2026',
    metaDescription: 'Hồ sơ Đại học Suwon bằng tiếng Việt: ngành học, tuyển sinh quốc tế 2026, học phí, học bổng, ký túc xá, khóa tiếng Hàn và thông báo mới.',
    focusKeyword: 'Đại học Suwon',
    sources: [
      'https://www.suwon.ac.kr/eng/index.html?menuno=604',
      'https://www.suwon.ac.kr/eng/index.html?menuno=653',
      'https://admit-en.suwon.ac.kr/usr/file/admit/2026-03_guidelines%20for%20applicants_English.pdf',
      'https://ipsi.suwon.ac.kr/guide/oversea',
      'https://koredu.suwon.ac.kr/eng/?menuno=2102',
      'https://koredu.suwon.ac.kr/eng/index.html?menuno=2111',
      'https://koredu.suwon.ac.kr/eng/index.html?menuno=2112',
      'https://koredu.suwon.ac.kr/eng/?menuno=2113',
      'https://isc.suwon.ac.kr/eng/?menuno=516',
      'https://isc.suwon.ac.kr/eng/index.html?menuno=523',
    ],
    content: `
      <p><strong>Thông tin trọng tâm:</strong> Đại học Suwon có cơ sở tại Hwaseong, tỉnh Gyeonggi, cung cấp đào tạo từ khối khoa học xã hội, kinh doanh, kỹ thuật, công nghệ thông tin đến sức khỏe, nghệ thuật và âm nhạc. Sinh viên quốc tế cần đối chiếu hướng dẫn tuyển sinh của đúng kỳ vì học phí, thời hạn và hồ sơ có thể thay đổi.</p>
      <h2>Tổng quan và điểm nổi bật</h2>
      <p>Định hướng được trường công bố là phát triển mô hình đại học liên ngành, sáng tạo và gắn kết toàn cầu. Hệ thống học thuật gồm các khối khoa học xã hội và nhân văn, kinh tế và quản trị, kỹ thuật, công nghệ thông tin - truyền thông, khoa học sức khỏe, nghệ thuật - thiết kế, âm nhạc, văn hóa nghệ thuật hội tụ và trường quốc tế. Trường đồng thời vận hành Viện Giáo dục tiếng Hàn và Trung tâm Hỗ trợ sinh viên quốc tế.</p>
      <h2>Địa chỉ và thông tin liên hệ</h2>
      <table><tbody><tr><th>Nội dung</th><th>Thông tin chính thức</th></tr><tr><td>Địa chỉ</td><td>17 Wauan-gil, Bongdam-eup, Hyohaeng-gu, Hwaseong-si, Gyeonggi-do 18323, Hàn Quốc</td></tr><tr><td>Điện thoại chính</td><td>031-220-2114</td></tr><tr><td>Bộ phận tuyển sinh</td><td>031-229-8420 đến 8422; fax 031-220-2690; email ipsi@suwon.ac.kr</td></tr><tr><td>Phòng Hợp tác quốc tế</td><td>031-220-2562</td></tr><tr><td>Trường Quốc tế</td><td>031-220-2633</td></tr><tr><td>Trung tâm hỗ trợ sinh viên quốc tế</td><td>031-229-8433 đến 8434</td></tr></tbody></table>
      <h2>Hệ thống khoa, ngành và chuyên ngành</h2>
      <p><strong>Nhân văn và xã hội:</strong> Ngôn ngữ và Văn học Anh, Nghiên cứu Pháp, Nghiên cứu Nga, Ngôn ngữ và Văn học Nhật Bản, Ngôn ngữ và Văn học Trung Quốc, Ngôn ngữ và Văn học Hàn Quốc, Lịch sử, Luật, Hành chính công và Truyền thông.</p>
      <p><strong>Kinh tế và quản trị:</strong> Kinh tế - Tài chính, Hợp tác phát triển quốc tế, Quản trị kinh doanh, Kế toán, Kinh doanh toàn cầu, Khách sạn và Du lịch.</p>
      <p><strong>Kỹ thuật:</strong> Khoa học sinh học, Công nghệ sinh học và tiếp thị sinh học, Hóa học công nghiệp hội tụ, Kỹ thuật xây dựng - môi trường, Kỹ thuật môi trường - năng lượng, Kiến trúc, Quy hoạch đô thị và phát triển bất động sản, Kỹ thuật công nghiệp, Kỹ thuật cơ khí, Vật liệu điện tử, Vật lý điện tử ứng dụng, Kỹ thuật điện, Kỹ thuật điện tử, Kỹ thuật hóa học và Kỹ thuật polymer.</p>
      <p><strong>Công nghệ thông tin và truyền thông:</strong> Khoa học dữ liệu, Phần mềm máy tính, Phần mềm truyền thông, Thông tin - viễn thông và An toàn thông tin.</p>
      <p><strong>Sức khỏe và đời sống:</strong> Điều dưỡng, Phúc lợi trẻ em và gia đình, May mặc - dệt, Dinh dưỡng thực phẩm, Giáo dục thể chất, Thể thao và giải trí, Quản lý vận động và sức khỏe.</p>
      <p><strong>Nghệ thuật:</strong> Hội họa, Điêu khắc, Thiết kế truyền thông, Thiết kế thời trang, Thiết kế thủ công, Sáng tác, Nhạc cụ giao hưởng, Thanh nhạc, Piano, Âm nhạc truyền thống Hàn Quốc, Điện ảnh và nghệ thuật số, Sân khấu, Múa, Công nghệ văn hóa và nội dung. Trường Quốc tế có chương trình Nghiên cứu liên ngành dành riêng cho sinh viên nước ngoài.</p>
      <h2>Chương trình dành cho sinh viên quốc tế</h2>
      <p>Hướng dẫn tuyển sinh quốc tế 2026 của trường bao gồm diện tân sinh viên và chuyển tiếp. Ứng viên phải đáp ứng điều kiện quốc tịch, học vấn và ngôn ngữ của từng diện; giấy tờ học thuật ở nước ngoài có thể phải hợp pháp hóa hoặc chứng nhận theo hướng dẫn. Năm đầu của chương trình Nghiên cứu liên ngành thuộc Trường Quốc tế được công bố mức học phí 3.257.000 won trong tài liệu 2026. Khi chọn chuyên ngành từ năm sau, mức học phí có thể thay đổi theo khoa.</p>
      <h2>Chương trình tiếng Hàn</h2>
      <p>Viện tiếng Hàn tổ chức bốn kỳ trong năm, mỗi kỳ khoảng 10 tuần. Học phí công bố là 1.200.000 won mỗi kỳ; phí nhập học lần đầu 50.000 won; giáo trình khoảng 70.000 won mỗi kỳ; bảo hiểm khoảng 100.000 won cho sáu tháng. Người học mới thường đăng ký tối thiểu hai kỳ. Lịch cụ thể, thời hạn nộp hồ sơ và chính sách hoàn phí phải kiểm tra ở trang lịch học của viện trước khi chuyển tiền.</p>
      <h2>Điều kiện và hồ sơ tuyển sinh</h2>
      <p>Hồ sơ thường gồm đơn đăng ký, hộ chiếu, giấy tờ quan hệ gia đình và quốc tịch, bằng và bảng điểm, chứng minh năng lực ngôn ngữ, chứng minh tài chính cùng giấy tờ được hợp pháp hóa khi được yêu cầu. Chuyển tiếp cần thêm tài liệu chứng minh thời gian và tín chỉ đã học. Danh mục chính xác nằm trong hướng dẫn của đúng kỳ; bản nháp này không thay thế thông báo tuyển sinh.</p>
      <h2>Học phí và các khoản phí</h2>
      <table><thead><tr><th>Khoản</th><th>Mức công bố</th><th>Ghi chú</th></tr></thead><tbody><tr><td>Cử nhân Nghiên cứu liên ngành 2026</td><td>3.257.000 won</td><td>Mức cho năm đầu; có thể thay đổi khi chọn ngành</td></tr><tr><td>Tiếng Hàn</td><td>1.200.000 won/kỳ 10 tuần</td><td>Thông thường đăng ký từ hai kỳ</td></tr><tr><td>Phí nhập học khóa tiếng</td><td>50.000 won</td><td>Thu lần đầu</td></tr><tr><td>Giáo trình</td><td>Khoảng 70.000 won/kỳ</td><td>Tùy cấp độ và bộ sách</td></tr><tr><td>Bảo hiểm</td><td>Khoảng 100.000 won/6 tháng</td><td>Kiểm tra lại tại thời điểm nhập học</td></tr></tbody></table>
      <h2>Học bổng</h2>
      <p>Học bổng đầu vào dựa trên TOPIK gồm: cấp 6 miễn 100% học phí học kỳ đầu; cấp 5 giảm 50%; cấp 4 giảm 40%; cấp 3 giảm 30%. Học bổng tiếng Anh công bố các mức giảm 80%, 60% hoặc 50% theo IELTS; học bổng phỏng vấn có mức 50%, 40% hoặc 30%. Sinh viên đang học có các chương trình ACE Global và ACE Talent theo năng lực ngôn ngữ, điểm trung bình và quy định từng kỳ.</p>
      <h2>Ký túc xá và đời sống</h2>
      <table><thead><tr><th>Khu ở</th><th>Loại phòng</th><th>Mức tham khảo cho hai kỳ</th></tr></thead><tbody><tr><td>Gowoon</td><td>2 người</td><td>950.000 won</td></tr><tr><td>Gowoon</td><td>4 người</td><td>750.000 won</td></tr><tr><td>Global Business</td><td>2 người</td><td>1.500.000 won</td></tr></tbody></table><p>Tiền đặt cọc công bố là 200.000 won. Phí kỳ nghỉ được tính riêng theo tuần. Sinh viên quốc tế còn có chương trình bạn đồng hành, hoạt động văn hóa, hỗ trợ đăng ký cư trú và quỹ hỗ trợ sinh hoạt theo kết quả học tập.</p>
      <h2>Các thông báo mới nhất của trường</h2>
      <table><thead><tr><th>Ngày</th><th>Thông báo đã dịch</th><th>Đơn vị</th></tr></thead><tbody><tr><td>03/08/2026</td><td>Kết quả tuyển chọn chương trình bạn đồng hành quốc tế SUBA lần thứ 36</td><td>Trung tâm hỗ trợ sinh viên quốc tế</td></tr><tr><td>06/07/2026</td><td>Tuyển người học tham gia chương trình SUBA</td><td>Trung tâm hỗ trợ sinh viên quốc tế</td></tr><tr><td>01/07/2026</td><td>Tuyển sinh khóa tiếng Hàn kỳ đông 2026</td><td>Viện Giáo dục tiếng Hàn</td></tr><tr><td>01/07/2026</td><td>Tuyển cố vấn sinh viên cho chương trình SUBA</td><td>Trung tâm hỗ trợ sinh viên quốc tế</td></tr><tr><td>20/04/2026</td><td>Hỗ trợ hoạt động trải nghiệm văn hóa cho sinh viên quốc tế</td><td>Trung tâm hỗ trợ sinh viên quốc tế</td></tr></tbody></table>
      <h2>Tài liệu đính kèm</h2>
      <ul><li><a href="https://admit-en.suwon.ac.kr/usr/file/admit/2026-03_guidelines%20for%20applicants_English.pdf">Hướng dẫn tuyển sinh quốc tế Đại học Suwon năm 2026</a></li><li><a href="https://isc.suwon.ac.kr/eng/?menuno=516">Kho thông báo và tệp của Trung tâm hỗ trợ sinh viên quốc tế</a></li></ul>
      <h2>Nguồn chính thức và ngày kiểm tra</h2>
      <p>Nội dung được đối chiếu trên website chính thức của Đại học Suwon, cổng tuyển sinh quốc tế, Viện Giáo dục tiếng Hàn và Trung tâm hỗ trợ sinh viên quốc tế vào ngày 21/09/2026. Quản trị viên cần mở lại nguồn trước khi duyệt các số liệu có thời hạn.</p>`,
    guides: [
      { title: 'Tuyển sinh quốc tế Đại học Suwon 2026: điều kiện và hồ sơ', source: 'https://admit-en.suwon.ac.kr/usr/file/admit/2026-03_guidelines%20for%20applicants_English.pdf', excerpt: 'Hướng dẫn tiếng Việt về diện tân sinh viên, chuyển tiếp, hồ sơ, học phí và các lưu ý đăng ký theo tài liệu tuyển sinh quốc tế 2026 của Đại học Suwon.', content: '<p>Đại học Suwon tuyển sinh quốc tế theo diện tân sinh viên và chuyển tiếp. Ứng viên phải đọc đúng hướng dẫn của kỳ dự tuyển vì mốc nộp hồ sơ, phương thức đánh giá và yêu cầu hợp pháp hóa có thể thay đổi.</p><h2>Đối tượng nào có thể đăng ký?</h2><p>Diện tân sinh viên dành cho người đã hoàn thành chương trình trung học tương đương và đáp ứng điều kiện quốc tịch của trường. Diện chuyển tiếp yêu cầu bằng hoặc thời gian học tại cơ sở giáo dục đại học và số tín chỉ phù hợp với năm dự kiến nhập học.</p><h2>Nhóm hồ sơ cần chuẩn bị</h2><ul><li>Đơn đăng ký và ảnh theo mẫu.</li><li>Hộ chiếu, giấy tờ quốc tịch và quan hệ gia đình.</li><li>Bằng tốt nghiệp, giấy xác nhận sắp tốt nghiệp và bảng điểm.</li><li>Chứng chỉ ngôn ngữ thuộc nhóm trường chấp nhận.</li><li>Chứng minh tài chính và tài liệu hợp pháp hóa theo quốc gia cấp.</li><li>Hồ sơ đại học và tín chỉ đối với diện chuyển tiếp.</li></ul><h2>Học phí và đăng ký nhập học</h2><p>Tài liệu 2026 công bố 3.257.000 won cho năm đầu của ngành Nghiên cứu liên ngành thuộc Trường Quốc tế. Mức phí có thể đổi khi sinh viên chọn ngành từ năm hai. Thí sinh trúng tuyển phải thanh toán trong thời hạn; tiền chuyển từ nước ngoài phải đến tài khoản trường trước hạn.</p><h2>Những việc cần kiểm tra trước khi nộp</h2><p>Đối chiếu lịch tuyển sinh, bản dịch công chứng, hình thức chứng nhận lãnh sự hoặc Apostille, tài khoản nhận học phí và thông báo kết quả trên cổng tuyển sinh. Không gửi tiền theo thông tin từ đơn vị trung gian khi chưa xác nhận với trường.</p><h2>Nguồn chính thức</h2><p><a href="https://admit-en.suwon.ac.kr/usr/file/admit/2026-03_guidelines%20for%20applicants_English.pdf">Tải hướng dẫn tuyển sinh quốc tế 2026 của Đại học Suwon</a>.</p>' },
      { title: 'Khóa tiếng Hàn Đại học Suwon 2026–2027: lịch học và chi phí', source: 'https://koredu.suwon.ac.kr/eng/?menuno=2102', excerpt: 'Lịch bốn kỳ, học phí, phí nhập học, giáo trình, bảo hiểm và lưu ý hoàn phí của chương trình tiếng Hàn Đại học Suwon.', content: '<p>Viện Giáo dục tiếng Hàn Đại học Suwon vận hành bốn kỳ trong năm, mỗi kỳ khoảng 10 tuần. Người cần hồ sơ visa học tiếng phải đặc biệt chú ý thời hạn đăng ký, lịch đóng phí và yêu cầu nộp giấy tờ bản gốc.</p><h2>Cấu trúc khóa học</h2><p>Chương trình chia theo trình độ, tập trung nghe, nói, đọc, viết và năng lực sử dụng tiếng Hàn trong học tập. Lịch 2026–2027 được công bố trên trang chính thức; ngày khai giảng và thời hạn nhận hồ sơ khác nhau theo kỳ.</p><h2>Chi phí được công bố</h2><table><tbody><tr><th>Khoản</th><th>Mức tham khảo</th></tr><tr><td>Học phí</td><td>1.200.000 won/kỳ 10 tuần</td></tr><tr><td>Phí nhập học</td><td>50.000 won, thu lần đầu</td></tr><tr><td>Giáo trình</td><td>Khoảng 70.000 won/kỳ</td></tr><tr><td>Bảo hiểm</td><td>Khoảng 100.000 won/6 tháng</td></tr></tbody></table><p>Người học mới thường đăng ký tối thiểu hai kỳ. Tỷ giá, phí chuyển tiền và sinh hoạt không nằm trong các mức trên.</p><h2>Hoàn phí và lưu ý</h2><p>Số tiền hoàn phụ thuộc thời điểm yêu cầu so với ngày khai giảng. Người học cần gửi yêu cầu đúng biểu mẫu và cung cấp tài khoản nhận tiền; các khoản phí ngân hàng có thể được khấu trừ. Hãy kiểm tra bảng hoàn phí mới nhất trước khi thanh toán.</p><h2>Nguồn chính thức</h2><p><a href="https://koredu.suwon.ac.kr/eng/?menuno=2102">Lịch chương trình</a> và <a href="https://koredu.suwon.ac.kr/eng/index.html?menuno=2111">học phí - hoàn phí</a>.</p>' },
      { title: 'Học bổng và ký túc xá Đại học Suwon cho sinh viên quốc tế', source: 'https://koredu.suwon.ac.kr/eng/index.html?menuno=2112', excerpt: 'Các mức học bổng đầu vào theo TOPIK, IELTS, phỏng vấn và chi phí ký túc xá Đại học Suwon từ nguồn chính thức.', content: '<p>Đại học Suwon công bố nhiều nhóm học bổng cho sinh viên quốc tế. Mức hỗ trợ phụ thuộc chứng chỉ ngôn ngữ, kết quả phỏng vấn hoặc kết quả học tập và có thể được điều chỉnh theo quy định của kỳ nhập học.</p><h2>Học bổng đầu vào theo TOPIK</h2><table><tbody><tr><th>Trình độ</th><th>Hỗ trợ học kỳ đầu</th></tr><tr><td>TOPIK 6</td><td>100% học phí</td></tr><tr><td>TOPIK 5</td><td>50% học phí</td></tr><tr><td>TOPIK 4</td><td>40% học phí</td></tr><tr><td>TOPIK 3</td><td>30% học phí</td></tr></tbody></table><h2>Học bổng tiếng Anh và thành tích</h2><p>Học bổng IELTS được công bố ở các mức giảm 80%, 60% hoặc 50% học phí học kỳ đầu. Học bổng theo phỏng vấn có các mức 50%, 40% hoặc 30%. Sinh viên đang học có thể được xét ACE Global hoặc ACE Talent theo năng lực ngôn ngữ và điểm trung bình.</p><h2>Ký túc xá</h2><table><tbody><tr><th>Khu ở</th><th>Loại</th><th>Mức cho hai kỳ</th></tr><tr><td>Gowoon</td><td>2 người</td><td>950.000 won</td></tr><tr><td>Gowoon</td><td>4 người</td><td>750.000 won</td></tr><tr><td>Global Business</td><td>2 người</td><td>1.500.000 won</td></tr></tbody></table><p>Tiền đặt cọc công bố là 200.000 won; kỳ nghỉ tính phí riêng. Chỗ ở không mặc nhiên được đảm bảo, vì vậy sinh viên phải theo dõi lịch đăng ký ký túc xá.</p><h2>Nguồn chính thức</h2><p><a href="https://koredu.suwon.ac.kr/eng/index.html?menuno=2112">Học bổng</a> và <a href="https://koredu.suwon.ac.kr/eng/?menuno=2113">ký túc xá</a>.</p>' },
    ],
    faqs: [
      ['Đại học Suwon nằm ở đâu?', 'Trường nằm tại 17 Wauan-gil, Bongdam-eup, Hyohaeng-gu, Hwaseong-si, tỉnh Gyeonggi, Hàn Quốc.'],
      ['Học phí năm đầu của chương trình quốc tế Đại học Suwon là bao nhiêu?', 'Tài liệu tuyển sinh 2026 công bố 3.257.000 won cho năm đầu ngành Nghiên cứu liên ngành; mức sau đó có thể thay đổi theo chuyên ngành.'],
      ['Khóa tiếng Hàn Đại học Suwon có học phí bao nhiêu?', 'Mức công bố là 1.200.000 won cho một kỳ 10 tuần, chưa gồm phí nhập học, giáo trình, bảo hiểm và sinh hoạt.'],
      ['Đại học Suwon có học bổng theo TOPIK không?', 'Có. Mức công bố cho học kỳ đầu lần lượt là 30%, 40%, 50% và 100% học phí đối với TOPIK cấp 3, 4, 5 và 6.'],
    ],
  },
  {
    programId: 13,
    researchItemId: 123,
    title: 'Đại học Nữ Kyung-in',
    subtitle: "Kyung-in Women's University",
    slug: 'dai-hoc-nu-kyung-in',
    excerpt: 'Đại học Nữ Kyung-in tại Incheon đào tạo nhiều ngành sức khỏe, quản trị, du lịch, ẩm thực, thiết kế và nội dung số; đồng thời có chương trình tiếng Hàn, ký túc xá và đội ngũ hỗ trợ sinh viên quốc tế. Hồ sơ tổng hợp từ website cùng tài liệu tuyển sinh chính thức và đang chờ quản trị viên duyệt.',
    seoTitle: 'Đại học Nữ Kyung-in: tuyển sinh, ngành học 2026',
    metaDescription: 'Hồ sơ Đại học Nữ Kyung-in: ngành học, tuyển sinh quốc tế, khóa tiếng Hàn 2026, học phí, học bổng, ký túc xá và liên hệ chính thức.',
    focusKeyword: 'Đại học Nữ Kyung-in',
    sources: [
      'https://www.kiwu.ac.kr/eng/index.do',
      'https://www.kiwu.ac.kr/eng/cms/FR_CON/index.do?MENU_ID=300',
      'https://www.kiwu.ac.kr/eng/cms/FR_CON/index.do?MENU_ID=310',
      'https://www.kiwu.ac.kr/eng/cms/FR_CON/index.do?MENU_ID=340',
      'https://www.kiwu.ac.kr/eng/cms/FR_CON/index.do?MENU_ID=200',
      'https://www.kiwu.ac.kr/attach/202604/1777451974795_0.pdf',
      'https://start.kiwu.ac.kr/start4/kiwu/sub1-5.jsp',
      'https://start.kiwu.ac.kr/new_start/kiwu/',
    ],
    content: `
      <p><strong>Thông tin trọng tâm:</strong> Đại học Nữ Kyung-in là trường tại Incheon, tập trung các nhóm sức khỏe - phúc lợi, quản trị, du lịch - ẩm thực, giáo dục trẻ em, nội dung số và K-Culture. Chương trình cấp bằng dành cho nữ; chương trình tiếng Hàn tiếp nhận học viên quốc tế theo điều kiện riêng của từng đợt.</p>
      <h2>Tổng quan và điểm nổi bật</h2>
      <p>Trường đặt định hướng “sinh viên là trung tâm”, có Trung tâm Giáo dục quốc tế hỗ trợ tiếng Hàn, văn hóa, tuyển sinh, visa, đăng ký cư trú và đời sống. Vị trí tại quận Gyeyang, Incheon thuận lợi cho sinh viên cần tiếp cận khu vực thủ đô và sân bay quốc tế Incheon.</p>
      <h2>Địa chỉ và thông tin liên hệ</h2>
      <table><tbody><tr><th>Nội dung</th><th>Thông tin</th></tr><tr><td>Địa chỉ</td><td>63 Gyeyangsan-ro, Gyeyang-gu, Incheon 21041, Hàn Quốc</td></tr><tr><td>Điện thoại trường</td><td>032-540-0114</td></tr><tr><td>Fax</td><td>032-545-2093</td></tr><tr><td>Trung tâm Giáo dục quốc tế</td><td>032-540-0400 đến 0404; fax 032-546-9739</td></tr><tr><td>Email hỗ trợ</td><td>kopark@kiwu.ac.kr; aeriaeri@kiwu.ac.kr; qaz2004vs@kiwu.ac.kr; srn@kiwu.ac.kr</td></tr></tbody></table>
      <h2>Hệ thống khoa, ngành và chuyên ngành</h2>
      <p><strong>Điều dưỡng, sức khỏe và phúc lợi:</strong> Điều dưỡng, Quản lý thông tin y tế, Môi trường con người, Phúc lợi xã hội, Dinh dưỡng thực phẩm, Chăm sóc sức khỏe thú cưng, Chăm sóc sức khỏe và giáo dục trẻ nhỏ, Làm đẹp chăm sóc da và Tạo mẫu tóc.</p>
      <p><strong>Xã hội và hành chính:</strong> Quản trị kinh doanh, Thương mại quốc tế, Tài chính, Hành chính văn phòng, Kế toán thuế.</p>
      <p><strong>Du lịch và ẩm thực:</strong> Dịch vụ du lịch toàn cầu, Hàng không, Khách sạn - du lịch, Ẩm thực toàn cầu, Nghệ thuật ẩm thực và làm bánh.</p>
      <p><strong>Giáo dục và dịch vụ:</strong> Giáo dục mầm non, Chăm sóc trẻ em, Giáo dục nghệ thuật trẻ nhỏ, Đám cưới và sự kiện.</p>
      <p><strong>Công nghệ, truyền thông và thiết kế:</strong> Hội tụ phần mềm, Phát thanh - video, Sáng tạo nội dung phát sóng, Thiết kế quảng cáo và Thiết kế thời trang. Danh sách mở tuyển thực tế có thể hẹp hơn danh sách toàn trường; phải theo PDF của kỳ tuyển sinh.</p>
      <h2>Chương trình dành cho sinh viên quốc tế</h2>
      <p>Diện cấp bằng dành cho ứng viên nữ đã tốt nghiệp trung học hoặc bậc cao hơn. Trang hướng dẫn tiếng Anh nêu điều kiện ngôn ngữ thường là TOPIK cấp 3 trở lên hoặc hoàn thành cấp tương đương sau ít nhất sáu tháng học tiếng tại một trường đại học Hàn Quốc. Kỳ thu 2026 đánh giá hồ sơ và phỏng vấn; ngành nhận hồ sơ và chỉ tiêu nằm trong hướng dẫn chính thức.</p>
      <h2>Chương trình tiếng Hàn</h2>
      <table><thead><tr><th>Kỳ 2026</th><th>Thời gian học</th></tr></thead><tbody><tr><td>Xuân</td><td>09/03 đến 18/05/2026</td></tr><tr><td>Hè</td><td>08/06 đến 14/08/2026</td></tr><tr><td>Thu</td><td>07/09 đến 23/11/2026</td></tr><tr><td>Đông</td><td>07/12/2026 đến 24/02/2027</td></tr></tbody></table><p>Chương trình có tối đa khoảng 20 học viên mỗi lớp; ca sáng 09:00–12:50 và ca chiều 14:00–17:50 tùy cấp độ. Học phí tài liệu 2026 là 1.100.000 won mỗi kỳ. Ứng viên cần kiểm tra điều kiện học vấn, chứng minh tài chính, bảo hiểm và hồ sơ visa trong PDF.</p>
      <h2>Điều kiện và hồ sơ tuyển sinh</h2>
      <p>Hồ sơ cấp bằng thường gồm bằng và bảng điểm các bậc học có chứng nhận cần thiết, TOPIK, hộ chiếu, giấy tờ gia đình, hồ sơ việc làm - thu nhập của cha mẹ, chứng minh tài chính và ảnh. Hướng dẫn tiếng Anh cũ từng nêu số dư từ 20.000 USD, nhưng quản trị viên phải thay bằng mức của PDF kỳ mới trước khi xuất bản nếu có thay đổi. Hồ sơ khóa tiếng và hồ sơ cấp bằng là hai bộ khác nhau.</p>
      <h2>Học phí và các khoản phí</h2>
      <table><thead><tr><th>Chương trình</th><th>Mức tham khảo</th><th>Lưu ý</th></tr></thead><tbody><tr><td>Tiếng Hàn 2026</td><td>1.100.000 won/kỳ</td><td>Theo tài liệu D-4 năm 2026</td></tr><tr><td>Phí đăng ký tuyển sinh cấp bằng</td><td>50.000 won</td><td>Theo hướng dẫn kỳ xuân 2026</td></tr><tr><td>Khối nhân văn trong tài liệu 2026</td><td>Khoảng 3.214.000 won/kỳ</td><td>Mức thực trả phụ thuộc học bổng và ngành</td></tr><tr><td>Ký túc xá</td><td>300.000 won/tháng</td><td>Không thu riêng phí quản lý theo trang tiếng Anh</td></tr></tbody></table>
      <h2>Học bổng</h2>
      <p>Trường vận hành học bổng đầu vào, học bổng thành tích, hỗ trợ theo TOPIK và chương trình toàn cầu. Tài liệu khóa tiếng 2026 nêu khoản 300.000 won một lần cho học viên đạt TOPIK cấp 3 trở lên trong thời gian theo học. Tỷ lệ giảm học phí cấp bằng cần đối chiếu bảng của đúng đợt vì thay đổi theo ngành và kỳ.</p>
      <h2>Ký túc xá và đời sống</h2>
      <p>Ký túc xá do đơn vị quốc tế vận hành, cách trường khoảng 10 phút đi bộ. Phòng dành cho 2–3 người, có bàn, giường, máy giặt, tủ lạnh, tủ quần áo, bồn rửa và khu bếp. Mức công bố là 300.000 won mỗi tháng, hợp đồng đầu sáu tháng và có thể gia hạn theo điều kiện. Trung tâm quốc tế hỗ trợ đăng ký người nước ngoài, gia hạn hoặc đổi tư cách lưu trú và hoạt động trải nghiệm văn hóa.</p>
      <h2>Các thông báo mới nhất của trường</h2>
      <table><thead><tr><th>Ngày</th><th>Thông báo đã dịch</th></tr></thead><tbody><tr><td>14/09/2026</td><td>Hướng dẫn kiểm tra số báo danh và nộp hồ sơ cho đơn đăng ký miễn phí</td></tr><tr><td>07/09/2026</td><td>Đợt tiếp nhận phản ánh tập trung về sai phạm tuyển sinh</td></tr><tr><td>31/08/2026</td><td>Kế hoạch cung cấp trực tuyến dữ liệu tuyển sinh đại học năm 2027</td></tr><tr><td>25/08/2026</td><td>Thông tin hội chợ tuyển sinh cao đẳng năm học 2027</td></tr><tr><td>29/06/2026</td><td>Hội chợ tuyển sinh khu vực Incheon và Bucheon năm 2027</td></tr></tbody></table><p>Các thông báo trên gồm cả tuyển sinh trong nước; ứng viên quốc tế cần ưu tiên trang “kỳ tháng 9 dành cho người nước ngoài” và PDF quốc tế.</p>
      <h2>Tài liệu đính kèm</h2>
      <ul><li><a href="https://www.kiwu.ac.kr/attach/202604/1777451974795_0.pdf">Hướng dẫn chương trình tiếng Hàn D-4 và tuyển sinh quốc tế năm 2026</a></li><li><a href="https://start.kiwu.ac.kr/start4/kiwu/sub1-5.jsp">Trang tải hướng dẫn tuyển sinh kỳ tháng 9 dành cho người nước ngoài</a></li></ul>
      <h2>Nguồn chính thức và ngày kiểm tra</h2>
      <p>Nội dung được đối chiếu trên website tiếng Anh, cổng tuyển sinh và tài liệu PDF chính thức của Đại học Nữ Kyung-in vào ngày 21/09/2026. Các mức phí cũ trên một số trang được ghi rõ là tham khảo và không thay thế thông báo của kỳ mới.</p>`,
    guides: [
      { title: 'Tuyển sinh quốc tế Đại học Nữ Kyung-in 2026', source: 'https://www.kiwu.ac.kr/attach/202604/1777451974795_0.pdf', excerpt: 'Điều kiện, quy trình, hồ sơ và các khoản phí cần kiểm tra khi đăng ký chương trình quốc tế Đại học Nữ Kyung-in năm 2026.', content: '<p>Đại học Nữ Kyung-in có đợt tuyển sinh quốc tế theo hồ sơ và phỏng vấn. Chương trình cấp bằng dành cho ứng viên nữ; khóa tiếng Hàn áp dụng điều kiện riêng và có thể tiếp nhận học viên nam theo thông báo của trung tâm.</p><h2>Điều kiện học vấn và ngôn ngữ</h2><p>Ứng viên cấp bằng cần tốt nghiệp trung học hoặc bậc cao hơn. Trang hướng dẫn tiếng Anh nêu TOPIK cấp 3 hoặc hoàn thành trình độ tiếng tương đương sau quá trình học tại một trường đại học Hàn Quốc. Hãy dùng yêu cầu trong PDF của đúng kỳ nếu có khác biệt.</p><h2>Hồ sơ cốt lõi</h2><ul><li>Đơn đăng ký, hộ chiếu và ảnh.</li><li>Bằng tốt nghiệp, bảng điểm và bản chứng nhận theo yêu cầu.</li><li>Giấy tờ quốc tịch và quan hệ gia đình.</li><li>Chứng chỉ tiếng Hàn.</li><li>Chứng minh tài chính và tài liệu thu nhập khi được yêu cầu.</li></ul><h2>Đánh giá và đăng ký</h2><p>Kỳ thu 2026 đánh giá hồ sơ và phỏng vấn. Hồ sơ nộp trực tiếp hoặc qua đường bưu điện đến Nhóm Giáo dục quốc tế tại tầng 1 tòa Spotopia. Ứng viên phải kiểm tra thời hạn hồ sơ đến nơi thay vì chỉ ngày gửi.</p><h2>Chi phí cần dự toán</h2><p>Phí đăng ký trong hướng dẫn kỳ xuân 2026 là 50.000 won. Học phí phụ thuộc ngành; tài liệu 2026 đưa mức tham khảo khối nhân văn khoảng 3.214.000 won mỗi kỳ trước hỗ trợ. Hãy kiểm tra hóa đơn chính thức trước khi chuyển tiền.</p><h2>Nguồn chính thức</h2><p><a href="https://www.kiwu.ac.kr/attach/202604/1777451974795_0.pdf">Tài liệu tuyển sinh và khóa tiếng năm 2026</a>.</p>' },
      { title: 'Khóa tiếng Hàn và ký túc xá Đại học Nữ Kyung-in 2026', source: 'https://www.kiwu.ac.kr/attach/202604/1777451974795_0.pdf', excerpt: 'Lịch học, học phí, ca học và ký túc xá của chương trình tiếng Hàn D-4 tại Đại học Nữ Kyung-in năm 2026.', content: '<p>Chương trình tiếng Hàn của Đại học Nữ Kyung-in có bốn kỳ trong năm 2026, kết hợp học ngôn ngữ và hoạt động trải nghiệm văn hóa. Lịch và chi phí dưới đây lấy từ tài liệu chính thức nhưng vẫn cần xác nhận trước khi nộp hồ sơ.</p><h2>Lịch bốn kỳ</h2><table><tbody><tr><th>Xuân</th><td>09/03–18/05/2026</td></tr><tr><th>Hè</th><td>08/06–14/08/2026</td></tr><tr><th>Thu</th><td>07/09–23/11/2026</td></tr><tr><th>Đông</th><td>07/12/2026–24/02/2027</td></tr></tbody></table><h2>Thời khóa biểu và quy mô lớp</h2><p>Mỗi lớp tối đa khoảng 20 người. Ca sáng từ 09:00 đến 12:50; ca chiều từ 14:00 đến 17:50. Việc xếp ca phụ thuộc cấp độ và kỳ học.</p><h2>Học phí và ký túc xá</h2><p>Học phí công bố là 1.100.000 won mỗi kỳ. Ký túc xá khoảng 300.000 won mỗi tháng, phòng 2–3 người và có thiết bị sinh hoạt cơ bản. Thời gian hợp đồng ban đầu sáu tháng; gia hạn tùy tình trạng phòng và quy định.</p><h2>Hỗ trợ học viên</h2><p>Nhóm Giáo dục quốc tế hỗ trợ hồ sơ visa, đăng ký cư trú, đời sống, tư vấn lên chương trình đại học và trải nghiệm văn hóa. Học viên đạt TOPIK cấp 3 trở lên trong thời gian học có thể được khoản hỗ trợ một lần 300.000 won theo tài liệu 2026.</p><h2>Nguồn chính thức</h2><p><a href="https://www.kiwu.ac.kr/attach/202604/1777451974795_0.pdf">Hướng dẫn chương trình tiếng Hàn D-4 năm 2026</a>.</p>' },
    ],
    faqs: [
      ['Đại học Nữ Kyung-in nằm ở đâu?', 'Trường nằm tại 63 Gyeyangsan-ro, quận Gyeyang, thành phố Incheon, Hàn Quốc.'],
      ['Nam giới có thể học tại Đại học Nữ Kyung-in không?', 'Chương trình cấp bằng dành cho nữ; chương trình tiếng Hàn có thông báo riêng và trang trung tâm nêu có thể tiếp nhận học viên nam.'],
      ['Học phí khóa tiếng Hàn năm 2026 là bao nhiêu?', 'Tài liệu năm 2026 công bố học phí 1.100.000 won cho mỗi kỳ.'],
      ['Ký túc xá Đại học Nữ Kyung-in có giá bao nhiêu?', 'Trang chính thức công bố khoảng 300.000 won mỗi tháng cho phòng 2–3 người, không tính riêng phí quản lý.'],
    ],
  },
  {
    programId: 14,
    researchItemId: 128,
    title: 'Đại học Wonkwang',
    subtitle: 'Wonkwang University',
    slug: 'dai-hoc-wonkwang',
    excerpt: 'Đại học Wonkwang tại Iksan, tỉnh Jeonbuk, là trường đại học đa ngành có thế mạnh từ nhân văn, kinh doanh và kỹ thuật đến dược, y, nha khoa, y học phương Đông, nghệ thuật và giáo dục. Hồ sơ này tổng hợp tuyển sinh quốc tế, học bổng, ký túc xá và thông báo từ các trang chính thức.',
    seoTitle: 'Đại học Wonkwang: ngành học và tuyển sinh quốc tế',
    metaDescription: 'Thông tin Đại học Wonkwang bằng tiếng Việt: ngành học, điều kiện tuyển sinh, học bổng quốc tế, ký túc xá, khóa tiếng Hàn và thông báo mới.',
    focusKeyword: 'Đại học Wonkwang',
    sources: [
      'https://eng.wku.ac.kr/',
      'https://eng.wku.ac.kr/about/school-info/stats-facts/',
      'https://eng.wku.ac.kr/admissions/colleges-2/colleges/',
      'https://eng.wku.ac.kr/admissions/colleges-2/application-and-procedures/',
      'https://eng.wku.ac.kr/admissions/colleges-2/scholarships/',
      'https://eng.wku.ac.kr/campus-life/dormitory/',
      'https://eng.wku.ac.kr/international-affairs/exchang-students-program/',
      'https://eng.wku.ac.kr/wp-content/themes/wku_eng/pdf/vietnam_koreancenter.pdf',
    ],
    content: `
      <p><strong>Thông tin trọng tâm:</strong> Đại học Wonkwang là trường đa ngành tại thành phố Iksan, tỉnh Jeonbuk. Trường có khối ngành nhân văn, kinh doanh, nông nghiệp - thực phẩm, dược, giáo dục, khoa học tự nhiên, y học phương Đông, nghệ thuật, khoa học xã hội, kỹ thuật, nha khoa và y khoa; đồng thời tiếp nhận sinh viên quốc tế và sinh viên trao đổi.</p>
      <h2>Tổng quan và điểm nổi bật</h2>
      <p>Wonkwang bắt đầu từ cơ sở Yuil Haklim năm 1946 và phát triển thành đại học tổng hợp. Trang giới thiệu tiếng Anh của trường mô tả hệ thống 15 trường thành viên, nhiều viện nghiên cứu và các trường sau đại học, trong đó có luật, y, nha khoa và y học phương Đông. Một số thống kê trên trang giới thiệu mang mốc lịch sử cũ, vì vậy không dùng làm số liệu tuyển sinh hiện hành.</p>
      <h2>Địa chỉ và thông tin liên hệ</h2>
      <table><tbody><tr><th>Nội dung</th><th>Thông tin</th></tr><tr><td>Địa chỉ</td><td>460 Iksandae-ro, Iksan, Jeonbuk 54538, Hàn Quốc</td></tr><tr><td>Điện thoại chính</td><td>+82-63-850-5114</td></tr><tr><td>Fax</td><td>+82-63-850-6666</td></tr><tr><td>Đơn vị quốc tế</td><td>Center for International Affairs, Wonkwang University</td></tr></tbody></table>
      <h2>Hệ thống khoa, ngành và chuyên ngành</h2>
      <p><strong>Các trường và khối đào tạo:</strong> Nhân văn; Kinh doanh; Nông nghiệp và Hội tụ thực phẩm; Dược; Giáo dục; Khoa học tự nhiên; Y học phương Đông; Nghệ thuật và Thiết kế; Khoa học xã hội; Kỹ thuật; Nha khoa; Y khoa; cùng các ngành độc lập.</p>
      <p>Danh mục chi tiết trên cổng tiếng Anh bao gồm các lĩnh vực ngôn ngữ, lịch sử và văn hóa; kinh doanh và kinh tế; tài nguyên đời sống; dược; sư phạm; khoa học cơ bản; kiến trúc, điện - điện tử, cơ khí và các ngành kỹ thuật; mỹ thuật - thiết kế; phúc lợi, hành chính; y, nha và y học phương Đông. Ngành Quốc phòng và khối tự chọn liên ngành được giới thiệu ở nhóm ngành độc lập. Ngành mở cho sinh viên quốc tế phải kiểm tra trong hướng dẫn tuyển sinh của kỳ tương ứng.</p>
      <h2>Chương trình dành cho sinh viên quốc tế</h2>
      <p>Trường có tuyển sinh cử nhân quốc tế, chương trình trao đổi và Trung tâm Giáo dục tiếng Hàn. Trang hướng dẫn nêu các bước: nộp đơn, xét hồ sơ, phỏng vấn hoặc kiểm tra, công bố kết quả và đăng ký. Chương trình trao đổi dành cho người được trường đối tác đề cử theo thỏa thuận; hỗ trợ có thể gồm miễn học phí, ký túc xá hoặc bữa ăn tùy thỏa thuận, đón tại điểm đến và lớp tiếng Hàn riêng.</p>
      <h2>Chương trình tiếng Hàn</h2>
      <p>Trung tâm tiếng Hàn của Wonkwang tiếp nhận học viên quốc tế và công bố tài liệu hỏi đáp riêng bằng tiếng Việt. Hồ sơ thường gồm giấy tờ học vấn đã xác nhận, hộ chiếu, tài chính và các biểu mẫu của trung tâm. Lịch, học phí, hoàn phí và yêu cầu visa D-4 phải được lấy từ thông báo mới nhất vì trang hỏi đáp không nên được dùng thay cho lịch tuyển sinh hiện hành.</p>
      <h2>Điều kiện và hồ sơ tuyển sinh</h2>
      <p>Trang tuyển sinh tiếng Anh nêu điều kiện cơ bản cho tân sinh viên là ứng viên và cha mẹ mang quốc tịch nước ngoài, đã hoàn thành bậc học cần thiết và đáp ứng năng lực tiếng Hàn. Điều kiện được trang này nêu là TOPIK cấp 3, hoàn thành cấp 4 tại trung tâm tiếng Hàn Wonkwang hoặc vượt qua bài kiểm tra tương đương của trường. Chuyển tiếp năm hai hoặc năm ba cần thêm bằng, thời gian học và tín chỉ bậc đại học. Vì trang điều kiện có thời điểm cập nhật cũ, hướng dẫn PDF mới của từng kỳ có giá trị ưu tiên.</p>
      <h2>Học phí và các khoản phí</h2>
      <p>Trường đã đăng thông báo đóng học phí học kỳ 2 năm 2026 cho sinh viên quốc tế vào ngày 05/08 và cập nhật thêm ngày 02/09/2026. Mức tiền phụ thuộc ngành, khóa và tình trạng học bổng nên bản nháp không gắn một con số chung. Quản trị viên cần đính kèm bảng học phí hoặc thông báo của đúng kỳ trước khi xuất bản nếu muốn công bố số tiền cụ thể.</p>
      <h2>Học bổng</h2>
      <table><thead><tr><th>Điều kiện được trang trường công bố</th><th>Hỗ trợ học kỳ đầu</th></tr></thead><tbody><tr><td>TOPIK cấp 5 trở lên</td><td>Miễn 100% học phí và phí nhập học</td></tr><tr><td>TOPIK cấp 4</td><td>Giảm 60% học phí</td></tr><tr><td>TOPIK cấp 2–3 hoặc điều kiện tương đương được trường chấp nhận</td><td>Giảm 50% học phí</td></tr><tr><td>Nhóm nghệ thuật hoặc thể thao</td><td>Giảm 50% học phí theo quy định</td></tr></tbody></table><p>Từ học kỳ hai, học bổng thành tích có thể ở mức 30%–60% theo điểm trung bình và quy định sinh viên quốc tế. Trang học bổng yêu cầu nộp bằng chứng bảo hiểm sinh viên quốc tế; chính sách và điều kiện phải kiểm tra lại ở kỳ xét thực tế.</p>
      <h2>Ký túc xá và đời sống</h2>
      <p>Trang tiếng Anh công bố khả năng tiếp nhận khoảng 3.670 người tại hệ thống ký túc xá. Trong khuôn viên có nhiều tòa nhà; ngoài khuôn viên có khu dành cho nhóm y khoa, người chuẩn bị kỳ thi quốc gia, sinh viên tôn giáo và khối quân sự. Phòng đôi có kết nối internet; tiện ích chung gồm phòng tắm, phòng học, sảnh, phòng tập, nhà ăn, cửa hàng và giặt là. Phí phòng và lịch đăng ký phải lấy từ thông báo ký túc xá từng học kỳ.</p>
      <h2>Các thông báo mới nhất của trường</h2>
      <table><thead><tr><th>Ngày</th><th>Thông báo đã dịch</th></tr></thead><tbody><tr><td>02/09/2026</td><td>Thông báo cập nhật về đóng học phí học kỳ 2 năm 2026 dành cho sinh viên quốc tế</td></tr><tr><td>05/08/2026</td><td>Hướng dẫn đóng học phí học kỳ 2 năm 2026 dành cho sinh viên quốc tế</td></tr><tr><td>22/10/2024</td><td>Hướng dẫn đăng ký Trung tâm Văn hóa và Giáo dục tiếng Hàn năm 2025</td></tr><tr><td>21/10/2024</td><td>Hướng dẫn tuyển sinh cử nhân quốc tế kỳ tháng 9 năm 2025</td></tr></tbody></table><p>Danh sách phản ánh các mục hiển thị gần nhất trên trang tiếng Anh tại ngày kiểm tra. Người dự tuyển cần xem cổng tuyển sinh tiếng Hàn nếu thông báo quốc tế mới chưa đồng bộ sang trang tiếng Anh.</p>
      <h2>Tài liệu đính kèm</h2>
      <ul><li><a href="https://eng.wku.ac.kr/wp-content/themes/wku_eng/pdf/vietnam_koreancenter.pdf">Tài liệu tiếng Việt về Trung tâm Giáo dục tiếng Hàn Đại học Wonkwang</a></li><li><a href="https://eng.wku.ac.kr/admissions/colleges-2/application-and-procedures/">Quy trình và điều kiện tuyển sinh quốc tế</a></li></ul>
      <h2>Nguồn chính thức và ngày kiểm tra</h2>
      <p>Nội dung được đối chiếu trên website tiếng Anh và tài liệu của Đại học Wonkwang vào ngày 21/09/2026. Các trang có mốc cập nhật cũ được ghi rõ và chỉ dùng để mô tả cấu trúc, không thay thế hướng dẫn tuyển sinh mới.</p>`,
    guides: [
      { title: 'Tuyển sinh quốc tế Đại học Wonkwang: điều kiện và quy trình', source: 'https://eng.wku.ac.kr/admissions/colleges-2/application-and-procedures/', excerpt: 'Điều kiện học vấn, ngôn ngữ, chuyển tiếp và quy trình tuyển sinh quốc tế Đại học Wonkwang theo trang chính thức.', content: '<p>Đại học Wonkwang có diện tân sinh viên và chuyển tiếp cho ứng viên quốc tế. Trang tiếng Anh cung cấp điều kiện nền, nhưng ứng viên phải dùng thông báo của đúng kỳ để xác định hạn nộp, ngành mở tuyển và biểu mẫu hiện hành.</p><h2>Điều kiện tân sinh viên</h2><p>Điều kiện cơ bản được công bố là ứng viên và cha mẹ có quốc tịch nước ngoài, hoàn thành bậc trung học tương đương và đáp ứng yêu cầu tiếng Hàn. Trang trường nêu TOPIK cấp 3, hoàn thành cấp 4 tại trung tâm tiếng Hàn của Wonkwang hoặc đạt bài kiểm tra tương đương của trường.</p><h2>Điều kiện chuyển tiếp</h2><p>Chuyển tiếp năm ba yêu cầu đã tốt nghiệp cao đẳng hoặc hoàn thành ít nhất hai năm tại đại học bốn năm. Chuyển tiếp năm hai yêu cầu tốt nghiệp cao đẳng hoặc hoàn thành ít nhất một năm tại đại học bốn năm. Trường có thể yêu cầu số tín chỉ cụ thể trong thông báo từng kỳ.</p><h2>Quy trình</h2><ol><li>Nộp đơn và hồ sơ.</li><li>Trường xét giấy tờ.</li><li>Phỏng vấn hoặc kiểm tra theo ngành.</li><li>Công bố kết quả.</li><li>Thanh toán và hoàn tất đăng ký.</li></ol><h2>Lưu ý ngôn ngữ</h2><p>Trang trường nêu yêu cầu đạt TOPIK cấp 4 trước khi tốt nghiệp; một số ngành nghệ thuật hoặc thể thao có quy định khác. Đây là điều kiện có thể cập nhật, vì vậy cần đối chiếu tài liệu mới.</p><h2>Nguồn chính thức</h2><p><a href="https://eng.wku.ac.kr/admissions/colleges-2/application-and-procedures/">Quy trình tuyển sinh quốc tế Đại học Wonkwang</a>.</p>' },
      { title: 'Học bổng và ký túc xá Đại học Wonkwang cho sinh viên quốc tế', source: 'https://eng.wku.ac.kr/admissions/colleges-2/scholarships/', excerpt: 'Mức học bổng theo TOPIK, học bổng thành tích và thông tin hệ thống ký túc xá Đại học Wonkwang từ website chính thức.', content: '<p>Đại học Wonkwang công bố học bổng học kỳ đầu dựa trên TOPIK và hỗ trợ từ học kỳ sau dựa trên kết quả học tập. Chính sách có thể được cập nhật nên sinh viên phải kiểm tra thông báo học bổng của năm nhập học.</p><h2>Học bổng học kỳ đầu</h2><table><tbody><tr><th>TOPIK 5 trở lên</th><td>Miễn 100% học phí và phí nhập học</td></tr><tr><th>TOPIK 4</th><td>Giảm 60% học phí</td></tr><tr><th>TOPIK 2–3 hoặc điều kiện tương đương</th><td>Giảm 50% học phí</td></tr><tr><th>Nhóm nghệ thuật hoặc thể thao</th><td>Giảm 50% theo quy định</td></tr></tbody></table><h2>Học bổng từ học kỳ hai</h2><p>Mức hỗ trợ thành tích được công bố trong khoảng 30%–60% theo điểm trung bình và quy định sinh viên quốc tế. Trang trường cũng yêu cầu người học cung cấp chứng nhận bảo hiểm đúng thời hạn để duy trì điều kiện xét.</p><h2>Hệ thống ký túc xá</h2><p>Trang chính thức nêu sức chứa khoảng 3.670 người, nhiều tòa trong và ngoài khuôn viên. Phòng đôi có internet; khu chung có phòng tắm, phòng học, sảnh, phòng tập, nhà ăn, cửa hàng và giặt là. Lịch, phí phòng và thứ tự ưu tiên được thông báo theo học kỳ.</p><h2>Việc cần làm trước khi đăng ký</h2><p>Xác nhận loại phòng, thời gian hợp đồng, tiền ăn, tiền đặt cọc, chính sách hoàn phí và ngày nhận phòng. Không suy ra chi phí hiện hành từ trang giới thiệu nếu trường chưa đăng bảng của học kỳ mới.</p><h2>Nguồn chính thức</h2><p><a href="https://eng.wku.ac.kr/admissions/colleges-2/scholarships/">Học bổng</a> và <a href="https://eng.wku.ac.kr/campus-life/dormitory/">ký túc xá</a>.</p>' },
    ],
    faqs: [
      ['Đại học Wonkwang nằm ở đâu?', 'Trường nằm tại 460 Iksandae-ro, thành phố Iksan, tỉnh Jeonbuk, Hàn Quốc.'],
      ['Điều kiện tiếng Hàn cơ bản của Đại học Wonkwang là gì?', 'Trang tuyển sinh tiếng Anh nêu TOPIK cấp 3 hoặc điều kiện tương đương; hướng dẫn mới của từng kỳ có giá trị ưu tiên.'],
      ['Đại học Wonkwang có học bổng cho TOPIK cấp 5 không?', 'Trang trường công bố miễn 100% học phí và phí nhập học học kỳ đầu cho TOPIK cấp 5 trở lên, nhưng cần xác nhận chính sách của kỳ nhập học.'],
      ['Ký túc xá Đại học Wonkwang có những tiện ích nào?', 'Hệ thống có phòng học, sảnh, phòng tập, nhà ăn, cửa hàng, giặt là và kết nối internet tại phòng đôi theo trang giới thiệu chính thức.'],
    ],
  },
];

function guideSeo(guide) {
  return {
    seoTitle: guide.title.slice(0, 65),
    metaDescription: guide.excerpt.slice(0, 165),
    focusKeyword: guide.title.split(':')[0].slice(0, 120),
  };
}

async function run() {
  const backupDir = path.join(__dirname, '..', 'db', 'backups');
  fs.mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `data-before-university-enrichment-${stamp}.sqlite`);
  await db.backup(backupPath);

  const result = db.transaction(() => {
    db.prepare("UPDATE research_items SET status='pending',optimization_note='Đã trả lại hàng chờ vì lần xử lý trước không tạo được hồ sơ để quản trị viên duyệt.',updated_at=datetime('now','localtime') WHERE status='converted' AND published_post_id IS NULL AND published_program_id IS NULL").run();
    const summary = [];
    for (const profile of profiles) {
      const guideLinks = [];
      for (const guide of profile.guides) {
        const existing = db.prepare("SELECT id,slug FROM posts WHERE lower(title)=lower(?) ORDER BY id DESC LIMIT 1").get(guide.title);
        let guideId; let guideSlug;
        const seo = guideSeo(guide);
        if (existing) {
          guideId = existing.id; guideSlug = existing.slug;
          db.prepare("UPDATE posts SET excerpt=?,content=?,category='Cẩm nang du học',cover_image=?,source_urls=?,seo_title=?,meta_description=?,focus_keyword=?,published=0,noindex=1,updated_at=datetime('now','localtime') WHERE id=?")
            .run(guide.excerpt, sanitizeRichHtml(guide.content), `/anh-cam-nang/${guideId}.svg`, normalizeSourceUrls(guide.source), seo.seoTitle, seo.metaDescription, seo.focusKeyword, guideId);
        } else {
          guideSlug = uniqueSlug(db, slugify(guide.title), 0, 'posts');
          const inserted = db.prepare(`INSERT INTO posts (title,slug,excerpt,content,category,cover_image,source_urls,seo_title,meta_description,focus_keyword,published,noindex,created_at,updated_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,0,1,datetime('now','localtime'),datetime('now','localtime'))`)
            .run(guide.title, guideSlug, guide.excerpt, sanitizeRichHtml(guide.content), 'Cẩm nang du học', '', normalizeSourceUrls(guide.source), seo.seoTitle, seo.metaDescription, seo.focusKeyword);
          guideId = Number(inserted.lastInsertRowid);
          db.prepare('UPDATE posts SET cover_image=? WHERE id=?').run(`/anh-cam-nang/${guideId}.svg`, guideId);
        }
        guideLinks.push({ title: guide.title, slug: guideSlug, id: guideId });
      }
      const related = `<h2>Cẩm nang liên quan đến ${profile.title}</h2><ul>${guideLinks.map((guide) => `<li><a href="/tin-tuc/${guide.slug}">${guide.title}</a></li>`).join('')}</ul>`;
      const finalContent = sanitizeRichHtml(`${profile.content}${related}`);
      db.prepare(`UPDATE programs SET title=?,subtitle=?,slug=?,excerpt=?,content=?,category='Thông tin trường',cover_image=?,source_urls=?,seo_title=?,meta_description=?,focus_keyword=?,published=0,noindex=1,updated_at=datetime('now','localtime') WHERE id=?`)
        .run(profile.title, profile.subtitle, profile.slug, profile.excerpt, finalContent, `/anh-truong/${profile.programId}.svg`, normalizeSourceUrls(profile.sources.join('\n')), profile.seoTitle, profile.metaDescription, profile.focusKeyword, profile.programId);
      db.prepare("DELETE FROM faqs WHERE generated=1 AND origin_type='program' AND origin_id=?").run(String(profile.programId));
      const insertFaq = db.prepare("INSERT INTO faqs (category,question,answer,source_url,sort_order,published,generated,origin_type,origin_id) VALUES ('Thông tin trường',?,?,?,?,0,1,'program',?)");
      profile.faqs.forEach((faq, index) => insertFaq.run(faq[0], faq[1], profile.sources[0], index * 10, String(profile.programId)));
      db.prepare("UPDATE research_items SET status='converted',published_program_id=?,published_post_id=NULL,title=?,excerpt=?,suggested_section='Thông tin trường',quality_score=100,optimization_note='Đã tạo hồ sơ trường chuyên sâu và cẩm nang liên quan từ website chính thức; đang chờ quản trị viên duyệt.',updated_at=datetime('now','localtime') WHERE id=?")
        .run(profile.programId, profile.title, profile.excerpt, profile.researchItemId);
      summary.push({ programId: profile.programId, title: profile.title, contentLength: finalContent.length, guides: guideLinks.length });
    }
    db.prepare("UPDATE research_items SET optimization_note='Khi tạo hồ sơ, bot sẽ đọc tối đa 20 trang thuộc website chính thức của trường; bản nháp phải đủ tổng quan, liên hệ, ngành, tuyển sinh, học phí, học bổng, ký túc xá, thông báo, tài liệu và được dịch hoàn toàn sang tiếng Việt.',updated_at=datetime('now','localtime') WHERE status='pending' AND suggested_section IN ('Thông tin trường','Chương trình du học')").run();
    return summary;
  })();

  console.log(JSON.stringify({ backupPath, profiles: result }, null, 2));
}

run().then(() => db.close()).catch((error) => {
  console.error(error);
  try { db.close(); } catch (_) { /* noop */ }
  process.exitCode = 1;
});

