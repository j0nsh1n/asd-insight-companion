# context.md — ASD Insight Companion

## Current State

Branch `feat/ui-visual-polish`. Visual refresh of all session screens on
top of Phase 8 docs. Still no autism score, risk, or probability.

Gates as of 2026-08-18 (Phase 8):

| Gate | Result |
|---|---|
| Backend `ruff` / `ruff format --check` / `mypy` / `pytest` | pass (79 tests) |
| Frontend `oxlint` / `vitest` / `build` | pass (100 tests) |

Known gaps: placeholder `.mp4` is gitignored; no withdraw/TTL/auth;
SQLite unencrypted; calibration not stored on the server; no Playwright;
manual matrix still required for live demo paths.

## Repo Landmarks

    frontend/src/lib/assessmentFlow.ts client view resolver
    frontend/src/lib/friendlyError.ts  participant-facing error copy
    frontend/src/pages/ResultsPage.tsx
    frontend/src/lib/api.ts            fetchResearchSummary, features_recorded
    backend/app/api/v1/results.py      GET /results/{session_id}
    backend/app/models/session.py      SessionResponse.features_recorded
    docs/TESTING.md
    docs/FINAL_VERIFICATION.md
    docs/DEMO_SCRIPT.md
    docs/DEMO_CHECKLIST.md
    docs/RELEASE_FREEZE.md
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

2026-08-18 · `feat/ui-visual-polish` · Visual refresh of all session
screens (CSS + header/welcome). Safety copy unchanged. Phase 9 not
started.
