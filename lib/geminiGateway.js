'use strict';

const { GoogleGenAI } = require('@google/genai');

const DEFAULT_GEMINI_MODELS = Object.freeze([
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.6-flash',
]);

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function errorStatus(error) {
  const direct = Number(error?.status || error?.statusCode || error?.code || 0);
  if (direct >= 100 && direct <= 599) return direct;
  const match = String(error?.message || '').match(/(?:"code"\s*:\s*|status(?:\s+code)?\s*[:=]?\s*)(\d{3})/i);
  return match ? Number(match[1]) : 0;
}

function isRetryableGeminiError(error) {
  const status = errorStatus(error);
  const message = String(error?.message || '');
  return [408, 429, 500, 502, 503, 504].includes(status)
    || /RESOURCE_EXHAUSTED|RATE_LIMIT|GEMINI_TIMEOUT|DEADLINE_EXCEEDED|UNAVAILABLE|overload|high demand|fetch failed|network|econn|socket hang up/i.test(message);
}

function safeModels(models) {
  const values = Array.isArray(models) && models.length ? models : DEFAULT_GEMINI_MODELS;
  return [...new Set(values.map((model) => String(model || '').trim()))]
    .filter((model) => /^[a-z0-9._-]{3,80}$/i.test(model))
    .slice(0, 3);
}

function estimateRequestTokens(params = {}) {
  let serialized = '';
  try { serialized = JSON.stringify({ contents: params.contents, systemInstruction: params.config?.systemInstruction || '' }); }
  catch (_) { serialized = String(params.contents || ''); }
  // Conservative planning estimate for multilingual text, not billing telemetry.
  const input = Math.max(1, Math.ceil(serialized.length / 2));
  const requestedOutput = Math.max(0, Number(params.config?.maxOutputTokens) || 0);
  return input + Math.min(requestedOutput, 6000);
}

function reportedTokens(response) {
  const usage = response?.usageMetadata || response?.usage_metadata || {};
  const total = Number(usage.totalTokenCount || usage.total_token_count || 0);
  if (total > 0) return total;
  const input = Number(usage.promptTokenCount || usage.prompt_token_count || 0);
  const output = Number(usage.candidatesTokenCount || usage.candidates_token_count || 0);
  return input + output || 0;
}

class GeminiFallbackError extends Error {
  constructor(message, attempts, cause) {
    super(message, { cause });
    this.name = 'GeminiFallbackError';
    this.attempts = attempts;
    this.status = errorStatus(cause) || 503;
  }
}

/**
 * Synchronous Gemini GenerateContent gateway for interactive/editorial requests.
 * Explicit CachedContent is deliberately not used: the editorial handbook is
 * kept out of hot prompts and current Gemini models can apply implicit caching.
 * Requests are serialized and admitted against a rolling, estimated TPM budget.
 */
class GeminiFallbackClient {
  constructor(options = {}) {
    const apiKey = String(options.apiKey || process.env.GEMINI_API_KEY || '').trim();
    if (!options.client && !apiKey) throw new Error('Thiếu GEMINI_API_KEY.');
    this.client = options.client || new GoogleGenAI({ apiKey, apiVersion: 'v1beta' });
    this.models = safeModels(options.models);
    if (!this.models.length) throw new Error('Danh sách model Gemini không hợp lệ.');
    this.requestTimeoutMs = Math.min(180_000, Math.max(5_000, Number(options.requestTimeoutMs) || 60_000));
    this.baseBackoffMs = Math.min(2_000, Math.max(250, Number(options.baseBackoffMs) || 1_000));
    this.maxBackoffMs = Math.min(10_000, Math.max(this.baseBackoffMs, Number(options.maxBackoffMs) || 2_000));
    this.maxTpm = Math.max(10_000, Number(options.maxTpm || process.env.GEMINI_EDITOR_MAX_TPM) || 120_000);
    this.maxConcurrentRequests = Math.min(4, Math.max(1, Number(options.maxConcurrentRequests || process.env.GEMINI_EDITOR_MAX_CONCURRENT) || 1));
    this.liteIntervalMs = Math.max(1_000, Number(options.liteIntervalMs || process.env.GEMINI_EDITOR_REQUEST_INTERVAL_MS) || 4_200);
    this.standardIntervalMs = Math.max(this.liteIntervalMs, Number(options.standardIntervalMs) || 12_500);
    this.sleep = options.sleep || wait;
    this.now = options.now || (() => Date.now());
    this.reservations = [];
    this.activeRequests = 0;
    this.modelNextAt = new Map();
  }

