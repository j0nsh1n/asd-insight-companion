# context.md — ASD Insight Companion

## Current State

Branch `feat/phase-3a-camera-preview` @ `4d5d5f2`. Based on Phase 2 work; Phase 3A adds a
**local video-only** camera preview after questionnaire complete.

Gates green as of last full run (Phase 3A + prior):

| Gate | Result |
|---|---|
| Backend `ruff` / `mypy` / `pytest` | pass (41 tests) |
| Frontend `oxlint` / `vitest` / `build` | pass (38+ tests with camera) |

Phases 0–2 feature-complete. Phase 3A (local preview) in progress / fix pass.
**Phase 3B (MediaPipe / quality gate) not started.**

Known gaps: orphan answers if bank version changes mid-dev; score in API but
not UI; no withdraw/TTL/auth; SQLite unencrypted; CI may lag unpushed commits.

## Repo Landmarks

    backend/app/main.py, core/config.py, db.py
    backend/app/models/session.py, assessment.py
    backend/app/services/sessions.py, assessment.py, question_bank.py, scoring.py
    backend/app/api/v1/  health, sessions, assessment
    shared/question_bank.json   Swappable placeholder instrument
    frontend/src/App.tsx        welcome → consent → intake → questionnaire
                                → camera → session_done
    frontend/src/pages/         Welcome, Consent, Intake, Questionnaire,
                                CameraCheck
    frontend/src/lib/           api.ts, sessionStorage.ts, camera.ts
    frontend/src/components/    ResearchDisclaimer (sticky)
    scripts/                    run-backend.sh, dev.sh, smoke-phase0.sh
    .github/workflows/          ci.yml, codeql.yml
    .local/                     gitignored operator notes

## Domain Model

    sessions 1 -- * question_responses
    Stage: created → consented → intake_complete
         → questionnaire_in_progress → questionnaire_complete
    Client-only after that: camera check (local stream) → session checkpoint.
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
- Docker compose context is repo root so `shared/` ships in the image.
- docker never verified on this machine.

## Session Handoff

2026-08-11 · `feat/phase-3a-camera-preview` · Phase 3A local camera preview
landed; fix pass for unmount-during-permission leak + tests + context/changelog
refresh. Next: Phase 3B (Face Landmarker / quality gate) only when scoped —
not started.
