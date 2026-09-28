'use strict';

const { cleanResearchAnnotations, removeArticleSourceList } = require('./editorialAi');

function plainText(value) {
  return String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ').trim();
}

function isSourceCitationRow(row) {
  const firstCell = row.match(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/i)?.[1] || '';
  return /^(?:nguồn(?:\s+(?:tham khảo(?:\s+chính thức)?|thông tin(?:\s+chính thức)?|dữ liệu|bài viết|chính thức))?|url\s+nguồn(?:\s+tham khảo|\s+chính thức)?|website nguồn)\s*:?$/iu.test(plainText(firstCell));
}

function isSourceCitationParagraph(paragraph) {
  const text = plainText(paragraph);
  return /^(?:(?:nguồn(?:\s+(?:tham khảo(?:\s+chính thức)?|dữ liệu|bài viết|chính thức|thông tin(?:\s+chính thức)?))?|url\s+nguồn(?:\s+tham khảo|\s+chính thức)?|chi tiết\s+nguồn(?:\s+tham khảo)?|tham khảo\s+nguồn(?:\s+chính thức)?|thông tin chi tiết được trích dẫn từ nguồn(?:\s+chính thức)?)(?:\s+chi tiết)?\s*:|nguồn tham khảo chi tiết(?:\s+tại)?\b|nguồn thông tin chính thức được tham khảo tại\b|thông tin chính thức và cập nhật có thể truy cập tại địa chỉ nguồn\b|thông tin chi tiết được cập nhật từ[^.!?]{0,180}\b(?:nguồn|trang|cổng)\b|(?:chi tiết|các chi tiết|thông tin chi tiết) về[^.!?]{0,180}(?:không hiển thị đầy đủ|không được công bố|chưa được công bố)[^.!?]{0,100}(?:cần xem|cần truy cập|có thể tham khảo|tham khảo)\b|(?:để biết thêm thông tin|để đảm bảo tính chính xác)[^.!?]{0,220}\b(?:tham khảo|truy cập)\b|(?:mọi|các) (?:thông tin|dữ liệu|chi tiết)[^.!?]{0,180}(?:(?:bạn đọc|người quan tâm)\s+(?:có thể|nên)\s+tham khảo trực tiếp|vui lòng tham khảo trực tiếp)\s+(?:tại|qua)\b)/iu.test(text);
}

function removeSourceTableColumns(table) {
  const headerRow = table.match(/<thead\b[^>]*>[\s\S]*?<tr\b[^>]*>([\s\S]*?)<\/tr>/iu)?.[1];
  if (!headerRow) return table;
  const headers = [...headerRow.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/giu)];
  const sourceColumns = new Set(headers
    .map((cell, index) => /^(?:nguồn tham khảo|nguồn chính thức|đường dẫn nguồn|url nguồn|link nguồn)$/iu.test(plainText(cell[1])) ? index : -1)
    .filter((index) => index >= 0));
  if (!sourceColumns.size) return table;
  return table.replace(/<tr\b[^>]*>[\s\S]*?<\/tr>/giu, (row) => {
    let index = 0;
    return row.replace(/<t[dh]\b[^>]*>[\s\S]*?<\/t[dh]>/giu, (cell) => (
      sourceColumns.has(index++) ? '' : cell
    ));
  });
}

