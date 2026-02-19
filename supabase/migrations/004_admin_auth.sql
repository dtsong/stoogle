-- Migration 004: Admin auth support tables

-- Track failed login attempts for lockout enforcement (Issue #20)
CREATE TABLE public.admin_login_attempts (
  email           TEXT        PRIMARY KEY,
  failed_attempts INTEGER     NOT NULL DEFAULT 0,
  locked_until    TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER admin_login_attempts_updated_at
  BEFORE UPDATE ON public.admin_login_attempts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.admin_login_attempts ENABLE ROW LEVEL SECURITY;
-- No policies: server-only writes and reads through service_role.
