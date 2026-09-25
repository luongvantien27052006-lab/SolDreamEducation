'use strict';

const SECRET_ENV_NAMES = [
  'ADMIN_PASSWORD',
  'SESSION_SECRET',
  'GEMINI_API_KEY',
  'GOOGLE_API_KEY',
  'API_KEY',
];

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normaliseForDetection(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function isAdminCredentialQuery(value) {
  const query = normaliseForDetection(value);
  if (!query) return false;
  const credential = /\b(mat khau|password|pass word|tai khoan|username|user name|dang nhap|login|credential|api key|session secret|token)\b/.test(query);
  const protectedArea = /\b(admin|administrator|quan tri|quan tri vien|cms|dashboard|gemini|he thong|server)\b/.test(query);
  const explicitSecret = /\b(admin password|admin_password|session_secret|gemini_api_key|google_api_key)\b/.test(query.replace(/ /g, '_'));
  return explicitSecret || (credential && protectedArea);
}

function redactSensitiveText(value) {
  let text = String(value || '');

  for (const name of SECRET_ENV_NAMES) {
    const secret = process.env[name];
    if (secret && String(secret).length >= 4) text = text.replace(new RegExp(escapeRegExp(secret), 'g'), '[ĐÃ ẨN]');
  }

  text = text.replace(
    /\b(ADMIN_PASSWORD|SESSION_SECRET|GEMINI_API_KEY|GOOGLE_API_KEY|API_KEY)\b\s*[:=]\s*(?:["'][^"'\r\n]+["']|[^\s,;\r\n]+)/gi,
    '$1=[ĐÃ ẨN]'
  );
  text = text.replace(
    /\b((?:tài khoản|username|user name|mật khẩu|password)\s+(?:admin|quản trị(?: viên)?))\b\s*[:=]\s*(?:["'][^"'\r\n]+["']|[^\s,;\r\n]+)/gi,
    '$1: [ĐÃ ẨN]'
  );
  return text;
}

module.exports = { isAdminCredentialQuery, redactSensitiveText, normaliseForDetection };
