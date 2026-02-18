# Stoogle — Design Document

## Council Session: stoogle-scripture-search-engine-20260217-2110
**Agents:** Architect, Strategist, Scout, Advocate, Operator, Skeptic
**Date:** 2026-02-17

---

## 1. Vision

Stoogle is a curated Christian content search engine that indexes ~50 trusted ministry websites and makes them searchable through a clean, focused interface. It replaces the original Stoogle (which relied on Google CSE) with a modern, self-hosted search stack that the team fully controls.

**Core value proposition:** "Search trusted Christian resources" — one query, 50+ vetted sources, category-filtered results. No noise from the general web.

---

## 2. Tech Stack (Final)

| Layer | Choice | Cost |
|-------|--------|------|
| Frontend + API | Next.js 15 (App Router, RSC, Server Actions) | $0 (Vercel Hobby) |
| Database + Auth | Supabase (Postgres 15 + Auth + RLS) | $0 (Free tier) |
| Search Index | Typesense Cloud (Starter) | $10/mo |
| Crawler | Crawlee + Cheerio (Node.js) | $0 |
| Styling | Tailwind CSS + shadcn/ui | $0 |
| Search UI | react-instantsearch + typesense-instantsearch-adapter | $0 |
| Monitoring | Sentry (free) + BetterUptime (free) | $0 |
| **Total** | | **~$10/mo** |

**Why not Google CSE:** CSE full-web search is closed to new customers (Jan 2026). The 50-domain site-search mode is still available but building on a sunsetting platform is wasted effort. Typesense gives full control over indexing, ranking, and facets at comparable cost.

---

## 3. System Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Browser                          │
└───────────────────────┬─────────────────────────────┘
                        │ HTTPS
┌───────────────────────▼─────────────────────────────┐
│              Next.js 15 (Vercel)                    │
│                                                     │
│  /              Homepage (search bar)               │
│  /search        Results + facets                    │
│  /admin         Protected admin form                │
│  /api/search    Server Action → SearchAdapter       │
│  /api/crawl     Route Handler → crawl_queue upsert  │
│  /api/health    Synthetic search check              │
└──────────┬──────────────────────┬───────────────────┘
           │ SQL                  │ HTTP
┌──────────▼──────────┐  ┌───────▼────────────────────┐
│  Supabase (Postgres) │  │  Typesense Cloud           │
│                     │  │                             │
│  sites              │  │  Collection: pages          │
│  categories         │  │  Fields: url, title,        │
│  site_categories    │  │    content, site_name,      │
│  crawl_queue        │  │    category_slugs,          │
│  crawl_pages        │  │    site_weight              │
│  search_logs        │  │                             │
└──────────┬──────────┘  └─────────────────────────────┘
           │
