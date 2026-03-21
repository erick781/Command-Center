# COORDINATION FILE - Claude Cowork <-> Codex
# Last updated: 2026-03-21
# Read this file before editing shared files.

## LIVE STATUS
- V2 Next.js app is live on `app.partenaire.io` through `command-center-v2.service` on port `3001`
- V1 backup is available at `/v1/` and static files live in `/var/www/ads-intel-v1-backup/`
- Backend FastAPI is still live on port `8080`
- Ads refresh service is still live on port `8099`
- OpenRouter fallback is deployed in V2 and Anthropic remains primary
- `n8n` is still running on the VPS as Docker container `n8n-9m9r-n8n-1` on host port `32768`
- `n8n` is not currently wired into the Command Center app flow
- `/api/strategy-engine/*` now routes correctly through Nginx to Next.js on port `3001`
- Strategy Engine phase 1 MVP is deployed, but the new Supabase tables are not applied yet
- While those new tables are missing, the Strategy Engine now falls back safely to `strategy_drafts` compatibility storage instead of crashing

## CURRENT PRIORITIES
1. Validate the live `/strategie` flow with a real authenticated session
2. Apply the missing Supabase migrations for `strategy_profiles`, `strategy_requests`, `strategy_source_context`, and upgraded `strategy_outputs`
3. Verify live admin CRUD behavior with a real admin session
4. Decide when to retire or reduce the legacy `strategy-sync` path after SQL-backed strategy memory is proven
5. Continue UX polish only after the authenticated strategy flow is confirmed

## RECENT CODEX CHANGES
- Deployed OpenRouter fallback for AI requests in `src/lib/ai.ts`
- Kept Anthropic primary and OpenRouter fallback in production
- Upgraded `src/app/hub/page.tsx` to feel much closer to the V1 command center
- Upgraded `src/app/tracker/page.tsx` from placeholder KPIs to a real operations dashboard
- Upgraded `src/app/rapports/page.tsx` into a fuller reporting workspace
- Reworked `src/app/clients/page.tsx` into a safer list/detail flow backed by the real client detail endpoint
- Rebuilt `src/app/strategie/page.tsx` into the new Strategy Engine MVP flow backed by Next routes under `src/app/api/strategy-engine/`
- Added Next-side strategy orchestration under `src/lib/strategy-*.ts` for overlays, missing-context logic, prompt assembly, normalization, and persistence
- Added reusable Strategy Engine UI components under `src/components/strategy/`
- Added `supabase/migrations/20260321_strategy_memory.sql`
- Added `supabase/migrations/20260321_strategy_engine_mvp.sql`
- Added `supabase/migrations/20260321_strategy_engine_source_context_fix.sql`
- Added a compatibility fallback in `src/lib/strategy-store.ts` so the Strategy Engine uses `strategy_drafts` when the new strategy tables are missing
- Hardened that compatibility fallback so it still works if the live `strategy_drafts` table is on an older schema without `owner_user_id`
- Fixed Strategy Engine server-to-server integration so it uses the configured app/API base instead of assuming all internal routes live on port `3001`
- Hardened `src/app/api/chat/route.ts` and `src/app/api/recommendations/route.ts` so malformed payloads return clean `400` responses instead of hitting the AI layer
- Tightened the shared shell in `src/components/nav.tsx` and `src/app/layout.tsx`
- Renamed `src/middleware.ts` to `src/proxy.ts` for Next 16 compatibility
- Synced changes to the VPS, built successfully, restarted `command-center-v2.service`, and verified live `/api/strategy-engine/*` routing through Nginx

## FILE OWNERSHIP / TOUCH WITH CARE
- Codex recently touched:
  - `src/lib/ai.ts`
  - `src/app/hub/page.tsx`
  - `src/app/clients/page.tsx`
  - `src/app/strategie/page.tsx`
  - `src/app/admin/page.tsx`
  - `src/app/strategy-sync/route.ts`
  - `src/app/tracker/page.tsx`
  - `src/app/rapports/page.tsx`
  - `src/app/api/strategy-engine/context/route.ts`
  - `src/app/api/strategy-engine/profile/route.ts`
  - `src/app/api/strategy-engine/request/route.ts`
  - `src/app/api/strategy-engine/generate/route.ts`
  - `src/app/api/strategy-engine/history/route.ts`
  - `src/lib/strategy-draft.ts`
  - `src/lib/strategy-rules.ts`
  - `src/lib/strategy-storage.ts`
  - `src/lib/strategy-schema.ts`
  - `src/lib/strategy-overlays.ts`
  - `src/lib/strategy-missing-context.ts`
  - `src/lib/strategy-prompt-builder.ts`
  - `src/lib/strategy-normalizer.ts`
  - `src/lib/strategy-store.ts`
  - `src/lib/supabase-server.ts`
  - `supabase/migrations/20260321_strategy_memory.sql`
  - `supabase/migrations/20260321_strategy_engine_mvp.sql`
  - `supabase/migrations/20260321_strategy_engine_source_context_fix.sql`
  - `src/app/api/chat/route.ts`
  - `src/app/api/recommendations/route.ts`
  - `src/components/nav.tsx`
  - `src/app/layout.tsx`
  - `src/proxy.ts`
