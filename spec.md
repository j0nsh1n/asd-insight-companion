# spec.md — ASD Insight Companion

## Problem

Adults who want a private, non-clinical look at ASD-trait self-report and
optional webcam attention measures have no local tool that is fail-closed on
consent, never uploads raw video, and refuses to emit a diagnosis or
probability. Existing “screening” products overclaim. This prototype exists
to walk one anonymous 18+ research session (consent → placeholder
questionnaire → optional on-device face tracking during a short social clip
→ research-session summary of completeness and limitations) without ever
stating whether someone is autistic.

## Intended Users

- Anyone cloning the repo and running it locally (`127.0.0.1`).
- Hypothetical research participants: adults 18+ only. Not clinicians, not
  minors, not a public diagnostic service.

## Required Behavior

- Fail-closed consent: three required statements must be accepted before
  intake, questionnaire, features, or results. Optional camera is separate
  and may be declined.
- One anonymous session per tab (`sessionStorage` holds the session id
  only). Resume reloads server stage; it cannot skip consent.
- Placeholder questionnaire is one item at a time, labeled unvalidated.
  Required items must be saved before complete. Skip is never a failed
  questionnaire.
- Camera and stimulus are optional. Skip is never treated as failure.
  `getUserMedia` uses `audio: false`. Frames, landmarks, and the clip stay
  in the tab.
- While the clip plays (if camera was allowed), on-device MediaPipe Face
  Landmarker may collect numeric samples. Start hides Skip; when the clip
  ends, Continue posts features with `task_completed: true`. Skip before
  Start posts `task_completed: false`.
- `POST /api/v1/assessment/features` accepts JSON numbers only
  (`extra=forbid`, `media_uploaded` must be false). No video, audio, image,
  frame, or landmark upload.
- Results are a research-session summary: complete / partial /
  insufficient. Video status is skipped vs watched (`task_completed`), not
  “skipped” merely because sample count is zero. No autism score, risk, or
  probability in the UI or results payload.
- Back goes to the previous session step (Consent → Welcome). Forward skips
  past an incomplete stage are blocked.
- Friendly errors are allowlisted. Production hides `/docs`, `/redoc`, and
  `/openapi.json`. Unhandled 500s return `internal_error`.
- Dark/light appearance is local only (`localStorage` key
  `asd-color-theme`); not research data; not sent to the API.

## User Experience

Local web app (React 19 + Vite), not a CLI.

```bash
./scripts/dev.sh
```

- Frontend: `http://127.0.0.1:5173` (secure context for the camera)
- Backend: `http://127.0.0.1:8000`

Example: `GET /api/v1/health` →
`{"status":"ok","service":"asd-insight-companion","version":"0.0.1"}`.

Session path: Welcome → Consent → Intake → Questionnaire → Camera check
(or skip) → Calibration (or skip) → Stimulus (Start / Skip / Continue) →
`POST /features` → research-session summary.

The stimulus file `frontend/public/stimuli/social-interaction-v1.mp4` is
gitignored. Without it, the video step shows a skip-able missing-clip
alert. Current intended clip: licensed silent Pexels stock
(id 6585548, Artem Podrez, ~10.4 s); not a validated autism stimulus.

Persistent safety copy: research prototype only; does not diagnose autism;
cannot determine whether someone is autistic.

## Architecture

- Language/runtime: Python **3.14** (CI `setup-python` and
  `backend/Dockerfile` `FROM python:3.14-slim`); Node **24** (CI
  `setup-node`). PINNED in CI.
- Frameworks (from `backend/requirements.txt` and
  `frontend/package-lock.json` as installed):
  - FastAPI 0.141.1, Uvicorn 0.52.1, Pydantic 2.13.4,
    pydantic-settings 2.15.0
  - React 19.2.8, Vite 8.2.1, TypeScript 6.0.3,
    `@mediapipe/tasks-vision` 0.10.21
- Storage: unencrypted SQLite (`SQLITE_PATH`, default
  `backend/data/app.db`). No SQLCipher. No user accounts.
