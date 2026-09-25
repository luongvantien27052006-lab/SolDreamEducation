'use strict';

const HANGUL_RE = /[\uac00-\ud7af]/;

// Các tên riêng/thuật ngữ thường gặp trong dữ liệu nguồn. Danh sách này là
// lớp an toàn hiển thị; bản dịch biên tập đầy đủ vẫn được thực hiện trước khi
// nội dung được lưu hoặc xuất bản.
const TERMS = [
  ['한국에서 찾아볼 수 있는 대표적인 주거 유형은 무엇인가요?', 'Những loại hình nhà ở phổ biến tại Hàn Quốc là gì?'],
  ['한국에서는 주로 어떤 주거 형태를 볼 수 있나요?', 'Tại Hàn Quốc có những loại hình nhà ở phổ biến nào?'],
  ['한국의 대표적인 부동산 임대 방식은 어떻게 구분되나요?', 'Các hình thức thuê nhà phổ biến tại Hàn Quốc được phân loại như thế nào?'],
  ['한국의 임대 방식에는 어떤 종류가 있나요?', 'Hàn Quốc có những hình thức thuê nhà nào?'],
  ['한국의 의료기관은 어떻게 구분되나요?', 'Các cơ sở y tế tại Hàn Quốc được phân loại như thế nào?'],
  ['한국에는 5층 이상의 공동주택인 아파트를 비롯해 주거용 오피스텔, 다세대주택 및 개인 토지의 단독주택 등 다양한 주거 형태가 존재합니다.', 'Hàn Quốc có nhiều loại hình nhà ở như căn hộ chung cư từ năm tầng trở lên, căn hộ văn phòng dùng để ở, nhà ở nhiều hộ và nhà riêng xây trên đất cá nhân.'],
  ['한국의 주요 주거 형태로는 아파트, 오피스텔, 다세대주택, 단독주택 등이 있습니다.', 'Các loại hình nhà ở chính tại Hàn Quốc gồm căn hộ chung cư, căn hộ văn phòng, nhà ở nhiều hộ và nhà riêng.'],
  ['아파트는 5층 이상의 공동 주택이며, 오피스텔은 주거용으로 꾸며진 사무실 형태를 의미합니다.', 'Căn hộ chung cư thường nằm trong tòa nhà từ năm tầng trở lên; căn hộ văn phòng là không gian văn phòng được thiết kế để ở.'],
  ['또한 다세대주택과 개인 토지에 지은 단독주택도 찾아볼 수 있습니다.', 'Ngoài ra còn có nhà ở nhiều hộ và nhà riêng xây trên đất cá nhân.'],
  ['한국은 전세, 월세, 반전세 등 독특한 임대 방식을 운영하고 있습니다.', 'Hàn Quốc có các hình thức thuê nhà đặc thù gồm đặt cọc lớn, trả tiền hằng tháng và hình thức kết hợp.'],
  ['전세는 거액의 보증금을 맡기고 계약 기간 동안 거주한 뒤 돌려받는 방식이며, 월세는 보증금과 매월 임대료를 함께 납부합니다.', 'Với hình thức đặt cọc lớn, người thuê gửi một khoản tiền lớn rồi nhận lại khi hết hợp đồng; với hình thức trả hằng tháng, người thuê nộp tiền đặt cọc và tiền thuê mỗi tháng.'],
  ['반전세는 보증금과 월세를 혼합한 형태입니다.', 'Hình thức thuê kết hợp sử dụng cả tiền đặt cọc và tiền thuê hằng tháng.'],
  ['보증금 위주의 전세 제도와 보증금 및 매월 임대료를 함께 내는 월세, 그리고 두 가지를 혼합한 반전세 등의 임대 방식을 활용합니다.', 'Các hình thức thuê gồm đặt cọc lớn, đặt cọc kèm tiền thuê hằng tháng và hình thức kết hợp cả hai.'],
  ['각각 독립된 가구가 모여 있는 5층 이상의 공동 주택', 'Tòa nhà chung cư từ năm tầng trở lên gồm các hộ ở độc lập'],
  ['한 건물 내에 여러 가구가 살 수 있도록 건축된 주택', 'Nhà được xây để nhiều hộ cùng sinh sống trong một tòa nhà'],
  ['개인이 소유한 토지에 단독으로 지은 주택', 'Nhà riêng xây trên phần đất thuộc sở hữu cá nhân'],
  ['간단한 주거시설을 갖춘 사무실', 'Văn phòng có trang bị tiện nghi cơ bản để ở'],
  ['2025년 10월 29일(수) ~ 10월 31일(금)', 'Từ ngày 29/10/2025 đến ngày 31/10/2025'],
  ['교육부, 과학기술정보통신부, 대구광역시 (주최) / 한국연구재단 (주관)', 'Bộ Giáo dục Hàn Quốc, Bộ Khoa học và Công nghệ Thông tin Hàn Quốc và Thành phố Daegu tổ chức; Quỹ Nghiên cứu Quốc gia Hàn Quốc chủ trì'],
  ['서울 영등포구 도신로 40 (대림동 604-30), 07379', '40 Dosin-ro, quận Yeongdeungpo, Seoul (604-30 Daerim-dong), 07379'],
  ['국민건강보험공단 (1577-1000)', 'Cơ quan Bảo hiểm Y tế Quốc gia Hàn Quốc (1577-1000)'],
  ['농업회사법인(주)영풍', 'Công ty nông nghiệp Yeongpung'],
  ['한울농업회사법인(주)', 'Công ty nông nghiệp Hanul'],
  ['(주)삼화테크', 'Công ty Samhwa Tech'],
  ['(주)준텍스글로벌', 'Công ty Juntex Global'],
  ['Toward You: 흩어진 장면을 담아', 'Toward You: Ghi lại những khoảnh khắc rời rạc'],
  ['외국인종합안내센터', 'Tổng đài Hỗ trợ Người nước ngoài'],
  ['외국인고용관리시스템', 'Hệ thống Quản lý Việc làm cho Người nước ngoài'],
  ['해외인재유치센터 외국인 유학생 채용박람회', 'Hội chợ tuyển dụng sinh viên quốc tế của Trung tâm Thu hút Nhân tài Toàn cầu'],
  ['세계일류상품 수출대전 연계 해외인재유치 상담회', 'Hội nghị tư vấn thu hút nhân tài quốc tế kết hợp Triển lãm Xuất khẩu Sản phẩm Đẳng cấp Thế giới'],
  ['2025 산학연협력 EXPO', 'Triển lãm hợp tác công nghiệp – học thuật – nghiên cứu 2025'],
  ['대구 EXCO 서관 전시장', 'Khu triển lãm phía Tây EXCO, Daegu'],
  ['서울미래인재재단 서울테크스칼라십', 'Học bổng Công nghệ Seoul của Quỹ Nhân tài Tương lai Seoul'],
  ['사단법인 이주민센터 친구위탁 운영합니다', 'được vận hành bởi Trung tâm Người nhập cư Chingu'],
  ['서울외국인포털', 'Cổng thông tin Người nước ngoài Seoul'],
  ['사회통합프로그램', 'Chương trình Hội nhập Xã hội'],
  ['국민내일배움카드', 'Thẻ Học tập Ngày mai Quốc gia'],
  ['국립국제교육원', 'Viện Giáo dục Quốc tế Quốc gia Hàn Quốc'],
  ['글로벌빌리지센터', 'Trung tâm Làng Toàn cầu'],
  ['외국인주민센터', 'Trung tâm Cư dân Nước ngoài'],
  ['서울미래인재재단', 'Quỹ Nhân tài Tương lai Seoul'],
  ['서울시 광역형 비자', 'visa khu vực mở rộng của Seoul'],
  ['출입국/체류안내', 'hướng dẫn xuất nhập cảnh và cư trú'],
  ['출입국 체류안내', 'hướng dẫn xuất nhập cảnh và cư trú'],
  ['모두의 한국어', 'Tiếng Hàn cho mọi người'],
  ['정부초청장학금', 'Học bổng Chính phủ Hàn Quốc'],
  ['국제교류처', 'Phòng Giao lưu Quốc tế'],
  ['생활안전망팀', 'Đội An sinh và An toàn'],
  ['서울대학교', 'Đại học Quốc gia Seoul'],
  ['연세대학교', 'Đại học Yonsei'],
  ['고려대학교', 'Đại học Korea'],
  ['우송대학교', 'Đại học Woosong'],
  ['한성대학교', 'Đại học Hansung'],
  ['어학연수', 'đào tạo ngôn ngữ'],
  ['전세사기', 'lừa đảo tiền đặt cọc thuê nhà'],
  ['청약통장', 'tài khoản tiết kiệm nhà ở'],
  ['청약홈', 'Cổng đăng ký nhà ở'],
  ['구인·구직', 'tuyển dụng và tìm việc'],
  ['법무부', 'Bộ Tư pháp Hàn Quốc'],
  ['일반연수', 'đào tạo tổng quát'],
  ['유학', 'du học'],
  ['구직', 'tìm việc'],
  ['수강료', 'học phí'],
  ['유료', 'có thu phí'],
  ['전세', 'thuê nhà bằng tiền đặt cọc lớn'],
  ['월세', 'thuê nhà trả tiền hằng tháng'],
  ['오피스텔', 'căn hộ văn phòng'],
  ['다세대주택', 'nhà ở nhiều hộ'],
  ['단독주택', 'nhà riêng'],
  ['아파트', 'căn hộ chung cư'],
  ['고용24', 'Cổng Việc làm 24'],
  ['중개사', 'đơn vị môi giới'],
  ['의원', 'phòng khám'],
  ['병원', 'bệnh viện'],
  ['종합병원', 'bệnh viện đa khoa'],
  ['내과', 'nội khoa'],
  ['피부과', 'da liễu'],
  ['안과', 'nhãn khoa'],
  ['치과', 'nha khoa'],
  ['산부인과', 'sản phụ khoa'],
  ['정형외과', 'chấn thương chỉnh hình'],
  ['이비인후과', 'tai mũi họng'],
  ['소아청소년과', 'nhi khoa'],
  ['정신건강의학과', 'tâm thần học'],
  ['이력서', 'sơ yếu lý lịch'],
  ['자기소개서', 'thư giới thiệu bản thân'],
  ['동의서', 'giấy đồng ý'],
  ['효성', 'Hyosung'],
  ['기관', 'cơ quan'],
  ['교육부', 'Bộ Giáo dục Hàn Quốc'],
  ['과학기술정보통신부', 'Bộ Khoa học và Công nghệ Thông tin Hàn Quốc'],
  ['대구', 'Daegu'],
  ['서울', 'Seoul'],
  ['대한민국', 'Hàn Quốc'],
  ['유형', 'Loại hình'],
  ['특징', 'Đặc điểm'],
  ['출처', 'Nguồn'],
  ['날짜', 'Ngày'],
  ['력', 'năng lực'],
].sort((a, b) => b[0].length - a[0].length);

function hasHangul(value) {
  return HANGUL_RE.test(String(value || ''));
}

function toVietnameseVisibleText(value) {
  let output = String(value == null ? '' : value);
  for (const [source, translated] of TERMS) output = output.split(source).join(translated);
  // Không để một mảnh tiếng Hàn chưa biên tập lọt ra giao diện/chatbot.
  output = output
    .replace(/[\uac00-\ud7af]+/g, '')
    .replace(/\(\s*\)/g, '')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/([,;:])\s*([,;:])/g, '$1')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .trim();
  return output;
}

module.exports = { hasHangul, toVietnameseVisibleText };
