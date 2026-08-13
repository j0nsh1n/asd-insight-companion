# context.md — ASD Insight Companion

## Current State

Branch `feat/phase-4a-stimulus-task`. Phase 4A (one accessible stimulus task,
no tracking or scoring) is implemented on top of Phase 3.

Gates as of 2026-08-13 (4A frontend re-run; backend unchanged):

| Gate | Result |
|---|---|
| Backend (unchanged this phase) | last 3C: 44 tests pass |
| Frontend `oxlint` / `vitest` / `build` | pass (64 tests) |

Phases 0–3C feature-complete. Phase 4A on this branch.
**Phase 4B (tracking during stimulus) not started.**

Known gaps: placeholder `.mp4` is gitignored and not in the repo; orphan
answers if bank version changes mid-dev; score in API but not UI; no
withdraw/TTL/auth; SQLite unencrypted; CI may lag unpushed commits.

## Repo Landmarks

    backend/app/main.py, core/config.py, db.py
    backend/app/models/session.py, assessment.py
    backend/app/services/sessions.py, assessment.py, question_bank.py, scoring.py
    backend/app/api/v1/  health, sessions, assessment
    shared/question_bank.json     Swappable placeholder instrument
    shared/stimulus.json          Phase 3C clip config (not used in 4A flow)
    shared/stimuli_manifest.json  Phase 4A single-task manifest
    docs/STIMULUS_RIGHTS_AND_DESIGN.md
    frontend/public/stimuli/      captions + transcript; mp4 dropped in locally
    frontend/src/App.tsx          welcome → consent → intake → questionnaire
                                  → camera → calibration → stimulus (4A)
                                  → session_done
    frontend/src/pages/           Welcome, Consent, Intake, Questionnaire,
                                  CameraCheck, Calibration, StimulusTask (3C),
                                  StimulusTaskPage (4A)
    frontend/src/components/      ResearchDisclaimer, StimulusPlayer
    frontend/src/lib/             api.ts, sessionStorage.ts, camera.ts,
                                  cameraQuality.ts, faceLandmarker.ts,
                                  localFeatures.ts, stimulusConfig.ts,
                                  stimuliManifest.ts
    frontend/public/mediapipe/    NOTICE + LICENSE; wasm/ and .task via postinstall
    frontend/scripts/vendor-mediapipe.mjs
    scripts/                      run-backend.sh, dev.sh, smoke-phase0.sh
    .github/workflows/            ci.yml, codeql.yml
    .local/                       gitignored operator notes

## Domain Model

    sessions 1 -- * question_responses
    Stage: created → consented → intake_complete
         → questionnaire_in_progress → questionnaire_complete
    Client-only after that: camera check → calibration → 4A stimulus page
         → session checkpoint.
    Consent stores three required flags plus optional camera_optional.
    No media stored server-side. SQLite at backend/data/app.db (gitignored).

## Non-Obvious Decisions

- Dev deps (ruff/mypy) in requirements-dev.txt; Vitest needs explicit cleanup
  in setup.ts; oxlint fails on warnings; CI uses per-directory working-dir.
- Raw sqlite3 + ADD COLUMN migrations; BEGIN IMMEDIATE before yield for
  write-critical questionnaire paths.
- Question bank is a placeholder; score stored, never shown to participants.
- Timing telemetry client-reported; naive ISO timestamps treated as UTC.
- **Camera (3A):** `getUserMedia` audio:false only; preview local; streams
  stopped on cancel/continue/unmount.
- **MediaPipe (3C):** self-hosted under `/mediapipe/` (Apache-2.0 NOTICE).
- **Vite `@shared` alias** maps to `../shared` only; `server.fs.allow` is
  `[frontend, shared]`.
- **Optional camera consent** still gates camera/calibration only. Phase 4A
  stimulus never calls `getUserMedia` and does not attach MediaPipe.
- **Phase 3C `StimulusTask.tsx` is kept** (camera-sampling clip) but is not
  in the live App flow. 4A `StimulusTaskPage` is the wired stimulus step.
- **4A skip** goes to `session_done` (no react-router). Back returns to
  calibration. There is no separate results route.
- Feature summaries are local-only and are not collected on the 4A page.
- docker never verified on this machine.

## Session Handoff

2026-08-13 · `feat/phase-4a-stimulus-task` · Phase 4A accessible stimulus
task (manifest, player, captions/transcript, skip). Next: examiner gate or
Phase 4B when scoped. Phase 4B not started.
