'use strict';

const { runResearchBot, runPendingEditorialQueue } = require('./researchBot');
const db = require('../db');
let running = false; let interval; let editorialInterval;
let startupTimeout;

const RESEARCH_RUN_KEY = 'research_bot_last_scheduled_run_at';
const MIN_RESEARCH_INTERVAL_MS = 60 * 60 * 1000;
const MIN_SCHEDULE_DELAY_MS = 10_000;
const RESEARCH_SCHEDULE_POLL_MS = 60_000;

function getResearchBotIntervalMs(environment = process.env) {
  const configured = Number(environment.RESEARCH_BOT_INTERVAL_MS);
  const fallback = 7 * 24 * 60 * 60 * 1000;
  return Number.isFinite(configured) && configured > 0
    ? Math.max(MIN_RESEARCH_INTERVAL_MS, configured)
    : fallback;
}

function getNextResearchDelay(lastStartedAt, initialDelay, every, now = Date.now()) {
  const last = Number(lastStartedAt);
  if (!Number.isFinite(last) || last <= 0) return Math.max(MIN_SCHEDULE_DELAY_MS, initialDelay);
  return Math.max(MIN_SCHEDULE_DELAY_MS, last + every - now);
}

function isResearchRunDue(lastStartedAt, every, now = Date.now()) {
  const last = Number(lastStartedAt);
  return !Number.isFinite(last) || last <= 0 || now - last >= every;
}

function lastScheduledResearchRun() {
  const row = db.prepare('SELECT value FROM system_meta WHERE key=?').get(RESEARCH_RUN_KEY);
  const timestamp = Number(row?.value);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function claimScheduledResearchRun(every, now = Date.now()) {
  return db.transaction(() => {
    const last = lastScheduledResearchRun();
    if (last && now - last < every) return false;
    db.prepare(`INSERT INTO system_meta (key,value) VALUES (?,?)
      ON CONFLICT(key) DO UPDATE SET value=excluded.value`).run(RESEARCH_RUN_KEY, String(now));
    return true;
  }).immediate();
}

function runScheduledResearchIfDue(every) {
  if (running) return false;
  const now = Date.now();
  if (!isResearchRunDue(lastScheduledResearchRun(), every, now)) return false;
  if (!claimScheduledResearchRun(every, now)) return false;
  tick();
  return true;
}

async function tick() {
  if (running) return;
  running = true;
  try {
    const result = await runResearchBot();
    const added = result.reduce((sum, row) => sum + (row.added || 0), 0);
    const published = result.reduce((sum, row) => sum + (row.autoPublished || 0), 0);
    console.log(`[research] finished: ${result.length} sources, ${added} new items, ${result.editorialBatchSubmitted || 0} submitted to Gemini Batch${result.editorialBatchPolling ? ', existing Batch still running' : ''}, ${result.coverImagesUpdated || 0} covers updated`);
  } catch (error) { console.error('[research] scheduler error:', error.message); }
  finally { running = false; }
}

async function editorialTick() {
  if (running) return;
  running = true;
  try {
    const result = await runPendingEditorialQueue();
    console.log(result.alreadyRunning
      ? '[research] editorial queue skipped: another worker is active'
      : `[research] editorial queue: checked ${result.checked}, submitted ${result.submitted || 0}, published ${result.published}, failed ${result.failed}, remaining ${result.remaining}${result.polling ? `, polling Batch ${result.batchState || ''}` : ''}${result.stoppedByQuota ? ', paused by provider quota' : ''}`);
  } catch (error) { console.error('[research] editorial scheduler error:', error.message); }
  finally { running = false; }
}

function startResearchScheduler() {
  if (process.env.RESEARCH_BOT_ENABLED === '0' || interval || startupTimeout) return;
  const delay = Math.max(10_000, Number(process.env.RESEARCH_BOT_START_DELAY_MS || 60_000));
  const every = getResearchBotIntervalMs();
  const firstDelay = getNextResearchDelay(lastScheduledResearchRun(), delay, every);
  startupTimeout = setTimeout(() => {
    startupTimeout = null;
    runScheduledResearchIfDue(every);
    // Cheap local DB check only; this does not crawl or call an AI provider.
    // It lets a due crawl proceed shortly after another queue worker finishes.
    interval = setInterval(() => runScheduledResearchIfDue(every), RESEARCH_SCHEDULE_POLL_MS);
    interval.unref?.();
  }, firstDelay);
  startupTimeout.unref?.();
  const editorialDelay = Math.max(30_000, Number(process.env.RESEARCH_EDITORIAL_START_DELAY_MS || 120_000));
  const editorialEvery = Math.max(10 * 60 * 1000, Number(process.env.RESEARCH_EDITORIAL_INTERVAL_MS || 30 * 60 * 1000));
  const editorialFirst = setTimeout(() => {
    editorialTick();
    editorialInterval = setInterval(editorialTick, editorialEvery);
    editorialInterval.unref?.();
  }, editorialDelay);
  editorialFirst.unref?.();
}

module.exports = { startResearchScheduler, tick, editorialTick, getResearchBotIntervalMs, getNextResearchDelay, isResearchRunDue };
