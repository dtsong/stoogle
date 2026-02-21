-- Migration 005: Analytics columns for click tracking
-- Issue #37 — extend search_logs for MVP success metrics

ALTER TABLE public.search_logs
  ADD COLUMN clicked_url     TEXT,
  ADD COLUMN click_position  INTEGER;
