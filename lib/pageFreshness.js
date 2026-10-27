'use strict';

const { calendarDate } = require('./publicationHistory');

// A missing date stays missing: never invent a day or use the request time.
function recordedDate(value) {
  const text = String(value || '').trim();
  if (!calendarDate(text)) return '';
  if (/T.*(?:Z|[+-]\d{2}:?\d{2})$/i.test(text)) {
    const date = new Date(text);
    if (!Number.isFinite(date.getTime())) return '';
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(date);
    const get = type => parts.find(part => part.type === type)?.value;
    return `${get('year')}-${get('month')}-${get('day')}`;
  }
  // Legacy SQLite timestamps have no timezone; preserve their recorded day.
  return calendarDate(text);
}

function latestRecordedDate(...values) {
  return values.flat(Infinity).map(recordedDate).filter(Boolean).sort().at(-1) || '';
}

function contentModifiedDate(row = {}) {
  return recordedDate(row.content_modified_at) || recordedDate(row.updated_at)
    || recordedDate(row.last_updated) || recordedDate(row.created_at);
}

const COLUMNS = Object.freeze({
  system_meta: ['key', 'updated_at'],
  page_versions: ['path', 'modified_at'],
  site_copy: ['key', 'group_name', 'updated_at'],
  shared_blocks: ['key', 'zone', 'active', 'updated_at'],
  site_datasets: ['key', 'content', 'updated_at'],
  courses: ['id', 'slug', 'published', 'last_updated', 'updated_at', 'created_at'],
  faqs: ['source_url', 'origin_type', 'origin_id', 'published', 'generated', 'updated_at', 'created_at'],
  posts: ['id', 'slug', 'topic', 'published', 'noindex', 'faq_mode', 'content_modified_at', 'updated_at', 'created_at'],
  programs: ['id', 'slug', 'category', 'published', 'noindex', 'faq_mode', 'content_modified_at', 'updated_at', 'created_at'],
  about_sections: ['location', 'active', 'updated_at', 'created_at'],
  testimonials: ['published', 'updated_at', 'created_at'],
  homepage_stats: ['active', 'updated_at', 'created_at'],
});

function readRows(db, table) {
  const available = new Set(db.prepare(`PRAGMA table_info("${table}")`).all().map(column => column.name));
  const columns = COLUMNS[table].filter(column => available.has(column));
  return columns.length ? db.prepare(`SELECT ${columns.map(column => `"${column}"`).join(',')} FROM "${table}"`).all() : [];
}