const BOT_MISSING_INFO = /(?:nguồn chính thức (?:hiện )?(?:không nêu rõ|không công bố|chưa công bố|chưa cung cấp)|nguồn (?:chính thức )?(?:hiện )?(?:không nêu rõ|không công bố|chưa công bố|chưa cung cấp)|chưa (?:được )?(?:nguồn )?(?:miêu tả|công bố|hiển thị|nêu rõ|cung cấp)(?: (?:đầy đủ|chi tiết))?(?: trong nguồn| trên nguồn| trên hệ thống| trên trang)?|không tìm thấy thông tin|không đề cập trong nguồn|hệ thống chưa ghi nhận|cần đối chiếu (?:từ|trên) nguồn|cần hỏi trực tiếp (?:cơ quan|trung tâm|đơn vị|nhà trường)|cần kiểm tra trực tiếp (?:qua|với) cơ quan|thông tin chi tiết .*? chưa được (?:công bố|cung cấp|nêu rõ)|các mốc thời gian .*? chưa được (?:nêu rõ|công bố|cung cấp)|(?:bảng|mức phí|thông tin chi tiết) .*? chưa được công bố|(?:dữ liệu|chỉ tiêu|mức phí|học phí)[^.!?]{0,180}\b(?:cần|phải)\s+(?:được\s+)?(?:đối chiếu|xác minh|kiểm tra)\b)/iu;

const BOT_REPORT_SENTENCE = /(?:hiện tại,?\s*)?nguồn (?:tin )?chính thức (?:không đề cập|không công bố|chưa đề cập|chưa công bố)|(?:mọi|các) (?:thông tin|dữ liệu|chi tiết)\b[^.!?]{0,260}\b(?:cần|phải) (?:được )?(?:đối chiếu|xác minh|kiểm tra)\b|(?:mọi|các) (?:thông tin|dữ liệu|chi tiết)\b[^.!?]{0,260}\b(?:hiện chưa|chưa được) (?:nguồn )?(?:cung cấp|công bố|nêu rõ)|(?:mọi|các) (?:thông tin|dữ liệu|chi tiết)\b[^.!?]{0,220}\b(?:bạn đọc|người quan tâm)\s+(?:có thể|nên)\s+tham khảo trực tiếp (?:tại|qua)\b|dưới đây là bảng tổng hợp (?:các )?(?:thông tin|dữ liệu) hiện có theo nguồn|do nguồn cung cấp tập trung vào[^.!?]{0,240}(?:hiện )?chưa có dữ liệu|nội dung được biên tập từ tài liệu công khai của cơ quan phát hành|các mức phí, thời hạn và thủ tục có thể được cập nhật|(?:do đó,?\s*)?(?:mọi )?(?:quy định pháp lý|yêu cầu về visa|tiêu chí tuyển dụng)[^.!?]{0,180}(?:không được hiển thị|không công bố|chưa được công bố)[^.!?]*|(?:do (?:giao diện|hệ thống) (?:trang web )?[^.!?]{0,180}(?:không hiển thị|hiển thị hạn chế)|(?:vị trí|điều kiện|chi tiết)[^.!?]{0,100}chỉ được công bố trong tệp đính kèm)[^.!?]*|(?:người quan tâm|ứng viên|người dùng)\s+(?:bắt buộc|cần) phải (?:tải|truy cập)[^.!?]*(?:tệp|tệp tin|tài liệu|nguồn chính thống)[^.!?]*|(?:người quan tâm|ứng viên|người dùng)\s+(?:bắt buộc|cần) phải tải (?:tệp|tệp tin|tài liệu) gốc[^.!?]*|do tình trạng tiếp nhận có thể thay đổi[^.!?]*|[^.!?]{0,180}\b(?:cần|phải) (?:được )?(?:đối chiếu|xác minh|kiểm tra)\b[^.!?]{0,140}\b(?:cổng thông tin|cổng|cơ quan|nguồn|đơn vị tổ chức)\b/iu;

function splitSentences(value) {
  return String(value || '').split(/(?<=[.!?])\s+(?=\p{L})/u);
}

