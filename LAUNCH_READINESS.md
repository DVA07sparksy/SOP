# Launch-Readiness Report

Date: September 15, 2026
Scope: full pre-launch security, privacy, SEO, accessibility and UX audit of the platform (API + web), with fixes applied and verified live.

---

## COMPLETED

**Security & authorization (all enforced server-side)**
- Fixed IDOR: institution admins could previously create achievements for *any* studentId and nominate *any* studentId — both now verify roster membership inside the institution before acting.
- Fixed IDOR/authorization gaps on institution routes; all admin endpoints verified to require `PLATFORM_ADMIN`/`SUPER_ADMIN` role via `requireRole` (not just hidden UI).
- Mass-assignment protection verified live: `role`, `id`, `userId`, `institutionId` sent in a PATCH are stripped by the Zod schema and never reach the database.
- Security headers: Helmet with CSP (`default-src 'self'`, `frame-ancestors 'none'`, `form-action 'self'`), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, COOP; HSTS auto-enabled in production builds only.
- Rate limiting: login/register/refresh (per-IP window), assistant (AI cost protection), reports, URL submission (10/hour, crawl+AI is expensive). Verified 429s fire under repeated login attempts.
- JSON body limit; CORS allowlist (no wildcard); gzip compression enabled for low-bandwidth users (3558 → 1234 bytes on a feed response).

**Authentication hardening (new endpoints)**
- `POST /auth/logout` — revokes the presented refresh token (`all: true` revokes every session).
- `POST /auth/change-password` — requires current password, rehashes, and **revokes all existing refresh tokens** (verified live: an old refresh token is dead after the change).
- `GET /auth/export` — full personal-data export (profile, applications, achievements, reports) as JSON download.
- `DELETE /auth/me` — account deletion: applications/achievements/events deleted, user removed, sessions revoked, filed reports **anonymized but retained** (`reportedById` made nullable with `SetNull`), deletion recorded in the audit log with a hashed email reference. Full roundtrip verified live.
- Password policy enforced server-side: min 8 chars, letter + number (bcrypt cost 12).

