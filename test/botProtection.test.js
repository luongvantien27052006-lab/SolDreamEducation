'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { classifyUserAgent, isPublicDocumentRequest, createBotProtection } = require('../lib/botProtection');

function mockResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: '',
    set(name, value) { this.headers[name] = value; return this; },
    status(value) { this.statusCode = value; return this; },
    type(value) { this.contentType = value; return this; },
    send(value) { this.body = value; return this; },
  };
}

function mockRequest({ userAgent, path = '/tin-tuc/bai-viet', ip = '203.0.113.20' } = {}) {
  return {
    method: 'GET', path, ip, socket: { remoteAddress: ip },
    get(name) { return name.toLowerCase() === 'user-agent' ? userAgent : ''; },
  };
}

test('distinguishes approved crawlers, browsers and scraping tools', () => {
  assert.equal(classifyUserAgent('Mozilla/5.0 Googlebot/2.1'), 'approved-bot');
  assert.equal(classifyUserAgent('GPTBot/1.2'), 'approved-bot');
  assert.equal(classifyUserAgent('Mozilla/5.0 Chrome/140 Safari/537.36'), 'browser');
  assert.equal(classifyUserAgent('python-requests/2.32'), 'blocked-bot');
  assert.equal(classifyUserAgent('SomeDataCrawler/1.0'), 'blocked-bot');
  assert.equal(classifyUserAgent(''), 'missing');
});

test('protects public documents but leaves admin, API and assets to their own controls', () => {
  assert.equal(isPublicDocumentRequest({ method: 'GET', path: '/du-hoc/pusan' }), true);
  assert.equal(isPublicDocumentRequest({ method: 'GET', path: '/img/logo.png' }), false);
  assert.equal(isPublicDocumentRequest({ method: 'POST', path: '/api/contact' }), false);
  assert.equal(isPublicDocumentRequest({ method: 'GET', path: '/admin' }), false);
  assert.equal(isPublicDocumentRequest({ method: 'GET', path: '/healthz' }), false);
});

test('blocks scraper agents while approved SEO and GEO crawlers remain accessible', () => {
  const protect = createBotProtection({ pageLimit: 10, secret: 'test-bot-protection' });
  let approved = 0;
  const approvedResponse = mockResponse();
  protect(mockRequest({ userAgent: 'OAI-SearchBot/1.0' }), approvedResponse, () => { approved += 1; });
  assert.equal(approved, 1);
  assert.equal(approvedResponse.statusCode, 200);

  let blocked = 0;
  const blockedResponse = mockResponse();
  protect(mockRequest({ userAgent: 'Scrapy/2.11' }), blockedResponse, () => { blocked += 1; });
  assert.equal(blocked, 0);
  assert.equal(blockedResponse.statusCode, 403);
  assert.equal(blockedResponse.headers['X-Robots-Tag'], 'noindex, nofollow');
});

test('rate-limits excessive page reads from a browser-like client', () => {
  const protect = createBotProtection({ pageLimit: 10, windowMs: 60_000, secret: 'rate-test' });
  const request = mockRequest({ userAgent: 'Mozilla/5.0 Chrome/140 Safari/537.36', ip: '203.0.113.77' });
  let allowed = 0;
  for (let index = 0; index < 10; index += 1) {
    protect(request, mockResponse(), () => { allowed += 1; });
  }
  const limitedResponse = mockResponse();
  protect(request, limitedResponse, () => { allowed += 1; });
  assert.equal(allowed, 10);
  assert.equal(limitedResponse.statusCode, 429);
  assert.equal(limitedResponse.headers['Retry-After'], '60');
});
