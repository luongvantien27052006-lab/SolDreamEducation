'use strict';

const db = require('../db');
const { stripHtml, programPublicPath } = require('./util');
const {waitForResendSlot}=require('./resendRateLimit');
let delivering=false;

const BASE_URL = String(process.env.BASE_URL || process.env.SITE_URL || 'http://localhost:3000').replace(/\/$/, '');

function normalized(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function meaningfulTokens(value) {
  const ignored = new Set(['thong','tin','truong','dai','hoc','chuong','trinh','du','han','quoc','ve','khoa','bai','viet','muon','nhan','tim','hieu']);
  return normalized(value).split(/\s+/).filter((word) => word.length >= 3 && !ignored.has(word));
}

function contentRecord(type, id) {
  if (type === 'post') {
    const row = db.prepare('SELECT * FROM posts WHERE id=? AND published=1').get(id);
    return row && { ...row, type, path: `/tin-tuc/${row.slug}`, title: row.title, excerpt: row.excerpt || stripHtml(row.content).slice(0, 360), group: 'study_abroad' };
  }
  if (type === 'program') {
    const row = db.prepare('SELECT * FROM programs WHERE id=? AND published=1').get(id);
    if (!row) return null;
    return { ...row, type, path: programPublicPath(row), title: row.title, excerpt: row.excerpt || stripHtml(row.content).slice(0, 360), group: row.category === 'Thông tin trường' ? 'school_info' : 'study_abroad' };
  }
  if (type === 'course') {
    const row = db.prepare('SELECT * FROM courses WHERE id=? AND published=1').get(id);
    return row && { ...row, type, path: `/khoa-hoc/${row.slug || row.id}`, title: row.name, excerpt: row.bluf_summary || row.description, group: 'course' };
  }
  return null;
}

function leadMatchesContent(lead, content) {
  if (!lead || !content || !lead.subscription_active || !lead.email) return false;
  if (lead.source_path && lead.source_path !== '/' && lead.source_path === content.path) return true;
  if (lead.lead_type !== content.group) return false;
  const requested = lead.interest_detail || (lead.source_path && lead.source_path !== '/' ? lead.source_title : '') || lead.interest;
  const tokens = meaningfulTokens(requested);
  if (content.group === 'school_info') return tokens.length > 0 && tokens.some((token) => normalized(`${content.title} ${content.excerpt}`).includes(token));
  if (content.group === 'course') return tokens.length > 0 && tokens.some((token) => normalized(`${content.title} ${content.excerpt}`).includes(token));
  if (!lead.interest_detail && /du học hàn quốc/i.test(lead.interest || '')) return content.type === 'program';
  return tokens.length > 0 && tokens.some((token) => normalized(`${content.title} ${content.excerpt}`).includes(token));
}

function queueSubscriberNotifications(type, id) {
  const content = contentRecord(type, id);
  if (!content) return 0;
  const leads = db.prepare("SELECT * FROM leads WHERE subscription_active=1 AND email!=''").all();
  const insert = db.prepare(`INSERT OR IGNORE INTO subscriber_notifications
    (lead_id,content_type,content_id,content_title,content_excerpt,content_path)
    VALUES (?,?,?,?,?,?)`);
  let queued = 0;
  db.transaction(() => {
    leads.filter((lead) => leadMatchesContent(lead, content)).forEach((lead) => {
      queued += insert.run(lead.id, type, String(id), content.title, stripHtml(content.excerpt).slice(0, 500), content.path).changes;
    });
  })();
  return queued;
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (character) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[character]);
}

function emailPayload(row) {
  const detailUrl = `${BASE_URL}${row.content_path}`;
  const unsubscribeUrl = `${BASE_URL}/api/unsubscribe?token=${encodeURIComponent(row.unsubscribe_token)}`;
  const subject = `Có thông tin mới về nội dung bạn quan tâm: ${row.content_title}`;
  const excerpt = stripHtml(row.content_excerpt).slice(0, 420);
  const html = `<div style="font-family:Arial,sans-serif;line-height:1.65;color:#2c1b3d;max-width:640px;margin:auto"><p>Xin chào ${escapeHtml(row.name)},</p><h1 style="font-size:24px">Có thông tin mới về nội dung bạn đã đăng ký</h1><h2 style="font-size:19px">${escapeHtml(row.content_title)}</h2><p>${escapeHtml(excerpt)}</p><p><a href="${escapeHtml(detailUrl)}" style="display:inline-block;background:#a40f55;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:700">Xem chi tiết trên website</a></p><p style="font-size:13px;color:#6f6476">Bạn nhận email này vì đã đăng ký “${escapeHtml(row.interest)}” tại SOL DREAM EDUCATION. <a href="${escapeHtml(unsubscribeUrl)}">Dừng nhận thông tin</a>.</p></div>`;
  const text = `Xin chào ${row.name},\n\nCó thông tin mới về nội dung bạn đã đăng ký:\n${row.content_title}\n\n${excerpt}\n\nXem chi tiết: ${detailUrl}\n\nDừng nhận thông tin: ${unsubscribeUrl}`;
  return { subject, html, text, detailUrl };
}

