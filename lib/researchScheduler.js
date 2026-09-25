'use strict';

const { runResearchBot, runPendingEditorialQueue } = require('./researchBot');
let running = false; let interval; let editorialInterval;

async function tick() {
  if (running) return;
  running = true;
  try {
    const result = await runResearchBot();
    const added = result.reduce((sum, row) => sum + (row.added || 0), 0);
    const published = result.reduce((sum, row) => sum + (row.autoPublished || 0), 0);
    console.log(`[research] finished: ${result.length} sources, ${added} new items, ${published} handbooks auto-published, ${result.coverImagesUpdated || 0} covers added`);
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
      : `[research] editorial queue: checked ${result.checked}, published ${result.published}, failed ${result.failed}, remaining ${result.remaining}${result.stoppedByQuota ? ', paused by provider quota' : ''}`);
  } catch (error) { console.error('[research] editorial scheduler error:', error.message); }
  finally { running = false; }
}

function startResearchScheduler() {
  if (process.env.RESEARCH_BOT_ENABLED === '0' || interval) return;
  const delay = Math.max(10_000, Number(process.env.RESEARCH_BOT_START_DELAY_MS || 60_000));
  const every = Math.max(60 * 60 * 1000, Number(process.env.RESEARCH_BOT_INTERVAL_MS || 12 * 60 * 60 * 1000));
  const first = setTimeout(() => { tick(); interval = setInterval(tick, every); interval.unref?.(); }, delay);
  first.unref?.();
  const editorialDelay = Math.max(30_000, Number(process.env.RESEARCH_EDITORIAL_START_DELAY_MS || 120_000));
  const editorialEvery = Math.max(10 * 60 * 1000, Number(process.env.RESEARCH_EDITORIAL_INTERVAL_MS || 30 * 60 * 1000));
  const editorialFirst = setTimeout(() => {
    editorialTick();
    editorialInterval = setInterval(editorialTick, editorialEvery);
    editorialInterval.unref?.();
  }, editorialDelay);
  editorialFirst.unref?.();
}

module.exports = { startResearchScheduler, tick, editorialTick };
