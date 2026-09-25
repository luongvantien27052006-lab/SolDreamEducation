'use strict';

const path = require('path');
const fs = require('fs');
const { sanitizeRichHtml } = require('../lib/contentSanitizer');

const REVIEWED_AT = '23/09/2026';
const LEGACY_PROFILE_MIGRATION_VERSION = 'official-full-profile-v3-2026-09-23';

function link(url, label) {
  return `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`;
}

function section(title, body) {
  return `<h2>${title}</h2>${body}`;
}

function sourceSection(sources) {
  return section('Nguồn chính thức và thời điểm kiểm tra', `<p>Nội dung được SOL DREAM EDUCATION rà soát ngày ${REVIEWED_AT}. Các mức phí, lịch tuyển sinh, ngành mở tuyển và điều kiện hồ sơ có thể thay đổi theo kỳ; người đọc phải mở thông báo hoặc cẩm nang tuyển sinh mới nhất trước khi nộp.</p><ul>${sources.map((source) => `<li>${link(source.url, source.label)}</li>`).join('')}</ul>`);
}

function profileContent(profile) {
  return sanitizeRichHtml([
    `<p><strong>${profile.lead}</strong></p>`,
    ...profile.sections.map(([title, body]) => section(title, body)),
    sourceSection(profile.sources),
  ].join(''));
}

