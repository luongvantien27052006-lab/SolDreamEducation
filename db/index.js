'use strict';
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const { inferTopic, normalizeTopic, topicLabel } = require('../lib/contentTopics');

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, 'data.sqlite');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ---- Schema ----
db.exec(`
CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title      TEXT NOT NULL,
  slug       TEXT NOT NULL UNIQUE,
  excerpt    TEXT NOT NULL DEFAULT '',
  content    TEXT NOT NULL DEFAULT '',
  category   TEXT NOT NULL DEFAULT 'Tin tức',
  topic      TEXT NOT NULL DEFAULT 'thong-tin-han-quoc',
  cover      TEXT NOT NULL DEFAULT 'p1',
  cover_image TEXT,
  author_name TEXT NOT NULL DEFAULT '',
  author_role TEXT NOT NULL DEFAULT '',
  source_urls TEXT NOT NULL DEFAULT '',
  published  INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE TABLE IF NOT EXISTS page_views (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  path       TEXT NOT NULL,
  visitor_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS idx_pv_created ON page_views(created_at);
CREATE INDEX IF NOT EXISTS idx_pv_visitor ON page_views(visitor_id);
CREATE TABLE IF NOT EXISTS programs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT NOT NULL,
  subtitle    TEXT NOT NULL DEFAULT '',
  slug        TEXT NOT NULL UNIQUE,
  excerpt     TEXT NOT NULL DEFAULT '',
  content     TEXT NOT NULL DEFAULT '',
  category    TEXT NOT NULL DEFAULT 'Thông tin trường',
  cover       TEXT NOT NULL DEFAULT 'p1',
  cover_image TEXT,
  author_name TEXT NOT NULL DEFAULT '',
  author_role TEXT NOT NULL DEFAULT '',
  source_urls TEXT NOT NULL DEFAULT '',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  published   INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  bluf_summary TEXT NOT NULL DEFAULT '',
  audience TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  price TEXT NOT NULL DEFAULT '',
  language TEXT NOT NULL DEFAULT 'Tiếng Hàn',
  financials_json TEXT NOT NULL DEFAULT '{}',
  requirements_json TEXT NOT NULL DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  published INTEGER NOT NULL DEFAULT 1,
  last_updated TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS idx_courses_public ON courses(published, sort_order, name);
CREATE TABLE IF NOT EXISTS chat_knowledge_documents (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL,
  source_updated_at TEXT NOT NULL DEFAULT '',
  content_hash TEXT NOT NULL,
  indexed_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS idx_chat_docs_type ON chat_knowledge_documents(type);
CREATE INDEX IF NOT EXISTS idx_chat_docs_url ON chat_knowledge_documents(url);
CREATE TABLE IF NOT EXISTS chat_suggested_questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question TEXT NOT NULL UNIQUE,
  document_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL DEFAULT '',
  priority INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS idx_chat_questions_priority ON chat_suggested_questions(priority DESC, id ASC);
CREATE TABLE IF NOT EXISTS faqs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  source_url TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  published INTEGER NOT NULL DEFAULT 0,
  generated INTEGER NOT NULL DEFAULT 0,
  origin_type TEXT NOT NULL DEFAULT '',
  origin_id TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS idx_faqs_public ON faqs(published, category, sort_order, id);
CREATE TABLE IF NOT EXISTS research_sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  source_type TEXT NOT NULL DEFAULT 'official',
  language TEXT NOT NULL DEFAULT 'vi',
  keywords TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1,
  auto_publish_non_school INTEGER NOT NULL DEFAULT 1,
  crawl_delay_ms INTEGER NOT NULL DEFAULT 0,
  last_crawled_at TEXT,
  last_status TEXT NOT NULL DEFAULT '',
  last_error TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE TABLE IF NOT EXISTS research_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  excerpt TEXT NOT NULL DEFAULT '',
  published_at TEXT NOT NULL DEFAULT '',
  fingerprint TEXT NOT NULL UNIQUE,
  suggested_section TEXT NOT NULL DEFAULT 'Cẩm nang & Thông tin',
  topic TEXT NOT NULL DEFAULT 'thong-tin-han-quoc',
  quality_score INTEGER NOT NULL DEFAULT 0,
  optimization_note TEXT NOT NULL DEFAULT '',
  media_json TEXT NOT NULL DEFAULT '{}',
  official_url TEXT NOT NULL DEFAULT '',
  source_text TEXT NOT NULL DEFAULT '',
  source_data_json TEXT NOT NULL DEFAULT '{}',
  source_content_hash TEXT NOT NULL DEFAULT '',
  source_captured_at TEXT NOT NULL DEFAULT '',
  published_post_id INTEGER,
  published_program_id INTEGER,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  FOREIGN KEY(source_id) REFERENCES research_sources(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_research_items_status ON research_items(status, created_at DESC);
CREATE TABLE IF NOT EXISTS research_ai_batches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  model TEXT NOT NULL,
  input_file_name TEXT NOT NULL DEFAULT '',
  state TEXT NOT NULL DEFAULT 'SUBMITTED',
  last_error TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS idx_research_ai_batches_state ON research_ai_batches(state, created_at);
CREATE TABLE IF NOT EXISTS research_ai_batch_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  batch_id INTEGER NOT NULL,
  research_item_id INTEGER NOT NULL,
  request_key TEXT NOT NULL UNIQUE,
  input_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'SUBMITTED',
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  last_error TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  FOREIGN KEY(batch_id) REFERENCES research_ai_batches(id) ON DELETE CASCADE,
  FOREIGN KEY(research_item_id) REFERENCES research_items(id) ON DELETE CASCADE,
  UNIQUE(batch_id, research_item_id)
);
CREATE INDEX IF NOT EXISTS idx_research_ai_batch_items_state ON research_ai_batch_items(batch_id, status);
CREATE TABLE IF NOT EXISTS testimonials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT '',
  quote TEXT NOT NULL,
  avatar_image TEXT NOT NULL DEFAULT '',
  initials TEXT NOT NULL DEFAULT '',
  rating INTEGER NOT NULL DEFAULT 5,
  sort_order INTEGER NOT NULL DEFAULT 0,
  published INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS idx_testimonials_public ON testimonials(published, sort_order, id);
CREATE TABLE IF NOT EXISTS popups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL DEFAULT '',
  button_text TEXT NOT NULL DEFAULT '',
  button_url TEXT NOT NULL DEFAULT '',
  placement TEXT NOT NULL DEFAULT 'sitewide',
  delay_seconds INTEGER NOT NULL DEFAULT 3,
  show_once INTEGER NOT NULL DEFAULT 1,
  active INTEGER NOT NULL DEFAULT 0,
  starts_at TEXT NOT NULL DEFAULT '',
  ends_at TEXT NOT NULL DEFAULT '',
  system_key TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS idx_popups_active ON popups(active, starts_at, ends_at);
CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  interest TEXT NOT NULL DEFAULT '',
  interest_detail TEXT NOT NULL DEFAULT '',
  lead_type TEXT NOT NULL DEFAULT 'course',
  source_path TEXT NOT NULL DEFAULT '',
  source_title TEXT NOT NULL DEFAULT '',
  subscription_active INTEGER NOT NULL DEFAULT 1,
  unsubscribe_token TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'new',
  notified INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_phone_created ON leads(phone, created_at DESC);
CREATE TABLE IF NOT EXISTS lead_email_notifications (
  lead_id INTEGER PRIMARY KEY REFERENCES leads(id) ON DELETE CASCADE,
  recipient TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_ms INTEGER NOT NULL DEFAULT 0,
  lease_until_ms INTEGER NOT NULL DEFAULT 0,
  provider_message_id TEXT NOT NULL DEFAULT '',
  last_error TEXT NOT NULL DEFAULT '',
  sent_at TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_lead_email_pending ON lead_email_notifications(status,next_attempt_ms);
CREATE TABLE IF NOT EXISTS subscriber_notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id INTEGER NOT NULL,
  content_type TEXT NOT NULL,
  content_id TEXT NOT NULL,
  content_title TEXT NOT NULL,
  content_excerpt TEXT NOT NULL DEFAULT '',
  content_path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT NOT NULL DEFAULT '',
  sent_at TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  FOREIGN KEY(lead_id) REFERENCES leads(id) ON DELETE CASCADE,
  UNIQUE(lead_id, content_type, content_id)
);
CREATE INDEX IF NOT EXISTS idx_subscriber_notifications_status ON subscriber_notifications(status, created_at);
CREATE TABLE IF NOT EXISTS contact_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip_hash TEXT NOT NULL,
  phone_hash TEXT NOT NULL DEFAULT '',
  outcome TEXT NOT NULL DEFAULT 'attempt',
  created_at_ms INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_contact_attempts_ip ON contact_attempts(ip_hash, created_at_ms);
CREATE INDEX IF NOT EXISTS idx_contact_attempts_phone ON contact_attempts(phone_hash, created_at_ms);
CREATE TABLE IF NOT EXISTS system_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE TABLE IF NOT EXISTS homepage_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  value_number INTEGER NOT NULL DEFAULT 0,
  prefix TEXT NOT NULL DEFAULT '',
  suffix TEXT NOT NULL DEFAULT '',
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS idx_homepage_stats_public ON homepage_stats(active, sort_order, id);
CREATE TABLE IF NOT EXISTS about_sections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  location TEXT NOT NULL DEFAULT 'page',
  eyebrow TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  section_style TEXT NOT NULL DEFAULT 'standard',
  sort_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS idx_about_sections_public ON about_sections(location, active, sort_order, id);
CREATE TABLE IF NOT EXISTS web_sessions (
  sid TEXT PRIMARY KEY,
  session_json TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS idx_web_sessions_expires ON web_sessions(expires_at);
`);

// ---- Migration: add cover_image if upgrading an older database ----
const _cols = db.prepare("PRAGMA table_info(posts)").all().map(c => c.name);
if (!_cols.includes('cover_image')) {
  db.exec("ALTER TABLE posts ADD COLUMN cover_image TEXT");
  console.log('[db] migrated: added posts.cover_image');
}
if (!_cols.includes('topic')) db.exec("ALTER TABLE posts ADD COLUMN topic TEXT NOT NULL DEFAULT 'thong-tin-han-quoc'");
db.exec('CREATE INDEX IF NOT EXISTS idx_posts_topic_public ON posts(topic,published,created_at)');
for (const column of ['author_name', 'author_role', 'source_urls']) {
  if (!_cols.includes(column)) db.exec(`ALTER TABLE posts ADD COLUMN ${column} TEXT NOT NULL DEFAULT ''`);
}
for (const [column, definition] of Object.entries({
  author_url: "TEXT NOT NULL DEFAULT ''",
  seo_title: "TEXT NOT NULL DEFAULT ''",
  meta_description: "TEXT NOT NULL DEFAULT ''",
  focus_keyword: "TEXT NOT NULL DEFAULT ''",
  noindex: 'INTEGER NOT NULL DEFAULT 0',
  first_published_at: "TEXT NOT NULL DEFAULT ''",
  content_modified_at: "TEXT NOT NULL DEFAULT ''",
  publication_clock_tracked: 'INTEGER NOT NULL DEFAULT 0',
  author_type: "TEXT NOT NULL DEFAULT 'organization'",
})) {
  if (!_cols.includes(column)) db.exec(`ALTER TABLE posts ADD COLUMN ${column} ${definition}`);
}
const _programCols = db.prepare("PRAGMA table_info(programs)").all().map(c => c.name);
for (const column of ['author_name', 'author_role', 'source_urls']) {
  if (!_programCols.includes(column)) db.exec(`ALTER TABLE programs ADD COLUMN ${column} TEXT NOT NULL DEFAULT ''`);
}
for (const column of ['cover_source_url', 'cover_attribution']) {
  if (!_programCols.includes(column)) db.exec(`ALTER TABLE programs ADD COLUMN ${column} TEXT NOT NULL DEFAULT ''`);
}
const _researchSourceCols = db.prepare("PRAGMA table_info(research_sources)").all().map(c => c.name);
if (!_researchSourceCols.includes('crawl_delay_ms')) db.exec('ALTER TABLE research_sources ADD COLUMN crawl_delay_ms INTEGER NOT NULL DEFAULT 0');
if (!_researchSourceCols.includes('auto_publish_non_school')) db.exec('ALTER TABLE research_sources ADD COLUMN auto_publish_non_school INTEGER NOT NULL DEFAULT 1');
if (!_researchSourceCols.includes('next_crawl_at_ms')) db.exec('ALTER TABLE research_sources ADD COLUMN next_crawl_at_ms INTEGER NOT NULL DEFAULT 0');
if (!_researchSourceCols.includes('notice_urls')) db.exec("ALTER TABLE research_sources ADD COLUMN notice_urls TEXT NOT NULL DEFAULT '[]'");
db.exec(`CREATE TABLE IF NOT EXISTS research_school_seen (
  source_id INTEGER NOT NULL REFERENCES research_sources(id) ON DELETE CASCADE,
  url TEXT NOT NULL, first_seen_at_ms INTEGER NOT NULL, PRIMARY KEY(source_id,url)
);
CREATE TABLE IF NOT EXISTS research_school_lists (
  source_id INTEGER NOT NULL REFERENCES research_sources(id) ON DELETE CASCADE,
  url TEXT NOT NULL, baseline_at_ms INTEGER NOT NULL DEFAULT 0,
  etag TEXT NOT NULL DEFAULT '',last_modified TEXT NOT NULL DEFAULT '',last_checked_at_ms INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(source_id,url)
);
CREATE TABLE IF NOT EXISTS research_school_images (
  school_key TEXT PRIMARY KEY, image_url TEXT NOT NULL DEFAULT '',source_url TEXT NOT NULL DEFAULT '',
  last_attempt_at_ms INTEGER NOT NULL
);`);
const _faqCols = db.prepare("PRAGMA table_info(faqs)").all().map(c => c.name);
if (!_faqCols.includes('origin_type')) db.exec("ALTER TABLE faqs ADD COLUMN origin_type TEXT NOT NULL DEFAULT ''");
if (!_faqCols.includes('origin_id')) db.exec("ALTER TABLE faqs ADD COLUMN origin_id TEXT NOT NULL DEFAULT ''");
db.exec('CREATE INDEX IF NOT EXISTS idx_faqs_origin ON faqs(origin_type, origin_id, generated)');
const _researchItemCols = db.prepare("PRAGMA table_info(research_items)").all().map(c => c.name);
if (!_researchItemCols.includes('topic')) db.exec("ALTER TABLE research_items ADD COLUMN topic TEXT NOT NULL DEFAULT 'thong-tin-han-quoc'");
if (!_researchItemCols.includes('content_kind')) db.exec("ALTER TABLE research_items ADD COLUMN content_kind TEXT NOT NULL DEFAULT ''");
db.exec('CREATE INDEX IF NOT EXISTS idx_research_topic_status ON research_items(topic,status,created_at)');
if (!_researchItemCols.includes('quality_score')) db.exec('ALTER TABLE research_items ADD COLUMN quality_score INTEGER NOT NULL DEFAULT 0');
if (!_researchItemCols.includes('optimization_note')) db.exec("ALTER TABLE research_items ADD COLUMN optimization_note TEXT NOT NULL DEFAULT ''");
if (!_researchItemCols.includes('media_json')) db.exec("ALTER TABLE research_items ADD COLUMN media_json TEXT NOT NULL DEFAULT '{}'");
if (!_researchItemCols.includes('published_post_id')) db.exec('ALTER TABLE research_items ADD COLUMN published_post_id INTEGER');
if (!_researchItemCols.includes('published_program_id')) db.exec('ALTER TABLE research_items ADD COLUMN published_program_id INTEGER');
if (!_researchItemCols.includes('official_url')) db.exec("ALTER TABLE research_items ADD COLUMN official_url TEXT NOT NULL DEFAULT ''");
if (!_researchItemCols.includes('source_text')) db.exec("ALTER TABLE research_items ADD COLUMN source_text TEXT NOT NULL DEFAULT ''");
if (!_researchItemCols.includes('source_data_json')) db.exec("ALTER TABLE research_items ADD COLUMN source_data_json TEXT NOT NULL DEFAULT '{}'");
if (!_researchItemCols.includes('source_content_hash')) db.exec("ALTER TABLE research_items ADD COLUMN source_content_hash TEXT NOT NULL DEFAULT ''");
if (!_researchItemCols.includes('source_captured_at')) db.exec("ALTER TABLE research_items ADD COLUMN source_captured_at TEXT NOT NULL DEFAULT ''");
db.exec("CREATE INDEX IF NOT EXISTS idx_research_content_hash ON research_items(source_content_hash) WHERE source_content_hash<>''");
const _researchBatchItemCols = db.prepare("PRAGMA table_info(research_ai_batch_items)").all().map(c => c.name);
if (!_researchBatchItemCols.includes('prompt_tokens')) db.exec('ALTER TABLE research_ai_batch_items ADD COLUMN prompt_tokens INTEGER NOT NULL DEFAULT 0');
if (!_researchBatchItemCols.includes('output_tokens')) db.exec('ALTER TABLE research_ai_batch_items ADD COLUMN output_tokens INTEGER NOT NULL DEFAULT 0');
const _leadCols = db.prepare("PRAGMA table_info(leads)").all().map(c => c.name);
const subscriberNotificationColumns=db.prepare('PRAGMA table_info(subscriber_notifications)').all().map(c=>c.name);
for(const [name,type] of Object.entries({provider_message_id:"TEXT NOT NULL DEFAULT ''",lease_until_ms:'INTEGER NOT NULL DEFAULT 0',next_attempt_ms:'INTEGER NOT NULL DEFAULT 0'})){
  if(!subscriberNotificationColumns.includes(name))db.exec(`ALTER TABLE subscriber_notifications ADD COLUMN ${name} ${type}`);
}
if (!_leadCols.includes('email')) db.exec("ALTER TABLE leads ADD COLUMN email TEXT NOT NULL DEFAULT ''");
if (!_leadCols.includes('lead_type')) db.exec("ALTER TABLE leads ADD COLUMN lead_type TEXT NOT NULL DEFAULT 'course'");
if (!_leadCols.includes('interest_detail')) db.exec("ALTER TABLE leads ADD COLUMN interest_detail TEXT NOT NULL DEFAULT ''");
if (!_leadCols.includes('source_title')) db.exec("ALTER TABLE leads ADD COLUMN source_title TEXT NOT NULL DEFAULT ''");
if (!_leadCols.includes('subscription_active')) db.exec('ALTER TABLE leads ADD COLUMN subscription_active INTEGER NOT NULL DEFAULT 1');
if (!_leadCols.includes('unsubscribe_token')) db.exec("ALTER TABLE leads ADD COLUMN unsubscribe_token TEXT NOT NULL DEFAULT ''");
db.prepare("UPDATE leads SET unsubscribe_token=lower(hex(randomblob(24))) WHERE unsubscribe_token='' ").run();
db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_unsubscribe_token ON leads(unsubscribe_token) WHERE unsubscribe_token != ''");
db.exec('CREATE INDEX IF NOT EXISTS idx_leads_email_created ON leads(email, created_at DESC)');

