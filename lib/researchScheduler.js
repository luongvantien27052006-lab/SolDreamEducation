'use strict';

const { runResearchBot, runPendingEditorialQueue } = require('./researchBot');
const db = require('../db');
const { sourcePolicy } = require('./researchPolicy');
let running = false; let interval; let editorialInterval;
let startupTimeout;

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

function runScheduledResearchIfDue(every) {
  if (running) return false;
  const now = Date.now();
  const due = db.prepare('SELECT * FROM research_sources WHERE active=1 AND next_crawl_at_ms<=?').all(now)
    .some(source => sourcePolicy(source).allowed);
  if (!due) return false;
  tick({ scheduled: true, schoolIntervalMs: every });
  return true;
}

async function tick(options = { scheduled: true, schoolIntervalMs: getResearchBotIntervalMs() }) {
  if (running) return;
  running = true;
  try {
    const result = await runResearchBot(options);
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
  // Each source carries its persisted deadline; a restart never resets the
  // monthly clock. This timer only checks local deadlines, without web requests.
  const firstDelay = delay;
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
