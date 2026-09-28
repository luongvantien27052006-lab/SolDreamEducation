'use strict';

const fs = require('fs');
const path = require('path');
const APP_ROOT = process.env.REPAIR_APP_ROOT || path.join(__dirname, '..');
const { sanitizeRichHtml } = require(path.join(APP_ROOT, 'lib', 'contentSanitizer'));
const { profiles: legacyProfiles } = require(path.join(APP_ROOT, 'scripts', 'upgrade-legacy-school-profiles'));
const REPAIR_VERSION = 'remaining-school-profiles-deep-v1-2026-09-29';
const AUTHOR_NAME = 'Ban biên tập SOL DREAM EDUCATION';
const AUTHOR_ROLE = 'Biên tập và đối chiếu nguồn chính thức';
const AUTHOR_URL = '/gioi-thieu';

const targets = [
  {
    slug: 'dai-hoc-quoc-gia-seoul',
    sources: [
      'https://en.snu.ac.kr/admission/overview/notice?bbsidx=170606&md=v',
      'https://en.snu.ac.kr/admission/undergraduate/application',
      'https://en.snu.ac.kr/admission/undergraduate/scholarships/before_admission',
    ],
    decision: 'Ứng viên cần bắt đầu từ khoa hoặc ngành muốn học, sau đó mới kiểm tra tuyến tuyển sinh quốc tế của SNU. Hệ thống ngành trải từ nhân văn, xã hội, kinh doanh và giáo dục đến khoa học tự nhiên, kỹ thuật, nông nghiệp, nghệ thuật, âm nhạc, điều dưỡng, dược, thú y và y khoa; tuy nhiên danh sách được phép đăng ký, ngôn ngữ của môn học và yêu cầu bổ sung không giống nhau giữa các khoa. Vì SNU lưu ý rằng chỉ học bằng tiếng Anh có thể không đủ để hoàn thành chương trình, việc chọn ngành phải đi cùng kế hoạch tiếng Hàn thực tế chứ không chỉ dựa vào tên chương trình bằng tiếng Anh.',
    documents: 'Bộ hồ sơ nên được chia thành bốn nhóm: giấy tờ nhân thân và quan hệ gia đình; bằng, bảng điểm và tài liệu học thuật; chứng chỉ ngôn ngữ; bài luận, kế hoạch học tập và thư giới thiệu. Với kỳ mùa xuân 2027, đơn trực tuyến mở trong tháng 7/2026 và thư giới thiệu có hạn riêng ngay sau hạn nộp đơn, nên người giới thiệu phải được mời trước. Ứng viên cần lập bảng kiểm theo đúng cẩm nang của kỳ, đánh dấu tài liệu nộp trực tuyến và bản giấy, quy tắc dịch, công chứng hoặc Apostille, thay vì dùng danh sách hồ sơ của một trường khác.',
    language: 'Không có một mức TOPIK hoặc IELTS duy nhất đại diện cho toàn bộ Đại học Quốc gia Seoul. Năng lực ngôn ngữ được đọc cùng ngành dự tuyển, tài liệu học thuật và khả năng theo học. Nếu chương trình có nhiều môn tiếng Hàn, chứng chỉ chỉ là điều kiện hồ sơ; người học vẫn phải đủ năng lực đọc tài liệu chuyên ngành và tham gia thảo luận. Khóa tiếng Hàn do Language Education Institute quản lý tách biệt với tuyển sinh hệ bằng, vì vậy học khóa tiếng không đồng nghĩa được chuyển thẳng lên cử nhân hoặc được miễn điều kiện của khoa.',
    budget: 'Ngân sách phải tính theo nhóm ngành chứ không dùng một mức trung bình. Bảng 2026 cho thấy học phí mỗi học kỳ dao động từ khoảng 2.442.000 KRW ở một số ngành nhân văn, xã hội và kinh doanh đến 5.038.000 KRW ở y khoa; kỹ thuật, mỹ thuật, âm nhạc, thú y và các khối khoa học có mức riêng. Ngoài học phí, cần lập khoản dự phòng cho nhà ở, bảo hiểm, giáo trình, ăn uống, đi lại, chứng thực hồ sơ và vé máy bay. Ký túc xá phải đăng ký riêng, nên kế hoạch tài chính cần có phương án thuê nhà nếu không được xếp phòng.',
    scholarship: 'GKS trước nhập học là một lựa chọn được SNU giới thiệu, gồm học phí, sinh hoạt phí, vé máy bay và đào tạo tiếng theo quy định của NIIED; đây là quy trình cạnh tranh riêng chứ không phải quyền lợi tự động của mọi người trúng tuyển SNU. Khi so sánh học bổng, ứng viên cần ghi rõ cơ quan xét, số học kỳ hỗ trợ, khoản được miễn, điều kiện TOPIK và yêu cầu duy trì. Không nên lấy giá trị học bổng để bù ngay vào ngân sách trước khi có quyết định chính thức, đặc biệt khi tiền ký túc xá và chi phí ban đầu có thể phải thanh toán trước.',
    timeline: 'Lộ trình hợp lý là chốt ngành và người giới thiệu trước kỳ mở đơn; hoàn tất dịch thuật, chứng thực và chứng chỉ ngôn ngữ trước tháng nộp; kiểm tra cổng tuyển sinh hằng ngày trong thời gian đơn mở; sau đó theo dõi kết quả sơ bộ, yêu cầu bổ sung, học phí, ký túc xá và hồ sơ visa. Với kỳ mùa xuân 2027, các mốc 06–09/07/2026 cho đơn trực tuyến và đến 10/07/2026 cho thư giới thiệu cho thấy hồ sơ không thể chuẩn bị sau khi cổng đã mở. Mọi ngày về sau phải lấy từ thông báo của đúng kỳ, không tự kéo mốc 2027 sang kỳ khác.',
  },
  {
    slug: 'dai-hoc-yonsei',
    sources: [
      'https://admission.yonsei.ac.kr/seoul/admission/html/international/noticeView.asp?BBS_NO=3520&s_code=BBS_SUBJECT&s_data=&s_page=1',
      'https://admission.yonsei.ac.kr/seoul/admission/html/counsel/dataView.asp?BBS_NO=3503&s_data=20',
      'https://www.yonsei.ac.kr/sites/en_sc/down/2026_fee1.pdf',
    ],
    decision: 'Yonsei có nhiều tuyến dễ bị nhầm lẫn: tuyển sinh quốc tế thông thường, Underwood International College và Global Leaders College không phải ba tên gọi của cùng một chương trình. UIC thiên về chương trình khai phóng bằng tiếng Anh; GLC và các khoa thuộc tuyến quốc tế có cấu trúc, ngôn ngữ và cách phân ngành riêng. Ứng viên phải chọn tuyến trước khi viết bài luận vì câu hỏi, đơn vị xét và học phí khác nhau. Thông báo mùa xuân 2027 cho phép nộp đồng thời một số tuyến, nhưng mỗi hồ sơ vẫn phải đúng cẩm nang và biểu mẫu tương ứng.',
    documents: 'Hồ sơ Yonsei cần được tổ chức theo checklist của tuyến đã chọn, gồm thông tin quốc tịch, giấy tờ gia đình, quá trình học tập, bằng và bảng điểm, chứng chỉ ngôn ngữ, bài luận cá nhân cùng các tài liệu bổ trợ được phép. Bản gốc có hạn đến trường khác với hạn đơn trực tuyến: kỳ mùa xuân 2027 nhận đơn từ 01–17/09/2026, còn hồ sơ gốc phải đến trước 30/09/2026. Vì trường tính theo thời điểm nhận chứ không chỉ dấu bưu điện, ứng viên ở Việt Nam cần dự trù vận chuyển và theo dõi mã bưu kiện.',
    language: 'Ngôn ngữ phải được xem như lộ trình sau nhập học. Quy định áp dụng với nhiều sinh viên quốc tế nhập học năm 2026 nêu chuẩn TOPIK hoặc phương án thay thế trước khi vào chuyên ngành và chuẩn cao hơn trước khi tốt nghiệp; ngành thể thao và một số chương trình có ngoại lệ. UIC có môi trường tiếng Anh nhưng việc sinh hoạt, học phần tự chọn và thực tập tại Hàn Quốc vẫn khiến tiếng Hàn có giá trị. Khóa của Korean Language Institute là chương trình riêng, không thay thế mặc nhiên cho mọi chứng chỉ nếu cẩm nang tuyển sinh không ghi nhận.',
    budget: 'Bảng học phí 2026 cho thấy chênh lệch lớn giữa các khối: khoảng 4,77 triệu KRW ở một số ngành nhân văn, thần học và xã hội; hơn 6,2 triệu KRW ở kỹ thuật và máy tính; hơn 8,4 triệu KRW ở UIC; Integrated Technology cao hơn nữa. Học kỳ đầu thường có mức khác các kỳ sau. Khi lập ngân sách, cần dùng đúng dòng của khoa, cộng nhà ở Sinchon, bảo hiểm, ăn uống, giáo trình và tiền đặt cọc. International House có giới hạn chỗ, vì vậy ngân sách cần thêm phương án thuê ngoài gần tuyến tàu điện.',
    scholarship: 'Trang học bổng của Yonsei chia theo thành tích, nhu cầu, hoạt động, chương trình và đơn vị đào tạo; UIC, GLC, GSIS, KLI hoặc chương trình mùa hè có thể có cơ chế riêng. Một tên học bổng xuất hiện trên website không có nghĩa mọi ứng viên quốc tế đều được xét tự động. Cách an toàn là lập bảng gồm học bổng thuộc tuyến nào, có cần đơn riêng không, hỗ trợ học phí hay sinh hoạt phí, thời gian nhận và điều kiện duy trì. Ngân sách cơ sở nên được tính theo trường hợp chưa có học bổng, sau đó mới khấu trừ khi có văn bản xác nhận.',
    timeline: 'Trước tháng mở đơn, ứng viên nên chốt tuyến, tải cẩm nang 2027 và biểu mẫu bài luận, đặt lịch thi ngôn ngữ, hoàn tất chứng thực học bạ và chuẩn bị bản gốc. Trong giai đoạn 01–17/09/2026 cần nộp đúng cổng; từ đó đến 30/09 cần theo dõi việc chuyển phát hồ sơ. Sau kết quả là các bước thanh toán, xác nhận nhập học, đăng ký nhà ở và visa. Nếu nộp cả tuyến quốc tế và GLC theo thông báo cho phép, phải dùng hai checklist riêng để tránh gửi nhầm tài liệu hoặc cho rằng một lệ phí bao phủ cả hai.',
  },
  {
    slug: 'dai-hoc-korea',
    sources: [
      'https://oia.korea.ac.kr/oia2026/Admission-Guide.do',
      'https://oia.korea.ac.kr/_res/oia/etc/Application_Guide_for_Fall_2026_Freshman%28ENG%29.pdf',
      'https://oia.korea.ac.kr/oia/under/support.do',
    ],
    decision: 'Korea University đánh giá tổng thể chứ không công bố một điểm chuẩn GPA chung cho mọi ngành. Vì vậy, việc chọn ngành cần dựa vào nền tảng môn học, hoạt động liên quan và năng lực ngôn ngữ có thể chứng minh, không chỉ danh tiếng của khoa. University College có lộ trình năm đầu khác các đơn vị tuyển thẳng vào ngành; các ngành kinh doanh, quốc tế học, truyền thông, máy tính, kỹ thuật, khoa học và nhân văn cũng có cách thể hiện mức phù hợp khác nhau. Ứng viên nên giải thích mạch liên kết giữa quá trình học trước đây và ngành chọn trong bài tự giới thiệu.',
    documents: 'Bộ hồ sơ được đánh giá trên năng lực học thuật, độ phù hợp với lĩnh vực, ngôn ngữ và hoạt động. Ngoài giấy tờ bắt buộc về quốc tịch, gia đình, bằng và bảng điểm, hướng dẫn 2026 cho phép một số tài liệu tùy chọn nhưng giới hạn số mục; nộp nhiều không đồng nghĩa hồ sơ mạnh hơn. Mỗi tài liệu bổ trợ cần có chức năng rõ: chứng minh giải thưởng, dự án, nghiên cứu, hoạt động hoặc năng lực chuyên môn. Portfolio và phỏng vấn chỉ áp dụng khi ngành hoặc thông báo yêu cầu, nên phải đối chiếu đúng đơn vị tuyển.',
    language: 'Từ mùa xuân 2027, KU thông báo bỏ bài kiểm tra tiếng Hàn trực tuyến nội bộ từng được sử dụng trong quy trình, làm cho chứng chỉ ngôn ngữ chính thức và hồ sơ thay thế được chấp nhận trở nên quan trọng hơn. Ứng viên không nên dựa vào quy định cũ rằng có thể thi bài của trường sau khi nộp. Chuẩn tiếng Hàn hoặc tiếng Anh phụ thuộc chương trình; ngoài điều kiện dự tuyển, người học cần đánh giá khả năng theo học môn chuyên ngành, làm bài viết học thuật và tham gia thảo luận bằng ngôn ngữ thực tế của lớp.',
    budget: 'KU công bố học phí theo khoa và kỳ, đồng thời yêu cầu người trúng tuyển thanh toán đủ trong thời gian đăng ký. Do một bảng số duy nhất không áp dụng cho toàn trường, ngân sách phải lấy từ mục Tuition hoặc invoice của đúng kỳ thay vì bài tổng hợp. Cần cộng phí hồ sơ, chứng thực, bảo hiểm, nhà ở, ăn uống, giáo trình, giao thông tại Seoul và dự phòng chênh lệch tỷ giá. Ký túc xá cũng có đợt đăng ký riêng; nếu không có phòng, chi phí thuê ngoài tại khu Anam có thể thay đổi đáng kể kế hoạch.',
    scholarship: 'KU tách học bổng của trường và GKS. Mỗi loại có tiêu chí thành tích, phạm vi miễn giảm và yêu cầu duy trì riêng, không mặc nhiên đi kèm thư trúng tuyển. Ứng viên nên ghi rõ học bổng được xét cùng hồ sơ hay cần đơn riêng, kết quả có trước hạn đóng học phí hay không, và khoản nào vẫn phải tự chi trả. Nếu quyết định chọn ngành phụ thuộc học bổng, cần chuẩn bị kịch bản tài chính không nhận hỗ trợ để tránh bỏ lỡ hạn đăng ký khi kết quả học bổng đến sau.',
    timeline: 'Kỳ mùa xuân 2027 mở đơn từ 03–31/08/2026, nhận tài liệu đến 07/09, công bố kết quả ngày 27/11 và dự kiến đăng ký trong tháng 01/2027. Khoảng cách ngắn giữa hạn đơn và hạn bản giấy đòi hỏi hoàn tất dịch, chứng thực và vận chuyển trước ngày đóng cổng. Sau khi nộp, ứng viên phải theo dõi thông báo về phỏng vấn hoặc kiểm tra kỹ năng nếu ngành yêu cầu. Khi trúng tuyển, các dịch vụ hỗ trợ của OIA về định hướng, visa, bảo hiểm, đăng ký môn và buddy nên được dùng theo thứ tự thay vì tự xử lý rời rạc.',
  },
  {
    slug: 'dai-hoc-woosong',
    sources: [
      'https://english.wsu.ac.kr/page/index.jsp?code=eng0301',
      'https://english.wsu.ac.kr/page/index.jsp?code=eng0302',
      'https://english.wsu.ac.kr/page/index.jsp?code=eng040403a',
    ],
    decision: 'Điểm cần quyết định trước ở Woosong là English Track hay Korean Track, sau đó mới chọn trường thành viên. SolBridge tập trung kinh doanh quốc tế; Endicott có các hướng quản trị, khách sạn và truyền thông; các trường khác mở AI, dữ liệu, phần mềm, ẩm thực, nhà hàng, K-Beauty, giáo dục mầm non và đường sắt. Tên ngành bằng tiếng Anh không bảo đảm toàn bộ học phần đều bằng tiếng Anh. Ứng viên cần mở trang của chương trình để kiểm tra ngôn ngữ, thời lượng, cấu trúc môn và điều kiện tốt nghiệp.',
    documents: 'Quy trình quốc tế của Woosong đi từ đơn trực tuyến, kiểm tra giấy tờ và phí hồ sơ 50 USD đến phỏng vấn, thư trúng tuyển, hóa đơn, bản cứng và tài liệu visa. Hồ sơ thường có hộ chiếu, giấy tờ cha mẹ và quan hệ gia đình, bằng, bảng điểm, chứng chỉ ngôn ngữ và chứng minh tài chính. Số dư, thời hạn xác nhận ngân hàng, yêu cầu Apostille và địa chỉ gửi phải lấy từ guidebook của kỳ. Ứng viên nên giữ bản quét màu và bảng theo dõi ngày gửi để xử lý nhanh nếu trường yêu cầu bổ sung.',
    language: 'Chương trình bằng tiếng Anh và bằng tiếng Hàn có tiêu chí khác nhau; chứng chỉ cần phù hợp đúng track. Khóa tiếng Hàn của Korean Language Institute thuộc lộ trình D-4 riêng, không phải một học kỳ dự bị tự động của mọi chương trình cử nhân. Nếu năng lực hiện tại chưa đáp ứng ngành mong muốn, ứng viên cần so sánh chi phí và thời gian của khóa tiếng với việc thi lại chứng chỉ trước khi nộp. Sau nhập học, tiếng Hàn vẫn có giá trị cho thực tập, việc làm thêm hợp pháp và sinh hoạt tại Daejeon.',
    budget: 'Woosong công bố học phí 2026 bằng USD theo chương trình: khoảng 6.792 USD/năm ở một số ngành, 7.794–8.442 USD ở nhiều chương trình công nghệ, đường sắt hoặc ẩm thực, 10.494 USD cho AI/Data Science và 12.592 USD ở SolBridge. Cần dùng đúng chương trình trên invoice và dự phòng biến động tỷ giá. Trường còn ước tính các khoản năm đầu như nhập học, ký túc xá, một bữa mỗi ngày, bảo hiểm và hoạt động; kỳ hè hoặc đông có thể tính riêng. Không nên chỉ so sánh học phí mà bỏ qua tổng chi phí.',
    scholarship: 'Học bổng tuyển sinh và thành tích của Woosong chủ yếu là hỗ trợ học phí; trang trường nói rõ không bao gồm nhà ở, suất ăn, sách, bảo hiểm và sinh hoạt. Học bổng học kỳ sau còn gắn với số tín chỉ, GPA và việc không có điểm F. Vì vậy, mức miễn cao ở kỳ đầu không thể tự động nhân cho toàn khóa. Khi lập kế hoạch, ứng viên nên tách học phí gốc, mức học bổng đã xác nhận, chi phí không được hỗ trợ và điều kiện cần đạt ở mỗi học kỳ.',
    timeline: 'Ứng viên nên tải guidebook của đúng kỳ, chọn track và ngành, chuẩn bị chứng chỉ cùng giấy tờ gia đình, rồi nộp trực tuyến sớm để có thời gian sửa lỗi. Sau vòng hồ sơ là phỏng vấn; sau thư trúng tuyển phải đối chiếu hóa đơn, chuyển tiền đúng thông tin và gửi bản cứng. Tài liệu xin visa chỉ được dùng sau khi trường xác nhận các bước tài chính. Trước ngày nhập cảnh cần đăng ký nơi ở, bảo hiểm và hướng dẫn Student Services. Mọi mốc phải theo email hoặc thông báo chính thức, không lấy lịch học vụ của sinh viên đang học làm lịch tuyển sinh.',
  },
  {
    slug: 'dai-hoc-hansung',
    sources: [
      'https://www.hansung.ac.kr/global_en/885/subview.do',
      'https://www.hansung.ac.kr/global_en/886/subview.do',
      'https://www.hansung.ac.kr/global_en/887/subview.do',
    ],
    decision: 'School of Global Talent là tuyến cần đọc đầu tiên nếu ứng viên muốn chương trình định hướng quốc tế tại Hansung. Các hướng gồm ngôn ngữ và văn hóa Hàn, K-Business, truyền thông–giải trí, thời trang–làm đẹp, phần mềm hội tụ và khởi nghiệp; ngoài ra trường còn nhiều ngành thiết kế, IT, kỹ thuật, xã hội và nhân văn. Global K-Business có English Track được đánh dấu riêng, nên không thể suy ra các ngành còn lại cũng dạy hoàn toàn bằng tiếng Anh. Chọn ngành cần gắn với ngôn ngữ và mục tiêu nghề nghiệp.',
    documents: 'Hansung tuyển cử nhân quốc tế thường hai lần mỗi năm, với các bước đơn trực tuyến, nộp tài liệu, xét hồ sơ, phỏng vấn khi cần, công bố kết quả và đăng ký. Ứng viên cùng cha mẹ phải đáp ứng điều kiện quốc tịch của diện, đồng thời chứng minh tốt nghiệp THPT. Bộ giấy tờ cần được dịch và chứng thực theo guidebook; lệ phí được công bố là 100.000 KRW. Vì thông báo có thể được cập nhật mà không gửi riêng cho từng người, ứng viên phải kiểm tra trang Apply và tình trạng hồ sơ cho đến khi hoàn tất nhập học.',
    language: 'Hansung chấp nhận một số đường chứng minh tiếng Hàn, gồm kết quả TOPIK hoặc hoàn thành cấp độ được chỉ định tại trung tâm ngôn ngữ. Cấp độ của khóa tiếng và chứng chỉ TOPIK không nên được coi là tương đương ngoài trường hợp guidebook ghi rõ. English Track cũng cần đọc điều kiện riêng. Ngoài việc đủ điều kiện nộp, tiếng Hàn ảnh hưởng trực tiếp tới học bổng kỳ đầu và các kỳ sau, nên kế hoạch thi TOPIK phải được đặt trước hạn nộp chứng chỉ của từng học kỳ.',
    budget: 'Bảng trên trang Apply hiện dùng số liệu học phí 2025 và cảnh báo có thể thay đổi, nên chỉ dùng để ước lượng: khối nhân văn–xã hội khoảng 3,985 triệu KRW; nghệ thuật–thiết kế và kỹ thuật cao hơn; có thêm phí vật liệu hoặc hội sinh viên. Ký túc xá Global Village được tính theo ngày và loại phòng, ví dụ 773.500–864.500 KRW cho 91 ngày ở một số phòng. Ngân sách cần cộng tiền ăn, bảo hiểm, sách, đi lại tại Seoul, chứng thực và khoản thuê ngoài nếu không được xếp phòng.',
    scholarship: 'Học bổng tân sinh viên gắn rõ với TOPIK: cấp 6 miễn 100% học phí kỳ đầu, cấp 5 là 80%, cấp 4 là 50%, cấp 3 là 30%; người hoàn thành đủ thời lượng khóa tiếng Hansung có một diện 50%. Từ kỳ sau, tỷ lệ phụ thuộc đồng thời GPA và TOPIK, yêu cầu ít nhất 15 tín chỉ và chứng chỉ còn hiệu lực. Vì thế, ứng viên phải phân biệt “được xét kỳ đầu” với “duy trì toàn khóa”, đồng thời tính chi phí ký túc xá và sinh hoạt không nằm trong phần miễn học phí.',
    timeline: 'Lịch thông thường nhận hồ sơ vào khoảng tháng 5 và tháng 11, nhưng ngày cụ thể phải theo guidebook hiện hành. Trước kỳ mở đơn, ứng viên nên kiểm tra ngành còn tuyển, chuẩn ngôn ngữ, bản dịch và chứng thực; khi đơn mở thì nộp sớm, theo dõi phỏng vấn và kết quả trên website. Sau trúng tuyển là hạn đóng học phí, đăng ký ký túc xá, cấp giấy tờ visa và nhập học. Chỗ ở Global Village và Sangsang Village có loại phòng khác nhau, nên cần đăng ký theo thông báo thay vì mặc định trường tự bố trí.',
  },
  {
    slug: 'du-hoc-dai-hoc-quoc-gia-pusan-2026-dieu-kien-tuyen-sinh-hoc-phi-va-visa-d-4-1-chi-tiet',
    sources: [
      'https://international.pusan.ac.kr/bbs/international/2089/1459481/artclView.do',
      'https://www.pusan.ac.kr/eng/CMS/OrganizationMgr/Undergraduate.do?mCode=MN019',
      'https://international.pusan.ac.kr/international/15206/subview.do',
    ],
    decision: 'Pusan National University tuyển trên nhiều cơ sở và đơn vị, nên tên ngành phải được đọc cùng địa điểm học. Busan có phần lớn nhân văn, xã hội, khoa học, kỹ thuật, kinh tế, kinh doanh và nghệ thuật; Yangsan có một số ngành sức khỏe và y sinh; Miryang tập trung nông nghiệp, sinh học và công nghệ liên quan. Cẩm nang liệt kê đơn vị tuyển theo Department hoặc Major, vì vậy ứng viên phải chọn đúng cấp, đặc biệt với kỹ thuật điện–điện tử, máy tính, AI và các nhóm có nhiều chuyên ngành.',
    documents: 'Cẩm nang mùa xuân 2027 áp dụng cho tân sinh viên và chuyển tiếp, kèm biểu mẫu riêng. Hồ sơ đã nộp và lệ phí không được hoàn; ngành đã chọn không được đổi trong quy trình. Trường công bố mọi thông báo và kết quả trên cổng tuyển sinh thay vì gửi riêng, và có thể hủy kết quả nếu thiếu giấy tờ, ghi sai, không đáp ứng cẩm nang hoặc không hoàn thành thủ tục nhập cảnh. Vì vậy, ứng viên cần một bảng kiểm gồm đơn trực tuyến, bản gốc, chứng thực, chứng chỉ ngôn ngữ, biểu mẫu và mã theo dõi chuyển phát.',
    language: 'Điều kiện ngôn ngữ thay đổi theo ngành và diện tân sinh viên hoặc chuyển tiếp. Chương trình tiếng Hàn của PNU là tuyến học ngôn ngữ riêng với lịch, phí và visa riêng; hoàn thành khóa không tự động bảo đảm trúng tuyển hệ bằng. Người học cần kiểm tra cả chuẩn đầu vào lẫn chuẩn tốt nghiệp, đồng thời đánh giá khả năng học chuyên ngành. Nếu dùng chứng chỉ tiếng Anh cho một chương trình cho phép, vẫn cần kế hoạch tiếng Hàn cho đời sống, đăng ký môn, thực tập và cơ hội nghề nghiệp tại Busan.',
    budget: 'Học phí phải đọc ở phụ lục của cẩm nang theo khối ngành và cơ sở, không dùng một số trung bình cho toàn PNU. Ngân sách nên gồm học phí một năm, phí hồ sơ, nhà ở, gói ăn nếu chọn, bảo hiểm, giáo trình, giao thông, vé máy bay và chi phí chứng thực. Thông tin visiting có thể đưa ra mức phòng tham khảo nhưng không thay cho phí ký túc xá của sinh viên hệ bằng. Ký túc xá có đợt đăng ký và loại phòng riêng; người trúng tuyển vẫn cần phương án thuê ngoài nếu hết chỗ.',
    scholarship: 'Học bổng của PNU, GKS và hỗ trợ theo thành tích có tuyến xét khác nhau. Thông báo 2027 nêu ứng viên GKS bậc cử nhân muốn chọn PNU phải đi theo Embassy Track và nộp tại cơ quan đại diện Hàn Quốc, không gửi vòng đầu trực tiếp tới trường. Điều này khác hoàn toàn hồ sơ cử nhân quốc tế thông thường. Ứng viên cần xác định tuyến ngay từ đầu, vì bộ hồ sơ, nơi nộp, lịch và cơ quan quyết định không giống nhau; không được nộp lẫn hai quy trình.',
    timeline: 'Cẩm nang mùa xuân 2027 đăng ngày 07/09/2026 và cổng Jinhak mở lúc 09:00 ngày 12/10/2026. Ứng viên phải dùng bản tiếng Anh hoặc tiếng Việt để chuẩn bị nhưng khi có khác biệt, bản tiếng Hàn được ưu tiên. Trước ngày mở đơn cần chốt ngành, hoàn tất chứng thực và bản dịch; trong kỳ nộp phải kiểm tra trạng thái bản giấy; sau đó theo dõi lịch phỏng vấn, kết quả, học phí và Certificate of Admission. Cẩm nang sinh viên quốc tế sau nhập học cung cấp thêm hướng dẫn visa, bảo hiểm, học vụ, học bổng và đời sống.',
  },
  {
    slug: 'dai-hoc-suwon',
    title: 'Đại học Suwon', subtitle: 'The University of Suwon', focusKeyword: 'Đại học Suwon',
    seoTitle: 'Đại học Suwon: tuyển sinh, học phí và học bổng',
    metaDescription: 'Thông tin Đại học Suwon về ngành học, tuyển sinh quốc tế 2026, học phí, học bổng, khóa tiếng Hàn, ký túc xá và hỗ trợ sinh viên.',
    excerpt: 'Đại học Suwon tại Hwaseong đào tạo đa ngành và có tuyến tuyển sinh dành cho tân sinh viên, sinh viên chuyển tiếp quốc tế. Hồ sơ trình bày điều kiện, học phí 2026, khóa tiếng Hàn, học bổng, ký túc xá và hỗ trợ đời sống từ nguồn chính thức.',
    sources: [
      'https://admit-en.suwon.ac.kr/usr/file/admit/2026-03_guidelines%20for%20applicants_English.pdf',
      'https://koredu.suwon.ac.kr/eng/?menuno=2102',
      'https://isc.suwon.ac.kr/eng/?menuno=516',
    ],
    decision: 'Tân sinh viên quốc tế của Suwon bắt đầu tại Major in Interdisciplinary Studies thuộc International College of Global Talent rồi lựa chọn hướng theo quy định của trường; sinh viên chuyển tiếp lại được xét vào khoa phù hợp. Vì vậy, mức học phí 3.257.000 KRW trong bảng 2026 là mức của chương trình liên ngành năm đầu, không phải giá cố định cho toàn bộ các năm hoặc mọi ngành. Người học cần xem danh mục khối nhân văn, kinh doanh, kỹ thuật, ICT, sức khỏe, nghệ thuật và quốc tế, rồi hỏi rõ thời điểm phân ngành và học phí sau khi vào chuyên ngành.',
    documents: 'Cẩm nang 2026 dành cho tân sinh viên và chuyển tiếp quốc tế là tài liệu quyết định về điều kiện, lịch, hồ sơ và đánh giá. Ứng viên cần tách giấy tờ quốc tịch–gia đình, bằng và bảng điểm, năng lực ngôn ngữ, chứng minh tài chính cùng tài liệu riêng của diện chuyển tiếp. Kết quả phải được tự kiểm tra trên trang Office of International Affairs; không xem thông báo có thể làm mất quyền đăng ký. Sau khi trúng tuyển, học phí phải đến tài khoản trường trước hạn, kể cả chuyển tiền từ nước ngoài, nếu không kết quả có thể bị hủy.',
    language: 'Khóa tiếng Hàn của Suwon có bốn kỳ mỗi năm, mỗi kỳ 10 tuần và 200 giờ. Học phí hiện công bố 1.200.000 KRW/kỳ, phí nhập học 50.000 KRW, sách khoảng 70.000 KRW và bảo hiểm khoảng 100.000 KRW cho sáu tháng; người mới thường đăng ký tối thiểu hai kỳ. Đây là tuyến ngôn ngữ D-4 riêng, không được cộng nhầm vào học phí cử nhân D-2. Lịch 2026–2027 công bố hạn hồ sơ, kiểm tra xếp lớp và ngày học, giúp ứng viên tính thời gian chuyển từ học tiếng sang nộp hệ bằng nếu đủ điều kiện.',
    budget: 'Ngoài học phí chương trình liên ngành năm đầu, ngân sách cần tính chi phí thay đổi sau phân ngành, bảo hiểm, nhà ở, ăn uống, giáo trình, di chuyển từ Hwaseong và thủ tục hồ sơ. Ký túc xá có nhiều tòa và loại phòng: một số mức được công bố khoảng 750.000–950.000 KRW cho hai kỳ, tòa Global Business khoảng 1.500.000 KRW, cùng tiền đặt cọc 200.000 KRW; phải kiểm tra lại kỳ đăng ký. Người học khóa tiếng cần tách riêng học phí hai kỳ tối thiểu, sách, bảo hiểm và khoản sinh hoạt trước khi được cấp hoặc gia hạn visa.',
    scholarship: 'Học bổng kỳ đầu của Suwon có bảng khá rõ: TOPIK 6 có thể được 100% học phí, TOPIK 5 là 50%, cấp 4 là 40% và cấp 3 là 30%; diện tiếng Anh dùng các ngưỡng IELTS với tỷ lệ 80%, 60% hoặc 50%; học bổng phỏng vấn có mức 50%, 40% hoặc 30%. Sinh viên đang học còn có hỗ trợ dựa trên GPA và ngôn ngữ. Mỗi nhóm có điều kiện riêng, nên không cộng dồn tỷ lệ hoặc xem học bổng khóa tiếng là học bổng cử nhân nếu quy định không cho phép.',
    timeline: 'Ứng viên hệ bằng nên tải cẩm nang 2026, xác định tân sinh viên hay chuyển tiếp, hoàn thiện chứng thực và chứng chỉ, nộp theo lịch rồi tự kiểm tra kết quả. Sau trúng tuyển cần đóng học phí đúng hạn, xin giấy tờ visa, đăng ký ký túc xá và liên hệ Center for International Student. Người học tiếng phải theo lịch riêng của Korean Language & Culture Institute; mỗi kỳ có hạn cho người ở nước ngoài sớm hơn người đang ở Hàn Quốc để đủ thời gian visa. Chương trình SUBA hỗ trợ định hướng, thủ tục cư trú và hòa nhập sau khi nhập học, không thay thế quy trình tuyển sinh.',
  },
  {
    slug: 'dai-hoc-nu-kyung-in',
    title: 'Đại học Nữ Kyung-in', subtitle: "Kyung-In Women's University", focusKeyword: 'Đại học Nữ Kyung-in',
    seoTitle: 'Đại học Nữ Kyung-in: tuyển sinh và học phí',
    metaDescription: 'Thông tin Đại học Nữ Kyung-in về tuyển sinh quốc tế 2027, ngành học, học phí, khóa tiếng Hàn, học bổng, ký túc xá và hồ sơ.',
    excerpt: 'Đại học Nữ Kyung-in tại Incheon tuyển sinh viên nữ quốc tế vào các ngành nghề ứng dụng và chương trình tiếng Hàn. Hồ sơ cập nhật lịch tuyển 2027, cách xét, học phí, học bổng, ký túc xá và đầu mối tiếp nhận hồ sơ.',
    sources: [
      'https://www.kiwu.ac.kr/ko/cms/FR_CON/index.do?MENU_ID=2330',
      'https://www.kiwu.ac.kr/attach/202604/1777451974795_0.pdf',
      'https://start.kiwu.ac.kr/foreigner/main.jsp',
    ],
    decision: 'Kyung-in là đại học nữ định hướng nghề nghiệp, nên diện hệ bằng dành cho nữ ứng viên quốc tế và phải chọn trong danh mục mở của đúng kỳ. Các nhóm đào tạo gồm điều dưỡng–sức khỏe–phúc lợi, kinh doanh, du lịch–ẩm thực, giáo dục–dịch vụ, phần mềm–truyền thông–thiết kế và K-Culture; không phải tất cả ngành đều tuyển người nước ngoài ở mọi đợt. Cổng tuyển 2027 và PDF quốc tế là hai tài liệu cần đọc cùng nhau để xác nhận ngành, chỉ tiêu, ngôn ngữ và tiêu chí phỏng vấn trước khi nộp.',
    documents: 'Kỳ tuyển 2027 đợt đầu nhận đơn từ 07–30/09/2026, hồ sơ đến trước 17:00 ngày 02/10, phỏng vấn 07–09/10, công bố kết quả 29/10 và đóng học phí 21–23/12. Lệ phí là 50.000 KRW; không được nộp nhiều ngành trong cùng đợt và đơn đã gửi không thể tùy ý sửa. Bộ hồ sơ có biểu mẫu tự giới thiệu–kế hoạch học tập, cam kết tài chính và giấy tờ học lực, quốc tịch, gia đình, ngôn ngữ. Người nộp phải dùng địa chỉ International Education Team tại Spotopia Hall và giữ bằng chứng chuyển phát.',
    language: 'Tuyến hệ bằng thường yêu cầu TOPIK 3 hoặc phương án hoàn thành khóa tiếng tương đương được cẩm nang chấp nhận; điều kiện cụ thể phải đọc theo ngành. Chương trình tiếng Hàn D-4 có bốn kỳ trong năm, lớp khoảng tối đa 20 người, học buổi sáng hoặc chiều và mức 1.100.000 KRW/kỳ theo cẩm nang 2026. Học khóa tiếng không bảo đảm tự động đỗ hệ bằng, nhưng có thể giúp đáp ứng ngôn ngữ và chuẩn bị phỏng vấn. Người học cần phân biệt ngày của kỳ ngôn ngữ với ngày tuyển tháng 3 hoặc tháng 9 hệ bằng.',
    budget: 'Hệ bằng có phí hồ sơ 50.000 KRW; mức học phí tham khảo của một số khối nhân văn khoảng 3.214.000 KRW mỗi kỳ, nhưng ngành sức khỏe, nghệ thuật hoặc kỹ thuật có thể khác và phải theo giấy báo. Ký túc xá công bố khoảng 300.000 KRW/tháng, thường yêu cầu thời gian đầu sáu tháng; loại phòng và khoản đặt cọc cần xác nhận. Với khóa tiếng, ngoài 1.100.000 KRW/kỳ còn có bảo hiểm, sách và sinh hoạt. Ngân sách nên tính theo ít nhất hai học kỳ cùng phương án thuê ngoài tại Incheon nếu không có phòng.',
    scholarship: 'Cẩm nang chương trình tiếng công bố khoản khuyến khích 300.000 KRW khi học viên đạt TOPIK 3 lần đầu trong thời gian học theo điều kiện áp dụng. Học bổng hệ bằng và giảm học phí phải được đọc ở bảng của kỳ, không suy từ phần thưởng khóa tiếng. Khi so sánh, ứng viên cần ghi rõ đối tượng, thời điểm xét, khoản được giảm và yêu cầu duy trì. Mức học bổng không nên được trừ khỏi ngân sách trước khi trường thông báo bằng văn bản, vì học phí và ký túc xá vẫn có hạn thanh toán độc lập.',
    timeline: 'Trước tháng 9, ứng viên cần xác định ngành mở cho người nước ngoài, hoàn tất TOPIK, dịch–chứng thực giấy tờ và viết kế hoạch học tập. Trong đợt 07–30/09 phải nộp đơn, sau đó bảo đảm bản giấy đến trước 02/10 và chuẩn bị phỏng vấn. Kết quả 29/10 phải được tự kiểm tra; bước tiếp theo là đóng học phí, nhận giấy nhập học, xử lý visa và ký túc xá. Nếu chưa đủ tiếng, người học có thể so sánh lộ trình D-4, nhưng cần tính riêng thời gian và chi phí thay vì giả định được chuyển tiếp tự động.',
  },
  {
    slug: 'dai-hoc-wonkwang',
    title: 'Đại học Wonkwang', subtitle: 'Wonkwang University', focusKeyword: 'Đại học Wonkwang',
    seoTitle: 'Đại học Wonkwang: tuyển sinh và học bổng',
    metaDescription: 'Thông tin Đại học Wonkwang về ngành đào tạo, điều kiện quốc tế, TOPIK, học phí, học bổng, ký túc xá và quy trình hồ sơ.',
    excerpt: 'Đại học Wonkwang tại Iksan đào tạo đa ngành từ nhân văn, kinh doanh và kỹ thuật đến dược, y, nha khoa và y học Hàn Quốc. Hồ sơ này trình bày điều kiện quốc tế, TOPIK, học phí, học bổng, ký túc xá và quy trình nộp hồ sơ.',
    sources: [
      'https://eng.wku.ac.kr/admissions/colleges-2/application-and-procedures/',
      'https://eng.wku.ac.kr/admissions/colleges-2/scholarships/',
      'https://eng.wku.ac.kr/campus-life/dormitory/',
    ],
    decision: 'Wonkwang có danh mục ngành rộng, gồm nhân văn, kinh doanh, khoa học tự nhiên, nông nghiệp–thực phẩm, kỹ thuật, nghệ thuật–thiết kế, giáo dục, khoa học xã hội, dược, nha, y và y học Hàn Quốc. Tuy nhiên, danh mục toàn trường không đồng nghĩa mọi ngành sức khỏe đều mở cho diện quốc tế. Ứng viên phải kiểm tra thông báo của kỳ để xác định ngành, chỉ tiêu, ngôn ngữ và điều kiện riêng. Tân sinh viên và chuyển tiếp năm hai hoặc năm ba cũng có yêu cầu học lực khác nhau, nên cần chọn đúng diện trước khi chuẩn bị giấy tờ.',
    documents: 'Điều kiện cơ bản gồm ứng viên và cha mẹ có quốc tịch nước ngoài theo diện, hoàn thành bậc học phù hợp và đáp ứng tiếng Hàn. Chuyển tiếp năm ba cần nền tảng cao đẳng hoặc thời gian học đại học dài hơn chuyển tiếp năm hai. Quy trình công bố đi từ đơn, xét hồ sơ đến phỏng vấn hoặc kiểm tra, kết quả và đăng ký. Hồ sơ phải chứng minh quốc tịch, quan hệ gia đình, bằng, bảng điểm, ngôn ngữ và tài chính; cách Apostille hoặc xác nhận lãnh sự cần theo cẩm nang hiện hành, không chỉ trang giới thiệu tổng quát.',
    language: 'Trang quốc tế của Wonkwang nêu TOPIK 3 hoặc hoàn thành cấp 4 tại trung tâm tiếng của trường hay vượt bài kiểm tra tương đương là các đường đáp ứng phổ biến; nghệ thuật–thể thao có thể có quy định riêng. Trước tốt nghiệp, chuẩn TOPIK cao hơn có thể được áp dụng, nên chứng chỉ đầu vào không phải mục tiêu cuối. Người học nên kiểm tra ngôn ngữ thực tế của ngành, đặc biệt các chương trình y tế, giáo dục và chuyên môn có nhiều thuật ngữ. Khóa tiếng Hàn là lộ trình riêng và không tạo bảo đảm trúng tuyển hệ bằng.',
    budget: 'Học phí khác nhau theo khoa và kỳ; thông báo đóng tiền của năm 2026 mới là căn cứ thanh toán, vì một con số chung không thể đại diện cho các khối nhân văn, kỹ thuật, nghệ thuật và sức khỏe. Ngân sách nên cộng phí hồ sơ, bảo hiểm, ký túc xá, ăn uống, giáo trình, di chuyển tại Iksan, chứng thực và vé máy bay. Ký túc xá có phòng đôi và tiện ích chung, nhưng sức chứa tổng thể không đồng nghĩa mọi sinh viên quốc tế được bảo đảm chỗ. Cần kiểm tra thời gian đăng ký và phương án thuê ngoài.',
    scholarship: 'Học bổng kỳ đầu được công bố theo TOPIK: cấp 5 trở lên có thể được miễn toàn bộ học phí và phí nhập học, cấp 4 giảm 60% học phí, cấp 2–3 hoặc hoàn thành khóa tiếng đủ điều kiện giảm 50%; ngành nghệ thuật–thể thao có nhóm 50%. Từ kỳ hai, học bổng thành tích khoảng 30–60% theo GPA và quy định. Người nhận còn phải nộp bằng chứng bảo hiểm đúng hạn. Vì vậy, ứng viên cần phân biệt điều kiện đầu vào, mức kỳ đầu và điều kiện duy trì, không quảng diễn một tỷ lệ thành học bổng toàn khóa.',
    timeline: 'Ứng viên nên bắt đầu bằng việc xác nhận ngành mở và diện tân sinh viên hay chuyển tiếp với Office of International Affairs. Tiếp theo là thi TOPIK, hoàn thành giấy tờ học lực và gia đình, chứng thực, chứng minh tài chính, rồi nộp theo thông báo. Sau vòng hồ sơ có thể có phỏng vấn hoặc kiểm tra; sau kết quả phải đóng học phí, xác nhận học bổng, đăng ký ký túc xá và xin visa. Nếu dùng thông tin trên trang tiếng Anh lâu năm, cần đối chiếu lại với cẩm nang kỳ mới để tránh lấy lịch hoặc mức tiền cũ làm dữ liệu hiện hành.',
  },
];

