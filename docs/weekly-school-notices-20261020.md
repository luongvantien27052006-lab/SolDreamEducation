# Weekly school notices — 20 October 2026

User policy: follow only the institutions in the SolDream 2026–2027 profile,
read their notice boards/new posts once every seven days, prefer the article's
image and otherwise use a photo of the same school. General Korea information
and living guides retain the existing monthly official-source schedule.

## Implementation

- `data/school-notice-entrypoints.json` pins 24 notice boards for the 22 school
  and campus sources. There is no recursive profile, sitemap or whole-site crawl
  in the school update path. Public JavaScript board links are converted to
  known article URL formats without executing the scripts.
- `research_sources.next_crawl_at_ms` persists deadlines. The one-time migration
  moves school deadlines to seven days after the previous scan, preserving all
  monthly deadlines. The school interval has a seven-day minimum.
- `research_school_seen` deduplicates canonical article URLs. Listing state
  stores ETag and Last-Modified headers for conditional requests. Only unseen
  recent articles, or newly appearing undated links on an initialized board,
  become research items with `content_kind=school-update`.
- `data/school-notice-baseline-20261020.json` records the current link lists read
  from official boards on 20 October. Migration initializes 23 successful boards
  so their existing undated posts will not be imported as new next week. The
  Kunjang listing failed to respond during this read and is left uninitialized;
  its first successful run accepts recent dated posts and establishes a baseline
  for older/undated ones. Errors remain visible in admin.
- Editing a new notice reads that article once, saves its snapshot, and reuses
  the snapshot for subsequent work. External fact expansion and deep university
  research are disabled for this path. Existing static school research items
  are excluded from the automatic editorial queue.
- Image order: article image; cached photo for the matching institution/campus;
  existing actual school photo; official school homepage image; named-school
  image search. Missing photos are retried no more often than weekly. An item
  without a usable same-school photo waits for review instead of receiving an
  unrelated generic image. Existing monthly editorial behavior is preserved.
- Admin shows the notice entrypoints, weekly interval and next due time.
  Manual checks remain an explicit immediate override of a source's deadline.

Railway setting: `RESEARCH_BOT_INTERVAL_MS=604800000`.

Validation scope: JavaScript syntax, EJS compilation, whitespace/diff review and
production configuration inspection. No test suite or full crawler run was
requested or executed for this change.
