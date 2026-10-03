'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { makeBatchJsonl, batchResponseText, batchState, batchTokenUsage, submitGeminiBatch, downloadBatchResults } = require('../lib/geminiBatch');

test('Gemini Batch JSONL keeps a stable request key and API request envelope', () => {
  const rows = [
    { key: 'research-1-abc', request: { contents: [{ role: 'user', parts: [{ text: 'clean article' }] }] } },
    { key: 'research-2-def', request: { generationConfig: { responseMimeType: 'application/json' } } },
  ];
  const lines = makeBatchJsonl(rows).trim().split('\n').map((line) => JSON.parse(line));
  assert.equal(lines.length, 2);
  assert.equal(lines[0].key, rows[0].key);
  assert.deepEqual(lines[0].request, rows[0].request);
  assert.deepEqual(lines[1].request, rows[1].request);
});

test('Gemini Batch response extraction supports file JSONL and inlined response forms', () => {
  assert.equal(batchResponseText({ key: 'a', response: { candidates: [{ content: { parts: [{ text: '{"title":' }, { text: '"ok"}' }] } }] } }), '{"title":"ok"}');
  assert.equal(batchResponseText({ response: { text: '{"title":"ok"}' } }), '{"title":"ok"}');
  assert.equal(batchState({ state: 'JOB_STATE_RUNNING' }), 'RUNNING');
  assert.deepEqual(batchTokenUsage({ response: { usageMetadata: { promptTokenCount: 123, candidatesTokenCount: 456 } } }), { prompt: 123, output: 456 });
});

test('Gemini Batch uploads a JSONL file, creates a persisted job and downloads keyed results', async () => {
  const calls = [];
  const client = {
    files: {
      async upload({ file, config }) {
        calls.push({ op: 'upload', body: fs.readFileSync(file, 'utf8'), config });
        return { name: 'files/input-1' };
      },
      async download({ file, downloadPath }) {
        calls.push({ op: 'download', file });
        fs.writeFileSync(downloadPath, '{"key":"request-1","response":{"candidates":[]}}\n');
      },
      async delete({ name }) { calls.push({ op: 'delete', name }); },
    },
    batches: {
      async create(params) { calls.push({ op: 'create', params }); return { name: 'batches/job-1' }; },
    },
  };
  const submitted = await submitGeminiBatch([{ key: 'request-1', request: { contents: [] } }], { model: 'gemini-test', client });
  assert.equal(submitted.job.name, 'batches/job-1');
  assert.equal(submitted.uploaded.name, 'files/input-1');
  assert.equal(calls[0].config.mimeType, 'jsonl');
  assert.equal(calls[1].params.src, 'files/input-1');
  const results = await downloadBatchResults({ dest: { fileName: 'files/output-1' } }, { client });
  assert.equal(results[0].key, 'request-1');
});