  async acquire(model, params) {
    const tokens = estimateRequestTokens(params);
    const interval = /lite/i.test(model) ? this.liteIntervalMs : this.standardIntervalMs;
    while (true) {
      const now = this.now();
      this.reservations = this.reservations.filter((entry) => now - entry.at < 60_000);
      const used = this.reservations.reduce((sum, entry) => sum + entry.tokens, 0);
      const firstExpiry = this.reservations.length ? this.reservations[0].at + 60_000 : now;
      const modelWait = Math.max(0, (this.modelNextAt.get(model) || 0) - now);
      const budgetWait = this.reservations.length && used + tokens > this.maxTpm ? Math.max(1, firstExpiry - now) : 0;
      if (this.activeRequests < this.maxConcurrentRequests && modelWait === 0 && budgetWait === 0) {
        const reservation = { at: now, tokens };
        this.reservations.push(reservation);
        this.activeRequests += 1;
        this.modelNextAt.set(model, now + interval);
        return (actualTokens = 0) => {
          if (actualTokens > 0) reservation.tokens = Math.max(1, actualTokens);
        };
      }
      await this.sleep(Math.min(1_000, Math.max(25, Math.max(modelWait, budgetWait))));
    }
  }

  backoffForFailure(failureIndex) {
    return Math.min(this.maxBackoffMs, this.baseBackoffMs * (2 ** Math.max(0, failureIndex)));
  }

  async callModel(model, params) {
    const release = await this.acquire(model, params);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(new Error('GEMINI_TIMEOUT')), Number(params.timeoutMs) || this.requestTimeoutMs);
    try {
      const config = { ...(params.config || {}), abortSignal: controller.signal };
      const response = await this.client.models.generateContent({ model, contents: params.contents, config });
      const actualTokens = reportedTokens(response);
      release(actualTokens);
      return { response, model, cacheName: '', cached: false, estimatedInputTokens: estimateRequestTokens(params), actualTokens: actualTokens || null };
    } catch (error) {
      if (controller.signal.aborted && !/GEMINI_TIMEOUT/i.test(String(error?.message || ''))) {
        const timeout = new Error('GEMINI_TIMEOUT', { cause: error });
        timeout.status = 408;
        throw timeout;
      }
      throw error;
    } finally {
      clearTimeout(timer);
      // A failed call has no usage metadata; retain its conservative reservation
      // for the full rolling window so retries cannot create a token burst.
      if (this.activeRequests > 0) this.activeRequests -= 1;
    }
  }

  async generateContent(params = {}) {
    if (!params.contents) throw new Error('Thiếu contents cho yêu cầu Gemini.');
    const attempts = [];
    let lastError;
    let retryableFailures = 0;
    for (const model of this.models) {
      try {
        const result = await this.callModel(model, params);
        result.attempts = attempts;
        return result;
      } catch (error) {
        lastError = error;
        const retryable = isRetryableGeminiError(error);
        attempts.push({
          model, reason: retryable ? 'retryable' : 'fatal', status: errorStatus(error),
          message: String(error?.message || '').slice(0, 180),
        });
        if (!retryable) throw error;
        retryableFailures += 1;
        if (model !== this.models[this.models.length - 1]) await this.sleep(this.backoffForFailure(retryableFailures - 1));
      }
    }
    throw new GeminiFallbackError('Tất cả model Gemini đều tạm thời không khả dụng.', attempts, lastError);
  }
}

module.exports = {
  GeminiFallbackClient,
  GeminiFallbackError,
  DEFAULT_GEMINI_MODELS,
  errorStatus,
  isRetryableGeminiError,
  estimateRequestTokens,
};
