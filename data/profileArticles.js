'use strict';

const schools = require('./partner-schools.json').schools;
const courses = require('./courses.json').courses.filter((course) => course.financials?.tuition2026);

const profileUrl = 'https://www.soldream.edu.vn/documents/sol-dream-profile-2026-2027.pdf';

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]));
}

const schoolList = schools.map((school) => {
  const name = escapeHtml(school.name);
  const destination = school.profilePath || school.website;
  const external = !school.profilePath;
  return `<li><a href="${escapeHtml(destination)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${name}</a> — ${escapeHtml(school.campus)}.</li>`;
}).join('');

const courseRows = courses
  .slice()
  .sort((a, b) => ['foundation', 'topik', 'speaking'].indexOf(a.financials.tuition2026.track)
    - ['foundation', 'topik', 'speaking'].indexOf(b.financials.tuition2026.track))
  .map((course) => {
    const detail = course.financials.tuition2026;
    return `<tr><td><a href="/khoa-hoc/${escapeHtml(course.slug || course.id)}">${escapeHtml(detail.code)}</a></td><td>${detail.sessions}</td><td>${detail.estimatedWeeks}</td><td>${escapeHtml(course.price)}</td></tr>`;
  }).join('');

module.exports = [
  {
    slug: 'hanh-trinh-doi-ngu-va-phap-ly-sol-dream-education-2026',
    title: 'Hành trình, đội ngũ và pháp lý SOL DREAM EDUCATION 2026–2027',
    topic: 'hoat-dong-soldream',
    excerpt: 'Từ trải nghiệm trao đổi sinh viên năm 2012 của người sáng lập đến đội ngũ tư vấn, đào tạo và các giấy tờ pháp lý được SOL DREAM công bố trong hồ sơ 2026–2027.',
    content: `<p>Hồ sơ giới thiệu 2026–2027 kể lại điểm khởi đầu của SOL DREAM EDUCATION từ một trải nghiệm thực tế tại Hàn Quốc. Năm 2012, ông Đào Duy Thắng tham gia chương trình trao đổi sinh viên giữa Trường Đại học Kinh tế TP.HCM và Đại học Woosong. Rào cản ngôn ngữ, khác biệt văn hóa và quá trình tự tìm hướng học tập là cơ sở để ông xây dựng một đơn vị vừa đào tạo tiếng Hàn vừa đồng hành cùng hồ sơ du học.</p>
      <h2>Từ trải nghiệm du học đến SOL DREAM EDUCATION</h2>
      <p>Công ty TNHH Sol-Dream Education được đăng ký ngày 22/04/2019, mã số thuế 0315637970 theo hồ sơ công ty. Hồ sơ 2026–2027 mô tả mục tiêu giúp người học chuẩn bị năng lực ngoại ngữ, hiểu khả năng của mình và chọn lộ trình phù hợp với học lực, ngân sách và mục tiêu dài hạn.</p>
      <h2>Đội ngũ được giới thiệu trong hồ sơ</h2>
      <ul><li><strong>Tiến sĩ Đào Duy Thắng:</strong> Giám đốc SOL DREAM EDUCATION; học vị Tiến sĩ tại Đại học Woosong, chuyên ngành Quản trị học.</li>
      <li><strong>Thạc sĩ Phạm Vương Khả Trân:</strong> phụ trách khối tư vấn; Thạc sĩ Kinh doanh Quốc tế tại Đại học Woosong; hồ sơ ghi nhận chứng nhận hoàn thành xuất sắc nghiệp vụ tư vấn du học do Sở Giáo dục và Đào tạo TP.HCM tổ chức.</li>
      <li><strong>Thạc sĩ Nguyễn Huỳnh Như:</strong> phụ trách khối chuyên môn; Thạc sĩ Ngôn ngữ và Văn học Hàn Quốc tại Đại học Quốc gia Seoul.</li></ul>
      <h2>Thông tin pháp lý theo tài liệu công ty cung cấp</h2>
      <ul><li>Giấy chứng nhận hoạt động dịch vụ tư vấn du học số <strong>1865/GCN-SGDĐT</strong>, cấp ngày 09/03/2026; hồ sơ ghi thời hạn năm năm.</li>
      <li>Quyết định số <strong>4149/QĐ-SGDĐT</strong>, cấp ngày 24/08/2026, liên quan Trung tâm Ngoại ngữ Ngôi Nhà Ước Mơ.</li></ul>
      <p>Các thông tin pháp lý trên được công bố theo hồ sơ giới thiệu của SOL DREAM. Học viên có thể đối chiếu bản giấy tờ gốc khi làm việc trực tiếp với đơn vị.</p>
      <p><a href="/gioi-thieu">Xem trang giới thiệu và đội ngũ SOL DREAM →</a> · <a href="/documents/sol-dream-profile-2026-2027.pdf">Tải hồ sơ PDF 2026–2027 →</a></p>`,
    seo_title: 'Hành trình, đội ngũ và pháp lý SOL DREAM EDUCATION',
    meta_description: 'Thông tin về quá trình hình thành, ba thành viên chủ chốt và giấy tờ pháp lý theo hồ sơ SOL DREAM EDUCATION 2026–2027.',
    focus_keyword: 'SOL DREAM EDUCATION 2026 2027',
  },
  {
    slug: 'gia-tri-dao-tao-va-trai-nghiem-hoc-tap-sol-dream',
    title: 'Giá trị đào tạo và trải nghiệm học tập tại SOL DREAM',
    topic: 'hoat-dong-soldream',
    excerpt: 'Ba giá trị Học để làm chủ năng lực, Hiểu bản thân để chọn hướng đi và Kết nối để cùng tiến bộ được thể hiện qua lớp học, hoạt động và năm giai đoạn đồng hành.',
    content: `<p>Hồ sơ SOL DREAM EDUCATION 2026–2027 đặt việc học ngoại ngữ trong một hành trình dài hơn: xây năng lực tự học, chọn đường đi theo bản thân và kết nối với cộng đồng hỗ trợ. Đây là định hướng đào tạo được công ty giới thiệu, còn lịch học, hoạt động và phạm vi dịch vụ được xác nhận theo từng khóa.</p>
      <h2>Ba giá trị cốt lõi</h2>
      <ul><li><strong>Học để làm chủ năng lực:</strong> hình thành kiến thức, kỹ năng và thói quen học tập để người học tự chủ hơn.</li>
      <li><strong>Hiểu bản thân để chọn hướng đi:</strong> đối chiếu điểm mạnh, mục tiêu, năng lực ngoại ngữ và điều kiện gia đình trước khi chọn trường hoặc ngành.</li>
      <li><strong>Kết nối để cùng tiến bộ:</strong> xây môi trường học có sự phối hợp giữa học viên, gia đình và đội ngũ tư vấn, đào tạo.</li></ul>
      <h2>Trải nghiệm học tập được mô tả trong hồ sơ</h2>
      <p>Hoạt động trên lớp tập trung xây nền tảng tiếng Hàn, kỹ năng học tập, thói quen ôn luyện và chuẩn bị phỏng vấn. Hồ sơ còn giới thiệu các cuộc thi và hoạt động ngoại khóa được tổ chức định kỳ theo kế hoạch của trung tâm. Học viên có thể hỏi lịch hoạt động cụ thể tại thời điểm nhập học.</p>
      <h2>Năm giai đoạn đồng hành</h2>
      <ol><li>Tư vấn nguyện vọng, học lực, trình độ ngoại ngữ và ngân sách.</li>
      <li>Đối chiếu trường, ngành và chương trình phù hợp.</li>
      <li>Học tiếng Hàn, rèn kỹ năng và chuẩn bị hồ sơ hoặc phỏng vấn theo yêu cầu.</li>
      <li>Rà soát giấy tờ, khoản phí và kế hoạch trước xuất cảnh.</li>
      <li>Kết nối đầu mối và hỗ trợ tại Hàn Quốc trong phạm vi dịch vụ đã thống nhất.</li></ol>
      <p><a href="/khoa-hoc">Xem các khóa tiếng Hàn →</a> · <a href="/du-hoc">Xem chương trình du học →</a> · <a href="/gioi-thieu">Tìm hiểu SOL DREAM →</a></p>`,
    seo_title: 'Giá trị và trải nghiệm học tập tại SOL DREAM',
    meta_description: 'Ba giá trị đào tạo, hoạt động lớp học và năm giai đoạn đồng hành của SOL DREAM theo hồ sơ 2026–2027.',
    focus_keyword: 'trải nghiệm học tập SOL DREAM',
  },
  {
    slug: 'van-phong-va-dau-moi-ho-tro-sol-dream-viet-nam-han-quoc',
    title: 'Văn phòng và đầu mối hỗ trợ SOL DREAM tại Việt Nam, Hàn Quốc',
    topic: 'hoat-dong-soldream',
    excerpt: 'Địa chỉ TP.HCM, Đồng Nai, miền Bắc và đầu mối hợp tác tại Daejeon được công bố trong hồ sơ giới thiệu SOL DREAM 2026–2027.',
    content: `<p>Hồ sơ 2026–2027 công bố các địa chỉ và đầu mối để học viên, gia đình liên hệ theo khu vực. Vui lòng gọi trước để xác nhận giờ làm việc và người tiếp nhận khi đến trực tiếp.</p>
      <h2>Tại Việt Nam</h2>
      <ul><li><strong>Trụ sở TP.HCM:</strong> 89 đường S11, phường Tây Thạnh, TP. Hồ Chí Minh. Hotline <a href="tel:+84364648282">03 6464 8282</a>.</li>
      <li><strong>Văn phòng Đồng Nai:</strong> Tổ 20, ấp Láng Lớn, xã Xuân Mỹ, huyện Cẩm Mỹ, Đồng Nai.</li>
      <li><strong>Văn phòng miền Bắc:</strong> 98 đường Thủy Nguyên, khu đô thị Ecopark, Xuân Quan, Phụng Công, Hưng Yên. Đầu mối theo hồ sơ: bà Trần Thị Quyên, <a href="tel:+84914200687">0914 200 687</a>.</li></ul>
      <p>Website: <a href="https://www.soldream.edu.vn">soldream.edu.vn</a>. Facebook: <a href="https://www.facebook.com/soldreamedu">facebook.com/soldreamedu</a>.</p>
      <h2>Đầu mối hợp tác tại Hàn Quốc</h2>
      <p>Hồ sơ giới thiệu ông <strong>Gu Bong Mo</strong> tại <strong>COMMA Corporation</strong> là đầu mối hợp tác kinh doanh và hỗ trợ quản lý học viên ở Hàn Quốc. Địa chỉ: phòng 202, số 23 Hanbat-daero 592beon-gil, Seo-gu, Daejeon.</p>
      <p>Điện thoại: <a href="tel:+827040790719">070-4079-0719</a>; di động: <a href="tel:+821064090719">010-6409-0719</a>; email: <a href="mailto:didigi3@naver.com">didigi3@naver.com</a>. Phạm vi hỗ trợ cụ thể được ghi trong thỏa thuận dịch vụ của từng học viên.</p>
      <p><a href="/gioi-thieu">Xem giới thiệu và thông tin liên hệ →</a></p>`,
    seo_title: 'Địa chỉ và hỗ trợ SOL DREAM tại Việt Nam, Hàn Quốc',
    meta_description: 'Địa chỉ liên hệ SOL DREAM tại TP.HCM, Đồng Nai, miền Bắc và đầu mối hỗ trợ tại Daejeon theo hồ sơ 2026–2027.',
    focus_keyword: 'liên hệ SOL DREAM EDUCATION',
  },
  {
    slug: '22-truong-doi-tac-sol-dream-2026-2027',
    title: '22 trường đối tác trong hồ sơ SOL DREAM 2026–2027',
    topic: 'thong-tin-han-quoc',
    excerpt: 'Danh sách 22 trường đại học, cao đẳng trong hồ sơ SOL DREAM cùng liên kết đến hồ sơ trường hoặc website chính thức để đối chiếu cơ sở và kỳ tuyển sinh.',
    cover_image: '/img/home-school-woosong.png',
    content: `<p>Hồ sơ giới thiệu SOL DREAM EDUCATION 2026–2027 liệt kê 22 trường đại học và cao đẳng tại Hàn Quốc. Danh sách dưới đây giúp học viên tạo danh sách khảo sát ban đầu; điều kiện đầu vào, ngành mở tuyển và học phí phải đối chiếu theo đúng cơ sở, chương trình và kỳ tuyển sinh.</p>
      <h2>Danh sách trường trong hồ sơ</h2><ol>${schoolList}</ol>
      <h2>Bốn trường được giới thiệu nổi bật</h2>
      <p>Woosong, Hannam, Sogang và Hanyang là bốn tên trường được trình bày nổi bật trong hồ sơ. Với Hanyang, cần phân biệt cơ sở Seoul và ERICA vì chương trình và mức phí có thể khác nhau.</p>
      <h2>Một số mức học phí tham khảo trong phụ lục</h2>
      <ul><li>Khóa tiếng Hàn 10 tuần: Woosong 1.300.000 KRW; Sogang buổi sáng 1.860.000 KRW, buổi chiều 1.800.000 KRW; Hanyang ERICA 1.500.000 KRW. Các khoản đăng ký hoặc nhập học được nêu riêng tại hồ sơ từng trường.</li>
      <li>Học phí cử nhân Woosong năm 2026 trong phụ lục có ví dụ theo ngành bằng USD/năm; Hanyang Seoul công bố mức theo nhóm ngành bằng KRW/kỳ.</li>
      <li>Mức Hannam trong hồ sơ ghi theo <strong>chính sách 2021</strong>, vì vậy không dùng làm báo giá cho kỳ 2026–2027.</li></ul>
      <p><a href="/truong-dai-hoc">Tra cứu từng trường và liên kết chính thức →</a> · <a href="/du-hoc/hoc-phi-truong-doi-tac-han-quoc-2026">Xem bảng học phí trường chi tiết →</a></p>`,
    seo_title: '22 trường đối tác Hàn Quốc SOL DREAM 2026–2027',
    meta_description: 'Danh sách 22 trường trong hồ sơ SOL DREAM 2026–2027 và cách đối chiếu học phí, cơ sở, kỳ tuyển sinh trên nguồn trường.',
    focus_keyword: 'trường đối tác SOL DREAM 2026 2027',
  },
  {
    slug: 'bang-hoc-phi-tieng-han-sol-dream-2026',
    title: 'Bảng học phí 15 lớp tiếng Hàn SOL DREAM năm 2026',
    topic: 'thong-tin-han-quoc',
    excerpt: 'Tổng hợp 15 lớp tiếng Hàn đăng ký lẻ trong hồ sơ SOL DREAM, từ sơ cấp, trung cấp, TOPIK đến giao tiếp và phát âm, kèm số buổi và số tuần dự kiến.',
    content: `<p>Phụ lục học phí tiếng Hàn SDE 2026 liệt kê 15 lớp đăng ký lẻ. Mỗi lớp có trang chi tiết về giáo viên, sĩ số, trình độ và tài liệu học. Bảng dưới đây giúp đối chiếu học phí và thời lượng ngay tại một chỗ.</p>
      <div><table><thead><tr><th>Lớp</th><th>Số buổi</th><th>Tuần dự kiến</th><th>Học phí</th></tr></thead><tbody>${courseRows}</tbody></table></div>
      <p>Lịch chuẩn theo hồ sơ là <strong>3 buổi/tuần, 90 phút/buổi</strong>. Số tuần dự kiến chưa tính ngày nghỉ hoặc điều chỉnh lịch. Mức học phí trong bảng chưa gồm VAT; lịch khai giảng và ưu đãi được xác nhận tại thời điểm ghi danh.</p>
      <h2>Chọn nhóm học phù hợp</h2>
      <ul><li><strong>Sơ cấp và trung cấp:</strong> đi từ SC1A, SC1B đến TC4B theo kết quả kiểm tra đầu vào. Từ SC2A, hồ sơ mô tả lộ trình xen kẽ giáo viên Việt Nam và Hàn Quốc.</li>
      <li><strong>TOPIK:</strong> các lớp TOPIK I, cấp 3 và cấp 4 tập trung mục tiêu thi tương ứng.</li>
      <li><strong>Giao tiếp và phát âm:</strong> các lớp giao tiếp sơ cấp, trung cấp và luyện phát âm có sĩ số nhỏ để tăng thời gian thực hành.</li></ul>
      <p>Học phí các khóa đăng ký lẻ khác phần đào tạo đã ghi trong gói dịch vụ du học. Học viên nên kiểm tra hợp đồng và phiếu nhập học trước khi đóng thêm học phí.</p>
      <p><a href="/khoa-hoc">Xem bảng học phí và từng trang khóa học →</a> · <a href="/du-hoc/lo-trinh-hoc-tieng-han-truoc-khi-du-hoc">Xem lộ trình tiếng Hàn theo gói du học →</a></p>`,
    seo_title: 'Bảng học phí 15 lớp tiếng Hàn SOL DREAM 2026',
    meta_description: 'Học phí, số buổi và số tuần dự kiến của 15 lớp tiếng Hàn SDE 2026, gồm sơ cấp, trung cấp, TOPIK, giao tiếp và phát âm.',
    focus_keyword: 'học phí tiếng Hàn SOL DREAM 2026',
  },
].map((article) => ({ ...article, source_urls: profileUrl }));