function cleanTextRun(value) {
  const sourceCleaned = String(value || '')
    .replace(/\s*\((?:xem chi tiết|chi tiết(?: cụ thể)?)[^)]*(?:nguồn chính thức|trong nguồn|tại nguồn)[^)]*\)/giu, '')
    .replace(/\s*\((?:cần|phải) (?:kiểm tra|đối chiếu|xác minh|tải về)[^)]*\)/giu, '')
    .replace(/\.?\s*(?:xem|tham khảo) chi tiết trong nguồn chính thức[^.!?]*/giu, '')
    .replace(/^\s*(?:theo thông tin ghi nhận từ hệ thống|theo dữ liệu ghi nhận từ hệ thống),?\s*/iu, '');
  const sentences = splitSentences(sourceCleaned);
  const cleaned = sentences.map((sentence) => {
    // A factual contact line sometimes ends with a generic verification caveat.
    // Drop only that tail, retaining phone numbers, addresses and real contacts.
    const factualContact = sentence.replace(/,\s*(?:với|trong đó)\s+(?:các?\s+)?(?:mốc thời gian|thời gian|ngày tháng|chi tiết)[^.!?]{0,100}\b(?:cần|phải)\s+(?:được\s+)?(?:đối chiếu|xác minh|kiểm tra)[^.!?]*/iu, '');
    if (factualContact !== sentence && /(?:\+?\d[\d\s()+-]{5,}|tổng đài|điện thoại|email|địa chỉ)/iu.test(plainText(factualContact))) {
      return factualContact.trim();
    }
    return cleanStatusSentence(sentence);
  }).filter(Boolean);
  return cleaned.join(' ').trim();
}

function cleanStatusSentence(sentence) {
  const text = plainText(sentence);
  // Keep genuinely useful contact instructions when a scraper/editor appended
  // them to a generic missing-data disclaimer.
  if (/^(?:mọi|các) (?:thông tin|dữ liệu|chi tiết)\b/i.test(text)) {
    const contact = text.match(/(?:bạn đọc|người quan tâm|công dân|người nộp đơn|du học sinh)\s+(?:có thể|nên|cần)\s+(?:liên hệ|gọi|truy cập|đến trực tiếp)[^.!?]*/iu);
    if (contact && (BOT_MISSING_INFO.test(text) || BOT_REPORT_SENTENCE.test(text))) {
      return contact[0].replace(/\s+(?:hoặc )?tham khảo nguồn chính thức.*$/iu, '').trim();
    }
  }
  if (isSourceCitationParagraph(sentence) || BOT_MISSING_INFO.test(text) || BOT_REPORT_SENTENCE.test(text)) return '';
  return String(sentence)
    .replace(/^\s*Dựa trên dữ liệu thông báo được công bố ngày\s+/iu, 'Thông báo được công bố ngày ')
    .replace(/^\s*(?:Dựa trên|Theo) dữ liệu từ (trang|cổng|website)\s+/iu, 'Theo $1 ')
    .replace(/^\s*Theo dữ liệu từ hệ thống,?\s*/iu, 'Thông tin về ')
    .replace(/^\s*Hệ thống ghi nhận\s+/iu, '')
    .replace(/\bVề ngày công bố thông tin, hệ thống ghi nhận vào ngày\s+(\d{1,2}\/\d{1,2}\/\d{4})/iu, 'Thông báo được đăng ngày $1');
}

function cleanBotReportParagraph(block) {
  if (isSourceCitationParagraph(block)) return '';
  const opening = block.match(/^<p\b[^>]*>/iu)?.[0] || '';
  const body = block.slice(opening.length).replace(/<\/p>\s*$/iu, '');
  const cleaned = cleanTextRun(body);
  return cleaned ? `${opening}${cleaned}</p>` : '';
}