**Privacy & legal**
- `Privacy Policy` page: collection, purpose, AI processing disclosure, third parties, retention, minors section, export/deletion rights. Marked for legal review.
- `Terms & Conditions` page: acceptable use, verify-before-applying disclaimer, AI limitations, external-applications disclaimer, liability. Marked for legal review.
- FAQ page (9 questions matching the spec's list) with accessible accordion.

**SEO / discoverability**
- Root metadata with template, Open Graph + Twitter cards, canonical `metadataBase`, favicon (`/icon.svg`).
- `robots.ts` — allows public pages, disallows `/admin`, `/for-you`, `/saved`, `/student/*`, `/institution/*`, `/login`, `/api/*`.
- `sitemap.ts` — static public pages + all published competitions (with `lastVerifiedAt` as lastModified); degrades gracefully if API is down.
- Custom 404 page and friendly global error page (no stack traces).

**Web UX & accessibility**
- Skip-to-content link; semantic landmarks; `<main id="main-content">`.
- Responsive nav rebuilt: mobile hamburger with Escape/outside-click close, `aria-expanded`/`aria-controls`, focus rings, login state synced.
- Login form: proper `<label>`s (no placeholder-as-label), password show/hide toggle (`aria-pressed`), autocomplete attributes, demo credentials no longer prefilled.
- Homepage: clear value proposition ("Find competitions you're actually eligible for"), one primary CTA, skeleton loading, `aria-live`/`aria-busy` states, retry on error.
- Competition cards: deadline not color-only (icon + text + date), trust badge, dark-mode-safe contrast.
- Detail page: loading skeleton, error state, confirmation feedback for save/report actions, labeled report form, external-link disclaimer.
- Footer with platform/FAQ/legal links and the verify-with-organizer notice.

**Dependency & repo hygiene**
- `npm audit`: only remaining vulnerabilities are in `next` 14.2.x, patched in Next 15/16 — requires a framework upgrade (see Launch blockers).
- `.gitignore` extended: `*.db`, `.env.*` (except `.env.example`), `*.tsbuildinfo`. No secrets found in the working tree; no live API keys configured anywhere.
- Prisma migration added for the report-anonymization schema change.

## SECURITY FIXES (found → fixed)

| # | Severity | Issue | Fix |
|---|----------|-------|-----|
| 1 | Critical | Institution admin could create achievements for any student (IDOR) | Roster-membership check server-side |
| 2 | Critical | Institution nominate endpoint accepted arbitrary studentIds (IDOR) | Scoped to own institution's students |
| 3 | High | No logout / session revocation | Logout + revoke-all; refresh-token revocation verified live |
| 4 | High | Password change kept old sessions valid | All refresh tokens revoked on change (verified) |
| 5 | High | No account deletion path (GDPR/privacy) | Delete + anonymize + audit, verified end-to-end |
| 6 | Medium | No data export | JSON export endpoint |
| 7 | Medium | Missing security headers | Helmet CSP/HSTS-lite/nosniff/referrer-policy |
| 8 | Medium | URL-submit endpoint unthrottled (expensive crawl) | 10/hour rate limit |
| 9 | Medium | `.gitignore` allowed `.env.*` and `*.db` | Extended ignore rules |
| 10 | Low | Admin logout-by-UI-only previously | Server-side revoke wired to nav logout |

## TESTS (executed live against the running stack)

- Typecheck: all 5 workspaces clean. Unit tests: 23/23 pass (`@sop/shared`).
- `next build` passes; all routes compile (/, /competitions, /competitions/[id], /for-you, /login, /faq, /privacy, /terms, /admin, /student/profile, 404, robots, sitemap, icon).
- HTTP security battery (17 checks): unauthenticated access to 4 protected endpoints → 401; student hitting admin endpoints → 403; role/id/userId/institutionId tampering → stripped; invalid email/weak password/missing fields → 400; 14 rapid logins → 429; headers present; gzip active. **All pass** (2 initial test-script assertions were miswritten against the response shape; corrected and re-verified).
- Auth lifecycle: change password → old refresh token rejected → revert; register → save → report → export → delete → login fails; DB row confirmed gone, report anonymized, audit entry written.
- Page sweep: 10 routes return correct codes (200/404), titles render per-page, robots.txt serves with correct disallows.

## REMAINING ISSUES / LAUNCH BLOCKERS

1. **Next.js 14.2.35 has known advisories (incl. 1 critical)** — fixed in Next 15/16. Upgrading is a code-level change (async request APIs) and must be tested; do **not** publicly launch the web app on 14.2.x.
2. **Legal review** — Privacy Policy and Terms are complete drafts explicitly marked for legal review; minors/data-protection requirements must be confirmed for the deployment jurisdiction.
3. **HTTPS + domain** — headers are set but TLS/HSTS only apply in a real production deployment (Vercel/Cloudflare).
4. **Email verification & password reset** — the API has no mailer wired (by design for MVP); unverified accounts can currently sign up. Add a transactional email provider (e.g. Resend) before public launch.
5. **Demo credentials** — `student@example.com / password123` and `admin@example.com / admin12345` exist in the seed. Keep out of production or rotate.
6. **Monitoring** — Sentry/uptime monitoring not yet wired (documented in README; infra-light to add).

## RECOMMENDATIONS (safe post-launch)

- Upstash Redis-backed rate limiting when running multiple API instances (in-memory limiter is per-process).
- MFA for admin accounts; login-alert emails.
- Dark mode toggle (dark: classes are already present across components).
- PWA manifest + service worker (careful: never cache authenticated responses).
- Switch SQLite → PostgreSQL/Supabase for production (one `DATABASE_URL` change; schema is portable).
- Scheduled link-checker for `officialUrl`/`applicationUrl` freshness (§51 of the spec).
