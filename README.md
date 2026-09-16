# Student Opportunity Intelligence Platform — Reference Implementation

A working, verified implementation of the architecture blueprint: **Next.js**
frontend, **Express/TypeScript** API, an AI pipeline behind a provider-agnostic
**Model Router** (DeepSeek / Grok / deterministic Mock), a **Prisma** data
layer (SQLite for zero-infra dev; PostgreSQL/Supabase for production), and a
queue abstraction with two drivers — **BullMQ/Redis** (production) or an
**in-process memory driver** (zero-infra dev) — tying the
discovery → extraction → dedup → verification → admin-review → publish
pipeline together.

It runs **out of the box with zero API keys and zero infrastructure** — the
AI layer defaults to a deterministic mock provider and queues run in-process.

## Layout

```
apps/
  web/         Next.js 14 frontend (student app, admin panel, assistant widget)
  api/         Express/TypeScript API (auth, students, competitions, admin,
               applications, achievements, reports, assistant, notifications)
  ai-worker/   Thin BullMQ entrypoint (all agent logic lives in @sop/shared)
packages/
  db/          Prisma schema (system of record) + seed script
  shared/      Deterministic core + AI pipeline:
               matching.ts        deterministic match score + explanations
               eligibility.ts     ELIGIBLE / NOT_ELIGIBLE / UNCERTAIN engine
               dedup.ts           title/URL similarity for duplicate detection
               ai.ts              untrusted-AI-output validation + repair
               router.ts          Model Router: retry, timeout, fallback, AiRun logs
               providers/         DeepSeek, Grok, Mock
               crawler.ts         polite fetch: robots.txt, rate limits, size caps
               agents/            discovery, extraction, eligibility, dedup,
                                  verification, assistant, notifications
               queues.ts          queue driver abstraction (redis | memory)
```

## Quick start (zero infra)

Requires Node 20+. No Docker, Postgres, or Redis needed.

```bash
cp .env.example .env          # defaults work as-is for local dev
npm install                   # builds packages + generates Prisma client

npm run db:migrate            # create SQLite schema (first run)
npm run db:seed               # sample competitions + demo logins

npm run dev:api               # http://localhost:4000 (hosts inline workers)
# optionally, in another terminal:
npm run dev:web               # http://localhost:3000
```

Demo logins after seeding (REMOVE BEFORE PRODUCTION):
- Student: `student@example.com` / `password123`
- Institution admin: `school@example.com` / `password123`
- Coordinator: `coordinator@example.com` / `password123`
- Worker/reviewer: `worker@example.com` / `password123`
- Platform admin: `admin@example.com` / `admin12345`

The API serves everything the frontend needs; `RUN_INLINE_WORKERS` defaults
on for the memory queue driver, so URL submission, AI extraction, dedup,
verification, and the assistant all work from a single `dev:api` process.

## Product surface (interfaces)

The platform implements the full opportunity-participation ecosystem from the
product document, not just a competition directory:

- **Student**: onboarding (`/student/onboarding`), questionnaire
  (`/student/questionnaire`), personalized feed with Starter / Strong Match /
  Stretch groups (`/for-you`), browse + search + filters (`/competitions`,
  `/search`), detail page with eligibility verdict, timeline, preparation
  resources, Save / Follow / I-want-to-try (`/competitions/[id]`), saved list,
  application tracker (Saved → Preparing → Applied → Selected → Finalist →
  Winner → Not selected), teams with invite codes (`/student/teams`),
  achievements portfolio with certificate evidence, notifications, profile &
  account controls.
- **Institution**: registration, real aggregated statistics (students,
  competitions entered, preparing, applied, selected, finalists, winners,
  certificates), roster, coordinator management (max 4, 2–3 sectors each),
  student nomination (`/institution`).
- **Coordinator**: sector-focused opportunity feed
  (`/coordinator`).
- **Worker/reviewer**: internal review workspace — evidence panel, AI
  confidence, duplicate flags, report triage, approve/reject/request-evidence
  (`/worker`). Publish is admin-only (privilege separation).
- **Admin**: review queue with edit/versioning, publish gate, reports, source
  reputation, AI-run observability, real platform stats, user management,
  audit log (`/admin`).

## Full mode (PostgreSQL + Redis)

```
docker compose --profile full up postgres redis
# set in .env:
#   provider = "postgresql" in packages/db/prisma/schema.prisma
#   DATABASE_URL=postgresql://sop:sop@localhost:5432/sop_platform
#   QUEUE_DRIVER=redis
npm run db:migrate && npm run db:seed
npm run dev:api        # API only
npm run dev:worker     # BullMQ workers consume the queues
```

## What is verified end-to-end

- Auth: register/login/refresh (JWT + bcrypt, rate-limited)
- Feed: filtering, search, pagination; detail page data with trust + verification dates
- Deterministic matching with human-readable explanations (`For You` feed)
- Eligibility engine: ELIGIBLE / NOT_ELIGIBLE / UNCERTAIN — never a fake verdict
- Save/track applications (full journey status enum), achievements
- Discovery pipeline: URL submit → polite crawl (robots.txt, rate limits,
  2 MB cap) → idempotency hash → validated AI extraction → dedup →
  verification → trust score → **NEEDS_REVIEW** (nothing auto-publishes by
  default; the gate is `AUTO_PUBLISH_ENABLED` + strict conditions)
- Admin: review queue with evidence (raw source, AI confidence, verification
  results, duplicate suggestions), edit-with-reason (versioned + audited),
  publish/reject/archive, reprocess, reports triage, source reputation, AI
  run/failure observability, audit log
- Student reports (fraud/wrong-info) with rate limiting
- Grounded assistant (student context only; mock provider without keys)

## Turning on real AI providers

Set in `.env` (providers activate purely by key presence):

```
DEEPSEEK_API_KEY=sk-...
GROK_API_KEY=xai-...
```

Nothing else changes — the Model Router routes per task, retries with
fallback across providers, and every call is logged to the `AiRun` table
(latency, tokens, errors) for cost/failure tracking.

## Swapping infrastructure

- **Database**: switch `provider` in `schema.prisma` + `DATABASE_URL`.
  JSON-as-string fields (`category`, `countries`, `benefits`, …) become real
  arrays/jsonb on PostgreSQL; the parse helpers in `@sop/shared/json.ts` are
  the only convention boundary.
- **Queues**: `QUEUE_DRIVER=redis` for BullMQ; the API surface doesn't change.
- **AI providers**: implement `ModelProvider` and register it in
  `shared/src/router.ts` `buildProviders()`.
- **Email/push**: the notifications agent's channel adapter is the single
  stub point (Resend/Postmark drop-in).

## Tests

```bash
npm test    # 23 unit tests over matching, eligibility, dedup, AI validation,
            # robots parsing, HTML-to-text
```

## Deliberately MVP (upgrade paths documented in code)

- SQLite instead of Postgres for dev; Supabase/Postgres for production
- In-memory rate limiting (swap for Upstash/Cloudflare at scale)
- Notifications channel adapter stubbed (queue + routing logic are real)
- No embeddings yet: dedup uses deterministic title/URL similarity; the
  pgvector step is documented where it belongs in the pipeline
- PWA/i18n (EN/FR), institution dashboards, scholarships/grants verticals —
  the schema and API are shaped for these but intentionally not built out