function cleanMissingValue(value) {
  return String(value || '')
    .replace(/\s*\((?=[^)]*(?:nguồn chính thức|nguồn|chưa được công bố|chưa được nêu rõ|chưa rõ|xem chi tiết tại nguồn chính thức))[^)]*\)/giu, '')
    .replace(/xem chi tiết trong nguồn chính thức(?:\s+từ[^,;.!?)]*)?/giu, '')
    .replace(/vị trí và điều kiện trong tệp/giu, '')
    .replace(/(?:nguồn chính thức hiện không nêu rõ|nguồn chính thức không công bố|nguồn chính thức chưa cung cấp|chưa được (?:nguồn )?(?:công bố|nêu rõ|cung cấp|hiển thị)(?: chi tiết| đầy đủ)?|không đề cập trong nguồn|chưa rõ|không rõ|cần đối chiếu qua cổng thông tin)(?:[^,;.!?)]*)?/giu, '')
    .replace(/(?:mức phí|đối tượng|thời hạn|kỳ tuyển sinh|quy cách|lịch nghỉ) (?:cụ thể )?cần (?:đối chiếu|kiểm tra) (?:trực tiếp )?(?:tại|với|qua|từ) (?:cổng|nguồn|cơ quan|trường)[^,;.!?)]*/giu, '')
    .replace(/(?:mức phí|học phí|đối tượng|thời hạn|kỳ tuyển sinh|điều kiện)(?:\s+[^,;.!?)]{1,70})?\s+cần\s+(?:được\s+)?(?:đối chiếu|xác minh|kiểm tra)\s+(?:trực tiếp\s+)?(?:tại|với|qua|từ|trên)\s+(?:cổng thông tin|cổng|nguồn|cơ quan|đơn vị tổ chức)[^,;.!?)]*/giu, '')
    .replace(/\(\s*(?:chi tiết số tiền cụ thể|mức phí cụ thể)[^)]*\bcần\s+(?:được\s+)?(?:đối chiếu|xác minh|kiểm tra)[^)]*\)/giu, '')
    .replace(/[)\]}.,;:\s]+$/gu, '')
    .replace(/\s{2,}/g, ' ').trim();
}