function section(title, body) {
  return `<h2>${title}</h2>${body}`;
}

function legacyBase(profile) {
  return [
    `<p><strong>${profile.lead}</strong></p>`,
    ...profile.sections
      .filter(([title]) => !/tài liệu|nguồn chính thức/i.test(title))
      .map(([title, body]) => section(title, body)),
  ].join('');
}

function cleanExistingBase(content) {
  return String(content || '')
    .replace(/<h2\b[^>]*>\s*(?:Tài liệu đính kèm|Tài liệu chính thức|Nguồn chính thức|Nguồn bài viết|Cẩm nang liên quan)[\s\S]*$/i, '')
    .replace(/<a\b[^>]*>([\s\S]*?)<\/a>/gi, '$1')
    .replace(/https?:\/\/[^\s<]+/gi, '')
    .trim();
}

function extensionContent(spec, title) {
  return [
    section(`Nên chọn lộ trình nào tại ${title}?`, `<p>${spec.decision}</p><p>Trước khi đi tiếp, ứng viên nên tạo một bảng so sánh tối thiểu gồm tên chương trình, bậc học, cơ sở, ngôn ngữ giảng dạy, điều kiện đầu vào, học phí và đầu mối phụ trách. Cách làm này giúp loại bỏ lựa chọn không phù hợp sớm, đồng thời giữ bài luận và kế hoạch học tập nhất quán với đúng đơn vị tuyển sinh.</p>`),
    section('Hồ sơ tuyển sinh nên được chuẩn bị theo cấu trúc nào?', `<p>${spec.documents}</p><p>Mỗi giấy tờ nên có tên tệp thống nhất, bản gốc, bản dịch và tình trạng chứng thực. Những mốc có tính phụ thuộc — như thư giới thiệu, kết quả thi ngôn ngữ, xác nhận ngân hàng và chuyển phát quốc tế — phải được hoàn tất sớm hơn hạn chính. Chỉ dùng biểu mẫu của đúng năm tuyển; biểu mẫu cũ có thể khác câu hỏi, chữ ký hoặc cơ quan tiếp nhận.</p>`),
    section('Năng lực ngôn ngữ ảnh hưởng kế hoạch học như thế nào?', `<p>${spec.language}</p><p>Một kế hoạch khả thi cần tách ba mức: đủ điều kiện nộp hồ sơ, đủ khả năng theo học năm đầu và đạt chuẩn trước khi tốt nghiệp. Nếu ba mức khác nhau, ứng viên phải bố trí thời gian thi lại hoặc học bổ sung. Chứng chỉ còn phải hiệu lực tại thời điểm trường quy định; chỉ ghi điểm trong CV mà không nộp đúng dạng chứng minh sẽ không thay thế tài liệu bắt buộc.</p>`),
    section('Cách lập ngân sách du học sát với dữ liệu của trường?', `<p>${spec.budget}</p><p>Nên lập ngân sách theo hai kịch bản: có ký túc xá và phải thuê ngoài; đồng thời tách khoản phải trả trước nhập học khỏi chi phí phát sinh hằng tháng. Số tiền trong bảng của trường cần ghi kèm năm, học kỳ, đơn vị tiền tệ và đối tượng áp dụng. Nhờ vậy, một mức phí của khóa tiếng, học kỳ đầu hoặc chương trình đặc biệt sẽ không bị dùng nhầm làm học phí toàn khóa.</p>`),
    section('Học bổng cần được đọc cùng điều kiện duy trì ra sao?', `<p>${spec.scholarship}</p><p>Khi đánh giá học bổng, bốn câu hỏi quan trọng là: ai tự động được xét, có cần đơn riêng không, hỗ trợ khoản nào và phải duy trì điều kiện gì. Nếu kết quả học bổng công bố sau hạn đóng tiền, ứng viên vẫn phải chuẩn bị đủ khoản thanh toán ban đầu. Tỷ lệ miễn học phí cũng không đồng nghĩa được hỗ trợ nhà ở, bảo hiểm hoặc sinh hoạt nếu quy định không nêu rõ.</p>`),
    section('Mốc chuẩn bị hồ sơ và bước sau trúng tuyển nên sắp xếp thế nào?', `<p>${spec.timeline}</p><p>Sau khi hoàn tất đơn, người nộp vẫn phải theo dõi trạng thái hồ sơ, yêu cầu bổ sung, lịch phỏng vấn và kết quả bằng đúng kênh trường chỉ định. Sau trúng tuyển là một chuỗi có thứ tự: xác nhận nhập học, thanh toán, nhận giấy tờ visa, đăng ký nhà ở, bảo hiểm và lịch định hướng. Bỏ một mắt xích có thể làm chậm visa hoặc mất chỗ dù đã có kết quả học thuật.</p>`),
    section('Checklist cuối cùng trước khi gửi hồ sơ gồm những gì?', `<ol><li>Xác nhận đúng bậc học, ngành, cơ sở và tuyến tuyển sinh.</li><li>Tải cẩm nang và biểu mẫu của đúng kỳ; ghi lại ngày cập nhật.</li><li>Đối chiếu điều kiện học lực, quốc tịch và ngôn ngữ với giấy tờ thực tế.</li><li>Hoàn tất dịch thuật, công chứng, Apostille hoặc xác nhận lãnh sự theo hướng dẫn.</li><li>Kiểm tra từng con số học phí, học bổng và nhà ở kèm năm áp dụng.</li><li>Nộp trước hạn, lưu biên nhận và mã chuyển phát.</li><li>Theo dõi thông báo của trường đến khi hoàn tất visa và nhập học.</li></ol><p>Checklist này không thay thế cẩm nang; mục đích là bảo đảm dữ kiện đã đọc được chuyển thành hành động. Nếu website và PDF có khác biệt, ứng viên nên hỏi đầu mối tuyển sinh bằng email và lưu câu trả lời trước khi nộp hoặc chuyển tiền.</p>`),
  ].join('');
}