- Claude safe next focus:
  - validate the live authenticated Strategy Engine flow with a real user session
  - apply or supervise the missing Supabase migrations if credentials are available
  - verify admin page live behavior with a real admin session
  - continue UI polish only after runtime strategy validation
- If either agent needs to edit a file in the "recently touched" list, reread this file and note the reason first.

## WHAT CLAUDE COWORK BUILT
- Initial V2 foundation in Next.js
- `src/app/hub/page.tsx` - initial hub with agent cards and ideas form connected to Supabase
- `src/app/clients/page.tsx` - client list + detail view + strategies + cacher
- `src/app/strategie/page.tsx` - initial strategy generator with client dropdown + context auto-pull
- `src/app/rapports/page.tsx` - initial reports flow with AI recommendations
- `src/app/tracker/page.tsx` - initial tracker KPI page
- `src/app/admin/page.tsx` - admin connected to Supabase `user_roles`
- `src/app/login/page.tsx` - Supabase auth login
- `src/components/nav.tsx` - initial nav shell with logo and mobile menu
- `src/lib/supabase.ts` - Supabase browser client
- `src/app/globals.css` - V1 design system tokens and background system

## WHAT CODEX IS WORKING ON
- Keeping a shared coordination and handoff layer with Claude through this file
- Protecting and shipping V1 parity improvements without breaking Claude's base work
- Keeping the Strategy Engine phase 1 usable in production even before the new SQL tables are migrated
- Preparing the next storage cut so the app can move cleanly from compatibility memory to fully normalized strategy tables
- Keeping `n8n` available for background automations only

## COLLABORATION PROTOCOL
1. Read this file before editing shared areas.
2. Before major edits, note the exact files you plan to touch under "CURRENT WORK".
3. After shipping work, update "RECENT CODEX CHANGES" with the file paths touched and what changed.
4. Do not silently overwrite work in files listed under "TOUCH WITH CARE".
5. Prefer page-by-page parity and runtime validation over broad rewrites.
6. Keep `n8n` for background automations, not for the live chat or streaming AI path.

## CURRENT WORK
- Codex:
  - coordinating shared state
  - V1 parity pass shipped for hub / tracker / rapports / shell
  - clients and strategie hardening shipped and live
  - admin V2 parity pass shipped in `src/app/admin/page.tsx`
  - AI route validation shipped in `src/app/api/chat/route.ts` and `src/app/api/recommendations/route.ts`
  - Strategy Engine phase 1 MVP shipped in:
    - `src/app/strategie/page.tsx`
    - `src/app/api/strategy-engine/context/route.ts`
    - `src/app/api/strategy-engine/profile/route.ts`
    - `src/app/api/strategy-engine/request/route.ts`
    - `src/app/api/strategy-engine/generate/route.ts`
    - `src/app/api/strategy-engine/history/route.ts`
    - `src/components/strategy/`
    - `src/lib/strategy-schema.ts`
    - `src/lib/strategy-overlays.ts`
    - `src/lib/strategy-missing-context.ts`
    - `src/lib/strategy-prompt-builder.ts`
    - `src/lib/strategy-normalizer.ts`
    - `src/lib/strategy-store.ts`
    - `src/lib/supabase-server.ts`
    - `supabase/migrations/20260321_strategy_engine_mvp.sql`
    - `supabase/migrations/20260321_strategy_engine_source_context_fix.sql`
  - compatibility storage still maintained in:
    - `src/app/strategy-sync/route.ts`
    - `src/lib/strategy-draft.ts`
    - `src/lib/strategy-rules.ts`
    - `src/lib/strategy-storage.ts`
    - `supabase/migrations/20260321_strategy_memory.sql`
- Claude Cowork:
  - best next tasks are validating the authenticated strategy flow, applying migrations if access exists, or validating admin behavior

## ENV VARS (.env.local)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_API_URL=https://app.partenaire.io`
- `INTERNAL_API_BASE_URL=`
- `NEXT_PUBLIC_STRATEGY_STORAGE_BACKEND=server-file`
- `ANTHROPIC_API_KEY`
- `OPENROUTER_API_KEY`
- `AI_PROVIDER_ORDER=anthropic,openrouter`
- `OPENROUTER_CHAT_MODEL=openrouter/auto`
- `OPENROUTER_RECOMMENDATIONS_MODEL=openrouter/auto`

