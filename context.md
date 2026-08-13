# context.md — ASD Insight Companion

## Current State

Branch `feat/phase-3c-calibration-stimulus` @ `2552a31`. Phase 3C (calibration + local
stimulus sampling) is implemented; this session is the Phase 3C fix pass.

Gates as of 2026-08-13:

| Gate | Result |
|---|---|
| Backend `ruff` / `ruff format --check` / `mypy` / `pytest` | pass (44 tests) |
| Frontend `oxlint` / `vitest` / `build` | pass (60 tests) |

Phases 0–2 feature-complete. Phase 3A–3C complete on this branch.
**Phase 3D / 4 not started.**

Known gaps: orphan answers if bank version changes mid-dev; score in API but
not UI; no withdraw/TTL/auth; SQLite unencrypted; CI may lag unpushed commits.

## Repo Landmarks

    backend/app/main.py, core/config.py, db.py
    backend/app/models/session.py, assessment.py
    backend/app/services/sessions.py, assessment.py, question_bank.py, scoring.py
    backend/app/api/v1/  health, sessions, assessment
    shared/question_bank.json   Swappable placeholder instrument
    shared/stimulus.json        Swappable stimulus clip config
    frontend/src/App.tsx        welcome → consent → intake → questionnaire
                                → camera → calibration → stimulus
                                → session_done
    frontend/src/pages/         Welcome, Consent, Intake, Questionnaire,
                                CameraCheck, Calibration, StimulusTask
    frontend/src/lib/           api.ts, sessionStorage.ts, camera.ts,
                                cameraQuality.ts, faceLandmarker.ts,
                                localFeatures.ts, stimulusConfig.ts
    frontend/src/components/    ResearchDisclaimer (sticky)
    frontend/public/mediapipe/  NOTICE + LICENSE; wasm/ and .task via postinstall
    frontend/scripts/vendor-mediapipe.mjs
    scripts/                    run-backend.sh, dev.sh, smoke-phase0.sh
    .github/workflows/          ci.yml, codeql.yml
    .local/                     gitignored operator notes

## Domain Model

    sessions 1 -- * question_responses
    Stage: created → consented → intake_complete
         → questionnaire_in_progress → questionnaire_complete
    Client-only after that: camera check → calibration → stimulus
         → session checkpoint.
    Consent stores three required flags plus optional camera_optional
    (nullable until consent; false if declined).
    No media stored server-side. SQLite at backend/data/app.db (gitignored).

## Non-Obvious Decisions

- Dev deps (ruff/mypy) in requirements-dev.txt; Vitest needs explicit cleanup
  in setup.ts; oxlint fails on warnings; CI uses per-directory working-dir.
- Raw sqlite3 + ADD COLUMN migrations; BEGIN IMMEDIATE before yield for
  write-critical questionnaire paths.
- Question bank is a placeholder; score stored, never shown to participants.
- Timing telemetry client-reported; naive ISO timestamps treated as UTC.
- **Camera (3A):** `getUserMedia` audio:false only; preview local; streams
  stopped on cancel/continue/unmount; in-flight requests abandoned via
  generation counter so leave-during-permission does not leak live tracks.
- **MediaPipe (3C fix):** WASM + `face_landmarker.task` are served from
  `/mediapipe/` (copied/downloaded by `npm postinstall`). Apache-2.0;
  attribution in `frontend/public/mediapipe/NOTICE`. Binaries are gitignored.
- **Vite `@shared` alias** maps to `../shared` only; `server.fs.allow` is
  `[frontend, shared]` — not the repo root (that leaked `.local/` and the DB).
- **Optional camera consent:** fourth item, independently declinable; the
  three required flags stay fail-closed. Declined sessions never call
  `getUserMedia` and hide Enable / Start with camera / Optional sampling.
- **Feature summaries are local-only** (`media_uploaded: false`). Not posted
  to the API in this phase.
- Docker compose context is repo root so `shared/` ships in the image.
- docker never verified on this machine.

## Session Handoff

2026-08-13 · `feat/phase-3c-calibration-stimulus` @ `2552a31` · Phase 3C fix pass:
self-hosted MediaPipe, optional camera consent honored on camera/calibration/
stimulus, Vite fs.allow narrowed, stimulus load error can continue without
the clip, changelog/context refreshed. Next: examiner gate. Phase 3D/4 not
started.
