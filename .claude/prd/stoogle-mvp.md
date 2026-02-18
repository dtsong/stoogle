# PRD: Stoogle MVP — Curated Christian Content Search Engine

**Version:** 1.0
**Date:** 2026-02-17
**Council Session:** stoogle-scripture-search-engine-20260217-2110
**Status:** Approved

---

## 1. Problem Statement

Christians researching theology, apologetics, and biblical counseling currently rely on general-purpose search engines that mix trusted ministry content with unvetted sources. The original Stoogle solved this by curating ~50 trusted sites behind a Google CSE, but CSE is no longer viable for new projects. A modern, self-hosted replacement is needed.

## 2. Solution

Stoogle is a curated search engine that indexes ~50 trusted Christian ministry websites and makes them searchable through a clean, focused interface. It uses Typesense for full-text search, Crawlee for site ingestion, and a simple admin panel for church leaders to manage the curated list.

## 3. Target Users

- **Primary:** Church members seeking trusted theological content (public, unauthenticated)
- **Secondary:** Church leaders/admins managing the curated site list (2-5 authenticated users)

## 4. Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend + API | Next.js 15 (App Router) |
| Database + Auth | Supabase (Postgres + Auth) |
| Search | Typesense Cloud |
| Crawler | Crawlee + Cheerio |
| Styling | Tailwind CSS + shadcn/ui |
| Search UI | react-instantsearch + typesense-instantsearch-adapter |
| Hosting | Vercel (free) + Typesense Cloud ($10/mo) |

---

## 5. Features & Acceptance Criteria

### F1: Public Search

**Description:** Users can search across all indexed ministry sites from a single search bar.

**Acceptance Criteria:**
- [ ] Homepage displays a centered search bar with placeholder text "Search sermons, theology, apologetics..."
- [ ] Submitting a query returns results from Typesense within 500ms (p95)
- [ ] Results display: title, snippet (with matched keywords bolded), source site name, URL
- [ ] Result count is always visible: "N results for 'query'"
- [ ] Empty state shows a helpful message when no results are found
- [ ] Search queries are logged to `search_logs` table (query, result_count, timestamp)
- [ ] Query input is capped at 200 characters server-side
- [ ] All search requests go through a server action (no client-side Typesense key)

### F2: Category Faceted Filtering

**Description:** After searching, users can filter results by source site and category.

**Acceptance Criteria:**
- [ ] Facets appear after search results load (post-search, not pre-search)
- [ ] Available facets: source site name, category (Apologetics, Biblical Counseling, etc.)
- [ ] Selecting a facet immediately filters results and updates the result count
- [ ] Active filters shown as removable chips
- [ ] Facets with zero matches are hidden (not greyed out)
- [ ] On mobile: facets collapse behind a "Filter" button that opens a bottom sheet

### F3: Curated Site Crawler

**Description:** A crawler indexes content from the curated site list into Typesense.

**Acceptance Criteria:**
- [ ] Crawler discovers pages via sitemap.xml first, BFS crawl as fallback
- [ ] HTML content is stripped to plain text before indexing (no raw HTML stored)
- [ ] Content hash (SHA-256) stored per page; unchanged pages skipped on re-crawl
- [ ] Crawler respects robots.txt and rate limits (1 req/2sec per domain)
- [ ] Page cap: 500 pages per site maximum
- [ ] Crawler runs as Vercel Cron (weekly, per-domain chunks within 60s limit)
- [ ] Crawl status tracked in `crawl_queue` table (pending/running/done/failed)
- [ ] User-Agent header identifies Stoogle: `Stoogle/1.0 (curated scripture search)`

### F4: Admin Panel — Site Management

**Description:** Authenticated church leaders can manage the curated site list.

**Acceptance Criteria:**
- [ ] Admin page is protected by Supabase Auth (email/password or magic link)
- [ ] Login rate-limited: 5 failed attempts → 15-minute lockout
- [ ] Admin can view list of all curated sites with their categories
- [ ] Admin can add a new site (domain + name + category assignment)
- [ ] Admin can remove a site from the curated list
- [ ] Admin can trigger a manual re-crawl for a specific site
- [ ] "Test Search" link opens public search in new tab
- [ ] Changes to the site list take effect on next crawl cycle

### F5: Result Reporting