function buildProfileContent(spec, row) {
  const legacy = legacyProfiles.find((profile) => profile.slug === spec.slug);
  const base = legacy ? legacyBase(legacy) : cleanExistingBase(row.content);
  return sanitizeRichHtml(`${base}${extensionContent(spec, spec.title || legacy?.title || row.title)}`);
}

function applyRemainingSchoolProfileRepair(db, options = {}) {
  const rows = db.prepare(`SELECT * FROM programs WHERE category='Thông tin trường'
    AND slug IN (${targets.map(() => '?').join(',')})`).all(...targets.map((profile) => profile.slug));
  const missing = targets.filter((profile) => !rows.some((row) => row.slug === profile.slug)).map((profile) => profile.slug);
  if (options.strict && missing.length) throw new Error(`Thiếu hồ sơ trường: ${missing.join(', ')}`);
  const applied = db.prepare('SELECT value FROM system_meta WHERE key=?').get('remaining_school_profiles_version');
  if (applied?.value === REPAIR_VERSION) return { applied: false, reason: 'already-current', found: rows.length, missing };

  const update = db.prepare(`UPDATE programs SET title=?,subtitle=?,excerpt=?,content=?,author_name=?,author_role=?,author_url=?,
    source_urls=?,seo_title=?,meta_description=?,focus_keyword=?,published=1,noindex=0,updated_at=datetime('now','localtime')
    WHERE id=? AND slug=? AND category='Thông tin trường'`);
  const changed = db.transaction(() => rows.map((row) => {
    const spec = targets.find((profile) => profile.slug === row.slug);
    const legacy = legacyProfiles.find((profile) => profile.slug === row.slug);
    const title = spec.title || legacy?.title || row.title;
    const content = buildProfileContent(spec, row);
    const result = update.run(
      title,
      spec.subtitle || legacy?.subtitle || row.subtitle,
      spec.excerpt || legacy?.excerpt || row.excerpt,
      content,
      AUTHOR_NAME,
      AUTHOR_ROLE,
      AUTHOR_URL,
      spec.sources.slice(0, 3).join('\n'),
      spec.seoTitle || legacy?.seoTitle || row.seo_title,
      spec.metaDescription || legacy?.metaDescription || row.meta_description,
      spec.focusKeyword || legacy?.focusKeyword || row.focus_keyword || title,
      row.id,
      row.slug
    );
    return { id: row.id, slug: row.slug, changes: result.changes, contentCharacters: content.length };
  }))();

  db.prepare(`INSERT INTO system_meta (key,value,updated_at) VALUES (?,?,datetime('now','localtime'))
    ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at`)
    .run('remaining_school_profiles_version', REPAIR_VERSION);
  db.prepare("DELETE FROM system_meta WHERE key='publication_pipeline_version'").run();
  return { applied: true, found: rows.length, missing, changed };
}

