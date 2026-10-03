'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { GoogleGenAI } = require('@google/genai');

let sharedClient;

function getGeminiBatchClient() {
  if (!process.env.GEMINI_API_KEY) throw new Error('Thiếu GEMINI_API_KEY cho Gemini Batch API.');
  if (!sharedClient) sharedClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, apiVersion: 'v1beta' });
  return sharedClient;
}

function makeBatchJsonl(items) {
  return items.map(({ key, request }) => JSON.stringify({ key: String(key), request })).join('\n') + '\n';
}

function batchResponseText(line) {
  const response = line?.response || line?.result || line;
  if (typeof response?.text === 'string') return response.text;
  const parts = response?.candidates?.[0]?.content?.parts || [];
  return parts.map((part) => part?.text || '').filter(Boolean).join('');
}

function batchState(job) {
  return String(job?.state || job?.status || '').toUpperCase().replace(/^JOB_STATE_/, '');
}

function batchTokenUsage(line) {
  const usage = line?.response?.usageMetadata || line?.response?.usage_metadata || line?.usageMetadata || {};
  return {
    prompt: Number(usage.promptTokenCount || usage.prompt_token_count || 0),
    output: Number(usage.candidatesTokenCount || usage.candidates_token_count || 0),
  };
}

async function submitGeminiBatch(items, { model, client = getGeminiBatchClient() } = {}) {
  if (!Array.isArray(items) || !items.length) throw new Error('Không có yêu cầu nào để đưa vào Gemini Batch.');
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'soldream-gemini-batch-'));
  const inputPath = path.join(workDir, 'requests.jsonl');
  const displayName = `soldream-editorial-${new Date().toISOString().replace(/[:.]/g, '-')}-${crypto.randomBytes(3).toString('hex')}`;
  fs.writeFileSync(inputPath, makeBatchJsonl(items), 'utf8');
  let uploaded;
  try {
    uploaded = await client.files.upload({
      file: inputPath,
      config: { displayName: `${displayName}.jsonl`, mimeType: 'jsonl' },
    });
    if (!uploaded?.name) throw new Error('Gemini không trả tên tệp JSONL đã tải lên.');
    const job = await client.batches.create({
      model,
      src: uploaded.name,
      config: { displayName },
    });
    if (!job?.name) throw new Error('Gemini không trả mã Batch job.');
    return { job, uploaded, displayName };
  } catch (error) {
    if (uploaded?.name) await client.files.delete({ name: uploaded.name }).catch(() => {});
    throw error;
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true });
  }
}

async function downloadBatchResults(job, { client = getGeminiBatchClient() } = {}) {
  const fileName = job?.dest?.fileName || job?.destination?.fileName;
  if (Array.isArray(job?.dest?.inlinedResponses)) return job.dest.inlinedResponses;
  if (!fileName) throw new Error(`Batch ${job?.name || ''} hoàn tất nhưng chưa có tệp kết quả.`);
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'soldream-gemini-result-'));
  const outputPath = path.join(workDir, 'results.jsonl');
  try {
    await client.files.download({ file: fileName, downloadPath: outputPath });
    return fs.readFileSync(outputPath, 'utf8').split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true });
  }
}

module.exports = { makeBatchJsonl, batchResponseText, batchState, batchTokenUsage, submitGeminiBatch, downloadBatchResults, getGeminiBatchClient };
