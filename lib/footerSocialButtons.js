'use strict';

const { decodeAttributeEntities } = require('./htmlEntities');
const icons = {
  facebook: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M14 21v-8h2.7l.4-3H14V8.1c0-.9.3-1.5 1.6-1.5h1.7V3.9a22 22 0 0 0-2.5-.1c-2.5 0-4.2 1.5-4.2 4.3V10H8v3h2.6v8Z"/></svg>',
  instagram: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>',
  youtube: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M21.6 7.2a3 3 0 0 0-2.1-2.1C17.6 4.6 12 4.6 12 4.6s-5.6 0-7.5.5a3 3 0 0 0-2.1 2.1C1.9 9.1 1.9 12 1.9 12s0 2.9.5 4.8a3 3 0 0 0 2.1 2.1c1.9.5 7.5.5 7.5.5s5.6 0 7.5-.5a3 3 0 0 0 2.1-2.1c.5-1.9.5-4.8.5-4.8s0-2.9-.5-4.8ZM10 15.2V8.8l5.5 3.2Z"/></svg>',
  tiktok: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M16.7 3c.4 2.3 1.7 3.7 4 3.9v3.3a9.1 9.1 0 0 1-4-1.2v6.6a6 6 0 1 1-5.2-6V13a2.7 2.7 0 1 0 1.9 2.6V3Z"/></svg>',
  zalo: '<span class="footer-social-link__zalo" aria-hidden="true">Zalo</span>',
};
const services = {
  'facebook.com': 'facebook', 'fb.com': 'facebook',
  'instagram.com': 'instagram', 'youtube.com': 'youtube', 'youtu.be': 'youtube',
  'tiktok.com': 'tiktok', 'zalo.me': 'zalo',
};

// Decorate the current CMS links at render time; stored content and URLs stay intact.
function footerSocialButtons(html) {
  return String(html || '').replace(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi, (anchor, attributes, label) => {
    const href = attributes.match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
    if (!href || /\bfooter-social-link\b/.test(attributes)) return anchor;
    let host;
    try { host = new URL(decodeAttributeEntities(href[1] ?? href[2])).hostname.toLowerCase(); }
    catch { return anchor; }
    const service = Object.entries(services).find(([domain]) => host === domain || host.endsWith('.' + domain))?.[1];
    if (!service) return anchor;
    const classPattern = /\bclass\s*=\s*("[^"]*"|'[^']*')/i;
    const styled = classPattern.test(attributes)
      ? attributes.replace(classPattern, (_, value) => 'class=' + value[0] + value.slice(1, -1) + ' footer-social-link' + value[0])
      : attributes + ' class="footer-social-link"';
    return '<a' + styled + '>' + icons[service] + '<span class="footer-social-link__label">' + label + '</span></a>';
  });
}

module.exports = { footerSocialButtons };