## BACKEND API ENDPOINTS
- `GET /api/client-hub/clients` - list all clients
- `GET /api/client-hub/clients/{id}` - client detail
- `PATCH /api/client-hub/clients/{id}/visibility` - toggle hide
- `GET /api/client-hub/stats` - dashboard stats
- `POST /api/strategy/generate` - FastAPI strategy generation
- `GET /api/strategy/export-docx/{name}` - download DOCX
- `GET /api/strategy/past/{name}` - past strategies
- `GET /api/reports/clients` - report client list
- `POST /api/brainstorm` - brainstorm chat
- `POST /api/chat` - V2 streaming AI route
- `POST /api/recommendations` - V2 streaming recommendations route
- `GET /api/strategy-engine/context` - load Strategy Engine context
- `POST /api/strategy-engine/profile` - save strategy profile
- `POST /api/strategy-engine/request` - save strategy request
- `POST /api/strategy-engine/generate` - generate structured strategy
- `GET /api/strategy-engine/history` - load strategy history
- `GET/POST /strategy-sync` - legacy authenticated strategy memory sync

## NGINX ROUTING
- `/` -> port `3001` (Next.js V2)
- `/api/chat`, `/api/recommendations`, `/api/strategy-engine/` -> port `3001` (Next.js)
- `/api/client-hub/`, `/api/strategy/`, `/api/reports/`, `/api/integrations/`, `/api/brainstorm` -> port `8080` (FastAPI)
- `/api/` catch-all -> port `8099` (ads refresh)
- `/v1/` -> `/var/www/ads-intel-v1-backup/` (static V1)

## DESIGN SYSTEM
- Background: `#111113`
- Cards: `#1a1a1f`
- Accent: `#E8912D`
- Text: white with layered opacity
- Grid: `rgba(246,70,8,0.03)` lines
- Glow: radial-gradient `rgba(246,70,8,0.06)`
- Font: `Montserrat`
- Card hover: `translateY(-2px)` + orange border glow

## STRATEGY MODULE NOTE
- `/strategie` is now a true phase 1 Strategy Engine flow, not only the old flat generator UI
- The page now uses:
  - persistent profile state
  - request context state
  - missing-context evaluation
  - structured output rendering
  - server-backed history
- Generation still relies on the existing FastAPI strategy generator for now
- The normalized Supabase strategy tables are not applied yet
- Until they are applied, the Strategy Engine falls back to `strategy_drafts` compatibility storage through server logic
- Build it in phases:
  - phase 1: persistent profile + request context + missing-context logic + structured output + history
  - phase 2: KPI overlays + niche/business model/stage overlays + approval flow
  - phase 3: task conversion + `n8n` background automation + agency memory loop

## KNOWN TECH NOTES
- `src/proxy.ts` is now the active auth/proxy file for Next 16
- Public Nginx routing for `/api/strategy-engine/*` is fixed and live
- `strategy_profiles`, `strategy_requests`, `strategy_source_context`, and upgraded `strategy_outputs` still need migration
- Existing `strategy_drafts` exists in Supabase and is the current compatibility fallback
- The live `strategy_drafts` schema may still be older than the local migration draft, so compatibility code must stay tolerant of missing columns like `owner_user_id`
- There is still a non-blocking build warning tied to `src/app/strategy-sync/route.ts` because it uses `fs/path`
- No Supabase service-role key or DB connection string was found on the server during this pass
- Full end-to-end validation still needs a real authenticated session

[2026-03-21 11:00] [COWORK] [strategie, rapports, hub] Applied Erick's design rules on top of Codex's code: orange only (violet→orange in hub), French text (no dev notes as titles), premium copy. No logic or API changes — styling/copy only.

[2026-03-21 16:00] [COWORK] [strategie/page.tsx] HYBRID APPROACH: Wizard now uses BOTH backends:
- Codex's /api/strategy-engine/* for profile storage, context evaluation, readiness check, history
- FastAPI /api/strategy/generate for actual strategy generation (preserves Erick's 6-phase methodology)
- Output displays in 7 collapsible phase cards (Audit, Research, Strategy, Build, Launch, Scale, KPIs)
- DOCX export via /api/strategy/export-docx/{client}
- Fire-and-forget to Codex engine for Supabase persistence
- Codex history entries still render in their original format

STRATEGY GENERATION PHILOSOPHY (from Erick):
- The 6-phase structure (Audit, Research, Strategy, Build, Launch, Scale) + KPIs is the backbone
- It adapts per niche/industry (e-commerce, coaching, service local, SaaS, info-produit) but structure stays the same
- Simple, flexible, scalable
- If Codex wants to improve the generation, he should enhance the FastAPI strategy_api.py prompts, NOT replace the 6-phase format
- The Strategy Engine context/profile/evaluation layer from Codex is good — keep and improve it
- DOCX template must stay branded and professional

NEXT STEPS:
- Consider having Codex's engine feed enriched context INTO the FastAPI generation call for better output
- The wizard collects more structured data now (profile, objectives, constraints) — feed ALL of it to FastAPI
- Eventually, Codex can upgrade FastAPI's prompts to use his confidence scoring while keeping 6 phases
