'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  GeminiFallbackClient,
  GeminiFallbackError,
  DEFAULT_GEMINI_MODELS,
  isRetryableGeminiError,
  estimateRequestTokens,
} = require('../lib/geminiGateway');

function fakeClient(options = {}) {
  const state = { calls: [], active: 0, maxActive: 0 };
  const client = {
    caches: {
      async list() { throw new Error('explicit cache must not be accessed'); },
      async create() { throw new Error('explicit cache must not be created'); },
    },
    models: {
      async generateContent(params) {
        state.calls.push(params);
        state.active += 1;
        state.maxActive = Math.max(state.maxActive, state.active);
        try {
          return options.generate
            ? await options.generate(params, state.calls.length)
            : { text: 'ok', usageMetadata: { totalTokenCount: 24 } };
        } finally { state.active -= 1; }
      },
    },
  };
  return { client, state };
}

test('editorial gateway never creates or requests explicit CachedContent', async () => {
  const { client, state } = fakeClient();
  const gateway = new GeminiFallbackClient({
    client, models: ['gemini-3.5-flash-lite'], sleep: async () => {},
    liteIntervalMs: 1_000,
  });
  const result = await gateway.generateContent({ contents: 'Biên tập bài mới', config: { maxOutputTokens: 100 } });
  assert.equal(result.cached, false);
  assert.equal(result.cacheName, '');
  assert.equal(result.actualTokens, 24);
  assert.equal(state.calls.length, 1);
  assert.equal(state.calls[0].config.cachedContent, undefined);
  assert.equal(state.calls[0].config.systemInstruction, undefined);
});

test('rate fallback uses low-to-high cost model order with exponential backoff', async () => {
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
  const gateway = new GeminiFallbackClient({
    client, sleep: async (milliseconds) => { delays.push(milliseconds); },
    baseBackoffMs: 1000, maxBackoffMs: 2000, liteIntervalMs: 1_000, standardIntervalMs: 1_000,
  });
  const result = await gateway.generateContent({ contents: 'Xin chào', config: { maxOutputTokens: 20 } });
  assert.equal(result.model, 'gemini-3.6-flash');
  assert.deepEqual(state.calls.map((call) => call.model), DEFAULT_GEMINI_MODELS);
  assert.deepEqual(delays, [1000, 2000]);
});

test('fatal model errors are surfaced without costly fallbacks', async () => {
  const { client, state } = fakeClient({ generate() { throw new Error('invalid API key'); } });
  const gateway = new GeminiFallbackClient({ client, models: ['gemini-3.5-flash-lite'], sleep: async () => {} });
  await assert.rejects(gateway.generateContent({ contents: 'test' }), /invalid API key/);
  assert.equal(state.calls.length, 1);
});

test('token admission estimate covers the prompt and requested output budget', () => {
  const estimate = estimateRequestTokens({ contents: 'a'.repeat(2000), config: { maxOutputTokens: 500 } });
  assert.equal(estimate, 1519);
  assert.equal(estimateRequestTokens({ contents: 'xin chào', config: {} }) > 0, true);
});

test('fallback wrapper exposes attempts, retryable errors and final status', async () => {
  const { client } = fakeClient({ generate() { const error = new Error('RESOURCE_EXHAUSTED'); error.status = 429; throw error; } });
  const gateway = new GeminiFallbackClient({
    client, models: ['gemini-3.5-flash-lite', 'gemini-3.5-flash'], sleep: async () => {},
    liteIntervalMs: 1_000, standardIntervalMs: 1_000,
  });
  await assert.rejects(gateway.generateContent({ contents: 'test' }), (error) => {
    assert.ok(error instanceof GeminiFallbackError);
    assert.equal(error.attempts.length, 2);
    return true;
  });
  assert.equal(isRetryableGeminiError(Object.assign(new Error('RESOURCE_EXHAUSTED'), { status: 429 })), true);
  assert.equal(isRetryableGeminiError(new Error('invalid API key')), false);
});
