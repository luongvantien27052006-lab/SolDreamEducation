'use strict';

const TOPICS = Object.freeze([
  { id: 'thong-tin-han-quoc', label: 'Thông tin Hàn Quốc', description: 'Thông tin về học tiếng, trường, chương trình và chuẩn bị du học Hàn Quốc.' },
  { id: 'cam-nang-sinh-hoat', label: 'Cẩm nang sinh hoạt', description: 'Kinh nghiệm chuẩn bị chỗ ở, chi tiêu và thích nghi với đời sống tại Hàn Quốc.' },
  { id: 'hoat-dong-soldream', label: 'Cuộc sống SolDream', description: 'Hành trình, đội ngũ, lớp học và các hoạt động được SOL DREAM EDUCATION công bố.' },
]);

const TOPIC_IDS = new Set(TOPICS.map((topic) => topic.id));

function normalizeTopic(value) {
  return TOPIC_IDS.has(String(value || '').trim()) ? String(value).trim() : '';
}

function topicLabel(value) {
  return TOPICS.find((topic) => topic.id === value)?.label || TOPICS[0].label;
}

function inferTopic(item = {}) {
  const INFO = 'thong-tin-han-quoc', LIFE = 'cam-nang-sinh-hoat', ACTIVITY = 'hoat-dong-soldream';
  const clean = (value) => String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().toLocaleLowerCase('vi');
  const title = clean(item.title);
  const category = clean(item.category || item.suggested_section);
  const rawExcerpt = clean(item.excerpt);
  // Crawler placeholders and whole-page menus are not evidence of the subject.
  const excerpt = /^bot phát hiện nội dung này/.test(rawExcerpt) ? '' : rawExcerpt;
  const brand = /sol\s*dream(?:ers)?|\bsde\b|cô ba sài gòn|co ba sai gon/;
  if (brand.test(title)) {
    if (/danh mục trường|danh sách trường|học phí|khóa học|các lớp tiếng hàn/.test(title)) return INFO;
    return ACTIVITY;
  }
  if (/(?:hoạt động|cuộc sống) sol\s*dream/.test(category)) return ACTIVITY;
  if (/tuyển dụng|tuyển giáo viên|tuyển nhân viên/.test(title)
    && /^(?:sol\s*dream(?:\s*education)?|sde)\s+(?:tuyển|đang tuyển)/.test(excerpt)) return ACTIVITY;
  if (item.source_type === 'university-directory') return INFO;

  // Main educational intent takes precedence over incidental housing/living costs.
  const education = /học bổng|tuyển sinh|nhập học|học phí|chương trình trao đổi sinh viên|đào tạo (?:và bồi dưỡng )?ngoại ngữ|chương trình đào tạo ngôn ngữ|khóa tiếng hàn|gks|scholarship|admission|모집요강|입학|외국인전형/;
  const residentCenter = /foreign residents? center|seoulglobal(?:student)?center|global (?:village|student|youth education)?\s*center|trung tâm (?:cư dân|cư trú|làng toàn cầu)|ichon|seorae|danuri/.test(title);
  const administrativeNews = /sole-source contract|contract (?:details|conclusion)|khảo sát|satisfaction survey|vision.*mission|tầm nhìn|sứ mệnh|cơ cấu tổ chức|organization structure|^about us$|^timeline of key news$|lời chúc|new year.*greetings|tập huấn|bồi dưỡng nghiệp vụ|đào tạo (?:cơ quan đại diện|nghiệp vụ)|대행기관.*교육/;
  if (administrativeNews.test(title)) return INFO;
  if (/hoàn tất công tác bảo hộ|tổng quan.*(?:visa|bộ việc làm|chính sách việc làm)|ministry of employment|^employment policy$|lao động thời vụ|seasonal worker|đầu tư định cư|iispb|study in korea|định hướng.*(?:2018|2019)|danh sách.*(?:cơ sở y tế|nhân sự)|giới thiệu.*(?:viện|cục quản lý)|chức năng và nhiệm vụ/.test(title)) return INFO;
  if (['official-news', 'official-scholarship', 'visa-center', 'embassy'].includes(item.source_type)) return INFO;
  if (['official-guide', 'official-living'].includes(item.source_type)) return LIFE;
  if (!residentCenter && education.test(title)) return INFO;
  if (/xin (?:cấp )?visa|hồ sơ.*visa|visa du học|student visa|immigration & visa|e-?arrival|nhập cảnh|apostille|hợp pháp hóa|thẩm tra|kvac|phiếu lý lịch tư pháp/.test(title)
      && !/cư trú|lưu trú|gia hạn|chuyển đổi|quyền|cư dân|resident|visa extension|e-7-4/.test(title)) return INFO;
  if (residentCenter) return LIFE;
  if (/giáo dục nghệ thuật|nhà tiếp thị|đào tạo nhân lực y tế|di cư.*kết hôn|chương trình học tiếng hàn tại|korean (?:language (?:education|study|classes)|language$)|기타\/홍보.*(?:축제|양성교육)|산학연협력.*외국인유학생|f-2-r|foreign residents|counseling support|village lawyers|visa (?:extension|guide special lecture)|labor (?:standards|relations)/.test(title)) return LIFE;
  const living = /sinh hoạt|đời sống|cuộc sống|thích nghi|trưởng thành|ký túc xá|thuê nhà|nhà ở|bảo hiểm|khám (?:chữa bệnh|tổng quát)|dịch vụ y tế|sức khỏe|thai sản|sơ cứu|an toàn lao động|tiêu chuẩn lao động|quan hệ lao động|tìm việc|việc làm|tuyển dụng|tư vấn.*nghề nghiệp|định hướng nghề nghiệp|bảo hộ công dân|cảnh báo chính thức|lệ phí lãnh sự|thủ tục lãnh sự|cư trú|định cư và hòa nhập|hỗ trợ định cư|gia hạn visa|e-7-4|xác nhận chữ ký|1345|khẩn cấp|luật sư|giam giữ|giáo dục.*con em|ẩm thực|văn hóa|giao thông|đi lại|làm thêm|living|housing|dormitory|employment|job seek|career|recruitment|medical|health|insurance|safety|first aid|visa navigator|residence|settlement|detention|signature verification|취업|채용|기숙사|보험|생활|체류|친구사귀기|힐링 모임|청사 이전/;
  if (living.test(title)) return LIFE;
  if (/^(?:thông tin trường|trường đại học|chương trình du học|du học hàn quốc)$/.test(category)) return INFO;
  // Use a short editorial summary only as a fallback, never scraped source_text.
  if (!item.source_type && excerpt.length < 650 && living.test(excerpt) && !education.test(title)) return LIFE;
  return INFO;
}

function getTopics(){return TOPICS.map(topic=>({...topic,label:require('./siteContent').siteText('topic.'+topic.id+'.label'),description:require('./siteContent').siteText('topic.'+topic.id+'.description')}));}
function displayTopicLabel(id){return getTopics().find(t=>t.id===id)?.label||topicLabel(id);}
module.exports = { TOPICS, getTopics, displayTopicLabel, normalizeTopic, topicLabel, inferTopic };
