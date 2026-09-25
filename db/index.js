'use strict';
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

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
for (const column of ['author_name', 'author_role', 'source_urls']) {
  if (!_cols.includes(column)) db.exec(`ALTER TABLE posts ADD COLUMN ${column} TEXT NOT NULL DEFAULT ''`);
}
for (const [column, definition] of Object.entries({
  author_url: "TEXT NOT NULL DEFAULT ''",
  seo_title: "TEXT NOT NULL DEFAULT ''",
  meta_description: "TEXT NOT NULL DEFAULT ''",
  focus_keyword: "TEXT NOT NULL DEFAULT ''",
  noindex: 'INTEGER NOT NULL DEFAULT 0',
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
const _faqCols = db.prepare("PRAGMA table_info(faqs)").all().map(c => c.name);
if (!_faqCols.includes('origin_type')) db.exec("ALTER TABLE faqs ADD COLUMN origin_type TEXT NOT NULL DEFAULT ''");
if (!_faqCols.includes('origin_id')) db.exec("ALTER TABLE faqs ADD COLUMN origin_id TEXT NOT NULL DEFAULT ''");
db.exec('CREATE INDEX IF NOT EXISTS idx_faqs_origin ON faqs(origin_type, origin_id, generated)');
const _researchItemCols = db.prepare("PRAGMA table_info(research_items)").all().map(c => c.name);
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
const _leadCols = db.prepare("PRAGMA table_info(leads)").all().map(c => c.name);
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
const aboutTabsMigrationKey = 'about_official_tabs_20260925';
if (!db.prepare('SELECT 1 FROM system_meta WHERE key=?').get(aboutTabsMigrationKey)) {
  const officialAboutTabs = [
    {
      title: 'Lời chào', eyebrow: 'Thư ngỏ từ Giám đốc', sortOrder: 1,
      content: `<p>Gửi những thế hệ trẻ đang mang trong mình khát vọng vươn ra thế giới,</p>
        <figure><img src="/img/dao-duy-thang.jpg" alt="Tiến sĩ Đào Duy Thắng, Giám đốc SOL DREAM EDUCATION" width="1706" height="2560"><figcaption>Tiến sĩ Đào Duy Thắng — Giám đốc SOL DREAM EDUCATION</figcaption></figure>
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
        <p>SOL DREAM định hướng trở thành hệ sinh thái giáo dục và kết nối Việt Nam – Hàn Quốc hàng đầu, nơi mỗi học viên có điều kiện phát triển tiềm năng, đóng góp cho cả hai quốc gia và xem Hàn Quốc như quê hương thứ hai nuôi dưỡng thành công.</p>
        <blockquote>SOL DREAM: Kỷ nguyên vươn mình – Trí tuệ Việt, Tương lai toàn cầu.</blockquote>`,
    },
    {
      title: 'Bộ máy tổ chức', eyebrow: 'Cơ cấu SOL DREAM EDUCATION', sortOrder: 3,
      content: `<p>Cơ cấu tổ chức của SOL DREAM EDUCATION được vận hành dưới sự điều hành của CEO, Ban giám đốc và sự giám sát của Ban kiểm soát. Các khối chuyên môn phối hợp từ tư vấn, tuyển sinh, đào tạo, hồ sơ đến chăm sóc sinh viên.</p>
        <h3>Cấp điều hành và kiểm soát</h3>
        <ul><li><strong>CEO</strong></li><li><strong>Ban giám đốc</strong></li><li><strong>Ban kiểm soát</strong></li></ul>
        <h3>Khối Hành chính — phụ trách: bà Ngọc</h3>
        <ul><li>Lễ tân, hành chính và kế toán</li><li>Thủ tục hồ sơ và hợp đồng</li><li>Quản lý và chăm sóc sinh viên</li></ul>
        <h3>Marketing — phụ trách: bà Chi và bà Hương</h3>
        <ul><li>Content và Digital</li><li>Media và sự kiện</li></ul>
        <h3>Khối Tư vấn & Tuyển sinh — phụ trách: bà Trân</h3>
        <p>Thạc sĩ Kinh doanh Quốc tế, Đại học Woosong, Hàn Quốc.</p>
        <ul><li>Cộng tác viên cấp 1</li><li>Cộng tác viên cấp 2</li><li>Đội ngũ telesales</li></ul>
        <h3>Khối Đào tạo — phụ trách: bà Như</h3>
        <p>Thạc sĩ Ngôn ngữ Hàn Quốc, Đại học Quốc gia Seoul, Hàn Quốc.</p>
        <ul><li>Đội ngũ giáo viên Việt Nam</li><li>Đội ngũ giáo viên nước ngoài</li></ul>
        <h3>Đơn vị thành viên</h3>
        <ul><li>Công ty Cổ phần VIETCOREA</li><li>Hệ thống nhà hàng Cô Ba Sài Gòn</li></ul>`,
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

if (db.prepare('SELECT COUNT(*) c FROM testimonials').get().c === 0) {
  const insertTestimonial = db.prepare(`INSERT INTO testimonials
    (name,role,quote,initials,rating,sort_order,published) VALUES (?,?,?,?,?,?,1)`);
  db.transaction(() => {
    insertTestimonial.run('Học viên Thanh Tâm', 'Lớp tiếng Hàn giao tiếp', 'Thầy cô siêu dễ thương, có tâm ❤. Học ở Sol Dream mình vừa vui vừa tiến bộ nhanh hơn mình nghĩ.', 'TT', 5, 10);
    insertTestimonial.run('Học viên du học Hàn Quốc', 'Nhập học kỳ tháng 9', 'Cảm ơn SDE đã tiếp sức, cho em niềm tin cũng như sức mạnh trong chặng đường phía trước tại xứ sở kim chi. 솔드림 사랑해요!', 'SD', 5, 20);
  })();
}

// Course catalogue starts from the verified JSON dataset and is editable in Admin afterwards.
if (db.prepare('SELECT COUNT(*) c FROM courses').get().c === 0) {
  const courseData = require('../data/courses.json');
  const insertCourse = db.prepare(`INSERT INTO courses (id,slug,name,bluf_summary,audience,description,price,language,financials_json,requirements_json,sort_order,published,last_updated)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  db.transaction((rows) => rows.forEach((course, index) => insertCourse.run(
    course.id, course.slug || course.id, course.name, course.blufSummary || '', course.audience || '', course.description || '',
    course.price || '', course.language || 'Tiếng Hàn', JSON.stringify(course.financials || {}), JSON.stringify(course.requirements || {}), index, 1, course.lastUpdated || courseData.updated_at || ''
  )))(courseData.courses);
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

module.exports = db;