async function postJson(url, headers, body) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body), signal: controller.signal });
    const result=await response.json().catch(()=>({}));
    if (!response.ok){const error=new Error(`Email HTTP ${response.status}${/^[a-z_]{1,60}$/i.test(result.name||'')?' ('+result.name+')':''}`);error.status=response.status;throw error;}
    return result;
  } finally { clearTimeout(timer); }
}

async function sendSubscriberEmail(row) {
  const mail = emailPayload(row);
  if (process.env.RESEND_API_KEY && process.env.SUBSCRIBER_EMAIL_FROM) {
    await waitForResendSlot();
    const result=await postJson('https://api.resend.com/emails', { 'content-type':'application/json', authorization:`Bearer ${process.env.RESEND_API_KEY}`, 'Idempotency-Key':`subscriber-update/${row.id}` }, {
      from: process.env.SUBSCRIBER_EMAIL_FROM, to: [row.email], subject: mail.subject, html: mail.html, text: mail.text,
    });
    if(!result.id)throw new Error('Resend chưa trả mã email.');
    return {id:String(result.id)};
  }
  if (process.env.SUBSCRIBER_EMAIL_WEBHOOK_URL) {
    await postJson(process.env.SUBSCRIBER_EMAIL_WEBHOOK_URL, { 'content-type':'application/json' }, {
      event: 'subscriber_content_update', to: row.email, name: row.name, subject: mail.subject, html: mail.html, text: mail.text,
      contentUrl: mail.detailUrl, leadId: row.lead_id,
    });
    return {id:''};
  }
  return false;
}

async function deliverPendingNotifications(limit = 30) {
  if (!(process.env.RESEND_API_KEY && process.env.SUBSCRIBER_EMAIL_FROM) && !process.env.SUBSCRIBER_EMAIL_WEBHOOK_URL) return { configured: false, sent: 0, failed: 0 };
  if(delivering)return {configured:true,sent:0,failed:0};
  delivering=true;
  let sent = 0; let failed = 0;
  try{
  const now=Date.now();
  db.prepare("UPDATE subscriber_notifications SET status=CASE WHEN attempts>=5 THEN 'failed' ELSE 'pending' END,lease_until_ms=0 WHERE status='sending' AND lease_until_ms<?").run(now);
  const rows = db.prepare(`SELECT n.*,l.name,l.email,l.interest,l.unsubscribe_token FROM subscriber_notifications n
    JOIN leads l ON l.id=n.lead_id WHERE n.status='pending' AND n.attempts<5 AND n.next_attempt_ms<=? AND l.subscription_active=1
    ORDER BY n.id LIMIT ?`).all(now,Math.max(1, Math.min(100, Number(limit) || 30)));
  for (const row of rows) {
    const claimed=db.prepare("UPDATE subscriber_notifications SET status='sending',attempts=attempts+1,lease_until_ms=?,updated_at=datetime('now','localtime') WHERE id=? AND status='pending' AND next_attempt_ms<=?").run(Date.now()+120000,row.id,Date.now());
    if(!claimed.changes)continue;
    try {
      const result=await sendSubscriberEmail(row);
      if(!result)throw new Error('Chưa cấu hình dịch vụ gửi email.');
      db.prepare("UPDATE subscriber_notifications SET status='sent',sent_at=datetime('now','localtime'),provider_message_id=?,lease_until_ms=0,last_error='',updated_at=datetime('now','localtime') WHERE id=?").run(result.id,row.id);
      sent += 1;
    } catch (error) {
      db.prepare("UPDATE subscriber_notifications SET last_error=?,status=CASE WHEN attempts>=5 THEN 'failed' ELSE 'pending' END,lease_until_ms=0,next_attempt_ms=?,updated_at=datetime('now','localtime') WHERE id=?").run(error.name==='AbortError'?'Dịch vụ gửi email chưa phản hồi.':String(error.message||'Chưa kết nối được dịch vụ gửi email.').slice(0,300),Date.now()+Math.min(3600000,60000*2**row.attempts),row.id);
      failed += 1;
      if([401,403].includes(error.status))break;
    }
  }
  }finally{delivering=false;}
  return { configured: true, sent, failed };
}

function notifySubscribersForContent(type, id) {
  const queued = queueSubscriberNotifications(type, id);
  if (queued) setImmediate(() => deliverPendingNotifications().catch((error) => console.error('[subscriber-email]', error.message)));
  return queued;
}

function startSubscriberNotificationWorker() {
  const run = () => deliverPendingNotifications().catch((error) => console.error('[subscriber-email]', error.message));
  const timer = setInterval(run, 5 * 60 * 1000);
  timer.unref?.();
  setTimeout(run, 5000).unref?.();
  return timer;
}

module.exports = { normalized, meaningfulTokens, leadMatchesContent, contentRecord, queueSubscriberNotifications, emailPayload, deliverPendingNotifications, notifySubscribersForContent, startSubscriberNotificationWorker };
