# context.md — ASD Insight Companion

## Current State

Branch `feat/phase-1-consent-sessions` @ `a24f4c0`, 5 commits ahead of `main`,
no upstream — never pushed, so CI has never run on this branch.

All gates green as of 2026-08-07:

| Gate | Command | Result |
|---|---|---|
| Backend lint | `ruff check .` | pass |
| Backend format | `ruff format --check .` | pass, 17 files |
| Backend types | `mypy app` (strict) | pass, 14 files |
| Backend tests | `pytest -q` | 17 passed |
| Frontend lint | `npm run lint` (oxlint, warnings fail) | pass |
| Frontend tests | `npm test` (vitest) | 20 passed, 5 files |
| Frontend build | `npm run build` | pass, 201 KB JS / 63 KB gzip |

Phase 0 (skeleton, CI, disclaimer) and Phase 1 (anonymous sessions, consent,
intake) are complete. Phase 1 was examined and returned FIX-PASS; all four
blocking items were fixed in `a24f4c0` and re-verified live: 8 concurrent
consent POSTs now yield 1×200 and 7×409 (previously 4×200).

Known gaps:
- CI unverified on this branch (never pushed).
- Docker Compose and both Dockerfiles never built — `docker` is not installed
  on the dev machine.
- No withdraw/delete endpoint, no retention or TTL on session rows.
- Session UUID is a bearer credential; no auth, no rate limiting.
- SQLite unencrypted at rest.
- `record_consent` writes all three consent columns as hard-coded `1` rather
  than deriving them from the payload; correct only because the validator
  rejects anything but all-true.

## Repo Landmarks

    backend/app/main.py            FastAPI factory, CORS, lifespan -> init_db()
    backend/app/core/config.py     Settings; CORS_ORIGINS, SQLITE_PATH
    backend/app/db.py              Raw sqlite3 helpers, schema DDL, 30s timeout
    backend/app/models/session.py  Pydantic models; consent + intake validators
    backend/app/services/sessions.py  Session lifecycle, atomic stage writes
    backend/app/api/v1/            health.py, sessions.py, router.py
    backend/tests/                 conftest.py (tmp-path DB), test_health.py,
                                   test_sessions.py (incl. concurrency)
    backend/requirements-dev.txt   ruff + mypy; kept out of runtime image
    frontend/src/App.tsx           View router: welcome -> consent -> intake
    frontend/src/pages/            Welcome.tsx, Consent.tsx, Intake.tsx
    frontend/src/components/       ResearchDisclaimer.tsx (sticky, persistent)
    frontend/src/lib/              api.ts (typed client), sessionStorage.ts
    frontend/src/test/setup.ts     jest-dom + explicit afterEach(cleanup)
    scripts/run-backend.sh         Backend from any cwd; port-collision aware
    scripts/dev.sh                 Both services
    scripts/smoke-phase0.sh        lint + format + types + tests + build
    .github/workflows/             ci.yml (backend/frontend/markdown), codeql.yml
    .local/                        Gitignored operator notes; never shipped

## Domain Model

One entity, one table. No ORM, no migrations — schema is `CREATE TABLE IF NOT
EXISTS` in `db.py`, applied on startup.

    +----------------------------------------------------+
    | sessions                                           |
    +----------------------------------------------------+
    | id                        TEXT  PK   (UUIDv4)      |
    | stage                     TEXT  NOT NULL           |
    | created_at                TEXT  NOT NULL  (UTC ISO)|
    | updated_at                TEXT  NOT NULL  (UTC ISO)|
    | consent_research_only     INT   NOT NULL  DEFAULT 0|
    | consent_no_diagnosis      INT   NOT NULL  DEFAULT 0|
    | consent_data_minimization INT   NOT NULL  DEFAULT 0|
    | consented_at              TEXT  NULL              |
    | age_range                 TEXT  NULL              |
    | language                  TEXT  NULL              |
    | accessibility_prefs       TEXT  NULL  (JSON blob) |
    | optional_context          TEXT  NULL  (<=500 char)|
    +----------------------------------------------------+

Stage machine, enforced server-side and fail-closed:

    created --consent(all 3 true)--> consented --intake--> intake_complete

No IP address, user agent, or request metadata is stored anywhere. Store is
SQLite at `backend/data/app.db` (gitignored), overridable via `SQLITE_PATH`.

## Non-Obvious Decisions

- **`ruff`/`mypy` live in `requirements-dev.txt`, not `requirements.txt`** — so
  the Docker runtime image stays lean. CI installs the dev file.
- **Vitest runs without `globals: true`**, so Testing Library's auto-cleanup
  never registers. `src/test/setup.ts` calls `afterEach(cleanup)` explicitly.
  Removing it makes renders leak between tests.
- **`npm run lint` is `oxlint --deny-warnings`** on purpose; oxlint exits 0 on
  warnings otherwise, which made the lint gate unable to fail.
- **CI jobs are per-directory with `working-directory`.** The original
  templates gated every step on `hashFiles()` at the repo root, which this
  layout has no files for — copied verbatim they produced a green no-op CI.
- **CodeQL has no `autobuild` step** — it is a no-op for Python/TypeScript and
  only adds a failure surface.
- **`main` sits at the root commit** so PR #1 had real content; a `main` at the
  branch tip would have made the PR empty.
- **Commit author emails are the GitHub noreply alias**, rewritten before the
  first push. The repo is public.
- **Raw `sqlite3`, no SQLAlchemy/Alembic** — deliberate for a single-table
  prototype.
- **Session id lives in `sessionStorage`, not `localStorage`** — survives
  reload, not tab close. The intake UI copy states this.
- **Consent cannot be undone server-side**; "Back" from intake returns to
  Welcome rather than reopening the consent form.
- **Age buckets start at `18-24` and `"under-18"` is rejected 422** — adults
  18+ only, matching consent copy.
- **`sqlite3.connect(timeout=30.0)`** so concurrent writers wait for the lock
  instead of erroring during atomic stage transitions.
- **`docker-compose.yml` and both Dockerfiles have never been built or run** —
  no Docker on the dev machine.
- **`hero.png` in `frontend/src/assets/` is unreferenced** Vite leftover.

## Session Handoff

2026-08-07 · `feat/phase-1-consent-sessions` · Adopted the governance files
(`context.md`, `CHANGELOG.md`) and added the `.local/` carve-out to agents.md
policy supremacy. Phase 1 fix pass verified green. Next: push the branch so CI
runs for the first time, or begin Phase 2 when scoped.
