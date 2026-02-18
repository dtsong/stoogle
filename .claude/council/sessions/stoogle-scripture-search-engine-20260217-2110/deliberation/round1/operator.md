# Operator — Round 1 Position

**Recommendation:** Vercel (frontend) + Supabase (DB/auth). $0-12/mo at MVP. Cache CSE queries aggressively.

## Key Points
- Vercel free tier: zero-config Next.js deploy, preview URLs on every PR
- Supabase free tier: 500MB storage, 2GB BW, 50k MAU auth — more than enough
- CSE cost warning: at 500 searches/day, uncached = ~$60/mo (over budget). Cache + rate limit brings to $18-24/mo.
- UptimeRobot (free) for monitoring, Sentry (free) for error tracking
- Custom CSE quota dashboard in admin panel
- CI/CD: GitHub Actions free tier, lint/typecheck/test/e2e, staging env on Supabase free
- Database migrations via Supabase CLI — never manual ALTER TABLE
- Scaling triggers: >500/day → evaluate Brave Search API or self-hosted; >100k pageviews → Vercel Pro ($20/mo)