┌──────────▼──────────────────────────────────────────┐
│         Crawlee Worker (Vercel Cron)                │
│                                                     │
│  1. Pull next pending domain from crawl_queue       │
│  2. Fetch sitemap.xml → enqueue URLs                │
│  3. Cheerio extract title + plain text body         │
│  4. SHA-256 content hash → skip if unchanged        │
│  5. Upsert crawl_pages + index into Typesense       │
└─────────────────────────────────────────────────────┘
```

---

## 4. Data Model

### sites
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| domain | text UNIQUE | e.g., "gty.org" |
| name | text | e.g., "Grace to You" |
| is_active | boolean | default true |
| js_render | boolean | default false (defer Playwright) |
| max_pages | int | default 500 |
| created_at | timestamptz | |

### categories
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| name | text UNIQUE | e.g., "Apologetics" |
| slug | text UNIQUE | e.g., "apologetics" |
| sort_order | int | |

### site_categories
| Column | Type | Notes |
|--------|------|-------|
| site_id | uuid FK | composite PK |
| category_id | uuid FK | composite PK |

### crawl_queue
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| site_id | uuid FK | |
| status | text | pending / running / done / failed |
| triggered_by | text | scheduler / admin |
| started_at | timestamptz | |
| completed_at | timestamptz | |
| pages_indexed | int | |
| error_message | text | |

### crawl_pages
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| site_id | uuid FK | |
| url | text UNIQUE | |
| title | text | |
| content_hash | text | SHA-256 for change detection |
| last_crawled_at | timestamptz | |
| typesense_id | text | links to Typesense doc |
| http_status | smallint | |

### search_logs
| Column | Type | Notes |
|--------|------|-------|
| id | bigint IDENTITY | append-only |
| query | text | |
| result_count | int | |
| category_filter | text | |
| created_at | timestamptz | |

### Typesense Collection: `pages`
| Field | Type | Facet | Notes |
|-------|------|-------|-------|
| id | string | | matches crawl_pages.typesense_id |
| url | string | | |
| title | string | | weight: high |
| content | string | | weight: normal |
| site_name | string | yes | facet for source filtering |
| site_domain | string | | |
| category_slugs | string[] | yes | facet for category filtering |
| site_weight | int32 | | reserved for fairness tuning |

---

## 5. Key Design Decisions

### Search: SearchAdapter Interface
All search calls go through a `SearchAdapter` interface. MVP implementation wraps Typesense. Enables future swap to Meilisearch/Algolia without touching application code.

### Crawler: Sitemap-First, Cheerio-Only
1. Fetch `sitemap.xml` / `robots.txt` for URL discovery
2. BFS crawl from homepage as fallback
3. Cheerio for HTML parsing (no Playwright at MVP — most ministry sites are WordPress/server-rendered)
4. Rate limit: 1 req/2sec per domain, respect `robots.txt`
5. Content hash for incremental updates
6. 500 page cap per site
7. Weekly full re-crawl via Vercel Cron (per-domain chunks to fit 60s limit)

### Security: Plain Text Indexing
- All crawled HTML is stripped to plain text before storage and indexing
- Typesense admin key is server-side only (never in `NEXT_PUBLIC_*`)
- Search goes through `/api/search` server action (no client-side Typesense key at MVP)
- Crawl targets are from the `sites` table only (no free-form URL input)
- Admin panel protected by Supabase Auth with rate-limited login

### UX: Post-Search Facets
- Homepage: centered search bar, no clutter
- Results: card list with facet filters appearing after search (source, category)
- Result cards: title → snippet → source name + domain
- Result count always visible: "42 results for 'grace'"
- Minimal report button (flag icon → email to admin)
- Mobile: sticky search bar, 44px touch targets, single column

### Admin Panel: Simple Web Form
- Password-protected via Supabase Auth
- Domain textarea (one per line) for managing the curated site list
- Category assignment per site
- "Re-crawl" trigger button
- "Test Search" link to verify the index

---

## 6. Phased Roadmap

### Phase 0 — Foundation (Week 1)
- Next.js project scaffold + Supabase setup + Typesense Cloud instance
- Database schema + seed data (10 sites, 6 categories)
- Crawlee crawler for 10 sites, validate index quality
- SearchAdapter + Typesense integration

**Go/no-go:** Can we crawl 10 sources and return relevant results for 5 test queries?

### Phase 1 — Core Loop (Weeks 2-3)
- Expand crawler to 50 sites
- Search UI: react-instantsearch with facets
- Result cards, empty states, loading skeletons
- Admin form (auth + domain management + crawl trigger)
- Basic relevance tuning (field weights, typo tolerance)

**Go/no-go:** Zero-results rate <15% on 20-query benchmark. 3+ non-dev users find useful results.

### Phase 2 — Harden + Soft Launch (Week 4)
- Security hardening (CSP, rate limiting, content sanitization audit)
- Monitoring setup (Sentry, BetterUptime, /api/health/search)
- CI/CD pipeline (lint, typecheck, tests, schema validation)
- Soft launch to 10-20 church members

**Go/no-go:** No P0 bugs in 48 hours. Bounce rate <70%.

### Phase 3 — Public Launch (Week 5+)
- Public announcement
- Monitor metrics: zero-results rate, search-to-click, return visits
- Address top 3 user-reported issues

### Future Phases (Conditional)
- **V1.1:** Rich admin table UI, crawl scheduling, analytics dashboard
- **V2:** Sermon audio transcription (AssemblyAI or self-hosted Whisper)
- **V3:** AI summaries with mandatory human theological review gate

---

## 7. Success Metrics

| Metric | Target | Timeframe |
|--------|--------|-----------|
| Zero-results rate | <15% | Week 4+ |
| Search-to-click rate | >40% | Week 4+ |
| Return visits (7-day) | >25% of users | Month 1 |
| Weekly active queries | 100+ | Month 1 |
| Monthly infrastructure cost | <$15 | Ongoing |

---

## 8. Risks and Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Crawl quality inconsistent across sites | High | Start with 10 well-structured sites; QA query set before expanding |
| Typesense relevance needs tuning | Medium | Timebox to 8 hours; ship "good enough"; tune with real query logs |
| Crawlee blocked by ministry sites | Medium | Respect robots.txt; polite delays; fall back to manual curation |
| Index poisoning from compromised site | High | Strip HTML to plain text on ingest; render as text only |
| Scope creep to AI features | Medium | Hard phase gates; AI features require human theological review design |
| Ministry site changes domain or goes down | Medium | Quarterly site review; report button for community feedback |

---

## 9. Security Checklist (Launch)

1. Typesense admin key never in client bundle
2. Crawled content sanitized to plain text before indexing
3. Search query length capped at 200 chars server-side
4. Crawl targets restricted to `sites` table (no free-form URLs)
5. Admin auth with rate-limited login (5 attempts → 15min lockout)
6. Search results rendered as text (no dangerouslySetInnerHTML)
7. Crawler respects robots.txt with per-domain rate limits
