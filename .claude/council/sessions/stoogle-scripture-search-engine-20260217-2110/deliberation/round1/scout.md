# Scout — Round 1 Position

**Recommendation:** Skip Google CSE entirely — it's closed to new customers and EOL Jan 2027. Build on Typesense self-hosted (~$5-6/mo on Hetzner) with Crawlee crawler from day one.

## Key Points
- CRITICAL: Google CSE is closed to new signups as of late 2024, EOL January 2027. Bing Custom Search retired Aug 2025.
- Typesense on Hetzner CX22 ($4.50/mo) handles the 50-site corpus easily (~2GB RAM needed)
- Crawlee (Node.js) for crawling — handles JS-rendered pages, free
- Next.js 15 recommended for frontend (ecosystem, future sermon pipeline)
- Supabase Auth or Clerk free tier for auth
- AssemblyAI cheapest managed transcription ($0.0025/min); self-hosted Whisper at scale
- Total MVP infra: ~$5-15/mo
- SearXNG is wrong architecture (metasearch, not curated corpus)
- Elasticsearch is gross overkill
- Lucia Auth in maintenance mode — avoid