**Description:** Users can flag problematic search results.

**Acceptance Criteria:**
- [ ] Each result card has a small flag icon (low opacity, non-intrusive)
- [ ] Clicking the flag shows a dropdown: Inappropriate / Broken Link / Other
- [ ] Submitting a report sends an email to the admin address
- [ ] Toast notification confirms: "Report sent. Thank you."
- [ ] No moderation queue UI at MVP (email-only workflow)

### F6: Mobile Experience

**Description:** The search interface works well on mobile devices.

**Acceptance Criteria:**
- [ ] Search bar is sticky at top during scroll
- [ ] All interactive elements have minimum 44x44px touch targets
- [ ] Results display in single-column layout on mobile
- [ ] Input font size ≥16px (prevents iOS auto-zoom)
- [ ] Loading state uses static skeleton cards (no spinner)
- [ ] Facets accessible via "Filter" button → bottom sheet

### F7: Health Monitoring

**Description:** Basic monitoring ensures the search engine is operational.

**Acceptance Criteria:**
- [ ] `/api/health/search` endpoint runs a known query and returns 200/503
- [ ] BetterUptime pings the health endpoint every 5 minutes
- [ ] Sentry captures search-related errors with `component: 'search'` tag
- [ ] Crawl success/failure logged to `crawl_queue` table

---

## 6. Security Requirements

| # | Requirement | Priority |
|---|------------|----------|
| S1 | Typesense admin key never appears in client bundle or `NEXT_PUBLIC_*` vars | Critical |
| S2 | All crawled content sanitized to plain text before Typesense indexing | Critical |
| S3 | Search query input validated and length-capped (200 chars) server-side | High |
| S4 | Crawl targets restricted to `sites` table entries only | High |
| S5 | Admin auth rate-limited (5 attempts → 15min lockout) | High |
| S6 | Search results rendered as text only (no dangerouslySetInnerHTML) | High |
| S7 | Crawler respects robots.txt with per-domain rate limits | Medium |

---

## 7. Data Model

### Supabase (Postgres)

```
sites (id, domain, name, is_active, js_render, max_pages, created_at)
categories (id, name, slug, sort_order)
site_categories (site_id FK, category_id FK) [composite PK]
crawl_queue (id, site_id FK, status, triggered_by, started_at, completed_at, pages_indexed, error_message)
crawl_pages (id, site_id FK, url UNIQUE, title, content_hash, last_crawled_at, typesense_id, http_status)
search_logs (id, query, result_count, category_filter, created_at)
```

### Typesense Collection: `pages`

```
id: string
url: string
title: string (weight: high)
content: string (weight: normal)
site_name: string (facet)
site_domain: string
category_slugs: string[] (facet)
site_weight: int32 (reserved for future fairness tuning)
```

---

## 8. Implementation Plan

### Phase 0 — Foundation (Week 1, ~40 hrs)

| Task | Description |
|------|------------|
| T01 | Initialize Next.js 15 project with App Router, Tailwind, shadcn/ui |
| T02 | Set up Supabase project (free tier) + create database schema |
| T03 | Seed initial data: 10 sites, 6 categories, site_categories |
| T04 | Set up Typesense Cloud instance + create `pages` collection with schema |
| T05 | Implement SearchAdapter interface + TypesenseAdapter |
| T06 | Build Crawlee crawler: sitemap discovery + Cheerio extraction + plain text sanitization |
| T07 | Crawler → Typesense indexing pipeline: extract, hash, upsert |
| T08 | Validate: crawl 10 sites, run 5 test queries, verify relevance |

**Gate:** Crawl 10 sources cleanly. Return relevant results for 5 benchmark queries.

### Phase 1 — Core Loop (Weeks 2-3, ~60 hrs)

| Task | Description |
|------|------------|
| T09 | Expand site list to 50 sites with category assignments |
| T10 | Build homepage: centered search bar component |
| T11 | Build search results page: react-instantsearch + Typesense adapter |
| T12 | Implement faceted filtering (source site, category) |
| T13 | Build result card component (title, snippet, source, flag icon) |
| T14 | Implement search server action with logging |
| T15 | Build admin page: Supabase Auth login |
| T16 | Build admin site management form (add/remove sites, category assignment) |
| T17 | Admin re-crawl trigger button |
| T18 | Relevance tuning: field weights, typo tolerance settings |
| T19 | Empty states, error states, loading skeletons |

