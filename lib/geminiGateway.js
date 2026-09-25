'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');

// Thứ tự cố định từ chi phí thấp đến cao theo yêu cầu của hệ thống.
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
  const message = String(error?.message || '');
  const match = message.match(/(?:"code"\s*:\s*|status(?:\s+code)?\s*[:=]?\s*)(\d{3})/i);
  return match ? Number(match[1]) : 0;
}

function isRetryableGeminiError(error) {
  const status = errorStatus(error);
  const message = String(error?.message || '');
  return [408, 429, 500, 502, 503, 504].includes(status)
    || /RESOURCE_EXHAUSTED|RATE_LIMIT|GEMINI_TIMEOUT|DEADLINE_EXCEEDED|UNAVAILABLE|overload|high demand|fetch failed|network|econn|socket hang up/i.test(message);
}

function isExpiredCacheError(error) {
  const status = errorStatus(error);
  const message = String(error?.message || '');
  return [400, 404].includes(status)
    && /cached.?content|cache/i.test(message)
    && /expired|not found|does not exist|invalid|deleted|không tồn tại|hết hạn/i.test(message);
}

function isUnsupportedCacheError(error) {
  const status = errorStatus(error);
  const message = String(error?.message || '');
  return status === 400 && /cache|cached.?content/i.test(message) && /not supported|unsupported|isn't supported|model/i.test(message);
}

function isCacheBillingError(error) {
  const status = errorStatus(error);
  const message = String(error?.message || '');
  return status === 402 || /prepayment|billing|payment required|credits? (?:are )?depleted/i.test(message);
}