const profiles = [
  {
    id: 1,
    slug: 'dai-hoc-quoc-gia-seoul',
    title: 'Đại học Quốc gia Seoul',
    subtitle: 'Seoul National University',
    excerpt: 'Đại học Quốc gia Seoul là đại học quốc gia nghiên cứu đa ngành tại Seoul. Hồ sơ này tổng hợp hệ thống khoa ngành, tuyển sinh quốc tế, học phí năm 2026, học bổng, ký túc xá, thông báo mùa xuân 2027 và đầu mối liên hệ từ website chính thức của trường.',
    seoTitle: 'Đại học Quốc gia Seoul: tuyển sinh và học phí',
    metaDescription: 'Thông tin Đại học Quốc gia Seoul: ngành học, tuyển sinh quốc tế, học phí 2026, học bổng, ký túc xá và thông báo mùa xuân 2027.',
    focusKeyword: 'Đại học Quốc gia Seoul',
    lead: 'Đại học Quốc gia Seoul (SNU) có cơ sở chính tại Gwanak, Seoul và đào tạo từ bậc cử nhân đến sau đại học. Thông tin định lượng bên dưới chỉ dùng theo tài liệu chính thức được dẫn nguồn, không suy diễn yêu cầu GPA hoặc khả năng đỗ.',
    sections: [
      ['Tổng quan và điểm nổi bật của Đại học Quốc gia Seoul là gì?', '<p>SNU là đại học quốc gia nghiên cứu đa ngành. Hệ thống đào tạo bao gồm các lĩnh vực nhân văn, xã hội, khoa học tự nhiên, kinh doanh, kỹ thuật, nông nghiệp và khoa học sự sống, mỹ thuật, giáo dục, sinh thái con người, thú y, âm nhạc, điều dưỡng, dược và y khoa. Chương trình cụ thể, ngôn ngữ giảng dạy và số lượng môn bằng tiếng Anh phải kiểm tra tại từng khoa.</p>'],
      ['Địa chỉ và thông tin liên hệ chính thức ở đâu?', '<ul><li>Cơ sở Gwanak: 1 Gwanak-ro, Gwanak-gu, Seoul 08826, Hàn Quốc.</li><li>Tuyển sinh cử nhân quốc tế: +82-2-880-6971 hoặc +82-2-880-6977; email snuadmit@snu.ac.kr.</li><li>Tuyển sinh sau đại học và GKS: snuadmit2@snu.ac.kr.</li><li>Học bổng quốc tế: +82-2-880-2519; intlscholarship@snu.ac.kr.</li><li>Visa và giấy báo nhập học: +82-2-880-4447; i-office@snu.ac.kr.</li><li>Khóa tiếng Hàn: +82-2-880-8570; klp@snu.ac.kr.</li></ul>'],
      ['SNU có những khoa, ngành và lĩnh vực đào tạo nào?', '<p>Các đơn vị bậc cử nhân được công bố gồm Liberal Studies; Nhân văn; Khoa học xã hội; Khoa học tự nhiên; Điều dưỡng; Quản trị kinh doanh; Kỹ thuật; Nông nghiệp và khoa học sự sống; Mỹ thuật; Giáo dục; Sinh thái con người; Thú y; Âm nhạc; Dược và Y khoa.</p><p>Các ngành thể hiện trong bảng học phí 2026 gồm khoa học chính trị và quan hệ quốc tế, kinh tế, xã hội học, phúc lợi xã hội, truyền thông, nhân học, tâm lý, địa lý, thống kê, vật lý và thiên văn, hóa học, sinh học, khoa học trái đất và môi trường, toán, các ngành kỹ thuật, kinh tế nông nghiệp, khoa học cây trồng, lâm nghiệp, công nghệ thực phẩm và động vật, kiến trúc cảnh quan, giáo dục ngôn ngữ, giáo dục khoa học, dinh dưỡng, thời trang, thú y và y khoa. Danh sách mở tuyển phải đối chiếu cẩm nang của đúng kỳ.</p>'],
      ['Chương trình nào dành cho sinh viên quốc tế?', '<p>SNU có tuyển sinh cử nhân và sau đại học dành cho sinh viên quốc tế, chương trình trao đổi/thăm trường và các lựa chọn học bổng trước hoặc sau khi nhập học. Trường lưu ý người học có thể không hoàn thành yêu cầu tốt nghiệp nếu chỉ chọn môn giảng dạy bằng tiếng Anh; khả năng học bằng tiếng Anh cần hỏi trực tiếp từng khoa.</p>'],
      ['Chương trình tiếng Hàn được tổ chức như thế nào?', '<p>Khóa tiếng Hàn do Language Education Institute phụ trách. Lịch học, cấp độ, học phí và kỳ nhập học không được suy ra từ hồ sơ tuyển sinh hệ bằng; người học cần kiểm tra trực tiếp website của viện hoặc liên hệ +82-2-880-8570, klp@snu.ac.kr.</p>'],
      ['Điều kiện và hồ sơ tuyển sinh quốc tế cần lưu ý gì?', '<p>SNU xét hồ sơ theo diện tuyển sinh quốc tế được mô tả trong cẩm nang từng kỳ. Trường không nhận chuyển tiếp theo tuyến tuyển sinh quốc tế nêu trong FAQ; người muốn học phải nộp theo diện tân sinh viên. Hồ sơ, chứng minh quốc tịch và quan hệ gia đình, học lực, ngoại ngữ, bài luận, thư giới thiệu, bản dịch/chứng thực và tài liệu riêng của từng ngành phải theo đúng checklist của kỳ tuyển sinh. Không có một mức GPA hoặc TOPIK chung có thể áp dụng cho mọi khoa.</p>'],
      ['Học phí Đại học Quốc gia Seoul năm 2026 là bao nhiêu?', '<p>Bảng dưới là học phí một học kỳ trong cẩm nang cử nhân quốc tế mùa thu 2026 và có thể thay đổi.</p><table><thead><tr><th>Nhóm khoa/ngành</th><th>Học phí mỗi kỳ</th></tr></thead><tbody><tr><td>Nhân văn; một số ngành xã hội; Quản trị kinh doanh</td><td>2.442.000 KRW</td></tr><tr><td>Toán và một số chương trình giáo dục</td><td>2.450.000 KRW</td></tr><tr><td>Nhân học, Tâm lý, Địa lý</td><td>2.679.000 KRW</td></tr><tr><td>Liberal Studies; phần lớn khoa học tự nhiên; Điều dưỡng; phần lớn nông nghiệp; một số ngành giáo dục và sinh thái con người</td><td>2.975.000 KRW</td></tr><tr><td>Kỹ thuật</td><td>2.998.000 KRW</td></tr><tr><td>Tiền thú y hoặc tiền y khoa</td><td>3.072.000 KRW</td></tr><tr><td>Mỹ thuật</td><td>3.653.000 KRW</td></tr><tr><td>Âm nhạc</td><td>3.916.000 KRW</td></tr><tr><td>Thú y</td><td>4.645.000 KRW</td></tr><tr><td>Y khoa</td><td>5.038.000 KRW</td></tr></tbody></table>'],
      ['Học bổng nào được công bố cho ứng viên quốc tế?', '<p>Trang học bổng trước nhập học giới thiệu GKS cho ứng viên cử nhân quốc tế: miễn học phí 8 học kỳ, trợ cấp tháng 1.200.000 KRW, vé máy bay khứ hồi hạng phổ thông và một năm đào tạo tiếng Hàn. Người học chương trình GKS phải đáp ứng hướng dẫn của NIIED; trang SNU lưu ý yêu cầu đạt TOPIK 3 sau năm tiếng Hàn để vào chương trình bằng. Các học bổng khác có tiêu chí và thời điểm riêng, không tự động áp dụng cho mọi người trúng tuyển.</p>'],
      ['Ký túc xá và đời sống sinh viên có gì cần biết?', '<p>Sinh viên trúng tuyển phải đăng ký ký túc xá riêng trong thời gian tuyển chọn; việc trúng tuyển không đồng nghĩa chắc chắn có phòng. Gwanak Residence Halls phục vụ cơ sở Gwanak, ngoài ra trường có khu ở tại các cơ sở khác. Loại phòng, giá, thời gian mở đơn và quy tắc hoàn tiền phải kiểm tra trên website ký túc xá của đúng học kỳ.</p>'],
      ['Các thông báo tuyển sinh mới nhất cần theo dõi là gì?', '<table><thead><tr><th>Ngày</th><th>Thông báo</th><th>Điểm cần nhớ</th></tr></thead><tbody><tr><td>06/07/2026</td><td>Đã mở đơn tuyển sinh cử nhân quốc tế mùa xuân 2027</td><td>Nộp đơn 06–09/07/2026; thư giới thiệu trực tuyến đến 10/07/2026; kết quả sơ bộ dự kiến 16/10/2026.</td></tr><tr><td>29/05/2026</td><td>Cẩm nang cử nhân quốc tế mùa xuân 2027</td><td>Thông báo kèm cẩm nang, bài luận/kế hoạch học tập, thư giới thiệu, biểu mẫu xuất nhập cảnh và bản giải trình.</td></tr></tbody></table>'],
      ['Tài liệu đính kèm chính thức tải ở đâu?', `<ul><li>${link('https://en.snu.ac.kr/admission/overview/notice?bbsidx=170606&md=v', 'Thông báo và bộ tệp tuyển sinh cử nhân quốc tế mùa xuân 2027')}</li><li>${link('https://en.snu.ac.kr/webdata/uploads/eng/file/2026/01/Admissions_for_Undergraduate_Fall_2026.pdf', 'Cẩm nang cử nhân quốc tế mùa thu 2026, có bảng học phí 2026')}</li></ul>`],
    ],
    sources: [
      { label: 'Trang tuyển sinh SNU', url: 'https://en.snu.ac.kr/admission' },
      { label: 'Danh sách thông báo tuyển sinh', url: 'https://en.snu.ac.kr/admission/overview/notice' },
      { label: 'Khoa và trường thành viên', url: 'https://en.snu.ac.kr/index.html' },
      { label: 'Học bổng trước nhập học', url: 'https://en.snu.ac.kr/admission/undergraduate/scholarships/before_admission' },
      { label: 'Thông tin nhà ở sinh viên', url: 'https://en.snu.ac.kr/academics/students/housing' },
    ],
  },
  {
    id: 2,
    slug: 'dai-hoc-yonsei',
    title: 'Đại học Yonsei',
    subtitle: 'Yonsei University',
    excerpt: 'Đại học Yonsei là đại học tư thục đa ngành tại Seoul, có các tuyến tuyển sinh quốc tế, Underwood International College và Global Leaders College. Hồ sơ tổng hợp ngành học, học phí 2026, học bổng, ký túc xá và lịch nộp hồ sơ mùa xuân 2027 từ nguồn chính thức.',
    seoTitle: 'Đại học Yonsei: ngành học, học phí và tuyển sinh',
    metaDescription: 'Hồ sơ Đại học Yonsei bằng tiếng Việt: ngành đào tạo, học phí 2026, học bổng, ký túc xá, yêu cầu tiếng Hàn và tuyển sinh 2027.',
    focusKeyword: 'Đại học Yonsei',
    lead: 'Yonsei University có cơ sở Sinchon tại Seoul và cơ sở quốc tế tại Songdo. Hồ sơ này tách rõ dữ liệu học phí năm 2026, yêu cầu ngôn ngữ sau trúng tuyển và thông báo tuyển sinh mới; các con số không được dùng thay cho invoice hoặc cẩm nang của kỳ nộp hồ sơ.',
    sections: [
      ['Tổng quan và điểm nổi bật của Đại học Yonsei là gì?', '<p>Yonsei là đại học tư thục nghiên cứu đa ngành, đào tạo các chương trình bằng tiếng Hàn và tiếng Anh. Sinh viên quốc tế có thể tìm hiểu tuyến tuyển sinh quốc tế thông thường, Global Leaders College hoặc Underwood International College tùy chương trình và ngôn ngữ học.</p>'],
      ['Địa chỉ và đầu mối tuyển sinh quốc tế ở đâu?', '<ul><li>Office of Admissions: 50 Yonsei-ro, Seodaemun-gu, Seoul 03722, Hàn Quốc.</li><li>Điện thoại tuyển sinh: +82-2-2123-4131; fax +82-2-2123-8614.</li><li>Email: ysadms@yonsei.ac.kr.</li><li>Visa và giấy báo nhập học: +82-2-2123-6492.</li><li>Korean Language Institute: +82-2-2123-3464.</li><li>Ký túc xá cơ sở quốc tế Songdo: +82-32-749-2991 hoặc +82-32-749-2992.</li></ul>'],
      ['Yonsei có những khoa và ngành đào tạo nào?', '<p>Các khối đào tạo chính gồm Nhân văn; Thương mại và Kinh tế; Kinh doanh; Khoa học; Kỹ thuật; Khoa học sự sống và Công nghệ sinh học; Điện toán; Thần học; Khoa học xã hội; Âm nhạc; Sinh thái con người; Khoa học giáo dục; Dược; Điều dưỡng; Y; Nha khoa; Underwood International College và Global Leaders College.</p><p>Trang Degree Programs liệt kê chi tiết từng ngành và liên hệ khoa, trong đó có ngôn ngữ và văn học, lịch sử, triết học, tâm lý, kinh tế, kinh doanh, toán, vật lý, hóa học, khoa học trái đất, kỹ thuật hóa–sinh, điện–điện tử, kiến trúc, đô thị, môi trường, cơ khí, vật liệu, công nghiệp, máy tính, AI, chính trị, hành chính, phúc lợi xã hội, xã hội học, truyền thông, âm nhạc, dinh dưỡng, thiết kế và giáo dục.</p>'],
      ['Chương trình dành cho sinh viên quốc tế gồm những lựa chọn nào?', '<p>Underwood International College là chương trình cử nhân khai phóng giảng dạy bằng tiếng Anh. Global Leaders College và tuyến cử nhân quốc tế thông thường có yêu cầu và đơn vị tuyển riêng. Tân sinh viên quốc tế của nhiều khoa học năm đầu tại Global Basic Education Division thuộc GLC; các nhóm Y, Nha, Điều dưỡng, Dược và UIC có ngoại lệ theo bảng học phí chính thức.</p>'],
      ['Chương trình tiếng Hàn và yêu cầu ngôn ngữ được áp dụng ra sao?', '<p>Korean Language Institute tổ chức các khóa tiếng riêng. Theo hướng dẫn áp dụng với sinh viên nhập học năm 2026, sinh viên tuyến quốc tế/GLC phải đạt TOPIK 3 hoặc chuẩn thay thế do Yonsei chấp nhận trước khi vào chuyên ngành và TOPIK 4 trước khi tốt nghiệp; ngành thể thao có ngoại lệ ở bước vào chuyên ngành. Quy định có thể thay đổi theo năm nhập học.</p>'],
      ['Điều kiện và hồ sơ tuyển sinh cần kiểm tra ở đâu?', '<p>Ứng viên phải đọc cẩm nang của đúng tuyến và kỳ tuyển sinh để xác định quốc tịch, học lực, hồ sơ gia đình, bằng và bảng điểm, năng lực ngôn ngữ, bài luận, hồ sơ tài chính và cách chứng thực. Hồ sơ tiếng Việt hoặc ngôn ngữ khác phải xử lý theo quy tắc dịch/chứng thực trong cẩm nang. Yonsei công bố biểu mẫu và checklist tại mục Application Guide và Integrated Data.</p>'],
      ['Học phí cử nhân quốc tế Yonsei năm 2026 là bao nhiêu?', '<p>Mức dưới đây tính bằng KRW mỗi học kỳ. Học kỳ đầu thường cao hơn các kỳ sau và trường có thể điều chỉnh.</p><table><thead><tr><th>Khối đào tạo</th><th>Học kỳ đầu</th><th>Các kỳ sau</th></tr></thead><tbody><tr><td>Nhân văn, Thần học, Khoa học xã hội</td><td>4.770.000</td><td>4.556.000</td></tr><tr><td>Thương mại/Kinh tế và Kinh doanh</td><td>4.804.000</td><td>4.590.000</td></tr><tr><td>Khoa học; Giáo dục thể chất; Sinh thái con người</td><td>5.511.000</td><td>5.297.000</td></tr><tr><td>Kỹ thuật và School of Computing</td><td>6.218.000</td><td>6.004.000</td></tr><tr><td>Khoa học sự sống và Công nghệ sinh học</td><td>5.864.000</td><td>5.650.000</td></tr><tr><td>Âm nhạc</td><td>6.941.000</td><td>6.727.000</td></tr><tr><td>Underwood International College</td><td>8.416.000</td><td>8.202.000</td></tr><tr><td>Dược</td><td>7.181.000</td><td>6.967.000</td></tr><tr><td>Global Leaders College</td><td>7.388.000</td><td>7.174.000</td></tr><tr><td>Integrated Technology</td><td>9.221.000</td><td>9.007.000</td></tr><tr><td>Tiền Y/Tiền Nha</td><td>8.010.000</td><td>7.796.000</td></tr></tbody></table>'],
      ['Yonsei có những nhóm học bổng nào?', '<p>Yonsei giới thiệu học bổng dựa trên thành tích, nhu cầu, hoạt động/work-study và các chương trình riêng của UIC, GLC, GSIS, cao học, KLI, chương trình hè/đông. Sinh viên quốc tế cũng có thể tìm hiểu GKS. Mức hỗ trợ không giống nhau giữa chương trình và không mặc nhiên cấp cho mọi ứng viên; quyết định và điều kiện duy trì phải lấy từ đơn vị quản lý học bổng.</p>'],
      ['Ký túc xá dành cho sinh viên quốc tế như thế nào?', '<p>International House tại Sinchon có sức chứa khoảng 232 người, chủ yếu phòng đôi và ưu tiên sinh viên quốc tế. Người học hệ bằng thường phải đăng ký tối thiểu 6 tín chỉ; học viên KLI cần đăng ký khóa chính quy 10 tuần. Việc xếp phòng theo đợt và nguyên tắc ưu tiên/đến trước, không phải quyền tự động khi trúng tuyển.</p>'],
      ['Thông báo tuyển sinh mới nhất của Yonsei là gì?', '<table><thead><tr><th>Ngày đăng</th><th>Thông báo</th><th>Mốc chính</th></tr></thead><tbody><tr><td>27/08/2026</td><td>Nộp đơn trực tuyến và hồ sơ gốc mùa xuân 2027</td><td>Đơn trực tuyến từ 10:00 ngày 01/09 đến 17:00 ngày 17/09/2026; hồ sơ gốc phải đến trường trước 17:00 ngày 30/09/2026.</td></tr><tr><td>29/05/2026</td><td>Cẩm nang và biểu mẫu mùa xuân 2027</td><td>Có cẩm nang tiếng Anh, bài luận cá nhân và biểu mẫu lịch sử học tập.</td></tr><tr><td>19/06/2026</td><td>Kết quả tuyển sinh mùa thu 2026</td><td>Ứng viên xem kết quả tại cổng tuyển sinh chính thức.</td></tr></tbody></table>'],
      ['Tài liệu chính thức nào nên tải về?', `<ul><li>${link('https://admission.yonsei.ac.kr/seoul/admission/html/counsel/dataView.asp?BBS_NO=3503&s_code=BBS_SUBJECT&s_data=2027&s_page=1&s_type=', 'Bộ cẩm nang và biểu mẫu mùa xuân 2027')}</li><li>${link('https://www.yonsei.ac.kr/sites/en_sc/down/2026_fee1.pdf', 'Bảng học phí cử nhân quốc tế năm 2026')}</li><li>${link('https://admission.yonsei.ac.kr/seoul/upload/guide/20260108170315L8NX2Z.PDF', 'Hướng dẫn tuyển sinh quốc tế năm 2026')}</li></ul>`],
    ],
    sources: [
      { label: 'Cổng tuyển sinh quốc tế Yonsei', url: 'https://admission.yonsei.ac.kr/seoul/admission/html/international/guide.asp' },
      { label: 'Thông báo tuyển sinh quốc tế', url: 'https://admission.yonsei.ac.kr/seoul/admission/html/international/notice.asp' },
      { label: 'Danh sách ngành cử nhân', url: 'https://yonsei.ac.kr/en_sc/1849/subview.do' },
      { label: 'Học bổng', url: 'https://www.yonsei.ac.kr/en_sc/2245/subview.do' },
      { label: 'International House', url: 'https://www.yonsei.ac.kr/en_sc/2263/subview.do' },
    ],
  },
  {
    id: 3,
    slug: 'dai-hoc-korea',
    title: 'Đại học Korea',
    subtitle: 'Korea University',
    excerpt: 'Đại học Korea là đại học tư thục nghiên cứu tại Seoul với hệ thống ngành rộng và tuyến tuyển sinh cử nhân quốc tế riêng. Hồ sơ trình bày lịch mùa xuân 2027, điều kiện đánh giá, khoa ngành, học phí–học bổng cần kiểm tra, hỗ trợ sinh viên và nguồn tải cẩm nang chính thức.',
    seoTitle: 'Đại học Korea: tuyển sinh quốc tế và ngành học',
    metaDescription: 'Thông tin Đại học Korea: khoa ngành, hồ sơ cử nhân quốc tế, lịch mùa xuân 2027, học phí, học bổng, hỗ trợ sinh viên và liên hệ chính thức.',
    focusKeyword: 'Đại học Korea',
    lead: 'Korea University (KU) có cơ sở chính tại Anam, Seoul. Hồ sơ dưới đây ưu tiên cổng Office of International Education dành cho tuyển sinh cử nhân quốc tế; mọi lịch và biểu mẫu phải được đối chiếu theo đúng kỳ.',
    sections: [
      ['Tổng quan Đại học Korea có gì đáng chú ý?', '<p>KU là đại học tư thục nghiên cứu đa ngành. Tuyến International Undergraduate Admission có trang riêng cho cẩm nang, lịch, học phí, học bổng, ngành tuyển, hỗ trợ sinh viên và thông báo. Từ mùa xuân 2027, trường thông báo bỏ bài kiểm tra tiếng Hàn trực tuyến nội bộ từng dùng cho một số ứng viên, vì vậy ứng viên phải nộp chứng chỉ ngôn ngữ chính thức đáp ứng yêu cầu của trường.</p>'],
      ['Địa chỉ và đầu mối tuyển sinh quốc tế là gì?', '<ul><li>International Education Team, phòng 301 Dongwon Global Leadership Hall, 145 Anam-ro, Seongbuk-gu, Seoul 02841, Hàn Quốc.</li><li>Điện thoại: +82-2-3290-1157 hoặc +82-2-3290-5156~5157.</li><li>Fax: +82-2-922-5820.</li><li>Email: admission@korea.ac.kr.</li><li>Giờ làm việc công bố: 09:00–17:30 ngày thường, nghỉ trưa 12:00–13:00 theo giờ Hàn Quốc.</li></ul>'],
      ['Korea University có những trường và khoa nào?', '<p>Các đơn vị cử nhân được công bố gồm Korea University Business School; Nhân văn; Khoa học sự sống và Công nghệ sinh học; Chính trị và Kinh tế; Khoa học; Kỹ thuật; Y; Giáo dục; Điều dưỡng; Tin học; Nghệ thuật và Thiết kế; Quốc tế học; Truyền thông; Khoa học sức khỏe; Liên ngành; Smart Security; Tâm lý; Smart Mobility và University College.</p><p>Danh sách chi tiết có các ngành ngôn ngữ–văn học, lịch sử, triết học, xã hội học, khoa học chính trị, kinh tế, kinh doanh, khoa học tự nhiên, kỹ thuật, giáo dục, dữ liệu–máy tính, truyền thông và quốc tế học. Ngành được phép chọn có thể thay đổi theo diện tân sinh viên/chuyển tiếp và kỳ tuyển.</p>'],
      ['Chương trình dành cho sinh viên quốc tế được tổ chức ra sao?', '<p>Ứng viên có thể nộp tuyến cử nhân quốc tế I hoặc các lựa chọn được nêu trong cẩm nang kỳ tuyển; một số chương trình có yêu cầu tiếng Anh hoặc điều kiện riêng. University College có lộ trình năm đầu giúp sinh viên quốc tế xây nền tảng học thuật trước khi chọn ngành vào năm hai, nhưng phạm vi ngành phân bổ phải xem tại trang của chương trình.</p>'],
      ['Học tiếng Hàn và yêu cầu ngôn ngữ cần lưu ý gì?', '<p>Yêu cầu ngôn ngữ là một phần của đánh giá hồ sơ và thay đổi theo chương trình. Cẩm nang mùa thu 2026 chấp nhận các chứng chỉ ngoại ngữ và chuẩn hóa được liệt kê; thông báo cho năm 2027 nêu rõ KU online Korean Level Test không còn được dùng từ tuyển sinh mùa xuân 2027. Không nên hiểu rằng mọi ngành dùng cùng một mức TOPIK hoặc IELTS.</p>'],
      ['Điều kiện, cách đánh giá và hồ sơ gồm những gì?', '<p>KU đánh giá tổng thể năng lực học thuật, mức phù hợp với lĩnh vực dự định học, năng lực ngôn ngữ học thuật và hoạt động ngoại khóa. Không đặt chỉ tiêu cố định cho từng ngành trong hướng dẫn mùa thu 2026, nhưng một số ngành có thể tổ chức phỏng vấn hoặc kiểm tra kỹ năng. Hồ sơ bắt buộc/không bắt buộc, chứng minh quốc tịch, bằng–bảng điểm, tài liệu ngôn ngữ, portfolio và quy tắc dịch/chứng thực phải theo checklist. Hồ sơ tùy chọn tối đa 10 mục theo hướng dẫn 2026.</p>'],
      ['Học phí Đại học Korea được xác nhận như thế nào?', '<p>Học phí phụ thuộc trường/khoa và năm học. Cổng tuyển sinh có mục Tuition riêng; cẩm nang mùa thu 2026 yêu cầu người trúng tuyển thanh toán đủ trong thời gian đăng ký và cảnh báo hủy kết quả nếu không hoàn tất. Vì nguồn được đọc không cung cấp một bảng số tiền hiện hành đầy đủ cho mọi ngành, hồ sơ này không gán mức học phí ước đoán. Ứng viên phải dùng invoice và bảng Tuition trên cổng OIA tại thời điểm nhập học.</p>'],
      ['KU có những học bổng nào cho sinh viên quốc tế?', '<p>Cổng OIA tách hai nhóm KU Scholarships và GKS. Điều kiện xét, tỷ lệ miễn học phí và yêu cầu duy trì khác nhau theo chương trình hoặc học kỳ. Học bổng không mặc nhiên đi kèm thư trúng tuyển; ứng viên cần đọc trang Scholarship Guide trong cẩm nang hiện hành và thông báo riêng của đơn vị đào tạo.</p>'],
      ['Ký túc xá và hỗ trợ sinh viên được tìm ở đâu?', '<p>Trang Student Support của OIA là đầu mối cho hướng dẫn sinh viên quốc tế. Khu ở, thời gian đăng ký, giá và tiền đặt cọc thay đổi theo cơ sở, tòa nhà và học kỳ nên không dùng số cũ để lập ngân sách. Người trúng tuyển cần theo hướng dẫn sau nhập học và chủ động dự trù bảo hiểm, ăn ở, giáo trình, đi lại và chi phí cá nhân.</p>'],
      ['Thông báo và lịch tuyển sinh mới nhất là gì?', '<table><thead><tr><th>Nội dung</th><th>Mốc thời gian</th></tr></thead><tbody><tr><td>Đơn trực tuyến mùa xuân 2027</td><td>03/08/2026 10:00 – 31/08/2026 17:00</td></tr><tr><td>Nộp tài liệu</td><td>03/08/2026 10:00 – 07/09/2026 17:00</td></tr><tr><td>Công bố kết quả</td><td>27/11/2026 17:00</td></tr><tr><td>Đăng ký và đóng học phí</td><td>Tháng 01/2027, thời gian cụ thể sẽ thông báo</td></tr><tr><td>Mùa thu 2027</td><td>Lịch dự kiến công bố trong tháng 03/2027</td></tr></tbody></table><p>Ngày 29/06/2026, trường cũng đăng hướng dẫn đăng ký cho sinh viên quốc tế trúng tuyển mùa thu 2026.</p>'],
      ['Tài liệu đính kèm và biểu mẫu tải ở đâu?', `<ul><li>${link('https://oia.korea.ac.kr/oia2026/Admission-Guide.do', 'Trang cẩm nang hiện hành, biểu mẫu tân sinh viên và chuyển tiếp')}</li><li>${link('https://oia.korea.ac.kr/_res/oia/etc/Application_Guide_for_Fall_2026_Freshman%28ENG%29.pdf', 'Cẩm nang tân sinh viên quốc tế mùa thu 2026')}</li><li>${link('https://oia.korea.ac.kr/_res/oia/etc/List_Document_Spring_2026_Submission.pdf', 'Checklist hồ sơ cử nhân quốc tế')}</li></ul>`],
    ],
    sources: [
      { label: 'Cổng tuyển sinh cử nhân quốc tế KU', url: 'https://oia.korea.ac.kr/oia2026/Admission-Guide.do' },
      { label: 'Bảng thông báo tuyển sinh', url: 'https://oia.korea.ac.kr/oia2026/board.do?article.offset=0&articleLimit=10&mode=list' },
      { label: 'Danh sách khoa và ngành', url: 'https://www.korea.edu/en/1037/subview.do' },
      { label: 'Hỗ trợ sinh viên quốc tế', url: 'https://oia.korea.ac.kr/oia2026/Student-Support.do' },
    ],
  },
  {
    id: 4,
    slug: 'dai-hoc-woosong',
    title: 'Đại học Woosong',
    subtitle: 'Woosong University',
    excerpt: 'Đại học Woosong tại Daejeon đào tạo các chương trình tiếng Anh và tiếng Hàn, nổi bật với SolBridge, Endicott, AI, phần mềm, ẩm thực–khách sạn và đường sắt. Hồ sơ cập nhật học phí 2026, quy trình tuyển sinh, học bổng, ký túc xá và thông báo từ website chính thức.',
    seoTitle: 'Đại học Woosong: ngành học và học phí 2026',
    metaDescription: 'Thông tin Đại học Woosong: ngành tiếng Anh/tiếng Hàn, học phí 2026, hồ sơ quốc tế, học bổng, ký túc xá và liên hệ tuyển sinh.',
    focusKeyword: 'Đại học Woosong',
    lead: 'Woosong University nằm tại Daejeon và có mạng lưới chương trình quốc tế rõ ràng. Học phí dưới đây được trường công bố bằng USD cho năm học 2026; tỷ giá và chi phí thực tế phải xác nhận trên invoice.',
    sections: [
      ['Tổng quan và thế mạnh của Đại học Woosong là gì?', '<p>Woosong đào tạo theo hướng nghề nghiệp, có SolBridge International School of Business được AACSB công nhận, Endicott College of International Studies, JW Kim College of Future Studies cùng các trường về phần mềm, ẩm thực, y tế–phúc lợi và đường sắt. Trường có cả chương trình tiếng Anh và tiếng Hàn.</p>'],
      ['Địa chỉ và liên hệ tuyển sinh ở đâu?', '<ul><li>171 Dongdaejeon-ro, Dong-gu, Daejeon 34606, Hàn Quốc.</li><li>Office of International Admissions, phòng 320, W7 Woosong Gwan.</li><li>Điện thoại tuyển sinh: +82-42-630-4763.</li><li>Fax quốc tế: +82-42-629-6609.</li></ul>'],
      ['Woosong có những trường, ngành và chương trình nào?', '<p>Các đơn vị chính gồm SolBridge International School of Business; Endicott College of International Studies; JW Kim College of Future Studies; College of Software Convergence; College of Culinary Arts; College of Health and Welfare; College of Railroad và Graduate School.</p><p>Các chương trình công bố cho sinh viên quốc tế gồm AI and Big Data, Business Administration, Global Hospitality, AI Management, Media and Communication Arts, Global Culinary Arts, Global Restaurant Management, Artificial Intelligence, Data Science, K-Beauty Design, Global Railroad, Early Childhood Education, IDegree và Global Interdisciplinary Studies. Hệ liên kết 2 năm có Baking and Pastry, Culinary Arts, K-Beauty Makeup, K-Pop Music and Dance.</p>'],
      ['Chương trình quốc tế và ngôn ngữ giảng dạy được phân chia thế nào?', '<p>Ứng viên cần chọn đúng English Track hoặc Korean Track trên trang Programs. SolBridge, Endicott và một số chương trình tương lai/công nghệ có nhiều môn bằng tiếng Anh; các ngành khác có thể yêu cầu tiếng Hàn. Ngôn ngữ thực tế của từng môn và chuẩn tốt nghiệp phải kiểm tra trong guidebook.</p>'],
      ['Học tiếng Hàn tại Woosong ở đâu?', '<p>Korean Language Institute là đơn vị phụ trách chương trình tiếng Hàn. Học phí, kỳ khai giảng, yêu cầu D-4 và tài liệu tài chính của khóa tiếng không nên suy ra từ bảng học phí cử nhân; cần dùng thông báo riêng của viện.</p>'],
      ['Quy trình và hồ sơ tuyển sinh quốc tế gồm những bước nào?', '<ol><li>Nộp đơn trực tuyến, tài liệu và phí hồ sơ 50 USD.</li><li>Phỏng vấn sau khi trường kiểm tra tài liệu.</li><li>Nhận thư trúng tuyển và hóa đơn nếu đạt.</li><li>Thanh toán; gửi bản cứng được yêu cầu; nhận tài liệu xin visa.</li><li>Nộp visa D-2 tại cơ quan đại diện Hàn Quốc và phối hợp Student Services để nhập cảnh.</li></ol><p>Hồ sơ thường gồm hộ chiếu, giấy tờ của cha mẹ và quan hệ gia đình, bằng–bảng điểm, chứng chỉ ngôn ngữ, chứng minh tài chính và bản chứng thực/apostille theo diện. Số tiền và thời hạn thư ngân hàng phải theo guidebook mới nhất, không lấy một mức chung cho mọi nhóm.</p>'],
      ['Học phí Woosong năm 2026 là bao nhiêu?', '<table><thead><tr><th>Chương trình cử nhân</th><th>Học phí năm 2026</th></tr></thead><tbody><tr><td>AI and Big Data; Media and Communication Arts; Global Railroad</td><td>7.794 USD/năm</td></tr><tr><td>Business Administration tại SolBridge</td><td>12.592 USD/năm</td></tr><tr><td>Global Hospitality; AI Management</td><td>6.792 USD/năm</td></tr><tr><td>Global Culinary Arts; Global Restaurant Management</td><td>8.442 USD/năm</td></tr><tr><td>Artificial Intelligence; Data Science</td><td>10.494 USD/năm</td></tr><tr><td>K-Beauty Design</td><td>7.998 USD/năm</td></tr><tr><td>Early Childhood Education</td><td>6.792 USD/năm</td></tr><tr><td>IDegree, bốn kỳ online đầu</td><td>3.840 USD/năm</td></tr><tr><td>Global Interdisciplinary Studies</td><td>6.400 USD/năm</td></tr></tbody></table><p>Trường ước tính chi phí bổ sung năm đầu khoảng 3.417 USD, gồm phí hồ sơ 50 USD, phí nhập học, phòng và một bữa/ngày, bảo hiểm, hội sinh viên và chuyển tiền. Phòng–ăn công bố 2.352 USD/năm; phí có thể tăng tối đa 5% theo năm.</p>'],
      ['Học bổng Woosong áp dụng như thế nào?', '<p>Woosong công bố học bổng tuyển sinh và học bổng thành tích dựa trên kết quả học tập/điều kiện chương trình. Học bổng học phí không bao gồm ký túc xá, suất ăn, sách, bảo hiểm, phí hoạt động và chi phí sinh hoạt. Học bổng toàn phần từng học kỳ yêu cầu đã học kỳ trước, tối thiểu 15 tín chỉ, không có điểm F và đáp ứng chuẩn GPA; người học phải xem bảng tiêu chí chi tiết trước từng kỳ.</p>'],
      ['Ký túc xá và ăn ở tại Woosong ra sao?', '<p>Hai khu ở chính cho sinh viên quốc tế là International Dormitory ở West Campus và Sol-Geo ở East Campus. Cả hai gần cửa hàng, nhà hàng, tàu điện ngầm và tuyến xe buýt. Chi phí Room & Board ước tính trên trang học phí là 2.352 USD/năm với một bữa mỗi ngày; kỳ hè/đông tính riêng khoảng 340 USD mỗi kỳ. Mức này có thể thay đổi.</p>'],
      ['Thông báo mới nào sinh viên quốc tế nên biết?', '<table><thead><tr><th>Ngày</th><th>Thông báo</th></tr></thead><tbody><tr><td>12/06/2026</td><td>Lịch nhập điểm, công bố và điều chỉnh điểm học kỳ xuân 2026.</td></tr><tr><td>05/06/2026</td><td>Khảo sát hài lòng và phản hồi học kỳ xuân 2026.</td></tr><tr><td>28/05/2026</td><td>Cập nhật tiêu chí tốt nghiệp và thời gian nộp hồ sơ.</td></tr><tr><td>08/05/2026</td><td>Global Talent Fair 2026, có tệp poster, lịch và đơn đăng ký.</td></tr><tr><td>12/03/2026</td><td>Gia hạn tuyển Global Woosong Scholarship Student 2026.</td></tr></tbody></table>'],
      ['Tài liệu và trang tải chính thức ở đâu?', `<ul><li>${link('https://english.wsu.ac.kr/page/index.jsp?code=eng0301', 'Trang điều kiện tuyển sinh và guidebook mùa thu 2026')}</li><li>${link('https://english.wsu.ac.kr/page/index.jsp?code=eng0302', 'Bảng học phí và chi phí năm 2026')}</li><li>${link('https://english.wsu.ac.kr/board/index.jsp?code=eng0701a', 'Bảng thông báo sinh viên quốc tế')}</li></ul>`],
    ],
    sources: [
      { label: 'Điều kiện tuyển sinh quốc tế', url: 'https://english.wsu.ac.kr/page/index.jsp?code=eng0301' },
      { label: 'Học phí và chi phí', url: 'https://english.wsu.ac.kr/page/index.jsp?code=eng0302' },
      { label: 'Các trường và khoa', url: 'https://english.wsu.ac.kr/page/index.jsp?code=eng0203' },
      { label: 'Học bổng', url: 'https://english.wsu.ac.kr/page/index.jsp?code=eng040403a' },
      { label: 'Ký túc xá và ăn uống', url: 'https://english.wsu.ac.kr/page/index.jsp?code=eng0501' },
      { label: 'Thông báo', url: 'https://english.wsu.ac.kr/board/index.jsp?code=eng0701a' },
    ],
  },
  {
    id: 5,
    slug: 'dai-hoc-hansung',
    title: 'Đại học Hansung',
    subtitle: 'Hansung University',
    excerpt: 'Đại học Hansung nằm tại quận Seongbuk, Seoul và có School of Global Talent dành cho sinh viên quốc tế. Hồ sơ tổng hợp ngành tuyển, điều kiện, học phí tham khảo 2025, học bổng TOPIK, ký túc xá, quy trình nộp hồ sơ và liên hệ từ các trang chính thức.',
    seoTitle: 'Đại học Hansung: học phí, học bổng và ngành học',
    metaDescription: 'Thông tin Đại học Hansung: ngành dành cho sinh viên quốc tế, hồ sơ, học phí, học bổng TOPIK, ký túc xá và liên hệ chính thức.',
    focusKeyword: 'Đại học Hansung',
    lead: 'Hansung University có cơ sở tại Seoul và School of Global Talent với các ngành định hướng sinh viên quốc tế. Bảng học phí được nguồn tuyển sinh ghi theo năm 2025 nên chỉ là mốc tham khảo; số tiền mới phải kiểm tra trong thông báo hiện hành.',
    sections: [
      ['Tổng quan và điểm nổi bật của Đại học Hansung là gì?', '<p>Hansung là đại học tư thục tại Seoul. Khối Global Talent đào tạo ngôn ngữ–văn hóa Hàn, kinh doanh K toàn cầu, nội dung hình ảnh–giải trí, thời trang–làm đẹp, phần mềm hội tụ và khởi nghiệp toàn cầu. Trường cũng có các khối nhân văn–nghệ thuật, khoa học xã hội, thiết kế, IT–kỹ thuật và các chương trình sau đại học.</p>'],
      ['Địa chỉ và thông tin liên hệ dành cho sinh viên quốc tế là gì?', '<ul><li>116 Samseongyo-ro 16-gil, Seongbuk-gu, Seoul 02876, Hàn Quốc.</li><li>School of Global Talent/International admission: Woochon Hall, phòng 302–303.</li><li>Điện thoại tuyển sinh quốc tế: +82-2-760-5598; fax +82-2-760-4299.</li><li>International Programs: +82-2-760-4205.</li><li>Giờ làm việc công bố: thứ Hai–thứ Sáu 09:00–17:30, nghỉ trưa 12:00–13:00.</li></ul>'],
      ['Hansung có những khoa và ngành nào?', '<p>School of Global Talent gồm Korean Language & Culture Education, Global K-Business, Media & Entertainment, Fashion Beauty Creation, SW Convergence và Global Venture Entrepreneurship. Trang tuyển sinh còn liệt kê các nhóm ngành nhân văn sáng tạo; thương mại, kinh tế, quản trị, hành chính, pháp luật, bất động sản; thời trang, truyền thông, UX/UI, nội thất; máy tính, dữ liệu lớn, nội dung số/VR, web; điện tử, bán dẫn, robot AI, kỹ thuật công nghiệp; AI ứng dụng, an ninh hội tụ và mobility.</p><p>Ngành thực sự mở cho tân sinh viên quốc tế và ngôn ngữ giảng dạy phải theo guidebook của kỳ. Global K-Business có English Track được đánh dấu trên trang đơn vị tuyển.</p>'],
      ['Chương trình dành cho sinh viên quốc tế gồm những gì?', '<p>School of Global Talent là tuyến rõ nhất cho sinh viên quốc tế. Ngoài học chuyên ngành, trường có mentoring giữa sinh viên quốc tế và sinh viên Hàn Quốc, tham quan doanh nghiệp, chương trình khám phá nghề nghiệp và kết nối mạng lưới. International Admission & Student Services phụ trách tuyển sinh, visa, hỗ trợ học vụ, thích nghi đời sống và ký túc xá.</p>'],
      ['Khóa tiếng Hàn và yêu cầu ngôn ngữ được áp dụng thế nào?', '<p>Language Education Center vận hành chương trình tiếng Hàn. Trang Apply nêu một số đường đáp ứng năng lực, gồm hoàn thành khóa tiếng Hansung từ cấp 3 hoặc hoàn thành cấp 4 tại cơ sở ngôn ngữ của đại học được chứng nhận; điều kiện chính xác phụ thuộc kỳ và diện. Một số hướng dẫn sau đại học yêu cầu TOPIK 3 khi nộp và TOPIK 4 trước tốt nghiệp, nhưng không được áp dụng máy móc cho mọi chương trình cử nhân.</p>'],
      ['Điều kiện và quy trình tuyển sinh quốc tế là gì?', '<p>Đối với tuyến cử nhân quốc tế, ứng viên và cả cha mẹ phải có quốc tịch nước ngoài theo điều kiện được công bố; ứng viên phải tốt nghiệp hoặc dự kiến tốt nghiệp THPT hợp lệ. Trường tuyển hai lần mỗi năm, thường nhận hồ sơ vào tháng 5 và tháng 11. Quy trình gồm đơn trực tuyến, nộp tài liệu, xét hồ sơ, phỏng vấn khi cần, công bố kết quả và đăng ký. Phí hồ sơ công bố là 100.000 KRW. Checklist, bản dịch, xác nhận lãnh sự/apostille và chứng minh tài chính phải theo guidebook kỳ tuyển.</p>'],
      ['Học phí Hansung hiện được công bố như thế nào?', '<p>Bảng dưới dựa trên hướng dẫn năm 2025 và có thể thay đổi sau quyết định học phí. Không dùng làm hóa đơn năm 2026–2027.</p><table><thead><tr><th>Khối ngành</th><th>Học phí</th><th>Phí hội sinh viên</th><th>Tổng tham khảo</th></tr></thead><tbody><tr><td>Nhân văn/Khoa học xã hội</td><td>3.985.000 KRW</td><td>12.000 KRW</td><td>3.997.000 KRW</td></tr><tr><td>Nghệ thuật/Thiết kế</td><td>5.311.000 KRW</td><td>12.000 KRW</td><td>5.323.000 KRW</td></tr><tr><td>Kỹ thuật</td><td>5.195.000 KRW</td><td>12.000 KRW</td><td>5.207.000 KRW</td></tr><tr><td>Chuyên ngành tự chủ</td><td>4.328.000 KRW</td><td>12.000 KRW</td><td>4.340.000 KRW</td></tr></tbody></table>'],
      ['Học bổng TOPIK của Hansung ra sao?', '<table><thead><tr><th>Điều kiện tân sinh viên</th><th>Hỗ trợ học phí kỳ đầu</th></tr></thead><tbody><tr><td>TOPIK 6</td><td>100%</td></tr><tr><td>TOPIK 5</td><td>80%</td></tr><tr><td>TOPIK 4</td><td>50%</td></tr><tr><td>TOPIK 3</td><td>30%</td></tr><tr><td>Hoàn thành từ một năm/bốn kỳ khóa tiếng Hansung theo trang học bổng</td><td>50%</td></tr></tbody></table><p>Sinh viên đang học được xét theo GPA kỳ trước và TOPIK, với tỷ lệ từ 10% đến 100%. Điều kiện chung gồm hoàn thành ít nhất 15 tín chỉ, không vượt số kỳ chuẩn và nộp TOPIK còn hiệu lực đúng hạn.</p>'],
      ['Ký túc xá Hansung có loại phòng và mức phí nào?', '<p>Global Village I có phòng đôi, ba và bốn người; Global Village II có phòng đôi/ba hoặc bốn người tùy thông báo. Tiện ích gồm giường, bàn ghế, tủ lạnh, lò vi sóng, máy giặt, tủ đồ, Wi-Fi và khu chung. Giá công bố cho 91 ngày: phòng đôi Global Village I 864.500 KRW, phòng ba 819.000 KRW, phòng bốn 773.500 KRW; Global Village II khoảng 819.000 KRW. Sangsang Village là ký túc xá trong trường, phòng đôi, giá theo ngày được công bố 8.490 KRW nhưng tổng kỳ phải xác nhận.</p>'],
      ['Thông báo tuyển sinh nào cần theo dõi?', '<p>Trang Apply công bố tuyển cử nhân quốc tế hai lần một năm và lưu guidebook theo từng kỳ. Hướng dẫn mùa xuân 2026 nhắc rằng thay đổi được đăng trên website, trường không nhất thiết thông báo riêng từng ứng viên. Vì vậy người nộp phải theo dõi trang Admission Guide đến khi hoàn tất đăng ký, visa và nhập học.</p>'],
      ['Tài liệu và biểu mẫu chính thức lấy ở đâu?', `<ul><li>${link('https://www.hansung.ac.kr/global_en/885/subview.do', 'Trang Apply, điều kiện và danh sách guidebook')}</li><li>${link('https://www.hansung.ac.kr/bbs/global/1727/8358/download.do', 'Phần học bổng, ký túc xá và học phí trong hướng dẫn tuyển sinh')}</li><li>${link('https://www.hansung.ac.kr/global_en/886/subview.do', 'Bảng học bổng sinh viên quốc tế')}</li><li>${link('https://www.hansung.ac.kr/global_en/887/subview.do', 'Thông tin và phí ký túc xá')}</li></ul>`],
    ],
    sources: [
      { label: 'Trang Apply dành cho sinh viên quốc tế', url: 'https://www.hansung.ac.kr/global_en/885/subview.do' },
      { label: 'Ngành thuộc School of Global Talent', url: 'https://www.hansung.ac.kr/hansung/6208/subview.do' },
      { label: 'Học bổng sinh viên quốc tế', url: 'https://www.hansung.ac.kr/global_en/886/subview.do' },
      { label: 'Ký túc xá', url: 'https://www.hansung.ac.kr/global_en/887/subview.do' },
      { label: 'Bộ phận quốc tế và hỗ trợ sinh viên', url: 'https://hansung.ac.kr/international/4479/subview.do' },
    ],
  },
  {
    id: 7,
    slug: 'du-hoc-dai-hoc-quoc-gia-pusan-2026-dieu-kien-tuyen-sinh-hoc-phi-va-visa-d-4-1-chi-tiet',
    title: 'Đại học Quốc gia Pusan',
    subtitle: 'Pusan National University',
    excerpt: 'Đại học Quốc gia Pusan là đại học quốc gia nghiên cứu tại Busan, có 16 khối đào tạo và 100 ngành. Hồ sơ tổng hợp ngành học, tuyển sinh quốc tế xuân 2027, học phí tham khảo, học bổng, ký túc xá, khóa tiếng Hàn và tài liệu mới từ website chính thức.',
    seoTitle: 'Đại học Quốc gia Pusan: tuyển sinh và học phí',
    metaDescription: 'Thông tin Đại học Quốc gia Pusan: ngành học, tuyển sinh quốc tế 2027, học phí, học bổng, ký túc xá, khóa tiếng Hàn và liên hệ chính thức.',
    focusKeyword: 'Đại học Quốc gia Pusan',
    lead: 'Đại học Quốc gia Pusan (PNU) được thành lập năm 1946 và là đại học quốc gia nghiên cứu đa ngành tại khu vực Busan. Hồ sơ này thay thế bài cũ thiên về một trường hợp visa riêng lẻ; mọi điều kiện và con số bên dưới đều có mốc thời gian, nguồn chính thức và cảnh báo phải kiểm tra lại theo kỳ.',
    sections: [
      ['Tổng quan và điểm nổi bật của Đại học Quốc gia Pusan là gì?', '<p>PNU được thành lập tháng 5/1946 với triết lý Chân lý, Tự do và Phụng sự. Website chính thức công bố trường có 16 khối đào tạo bậc cử nhân với 100 khoa/ngành, cùng hệ sau đại học và các cơ sở tại Busan, Yangsan, Miryang và Ami. Trường đào tạo đa ngành từ nhân văn, khoa học xã hội đến kỹ thuật, y–dược, nghệ thuật và công nghệ hội tụ.</p>'],
      ['Địa chỉ và đầu mối liên hệ chính thức ở đâu?', '<ul><li>Cơ sở Busan: 2 Busandaehak-ro 63beon-gil, Geumjeong-gu, Busan 46241, Hàn Quốc.</li><li>PNU International: 92 Geumgang-ro 279beon-gil, Geumjeong-gu, Busan 46287, Hàn Quốc.</li><li>Email chung của trường: pnuadmin@pusan.ac.kr.</li><li>Email tuyển sinh cử nhân quốc tế: iadmission@pusan.ac.kr.</li><li>Khóa tiếng Hàn: interedu@pusan.ac.kr; điện thoại theo trang chương trình là +82-51-510-1982 hoặc +82-51-510-1984.</li><li>Visa sinh viên quốc tế: visa@pusan.ac.kr; điện thoại +82-51-510-3353.</li></ul>'],
      ['PNU có những khoa và ngành đào tạo nào?', '<p>Danh mục cử nhân chính thức gồm Nhân văn; Khoa học xã hội; Khoa học tự nhiên; Kỹ thuật; Giáo dục; Dược; Y; Nghệ thuật; Khoa học và công nghệ nano; Tài nguyên và khoa học sự sống; Điều dưỡng; Kinh doanh; Kinh tế và thương mại quốc tế; Sinh thái con người; Kỹ thuật thông tin và y sinh; University College.</p><p>Các ngành tiêu biểu gồm ngôn ngữ, lịch sử, triết học, hành chính, chính trị–ngoại giao, phúc lợi xã hội, truyền thông, toán, vật lý, hóa học, sinh học, cơ khí, đóng tàu, hàng không, vật liệu, hóa–sinh–môi trường, sư phạm, y, dược, âm nhạc, mỹ thuật, thiết kế, nano, thực phẩm, nông nghiệp, điều dưỡng, kinh doanh, kinh tế, thương mại, du lịch, máy tính và kỹ thuật y sinh. Ngành thực tế nhận sinh viên quốc tế phải đối chiếu phụ lục tuyển sinh của đúng kỳ.</p>'],
      ['Các chương trình dành cho sinh viên quốc tế gồm những gì?', '<p>PNU tiếp nhận tân sinh viên và sinh viên chuyển tiếp quốc tế theo cẩm nang riêng; đồng thời có chương trình trao đổi, visiting, PNU Summer School, buddy và hỗ trợ học tập. Global Open Major Division xuất hiện trong các thông báo tuyển bổ sung, nhưng chỉ tiêu và phạm vi tuyển thay đổi theo kỳ. Sinh viên phải kiểm tra ngôn ngữ giảng dạy và yêu cầu tốt nghiệp tại khoa, không suy ra rằng toàn bộ chương trình đều học bằng tiếng Anh.</p>'],
      ['Khóa tiếng Hàn của PNU được tổ chức như thế nào?', '<p>PNU Language Education Institute tổ chức chương trình tiếng Hàn sáu cấp độ, rèn nghe, nói, đọc và viết. Bảng công bố năm 2025 có bốn kỳ, mỗi kỳ khoảng 10 tuần, học 4 giờ mỗi ngày từ thứ Hai đến thứ Sáu; học phí niêm yết là 1.400.000 KRW, bao gồm một số khoản như kiểm tra đầu vào, nhập học, giáo trình và hoạt động văn hóa. Đây là mốc cũ để tham khảo, người đăng ký phải hỏi viện về lịch và phí hiện hành.</p><p>Sinh viên hệ bằng còn có lớp hỗ trợ tiếng Hàn, lớp luyện TOPIK và chương trình gia sư một–một với sinh viên Hàn Quốc theo từng đợt.</p>'],
      ['Điều kiện và hồ sơ tuyển sinh quốc tế cần lưu ý gì?', '<p>Cẩm nang của từng kỳ quy định riêng về quốc tịch của ứng viên và cha mẹ, học lực, bằng–bảng điểm, quan hệ gia đình, năng lực ngôn ngữ, chứng minh tài chính, bản dịch và apostille/xác nhận lãnh sự. Ngành chọn khi nộp không được đổi trong quá trình xét tuyển. Trường có thể xét hồ sơ và phỏng vấn tùy khoa; mọi thông báo, kể cả kết quả, được đăng trên cổng tuyển sinh và không nhất thiết gửi riêng.</p><p>Không sử dụng một mức GPA, TOPIK hoặc số dư ngân hàng duy nhất cho mọi hồ sơ. Phụ lục ngành của cẩm nang mới nhất là căn cứ xác định chuẩn ngôn ngữ và loại tài liệu phải nộp.</p>'],
      ['Học phí Đại học Quốc gia Pusan là bao nhiêu?', '<p>Bảng dưới là mức một học kỳ được công bố trong phụ lục học phí chính thức dùng làm mốc tham khảo; invoice của kỳ trúng tuyển mới là số tiền phải thanh toán.</p><table><thead><tr><th>Nhóm đào tạo</th><th>Tổng học phí tham khảo mỗi kỳ</th></tr></thead><tbody><tr><td>Kinh tế và thương mại quốc tế, Kinh doanh, một số ngành Sinh thái con người</td><td>2.069.000 KRW</td></tr><tr><td>University College – Global Open Major Division</td><td>2.500.000 KRW</td></tr><tr><td>Khoa học tự nhiên, một số ngành Tài nguyên và khoa học sự sống</td><td>2.705.000 KRW</td></tr><tr><td>Kỹ thuật, Điều dưỡng, Nano, Kỹ thuật thông tin và y sinh</td><td>2.932.000 KRW</td></tr></tbody></table><p>Các ngành khác có mức riêng. Học phí có thể thay đổi theo năm, cơ sở và chương trình; không cộng phí visa, bảo hiểm, ký túc xá, ăn ở hoặc tài liệu vào các số trên.</p>'],
      ['Học bổng cho sinh viên quốc tế được công bố ra sao?', '<p>Cẩm nang 2026 giới thiệu Excellent International Students Scholarship theo kết quả tuyển sinh: hạng Platinum miễn toàn bộ học phí trong thời gian chuẩn nếu mỗi kỳ đạt GPA trên 3,5; Gold miễn bốn học kỳ và Silver miễn hai học kỳ nếu mỗi kỳ đạt GPA trên 3,0. Nhóm này còn nêu hỗ trợ sinh hoạt một lần 2.000.000 KRW trong kỳ đầu.</p><table><thead><tr><th>TOPIK khi nhập học</th><th>Hỗ trợ học phí được công bố</th></tr></thead><tbody><tr><td>Cấp 4</td><td>Tuition I</td></tr><tr><td>Cấp 5</td><td>Tuition II</td></tr><tr><td>Cấp 6</td><td>Tuition I và II</td></tr></tbody></table><p>Sinh viên đang học có thể được xét theo thành tích và TOPIK; học bổng tăng cấp TOPIK khoảng 400.000 KRW mỗi lần, tối đa ba lần theo cẩm nang. Học bổng có thể thay đổi và không được mặc định cộng dồn.</p>'],
      ['Ký túc xá và đời sống sinh viên có gì cần biết?', '<p>Trang trường công bố hệ thống ký túc xá tại Busan, Yangsan và Miryang, tổng sức chứa 4.436 sinh viên, tương đương khoảng 16% người học. Cấu hình cơ bản thường là phòng đôi; một số tòa BTL có điều hòa, sưởi, nhà vệ sinh và phòng tắm trong phòng. Khu ở có kiểm soát ra vào bằng thẻ sinh viên cùng phòng ăn, phòng đọc, máy tính và giặt là.</p><p>Đăng ký phòng, mức phí, gói ăn và lịch nhận phòng được công bố theo từng học kỳ; trúng tuyển không đồng nghĩa tự động có chỗ. Hướng dẫn visiting tham khảo mức khoảng 1.452.340–1.727.040 KRW/kỳ 16 tuần cho phòng đôi có nhà vệ sinh riêng, nhưng sinh viên hệ bằng phải xem thông báo ký túc xá hiện hành.</p>'],
      ['Các thông báo mới nhất nào cần theo dõi?', '<table><thead><tr><th>Ngày đăng</th><th>Thông báo</th><th>Điểm cần nhớ</th></tr></thead><tbody><tr><td>18/09/2026</td><td>Cẩm nang GKS bậc cử nhân năm 2027</td><td>Ứng viên phải đọc tuyến nộp và bộ hồ sơ trong thông báo riêng.</td></tr><tr><td>07/09/2026</td><td>Cẩm nang cử nhân quốc tế mùa xuân 2027</td><td>Có bản tiếng Anh và mẫu đơn; cổng nộp trực tuyến mở lúc 09:00 ngày 12/10/2026.</td></tr><tr><td>31/08/2026</td><td>Tài liệu định hướng và cẩm nang sinh viên quốc tế mùa thu 2026</td><td>Tệp tiếng Anh bao gồm visa, ký túc xá, bảo hiểm, học vụ, học bổng và đời sống.</td></tr><tr><td>17/09/2026</td><td>Cảnh báo phòng tránh đổi ngoại tệ trái phép</td><td>Sinh viên quốc tế được nhắc sử dụng kênh hợp pháp và phòng tránh thiệt hại.</td></tr></tbody></table>'],
      ['Tài liệu đính kèm chính thức tải ở đâu?', `<ul><li>${link('https://international.pusan.ac.kr/bbs/international/2089/1459481/artclView.do', 'Cẩm nang và mẫu đơn tuyển sinh cử nhân quốc tế mùa xuân 2027')}</li><li>${link('https://international.pusan.ac.kr/bbs/international/2081/1458325/artclView.do', 'Cẩm nang sinh viên quốc tế và tài liệu định hướng mùa thu 2026')}</li><li>${link('https://international.pusan.ac.kr/bbs/international/2089/1446519/download.do', 'Cẩm nang tuyển sinh cử nhân quốc tế mùa xuân 2026')}</li><li>${link('https://www.pusan.ac.kr/eng/CMS/OrganizationMgr/Undergraduate.do?mCode=MN019', 'Danh mục đầy đủ 16 khối và 100 ngành cử nhân')}</li></ul>`],
    ],
    sources: [
      { label: 'Cẩm nang tuyển sinh và thông báo PNU International', url: 'https://international.pusan.ac.kr/bbs/international/2089/artclList.do' },
      { label: 'Thông báo dành cho sinh viên quốc tế', url: 'https://international.pusan.ac.kr/bbs/international/2081/artclList.do' },
      { label: 'Danh mục khoa và ngành cử nhân', url: 'https://www.pusan.ac.kr/eng/CMS/OrganizationMgr/Undergraduate.do?mCode=MN019' },
      { label: 'Khóa tiếng Hàn', url: 'https://international.pusan.ac.kr/international/15206/subview.do' },
      { label: 'Ký túc xá PNU', url: 'https://www.pusan.ac.kr/eng/CMS/Contents/Contents.do?mCode=MN060' },
      { label: 'Chương trình hỗ trợ sinh viên quốc tế', url: 'https://international.pusan.ac.kr/international/15221/subview.do' },
    ],
  },
];

