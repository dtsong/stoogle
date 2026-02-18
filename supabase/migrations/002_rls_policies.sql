-- Migration 002: Row Level Security policies
-- Strategy: service_role bypasses RLS automatically (used by all server actions).
-- Anon/authenticated clients have read-only access to public lookup tables.
-- All write operations go through server actions using the service_role key.

-- ─────────────────────────────────────────────
-- sites — public read, no client writes
-- ─────────────────────────────────────────────
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sites: public read"
  ON public.sites FOR SELECT
  TO anon, authenticated
  USING (true);

-- ─────────────────────────────────────────────
-- categories — public read, no client writes
-- ─────────────────────────────────────────────
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categories: public read"
  ON public.categories FOR SELECT
  TO anon, authenticated
  USING (true);

-- ─────────────────────────────────────────────
-- site_categories — public read, no client writes
-- ─────────────────────────────────────────────
ALTER TABLE public.site_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "site_categories: public read"
  ON public.site_categories FOR SELECT
  TO anon, authenticated
  USING (true);

-- ─────────────────────────────────────────────
-- crawl_queue — server-only (no client access)
-- ─────────────────────────────────────────────
ALTER TABLE public.crawl_queue ENABLE ROW LEVEL SECURITY;
-- No policies: anon/authenticated have zero access; service_role bypasses RLS.

-- ─────────────────────────────────────────────
-- crawl_pages — server-only (no client access)
-- ─────────────────────────────────────────────
ALTER TABLE public.crawl_pages ENABLE ROW LEVEL SECURITY;
-- No policies: anon/authenticated have zero access; service_role bypasses RLS.

-- ─────────────────────────────────────────────
-- search_logs — append-only from server actions (no client access)
-- ─────────────────────────────────────────────
ALTER TABLE public.search_logs ENABLE ROW LEVEL SECURITY;
-- No policies: all writes go through server actions with service_role.
