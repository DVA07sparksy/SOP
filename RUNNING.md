# Running the Platform (current state)

This file replaces the earlier notes (which described the temporary SQLite
conversion mid-refactor). The platform now runs cleanly end-to-end.

## Verified working (September 15, 2026)

- `npm run typecheck` — all four workspaces clean
- `npm test` — 23/23 unit tests pass
- `npx next build` (apps/web) — all routes build
- Full pipeline exercised over HTTP against the running API:
  - login (student + admin), feed, search, detail with eligibility verdict
  - personalized `/competitions/for-you` with score + explanations
  - save application, report competition, assistant chat (mock provider)
  - URL submission → crawl → extraction → dedup → verification →
    NEEDS_REVIEW with trust score (mock AI, no keys required)
  - admin: edit (audited + versioned) → publish → audit trail;
    report resolution
  - crawl failures audited (`crawl.failed`) when a site is unreachable

## Modes

| Mode | Env | What runs where |
|---|---|---|
| Zero-infra dev (default) | nothing to set | API hosts workers in-process; SQLite; Mock AI |
| Full dev | `QUEUE_DRIVER=redis`, `REDIS_URL=...` | `npm run dev:worker` consumes; API serves HTTP |
| Production target | Postgres/Supabase + Redis + real keys | API + ai-worker deployed separately |

## Commands

```bash
npm run db:migrate    # create/apply schema (SQLite by default)
npm run db:seed       # 3 published competitions + 1 review-queue item + demo logins
npm run dev:api       # API on :4000 (memory-mode workers included)
npm run dev:worker    # separate worker (redis mode)
npm run dev:web       # web on :3000
npm test              # unit tests
npm run typecheck     # all workspaces
```

Demo logins: `student@example.com / password123`,
`admin@example.com / admin12345`.

## Known notes

- Port 3000 may be occupied by unrelated processes on this machine — set
  `WEB_PORT` or stop the other process; the API uses :4000.
- Outbound internet failures are handled and audited (`crawl.failed`), not
  crashes; a real crawl of any reachable page exercises the full pipeline.
- The mock provider produces deliberately conservative extractions
  (`Untitled Competition` on pages without clear competition wording) — with
  `DEEPSEEK_API_KEY` set, extraction quality is the model's, not the mock's.
