'use strict';
const GUIDANCE_DOMAINS = Object.freeze(['liveinkorea.kr','global.seoul.go.kr','nhis.or.kr','incheon.go.kr']);
const GUIDANCE_SCOPE = 'Chỉ lấy dịch vụ hỗ trợ đời sống và tư vấn cho người nước ngoài/gia đình đa văn hóa tại Hàn Quốc: kênh trợ giúp đa ngôn ngữ, đường dây nóng và trung tâm tư vấn; học tiếng Hàn/học trực tuyến miễn phí; tài liệu hoặc video hướng dẫn sinh hoạt; chính sách hỗ trợ cư dân; an toàn, sức khỏe và bảo hiểm y tế cho người nước ngoài; phòng chống lừa đảo, đặc biệt hôn nhân quốc tế. Không tìm tin tuyển sinh, học bổng, học phí, thủ tục visa độc lập, tuyển dụng, du lịch, giải trí hoặc tin hành chính của cơ quan. Chính sách chỉ nhận khi trực tiếp giải thích dịch vụ/quyền lợi hỗ trợ đời sống nêu trên. Không thêm nội dung ngoài phạm vi này chỉ vì xuất hiện trong menu website.';
const GUIDANCE_KEYWORDS = 'foreign resident support services,multicultural family support,multilingual counseling,Danuri helpline,free Korean classes,free online learning,living guide resources,health safety guidance,foreign residents health insurance,international marriage fraud prevention,다문화가족 지원,외국인 생활지원,다누리콜센터,다국어 상담,무료 한국어,온라인 학습,생활 안내,건강보험,안전 교육,국제결혼 피해 상담';
function fold(value){return String(value||'').replace(/<[^>]*>/g,' ').normalize('NFD').replace(/[\u0300-\u036f]/g,'').normalize('NFC').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase().replace(/\s+/g,' ').trim();}
function isGuidanceService(item={},source={}){
  const title=fold(item.title);if(!title)return false;
  // A page menu or the source keywords cannot establish an article's subject.
  const context=fold([item.title,item.excerpt,source.name||source.source_name].filter(Boolean).join(' '));
  if(/(?:scholarship|\bgks\b|hoc bong|university ranking|xep hang|장학|tuyen dung|job vacancies|job openings|채용|du lich|tourism|giai tri|entertainment|sole.source contract|dau thau|hop dong mua sam|co cau to chuc|le ky niem|le trao giai|hop bao|award ceremony|anniversary ceremony|press release|organization structure|보도자료|입찰)/.test(title))return false;
  const freeLearning=/(?:mien phi|\bfree\b|무료)/.test(title+' '+fold(item.excerpt).slice(0,250))&&/(?:tieng han|korean|한국어|hoc truc tuyen|online learning|온라인 학습)/.test(title);
  if(!freeLearning&&/(?:tuyen sinh|nhap hoc|hoc phi|admissions?|tuition|모집요강|입학|등록금)/.test(title))return false;
  if(/(?:\bvisa\b|thi thuc|thu tuc xuat nhap canh|비자|사증)/.test(title)
    && !/(?:tu van|duong day nong|counsel|consultation|helpline|hotline|help.?desk|상담|콜센터)/.test(title))return false;
  const audience=/(?:nguoi nuoc ngoai|cu dan nuoc ngoai|gia dinh da van hoa|nguoi nhap cu|foreign(?:ers| residents| nationals| students)?|multicultural|migrants?|immigrants?|danuri|다누리|다문화|외국인|이민자|이주민|결혼이민)/.test(context);
  if(!audience)return false;
  const residentSupport=/(?:ho tro|tro giup|quyen loi|phuc loi)/.test(title)&&/(?:nguoi nuoc ngoai|cu dan|gia dinh|nhap cu|sinh hoat|cuoc song|hon nhan|da van hoa)/.test(title);
  const counseling=residentSupport||/(?:tu van|duong day nong|kenh lien he|counsel|consultation|helpline|hotline|help.?desk|support service|support cent(?:er|re)|family support|resident support|assistance|1577.?1366|02.?333.?1311|상담|콜센터|생활지원|지원센터|다문화.*지원|외국인.*지원)/.test(title);
  const health=/(?:suc khoe|bao hiem y te|cham soc y te|kham chua benh|kham benh|an toan|health|medical|safety|건강|건강보험|안전)/.test(title);
  const fraud=/(?:phong chong lua dao|canh bao lua dao|bao ve nan nhan|hon nhan quoc te|fraud prevention|scam alert|marriage fraud|international marriage|사기|국제결혼|피해 상담)/.test(title);
  const resources=/(?:tai lieu|video huong dan|cam nang sinh hoat|cam nang sinh song|cam nang.*cu dan|living guide|living in korea|support services|guidebook|생활 안내|생활가이드|안내서)/.test(title);
  return counseling||health||fraud||resources||freeLearning;
}
module.exports={GUIDANCE_DOMAINS,GUIDANCE_SCOPE,GUIDANCE_KEYWORDS,isGuidanceService};