function getPageFreshness({ database } = {}) {
  const db = database || require('../db');
  const rows = Object.fromEntries(Object.keys(COLUMNS).map(table => [table, readRows(db, table)]));
  const dates = new Map();
  const add = (url, ...values) => {
    const value = latestRecordedDate(dates.get(url), values);
    if (value) dates.set(url, value);
  };
  const many = (urls, value) => urls.forEach(url => add(url, value));
  const active = row => row.active === undefined || Number(row.active) === 1;
  const published = row => row.published === undefined || Number(row.published) === 1;
  for(const row of rows.system_meta)if(row.key==='homepage_stats_source')add('/',row.updated_at);
  const topicPaths = require('./contentTopics').TOPICS.map(topic => `/tin-tuc?muc=${topic.id}`);

  for (const row of rows.page_versions) add(row.path, row.modified_at);
  const copyGroups = {
    '/gioi-thieu': ['Giới thiệu'],
    '/khoa-hoc': ['Danh sách khóa học', 'Chính sách khóa học'],
    '/du-hoc': ['Danh sách du học'],
    '/truong-dai-hoc': ['Danh sách trường'],
    '/tin-tuc': ['Danh sách cẩm nang', 'Ba tab cẩm nang'],
    '/cau-hoi-thuong-gap': ['Hỏi đáp'],
    '/cuoc-song-han-quoc': ['Sinh hoạt Hàn Quốc'],
    '/tro-ly-du-hoc': ['Trang trợ lý', 'Trợ lý – thông báo'],
  };
  for (const row of rows.site_copy) {
    if (String(row.group_name || '').startsWith('Trang chủ')) add('/', row.updated_at);
    for (const [url, groups] of Object.entries(copyGroups)) if (groups.includes(row.group_name)) add(url, row.updated_at);
    if (row.group_name === 'Danh sách cẩm nang') many(topicPaths, row.updated_at);
    for (const topicPath of topicPaths) {
      const topic = topicPath.split('=')[1];
      if (String(row.key || '').startsWith(`topic.${topic}.`)) add(topicPath, row.updated_at);
    }
  }

  for (const row of rows.shared_blocks.filter(active)) {
    // Footer, navigation and floating widgets are boilerplate, not page updates.
    if (['sections', 'home', 'values', 'consult'].includes(row.zone) || row.key.startsWith('consult-')) add('/', row.updated_at);
    if (['about-page-header', 'about-profile-download', 'about-stories-heading'].includes(row.key)) add('/gioi-thieu', row.updated_at);
    if (row.key === 'course-fee-link') add('/khoa-hoc', row.updated_at);
    if (row.key === 'school-featured-intro') add('/', row.updated_at);
  }
  for (const row of rows.about_sections.filter(active)) add(row.location === 'home' ? '/' : '/gioi-thieu', contentModifiedDate(row));
  for (const row of [...rows.testimonials.filter(published), ...rows.homepage_stats.filter(active)]) add('/', contentModifiedDate(row));

  const coursePaths = new Map(), postPaths = new Map(), programPaths = new Map();
  const homeCourseSlugs = new Set(['giao-tiep-giao-vien-han', 'tieng-han-giao-tiep', 'tieng-han-so-cap-1', 'tieng-han-cap-toc', 'phat-am-tieng-han', 'tieng-anh-giao-tiep']);
  for (const row of rows.courses.filter(published)) {
    const url = `/khoa-hoc/${row.slug || row.id}`;
    const modified = latestRecordedDate(row.updated_at, row.last_updated, row.created_at);
    coursePaths.set(String(row.id), url); add(url, modified); add('/khoa-hoc', modified);
    if (homeCourseSlugs.has(row.slug)) add('/', modified);
  }
  const visiblePosts = rows.posts.filter(published);
  for (const row of visiblePosts) {
    const url = `/tin-tuc/${row.slug}`, modified = contentModifiedDate(row);
    postPaths.set(String(row.id), url); add(url, modified); add('/tin-tuc', modified);
    if (row.topic) add(`/tin-tuc?muc=${row.topic}`, modified);
    if ([269, 270, 271].includes(Number(row.id))) add('/gioi-thieu', modified);
  }
  const homePosts = [...visiblePosts].sort((a, b) => {
    const pinned = row => row.slug === 'tuyen-dung-giao-vien-day-tieng-anh' ? 0 : 1;
    return pinned(a) - pinned(b) || String(b.created_at).localeCompare(String(a.created_at));
  }).slice(0, 3);
  for (const row of homePosts) add('/', contentModifiedDate(row));
  for (const row of rows.programs.filter(published)) {
    const school = row.category === 'Thông tin trường';
    const url = require('./util').programPublicPath(row), modified = contentModifiedDate(row);
    programPaths.set(String(row.id), url); add(url, modified); add(school ? '/truong-dai-hoc' : '/du-hoc', modified);
  }

  const programUrls = new Set(programPaths.values());
  for (const row of rows.site_datasets) {
    if(row.key==='study-abroad-hub')add('/du-hoc',row.updated_at);
    if (row.key === 'korea-life') add('/cuoc-song-han-quoc', row.updated_at);
    if (row.key === 'partners') many(['/', '/truong-dai-hoc'], row.updated_at);
    if (!row.key.startsWith('university-')) continue;
    let data; try { data = JSON.parse(row.content); } catch (_) { continue; }
    const id = data.slug || data.id || row.key.slice('university-'.length);
    const url = `/truong-dai-hoc/${id}`;
    // The program route takes precedence when a stored profile shadows a baseline.
    if (!programUrls.has(url)) add(url, row.updated_at, data.lastUpdated, data.updatedDate);
    add('/truong-dai-hoc', row.updated_at);
  }
  const parentRows = {
    post: new Map(rows.posts.map(row => [String(row.id), row])),
    program: new Map(rows.programs.map(row => [String(row.id), row])),
    course: new Map(rows.courses.map(row => [String(row.id), row])),
  };
  const visibleFaq = row => {
    if (!published(row)) return false;
    const parents = parentRows[row.origin_type];
    if (!parents) return true;
    const parent = parents.get(String(row.origin_id));
    if (!parent || !published(parent)) return false;
    return row.origin_type === 'course' || (parent.faq_mode !== 'off' && (!Number(row.generated) || parent.faq_mode === 'auto'));
  };
  for (const row of rows.faqs.filter(visibleFaq)) {
    const modified = contentModifiedDate(row);
    add('/cau-hoi-thuong-gap', modified);
    const map = { course: coursePaths, post: postPaths, program: programPaths }[row.origin_type];
    const url = map?.get(String(row.origin_id));
    if (url) add(url, modified);
    if (String(row.source_url || '').startsWith('/') && !String(row.source_url).startsWith('//')) add(row.source_url, modified);
  }
  return dates;
}

module.exports = { getPageFreshness, recordedDate, latestRecordedDate, contentModifiedDate };