function cleanExistingArticleContent(value) {
  let html = removeArticleSourceList(cleanResearchAnnotations(String(value || '')));

  // Remove the standard crawler disclosure block (it is editorial metadata,
  // not article content) while retaining other useful headings about sources.
  html = html.replace(/<h[2-4]\b[^>]*>\s*Nguồn chính thức và phạm vi cập nhật\s*<\/h[2-4]>\s*<p\b[^>]*>[\s\S]*?<\/p>\s*/giu, '');

  // Older crawler output prepended the source site's breadcrumb, font controls,
  // and article counter to the first real paragraph.
  html = html.replace(
    /(<p\b[^>]*>)\s*Trang\s+chủ\s*&gt;[^<]{0,700}?\bAa\s+\d+[^<]{0,500}?\bGiảm\s+cỡ\s+chữ\s*[-–]\s*/iu,
    '$1',
  );

  // Remove the captured source-page links while preserving source_urls metadata.
  html = html.replace(/<p\b[^>]*>[\s\S]*?<\/p>/giu, cleanBotReportParagraph);
  // Older scrapes often used loose text and <br> tags instead of paragraphs.
  // Clean each text node independently so headings, tables and inline links remain intact.
  html = html.replace(/(^|>)([^<]+)(?=<|$)/gu, (match, prefix, text) => `${prefix}${cleanTextRun(text)}`);
  html = html.replace(/(?:<br\s*\/?\s*>\s*)*(?:Nguồn\s+(?:tham khảo(?:\s+chính thức)?|dữ liệu|bài viết|chính thức)|URL\s+nguồn(?:\s+tham khảo|\s+chính thức)?|Chi tiết\s+nguồn\s+tham khảo)\s*:\s*(?:<a\b[^>]*>[\s\S]*?<\/a>|https?:\/\/[^\s<]+)/giu, '');
  html = html.replace(/(?:<br\s*\/?\s*>\s*)*(?:Tham khảo\s+nguồn(?:\s+chính thức)?(?:\s+tại)?|Chi tiết\s+nguồn(?:\s+tham khảo)?|Thông tin chi tiết được trích dẫn từ nguồn(?:\s+chính thức)?(?:\s+tại)?)\s*:?\s*(?:<a\b[^>]*>[\s\S]*?<\/a>|https?:\/\/[^\s<]+|[^<.]{0,180})(?:\.?)/giu, '');
  html = html.replace(/(?:<h[2-4]\b[^>]*>\s*)?(?:Nguồn thông tin chính thức từ\s+[^<.]{1,180}|Nội dung được trích dẫn từ nguồn chính thức(?:\s+tại)?[^<.]{0,180})(?:\s*<\/h[2-4]>)?\.?/giu, '');
  html = html.replace(/<h[2-4]\b[^>]*>\s*Nguồn chính thức\s*<\/h[2-4]>\s*(?:(?:<p\b[^>]*>[\s\S]*?<\/p>)|(?:<ul\b[^>]*>[\s\S]*?<\/ul>))\s*$/iu, '');
  html = html.replace(/\s*\((?:xem chi tiết|chi tiết(?: cụ thể)?)[^)]*(?:nguồn chính thức|trong nguồn|tại nguồn)[^)]*\)/giu, '');
  html = html.replace(/<tr\b[^>]*>[\s\S]*?<\/tr>/giu, (row) => (
    isSourceCitationRow(row) ? '' : row
  ));
  html = html.replace(/<p\b[^>]*>[\s\S]*?<\/p>/giu, cleanBotReportParagraph);
  html = html.replace(/<tr\b[^>]*>[\s\S]*?<\/tr>/giu, (row) => {
    const cells = [...row.matchAll(/<(td|th)\b([^>]*)>([\s\S]*?)<\/\1>/giu)];
    if (!cells.length) return row;
    const values = cells.map((cell) => cleanMissingValue(cell[3]));
    const rowText = plainText(row);
    if (!values.some((value, index) => value !== cells[index][3])
      && !/<td\b[^>]*>\s*<\/td>/iu.test(row)
      && !BOT_MISSING_INFO.test(rowText)
      && !/(?:nguồn chính thức hiện không nêu rõ|chưa được công bố|chưa được nêu rõ|chưa rõ|không rõ|cần đối chiếu|cần xác minh|cần kiểm tra|xem chi tiết trong nguồn chính thức)/iu.test(rowText)) return row;
    const valueCells = values.slice(1).map(plainText);
    if (valueCells.some((value) => !value || /^(?:chưa rõ|không rõ)$/iu.test(value))) return '';
    let index = 0;
    return row.replace(/<(td|th)\b([^>]*)>([\s\S]*?)<\/\1>/giu, (cell, tag, attributes) => {
      const content = cleanMissingValue(cells[index++][3]);
      return `<${tag}${attributes}>${content}</${tag}>`;
    });
  });
  html = html.replace(/<table\b[^>]*>[\s\S]*?<\/table>/giu, (table) => {
    const withoutSources = removeSourceTableColumns(table);
    return /<td\b/i.test(withoutSources) ? withoutSources : '';
  });

  // Remove headings whose entire section was just a missing-data placeholder.
  html = html.replace(/<h([2-6])\b[^>]*>[^<]*<\/h\1>\s*(?:(?:<br\s*\/?\s*>\s*)|(?:<p\b[^>]*>\s*<\/p>\s*))*(?=<h[2-6]\b|<\/(?:div|table|section)>|$)/giu, '');

  // Social controls and related-story/footer markup were sometimes flattened
  // together with the article, followed by the page's print/read-aloud script.
  const pageChrome = /Thích\s+\d+\s+Chia\s+sẻ\s*(?:--&gt;|-->|→)/iu;
  const chromeIndex = html.search(pageChrome);
  if (chromeIndex >= 0) {
    html = html.slice(0, chromeIndex);
    if (html.lastIndexOf('<p') > html.lastIndexOf('</p>')) html += '</p>';
  }

  return html
    .replace(/<(p|div|h[2-6]|tbody|thead)\b[^>]*>\s*<\/\1>/giu, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

module.exports = { cleanExistingArticleContent };
