'use strict';

const express = require('express');
const crypto = require('crypto');
const db = require('../db');
const { notifyHotline } = require('../lib/leadNotifier');
const { cleanPath, getLeadContext } = require('../lib/leadContext');
const {
  ContactSpamGuard, normalizePhone, isValidVietnamesePhone, isValidName, assessFormTiming,
} = require('../lib/contactSpamGuard');
const router = express.Router();
const spamGuard = new ContactSpamGuard();

function requestIsSameSite(req) {
  if (req.get('sec-fetch-site') === 'cross-site') return false;
  const origin = req.get('origin');
  if (!origin) return true;
  try { return new URL(origin).host === req.get('host'); }
  catch (_) { return false; }
}

router.post('/contact', async (req, res) => {
  if (!requestIsSameSite(req)) return res.status(403).json({ error: 'Yêu cầu gửi tư vấn không hợp lệ.' });

  const ip = req.ip || req.socket?.remoteAddress || 'unknown';
  const phone = normalizePhone(req.body.phone);
  if (String(req.body.website || '').trim()) {
    spamGuard.consume(ip, phone, 'honeypot');
    return res.status(202).json({ ok: true, message: 'Đã nhận yêu cầu.' });
  }

  const timing = assessFormTiming(req.body.formStartedAt);
  const rate = spamGuard.consume(ip, phone, timing.ok ? 'submitted' : `timing-${timing.reason}`);
  if (!rate.allowed) {
    res.set('Retry-After', String(rate.retryAfterSeconds));
    return res.status(429).json({ error: 'Bạn đã gửi nhiều yêu cầu trong thời gian ngắn. Vui lòng thử lại sau hoặc gọi Hotline 0364 648 282.' });
  }
  if (!timing.ok) return res.status(400).json({ error: 'Biểu mẫu đã hết hạn hoặc được gửi quá nhanh. Vui lòng tải lại trang rồi thử lại.' });

  const name = String(req.body.name || '').trim().replace(/\s+/g, ' ').slice(0, 100);
  const email = String(req.body.email || '').trim().toLowerCase().slice(0, 180);
  const requestedInterest = String(req.body.interest || '').trim().replace(/\s+/g, ' ').slice(0, 240);
  const interestDetail = String(req.body.interestDetail || '').trim().replace(/\s+/g, ' ').slice(0, 240);
  const sourcePath = cleanPath(req.body.sourcePath);
  const pageContext = req.body.contextLocked === '1' ? getLeadContext(sourcePath) : null;
  const interest = pageContext?.interest || requestedInterest;
  const sourceTitle = pageContext?.sourceTitle || interestDetail || interest;
  if (!isValidName(name) || !isValidVietnamesePhone(phone)) return res.status(400).json({ error: 'Vui lòng nhập họ tên và số điện thoại Việt Nam hợp lệ.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email)) return res.status(400).json({ error: 'Vui lòng nhập email liên hệ hợp lệ.' });
  if (!interest || /(?:https?:\/\/|www\.)/i.test(interest)) return res.status(400).json({ error: 'Nội dung quan tâm chưa hợp lệ.' });
  if (/(?:https?:\/\/|www\.)/i.test(interestDetail)) return res.status(400).json({ error: 'Thông tin cần nhận chưa hợp lệ.' });
  if (!pageContext && /thông tin trường/i.test(interest) && interestDetail.length < 2) return res.status(400).json({ error: 'Vui lòng cho biết trường bạn muốn nhận thông tin.' });

  const leadType = pageContext?.leadType || (/thông tin trường/i.test(interest) ? 'school_info'
    : /du học|chương trình/i.test(interest) ? 'study_abroad' : 'course');

  const duplicate = db.prepare(`SELECT id FROM leads WHERE (phone=? OR email=?)
    AND interest=? AND source_path=? AND datetime(created_at)>=datetime('now','localtime','-12 hours') ORDER BY id DESC LIMIT 1`).get(phone, email, interest, sourcePath);
  if (duplicate) return res.status(200).json({ ok: true, duplicate: true, message: 'Yêu cầu của bạn đã được ghi nhận. SOL DREAM sẽ liên hệ với bạn sớm.' });

  const unsubscribeToken = crypto.randomBytes(24).toString('hex');
  const result = db.prepare(`INSERT INTO leads
    (name,phone,email,interest,interest_detail,lead_type,source_path,source_title,subscription_active,unsubscribe_token,status,notified)
    VALUES (?,?,?,?,?,?,?,?,1,?,'new',0)`)
    .run(name, phone, email, interest, interestDetail, leadType, sourcePath, sourceTitle, unsubscribeToken);
  const lead = { id: result.lastInsertRowid, name, phone, email, interest, interest_detail: interestDetail, lead_type: leadType, source_path: sourcePath, source_title: sourceTitle };
  try { if (await notifyHotline(lead)) db.prepare('UPDATE leads SET notified=1 WHERE id=?').run(lead.id); }
  catch (error) { console.error('[lead] hotline notification failed:', error.message); }
  res.status(201).json({ ok: true, message: 'Đã nhận yêu cầu. SOL DREAM sẽ liên hệ với bạn sớm.' });
});

router.get('/unsubscribe', (req, res) => {
  const token = String(req.query.token || '').trim();
  const result = /^[a-f0-9]{48}$/i.test(token)
    ? db.prepare("UPDATE leads SET subscription_active=0,updated_at=datetime('now','localtime') WHERE unsubscribe_token=?").run(token)
    : { changes: 0 };
  res.status(result.changes ? 200 : 404).type('html').send(`<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Hủy nhận thông tin</title><body style="font-family:system-ui;padding:40px;max-width:680px;margin:auto"><h1>${result.changes ? 'Đã dừng gửi thông tin' : 'Liên kết không hợp lệ'}</h1><p>${result.changes ? 'Bạn sẽ không nhận thêm email cập nhật từ đăng ký này.' : 'Không tìm thấy đăng ký tương ứng hoặc liên kết đã hết hiệu lực.'}</p><a href="/">Về trang chủ</a></body></html>`);
});

module.exports = router;