// Homepage proof points are editable in Admin. Seed exactly once and never
// recreate items after an administrator intentionally deletes all of them.
const homepageStatsSeeded = db.prepare("SELECT 1 FROM system_meta WHERE key='homepage_stats_seeded'").get();
if (!homepageStatsSeeded && db.prepare('SELECT COUNT(*) c FROM homepage_stats').get().c === 0) {
  const insertHomepageStat = db.prepare(`INSERT INTO homepage_stats
    (value_number,prefix,suffix,label,sort_order,active) VALUES (?,?,?,?,?,1)`);
  db.transaction(() => {
    insertHomepageStat.run(5, '', '+', 'Năm đồng hành', 10);
    insertHomepageStat.run(1000, '', '+', 'Học viên tin tưởng', 20);
    insertHomepageStat.run(20, '', '+', 'Trường ĐH đối tác Hàn Quốc', 30);
    insertHomepageStat.run(95, '', '%', 'Hồ sơ visa thành công', 40);
  })();
}
if (!homepageStatsSeeded) db.prepare("INSERT INTO system_meta (key,value) VALUES ('homepage_stats_seeded','1')").run();
if (!db.prepare("SELECT 1 FROM system_meta WHERE key='homepage_stats_source'").get()) {
  db.prepare("INSERT INTO system_meta (key,value) VALUES ('homepage_stats_source',?)")
    .run('Số liệu do SOL DREAM EDUCATION công bố và tổng hợp nội bộ; liên hệ trung tâm nếu cần phạm vi và căn cứ thống kê.');
}

// The introduction shown on both the homepage and /gioi-thieu is editable in
// Admin. Seed it once; deleted sections must not reappear after a restart.
const aboutSectionsSeeded = db.prepare("SELECT 1 FROM system_meta WHERE key='about_sections_seeded'").get();
if (!aboutSectionsSeeded && db.prepare('SELECT COUNT(*) c FROM about_sections').get().c === 0) {
  const insertAboutSection = db.prepare(`INSERT INTO about_sections
    (location,eyebrow,title,content,section_style,sort_order,active) VALUES (?,?,?,?,?,?,1)`);
  db.transaction(() => {
    insertAboutSection.run('home', 'Về Sol Dream', 'Môi trường học tiếng Hàn năng động, đồng hành tới ngày bạn sang Hàn',
      '<p class="section-lead">SOL DREAM EDUCATION kết hợp môi trường học ngoại ngữ, giáo viên Hàn Quốc, đội ngũ có kinh nghiệm và hoạt động định hướng du học. Học viên được chuẩn bị tiếng Hàn, tìm hiểu ngành trường và xây dựng lộ trình trước khi sang Hàn Quốc.</p><p>Đến với Sol Dream, bạn không chỉ trau dồi tiếng Hàn cùng giáo viên Hàn Quốc và đội ngũ thạc sĩ, tiến sĩ cốt lõi, mà còn được định hướng tương lai và nhận những suất học bổng hấp dẫn khi đăng ký du học Hàn Quốc.</p><ul class="about__list"><li>Giáo viên Hàn Quốc bản ngữ</li><li>Giao lưu văn hóa hàng tháng</li><li>Cơ sở vật chất hiện đại</li><li>Săn học bổng &amp; định hướng ngành</li></ul>',
      'standard', 10);
    insertAboutSection.run('page', 'Trả lời nhanh', 'SOL DREAM EDUCATION',
      '<p><strong>SOL DREAM EDUCATION</strong> cung cấp các khóa tiếng Hàn, định hướng trường/ngành, hỗ trợ chuẩn bị hồ sơ và tư vấn lộ trình du học Hàn Quốc. Trung tâm đặt tại 89 đường S11, phường Tây Thạnh, quận Tân Phú, TP.HCM.</p>',
      'direct-answer', 10);
    insertAboutSection.run('page', '', 'Thông tin nhận diện',
      '<p class="section-lead">SOL DREAM EDUCATION hoạt động trong lĩnh vực đào tạo ngoại ngữ và tư vấn du học Hàn Quốc từ năm 2019 tại quận Tân Phú, TP.HCM. Các thông tin liên hệ chính thức gồm địa chỉ 89 đường S11, số 0364 648 282 và email soldream.edu@gmail.com.</p><ul><li><strong>Tên sử dụng:</strong> SOL DREAM EDUCATION</li><li><strong>Lĩnh vực:</strong> Đào tạo tiếng Hàn, tiếng Anh giao tiếp và tư vấn du học Hàn Quốc</li><li><strong>Năm hoạt động:</strong> 2019</li><li><strong>Địa chỉ:</strong> 89 đường S11, phường Tây Thạnh, quận Tân Phú, TP.HCM</li><li><strong>Điện thoại/Zalo:</strong> 0364 648 282</li><li><strong>Email:</strong> soldream.edu@gmail.com</li></ul>',
      'standard', 20);
    insertAboutSection.run('page', '', 'Sol Dream hỗ trợ những gì?',
      '<p class="section-lead">SOL DREAM EDUCATION kết hợp đào tạo tiếng Hàn với tư vấn trường, ngành và lộ trình du học. Phạm vi hỗ trợ gồm chuẩn bị ngoại ngữ, định hướng theo học lực và ngân sách, hoàn thiện hồ sơ, chứng minh tài chính, luyện phỏng vấn và chuẩn bị nhập học.</p><ul><li>Đào tạo tiếng Hàn nền tảng, giao tiếp, phát âm và cấp tốc chuẩn bị du học.</li><li>Tư vấn lựa chọn trường, ngành và lộ trình theo học lực, tiếng Hàn và ngân sách.</li><li>Hỗ trợ chuẩn bị hồ sơ, chứng minh tài chính và luyện phỏng vấn theo từng chương trình.</li><li>Đồng hành trước khi nhập cảnh và trong giai đoạn chuẩn bị nhập học.</li></ul><p><a class="knowledge-card__link" href="/khoa-hoc">Xem danh sách khóa học →</a></p><p><a class="knowledge-card__link" href="/truong-dai-hoc">Tra cứu thông tin trường đại học →</a></p>',
      'standard', 30);
    insertAboutSection.run('page', '', 'Đội ngũ và định hướng',
      '<p class="section-lead">Theo thông tin trung tâm công bố, đội ngũ Sol Dream gồm cựu du học sinh Việt Nam từng học tập tại Hàn Quốc, giáo viên Hàn Quốc và nhân sự có trình độ sau đại học. Mục tiêu của trung tâm là kết hợp đào tạo ngôn ngữ với định hướng học tập thực tế.</p>',
      'standard', 40);
    insertAboutSection.run('page', '', 'Minh bạch nguồn thông tin',
      '<p class="section-lead">Đây là trang giới thiệu do chính SOL DREAM EDUCATION công bố, không phải đánh giá độc lập của bên thứ ba. Các số liệu thành tích trên website là số liệu nội bộ và nên được đối chiếu trực tiếp với trung tâm khi người dùng cần hồ sơ chứng minh.</p><p><strong>Kênh chính thức:</strong> <a href="https://www.facebook.com/soldreamedu" target="_blank" rel="noopener noreferrer">Facebook</a> · <a href="https://www.instagram.com/soldream.education/" target="_blank" rel="noopener noreferrer">Instagram</a> · <a href="https://www.youtube.com/channel/UCg1e9UU_TwXfx031oqmUc5Q" target="_blank" rel="noopener noreferrer">YouTube</a></p>',
      'source-box', 50);
  })();
}
if (!aboutSectionsSeeded) db.prepare("INSERT INTO system_meta (key,value) VALUES ('about_sections_seeded','1')").run();

// Add the three official introduction tabs supplied by SOL DREAM EDUCATION.
// The migration is recorded once so later Admin edits are never overwritten.
const officialTeamStructureContent = `<p>SOL DREAM EDUCATION tổ chức đội ngũ theo ba khối trọng tâm, mỗi khối có một người phụ trách chuyên môn rõ ràng để phối hợp xuyên suốt quá trình đào tạo, tư vấn và phát triển hoạt động.</p>
  <div>
    <figure><img src="/img/dao-duy-thang.jpg" alt="Tiến sĩ Đào Duy Thắng, phụ trách Khối kinh doanh SOL DREAM EDUCATION" width="1706" height="2560"><figcaption><span>Khối kinh doanh</span><strong>Tiến sĩ Đào Duy Thắng</strong><span>Tiến sĩ Đại học Woosong<br>Chuyên ngành Quản trị học</span></figcaption></figure>
    <figure><img src="/img/pham-vuong-kha-tran.jpg" alt="Thạc sĩ Phạm Vương Khả Trân, phụ trách Khối tư vấn SOL DREAM EDUCATION" width="354" height="472"><figcaption><span>Khối tư vấn</span><strong>Thạc sĩ Phạm Vương Khả Trân</strong><span>Thạc sĩ Kinh doanh Quốc Tế, Đại học Woosong Hàn Quốc</span><span>Đạt chứng nhận “Xuất Sắc hoàn thành nghiệp vụ tư vấn Du học” do Sở GDDT Tp.Hồ Chí Minh tổ chức</span></figcaption></figure>
    <figure><img src="/img/nguyen-huynh-nhu.jpg" alt="Thạc sĩ Nguyễn Huỳnh Như, phụ trách Khối chuyên môn SOL DREAM EDUCATION" width="1284" height="1268"><figcaption><span>Khối chuyên môn</span><strong>Thạc sĩ Nguyễn Huỳnh Như</strong><span>Thạc sĩ Đại học Seoul<br>Chuyên ngành Ngôn ngữ và Văn học Hàn Quốc</span></figcaption></figure>
  </div>`;
const aboutTabsMigrationKey = 'about_official_tabs_20260925';
if (!db.prepare('SELECT 1 FROM system_meta WHERE key=?').get(aboutTabsMigrationKey)) {
  const officialAboutTabs = [
    {
      title: 'Lời chào', eyebrow: 'Thư ngỏ từ Giám đốc', sortOrder: 1,
      content: `<figure><img src="/img/dao-duy-thang.jpg" alt="Tiến sĩ Đào Duy Thắng, Giám đốc SOL DREAM EDUCATION" width="1706" height="2560"><figcaption>Tiến sĩ Đào Duy Thắng — Giám đốc SOL DREAM EDUCATION</figcaption></figure>
        <p>Gửi những thế hệ trẻ đang mang trong mình khát vọng vươn ra thế giới,</p>
        <p>Năm 2012, tôi đặt chân đến Hàn Quốc trong chương trình trao đổi sinh viên giữa Trường Đại học Kinh tế Thành phố Hồ Chí Minh và Trường Đại học Woosong. Những ngày đầu nơi đất khách, tôi cũng từng bỡ ngỡ trước rào cản ngôn ngữ và khác biệt văn hóa; từng miệt mài với những hạn nộp bài, những giờ làm thêm và cả những đêm dài tự hỏi con đường phía trước sẽ đi về đâu.</p>
        <p>Chính trong hành trình ấy, tôi nhận ra nỗ lực của một cá nhân là chưa đủ. Du học sinh cần một cộng đồng để kết nối, cần những người đi trước để chỉ đường và cần một điểm tựa đủ vững chắc để bảo vệ quyền lợi, định hướng tương lai. Hạt mầm ấy đã thôi thúc tôi xây dựng SOL DREAM EDUCATION.</p>
        <p>SOL DREAM không chỉ làm hồ sơ visa hay đưa học sinh qua biên giới. Từ hơn một thập kỷ trải nghiệm học tập, sinh sống và kinh doanh tại Hàn Quốc, chúng tôi xây dựng một nền tảng kết nối toàn diện: lộ trình học tập rõ ràng, cơ hội việc làm thực tế, hỗ trợ pháp lý và bảo vệ du học sinh trong suốt thời gian tại Hàn Quốc.</p>
        <p>Tôi mong mỗi Soldreamer sẽ có một bệ phóng tốt hơn những gì thế hệ chúng tôi từng có; không chỉ thích nghi mà còn có thể bứt phá, làm chủ cuộc sống và sự nghiệp trên quê hương thứ hai.</p>
        <p>Kỷ nguyên mới đã bắt đầu. Hãy để SOL DREAM đồng hành cùng bạn trên hành trình viết tiếp ước mơ của mình.</p>
        <blockquote>Chào mừng bạn đến với SOL DREAM EDUCATION!</blockquote>
        <p><strong>Tiến sĩ Đào Duy Thắng</strong><br>Giám đốc SOL DREAM EDUCATION</p>`,
    },
    {
      title: 'Tầm nhìn & Sứ mệnh', eyebrow: 'Định hướng phát triển', sortOrder: 2,
      content: `<p>Đội ngũ tư vấn và đào tạo của SOL DREAM EDUCATION gồm các cựu du học sinh Việt Nam đã hoàn thành chương trình thạc sĩ, tiến sĩ và đang học tập, làm việc hoặc kinh doanh tại Hàn Quốc. Theo hồ sơ năng lực do trung tâm cung cấp, 100% giáo viên có TOPIK cấp 4 trở lên; đội ngũ quản lý có trình độ sau đại học và từng học chương trình ngôn ngữ Hàn tại Đại học Quốc gia Seoul.</p>
        <h3>Mục tiêu</h3>
        <p>SOL DREAM hướng đến việc kết hợp giáo dục ngôn ngữ chuyên sâu với định hướng học tập và nghề nghiệp thực tế. Học viên không chỉ được trang bị kiến thức mà còn được chuẩn bị bản lĩnh để làm chủ cuộc sống trong môi trường quốc tế.</p>
        <p>Trách nhiệm của SOL DREAM không kết thúc khi học viên nhận visa. Cộng đồng SolDreamer được xây dựng để tiếp tục đồng hành trong quá trình học tập, làm việc và sinh sống tại Hàn Quốc.</p>
        <h3>Sứ mệnh</h3>
        <p>SOL DREAM mong muốn trở thành điểm tựa và bệ phóng cho người trẻ Việt Nam trên hành trình chinh phục tri thức quốc tế. Trung tâm xây dựng một cộng đồng du học sinh lành mạnh, gắn kết và hỗ trợ toàn diện về quyền lợi, định hướng tương lai cũng như cơ hội việc làm thực tế tại Hàn Quốc.</p>
        <h3>Tầm nhìn</h3>
        <p>SOL DREAM định hướng trở thành hệ sinh thái giáo dục và kết nối Việt Nam – Hàn Quốc hàng đầu, nơi mỗi học viên có điều kiện phát triển tiềm năng, đóng góp cho cả hai quốc gia và xem Hàn Quốc như quê hương thứ hai nuôi dưỡng thành công.</p>`,
    },
    {
      title: 'Bộ máy tổ chức', eyebrow: 'Cơ cấu SOL DREAM EDUCATION', sortOrder: 3,
      content: officialTeamStructureContent,
    },
  ];
  const findAboutTab = db.prepare("SELECT id FROM about_sections WHERE location='page' AND title=? LIMIT 1");
  const insertAboutTab = db.prepare(`INSERT INTO about_sections
    (location,eyebrow,title,content,section_style,sort_order,active) VALUES ('page',?,?,?,'tab',?,1)`);
  const updateAboutTab = db.prepare(`UPDATE about_sections SET eyebrow=?,content=?,section_style='tab',sort_order=?,active=1,updated_at=datetime('now','localtime') WHERE id=?`);
  db.transaction(() => {
    for (const tab of officialAboutTabs) {
      const existing = findAboutTab.get(tab.title);
      if (existing) updateAboutTab.run(tab.eyebrow, tab.content, tab.sortOrder, existing.id);
      else insertAboutTab.run(tab.eyebrow, tab.title, tab.content, tab.sortOrder);
    }
    db.prepare('INSERT INTO system_meta (key,value) VALUES (?,?)').run(aboutTabsMigrationKey, '1');
  })();
}

