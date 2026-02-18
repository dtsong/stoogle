# Architect — Round 1 Position

**Recommendation:** Next.js 15 (App Router) + Supabase (Postgres + Auth) + Google CSE via SearchAdapter pattern, deployed on Vercel.

## Key Points
- SearchAdapter interface abstracts CSE so it can be swapped for Meilisearch/Typesense later
- Server actions for mutations, route handlers for cached GETs
- Data model: sites, categories, site_categories (M2M), search_logs, with commented extension points for sermons
- CSE credentials stay server-side only — frontend never touches the API key
- Migration path: env var SEARCH_BACKEND switches adapter, zero-downtime swap
- $0/mo at MVP (Vercel free + Supabase free)
