# Architect — Round 2 Challenge Response

**Revised architecture:** Typesense + Crawler replaces CSE. SearchAdapter pattern retained (abstracts Typesense, enables future swap).

**Crawler design:**
- Sitemap.xml first, BFS crawl as fallback
- Static sites (Cheerio) vs JS-rendered (Playwright) — defer Playwright for MVP
- Rate limit: 1 req/2sec per domain, respect robots.txt
- Incremental via content_hash + Last-Modified/ETag headers
- Weekly full re-crawl, daily incremental, 500 page cap per site

**New tables:** crawl_jobs (tracks crawl runs), crawl_pages (tracks every URL + content_hash + typesense_doc_id)

**Revised timeline:** 5 weeks realistic for solo dev (4 weeks if Playwright deferred, which it should be).

**Key non-negotiables:** content_hash for change detection, robots.txt compliance, SearchAdapter interface, crawl_jobs for operational visibility.
