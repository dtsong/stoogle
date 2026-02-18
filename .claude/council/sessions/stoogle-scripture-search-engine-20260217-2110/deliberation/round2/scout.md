# Scout — Round 2 Challenge Response

**Correction:** Original claim was partially overstated. CSE full-web search is closed to new customers (Jan 2026). The 50-domain site-search mode IS still available. But:
- Any new engine is limited to ≤50 domains (site search only)
- Existing full-web engines grandfathered until Jan 1, 2027
- Enterprise alternative: $15/1,000 req, $30k/mo minimum — not viable

**Revised recommendation:** Skip CSE entirely. Build on Typesense + Crawlee from day one.
- Typesense Cloud ~$7/mo or self-hosted on Hetzner ~$4.50/mo
- Typesense DocSearch scraper can collapse corpus pipeline to days
- API.Bible provides structured scripture data (2,900+ translations)
- Realistic solo-dev timeline: 3-4 weeks (not 2-3)
