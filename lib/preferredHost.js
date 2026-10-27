'use strict';

function createPreferredHostRedirect({ siteUrl = process.env.BASE_URL || process.env.SITE_URL || 'https://soldream.edu.vn' } = {}) {
  let preferred;
  try {
    preferred = new URL(siteUrl);
    if (!['http:', 'https:'].includes(preferred.protocol) || preferred.username || preferred.password) preferred = null;
  } catch (_) { preferred = null; }

  return function preferredHostRedirect(req, res, next) {
    if (!preferred || !['GET', 'HEAD'].includes(req.method)) return next();
    if (/^\/(?:healthz|admin|api)(?:\/|$)/.test(req.path || '')) return next();
    const hostname = preferred.hostname.toLowerCase().replace(/\.$/, '');
    if (hostname.startsWith('www.')) return next();
    let incoming;
    try { incoming = new URL(`http://${req.get('host') || ''}`).hostname.toLowerCase().replace(/\.$/, ''); }
    catch (_) { return next(); }
    // Only the configured public www alias is normalized; internal/Railway hosts stay untouched.
    if (incoming !== `www.${hostname}`) return next();
    const original = String(req.originalUrl || req.url || '/');
    if (!original.startsWith('/') || /[\r\n]/.test(original)) return next();
    return res.redirect(301, `${preferred.origin}${original}`);
  };
}

module.exports = { createPreferredHostRedirect };
