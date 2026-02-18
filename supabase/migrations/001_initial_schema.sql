-- Migration 001: Initial schema
-- Stoogle — Phase 0 Foundation

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ─────────────────────────────────────────────
-- sites
-- ─────────────────────────────────────────────
CREATE TABLE public.sites (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  url         TEXT        NOT NULL UNIQUE,
  name        TEXT        NOT NULL,
  description TEXT,
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- categories
-- ─────────────────────────────────────────────
CREATE TABLE public.categories (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL UNIQUE,
  slug        TEXT        NOT NULL UNIQUE,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- site_categories (junction)
-- ─────────────────────────────────────────────
CREATE TABLE public.site_categories (
  site_id     UUID NOT NULL REFERENCES public.sites(id)      ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  PRIMARY KEY (site_id, category_id)
);

-- ─────────────────────────────────────────────
-- crawl_queue
-- ─────────────────────────────────────────────
CREATE TABLE public.crawl_queue (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id      UUID        NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  url          TEXT        NOT NULL,
  status       TEXT        NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  priority     INTEGER     NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  attempted_at TIMESTAMPTZ,
  error        TEXT,
  UNIQUE (site_id, url)
);

-- ─────────────────────────────────────────────
-- crawl_pages
-- ─────────────────────────────────────────────
CREATE TABLE public.crawl_pages (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id      UUID        NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  url          TEXT        NOT NULL,
  title        TEXT,
  content      TEXT,
  content_hash TEXT,
  typesense_id TEXT,
  crawled_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at   TIMESTAMPTZ DEFAULT NULL, -- soft-delete (Issue #40); pg_cron purges after 7 days
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (site_id, url)
);

CREATE INDEX idx_crawl_pages_deleted_at ON public.crawl_pages (deleted_at)
  WHERE deleted_at IS NOT NULL;

-- ─────────────────────────────────────────────
-- search_logs  (minimal PII — no IP, user-agent, session)
-- ─────────────────────────────────────────────
CREATE TABLE public.search_logs (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  query           TEXT        NOT NULL,
  result_count    INTEGER     NOT NULL DEFAULT 0,
  category_filter TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- updated_at trigger (sites, crawl_queue)
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sites_updated_at
  BEFORE UPDATE ON public.sites
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER crawl_queue_updated_at
  BEFORE UPDATE ON public.crawl_queue
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