// Add the current profile's training and legal-information section to /gioi-thieu.
// It is inserted once and stays editable through Admin without later restarts overwriting edits.
{
  const migrationKey = 'profile_legal_and_services_20261017_v1';
  if (!db.prepare('SELECT 1 FROM system_meta WHERE key=?').get(migrationKey)) {
    db.transaction(() => {
      const existing = db.prepare("SELECT id FROM about_sections WHERE location='page' AND title='Năng lực đào tạo và pháp lý' LIMIT 1").get();
      if (!existing) {
        db.prepare(`INSERT INTO about_sections
          (location,eyebrow,title,content,section_style,sort_order,active)
          VALUES ('page',? ,? ,? ,'tab',4,1)`)
          .run('Theo hồ sơ giới thiệu 2026–2027', 'Năng lực đào tạo và pháp lý', `<p>SOL DREAM EDUCATION đào tạo tiếng Hàn từ nền tảng đến trung cấp, giao tiếp, phát âm và luyện TOPIK; đồng thời tư vấn chọn trường, ngành, lộ trình học tập, chuẩn bị hồ sơ và phỏng vấn theo chương trình.</p>
            <h3>Giấy tờ pháp lý được công bố trong hồ sơ</h3>
            <ul>
              <li><strong>Công ty TNHH Sol-Dream Education:</strong> mã số thuế 0315637970; đăng ký ngày 22/04/2019 theo hồ sơ doanh nghiệp của công ty.</li>
              <li><strong>Tư vấn du học:</strong> giấy chứng nhận số 1865/GCN-SGDĐT, ngày cấp 09/03/2026; hồ sơ ghi cơ quan cấp là Sở Giáo dục và Đào tạo TP. Hồ Chí Minh, thời hạn 05 năm.</li>
              <li><strong>Đào tạo ngoại ngữ:</strong> Trung tâm Ngoại ngữ Ngôi Nhà Ước Mơ, quyết định số 4149/QĐ-SGDĐT, ngày cấp 24/08/2026; hồ sơ ghi cơ quan cấp là Sở Giáo dục và Đào tạo TP. Hồ Chí Minh.</li>
            </ul>
            <h3>Các bước đồng hành</h3>
            <ol>
              <li>Tư vấn nguyện vọng, học lực, năng lực tiếng Hàn và ngân sách gia đình.</li>
              <li>Đối chiếu trường, ngành, điều kiện tuyển sinh và lịch nhận hồ sơ của từng kỳ.</li>
              <li>Học tiếng Hàn, hoàn thiện hồ sơ và luyện phỏng vấn theo yêu cầu của chương trình.</li>
              <li>Rà soát các khoản phải chuẩn bị trước xuất cảnh và hỗ trợ kết nối sau khi học viên sang Hàn Quốc theo phạm vi dịch vụ đã thống nhất.</li>
            </ol>
            <p class="source-meta">Nguồn: Hồ sơ giới thiệu SOL DREAM EDUCATION 2026–2027 do công ty cung cấp. Thông tin pháp lý được công bố theo hồ sơ; học viên có thể đề nghị xem bản giấy tờ gốc khi làm việc trực tiếp.</p>`);
      }
      db.prepare('INSERT INTO system_meta (key,value,updated_at) VALUES (?,?,datetime(\'now\',\'localtime\'))')
        .run(migrationKey, '1');
    })();
  }
}

// Existing databases may already have the three tabs above. Add the supplied
// director portrait once without replacing any later edits made in Admin.
const aboutDirectorPortraitKey = 'about_director_portrait_20260925';
if (!db.prepare('SELECT 1 FROM system_meta WHERE key=?').get(aboutDirectorPortraitKey)) {
  db.transaction(() => {
    const greeting = db.prepare("SELECT id,content FROM about_sections WHERE location='page' AND title='Lời chào' LIMIT 1").get();
    if (greeting && !String(greeting.content).includes('/img/dao-duy-thang.jpg')) {
      const content = String(greeting.content || '');
      const firstParagraphEnd = content.indexOf('</p>');
      const portrait = '<figure><img src="/img/dao-duy-thang.jpg" alt="Tiến sĩ Đào Duy Thắng, Giám đốc SOL DREAM EDUCATION" width="1706" height="2560"><figcaption>Tiến sĩ Đào Duy Thắng — Giám đốc SOL DREAM EDUCATION</figcaption></figure>';
      const updated = firstParagraphEnd >= 0
        ? `${content.slice(0, firstParagraphEnd + 4)}${portrait}${content.slice(firstParagraphEnd + 4)}`
        : `${portrait}${content}`;
      db.prepare("UPDATE about_sections SET content=?,updated_at=datetime('now','localtime') WHERE id=?").run(updated, greeting.id);
    }
    db.prepare('INSERT INTO system_meta (key,value) VALUES (?,?)').run(aboutDirectorPortraitKey, '1');
  })();
}

