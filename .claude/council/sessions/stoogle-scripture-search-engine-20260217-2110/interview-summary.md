# Interview Summary: Stoogle — Scripture Search Engine

## Core Intent
Build a modern, curated Christian content search engine inspired by the original Stoogle. MVP is a faithful recreation — search across ~50+ trusted ministry websites with category filters. Future phases add sermon audio transcription, outline extraction, passage citation highlighting, and potentially AI-powered summaries (with theological accuracy concerns acknowledged).

## Key Decisions Made
- MVP scope: Curated site search with category filters (Apologetics, Biblical Counseling, Creation, etc.)
- Search: Google CSE for MVP, but wants cost/effort analysis of own crawler for future
- Site list: Start with original ~50 sites, admin panel to add/remove/categorize
- Auth: Multi-admin (2-5 church leaders) with proper user accounts
- Audience: Church / small community (moderate traffic)
- Budget: $0-50/mo target, but wants "best tools" cost comparison
- Name: Stoogle (final)
- Sermon sources: Church website audio files (public), some YouTube
- Tech stack: Open to Council recommendations

## Open Questions for Deliberation
- Best tech stack recommendation for this scope + future growth (sermon processing, AI)
- Google CSE vs own crawler: cost analysis and migration path
- How to architect for the sermon processing pipeline without over-engineering the MVP
- Auth solution that's simple now but supports multi-admin
- Deployment strategy that fits the $0-50/mo budget while remaining scalable
- How to handle the theological accuracy concern for any future AI features

## Perspective Relevance Scores
| Perspective | Score (0-5) | Rationale |
|-------------|-------------|-----------|
| Architect | 5 | Core system design — search, data model, API, future extensibility |
| Advocate | 4 | User-facing search experience, category UX, admin panel design |
| Skeptic | 4 | Scope creep risk (MVP vs future), theological AI accuracy, dependency risks |
| Craftsman | 3 | Testing strategy, code quality, DX for a project that will grow in phases |
| Scout | 4 | Google CSE vs alternatives research, cost analysis, library evaluation |
| Strategist | 5 | MVP scoping, phased roadmap, cost-value analysis, prioritization |
| Operator | 4 | Deployment, hosting, cost optimization, monitoring for church budget |
| Chronicler | 2 | Documentation is important but not a driving concern for this idea |
| Guardian | 2 | Minimal PII (admin accounts only), low compliance needs |
| Tuner | 3 | Search performance, caching, but moderate traffic expectations |
| Alchemist | 3 | Future sermon processing pipeline, but deferred |
| Pathfinder | 1 | Web-only, no mobile/native component mentioned |
| Artisan | 3 | Clean, modern UI design for the search interface |
| Herald | 2 | Church community tool, not a growth product |
| Sentinel | 0 | No IoT/embedded component |
| Oracle | 3 | Future AI features, but explicitly deferred |
| Forge | 0 | No hardware/silicon component |
| Cipher | 0 | No cryptographic component |
| Warden | 0 | No kernel/OS security component |
| Prover | 0 | No formal verification needs |
