-- Migration 004: Soft-delete trigger for crawl_pages on site deactivation
-- When sites.is_active transitions to false, mark all crawl_pages for that
-- site with deleted_at = NOW() so the Typesense indexing pipeline skips them.

CREATE OR REPLACE FUNCTION public.soft_delete_crawl_pages_on_site_deactivation()
RETURNS TRIGGER AS $$
BEGIN
  -- Only act when is_active transitions true → false
  IF OLD.is_active = true AND NEW.is_active = false THEN
    UPDATE public.crawl_pages
    SET deleted_at = NOW()
    WHERE site_id = NEW.id
      AND deleted_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER site_deactivation_soft_delete
  AFTER UPDATE OF is_active ON public.sites
  FOR EACH ROW EXECUTE FUNCTION public.soft_delete_crawl_pages_on_site_deactivation();
