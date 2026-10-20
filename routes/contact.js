'use strict';
const {siteText}=require('../lib/siteContent');

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
  if (!requestIsSameSite(req)) return res.status(403).json({ error: siteText("server.routes.contact.001") });

  const ip = req.ip || req.socket?.remoteAddress || 'unknown';
  const phone = normalizePhone(req.body.phone);
  if (String(req.body.website || '').trim()) {
    spamGuard.consume(ip, phone, 'honeypot');
    return res.status(202).json({ ok: true, message: siteText("server.routes.contact.002") });
  }

  const timing = assessFormTiming(req.body.formStartedAt);
  const rate = spamGuard.consume(ip, phone, timing.ok ? 'submitted' : `timing-${timing.reason}`);
  if (!rate.allowed) {
    res.set('Retry-After', String(rate.retryAfterSeconds));
    return res.status(429).json({ error: siteText("server.routes.contact.003") });
  }
  if (!timing.ok) return res.status(400).json({ error: siteText("server.routes.contact.004") });

  const name = String(req.body.name || '').trim().replace(/\s+/g, ' ').slice(0, 100);
  const email = String(req.body.email || '').trim().toLowerCase().slice(0, 180);
  const requestedInterest = String(req.body.interest || '').trim().replace(/\s+/g, ' ').slice(0, 240);
  const interestDetail = String(req.body.interestDetail || '').trim().replace(/\s+/g, ' ').slice(0, 240);
  const sourcePath = cleanPath(req.body.sourcePath);
  const pageContext = req.body.contextLocked === '1' ? getLeadContext(sourcePath) : null;
  const interest = pageContext?.interest || requestedInterest;
  const sourceTitle = pageContext?.sourceTitle || interestDetail || interest;
  if (!isValidName(name) || !isValidVietnamesePhone(phone)) return res.status(400).json({ error: siteText("server.routes.contact.005") });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email)) return res.status(400).json({ error: siteText("server.routes.contact.006") });
  if (!interest || /(?:https?:\/\/|www\.)/i.test(interest)) return res.status(400).json({ error: siteText("server.routes.contact.007") });
  if (/(?:https?:\/\/|www\.)/i.test(interestDetail)) return res.status(400).json({ error: siteText("server.routes.contact.008") });
  if (!pageContext && /thông tin trường/i.test(interest) && interestDetail.length < 2) return res.status(400).json({ error: siteText("server.routes.contact.009") });

  const leadType = pageContext?.leadType || (/thông tin trường/i.test(interest) ? 'school_info'
    : /du học|chương trình/i.test(interest) ? 'study_abroad' : 'course');

  const duplicate = db.prepare(`SELECT id FROM leads WHERE (phone=? OR email=?)
    AND interest=? AND source_path=? AND datetime(created_at)>=datetime('now','localtime','-12 hours') ORDER BY id DESC LIMIT 1`).get(phone, email, interest, sourcePath);
  if (duplicate) return res.status(200).json({ ok: true, duplicate: true, message: siteText("server.routes.contact.010") });

  const unsubscribeToken = crypto.randomBytes(24).toString('hex');
  const result = db.prepare(`INSERT INTO leads
    (name,phone,email,interest,interest_detail,lead_type,source_path,source_title,subscription_active,unsubscribe_token,status,notified)
    VALUES (?,?,?,?,?,?,?,?,1,?,'new',0)`)
    .run(name, phone, email, interest, interestDetail, leadType, sourcePath, sourceTitle, unsubscribeToken);
  const lead = { id: result.lastInsertRowid, name, phone, email, interest, interest_detail: interestDetail, lead_type: leadType, source_path: sourcePath, source_title: sourceTitle };
  try { if (await notifyHotline(lead)) db.prepare('UPDATE leads SET notified=1 WHERE id=?').run(lead.id); }
  catch (error) { console.error('[lead] hotline notification failed:', error.message); }
  res.status(201).json({ ok: true, message: siteText("server.routes.contact.011") });
});

router.get('/unsubscribe', (req, res) => {
  const token = String(req.query.token || '').trim();
  const result = /^[a-f0-9]{48}$/i.test(token)
    ? db.prepare("UPDATE leads SET subscription_active=0,updated_at=datetime('now','localtime') WHERE unsubscribe_token=?").run(token)
    : { changes: 0 };
  res.status(result.changes ? 200 : 404).render('unsubscribe',{layout:false,unsubscribed:!!result.changes});
});

module.exports = router;
