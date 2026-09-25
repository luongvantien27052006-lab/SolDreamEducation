'use strict';

function withTimeout(ms) { const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), ms); return { signal: controller.signal, done: () => clearTimeout(timer) }; }

async function postJson(url, payload) {
  if (!/^https:\/\/[^\s]+$/i.test(String(url || ''))) throw new Error('Notification URL must use HTTPS');
  const timeout = withTimeout(7000);
  try {
    const response = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload), signal: timeout.signal });
    if (!response.ok) throw new Error(`Notification HTTP ${response.status}`);
  } finally { timeout.done(); }
}

async function notifyHotline(lead) {
  const categories = { study_abroad: 'Tư vấn chương trình du học', course: 'Tư vấn khóa học', school_info: 'Đăng ký nhận thông tin trường' };
  const baseUrl = String(process.env.BASE_URL || process.env.SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
  const pageUrl = `${baseUrl}${lead.source_path || '/'}`;
  const message = `Yêu cầu liên hệ mới\nNhóm: ${categories[lead.lead_type] || 'Tư vấn'}\nKhách: ${lead.name}\nSĐT: ${lead.phone}\nEmail: ${lead.email || 'Chưa cung cấp'}\nNhu cầu: ${lead.interest || 'Chưa chọn'}${lead.interest_detail ? `\nThông tin cụ thể: ${lead.interest_detail}` : ''}\nTrang liên quan: ${lead.source_title || 'Trang đăng ký'}\nLiên kết: ${pageUrl}`;
  if (process.env.CONTACT_WEBHOOK_URL) { await postJson(process.env.CONTACT_WEBHOOK_URL, { event: 'new_lead', message, lead }); return true; }
  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_HOTLINE_CHAT_ID) {
    const token = String(process.env.TELEGRAM_BOT_TOKEN);
    if (!/^[\w:-]+$/.test(token)) throw new Error('Telegram token format is invalid');
    await postJson(`https://api.telegram.org/bot${token}/sendMessage`, { chat_id: process.env.TELEGRAM_HOTLINE_CHAT_ID, text: message }); return true;
  }
  return false;
}

module.exports = { notifyHotline };
