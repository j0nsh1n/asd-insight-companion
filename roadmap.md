# roadmap.md — ASD Insight Companion

Note: "Complete when" conditions are verified locally (tests pass, feature
works) and via PR review. One phase may span several small PRs.

## Phase 0 — Scaffold and health
- Tasks:
  - FastAPI health endpoint and React/Vite shell
  - Persistent research-only disclaimer
  - Local run scripts and CI lint/test jobs
- Complete when: `GET /api/v1/health` and the frontend shell run locally
- Status: [x]

## Phase 1 — Consent and anonymous sessions
- Tasks:
  - Fail-closed consent and intake
  - Anonymous session create / get / resume
  - SQLite session persistence
- Complete when: intake is unreachable without the three required statements
- Status: [x]

## Phase 2 — Timed placeholder questionnaire
- Tasks:
  - One-item-at-a-time placeholder bank
  - Per-question timing and answer-change counts
  - Resume to the next unanswered item
- Complete when: questionnaire completes only after required items are saved
- Status: [x]

## Phase 3 — Camera preview, quality gate, and calibration
- Tasks:
  - Local video-only camera preview
  - On-device Face Landmarker quality gate
  - Guided local calibration; optional camera consent
- Complete when: declined camera never calls getUserMedia and the session can continue
- Status: [x]

## Phase 4 — Stimulus, local tracking, and numeric features
- Tasks:
  - One accessible attention clip from the shared manifest
  - In-memory tracking while the clip plays
  - JSON-only `POST /api/v1/assessment/features` (no raw media)
- Complete when: extra media fields 422 and ingest returns quality, not a score
- Status: [x]

## Phase 5 — Research-session summary
- Tasks:
  - Read-only `GET /api/v1/results/{session_id}`
  - Data-quality and descriptive task notes only
  - Results page with safety notice, limitations, and next steps
- Complete when: skipped or low-quality video is partial/limited and no risk field exists
- Status: [x]

## Phase 6 — End-to-end integration and recovery
- Tasks:
  - Client stage resolver and resume-to-results
  - Feature-submit retry without a false success
  - Aligned safety copy, README scope, and testing matrix
- Complete when: consent/questionnaire cannot be skipped and failed saves show recovery
- Status: [x]

## Phase 7 — Hardening and release readiness
- Tasks:
  - Accessibility labels, skip link, and documented keyboard audit
  - Safe errors, security headers, and production-hidden docs
  - CI privacy grep and demo/testing docs
- Complete when: gates pass and the questionnaire-only demo path is documented
- Status: [x]

## Phase 8 — Final validation and feature freeze
- Tasks:
  - Final verification matrix and demo script
  - README / submission links
  - Release freeze (no new features after this phase)
- Complete when: automated gates pass and demo/fallback docs exist
- Status: [x]

## Backlog (unscheduled)
- Licensed AQ-10 (Adult) if written permission is obtained
- Session withdraw, TTL, and encrypted-at-rest storage
- Replace the gitignored placeholder attention clip with an approved recording
- Playwright coverage for the documented manual matrix