**Gate:** Zero-results rate <15% on 20-query benchmark. 3+ non-dev users find useful results.

### Phase 2 — Harden + Soft Launch (Week 4, ~30 hrs)

| Task | Description |
|------|------------|
| T20 | Security audit: CSP headers, input validation, sanitization verification |
| T21 | Implement report flag (icon → dropdown → email) |
| T22 | Set up Vercel Cron for weekly crawl (per-domain chunks) |
| T23 | Build /api/health/search synthetic check |
| T24 | Configure Sentry error tracking |
| T25 | Configure BetterUptime monitoring |
| T26 | CI/CD: GitHub Actions (lint, typecheck, tests, Typesense schema validation) |
| T27 | Mobile polish: sticky search, touch targets, responsive layout |
| T28 | Soft launch to 10-20 church members |

**Gate:** No P0 bugs in 48 hours. Bounce rate <70%.

### Phase 3 — Public Launch (Week 5+)

| Task | Description |
|------|------------|
| T29 | Public deployment + announcement |
| T30 | Monitor metrics: zero-results, search-to-click, return visits |
| T31 | Address top 3 user-reported issues |

---

## 9. Success Metrics

| Metric | Target | Timeframe |
|--------|--------|-----------|
| Zero-results rate | <15% | Week 4+ |
| Search-to-click rate | >40% | Week 4+ |
| Return visits (7-day) | >25% of users | Month 1 |
| Weekly active queries | 100+ | Month 1 |
| Monthly infrastructure cost | <$15 | Ongoing |

---

## 10. Out of Scope (Future Phases)

- User accounts, saved searches, search history
- AI-generated summaries (requires human theological review gate)
- Sermon audio transcription pipeline
- Rich admin dashboard (table view, bulk operations, analytics)
- Playwright support for JS-rendered sites
- Multi-language / transliteration support
- Mobile app / PWA

---

## 11. Curated Site List (Initial 50)

### Apologetics
- carm.org (CARM)
- str.org (Stand to Reason)
- reasonablefaith.org (William Lane Craig)
- coldcasechristianity.com (J. Warner Wallace)
- crossexamined.org (Frank Turek)
- bethinking.org
- apologetics315.com

### Biblical Counseling
- ccef.org (CCEF)
- biblicalcounseling.com (ACBC/NANC)
- peacemaker.net (Peacemaker Ministries)
- ibcd.org

### Creation & Origins
- answersingenesis.org
- creation.com
- icr.org (Institute for Creation Research)

### John MacArthur / TMS
- gty.org (Grace to You)
- tms.edu (The Master's Seminary)
- tmu.edu (The Master's University)

### Albert Mohler / SBTS
- albertmohler.com
- sbts.edu (Southern Baptist Theological Seminary)
- equip.sbts.edu

### General Ministry
- desiringgod.org (Desiring God / John Piper)
- thegospelcoalition.org
- 9marks.org
- ligonier.org (Ligonier Ministries / R.C. Sproul)
- monergism.com
- reformedwiki.com
- biblehub.com
- blueletterbible.org
- gotquestions.org
- christianitytoday.com
- thirdmill.org
- reformationproject.org
- logos.com/grow
- biblegateway.com
- openbible.info
- biblestudytools.com
- crossway.org
- banneroftruth.org
- challies.com (Tim Challies)
- tabletalkmagazine.com
- reformation21.org
- founders.org
- aomin.org (Alpha and Omega Ministries)
- triablogue.blogspot.com
- prbible.org
- gracebible.org
- sermonaudio.com
- heartcrymissionary.com
- gbc.org (Grace Bible Church)
- capitolhillbaptist.org
- bethlehembaptistchurch.org

*Note: This list should be reviewed and adjusted by church leadership before launch. Some sites may need to be swapped based on the specific theological alignment of the church community.*

---

## 12. Acceptance Contract

This PRD is considered complete when:
1. All F1-F7 acceptance criteria pass
2. All S1-S7 security requirements are verified
3. Phase 0-2 gate criteria are met
4. MVP success metrics are being tracked
5. Soft launch group (10-20 users) has been onboarded