async function run() {
  process.env.SKIP_REMAINING_SCHOOL_PROFILE_AUTO_MIGRATION = '1';
  const db = require(path.join(APP_ROOT, 'db'));
  const { finalizePublishedContent } = require(path.join(APP_ROOT, 'lib', 'publicationPipeline'));
  const { syncWebsiteKnowledge } = require(path.join(APP_ROOT, 'lib', 'websiteKnowledge'));
  const { universityDraftCoverageReport } = require(path.join(APP_ROOT, 'lib', 'editorialAi'));
  const rows = db.prepare(`SELECT * FROM programs WHERE category='Thông tin trường'
    AND slug IN (${targets.map(() => '?').join(',')}) ORDER BY id`).all(...targets.map((profile) => profile.slug));
  if (rows.length !== targets.length) throw new Error(`Chỉ tìm thấy ${rows.length}/${targets.length} hồ sơ cần sửa.`);
  const backupDir = process.env.REPAIR_BACKUP_DIR || path.join(APP_ROOT, 'db', 'backups');
  fs.mkdirSync(backupDir, { recursive: true });
  const backupPath = path.join(backupDir, `remaining-school-profiles-before-repair-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(rows, null, 2), 'utf8');

  const result = applyRemainingSchoolProfileRepair(db, { strict: true });
  const repaired = targets.map((profile) => db.prepare('SELECT * FROM programs WHERE slug=?').get(profile.slug));
  repaired.forEach((row) => finalizePublishedContent('program', row.id, { sync: false, notify: false }));
  const quality = repaired.map((row) => ({ id: row.id, slug: row.slug, sources: String(row.source_urls || '').split(/\r?\n/).filter(Boolean).length, ...universityDraftCoverageReport(row) }));
  const index = syncWebsiteKnowledge({ force: true });
  console.log(JSON.stringify({ backupPath, result, quality, index }, null, 2));
  db.close();
}

module.exports = { targets, buildProfileContent, applyRemainingSchoolProfileRepair, REPAIR_VERSION };

if (require.main === module) run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
