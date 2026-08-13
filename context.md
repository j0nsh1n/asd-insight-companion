# context.md — ASD Insight Companion

## Current State

Branch `feat/phase-4b-stimulus-tracking`. Phase 4B (local tracking during the
stimulus clip) is implemented on top of Phase 4A.

Gates as of 2026-08-13 (Phase 4B):

| Gate | Result |
|---|---|
| Backend `ruff` / `ruff format --check` / `mypy` / `pytest` | pass (44 tests) |
| Frontend `oxlint` / `vitest` / `build` | pass (70 tests) |

Phases 0–4A remain. **Phase 4C (upload / fusion) not started.**

Known gaps: placeholder `.mp4` is gitignored; orphan answers if bank version
changes mid-dev; score in API but not UI; no withdraw/TTL/auth; SQLite
unencrypted; tracking summary is in-memory only; CI may lag unpushed commits.

## Repo Landmarks

    backend/app/main.py, core/config.py, db.py
    backend/app/models/session.py, assessment.py
    backend/app/services/sessions.py, assessment.py, question_bank.py, scoring.py
    backend/app/api/v1/  health, sessions, assessment
    shared/question_bank.json     Swappable placeholder instrument
    shared/stimuli_manifest.json  Sole stimulus task
    docs/STIMULUS_RIGHTS_AND_DESIGN.md
    frontend/public/stimuli/      captions + transcript; mp4 dropped in locally
    frontend/src/App.tsx          welcome → consent → intake → questionnaire
                                  → camera → calibration → stimulus (4A/4B)
                                  → session_done
    frontend/src/pages/           Welcome, Consent, Intake, Questionnaire,
                                  CameraCheck, Calibration, StimulusTaskPage
    frontend/src/components/      ResearchDisclaimer, StimulusPlayer
    frontend/src/lib/             api.ts, sessionStorage.ts, camera.ts,
                                  cameraQuality.ts, faceLandmarker.ts,
                                  localFeatures.ts, stimuliManifest.ts,
                                  stimulusTracking.ts, useStimulusTracking.ts
    frontend/public/mediapipe/    NOTICE + LICENSE; wasm/ and .task via postinstall
    scripts/                      run-backend.sh, dev.sh, smoke-phase0.sh
    .local/                       gitignored operator notes

## Domain Model

    sessions 1 -- * question_responses
    Stage: created → consented → intake_complete
         → questionnaire_in_progress → questionnaire_complete
    Client-only after that: camera check → calibration → stimulus
         (optional local tracking buffer) → session checkpoint.
    Tracking frames exist only in tab memory. Not written to SQLite.
    Consent stores three required flags plus optional camera_optional.

## Non-Obvious Decisions

- Dev deps (ruff/mypy) in requirements-dev.txt; Vitest needs explicit cleanup
  in setup.ts; oxlint fails on warnings; CI uses per-directory working-dir.
- **Camera (3A):** `getUserMedia` audio:false only; generation counter on
  unmount. 4B reuses `requestVideoOnlyStream` / `stopMediaStream`.
- **MediaPipe:** self-hosted `/mediapipe/`. 4B enables blendshapes on the
  shared Face Landmarker singleton so blink_estimate can be filled.
- **Optional camera consent** still fail-closed. 4B never calls getUserMedia
  when `camera_optional` is not true; the clip can still be watched or skipped.
- **4B loop** samples the hidden webcam element, not the stimulus `<video>`.
  Timestamps are clip `currentTime` in ms. Pause stops rAF and keeps the
  stream; end/skip/back/unmount stop the stream and clear the frame buffer
  after summarizing into App state.
- **No MediaRecorder, toBlob, toDataURL, or frame uploads.** Transcript
  `fetch` is text-only. No new backend endpoints.
- **localFeatures.ts** is unused by the live 4B path (older numeric helper).
- docker never verified on this machine.

## Session Handoff

2026-08-13 · `feat/phase-4b-stimulus-tracking` · Phase 4B local tracking
during stimulus (in-memory frames + summary, camera consent honored).
Next: examiner gate. Phase 4C not started.