function normalizeModelName(value) {
  return String(value || '').replace(/^models\//i, '').trim().toLowerCase();
}

function safeModels(models) {
  const values = Array.isArray(models) && models.length ? models : DEFAULT_GEMINI_MODELS;
  return [...new Set(values.map((model) => String(model || '').trim()))]
    .filter((model) => /^[a-z0-9._-]{3,80}$/i.test(model))
    .slice(0, 3);
}

function loadCacheDocument(filePath) {
  const value = String(filePath || '').trim();
  if (!value) return '';
  const resolved = path.resolve(value);
  const document = fs.readFileSync(resolved, 'utf8').trim();
  if (!document) throw new Error(`Tài liệu Context Cache đang trống: ${resolved}`);
  return document;
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
 * Gemini client dùng một explicit context cache riêng cho từng model.
 * Google không cho dùng cache được tạo bởi model A với model B, vì vậy cache
 * được tạo lazy khi fallback chạm tới model tương ứng.
 *
 * Ví dụ:
 * const gateway = new GeminiCachedFallbackClient({
 *   apiKey: process.env.GEMINI_API_KEY,
 *   cacheDocument: fs.readFileSync('./editorial-guide.md', 'utf8'),
 *   cacheTtlSeconds: 7200,
 * });
 * const { response, model, cacheName } = await gateway.generateContent({
 *   contents: 'Hãy biên tập bài viết này...',
 *   config: { responseMimeType: 'application/json' },
 * });
 */
class GeminiCachedFallbackClient {
  constructor(options = {}) {
    const apiKey = String(options.apiKey || process.env.GEMINI_API_KEY || '').trim();
    if (!options.client && !apiKey) throw new Error('Thiếu GEMINI_API_KEY.');
    this.client = options.client || new GoogleGenAI({ apiKey, apiVersion: 'v1beta' });
    this.models = safeModels(options.models);
    if (!this.models.length) throw new Error('Danh sách model Gemini không hợp lệ.');
    this.cacheDocument = String(options.cacheDocument || '').trim();
    this.cacheSystemInstruction = String(options.cacheSystemInstruction || '').trim();
    this.cacheTtlSeconds = Math.min(86_400, Math.max(300, Number(options.cacheTtlSeconds) || 7_200));
    this.cacheRefreshBufferMs = Math.min(15 * 60_000, Math.max(30_000, Number(options.cacheRefreshBufferMs) || 60_000));
    this.requestTimeoutMs = Math.min(180_000, Math.max(5_000, Number(options.requestTimeoutMs) || 60_000));
    this.baseBackoffMs = Math.min(2_000, Math.max(250, Number(options.baseBackoffMs) || 1_000));
    this.maxBackoffMs = Math.min(10_000, Math.max(this.baseBackoffMs, Number(options.maxBackoffMs) || 2_000));
    this.sleep = options.sleep || wait;
    this.now = options.now || (() => Date.now());
    this.cachePrefix = String(options.cachePrefix || 'soldream-editorial').replace(/[^a-z0-9_-]+/gi, '-').slice(0, 30);
    this.documentHash = this.cacheDocument
      ? crypto.createHash('sha256').update(this.cacheDocument).digest('hex').slice(0, 16)
      : '';
    this.cacheByModel = new Map();
    this.cachePromises = new Map();
  }

  cacheDisplayName(model) {
    const modelName = normalizeModelName(model).replace(/[^a-z0-9_-]+/g, '-').slice(0, 36);
    return `${this.cachePrefix}-${this.documentHash}-${modelName}`.slice(0, 90);
  }

  isUsableCache(cache) {
    if (!cache?.name) return false;
    const expiry = Date.parse(cache.expireTime || '');
    return Number.isFinite(expiry) && expiry - this.now() > this.cacheRefreshBufferMs;
  }

  async findRemoteCache(model) {
    const displayName = this.cacheDisplayName(model);
    const normalizedModel = normalizeModelName(model);
    const pager = await this.client.caches.list({ config: { pageSize: 100 } });
    for await (const cache of pager) {
      if (cache?.displayName === displayName
        && normalizeModelName(cache.model) === normalizedModel
        && this.isUsableCache(cache)) return cache;
    }
    return null;
  }

  async createCache(model) {
    if (!this.cacheDocument) throw new Error('Chưa cung cấp tài liệu cố định để tạo Context Cache.');
    const config = {
      displayName: this.cacheDisplayName(model),
      ttl: `${this.cacheTtlSeconds}s`,
      contents: [{ role: 'user', parts: [{ text: this.cacheDocument }] }],
    };
    if (this.cacheSystemInstruction) config.systemInstruction = this.cacheSystemInstruction;
    const cache = await this.client.caches.create({ model, config });
    if (!cache?.name) throw new Error(`Gemini không trả về ID cache cho model ${model}.`);
    this.cacheByModel.set(model, cache);
    return cache;
  }

  async ensureCache(model, options = {}) {
    if (!this.cacheDocument) return null;
    if (!options.force) {
      const local = this.cacheByModel.get(model);
      if (this.isUsableCache(local)) return local;
      if (this.cachePromises.has(model)) return this.cachePromises.get(model);
    }

    const promise = (async () => {
      if (!options.force) {
        const remote = await this.findRemoteCache(model);
        if (remote) {
          this.cacheByModel.set(model, remote);
          return remote;
        }
      }
      return this.createCache(model);
    })();
    this.cachePromises.set(model, promise);
    try { return await promise; }
    finally { if (this.cachePromises.get(model) === promise) this.cachePromises.delete(model); }
  }

  invalidateCache(model) {
    this.cacheByModel.delete(model);
  }

  backoffForFailure(failureIndex) {
    return Math.min(this.maxBackoffMs, this.baseBackoffMs * (2 ** Math.max(0, failureIndex)));
  }

  async callModel(model, params, cache) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(new Error('GEMINI_TIMEOUT')), Number(params.timeoutMs) || this.requestTimeoutMs);
    try {
      const config = { ...(params.config || {}), abortSignal: controller.signal };
      if (cache?.name) config.cachedContent = cache.name;
      const response = await this.client.models.generateContent({
        model,
        contents: params.contents,
        config,
      });
      return { response, model, cacheName: cache?.name || '', cached: Boolean(cache?.name) };
    } catch (error) {
      if (controller.signal.aborted && !/GEMINI_TIMEOUT/i.test(String(error?.message || ''))) {
        const timeout = new Error('GEMINI_TIMEOUT', { cause: error });
        timeout.status = 408;
        throw timeout;
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  uncachedParams(params) {
    const existingInstruction = String(params.config?.systemInstruction || '').trim();
    const systemInstruction = [
      this.cacheSystemInstruction,
      this.cacheDocument,
      existingInstruction,
    ].filter(Boolean).join('\n\n');
    return {
      ...params,
      config: { ...(params.config || {}), ...(systemInstruction ? { systemInstruction } : {}) },
    };
  }

  async generateContent(params = {}) {
    if (!params.contents) throw new Error('Thiếu contents cho yêu cầu Gemini.');
    const useCache = params.useCache !== false && Boolean(this.cacheDocument);
    const attempts = [];
    let lastError;
    let retryableFailures = 0;

    for (const model of this.models) {
      let cache = null;
      try {
        let callParams = params;
        if (useCache) {
          try { cache = await this.ensureCache(model); }
          catch (cacheError) {
            // Explicit caching can require billing even when generation still
            // has free quota. In that exceptional case, keep the guide active
            // by sending it directly rather than failing the whole queue.
            if (!isUnsupportedCacheError(cacheError) && !isCacheBillingError(cacheError)) throw cacheError;
            attempts.push({
              model,
              reason: isCacheBillingError(cacheError) ? 'cache-billing-unavailable' : 'cache-unsupported',
              status: errorStatus(cacheError),
              message: String(cacheError?.message || '').slice(0, 180),
            });
            callParams = this.uncachedParams(params);
          }
        }
        const result = await this.callModel(model, callParams, cache);
        result.attempts = attempts;
        if (useCache && !cache) result.cacheFallback = 'uncached-guide';
        return result;
      } catch (error) {
        lastError = error;

        // Cache có thể hết hạn giữa lúc kiểm tra và lúc generateContent chạy.
        // Tạo lại đúng một lần trên cùng model rồi mới chuyển fallback.
        if (useCache && cache?.name && isExpiredCacheError(error)) {
          attempts.push({ model, reason: 'cache-expired', status: errorStatus(error) });
          this.invalidateCache(model);
          await this.sleep(this.backoffForFailure(retryableFailures));
          try {
            const refreshed = await this.ensureCache(model, { force: true });
            const result = await this.callModel(model, params, refreshed);
            result.attempts = attempts;
            return result;
          } catch (refreshError) {
            lastError = refreshError;
          }
        }

        const retryable = isRetryableGeminiError(lastError) || isUnsupportedCacheError(lastError);
        attempts.push({
          model,
          reason: isUnsupportedCacheError(lastError) ? 'cache-unsupported' : (isRetryableGeminiError(lastError) ? 'retryable' : 'fatal'),
          status: errorStatus(lastError),
          message: String(lastError?.message || '').slice(0, 180),
        });
        if (!retryable) throw lastError;
        retryableFailures += 1;
        if (model !== this.models[this.models.length - 1]) {
          await this.sleep(this.backoffForFailure(retryableFailures - 1));
        }
      }
    }

    throw new GeminiFallbackError('Tất cả model Gemini đều tạm thời không khả dụng.', attempts, lastError);
  }
}

module.exports = {
  GeminiCachedFallbackClient,
  GeminiFallbackError,
  DEFAULT_GEMINI_MODELS,
  errorStatus,
  isRetryableGeminiError,
  isExpiredCacheError,
  isUnsupportedCacheError,
  isCacheBillingError,
  loadCacheDocument,
};
