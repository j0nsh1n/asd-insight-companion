# context.md — ASD Insight Companion

## Current State

Branch `feat/phase-5-research-results`. Phase 5 adds a read-only
research-session summary after the stimulus step. Data quality and
descriptive task notes only. No autism score, risk, or probability.

Gates as of 2026-08-14 (Phase 5):

| Gate | Result |
|---|---|
| Backend `ruff` / `ruff format --check` / `mypy` / `pytest` | pass (64 tests) |
| Frontend `oxlint` / `vitest` / `build` | pass (86 tests) |

Known gaps: placeholder `.mp4` is gitignored; orphan answers if bank
version changes mid-dev; no withdraw/TTL/auth; SQLite unencrypted;
calibration is client-only so results always show not_available;
CI may lag unpushed commits.

## Repo Landmarks

    backend/app/api/v1/results.py      GET /results/{session_id}
    backend/app/models/result.py       ResearchSessionSummary (extra=forbid)
    backend/app/services/results_service.py
    backend/app/services/data_quality_service.py
    backend/app/services/safety_service.py
    frontend/src/pages/ResultsPage.tsx
    frontend/src/lib/api.ts            fetchResearchSummary
    frontend/src/types/assessment.ts
    backend/app/api/v1/assessment.py   questionnaire + POST /features
    shared/feature_quality_thresholds.json

## Domain Model

    sessions 1 -- * question_responses
    Server stage still ends at questionnaire_complete.
    Client after that: camera → calibration → stimulus → POST /features
         → GET /results/{session_id}.
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

## Session Handoff

2026-08-14 · `feat/phase-5-research-results` · Phase 5 research-session
summary implemented (GET + Results page, no diagnostic score).
Next: examiner gate. Phase 6 not started.
