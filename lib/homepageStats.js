'use strict';

const db = require('../db');

const DEFAULT_SOURCE = 'Số liệu do SOL DREAM EDUCATION công bố và tổng hợp nội bộ; liên hệ trung tâm nếu cần phạm vi và căn cứ thống kê.';

function getHomepageStats(options = {}) {
  const where = options.includeInactive ? '' : 'WHERE active=1';
  return db.prepare(`SELECT * FROM homepage_stats ${where} ORDER BY sort_order,id`).all();
}

function getHomepageStatsSource() {
  return db.prepare("SELECT value FROM system_meta WHERE key='homepage_stats_source'").get()?.value || DEFAULT_SOURCE;
}

function formatHomepageStat(stat) {
  const value = Number(stat?.value_number || 0).toLocaleString('vi-VN');
  return `${stat?.prefix || ''}${value}${stat?.suffix || ''}`;
}

module.exports = { DEFAULT_SOURCE, getHomepageStats, getHomepageStatsSource, formatHomepageStat };