- Major components:
  - `frontend/src/` — React session UI, `assessmentFlow.ts` view clamp,
    on-device camera + Face Landmarker, JSON-only API client
  - `frontend/public/mediapipe/` — vendored WASM + `face_landmarker.task`
    (gitignored binaries; LICENSE/NOTICE tracked)
  - `frontend/public/stimuli/` — local clip (gitignored `.mp4`) +
    transcript
  - `backend/app/api/v1/` — HTTP: health, sessions, assessment,
    results
  - `backend/app/models/` — Pydantic schemas (`extra=forbid`); not
    `schemas/`
  - `backend/app/services/` — sessions, questionnaire, feature ingest,
    data-quality completeness, safety copy (no LLM)
  - `shared/` — `question_bank.json`, `stimuli_manifest.json`,
    `feature_quality_thresholds.json`
  - `scripts/dev.sh` — local frontend + backend
- External APIs/services: none at runtime. MediaPipe model is vendored on
  `npm install` (download once). No OpenAlex, PubMed, Ollama, or cloud ML.
  Feature POST is numeric JSON only.

HTTP (all under `/api/v1`):

- `GET /health`
- `POST /sessions`, `GET /sessions/{id}`, consent and intake POSTs
- `GET /assessment/questionnaire`, question-response POST, questionnaire
  complete, `POST /assessment/features`
- `GET /results/{session_id}` (read-only)

## Security & Privacy

- No secrets in source. Config via `.env` / `.env.example`
  (`ENVIRONMENT`, `CORS_ORIGINS`, `SQLITE_PATH`, `VITE_API_BASE_URL`).
- Dependencies pinned in `backend/requirements.txt`,
  `backend/requirements-dev.txt`, and `frontend/package-lock.json`.
  There is no Dependabot config in `.github/` (version-update PRs are not
  part of this repo’s workflow).
- Raw webcam/audio/image/frame/landmark data never uploaded or written to
  disk. CI privacy grep fails the build on `MediaRecorder(`, `toBlob(`,
  `toDataURL(`, `UploadFile`, `RTCPeerConnection` in app source (tests
  excluded).
- `FeaturePayload.media_uploaded` is always false; extra keys 422.
- Session id may be shown truncated in the UI; do not put API keys or
  `.env` on demo recordings.
- Adults 18+ only. Stimulus: no minor actors; silent licensed stock clip;
  people depicted do not endorse the project.
- Application source is MIT (`LICENSE`, Copyright 2026 Jonathan Shin).
  Vendored MediaPipe WASM/model remain Apache-2.0 (see
  `frontend/public/mediapipe/LICENSE` and `NOTICE`). The Pexels clip is
  gitignored and covered by the Pexels License, not this MIT grant.

## Validation & Tooling

- Lint: `cd backend && ruff check . && ruff format --check .` (Ruff
  0.16.2) and `cd frontend && npm run lint` (`oxlint --deny-warnings`).
- Types: `cd backend && mypy app` (mypy 2.3.0); frontend `tsc -b` via
  `npm run build`.
- Tests: `cd backend && pytest -q`; `cd frontend && npm test` (vitest
  run) then `npm run build`.
- CI: `.github/workflows/ci.yml` (backend, frontend, privacy grep,
  markdown) on PRs and pushes to `main` and `feat/**`. CodeQL is separate
  (`.github/workflows/codeql.yml`).
- No Playwright. Live camera, keyboard, and viewport checks are not
  covered by unit tests. Do not treat those tests as a live session Pass.
- Feature freeze: no new scoring, risk, probability, or media-upload
  APIs. The licensed silent stock clip, CSS restyle, and appearance-only
  dark/light toggle are already in. No new integrations.

## Acceptance Criteria

- [ ] Consent blocks intake/features/results until the three required
      statements are accepted.
- [ ] Feature POST is JSON numbers only; `media_uploaded` is false; extra
      media keys are rejected.
- [ ] Results never show an autism diagnosis, risk, or probability.
      Completeness is complete / partial / insufficient. Watched vs
      skipped follows `task_completed`.
- [ ] Camera and clip are skippable; skip is not failure. `getUserMedia`
      is `audio: false`.
- [ ] Back is previous step; welcome only from Consent (or Start over).
- [ ] All validation commands above exit 0.
- [ ] CHANGELOG.md updated for user-visible changes.
- [ ] Live camera, keyboard, and viewport checks stay a human run;
      unit tests do not tick them.
