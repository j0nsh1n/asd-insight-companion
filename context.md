# context.md — ASD Insight Companion

## Current State

Branch `feat/phase-7-hardening`. Phase 7 is release hardening: a11y
labels, safe 500s, security headers, CI privacy grep, demo checklist.
Still no autism score, risk, or probability.

Gates as of 2026-08-15 (Phase 7):

| Gate | Result |
|---|---|
| Backend `ruff` / `ruff format --check` / `mypy` / `pytest` | pass (77 tests) |
| Frontend `oxlint` / `vitest` / `build` | pass (98 tests) |

Known gaps: placeholder `.mp4` is gitignored; orphan answers if bank
version changes mid-dev; no withdraw/TTL/auth; SQLite unencrypted;
calibration pass/fail is not stored on the server; no Playwright/axe
suite (manual audit in `docs/TESTING.md`).

## Repo Landmarks

    frontend/src/lib/assessmentFlow.ts client view resolver
    frontend/src/lib/friendlyError.ts  participant-facing error copy
    frontend/src/pages/ResultsPage.tsx
    frontend/src/lib/api.ts            fetchResearchSummary, features_recorded
    backend/app/api/v1/results.py      GET /results/{session_id}
    backend/app/models/session.py      SessionResponse.features_recorded
    docs/TESTING.md
    docs/DEMO_CHECKLIST.md
    README.md

## Domain Model

    sessions 1 -- * question_responses
    Server stage still ends at questionnaire_complete.
    Client after that: camera → calibration → stimulus → POST /features
         → GET /results/{session_id}.
    features_recorded is a boolean on SessionResponse (no media).
    Results are computed from stored questionnaire + feature_payload only.
    GET does not write. No scoring endpoint.

## Non-Obvious Decisions

- Schemas live in `models/` (not `schemas/`); API under `api/v1/`;
  client is `frontend/src/lib/api.ts`.
- Blink field is existing `mean_blink_estimate`, not a blink rate.
- Calibration is never stored, so `calibration_status` is always
  `not_available`.
- Server-stored `feature_quality` wins over the client payload flag.
- Safety notice may say "not a diagnosis" / "autistic"; explanation
  templates avoid those exact prohibited terms.
- Quality is session completeness, not model confidence.
- FeaturePayload still forbids extra fields; `media_uploaded` is false.
- The questionnaire total is stored server-side (`questionnaire_score`)
  and never displayed to participants or returned in the results payload.
- Client views are not URL-routed. `resolveView` clamps a requested view
  to the earliest allowed server stage.

## Session Handoff

2026-08-15 · `feat/phase-7-hardening` · Phase 7 hardening: skip link,
safe 500s, security headers, privacy CI grep, demo checklist.
Next: examiner gate. Phase 8 not started.