// Keep the portrait above the letter on mobile while the page layout places it
// in a dedicated right-hand column on desktop.
const aboutDirectorPortraitLayoutKey = 'about_director_portrait_layout_20260926';
if (!db.prepare('SELECT 1 FROM system_meta WHERE key=?').get(aboutDirectorPortraitLayoutKey)) {
  db.transaction(() => {
    const greeting = db.prepare("SELECT id,content FROM about_sections WHERE location='page' AND title='Lời chào' LIMIT 1").get();
    if (greeting) {
      const portraitPattern = /<figure>\s*<img\b[^>]*src=["']\/img\/dao-duy-thang\.jpg["'][^>]*>[\s\S]*?<\/figure>/i;
      const match = String(greeting.content || '').match(portraitPattern);
      if (match) {
        const withoutPortrait = String(greeting.content).replace(portraitPattern, '').trim();
        db.prepare("UPDATE about_sections SET content=?,updated_at=datetime('now','localtime') WHERE id=?")
          .run(`${match[0]}${withoutPortrait}`, greeting.id);
      }
    }
    db.prepare('INSERT INTO system_meta (key,value) VALUES (?,?)').run(aboutDirectorPortraitLayoutKey, '1');
  })();
}

// Replace the former detailed organization chart with the three current
// professional, consulting and business blocks requested by the organization.
const aboutTeamBlocksKey = 'about_team_blocks_20260926_v2';
if (!db.prepare('SELECT 1 FROM system_meta WHERE key=?').get(aboutTeamBlocksKey)) {
  db.transaction(() => {
    db.prepare("UPDATE about_sections SET eyebrow='Cơ cấu SOL DREAM EDUCATION',content=?,section_style='tab',active=1,updated_at=datetime('now','localtime') WHERE location='page' AND title='Bộ máy tổ chức'")
      .run(officialTeamStructureContent);
    db.prepare('INSERT INTO system_meta (key,value) VALUES (?,?)').run(aboutTeamBlocksKey, '1');
  })();
}

// Reorder the current leadership blocks, correct Nguyễn Huỳnh Như's school,
// and make the company slogan an Admin-editable lead element on /gioi-thieu.
const aboutTreeNavigationKey = 'about_tree_navigation_20260928_v1';
if (!db.prepare('SELECT 1 FROM system_meta WHERE key=?').get(aboutTreeNavigationKey)) {
  db.transaction(() => {
    db.prepare("UPDATE about_sections SET eyebrow='Cơ cấu SOL DREAM EDUCATION',content=?,section_style='tab',active=1,updated_at=datetime('now','localtime') WHERE location='page' AND title='Bộ máy tổ chức'")
      .run(officialTeamStructureContent);
    const vision = db.prepare("SELECT id,content FROM about_sections WHERE location='page' AND title='Tầm nhìn & Sứ mệnh' LIMIT 1").get();
    if (vision) {
      const content = String(vision.content || '')
        .replace(/<blockquote\b[^>]*>[\s\S]*?Kỷ nguyên vươn mình[\s\S]*?<\/blockquote>/gi, '')
        .trim();
      db.prepare("UPDATE about_sections SET content=?,updated_at=datetime('now','localtime') WHERE id=?").run(content, vision.id);
    }
    const sloganContent = '<p><strong>SOL DREAM:</strong> Kỷ nguyên vươn mình – Trí tuệ Việt, Tương lai toàn cầu.</p>';
    const slogan = db.prepare("SELECT id FROM about_sections WHERE location='page' AND title='Slogan SOL DREAM' LIMIT 1").get();
    if (slogan) {
      db.prepare("UPDATE about_sections SET eyebrow='Thông điệp SOL DREAM',content=?,section_style='direct-answer',sort_order=0,active=1,updated_at=datetime('now','localtime') WHERE id=?")
        .run(sloganContent, slogan.id);
    } else {
      db.prepare("INSERT INTO about_sections (location,eyebrow,title,content,section_style,sort_order,active) VALUES ('page','Thông điệp SOL DREAM','Slogan SOL DREAM',?,'direct-answer',0,1)")
        .run(sloganContent);
    }
    db.prepare('INSERT INTO system_meta (key,value) VALUES (?,?)').run(aboutTreeNavigationKey, '1');
  })();
}

// Update the consultant's credentials in existing databases without replacing
// other team-tab content that may have been edited in Admin.
const aboutKhaTranCredentialsKey = 'about_kha_tran_credentials_20261001_v1';
if (!db.prepare('SELECT 1 FROM system_meta WHERE key=?').get(aboutKhaTranCredentialsKey)) {
  db.transaction(() => {
    const team = db.prepare("SELECT id,content FROM about_sections WHERE location='page' AND title='Bộ máy tổ chức' LIMIT 1").get();
    if (team) {
      const certificate = 'Đạt chứng nhận “Xuất Sắc hoàn thành nghiệp vụ tư vấn Du học” do Sở GDDT Tp.Hồ Chí Minh tổ chức';
      const content = String(team.content || '');
      if (!content.includes(certificate)) {
        const consultantPattern = /(<strong>Thạc sĩ Phạm Vương Khả Trân<\/strong>\s*)<span>[^<]*<\/span>/i;
        const updated = content.replace(consultantPattern, (_match, name) =>
          `${name}<span>Thạc sĩ Kinh doanh Quốc Tế, Đại học Woosong Hàn Quốc</span><span>${certificate}</span>`);
        if (updated !== content) {
          db.prepare("UPDATE about_sections SET content=?,updated_at=datetime('now','localtime') WHERE id=?").run(updated, team.id);
        }
      }
    }
    db.prepare('INSERT INTO system_meta (key,value) VALUES (?,?)').run(aboutKhaTranCredentialsKey, '1');
  })();
}

if (db.prepare('SELECT COUNT(*) c FROM testimonials').get().c === 0) {
  const insertTestimonial = db.prepare(`INSERT INTO testimonials
    (name,role,quote,initials,rating,sort_order,published) VALUES (?,?,?,?,?,?,1)`);
  db.transaction(() => {
    insertTestimonial.run('Học viên Thanh Tâm', 'Lớp tiếng Hàn giao tiếp', 'Thầy cô siêu dễ thương, có tâm ❤. Học ở Sol Dream mình vừa vui vừa tiến bộ nhanh hơn mình nghĩ.', 'TT', 5, 10);
    insertTestimonial.run('Học viên du học Hàn Quốc', 'Nhập học kỳ tháng 9', 'Cảm ơn SDE đã tiếp sức, cho em niềm tin cũng như sức mạnh trong chặng đường phía trước tại xứ sở kim chi. 솔드림 사랑해요!', 'SD', 5, 20);
  })();
}

// Apply the 2026 Korean tuition catalogue once to both fresh and persistent SQLite databases.
const courseData = require('../data/courses.json');
const courseCatalogVersion = 'sde-korean-tuition-2026-v1';
if (!db.prepare('SELECT 1 FROM system_meta WHERE key=? AND value=?').get('course_catalog_version', courseCatalogVersion)) {
  const isEmptyCatalog = db.prepare('SELECT COUNT(*) c FROM courses').get().c === 0;
  const coursesToSync = isEmptyCatalog
    ? courseData.courses
    : courseData.courses.filter((course) => course.financials?.tuition2026);
  const upsertCourse = db.prepare(`INSERT INTO courses (id,slug,name,bluf_summary,audience,description,price,language,financials_json,requirements_json,sort_order,published,last_updated)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET
      slug=excluded.slug,name=excluded.name,bluf_summary=excluded.bluf_summary,audience=excluded.audience,
      description=excluded.description,price=excluded.price,language=excluded.language,
      financials_json=excluded.financials_json,requirements_json=excluded.requirements_json,
      sort_order=excluded.sort_order,last_updated=excluded.last_updated,updated_at=datetime('now','localtime')`);
  db.transaction((rows) => rows.forEach((course) => upsertCourse.run(
    course.id, course.slug || course.id, course.name, course.blufSummary || '', course.audience || '', course.description || '',
    course.price || '', course.language || 'Tiếng Hàn', JSON.stringify(course.financials || {}), JSON.stringify(course.requirements || {}),
    courseData.courses.indexOf(course), 1, course.lastUpdated || courseData.updated_at || ''
  )))(coursesToSync);
  db.prepare(`INSERT INTO system_meta (key,value,updated_at) VALUES ('course_catalog_version',?,datetime('now','localtime'))
    ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at`).run(courseCatalogVersion);
}
for (const [column, definition] of Object.entries({
  author_url: "TEXT NOT NULL DEFAULT ''",
  seo_title: "TEXT NOT NULL DEFAULT ''",
  meta_description: "TEXT NOT NULL DEFAULT ''",
  focus_keyword: "TEXT NOT NULL DEFAULT ''",
  noindex: 'INTEGER NOT NULL DEFAULT 0',
})) {
  if (!_programCols.includes(column)) db.exec(`ALTER TABLE programs ADD COLUMN ${column} ${definition}`);
}

// Keep the two Admin sections deterministic. Older records used several labels
// for the same concepts, which made school profiles appear under study programs.
db.prepare("UPDATE programs SET category='Thông tin trường' WHERE category IN ('Trường đại học','Thông tin trường')").run();
db.prepare("UPDATE programs SET category='Chương trình du học' WHERE category NOT IN ('Thông tin trường','Chương trình du học') OR trim(category)='' ").run();

const _popupCols = db.prepare("PRAGMA table_info(popups)").all().map(c => c.name);
if (!_popupCols.includes('system_key')) db.exec("ALTER TABLE popups ADD COLUMN system_key TEXT NOT NULL DEFAULT ''");
db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_popups_system_key ON popups(system_key) WHERE system_key != ''");
if (!db.prepare("SELECT 1 FROM popups WHERE system_key='lead_capture'").get()) {
  db.prepare(`INSERT INTO popups
    (title,content,button_text,placement,delay_seconds,show_once,active,system_key)
    VALUES (?,?,?,?,30,0,1,'lead_capture')`)
    .run(
      'Đăng ký tư vấn và nhận thông tin mới nhất miễn phí',
      '<p>Nhận cập nhật về kỳ tuyển sinh, chương trình du học, khóa học hoặc trường bạn quan tâm.</p>',
      'Gửi đăng ký',
      'content'
    );
}

// ---- Seed news once (real content carried over from old site) ----
const count = db.prepare('SELECT COUNT(*) c FROM posts').get().c;
if (count === 0) {
  const seed = [
    { title: 'Tôi đã tìm thấy chính mình giữa xứ lạnh Hàn Quốc', slug: 'toi-da-tim-thay-chinh-minh-giua-xu-lanh-han-quoc', category: 'Câu chuyện', cover: 'p1',
      excerpt: 'Sau nhiều thử thách, Tuyết Giang cuối cùng cũng tìm thấy đam mê, vạch ra hướng đi rõ ràng để phát triển bản thân và hướng đến một cuộc sống hạnh phúc.',
      content: '<p>Con đường du học không phải lúc nào cũng trải hoa hồng. Nhưng chính những ngày đông lạnh giá ở Hàn Quốc đã giúp Tuyết Giang hiểu rõ bản thân mình hơn bao giờ hết.</p><p>Từ một cô gái rụt rè, em đã dần trưởng thành, tự lập và tìm thấy đam mê thật sự của mình. Sol Dream tự hào được đồng hành cùng em trên hành trình ấy.</p>',
      created_at: '2025-07-31 09:00:00' },
    { title: 'Cuộc sống du học Hàn Quốc liệu có màu hồng?', slug: 'cuoc-song-du-hoc-han-quoc-lieu-co-mau-hong', category: 'Cẩm nang', cover: 'p2',
      excerpt: 'Bạn đang có ý định du học Hàn Quốc? Cùng tìm hiểu thật kỹ về đời sống, sinh hoạt, ăn uống và văn hóa nơi đây trước khi lên đường.',
      content: '<p>Du học Hàn Quốc mang đến nhiều cơ hội nhưng cũng không ít thử thách. Bài viết này chia sẻ góc nhìn thực tế về chi phí sinh hoạt, việc làm thêm và cách hòa nhập văn hóa.</p>',
      created_at: '2022-11-07 10:00:00' },
    { title: 'Du học Hàn Quốc nên chọn ngành nào?', slug: 'du-hoc-han-quoc-nen-chon-nganh-nao', category: 'Định hướng', cover: 'p3',
      excerpt: 'Hàn Quốc được đánh giá cao về chất lượng giáo dục và môi trường sống đa dạng — nhưng chọn ngành sao cho đúng với bản thân?',
      content: '<p>Việc chọn ngành phù hợp quyết định rất lớn đến tương lai của bạn. Cùng Sol Dream điểm qua những nhóm ngành thế mạnh của Hàn Quốc và tiêu chí chọn ngành hợp lý.</p>',
      created_at: '2022-10-31 08:30:00' },
    { title: '10 điều cần biết về văn hóa uống rượu Hàn Quốc', slug: '10-dieu-can-biet-ve-van-hoa-uong-ruou-han-quoc', category: 'Văn hóa', cover: 'p2',
      excerpt: 'Uống rượu là một nét văn hóa giao tiếp độc đáo của người Hàn, được lưu truyền qua nhiều thế hệ với những quy tắc riêng.',
      content: '<p>Hiểu về văn hóa uống rượu giúp bạn ứng xử tinh tế hơn khi sinh sống và làm việc tại Hàn Quốc. Dưới đây là 10 điều cơ bản bạn nên biết.</p>',
      created_at: '2022-11-03 09:15:00' }
  ];
  const ins = db.prepare(`INSERT INTO posts (title,slug,excerpt,content,category,cover,published,created_at,updated_at)
                          VALUES (@title,@slug,@excerpt,@content,@category,@cover,1,@created_at,@created_at)`);
  const tx = db.transaction(rows => rows.forEach(r => ins.run(r)));
  tx(seed);
  console.log('[db] Seeded', seed.length, 'posts');
}

// ---- Seed study-abroad programs once (carried over from old site) ----
const progCount = db.prepare('SELECT COUNT(*) c FROM programs').get().c;
if (progCount === 0) {
  const progs = [
    { title: 'Trường Đại học Quốc gia Seoul', subtitle: '서울대학교', slug: 'dai-hoc-quoc-gia-seoul', category: 'Thông tin trường', cover: 'p3', sort_order: 1,
      excerpt: 'Ngôi trường đi đầu về mô hình đại học kiểu mẫu tại Hàn Quốc, với hệ thống ngành học đa dạng và chất lượng đào tạo hàng đầu châu Á.',
      content: '<p>Trường Đại học Quốc gia Seoul (서울대학교) là ngôi trường đi đầu về mô hình đại học kiểu mẫu tại Hàn Quốc, với hệ thống chuyên ngành đa dạng và chất lượng đào tạo thuộc hàng đầu châu Á.</p><p>Đây là lựa chọn mơ ước của rất nhiều du học sinh. Sol Dream đồng hành tư vấn hồ sơ, học bổng và lộ trình phù hợp để bạn chinh phục ngôi trường này.</p>' },
    { title: 'Trường Đại học Yonsei', subtitle: '연세대학교', slug: 'dai-hoc-yonsei', category: 'Thông tin trường', cover: 'p1', sort_order: 2,
      excerpt: 'Thành lập năm 1885, tọa lạc tại thủ đô Seoul — một trong những trường đại học tư thục đào tạo đa ngành lớn và danh giá nhất Hàn Quốc.',
      content: '<p>Được thành lập năm 1885 và tọa lạc tại thủ đô Seoul, Trường Đại học Yonsei (연세대학교) là một trong những trường đại học tư thục đào tạo đa ngành lớn và danh giá bậc nhất Hàn Quốc.</p><p>Liên hệ Sol Dream để được tư vấn ngành học, điều kiện và học bổng tại Yonsei.</p>' },
    { title: 'Trường Đại học Korea', subtitle: '고려대학교', slug: 'dai-hoc-korea', category: 'Thông tin trường', cover: 'p3', sort_order: 3,
      excerpt: 'Ngôi trường lâu đời và cổ kính với kiến trúc Gothic mang đậm nét xứ Hàn — một trong những đại học danh tiếng bậc nhất Hàn Quốc.',
      content: '<p>Trường Đại học Korea (고려대학교) là ngôi trường lâu đời và cổ kính của Hàn Quốc, nổi bật với kiến trúc Gothic mang đậm nét xứ Hàn.</p><p>Đây là một trong những đại học danh tiếng bậc nhất cả nước. Sol Dream hỗ trợ bạn chuẩn bị hồ sơ và định hướng ngành học tại Korea University.</p>' },
    { title: 'Trường Đại học Woosong', subtitle: '우송대학교', slug: 'dai-hoc-woosong', category: 'Thông tin trường', cover: 'p2', sort_order: 4,
      excerpt: 'Trường đại học tại cửa ngõ châu Á, nơi sinh viên khi ra trường thông thạo cả tiếng Hàn và tiếng Anh cùng bằng cấp uy tín.',
      content: '<p>Trường Đại học Woosong (우송대학교) nằm ở vị trí cửa ngõ châu Á. Điểm nổi bật là sinh viên khi ra trường có thể thông thạo cả hai ngoại ngữ tiếng Hàn và tiếng Anh, cùng bằng cấp uy tín.</p><p>Sol Dream tư vấn chi tiết các ngành đào tạo và cơ hội học bổng tại Woosong.</p>' },
    { title: 'Trường Đại học Hansung', subtitle: '한성대학교', slug: 'dai-hoc-hansung', category: 'Thông tin trường', cover: 'p1', sort_order: 5,
      excerpt: 'Nằm trong top 3 trường đại học đáng học tập nhất tại thủ đô Seoul, sở hữu vị trí địa lý đắc địa ngay trung tâm thành phố.',
      content: '<p>Trường Đại học Hansung (한성대학교) nằm trong nhóm những trường đại học đáng học tập nhất tại thủ đô Seoul, sở hữu vị trí địa lý đắc địa ngay trung tâm thành phố.</p><p>Liên hệ Sol Dream để tìm hiểu điều kiện và lộ trình du học tại Hansung.</p>' },
    { title: 'Điều kiện du học Hàn Quốc', subtitle: '', slug: 'dieu-kien-du-hoc-han-quoc', category: 'Chương trình du học', cover: 'p2', sort_order: 6,
      excerpt: 'Mỗi trường đại học Hàn Quốc có yêu cầu riêng, nhưng cơ bản đều xét về học vấn, tài chính và trình độ tiếng Hàn.',
      content: '<p>Mỗi trường đại học Hàn Quốc sẽ có những điều kiện khác nhau, nhưng cơ bản đều có chung một số yêu cầu:</p><p><strong>1) Về học vấn:</strong> tốt nghiệp THPT hoặc tương đương, học bạ đạt yêu cầu.<br><strong>2) Về tài chính:</strong> chứng minh khả năng tài chính theo quy định.<br><strong>3) Về tiếng Hàn:</strong> đạt trình độ TOPIK cần thiết tùy chương trình.</p><p>Sol Dream sẽ tư vấn cụ thể điều kiện theo từng trường và giúp bạn chuẩn bị hồ sơ đầy đủ.</p>' }
  ];
  const insP = db.prepare(`INSERT INTO programs (title,subtitle,slug,excerpt,content,category,cover,sort_order,published,created_at,updated_at)
                           VALUES (@title,@subtitle,@slug,@excerpt,@content,@category,@cover,@sort_order,1,datetime('now','localtime'),datetime('now','localtime'))`);
  db.transaction(rows => rows.forEach(r => insP.run(r)))(progs);
  console.log('[db] Seeded', progs.length, 'programs');
}

// One-time migration for the five legacy school cards.  The public website and
// admin editor read the same `programs` rows, so keeping this migration beside
// the seed prevents a fresh installation from restoring the former one-paragraph
// profiles or untranslated Korean labels.
{
  const migrationKey = 'legacy_school_profiles_version';
  const { profiles, profileContent, LEGACY_PROFILE_MIGRATION_VERSION: migrationVersion } = require('../scripts/upgrade-legacy-school-profiles');
  const applied = db.prepare('SELECT value FROM system_meta WHERE key=?').get(migrationKey);
  if (process.env.SKIP_LEGACY_SCHOOL_AUTO_MIGRATION !== '1' && applied?.value !== migrationVersion) {
    const updateLegacySchool = db.prepare(`UPDATE programs SET
      title=?,subtitle=?,excerpt=?,content=?,category='Thông tin trường',author_name=?,author_role=?,author_url=?,
      source_urls=?,seo_title=?,meta_description=?,focus_keyword=?,published=1,noindex=0,updated_at=datetime('now','localtime')
      WHERE id=? AND slug=? AND category='Thông tin trường'`);
    db.transaction(() => {
      profiles.forEach((profile) => updateLegacySchool.run(
        profile.title,
        profile.subtitle,
        profile.excerpt,
        profileContent(profile),
        'Ban biên tập SOL DREAM EDUCATION',
        'Biên tập và đối chiếu nguồn chính thức',
        '/gioi-thieu',
        profile.sources.map((source) => source.url).join('\n'),
        profile.seoTitle,
        profile.metaDescription,
        profile.focusKeyword,
        profile.id,
        profile.slug
      ));
      db.prepare(`INSERT INTO system_meta (key,value,updated_at) VALUES (?,?,datetime('now','localtime'))
        ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at`)
        .run(migrationKey, migrationVersion);
      // Let the startup publication pipeline rebuild FAQs and search metadata
      // after the records have changed.
      db.prepare("DELETE FROM system_meta WHERE key='publication_pipeline_version'").run();
    })();
    console.log('[db] Upgraded legacy school profiles:', profiles.length);
  }
}

// Repair three crawler-created school profiles that were either hidden for
// sparse data or published with an English focus keyword and mixed degree
// levels. The updater matches stable slugs, keeps existing cover images and
// only publishes after all three production rows are present.
{
  const { applyIncompleteSchoolProfileRepair } = require('../scripts/repair-incomplete-school-profiles');
  const result = process.env.SKIP_INCOMPLETE_SCHOOL_PROFILE_AUTO_MIGRATION === '1'
    ? { applied: false, reason: 'explicitly-skipped' }
    : applyIncompleteSchoolProfileRepair(db);
  if (result.applied) console.log('[db] Rebuilt incomplete school profiles:', result.changed.length);
}

// Bring every remaining public school profile up to the same deep editorial
// standard, while preserving its existing cover and keeping sources in
// metadata instead of rendering a source report at the end of the article.
{
  const { applyRemainingSchoolProfileRepair } = require('../scripts/repair-remaining-school-profiles');
  const result = process.env.SKIP_REMAINING_SCHOOL_PROFILE_AUTO_MIGRATION === '1'
    ? { applied: false, reason: 'explicitly-skipped' }
    : applyRemainingSchoolProfileRepair(db);
  if (result.applied) console.log('[db] Rebuilt remaining school profiles:', result.changed.length);
}

// Hồ sơ trường công khai phải dẫn thẳng về website của trường, không dùng
// trang tổng hợp làm nguồn nội dung tuyển sinh.
{
  const officialSchoolSources = [
    ['dai-hoc-quoc-gia-seoul', 'https://en.snu.ac.kr/'],
    ['dai-hoc-yonsei', 'https://www.yonsei.ac.kr/en_sc/'],
    ['dai-hoc-korea', 'https://www.korea.edu/'],
    ['dai-hoc-woosong', 'https://english.wsu.ac.kr/'],
    ['dai-hoc-hansung', 'https://www.hansung.ac.kr/global/'],
    ['du-hoc-dai-hoc-quoc-gia-pusan-2026-dieu-kien-tuyen-sinh-hoc-phi-va-visa-d-4-1-chi-tiet', 'https://international.pusan.ac.kr/'],
  ];
  const attachOfficialSource = db.prepare("UPDATE programs SET source_urls=?,updated_at=datetime('now','localtime') WHERE slug=? AND TRIM(COALESCE(source_urls,''))=''");
  db.transaction((rows) => rows.forEach(([slug, url]) => attachOfficialSource.run(url, slug)))(officialSchoolSources);
}

// FAQ is stored in SQLite so AI-generated drafts can still be reviewed and edited manually.
if (db.prepare('SELECT COUNT(*) c FROM faqs').get().c === 0) {
  const faqSeed = [
    ['Đào tạo tiếng', 'Người mới bắt đầu nên chọn khóa học tiếng Hàn nào?', 'Người chưa có nền tảng có thể bắt đầu với Tiếng Hàn sơ cấp 1 để học Hangul, phát âm và ngữ pháp cơ bản. Nếu mục tiêu là giao tiếp hoặc chuẩn bị du học nhanh, học viên nên được kiểm tra trình độ và thời gian học trước khi chọn lớp.', '', 10],
    ['Đào tạo tiếng', 'SOL DREAM EDUCATION có những hình thức đào tạo tiếng Hàn nào?', 'SOL DREAM EDUCATION hiện giới thiệu các lớp tiếng Hàn sơ cấp, giao tiếp, phát âm, cấp tốc và lớp giao tiếp cùng giáo viên Hàn Quốc. Lịch học, sĩ số, thời lượng và học phí áp dụng được trung tâm xác nhận tại thời điểm học viên đăng ký.', '', 20],
    ['Đào tạo tiếng', 'Khóa học tiếng Hàn có yêu cầu TOPIK đầu vào không?', 'Phần lớn lớp nền tảng không yêu cầu chứng chỉ TOPIK, nhưng học viên có thể cần kiểm tra trình độ để được xếp lớp phù hợp. Với lộ trình du học hoặc luyện thi, mục tiêu TOPIK cần được xác định theo chương trình, trường và kỳ nhập học dự kiến.', '', 30],
    ['Du học', 'Học phí, học bổng và điều kiện visa trên website có cố định không?', 'Không. Học phí, học bổng, ngành mở tuyển, kỳ nhập học và quy định visa có thể thay đổi theo thời điểm, chương trình hoặc cơ quan quản lý. Người đọc cần đối chiếu nguồn chính thức và xác nhận lại với SOL DREAM EDUCATION trước khi chuẩn bị hoặc nộp hồ sơ.', 'https://overseas.mofa.go.kr/vn-vi/brd/m_2164/list.do', 10],
    ['Du học', 'Hồ sơ du học Hàn Quốc thường cần chuẩn bị những nhóm giấy tờ nào?', 'Hồ sơ thường gồm giấy tờ học tập, nhân thân, tài chính, kế hoạch học tập và giấy tờ do trường yêu cầu. Thành phần, thời hạn hiệu lực, bản dịch và thủ tục xác nhận có thể khác theo diện visa; người nộp cần kiểm tra hướng dẫn chính thức mới nhất.', 'https://overseas.mofa.go.kr/vn-vi/wpge/m_2154/contents.do', 20],
    ['Du học', 'Có thể làm thêm ngay sau khi sang Hàn Quốc không?', 'Du học sinh chỉ được làm thêm khi đáp ứng điều kiện theo tư cách lưu trú và hoàn tất thủ tục cho phép cần thiết. Số giờ, loại công việc và yêu cầu tiếng Hàn có thể thay đổi; không nên làm việc trước khi trường và cơ quan xuất nhập cảnh xác nhận.', 'https://www.studyinkorea.go.kr/ko/life/residenceAndStayInfo.do', 30],
    ['Thông tin trường', 'Làm sao chọn trường đại học Hàn Quốc phù hợp?', 'Học viên nên so sánh ngành đào tạo, vị trí, học phí, học bổng, ký túc xá và yêu cầu đầu vào với GPA, TOPIK, ngân sách và kế hoạch nghề nghiệp. Hồ sơ trường trên website giúp lập danh sách ban đầu nhưng cần đối chiếu thông báo tuyển sinh chính thức.', 'https://www.studyinkorea.go.kr/', 10],
    ['Thông tin trường', 'Thông tin trường đại học trên website lấy từ đâu?', 'SOL DREAM EDUCATION tổng hợp hồ sơ trường từ tài liệu đã lưu, website chính thức của trường và nguồn cơ quan quản lý. Học phí, ngành tuyển, học bổng, ký túc xá và visa được gắn nguồn khi có thể và phải được kiểm tra lại theo kỳ tuyển sinh.', 'https://www.studyinkorea.go.kr/', 20],
    ['Thông tin sinh hoạt tại Hàn Quốc', 'Du học sinh nên dự trù chi phí sinh hoạt tại Hàn Quốc như thế nào?', 'Ngoài học phí, người học cần dự trù nhà ở, ăn uống, đi lại, liên lạc, bảo hiểm và chi phí cá nhân. Study in Korea công bố mức tham khảo theo tháng, nhưng giá thực tế phụ thuộc thành phố, loại chỗ ở và thói quen chi tiêu.', 'https://studyinkorea.go.kr/ko/life/livingExpense.do', 10],
    ['Thông tin sinh hoạt tại Hàn Quốc', 'Du học sinh có thể lựa chọn những loại chỗ ở nào?', 'Các lựa chọn phổ biến gồm ký túc xá trường, phòng thuê theo tháng, nhà ở chung hoặc homestay. Trước khi ký hợp đồng, sinh viên nên kiểm tra trực tiếp căn nhà, tiền đặt cọc, chi phí quản lý, điều kiện hoàn tiền và khoảng cách đến trường.', 'https://studyinkorea.go.kr/ko/life/livingAndHousing.do', 20],
    ['Thông tin sinh hoạt tại Hàn Quốc', 'Du học sinh cần lưu ý gì về bảo hiểm và khám chữa bệnh?', 'Thời điểm tham gia bảo hiểm phụ thuộc tư cách lưu trú và tình trạng đăng ký người nước ngoài. Sinh viên nên cập nhật địa chỉ cư trú, kiểm tra thông báo của trường và cơ quan bảo hiểm, đồng thời tìm trước bệnh viện, nhà thuốc và số điện thoại khẩn cấp gần nơi ở.', 'https://studyinkorea.go.kr/ko/life/livingAndHousing.do', 30],
    ['Thông tin sinh hoạt tại Hàn Quốc', 'Những số điện thoại cần nhớ khi sinh sống tại Hàn Quốc là gì?', 'Trong tình huống khẩn cấp có thể gọi 112 cho cảnh sát và 119 cho cứu hỏa hoặc cấp cứu. Tổng đài xuất nhập cảnh 1345 hỗ trợ thông tin cư trú; tại Seoul, tổng đài 120 cung cấp thông tin đời sống. Khả năng hỗ trợ ngôn ngữ tùy dịch vụ.', 'https://global.seoul.go.kr/', 40]
  ];
  const insertFaq = db.prepare('INSERT INTO faqs (category,question,answer,source_url,sort_order,published,generated) VALUES (?,?,?,?,?,1,0)');
  db.transaction((rows) => rows.forEach((row) => insertFaq.run(...row)))(faqSeed);
}

if (db.prepare('SELECT COUNT(*) c FROM research_sources').get().c === 0) {
  const commonKeywords = 'du học,visa,hồ sơ,tuyển sinh,học bổng,sinh viên quốc tế,trường đại học,lao động Việt Nam,Hàn Quốc,nhân tài,D-2,D-4,GKS,유학,비자,사증,외국인 유학생,대학,입학,모집,장학,체류,베트남,교육,취업,생활';
  const sources = [
    ['Đại sứ quán Hàn Quốc tại Việt Nam – Thông báo visa', 'https://overseas.mofa.go.kr/vn-vi/brd/m_2164/list.do', 'embassy', 'vi'],
    ['Bộ Giáo dục Hàn Quốc – Thông cáo báo chí', 'https://www.moe.go.kr/boardCnts/listRenew.do?boardID=294&m=020402&s=moe', 'ministry', 'ko'],
    ['Study in Korea – Học bổng GKS', 'https://www.studyinkorea.go.kr/ko/notice/scholarshipsList.do?boardSort=3', 'education', 'ko,en'],
    ['Study in Korea – Đời sống tại Hàn Quốc', 'https://www.studyinkorea.go.kr/ko/life/main.do', 'education', 'ko,en'],
    ['Hi Korea – Xuất nhập cảnh', 'https://www.hikorea.go.kr/Main.pt', 'immigration', 'ko,en'],
    ['KVAC Hà Nội – Thông báo', 'https://www.visaforkorea-vt.com/customercenter/notice/list', 'visa-center', 'vi'],
    ['KVAC TP.HCM – Thông báo', 'https://www.visaforkorea-hc.com/customercenter/notice/list', 'visa-center', 'vi']
  ];
  const insertSource = db.prepare('INSERT INTO research_sources (name,url,source_type,language,keywords,active) VALUES (?,?,?,?,?,1)');
  db.transaction((rows) => rows.forEach((row) => insertSource.run(...row, commonKeywords)))(sources);
}

// Migrate the former GKS route, which can return a temporary 404, to the current official list.
// Keep this idempotent even when an administrator already added the replacement URL manually.
{
  const sourceName = 'Study in Korea – Học bổng GKS';
  const currentUrl = 'https://www.studyinkorea.go.kr/ko/notice/scholarshipsList.do?boardSort=3';
  const namedSource = db.prepare('SELECT id FROM research_sources WHERE name=?').get(sourceName);
  const urlSource = db.prepare('SELECT id FROM research_sources WHERE url=?').get(currentUrl);
  if (namedSource && urlSource && namedSource.id !== urlSource.id) {
    db.transaction(() => {
      db.prepare('UPDATE OR IGNORE research_items SET source_id=? WHERE source_id=?').run(urlSource.id, namedSource.id);
      db.prepare('DELETE FROM research_sources WHERE id=?').run(namedSource.id);
      db.prepare("UPDATE research_sources SET name=?,crawl_delay_ms=5000,updated_at=datetime('now','localtime') WHERE id=?").run(sourceName, urlSource.id);
    })();
  } else if (namedSource) {
    db.prepare("UPDATE research_sources SET url=?,crawl_delay_ms=5000,updated_at=datetime('now','localtime') WHERE id=?").run(currentUrl, namedSource.id);
  }
}
db.prepare(`INSERT OR IGNORE INTO research_sources (name,url,source_type,language,keywords,active,crawl_delay_ms) VALUES (?,?,?,?,?,1,5000)`)
  .run('Study in Korea – Danh mục trường cho sinh viên quốc tế', 'https://www.studyinkorea.go.kr/ko/search_v1.do', 'university-directory', 'ko,en', 'international student,university,language training,bachelor,master,doctorate,scholarship,외국인 유학생,대학,한국어 연수');

// Verified official university/news entry points. INSERT OR IGNORE keeps admin changes intact.
{
  const focusedKeywords = 'international admission,foreign student,admission guide,tuyển sinh quốc tế,học phí,học bổng,ký túc xá,visa,외국인,유학생,입학,모집요강,등록금,장학금,기숙사';
  const verifiedSources = [
    ['Hannam University – Tuyển sinh quốc tế', 'https://ibsi.hannam.ac.kr/adms5/foreigner/4_1.asp', 'university', 'ko,en'],
    ['Woosong University – International Admissions', 'https://english.wsu.ac.kr/page/index.jsp?code=eng0301', 'university', 'en,ko'],
    ['Hanyang University – Office of International Affairs', 'https://oia.hanyang.ac.kr/', 'university', 'ko,en'],
    ['Daeduk University – Tuyển sinh', 'https://www.ddu.ac.kr/', 'university', 'ko'],
    ['Dongyang University – Global', 'https://global.dyu.ac.kr/', 'university', 'ko,en'],
    ['Gimhae University – International Admissions', 'https://inter.gimhae.ac.kr/inter/content/18', 'university', 'ko,en,vi'],
    ['Korea.net – Chính sách Hàn Quốc', 'https://www.korea.net/NewsFocus/policies', 'official-news', 'en'],
    ['Yonhap News Agency – Tin Hàn Quốc', 'https://en.yna.co.kr/', 'official-news', 'en'],
    ['Báo Chính phủ Việt Nam', 'https://baochinhphu.vn/', 'official-news', 'vi'],
    ['VietnamPlus – Thông tấn xã Việt Nam', 'https://www.vietnamplus.vn/', 'official-news', 'vi']
  ];
  const insertVerified = db.prepare('INSERT OR IGNORE INTO research_sources (name,url,source_type,language,keywords,active) VALUES (?,?,?,?,?,1)');
  db.transaction((rows) => rows.forEach((row) => insertVerified.run(...row, focusedKeywords)))(verifiedSources);

  // Improve discovery on the general news sources without overwriting keywords
  // that an administrator has already customized.
  const koreanNewsKeywords = 'international student,foreign student,study in Korea,education,scholarship,visa,immigration,Vietnam,Korea,employment,university,유학생,외국인,교육,장학금,비자,취업';
  const vietnamNewsKeywords = 'du học,sinh viên,Hàn Quốc,người Việt,giáo dục,học bổng,visa,xuất nhập cảnh,lao động,việc làm,nhân tài,đại học';
  db.prepare(`UPDATE research_sources SET keywords=?,updated_at=datetime('now','localtime')
    WHERE name IN ('Korea.net – Chính sách Hàn Quốc','Yonhap News Agency – Tin Hàn Quốc') AND keywords=?`).run(koreanNewsKeywords, focusedKeywords);
  db.prepare(`UPDATE research_sources SET keywords=?,updated_at=datetime('now','localtime')
    WHERE name IN ('Báo Chính phủ Việt Nam','VietnamPlus – Thông tấn xã Việt Nam') AND keywords=?`).run(vietnamNewsKeywords, focusedKeywords);
  // Không thay đổi active/auto_publish_non_school tại đây. Đây là cấu hình do
  // quản trị viên điều khiển và phải được giữ nguyên qua mỗi lần khởi động.
}

// Additional verified public sources for practical study-abroad guidance. Each
// source has a narrow keyword set so unrelated government news is not imported.
// INSERT OR IGNORE preserves any later edits made in the administration screen.
{
  const guideSources = [
    ['CIED – Sự kiện du học và học bổng', 'https://cied.vn/su-kien-du-hoc/', 'official-scholarship', 'vi', 'Hàn Quốc,du học,học bổng,tuyển sinh,đại học,sau đại học,TOPIK,sinh viên', 1200],
    ['Đại sứ quán Việt Nam tại Hàn Quốc – Tin cộng đồng', 'https://vnembassy-seoul.mofa.gov.vn/vi', 'embassy-community', 'vi', 'sinh viên,du học,công dân,Hàn Quốc,cảnh báo,lãnh sự,cộng đồng,y tế,việc làm', 1500],
    ['Seoul Foreign Portal – Cẩm nang sinh viên quốc tế', 'https://global.seoul.go.kr/hmpg/main/main.do?lang=en', 'official-guide', 'en,ko', 'international student,foreign resident,Korean language,employment,housing,medical,visa,education,living,유학생,외국인,한국어,취업,주거,생활', 1000],
    ['Korea Immigration Service – Visa và cư trú', 'https://www.immigration.go.kr/immigration_eng/1832/subview.do?enc=Zm5jd', 'immigration', 'en,ko', 'visa,stay,residence,foreign,student,immigration,registration,e-arrival,D-2,D-4,비자,체류,유학생', 1200],
    ['NHIS – Bảo hiểm y tế cho du học sinh và người nước ngoài', 'https://www.nhis.or.kr/english/wbheaa02900m01.do', 'official-guide', 'en,ko', 'foreigner,student,D-2,D-4,insurance,health,contribution,유학생,외국인,건강보험', 1200],
    ['Incheon – Cẩm nang dành cho cư dân nước ngoài', 'https://www.incheon.go.kr/en/EN050501', 'official-guide', 'en,ko,vi', 'foreign resident,international student,visa,residence,housing,health,education,Korean language,employment,guidebook,외국인,유학생', 1200],
    ['Bộ Việc làm và Lao động Hàn Quốc – Tài liệu hướng dẫn', 'https://www.moel.go.kr/english/resources/publications.do', 'official-labor', 'en,ko', 'foreign student,foreign worker,employment,labor,wage,part-time,workplace,safety,유학생,외국인,취업,근로,임금,아르바이트', 1500],
    ['Danuri – Cẩm nang sinh hoạt tại Hàn Quốc', 'https://www.liveinkorea.kr/portal/USA/main/main.do', 'official-living', 'en,ko', 'student,education,Korean language,employment,housing,medical,visa,living,foreign resident,생활,교육,취업,주거', 1200]
  ];
  const insertGuideSource = db.prepare(`INSERT OR IGNORE INTO research_sources
    (name,url,source_type,language,keywords,active,auto_publish_non_school,crawl_delay_ms)
    VALUES (?,?,?,?,?,1,1,?)`);
  db.transaction((rows) => rows.forEach((row) => insertGuideSource.run(...row)))(guideSources);
}

// Keep the long-standing service FAQ available after migrating from the static FAQ file.
const serviceFaqQuestion = 'SOL DREAM EDUCATION cung cấp những dịch vụ nào?';
if (!db.prepare('SELECT 1 FROM faqs WHERE question=?').get(serviceFaqQuestion)) {
  db.prepare('INSERT INTO faqs (category,question,answer,source_url,sort_order,published,generated) VALUES (?,?,?,?,?,1,0)')
    .run('Du học', serviceFaqQuestion, 'SOL DREAM EDUCATION đào tạo tiếng Hàn từ nền tảng đến giao tiếp và đồng hành tư vấn du học Hàn Quốc. Nội dung hỗ trợ gồm định hướng chương trình, chọn trường, chuẩn bị hồ sơ và tra cứu thông tin đã công bố; điều kiện, chi phí và thời hạn được xác nhận theo từng trường hợp.', '', 5);
}

// Các bản nháp cũ từng nối toàn bộ URL nguồn vào cuối nội dung. Từ phiên bản
// mới, nguồn chỉ được lưu trong cột source_urls (tối đa ba URL trực tiếp), còn
// bài hiển thị phải là nội dung biên tập sạch.
{
  const migrationKey = 'editorial_source_metadata_only_v1';
  if (!db.prepare('SELECT 1 FROM system_meta WHERE key=?').get(migrationKey)) {
    const { removeArticleSourceList } = require('../lib/editorialAi');
    const technicalHost = /(?:^|\.)vertexaisearch\.cloud\.google\.com$|(?:^|\.)googleusercontent\.com$/i;
    const cleanSourceUrls = (value) => [...new Set(String(value || '').split(/[\r\n,]+/)
      .map((url) => url.trim()).filter((url) => {
        try { return new URL(url).protocol === 'https:' && !technicalHost.test(new URL(url).hostname); }
        catch (_) { return false; }
      }))].slice(0, 3).join('\n');
    db.transaction(() => {
      for (const table of ['posts', 'programs']) {
        const rows = db.prepare(`SELECT id,content,source_urls FROM ${table}
          WHERE content LIKE '%Nguồn bài viết%' OR content LIKE '%article-sources%'
             OR source_urls LIKE '%vertexaisearch.cloud.google.com%'`).all();
        const update = db.prepare(`UPDATE ${table} SET content=?,source_urls=?,updated_at=datetime('now','localtime') WHERE id=?`);
        rows.forEach((row) => update.run(removeArticleSourceList(row.content), cleanSourceUrls(row.source_urls), row.id));
      }
      db.prepare('INSERT INTO system_meta (key,value,updated_at) VALUES (?,?,datetime(\'now\',\'localtime\'))')
        .run(migrationKey, '1');
    })();
  }
}

// Remove flattened source-page UI/scripts and inline source-report labels from
// articles imported by older crawler versions. Source URLs remain in metadata.
{
  const migrationKey = 'clean_legacy_article_scrape_artifacts_v2';
  if (!db.prepare('SELECT 1 FROM system_meta WHERE key=?').get(migrationKey)) {
    const { cleanExistingArticleContent } = require('../lib/articleBodyCleanup');
    const rows = db.prepare('SELECT id,content FROM posts').all();
    const replacements = rows
      .map((row) => {
        const content = cleanExistingArticleContent(row.content);
        return content === row.content ? null : { ...row, content };
      })
      .filter(Boolean);
    const update = db.prepare('UPDATE posts SET content=? WHERE id=?');
    db.transaction(() => {
      replacements.forEach((row) => update.run(row.content, row.id));
      db.prepare('INSERT INTO system_meta (key,value,updated_at) VALUES (?,?,datetime(\'now\',\'localtime\'))')
        .run(migrationKey, String(replacements.length));
    })();
    if (replacements.length) console.log(`[db] cleaned crawler artifacts from ${replacements.length} article(s)`);
  }
}

// Older posts also used loose <br>-based copy and mixed real content with
// generic verification disclaimers; this pass removes those editorial artifacts.
{
  const migrationKey = 'clean_legacy_article_report_artifacts_v3';
  if (!db.prepare('SELECT 1 FROM system_meta WHERE key=?').get(migrationKey)) {
    const { cleanExistingArticleContent } = require('../lib/articleBodyCleanup');
    const rows = db.prepare('SELECT id,content FROM posts').all();
    const replacements = rows
      .map((row) => {
        const content = cleanExistingArticleContent(row.content);
        return content === row.content ? null : { ...row, content };
      })
      .filter(Boolean);
    const update = db.prepare('UPDATE posts SET content=? WHERE id=?');
    db.transaction(() => {
      replacements.forEach((row) => update.run(row.content, row.id));
      db.prepare('INSERT INTO system_meta (key,value,updated_at) VALUES (?,?,datetime(\'now\',\'localtime\'))')
        .run(migrationKey, String(replacements.length));
    })();
    if (replacements.length) console.log(`[db] removed legacy report text from ${replacements.length} article(s)`);
  }
}

// Final cleanup for remaining legacy table placeholders and source-only notes.
{
  const migrationKey = 'clean_legacy_article_report_artifacts_v4';
  if (!db.prepare('SELECT 1 FROM system_meta WHERE key=?').get(migrationKey)) {
    const { cleanExistingArticleContent } = require('../lib/articleBodyCleanup');
    const rows = db.prepare('SELECT id,content FROM posts').all();
    const replacements = rows
      .map((row) => {
        const content = cleanExistingArticleContent(row.content);
        return content === row.content ? null : { ...row, content };
      })
      .filter(Boolean);
    const update = db.prepare('UPDATE posts SET content=? WHERE id=?');
    db.transaction(() => {
      replacements.forEach((row) => update.run(row.content, row.id));
      db.prepare('INSERT INTO system_meta (key,value,updated_at) VALUES (?,?,datetime(\'now\',\'localtime\'))')
        .run(migrationKey, String(replacements.length));
    })();
    if (replacements.length) console.log(`[db] completed article cleanup on ${replacements.length} article(s)`);
  }
}

// Set the English-teacher recruitment post's requested publication date once.
// Keep the post's original update timestamp so this only changes its displayed
// publication date and does not suggest the content itself was edited then.
{
  const migrationKey = 'recruitment_english_teacher_publication_date_20260903_v1';
  if (!db.prepare('SELECT 1 FROM system_meta WHERE key=?').get(migrationKey)) {
    const post = db.prepare('SELECT id FROM posts WHERE slug=?').get('tuyen-dung-giao-vien-day-tieng-anh');
    if (post) {
      db.transaction(() => {
        db.prepare("UPDATE posts SET created_at='2026-09-03 12:00:00' WHERE id=?").run(post.id);
        db.prepare('INSERT INTO system_meta (key,value,updated_at) VALUES (?,?,datetime(\'now\',\'localtime\'))')
          .run(migrationKey, '2026-09-03');
      })();
      console.log('[db] applied recruitment post publication date 2026-09-03');
    }
  }
}

// Publish the 2026-2027 Korea study guides from the supplied profile and official school/government references.
// Existing pages are left untouched if an administrator has already created the same slug.
{
  const migrationKey = 'korea_study_guides_20261017_v1';
  if (!db.prepare('SELECT 1 FROM system_meta WHERE key=?').get(migrationKey)) {
    const guides = [
      {
        title: 'Chi phí du học Hàn Quốc 2026–2027: phí dịch vụ và khoản cần dự trù',
        slug: 'chi-phi-du-hoc-han-quoc-2026-2027',
        excerpt: 'Hồ sơ SOL DREAM 2026–2027 liệt kê năm gói dịch vụ tại Việt Nam, lịch đóng ba đợt và các khoản trường Hàn Quốc thu riêng. Bài viết tách rõ từng phần để gia đình lập ngân sách.',
        cover: 'p2', sort_order: 1,
        content: `<p>Hồ sơ tuyển sinh SOL DREAM EDUCATION 2026–2027 ghi các gói dưới đây bằng triệu đồng. Các khoản trong bảng là chi phí dịch vụ, đào tạo và học phí BKC tại Việt Nam theo đúng phạm vi từng chương trình; học phí trường Hàn Quốc, ký túc xá và sinh hoạt không nằm trong tổng này.</p>
          <h2>Các gói dịch vụ tại Việt Nam</h2>
          <div><table><thead><tr><th>Chương trình</th><th>Dịch vụ và quản lý</th><th>Tiếng Hàn</th><th>BKC</th><th>Trước VAT</th><th>VAT</th><th>Tổng</th></tr></thead><tbody>
          <tr><td>D4-1 · Học tiếng Hàn</td><td>54</td><td>32</td><td>0</td><td>86</td><td>4,32</td><td>90,32</td></tr>
          <tr><td>D2-1 · Cao đẳng</td><td>54</td><td>64</td><td>0</td><td>118</td><td>4,32</td><td>122,32</td></tr>
          <tr><td>D2-6 · Trao đổi</td><td>59</td><td>64</td><td>15</td><td>138</td><td>4,72</td><td>142,72</td></tr>
          <tr><td>D2-2 · Đại học</td><td>54</td><td>0</td><td>0</td><td>54</td><td>4,32</td><td>58,32</td></tr>
          <tr><td>E-Visa · Thạc sĩ</td><td>58</td><td>32</td><td>0</td><td>90</td><td>4,64</td><td>94,64</td></tr>
          </tbody></table></div>
          <p>Phí dịch vụ và quản lý được tính VAT 8%; học phí đào tạo tiếng Hàn và học phí BKC không tính VAT. Tiền học tiếng đã nằm trong gói D4-1, D2-1, D2-6 và E-Visa, không thu thêm lần nữa. Gói D2-2 chỉ gồm dịch vụ hồ sơ, không có đào tạo tiếng.</p>
          <p>Ở chương trình D2-6, khoản dịch vụ và quản lý 59 triệu đồng gồm 54 triệu đồng dịch vụ hồ sơ và 5 triệu đồng quản lý tại Hàn Quốc trong kỳ đầu. Học phí một kỳ tại Cao đẳng Bách Khoa Sài Gòn (BKC) là 15 triệu đồng, được thu riêng theo phụ lục nhưng đã tính trong tổng gói D2-6 nêu trên.</p>
          <h2>Lịch đóng theo hồ sơ</h2>
          <div><table><thead><tr><th>Chương trình</th><th>Đợt 1</th><th>Đợt 2</th><th>Đợt 3</th></tr></thead><tbody>
          <tr><td>D4-1</td><td>46,04</td><td>27</td><td>17,28</td></tr><tr><td>D2-1</td><td>46,2</td><td>55,6</td><td>20,52</td></tr>
          <tr><td>D2-6</td><td>46,2</td><td>55,6</td><td>25,92</td></tr><tr><td>D2-2</td><td>21,6</td><td>21,6</td><td>15,12</td></tr>
          <tr><td>E-Visa</td><td>51,44</td><td>27</td><td>16,2</td></tr></tbody></table></div>
          <p>Các khoản trên tính bằng triệu đồng. Đợt 1 bắt đầu lộ trình; đợt 2 thu sau khi đạt phỏng vấn hoặc được trường tiếp nhận; đợt 3 thu khi có thị thực, trước xuất cảnh. Học phí BKC của D2-6 được đóng theo phụ lục riêng, ngoài ba đợt trong bảng.</p>
          <h2>Các khoản cần dự trù riêng</h2>
          <ul><li>Học phí, ký túc xá, bảo hiểm và các khoản do trường Hàn Quốc thông báo; phí chuyển tiền quốc tế.</li><li>Vé máy bay, đi lại, ăn ở, sinh hoạt cá nhân và lệ phí thi TOPIK.</li><li>Chi phí hồ sơ riêng như chứng minh tài chính, số dư duy trì, tái khám hoặc giấy tờ ngoài phạm vi tiêu chuẩn nếu hồ sơ cần.</li></ul>
          <p>Hãy yêu cầu ghi rõ đơn vị thu, phạm vi dịch vụ và thời hạn trong hợp đồng hoặc phụ lục trước khi thanh toán. Học phí trường Hàn Quốc được trả theo thông báo của trường; mức học phí tham khảo cũng có thể thay đổi theo kỳ.</p>
          <p><a href="/truong-dai-hoc">Tra cứu học phí tham khảo của một số trường đối tác →</a></p>`,
        source_urls: 'https://www.studyinkorea.go.kr/en_US/plan/abroadExpenses.do\nhttps://studyinkorea.go.kr/ko/life/livingExpense.do',
        seo_title: 'Chi phí du học Hàn Quốc 2026–2027: các khoản và lịch đóng',
        meta_description: 'Bảng phí gói du học SOL DREAM 2026–2027, lịch thanh toán ba đợt và các khoản học phí, ký túc xá tại Hàn Quốc cần dự trù riêng.',
        focus_keyword: 'chi phí du học Hàn Quốc 2026-2027',
      },
      {
        title: 'Học phí trường đối tác Hàn Quốc: hệ tiếng và đại học năm 2026',
        slug: 'hoc-phi-truong-doi-tac-han-quoc-2026',
        excerpt: 'Tổng hợp học phí tiếng Hàn và một số mức cử nhân trong profile SOL DREAM, đối chiếu với hướng dẫn chính thức của Woosong, Sogang và Hanyang.',
        cover: 'p3', sort_order: 2,
        content: `<p>Học phí tiếng Hàn thường tính theo khóa 10 tuần, còn học phí cử nhân có thể công bố theo kỳ hoặc theo năm. Bảng sau tách hai loại chương trình và ghi rõ cơ sở áp dụng để tránh so sánh nhầm.</p>
          <h2>Học tiếng Hàn</h2>
          <div><table><thead><tr><th>Trường và cơ sở</th><th>Chương trình</th><th>Học phí / kỳ</th><th>Ghi chú</th></tr></thead><tbody>
          <tr><td>Woosong</td><td>Khóa thường 200 giờ, 10 tuần</td><td>1.300.000 KRW</td><td>Phí xét tuyển 60.000 KRW theo hướng dẫn của trường</td></tr>
          <tr><td>Sogang</td><td>KGP200 buổi sáng</td><td>1.860.000 KRW</td><td>10 tuần, 200 giờ; đăng ký mới 100.000 KRW</td></tr>
          <tr><td>Sogang</td><td>KAP200 buổi chiều</td><td>1.800.000 KRW</td><td>10 tuần, 200 giờ; đăng ký mới 100.000 KRW</td></tr>
          <tr><td>Hanyang ERICA</td><td>Khóa chuyên sâu tiếng Hàn</td><td>1.500.000 KRW</td><td>10 tuần, đã gồm bảo hiểm; phí đăng ký mới 100.000 KRW</td></tr>
          <tr><td>Hannam</td><td>Khóa thường</td><td>1.300.000 KRW</td><td>Hồ sơ SolDream ghi “Chính sách 2021”; không dùng làm giá kỳ 2026-2027</td></tr>
          </tbody></table></div>
          <p>Mức Sogang trên lấy từ hướng dẫn KLEC năm 2026; Woosong Korean Language Institute và Hanyang ERICA cũng công bố học phí khóa tiếng theo kỳ. Với Hannam, tài liệu SolDream ghi rõ chính sách 2021 nên học viên cần xin báo giá mới trước khi chọn trường.</p>
          <h2>Một số học phí cử nhân</h2>
          <h3>Woosong University · học phí theo năm học 2026</h3>
          <ul><li>Quản trị Khách sạn Thông minh: 6.792 USD/năm.</li><li>Trí tuệ nhân tạo và Dữ liệu lớn: 7.794 USD/năm.</li><li>Quản trị Kinh doanh: 12.592 USD/năm; trường ghi mức này gồm kỳ thu, đông, xuân và hè.</li></ul>
          <h3>Hanyang University · cơ sở Seoul · kỳ 1 năm 2026</h3>
          <ul><li>Nhân văn và xã hội: 5.279.000 KRW/kỳ.</li><li>Khoa học tự nhiên và thể thao: 6.150.000 KRW/kỳ.</li><li>Kỹ thuật: 6.960.000 KRW/kỳ.</li><li>Nghệ thuật: 6.976.000 KRW/kỳ; âm nhạc: 7.820.000 KRW/kỳ.</li></ul>
          <p>Đây là học phí trường công bố trước học bổng và chưa gồm sinh hoạt, ký túc xá, phí nhập học hay khoản thu riêng. Mức Hanyang nêu rõ là cơ sở Seoul; ERICA có hướng dẫn riêng. Tỷ giá thanh toán thay đổi nên bài viết giữ nguyên đơn vị KRW/USD, không quy đổi thành VND.</p>
          <p>Học phí trường Hàn Quốc không nằm trong gói dịch vụ SolDream tại Việt Nam. Trước khi nộp hồ sơ, hãy kiểm tra đúng cơ sở, ngành, kỳ học, học bổng và hạn đóng tiền trên thông báo chính thức mới nhất.</p>
          <p><a href="/truong-dai-hoc/woosong">Hồ sơ Woosong</a> · <a href="/truong-dai-hoc/hanyang">Hồ sơ Hanyang</a> · <a href="/truong-dai-hoc/sogang">Hồ sơ Sogang</a></p>`,
        source_urls: 'https://english.wsu.ac.kr/page/index.jsp?code=eng0302\nhttps://wkli.wsu.ac.kr/story/page/index.jsp?code=wkli020101a\nhttps://klec.sogang.ac.kr/fro_end_eng/img/brochure_EN_2026.pdf\nhttps://ericaiie.hanyang.ac.kr/eng_korean-language-course/eng_kor-course/eng_kor-schedule\nhttps://oia.hanyang.ac.kr/files/attach/filebox/2026/01/22/e15bd45bbe74d2a1041a6db3a4678625.pdf',
        seo_title: 'Học phí trường Hàn Quốc năm 2026: tiếng Hàn và hệ cử nhân',
        meta_description: 'So sánh học phí khóa tiếng Hàn và học phí cử nhân 2026 tại Woosong, Sogang, Hanyang Seoul, Hanyang ERICA và lưu ý mức Hannam theo chính sách 2021.',
        focus_keyword: 'học phí đại học Hàn Quốc 2026',
      },
      {
        title: 'D4-1 và D2-1, D2-2, D2-3, D2-6 khác nhau thế nào?',
        slug: 'phan-biet-visa-du-hoc-han-quoc-d4-1-d2',
        excerpt: 'Các mã này gắn với mục tiêu học tiếng, cao đẳng, cử nhân, thạc sĩ hoặc trao đổi. Chọn mã theo chương trình được trường tiếp nhận và yêu cầu của cơ quan cấp thị thực.',
        cover: 'p1', sort_order: 3,
        content: `<p>Trước khi chuẩn bị hồ sơ, hãy xác định chương trình học và cơ sở tiếp nhận. Study in Korea của Chính phủ Hàn Quốc xếp D-4 vào nhóm đào tạo không cấp bằng và D-2 vào nhóm chương trình cấp bằng hoặc một số chương trình học tập đặc thù.</p>
          <div><table><thead><tr><th>Mã</th><th>Mục tiêu chính theo hệ thống chính thức</th><th>Đối chiếu với lộ trình trong hồ sơ SOL DREAM</th></tr></thead><tbody>
          <tr><td>D-4-1</td><td>Đào tạo tiếng Hàn</td><td>Học tiếng Hàn tại trường trước khi chọn hoặc học tiếp chuyên ngành</td></tr>
          <tr><td>D-2-1</td><td>Chương trình cao đẳng / associate degree</td><td>Du học cao đẳng</td></tr>
          <tr><td>D-2-2</td><td>Chương trình cử nhân</td><td>Du học đại học</td></tr>
          <tr><td>D-2-3</td><td>Chương trình thạc sĩ</td><td>Du học sau khi đã tốt nghiệp đại học</td></tr>
          <tr><td>D-2-6</td><td>Sinh viên trao đổi</td><td>Chương trình trao đổi theo trường cử đi và trường tiếp nhận</td></tr>
          </tbody></table></div>
          <h2>Lưu ý khi đọc tên gói</h2>
          <p>Hồ sơ SolDream dùng “E-Visa” làm tên gói tư vấn thạc sĩ và ghi mã D-2-3. “E-Visa” là tên gói trong tài liệu của đơn vị tư vấn, không phải mã thị thực du học riêng trong danh mục D-2/D-4 của Chính phủ Hàn Quốc.</p>
          <p>Với trao đổi sinh viên, cổng Study in Korea nêu điều kiện là sinh viên đang học tại trường đối tác của trường Hàn Quốc dự kiến tiếp nhận. Hồ sơ SolDream mô tả chương trình liên kết với Cao đẳng Bách Khoa Sài Gòn; việc đủ điều kiện, trường tiếp nhận, học phí và hồ sơ cụ thể vẫn phụ thuộc thỏa thuận và xác nhận của hai trường trong kỳ đó.</p>
          <h2>Hồ sơ và quyết định thị thực</h2>
          <p>Nhóm giấy tờ, bằng chứng tài chính và yêu cầu bổ sung có thể khác theo loại chương trình, quốc tịch, cơ sở tiếp nhận và cơ quan đại diện xử lý hồ sơ. Nhận thư nhập học không đồng nghĩa chắc chắn được cấp thị thực. Hãy lấy danh sách giấy tờ từ trường và cơ quan tiếp nhận tại Việt Nam trước khi nộp.</p>
          <p><a href="/du-hoc/chi-phi-du-hoc-han-quoc-2026-2027">Xem bảng chi phí và phạm vi từng gói →</a></p>`,
        source_urls: 'https://studyinkorea.go.kr/ko/plan/visaAndStay.do\nhttps://studyinkorea.go.kr/ko/plan/schoolType.do?tab=other-programs',
        seo_title: 'Visa du học Hàn Quốc D4-1, D2-1, D2-2, D2-3, D2-6',
        meta_description: 'Phân biệt mã D4-1, D2-1, D2-2, D2-3 và D2-6 theo chương trình du học chính thức của Hàn Quốc; lưu ý tên gói E-Visa.',
        focus_keyword: 'visa du học Hàn Quốc D4-1 D2-2',
      },
      {
        title: 'Lộ trình học tiếng Hàn trước khi du học: 825 đến 1.405 tiết',
        slug: 'lo-trinh-hoc-tieng-han-truoc-khi-du-hoc',
        excerpt: 'Phụ lục SOL DREAM 2026–2027 mô tả hai lộ trình tiếng Hàn theo chương trình, từ sơ cấp, phỏng vấn đến học phần TOPIK; số tiết và thời lượng cần xếp theo hồ sơ từng học viên.',
        cover: 'p2', sort_order: 4,
        content: `<p>Khả năng tiếng Hàn cần được chuẩn bị theo mục tiêu học tập và yêu cầu của trường. Phụ lục đào tạo SOL DREAM 2026–2027 chia lộ trình thành nhóm D4-1/E-Visa và nhóm D2-1/D2-6; đây là kế hoạch đào tạo của trung tâm, không phải cam kết thay cho điều kiện đầu vào của trường Hàn Quốc.</p>
          <h2>D4-1 và gói E-Visa: 825 tiết</h2>
          <p>Kế hoạch chuẩn được hồ sơ mô tả trong khoảng 3–4 tháng, tối đa 4 tháng, gồm sơ cấp 1A, 1B, 2A, 2B; luyện phỏng vấn trường và luyện phỏng vấn lãnh sự. Phụ lục ghi một tiết học là 45 phút, lịch chuẩn 55 tiết mỗi tuần và kế hoạch khoảng 15 tuần.</p>
          <h2>D2-1 và D2-6: tối thiểu 1.405 tiết</h2>
          <p>Lộ trình này dự kiến 6–8 tháng. Sau bốn học phần sơ cấp, chương trình thêm trung cấp 1A, phỏng vấn trường, phỏng vấn lãnh sự, TOPIK I cấp độ 2 và phần TOPIK tăng cường/duy trì theo kế hoạch lớp và kỳ tuyển sinh. Mốc 1.405 tiết là mức tối thiểu ghi trong phụ lục; từng học viên có thể cần thời gian khác.</p>
          <h2>Khóa tiếng đăng ký lẻ</h2>
          <p>Hồ sơ cũng liệt kê các khóa sơ cấp, trung cấp, luyện TOPIK I, TOPIK cấp 3–4, giao tiếp và phát âm. Lịch chuẩn là ba buổi mỗi tuần, 90 phút mỗi buổi; sĩ số tối đa được ghi là 8 học viên cho lớp TOPIK và 10 học viên cho các lớp ngôn ngữ, giao tiếp, phát âm. Học phí từng khóa lẻ khác nhau và không cộng thêm vào phần đào tạo đã bao gồm trong gói du học.</p>
          <ul><li>D4-1 và E-Visa: phần đào tạo tiếng trong gói 32 triệu đồng theo hồ sơ.</li><li>D2-1 và D2-6: phần đào tạo tiếng trong gói 64 triệu đồng theo hồ sơ.</li><li>D2-2: gói dịch vụ hồ sơ không bao gồm đào tạo tiếng Hàn.</li></ul>
          <p>Hãy kiểm tra phiếu nhập học để biết ngày học, thời lượng, học phần, số tiết, giáo viên và khoản phí đã bao gồm. Nếu yêu cầu của trường hoặc lịch tuyển sinh thay đổi, trung tâm cần trao đổi lại kế hoạch đào tạo với học viên.</p>
          <p><a href="/khoa-hoc">Xem các khóa tiếng Hàn đăng ký lẻ →</a></p>`,
        source_urls: 'https://www.studyinkorea.go.kr/eng/plan/schoolType.do?tab=korean-language-institute\nhttps://studyinkorea.go.kr/ko/plan/visaAndStay.do',
        seo_title: 'Lộ trình tiếng Hàn trước khi du học: số tiết và học phí',
        meta_description: 'Tóm tắt lộ trình 825 và tối thiểu 1.405 tiết tiếng Hàn theo phụ lục SolDream 2026–2027 cùng lưu ý về học phần và học phí.',
        focus_keyword: 'học tiếng Hàn trước khi du học Hàn Quốc',
      },
      {
        title: '5 bước chuẩn bị hồ sơ du học Hàn Quốc từ chọn trường đến xuất cảnh',
        slug: '5-buoc-chuan-bi-ho-so-du-hoc-han-quoc',
        excerpt: 'Một lộ trình dễ theo dõi gồm xác định mục tiêu, đối chiếu trường và ngành, chuẩn bị hồ sơ, nhận kết quả tiếp nhận và làm thủ tục thị thực trước khi lên đường.',
        cover: 'p1', sort_order: 5,
        content: `<p>Chuẩn bị du học thường gồm nhiều việc diễn ra nối tiếp nhau. Study in Korea khuyến nghị tìm hiểu trường và ngành trước, nộp hồ sơ theo quy trình từng trường, nhận thư tiếp nhận rồi chuẩn bị hồ sơ thị thực. SOL DREAM mô tả các bước hỗ trợ học viên như sau.</p>
          <ol><li><strong>Làm rõ mục tiêu:</strong> xác định bậc học, ngành quan tâm, kết quả học tập, năng lực tiếng Hàn và ngân sách dự kiến.</li>
          <li><strong>Chọn trường và chương trình:</strong> so sánh cơ sở, ngành, yêu cầu đầu vào, lịch tuyển sinh, học phí, học bổng và ký túc xá từ thông báo chính thức.</li>
          <li><strong>Chuẩn bị hồ sơ và năng lực:</strong> hoàn thiện giấy tờ học tập, tài chính, dịch thuật/hợp pháp hóa theo danh mục áp dụng; học tiếng và luyện phỏng vấn nếu chương trình yêu cầu.</li>
          <li><strong>Nộp hồ sơ, chờ trường xét:</strong> nộp đúng thời gian, theo dõi yêu cầu bổ sung và chỉ thanh toán học phí trường theo hướng dẫn chính thức.</li>
          <li><strong>Làm thị thực và chuẩn bị xuất cảnh:</strong> sau khi được trường cấp giấy tờ tiếp nhận, kiểm tra lại biểu mẫu, giấy tờ, lịch khám và thủ tục tại cơ quan tiếp nhận hồ sơ ở Việt Nam.</li></ol>
          <p>Trong hồ sơ SolDream, các hạng mục sau tiếp nhận còn có hướng dẫn trước xuất cảnh và kết nối hỗ trợ tại Hàn Quốc theo phạm vi dịch vụ đã thống nhất. Học viên nên ghi rõ những hỗ trợ này trong hợp đồng hoặc phụ lục.</p>
          <h2>Checklist trước khi chốt trường</h2>
          <ul><li>Đúng tên trường và cơ sở tiếp nhận.</li><li>Đúng ngành, bậc học và mã chương trình.</li><li>Đủ điều kiện ngôn ngữ, học lực và tài chính theo kỳ hiện tại.</li><li>Đã tách học phí trường khỏi phí dịch vụ tư vấn.</li><li>Đã kiểm tra hạn nộp hồ sơ, khoản hoàn/hủy và lịch thanh toán bằng văn bản.</li></ul>
          <p>Điều kiện, biểu mẫu và thời gian xử lý có thể khác nhau giữa các trường và kỳ tuyển sinh. Bài viết là khung chuẩn bị chung; thông báo của trường và cơ quan thị thực là căn cứ cho hồ sơ cụ thể.</p>
          <p><a href="/truong-dai-hoc">Xem danh sách trường đối tác và website chính thức →</a></p>`,
        source_urls: 'https://www.studyinkorea.go.kr/eng/plan/flowChart.do\nhttps://studyinkorea.go.kr/en_US/plan/visaAndStay.do',
        seo_title: '5 bước chuẩn bị hồ sơ du học Hàn Quốc',
        meta_description: 'Hướng dẫn năm bước chọn trường, nộp hồ sơ, nhận thư tiếp nhận và chuẩn bị thị thực du học Hàn Quốc theo cổng Study in Korea.',
        focus_keyword: 'hồ sơ du học Hàn Quốc',
      },
    ];
    const startOrder = db.prepare("SELECT COALESCE(MAX(sort_order),0)+1 AS n FROM programs WHERE category='Chương trình du học'").get().n;
    const exists = db.prepare('SELECT 1 FROM programs WHERE slug=?');
    const insert = db.prepare(`INSERT INTO programs
      (title,subtitle,slug,excerpt,content,category,cover,source_urls,author_name,author_role,author_url,seo_title,meta_description,focus_keyword,noindex,sort_order,published,created_at,updated_at)
      VALUES (@title,'',@slug,@excerpt,@content,'Chương trình du học',@cover,@source_urls,'Ban biên tập SOL DREAM EDUCATION','Biên soạn theo hồ sơ 2026–2027 và đối chiếu nguồn chính thức','/gioi-thieu',@seo_title,@meta_description,@focus_keyword,0,@sort_order,1,'2026-10-17 12:00:00','2026-10-17 12:00:00')`);
    db.transaction(() => {
      let offset = 0;
      for (const guide of guides) {
        if (exists.get(guide.slug)) continue;
        insert.run({ ...guide, sort_order: startOrder + offset });
        offset += 1;
      }
      db.prepare('INSERT INTO system_meta (key,value,updated_at) VALUES (?,?,datetime(\'now\',\'localtime\'))')
        .run(migrationKey, '1');
    })();
  }
}

// Complete the 2026–2027 company profile mapping without replacing administrator edits.
{
  const migrationKey = 'profile_complete_information_mapping_20261017_v1';
  if (!db.prepare('SELECT 1 FROM system_meta WHERE key=?').get(migrationKey)) {
    db.transaction(() => {
      const aboutSections = [
        {
          title: 'Giá trị và trải nghiệm học tập', sortOrder: 5,
          content: `<h3>Giá trị SOL DREAM theo hồ sơ 2026–2027</h3>
            <ul><li><strong>Học để làm chủ năng lực:</strong> xây nền tảng kiến thức và kỹ năng để người học chủ động trong học tập, công việc và cuộc sống.</li>
            <li><strong>Hiểu bản thân để chọn hướng đi:</strong> nhìn lại điểm mạnh, mục tiêu và điều kiện cá nhân để chọn chương trình phù hợp.</li>
            <li><strong>Kết nối để cùng tiến bộ:</strong> học tập trong cộng đồng tích cực, có sự phối hợp giữa học viên, gia đình và đội ngũ đồng hành.</li></ul>
            <h3>Trải nghiệm trong quá trình chuẩn bị</h3>
            <ul><li>Học trên lớp để xây kỹ năng, thói quen học tập và chuẩn bị phỏng vấn.</li>
            <li>Tham gia hoạt động ngoại khóa và cuộc thi được tổ chức định kỳ theo kế hoạch của trung tâm.</li>
            <li>Được hỗ trợ trong các bước giấy tờ, chuẩn bị xuất cảnh và kết nối tại Hàn Quốc trong phạm vi dịch vụ đã thống nhất.</li></ul>
            <p class="source-meta">Nội dung tóm lược từ Hồ sơ giới thiệu SOL DREAM EDUCATION 2026–2027. Lịch và hoạt động thực tế có thể thay đổi theo kế hoạch từng khóa.</p>`
        },
        {
          title: 'Địa chỉ và đầu mối liên hệ', sortOrder: 6,
          content: `<h3>Liên hệ tại Việt Nam</h3>
            <ul><li><strong>Trụ sở SOL DREAM EDUCATION:</strong> 89 đường S11, phường Tây Thạnh, TP. Hồ Chí Minh.</li>
            <li><strong>Văn phòng Đồng Nai:</strong> Tổ 20, ấp Láng Lớn, xã Xuân Mỹ, huyện Cẩm Mỹ, Đồng Nai.</li>
            <li><strong>Văn phòng miền Bắc:</strong> 98 đường Thủy Nguyên, khu đô thị Ecopark, Xuân Quan, Phụng Công, Hưng Yên.</li>
            <li><strong>Hotline:</strong> 03 6464 8282 · <strong>Website:</strong> <a href="https://www.soldream.edu.vn">soldream.edu.vn</a> · <strong>Facebook:</strong> <a href="https://www.facebook.com/soldreamedu">facebook.com/soldreamedu</a>.</li>
            <li><strong>Đầu mối miền Bắc theo hồ sơ:</strong> bà Trần Thị Quyên · 0914 200 687.</li></ul>
            <h3>Đầu mối hỗ trợ tại Hàn Quốc</h3>
            <p><strong>Ông Gu Bong Mo · COMMA Corporation</strong> — đầu mối hợp tác kinh doanh và hỗ trợ quản lý học viên tại Hàn Quốc theo hồ sơ giới thiệu.</p>
            <ul><li>Địa chỉ: Phòng 202, số 23 Hanbat-daero 592beon-gil, Seo-gu, Daejeon, Hàn Quốc.</li>
            <li>Điện thoại: <a href="tel:+827040790719">070-4079-0719</a> · Di động: <a href="tel:+821064090719">010-6409-0719</a>.</li>
            <li>Email: <a href="mailto:didigi3@naver.com">didigi3@naver.com</a>.</li></ul>
            <p class="source-meta">Địa chỉ và đầu mối được đăng theo hồ sơ do SOL DREAM EDUCATION cung cấp. Vui lòng liên hệ trước khi đến văn phòng hoặc sử dụng thông tin để gửi hồ sơ.</p>`
        }
      ];
      const findAboutTab = db.prepare("SELECT id FROM about_sections WHERE location='page' AND title=? LIMIT 1");
      const insertAboutTab = db.prepare(`INSERT INTO about_sections
        (location,eyebrow,title,content,section_style,sort_order,active)
        VALUES ('page','Theo hồ sơ giới thiệu 2026–2027',?,?,'tab',?,1)`);
      for (const section of aboutSections) {
        if (!findAboutTab.get(section.title)) insertAboutTab.run(section.title, section.content, section.sortOrder);
      }

      const legal = db.prepare("SELECT id,content FROM about_sections WHERE location='page' AND title='Năng lực đào tạo và pháp lý' LIMIT 1").get();
      if (legal && !legal.content.includes('profile-service-stage-5')) {
        let content = legal.content.replace(
          'Rà soát các khoản phải chuẩn bị trước xuất cảnh và hỗ trợ kết nối sau khi học viên sang Hàn Quốc theo phạm vi dịch vụ đã thống nhất.',
          'Rà soát hồ sơ, các khoản cần chuẩn bị và kế hoạch trước ngày xuất cảnh.'
        );
        content += `<h3 id="profile-service-stage-5">Giai đoạn 5 · Hỗ trợ tại Hàn Quốc</h3>
          <p>Kết nối đầu mối tại Hàn Quốc và hỗ trợ quản lý học viên theo phạm vi dịch vụ đã thống nhất với gia đình.</p>`;
        db.prepare("UPDATE about_sections SET content=?,updated_at=datetime('now','localtime') WHERE id=?").run(content, legal.id);
      }

      // Add only schedule metadata to the live course rows; retain every other stored/admin-edited field.
      const courseRows = db.prepare('SELECT id,financials_json FROM courses').all();
      const updateCourse = db.prepare("UPDATE courses SET financials_json=?,updated_at=datetime('now','localtime') WHERE id=?");
      for (const row of courseRows) {
        const source = courseData.courses.find((course) => course.id === row.id);
        const weeks = source?.financials?.tuition2026?.estimatedWeeks;
        if (!weeks) continue;
        let financials;
        try { financials = JSON.parse(row.financials_json || '{}'); } catch { financials = {}; }
        if (!financials.tuition2026 || financials.tuition2026.estimatedWeeks === weeks) continue;
        financials.tuition2026.estimatedWeeks = weeks;
        updateCourse.run(JSON.stringify(financials), row.id);
      }

      // Add detail from the profile appendices to existing articles only once.
      const appendProgramSection = db.prepare("SELECT id,content FROM programs WHERE slug=? LIMIT 1");
      const updateProgramSection = db.prepare("UPDATE programs SET content=?,updated_at=datetime('now','localtime') WHERE id=?");
      const articleAddenda = [
        {
          slug: 'chi-phi-du-hoc-han-quoc-2026-2027', marker: '<!-- profile-cost-inclusions-2026 -->',
          html: `<!-- profile-cost-inclusions-2026 -->
            <h2>Phạm vi khoản phí theo phụ lục</h2>
            <h3>Các hạng mục đã gồm trong gói</h3>
            <ul><li>Tư vấn lộ trình; hai bộ hồ sơ tiêu chuẩn gồm một bộ nộp trường và một bộ xin thị thực.</li>
            <li>Sao y, dịch tiếng Anh, công chứng và hợp pháp hóa giấy tờ theo phạm vi bộ hồ sơ tiêu chuẩn.</li>
            <li>Hỗ trợ quy trình xin thị thực; phí tiếp nhận KVAC, lệ phí thị thực, một lần khám sức khỏe tiêu chuẩn và chuyển phát hồ sơ tiêu chuẩn.</li>
            <li>Đào tạo tiếng Hàn: D4-1 và E-Visa 32 triệu đồng; D2-1 và D2-6 64 triệu đồng. Gói D2-2 chỉ gồm dịch vụ hồ sơ, không gồm đào tạo tiếng.</li></ul>
            <h3>Các khoản thanh toán riêng</h3>
            <ul><li>Học phí đại học/tiếng tại trường Hàn Quốc, ký túc xá, bảo hiểm, khoản thu khác của trường và phí chuyển tiền.</li>
            <li>TOPIK, vé máy bay, đi lại tại Hàn Quốc, ăn uống và sinh hoạt cá nhân.</li>
            <li>Chứng minh tài chính hoặc duy trì số dư; khám lại; giấy tờ phát sinh ngoài bộ tiêu chuẩn; lớp TOPIK bổ sung ngoài phần khóa học đã bao gồm.</li>
            <li>Hoạt động nhóm tự nguyện nếu có thông báo trước; chi phí cá nhân khác.</li></ul>
            <p>Trường hợp phát sinh ngoài phạm vi tiêu chuẩn, phụ lục yêu cầu trao đổi và ghi rõ nội dung, số tiền, đơn vị nhận và thời hạn thanh toán; người học cần nhận chứng từ thu. Việc chờ lịch hoặc chuyến bay thay đổi không tự động làm phát sinh học phí trường; hãy căn cứ thông báo bằng văn bản của trường cho kỳ học cụ thể.</p>
            <p><a href="/documents/sol-dream-profile-2026-2027.pdf">Tải hồ sơ giới thiệu SOL DREAM 2026–2027 (PDF) →</a></p>`
        },
        {
          slug: 'lo-trinh-hoc-tieng-han-truoc-khi-du-hoc', marker: '<!-- profile-language-breakdown-2026 -->',
          html: `<!-- profile-language-breakdown-2026 -->
            <h2>Bảng phân bổ tiết học trong phụ lục 2026–2027</h2>
            <p>Một tiết học dài 45 phút. Số tiết dưới đây là phân bổ kế hoạch trong hồ sơ; phần TOPIK ghi “đăng ký riêng” không tự động nằm trong tổng số tiết gói cơ bản.</p>
            <div><table><thead><tr><th>Học phần</th><th>D4-1 / E-Visa</th><th>D2-1 / D2-6</th></tr></thead><tbody>
            <tr><td>Sơ cấp 1A</td><td>110 tiết</td><td>110 tiết</td></tr><tr><td>Sơ cấp 1B</td><td>110 tiết</td><td>110 tiết</td></tr>
            <tr><td>Sơ cấp 2A</td><td>220 tiết</td><td>220 tiết</td></tr><tr><td>Sơ cấp 2B</td><td>220 tiết</td><td>220 tiết</td></tr>
            <tr><td>Trung cấp 1A</td><td>Không gồm</td><td>220 tiết</td></tr><tr><td>Phỏng vấn trường</td><td>55 tiết</td><td>55 tiết</td></tr>
            <tr><td>Phỏng vấn lãnh sự</td><td>110 tiết</td><td>110 tiết</td></tr><tr><td>TOPIK I cấp 2</td><td>Đăng ký riêng</td><td>120 tiết</td></tr>
            <tr><td>TOPIK nâng cao/duy trì</td><td>Đăng ký riêng</td><td>Tối thiểu 240 tiết</td></tr>
            <tr><th>Tổng kế hoạch</th><th>825 tiết</th><th>Tối thiểu 1.405 tiết</th></tr></tbody></table></div>
            <p>Phụ lục nêu lịch chuẩn 55 tiết mỗi tuần và tối thiểu hai lần phỏng vấn mô phỏng. D4-1/E-Visa dự kiến tối đa bốn tháng; D2-1/D2-6 dự kiến 6–8 tháng. Thời gian thực tế phụ thuộc đầu vào, lịch học, kỳ tuyển sinh và kế hoạch của từng lớp.</p>`
        }
      ];
      for (const item of articleAddenda) {
        const row = appendProgramSection.get(item.slug);
        if (row && !row.content.includes(item.marker)) updateProgramSection.run(`${row.content}\n${item.html}`, row.id);
      }

      const programSlug = 'cac-chuong-trinh-du-hoc-han-quoc-trong-ho-so-sol-dream-2026';
      const existingProgram = db.prepare('SELECT id FROM programs WHERE slug=?').get(programSlug);
      if (!existingProgram) {
        const sortOrder = db.prepare("SELECT COALESCE(MAX(sort_order),0)+1 AS n FROM programs WHERE category='Chương trình du học'").get().n;
        db.prepare(`INSERT INTO programs
          (title,subtitle,slug,excerpt,content,category,cover,source_urls,author_name,author_role,author_url,seo_title,meta_description,focus_keyword,noindex,sort_order,published,created_at,updated_at)
          VALUES (@title,'',@slug,@excerpt,@content,'Chương trình du học','p2',@source_urls,'Ban biên tập SOL DREAM EDUCATION','Biên soạn theo hồ sơ 2026–2027 và đối chiếu Study in Korea','/gioi-thieu',@seo_title,@meta_description,@focus_keyword,0,@sort_order,1,datetime('now','localtime'),datetime('now','localtime'))`)
          .run({
            title: 'Các chương trình du học Hàn Quốc trong hồ sơ SOL DREAM 2026–2027',
            slug: programSlug,
            excerpt: 'Đối chiếu lộ trình D4-1, D2-1, D2-6, D2-2 và E-Visa (D2-3) theo bậc học, phần tiếng Hàn, khoản phí trong hồ sơ và điều kiện cần xác nhận với trường.',
            content: `<p>Hồ sơ giới thiệu SOL DREAM EDUCATION 2026–2027 trình bày năm lộ trình. Mã chương trình chính thức, điều kiện tiếp nhận và thị thực cần đối chiếu với trường và cơ quan có thẩm quyền ở kỳ nộp hồ sơ; “E-Visa” là tên gói tư vấn trong hồ sơ, còn mã học thạc sĩ tương ứng được ghi là D-2-3.</p>
              <div><table><thead><tr><th>Lộ trình</th><th>Mục tiêu theo hồ sơ</th><th>Phần tiếng trong gói</th><th>Tổng phí tại Việt Nam</th></tr></thead><tbody>
              <tr><td>D4-1</td><td>Học tiếng Hàn tại trường</td><td>32 triệu đồng · kế hoạch 825 tiết</td><td>90,32 triệu đồng</td></tr>
              <tr><td>D2-1</td><td>Cao đẳng</td><td>64 triệu đồng · tối thiểu 1.405 tiết</td><td>122,32 triệu đồng</td></tr>
              <tr><td>D2-6</td><td>Trao đổi sinh viên qua chương trình BKC và trường tiếp nhận</td><td>64 triệu đồng · tối thiểu 1.405 tiết</td><td>142,72 triệu đồng, gồm 15 triệu đồng học phí một kỳ tại BKC theo phụ lục</td></tr>
              <tr><td>D2-2</td><td>Cử nhân/đại học</td><td>Không gồm khóa tiếng Hàn trong gói</td><td>58,32 triệu đồng</td></tr>
              <tr><td>E-Visa · D2-3</td><td>Thạc sĩ dành cho người đã tốt nghiệp đại học</td><td>32 triệu đồng · kế hoạch 825 tiết</td><td>94,64 triệu đồng</td></tr></tbody></table></div>
              <p>Các tổng phí là số liệu trong hồ sơ cho dịch vụ, quản lý, đào tạo tiếng và khoản BKC được nêu ở từng gói; không phải tổng chi phí du học. Học phí trường Hàn Quốc, nơi ở, bảo hiểm theo yêu cầu trường, vé máy bay, sinh hoạt và khoản riêng được tách tại <a href="/du-hoc/chi-phi-du-hoc-han-quoc-2026-2027">bài chi phí du học</a>. Xem thêm <a href="/du-hoc/lo-trinh-hoc-tieng-han-truoc-khi-du-hoc">bảng tiết học</a> và <a href="/truong-dai-hoc">danh sách trường đối tác</a>.</p>
              <h2>Lưu ý riêng cho từng lộ trình</h2>
              <ul><li><strong>D4-1:</strong> lộ trình học tiếng tại cơ sở đào tạo tiếp nhận; thời lượng và yêu cầu đầu vào do trường quy định.</li>
              <li><strong>D2-1:</strong> chương trình cao đẳng. Hồ sơ SOL DREAM mô tả cơ hội thực tập có lương từ học kỳ 2 hoặc 3 tùy trường, ngành và quy định áp dụng; đây không phải cam kết về việc làm hay thu nhập.</li>
              <li><strong>D2-6:</strong> chương trình trao đổi cần xác nhận tình trạng sinh viên, thỏa thuận giữa trường cử đi và trường tiếp nhận, lịch học cùng các khoản phải trả cho kỳ cụ thể.</li>
              <li><strong>D2-2:</strong> hệ cử nhân; gói dịch vụ trong hồ sơ không gồm học tiếng. Hãy kiểm tra yêu cầu ngôn ngữ trực tiếp với ngành và trường.</li>
              <li><strong>E-Visa / D2-3:</strong> gói tư vấn thạc sĩ cho người đã có bằng đại học. Hồ sơ giới thiệu lịch học linh hoạt và không yêu cầu học tiếng trước trong một số trường hợp; điều kiện ngoại ngữ thực tế phụ thuộc trường, ngành và chương trình.</li></ul>
              <h2>Thực tập và việc làm tại Hàn Quốc</h2>
              <p>Việc sinh viên quốc tế làm thêm hoặc thực tập có lương phụ thuộc tình trạng lưu trú, trình độ tiếng Hàn, xác nhận của trường và giấy phép cần thiết trước khi bắt đầu. Không nên tính thu nhập dự kiến như khoản chắc chắn để bù học phí. Hãy xin xác nhận của văn phòng sinh viên quốc tế và cơ quan xuất nhập cảnh cho trường hợp cụ thể.</p>
              <p><a href="https://was3.studyinkorea.go.kr/ko/work/aboutForeignerEmploymentSystem.do?tab=part-time">Study in Korea: điều kiện làm thêm của sinh viên quốc tế</a> · <a href="https://studyinkorea.go.kr/ko/life/residenceAndStayInfo.do?tab=job-seeker-visa">Study in Korea: quy định lưu trú và việc làm</a>.</p>
              <p class="source-meta">Chi phí và cấu trúc gói được trích từ hồ sơ SOL DREAM EDUCATION 2026–2027, áp dụng đến khi có thông báo mới. Mức phí, kỳ tuyển sinh, điều kiện trường và chính sách thị thực cần xác nhận lại bằng văn bản trước khi đăng ký.</p>`,
            source_urls: 'https://studyinkorea.go.kr/en_US/plan/visaAndStay.do\nhttps://was3.studyinkorea.go.kr/ko/work/aboutForeignerEmploymentSystem.do?tab=part-time\nhttps://studyinkorea.go.kr/ko/life/residenceAndStayInfo.do?tab=job-seeker-visa',
            seo_title: 'Các chương trình du học Hàn Quốc SOL DREAM 2026–2027',
            meta_description: 'So sánh D4-1, D2-1, D2-6, D2-2 và E-Visa/D2-3 theo hồ sơ SOL DREAM: mục tiêu, học tiếng, tổng phí và điều kiện cần xác nhận.',
            focus_keyword: 'chương trình du học Hàn Quốc D4-1 D2-1 D2-2 D2-3 D2-6',
            sort_order: sortOrder
          });
      }

      db.prepare('INSERT INTO system_meta (key,value,updated_at) VALUES (?,?,datetime(\'now\',\'localtime\'))')
        .run(migrationKey, '1');
    })();
    console.log('[db] completed 2026-2027 profile information mapping');
  }
}

// One public topic taxonomy for handbook posts and scanned source items.
{
  const migrationKey = 'content_topics_20261019_v1';
  if (!db.prepare('SELECT 1 FROM system_meta WHERE key=?').get(migrationKey)) {
    db.transaction(() => {
      const updatePost = db.prepare('UPDATE posts SET topic=? WHERE id=?');
      for (const post of db.prepare('SELECT id,title,excerpt,category,topic FROM posts').all()) {
        const topic = inferTopic(post);
        if (post.topic !== topic) updatePost.run(topic, post.id);
      }
      const updateResearch = db.prepare('UPDATE research_items SET topic=? WHERE id=?');
      for (const item of db.prepare(`SELECT i.id,i.title,i.excerpt,i.suggested_section,i.topic,p.topic AS post_topic
        FROM research_items i LEFT JOIN posts p ON p.id=i.published_post_id`).all()) {
        const topic = normalizeTopic(item.post_topic) || inferTopic(item);
        if (item.topic !== topic) updateResearch.run(topic, item.id);
      }
      db.prepare("INSERT INTO system_meta (key,value,updated_at) VALUES (?,? ,datetime('now','localtime'))")
        .run(migrationKey, '1');
    })();
  }
}

// Publish editorial articles for profile details that previously appeared only in
// About tabs, school/course tables, or the downloadable document.
{
  const migrationKey = 'profile_editorial_articles_20261019_v1';
  if (!db.prepare('SELECT 1 FROM system_meta WHERE key=?').get(migrationKey)) {
    const articles = require('../data/profileArticles');
    const existing = db.prepare('SELECT id FROM posts WHERE slug=?');
    const insert = db.prepare(`INSERT INTO posts
      (title,slug,excerpt,content,category,topic,cover,cover_image,author_name,author_role,author_url,source_urls,seo_title,meta_description,focus_keyword,noindex,published,created_at,updated_at)
      VALUES (@title,@slug,@excerpt,@content,@category,@topic,'p1',@cover_image,'SOL DREAM EDUCATION','Biên soạn từ hồ sơ giới thiệu 2026–2027','/gioi-thieu',@source_urls,@seo_title,@meta_description,@focus_keyword,0,1,'2026-10-19 12:00:00','2026-10-19 12:00:00')`);
    db.transaction(() => {
      for (const article of articles) {
        if (existing.get(article.slug)) continue;
        insert.run({ ...article, category: topicLabel(article.topic), cover_image: article.cover_image || null });
      }
      db.prepare("INSERT INTO system_meta (key,value,updated_at) VALUES (?,? ,datetime('now','localtime'))")
        .run(migrationKey, String(articles.length));
    })();
  }
}

// Record actual UTC publication/content events from every writing path. Leave
// unknown historical first-publication times empty rather than inventing them.
db.exec(`
  CREATE TRIGGER IF NOT EXISTS posts_publication_insert_utc AFTER INSERT ON posts BEGIN
    UPDATE posts SET
      publication_clock_tracked=1,
      first_published_at=CASE WHEN NEW.published=1 AND NEW.first_published_at='' THEN strftime('%Y-%m-%dT%H:%M:%fZ','now') ELSE NEW.first_published_at END,
      content_modified_at=CASE WHEN NEW.content_modified_at='' THEN strftime('%Y-%m-%dT%H:%M:%fZ','now') ELSE NEW.content_modified_at END
    WHERE id=NEW.id;
  END;
  CREATE TRIGGER IF NOT EXISTS posts_publication_update_utc AFTER UPDATE OF published ON posts
    WHEN OLD.published=0 AND NEW.published=1 AND NEW.first_published_at='' AND NEW.publication_clock_tracked=1 BEGIN
    UPDATE posts SET first_published_at=strftime('%Y-%m-%dT%H:%M:%fZ','now'),
      content_modified_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=NEW.id;
  END;
  CREATE TRIGGER IF NOT EXISTS posts_content_update_utc
    AFTER UPDATE OF title,excerpt,content,cover_image,author_name,author_role,author_url,author_type,seo_title,meta_description,focus_keyword ON posts
    WHEN NEW.title IS NOT OLD.title OR NEW.excerpt IS NOT OLD.excerpt OR NEW.content IS NOT OLD.content
      OR NEW.cover_image IS NOT OLD.cover_image OR NEW.author_name IS NOT OLD.author_name
      OR NEW.author_role IS NOT OLD.author_role OR NEW.author_url IS NOT OLD.author_url OR NEW.author_type IS NOT OLD.author_type
      OR NEW.seo_title IS NOT OLD.seo_title OR NEW.meta_description IS NOT OLD.meta_description OR NEW.focus_keyword IS NOT OLD.focus_keyword BEGIN
    UPDATE posts SET content_modified_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=NEW.id;
  END;
`);

{
  const { applyContentTopicAudit } = require('../lib/contentTopicAudit');
  const result = applyContentTopicAudit(db, require('../data/content-topic-review-20261020.json'));
  if (result) console.log('[db] reviewed content topics', JSON.stringify(result));
}

{
  const result = require('../lib/researchPolicyMigration').applyResearchPolicy(db);
  if (result) console.log('[research] partner/monthly policy', JSON.stringify(result));
}
{
  const result = require('../lib/schoolNoticeMigration').applySchoolNoticePolicy(db);
  if (result) console.log('[research] weekly school notices', JSON.stringify(result));
}
require('../lib/contentEditingMigration').applyContentEditing(db);
{ const result=require('../lib/guidanceScopeMigration').applyGuidanceScope(db);if(result)console.log('[research] living support guidance scope',JSON.stringify(result)); }
{ const result=require('../lib/sevenContentFixesMigration').applySevenContentFixes(db);if(result)console.log('[content] seven content fixes',JSON.stringify(result)); }
module.exports = db;
{ const result=require('../lib/siteContentMigration').applySiteContent(db);if(result.fields||result.datasets)console.log('[content] editable website content',JSON.stringify(result)); }
{ const result=require('../lib/seoAuditMigration').applySeoAuditFixes(db);if(result)console.log('[seo] verified metadata fixes',JSON.stringify(result)); }
{ const result=require('../lib/seoTopicReviewMigration').applySeoTopicReview(db);if(result)console.log('[seo] owner-approved topic review',JSON.stringify(result)); }
{ const result=require('../lib/confirmedStatsMigration').applyConfirmedStats(db);if(result)console.log('[content] owner-confirmed statistics',JSON.stringify(result)); }
{ const result=require('../lib/studyHubMigration').applyStudyHubCopy(db);if(result)console.log('[seo] nationwide study hub',JSON.stringify(result)); }
{ const result=require('../lib/editorialGuidesMigration').applyEditorialGuides(db);if(result)console.log('[content] completed study guides',JSON.stringify(result)); }
