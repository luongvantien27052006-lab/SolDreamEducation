# Monthly guidance: living support and counseling only

On 20 October 2026 the user clarified that the yellow screenshot describes the
allowed subjects for the guidance bot, rather than an article formatting change.

Allowed subjects: practical support for foreign residents and multicultural
families, multilingual counseling/helplines, free Korean/online learning,
living-guide resources and videos, resident support benefits, health/safety and
health insurance support, and fraud/international marriage support services.

Monthly source domains are restricted to Danuri (`liveinkorea.kr`), Seoul Foreign
Portal (`global.seoul.go.kr`), NHIS (`nhis.or.kr`) and Incheon (`incheon.go.kr`).
Their existing monthly due dates are preserved. The 22 partner school/campus
sources retain their seven-day notice-only schedule and image policy.

`guidanceScope.js` contains the shared scope instruction, keywords and conservative
title-based content filter. It requires evidence of a support subject and rejects
scholarships, admissions/tuition, standalone visa procedures, recruitment,
administrative procurement, unrelated news and entertainment. Website keywords
and menus alone cannot establish the article's subject.

Both the domain policy and content filter apply to ingestion, old pending queue
selection, preparing drafts, processing existing AI Batch results and automatic
publication. Search/enrichment/editorial prompts carry the same scope. Eligible
monthly articles are assigned to `cam-nang-sinh-hoat`.

The one-time `living_support_guidance_scope_20261020_v1` migration disables other
non-school sources, updates monthly support keywords, and dismisses pending
out-of-scope items with a recorded reason. It preserves school settings and all
stored deadlines. It does not modify previously published articles or CMS edits.

Pre-change production backup: `/data/guide-service-scope-before-20261020.json`.
Validation is limited to syntax/template compilation and read-only inspection of
deployed configuration. No test suite or unscheduled crawler run is required.