async function run() {
  // The CLI owns the backup/update sequence. Prevent db/index.js from applying
  // its automatic fresh-install migration before this script has made a backup.
  process.env.SKIP_LEGACY_SCHOOL_AUTO_MIGRATION = '1';
  const db = require('../db');
  const { finalizePublishedContent } = require('../lib/publicationPipeline');
  const { syncWebsiteKnowledge } = require('../lib/websiteKnowledge');
  const backupDir = path.join(__dirname, '..', 'db', 'backups');
  fs.mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `data-before-legacy-school-upgrade-${stamp}.sqlite`);
  await db.backup(backupPath);

  const update = db.prepare(`UPDATE programs SET
    title=?,subtitle=?,excerpt=?,content=?,category='Thông tin trường',author_name=?,author_role=?,author_url=?,
    source_urls=?,seo_title=?,meta_description=?,focus_keyword=?,published=1,noindex=0,updated_at=datetime('now','localtime')
    WHERE id=? AND slug=? AND category='Thông tin trường'`);

  const updated = db.transaction(() => {
    const changed = profiles.map((profile) => {
    const current = db.prepare("SELECT id,slug,cover_image FROM programs WHERE id=? AND category='Thông tin trường'").get(profile.id);
    if (!current) throw new Error(`Không tìm thấy hồ sơ trường ID ${profile.id}`);
    const content = profileContent(profile);
    const sources = profile.sources.map((source) => source.url).join('\n');
    update.run(profile.title, profile.subtitle, profile.excerpt, content,
      'Ban biên tập SOL DREAM EDUCATION', 'Biên tập và đối chiếu nguồn chính thức', '/gioi-thieu',
      sources, profile.seoTitle, profile.metaDescription, profile.focusKeyword, profile.id, profile.slug);
      return { id: profile.id, slug: current.slug, title: profile.title, contentCharacters: content.length, sources: profile.sources.length };
    });
    db.prepare(`INSERT INTO system_meta (key,value,updated_at) VALUES (?,?,datetime('now','localtime'))
      ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at`)
      .run('legacy_school_profiles_version', LEGACY_PROFILE_MIGRATION_VERSION);
    return changed;
  })();

  for (const profile of profiles) finalizePublishedContent('program', profile.id, { sync: false, notify: false });
  const index = syncWebsiteKnowledge({ force: true });
  console.log(JSON.stringify({ backupPath, updated, index }, null, 2));
}

module.exports = { profiles, profileContent, REVIEWED_AT, LEGACY_PROFILE_MIGRATION_VERSION };

if (require.main === module) {
  run().then(() => require('../db').close()).catch((error) => {
    console.error(error);
    try { require('../db').close(); } catch (_) { /* noop */ }
    process.exitCode = 1;
  });
}
