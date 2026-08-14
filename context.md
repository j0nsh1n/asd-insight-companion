# context.md — ASD Insight Companion

## Current State

Branch `feat/phase-4c-feature-payload`. Phase 4C posts JSON-only aggregate
tracking features after the stimulus step. No frames. No autism score.

Gates as of 2026-08-13 (Phase 4C):

| Gate | Result |
|---|---|
| Backend `ruff` / `ruff format --check` / `mypy` / `pytest` | pass (53 tests) |
| Frontend `oxlint` / `vitest` / `build` | pass (73 tests) |

**No later phase started.**

Known gaps: placeholder `.mp4` is gitignored; orphan answers if bank version
changes mid-dev; questionnaire score in API but not UI; no withdraw/TTL/auth;
SQLite unencrypted; CI may lag unpushed commits.

## Repo Landmarks

    backend/app/api/v1/assessment.py   questionnaire + POST /features
    backend/app/models/assessment.py   FeaturePayload (extra=forbid)
    backend/app/services/assessment.py record_features
    shared/stimuli_manifest.json
    frontend/src/lib/stimulusTracking.ts  aggregates + buildFeaturePayload
    frontend/src/lib/useStimulusTracking.ts
    frontend/src/pages/StimulusTaskPage.tsx
    frontend/src/lib/api.ts            postFeatures

## Domain Model

    sessions 1 -- * question_responses
    Stage still ends at questionnaire_complete.
    After that (client): camera → calibration → stimulus → POST /features
         → session_done.
    feature_payload / feature_quality / feature_recorded_at on sessions
    (numeric JSON only). Per-frame buffer is cleared in the browser after
    summarize.

## Non-Obvious Decisions

- FeaturePayload forbids extra fields so `frames` / `image_base64` 422.
- `media_uploaded` must be JSON false.
- Quality is tracking coverage (ok/low/insufficient/unavailable), not risk.
- POST allowed only after questionnaire_complete; second POST is 409.
- 4B consent fail-closed still applies; declined camera can POST zeros.
- Transcript fetch is text-only. No MediaRecorder / toBlob / toDataURL.

## Session Handoff

2026-08-13 · `feat/phase-4c-feature-payload` · Phase 4C numeric feature
ingest. Next: examiner gate. No later phase started.
