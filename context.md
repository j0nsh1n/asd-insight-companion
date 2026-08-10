# context.md — ASD Insight Companion

## Current State

Branch `feat/phase-2-timed-questionnaire` @ `01f7279`, 16 commits ahead of
`main`, no upstream — never pushed, so CI has never run on this branch.

All gates green as of 2026-08-10:

| Gate | Command | Result |
|---|---|---|
| Backend lint | `ruff check .` | pass |
| Backend format | `ruff format --check .` | pass, 24 files |
| Backend types | `mypy app` (strict) | pass, 19 files |
| Backend tests | `pytest -q` | 41 passed |
| Frontend lint | `npm run lint` (oxlint, warnings fail) | pass |
| Frontend tests | `npm test` (vitest) | 31 passed, 6 files |
| Frontend build | `npm run build` | pass |

Phase 0 (skeleton, CI, disclaimer), Phase 1 (anonymous sessions, consent,
intake) and Phase 2 (timed questionnaire) are feature-complete. Phase 3
(camera) has not been started.

Manual QA 2026-08-10 — three full questionnaire runs driven through the real
UI: telemetry persisted with no NULLs; `answer_change_count` matched the
click plan exactly (same-option re-clicks correctly counted as 0); required
items could not be skipped (Next disabled until answered); mid-questionnaire
refresh resumed at the exact question with prior answers intact; all three
summaries recomputed consistently from stored rows.

Known gaps:
- Sessions started under a previous question bank report inflated
  `answered_count` (orphan rows from the old instrument are counted).
- Score and subscale values are sent in the API payload although the UI never
  renders them.
- CI unverified on this branch (never pushed).
- No withdraw/delete endpoint, no retention or TTL on session rows.
- Session UUID is a bearer credential; no auth, no rate limiting.
- SQLite unencrypted at rest.
- `record_consent` writes all three consent columns as hard-coded `1` rather
  than deriving them from the payload; correct only because the validator
  rejects anything but all-true.

## Repo Landmarks

    backend/app/main.py            FastAPI factory, CORS, lifespan -> init_db()
    backend/app/core/config.py     Settings; CORS_ORIGINS, SQLITE_PATH
    backend/app/db.py              Raw sqlite3 helpers, schema DDL, migrations,
                                   WAL, 30s timeout, optional IMMEDIATE
    backend/app/models/session.py  Pydantic models; consent + intake validators
    backend/app/models/assessment.py  Question bank + timed-response models
    backend/app/services/sessions.py  Session lifecycle, atomic stage writes
    backend/app/services/assessment.py  Answer upsert, progress, completion
    backend/app/services/question_bank.py  Loads shared/question_bank.json
    backend/app/services/scoring.py   Total + per-category subscale scoring
    backend/app/api/v1/            health.py, sessions.py, assessment.py, router.py
    backend/tests/                 conftest.py (tmp-path DB), test_health.py,
                                   test_sessions.py, test_assessment.py,
                                   test_scoring.py (incl. concurrency)
    backend/requirements-dev.txt   ruff + mypy; kept out of runtime image
    shared/question_bank.json      Swappable instrument; placeholder pending
                                   AQ-10 licensing
    frontend/src/App.tsx           View router: welcome -> consent -> intake
                                   -> questionnaire; applies a11y prefs
    frontend/src/pages/            Welcome.tsx, Consent.tsx, Intake.tsx,
                                   Questionnaire.tsx
    frontend/src/components/       ResearchDisclaimer.tsx (sticky, persistent)
    frontend/src/lib/              api.ts (typed client), sessionStorage.ts
    frontend/src/test/setup.ts     jest-dom + explicit afterEach(cleanup)
    scripts/run-backend.sh         Backend from any cwd; port-collision aware
    scripts/dev.sh                 Both services
    scripts/smoke-phase0.sh        lint + format + types + tests + build
    .github/workflows/             ci.yml (backend/frontend/markdown), codeql.yml
    .local/                        Gitignored operator notes; never shipped

## Domain Model

Two tables. No ORM; schema is `CREATE TABLE IF NOT EXISTS` in `db.py` plus an
idempotent ADD COLUMN migration list, applied on startup.

    sessions  1 ------ * question_responses   (FK, PRAGMA foreign_keys = ON)

    sessions: id TEXT PK (UUIDv4) | stage | created_at / updated_at (UTC ISO)
      consent_research_only / _no_diagnosis / _data_minimization  INT NOT NULL 0
      consented_at | age_range | language | accessibility_prefs (JSON)
      optional_context (<=500 char)
      questionnaire_started_at / _completed_at / _score / _item_count
      questionnaire_bank_id / _instrument_version
      questionnaire_subscale_scores (JSON) / _timing_summary (JSON)

    question_responses: PK (session_id, question_id)
      answer_value | shown_at / answered_at (ISO-8601)
      time_to_first_interaction_ms | total_time_on_question_ms (<= 1h)
      answer_change_count | updated_at

Stage machine, enforced server-side and fail-closed:

    created --consent(all 3 true)--> consented --intake--> intake_complete
        --first answer--> questionnaire_in_progress
        --complete(all required answered)--> questionnaire_complete

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
- **Commit author emails are the GitHub noreply alias**, rewritten before the
  first push. The repo is public.
- **Raw `sqlite3`, no SQLAlchemy/Alembic** — deliberate for a small-schema
  prototype; migrations are an idempotent ADD COLUMN list in `db.py`.
- **Session id lives in `sessionStorage`, not `localStorage`** — survives
  reload, not tab close. The intake UI copy states this.
- **Consent cannot be undone server-side**; "Back" from intake returns to
  Welcome rather than reopening the consent form.
- **Age buckets start at `18-24` and `"under-18"` is rejected 422** — adults
  18+ only, matching consent copy.
- **`sqlite3.connect(timeout=30.0)` plus WAL** so concurrent writers wait for
  the lock instead of erroring during atomic stage transitions.
- **`get_connection(immediate=True)` sets `isolation_level = None` and issues
  an explicit `BEGIN IMMEDIATE` before yielding.** Relying on
  `isolation_level = "IMMEDIATE"` alone does not work: Python's `sqlite3`
  opens the transaction at the first DML statement, leaving the preceding
  stage-check SELECT outside the write lock.
- **`docker-compose.yml` and both Dockerfiles have never been built or run** —
  no Docker on the dev machine.
- **The question bank is a placeholder, not a licensed instrument.** Its
  `_developer_note` records that AQ-10 (Adult) use awaits written permission
  from the Autism Research Centre; the note is stripped from the API payload.
- **The questionnaire score is stored but never rendered.** Removing the
  on-screen score was a deliberate product decision, not an oversight.
- **Timing telemetry is client-reported** and validated for shape only
  (ISO-8601, ordering, 1h ceiling). There is no server-side corroboration.
- **Naive timestamps are treated as UTC** so mixed naive/aware comparisons
  cannot raise `TypeError` and escape as HTTP 500.
- **`hero.png` in `frontend/src/assets/` is unreferenced** Vite leftover.

## Session Handoff

2026-08-10 · `feat/phase-2-timed-questionnaire` · Ran three full
questionnaire passes through the real UI and verified persisted telemetry,
skip prevention, mid-questionnaire resume, and summary consistency; refreshed
this file and `CHANGELOG.md`. Re-verified `01f7279` live: concurrent
answer-vs-complete now leaves score and stored responses consistent 5/5
(previously 4/4 inconsistent). Next: decide whether to keep subscale scoring,
then push the branch so CI runs for the first time, before Phase 3 (camera)
is scoped.
