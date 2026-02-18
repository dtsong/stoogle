# Skeptic — Round 1 Position

**Recommendation:** Lock down API key handling, admin auth, and output sanitization before launch. Hard gate on AI features until human editorial oversight is designed.

## Key Points
- XSS: Never interpolate raw query strings into innerHTML. CSP header with script-src 'self'.
- Rate limiting: 10-20 req/min per IP. Cache repeated queries (24h TTL).
- API key: CRITICAL — must be server-side only. Frontend calls /api/search, backend holds the key.
- Set hard spending cap in Google Cloud Console immediately.
- CSRF: SameSite=Lax cookies, CSRF tokens on admin mutations, Origin header verification.
- Bot protection: Cloudflare free tier before launch.
- Admin auth: magic links preferred over passwords for non-technical church leaders. Lockout after 5-10 failed attempts. 8hr session with 30-day remember-me.
- Account recovery: plan for "admin left the church" scenario. Printed recovery code in church safe.
- Curated site maintenance: quarterly review, Google Safe Browsing API checks, "report this result" button.
- AI theological risk: plausible heresy, false attribution, doctrinal conflicts without context.
- NON-NEGOTIABLE: AI summaries require human approval by a qualified reviewer before display. Not optional.
