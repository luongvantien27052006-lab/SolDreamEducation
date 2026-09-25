'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  GeminiCachedFallbackClient,
  DEFAULT_GEMINI_MODELS,
  isRetryableGeminiError,
  isExpiredCacheError,
  isCacheBillingError,
} = require('../lib/geminiGateway');

function asyncItems(items) {
  return {
    async *[Symbol.asyncIterator]() { for (const item of items) yield item; },
  };
}

function fakeClient(options = {}) {
  const state = { creates: [], lists: 0, calls: [] };
  const client = {
    caches: {
      async list() { state.lists += 1; return asyncItems(options.remoteCaches || []); },
      async create(params) {
        state.creates.push(params);
        const index = state.creates.length;
        return {
          name: `cachedContents/cache-${index}`,
          displayName: params.config.displayName,
          model: `models/${params.model}`,
          expireTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        };
      },
    },
    models: {
      async generateContent(params) {
        state.calls.push(params);
        return options.generate ? options.generate(params, state.calls.length) : { text: 'ok' };
      },
    },
  };
  return { client, state };
}

test('context cache is created once and reused for the same model and document', async () => {
  const { client, state } = fakeClient();
  const gateway = new GeminiCachedFallbackClient({
    client,
    models: ['gemini-3.5-flash-lite'],
    cacheDocument: 'Tài liệu biên soạn cố định '.repeat(2000),
    sleep: async () => {},
  });

  const first = await gateway.generateContent({ contents: 'Yêu cầu thứ nhất' });
  const second = await gateway.generateContent({ contents: 'Yêu cầu thứ hai' });
  assert.equal(first.cached, true);
  assert.equal(second.cacheName, first.cacheName);
  assert.equal(state.creates.length, 1);
  assert.equal(state.calls[0].config.cachedContent, first.cacheName);
  assert.equal(state.calls[1].config.cachedContent, first.cacheName);
  assert.equal(state.creates[0].config.ttl, '7200s');
});

test('an existing unexpired remote cache is reused after a server restart', async () => {
  const remoteCaches = [];
  const { client, state } = fakeClient({ remoteCaches });
  const gateway = new GeminiCachedFallbackClient({
    client,
    models: ['gemini-3.5-flash'],
    cacheDocument: 'Quy chuẩn cố định '.repeat(2500),
  });
  remoteCaches.push({
    name: 'cachedContents/existing',
    displayName: gateway.cacheDisplayName('gemini-3.5-flash'),
    model: 'models/gemini-3.5-flash',
    expireTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  });
  const result = await gateway.generateContent({ contents: 'Biên tập bài mới' });
  assert.equal(result.cacheName, 'cachedContents/existing');
  assert.equal(state.creates.length, 0);
});

test('an expired cache error recreates cache and retries the same model once', async () => {
  const { client, state } = fakeClient({
    generate(_params, callNumber) {
      if (callNumber === 1) {
        const error = new Error('Cached content has expired and was not found');
        error.status = 404;
        throw error;
      }
      return { text: 'recovered' };
    },
  });
  const gateway = new GeminiCachedFallbackClient({
    client,
    models: ['gemini-3.5-flash'],
    cacheDocument: 'Tài liệu dài '.repeat(3000),
    sleep: async () => {},
  });
  const result = await gateway.generateContent({ contents: 'Biên tập' });
  assert.equal(result.response.text, 'recovered');
  assert.equal(state.creates.length, 2);
  assert.notEqual(state.calls[0].config.cachedContent, state.calls[1].config.cachedContent);
  assert.equal(result.attempts[0].reason, 'cache-expired');
});

test('rate limits and timeouts fall back in low-to-high cost order with exponential backoff', async () => {
  const delays = [];
  const { client, state } = fakeClient({
    generate(params) {
      if (params.model === 'gemini-3.5-flash-lite') {
        const error = new Error('RESOURCE_EXHAUSTED'); error.status = 429; throw error;
      }
      if (params.model === 'gemini-3.5-flash') {
        const error = new Error('GEMINI_TIMEOUT'); error.status = 408; throw error;
      }
      return { text: 'success' };
    },
  });
  const gateway = new GeminiCachedFallbackClient({
    client,
    cacheDocument: '',
    sleep: async (milliseconds) => { delays.push(milliseconds); },
    baseBackoffMs: 1000,
    maxBackoffMs: 2000,
  });
  const result = await gateway.generateContent({ contents: 'Xin chào', useCache: false });
  assert.equal(result.model, 'gemini-3.6-flash');
  assert.deepEqual(state.calls.map((call) => call.model), DEFAULT_GEMINI_MODELS);
  assert.deepEqual(delays, [1000, 2000]);
});

test('error classification recognises provider limits and expired caches', () => {
  assert.equal(isRetryableGeminiError(Object.assign(new Error('RESOURCE_EXHAUSTED'), { status: 429 })), true);
  assert.equal(isRetryableGeminiError(new Error('invalid API key')), false);
  assert.equal(isExpiredCacheError(Object.assign(new Error('cached content not found'), { status: 404 })), true);
  assert.equal(isCacheBillingError(Object.assign(new Error('prepayment credits are depleted'), { status: 402 })), true);
});

test('cache billing failure degrades to an uncached request that still includes the full guide', async () => {
  const { client, state } = fakeClient();
  client.caches.create = async () => {
    const error = new Error('Your prepayment credits are depleted.');
    error.status = 402;
    throw error;
  };
  const gateway = new GeminiCachedFallbackClient({
    client,
    models: [DEFAULT_GEMINI_MODELS[0]],
    cacheDocument: 'Hướng dẫn biên tập đầy đủ cố định',
    cacheSystemInstruction: 'Tuân thủ hướng dẫn.',
    sleep: async () => {},
  });
  const result = await gateway.generateContent({ contents: 'Biên tập bài này.' });
  assert.equal(result.cached, false);
  assert.equal(result.cacheFallback, 'uncached-guide');
  assert.match(state.calls[0].config.systemInstruction, /Hướng dẫn biên tập đầy đủ cố định/);
  assert.equal(state.calls[0].config.cachedContent, undefined);
});
