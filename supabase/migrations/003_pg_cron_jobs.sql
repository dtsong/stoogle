-- Migration 003: pg_cron scheduled jobs
-- Note: pg_cron must be enabled via Supabase Dashboard > Database > Extensions
-- before running this migration.

-- ─────────────────────────────────────────────
-- search_logs: 90-day retention cleanup (runs daily at 02:00 UTC)
-- ─────────────────────────────────────────────
SELECT cron.schedule(
  'purge-old-search-logs',
  '0 2 * * *',
  $$
    DELETE FROM public.search_logs
    WHERE created_at < NOW() - INTERVAL '90 days'
  $$
);

-- ─────────────────────────────────────────────
-- crawl_pages: hard-delete soft-deleted rows after 7 days (runs daily at 03:00 UTC)
-- Complements the soft-delete lifecycle defined in Issue #40.
-- ─────────────────────────────────────────────
SELECT cron.schedule(
  'purge-deleted-crawl-pages',
  '0 3 * * *',
  $$
    DELETE FROM public.crawl_pages
    WHERE deleted_at IS NOT NULL
      AND deleted_at < NOW() - INTERVAL '7 days'
  $$
);
