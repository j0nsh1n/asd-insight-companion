# ASD Insight Companion

Research-only, non-diagnostic ASD-trait prescreen prototype for adults 18+.

## What this is

ASD Insight Companion is an anonymous, research-only session prototype
for adults 18+. It shows how a webcam-based research session can keep raw
video in the participant's browser and avoid overclaiming, even by accident.

### What it is / is not

| Is | Is not |
|---|---|
| Research-only ASD-trait prescreen session prototype | Autism diagnosis, risk, or probability |
| Fail-closed consent (3 required statements; camera optional) | A required camera or a required video |
| On-device MediaPipe face tracking in the browser tab | Raw video, audio, frame, or landmark upload |
| JSON numeric features only (`media_uploaded: false`) | A clinical instrument |
| Results reported as complete / partial / insufficient | A score, likelihood, or medical advice |

Skip is never treated as failure. The camera can be declined and the session
still completes — honestly, as a partial result.

### Architecture in one sentence

Browser (React 19 + MediaPipe Face Landmarker, fully on-device) → FastAPI +
Pydantic (`extra=forbid`, so media fields are rejected outright) → SQLite
anonymous session with numeric JSON → research-session summary.

### Proof points

- **Privacy you can watch:** finish the camera task with DevTools → Network
  open — the only payload is JSON numbers and `media_uploaded` is false.
  A CI privacy grep fails the build on raw-media upload paths.
- **Accessibility as engineering:** WCAG non-text-contrast-verified palette,
  keyboard-operable controls, text-not-color quality checklists, a
  descriptive transcript matched to the actual (silent, licensed) footage,
  reduced-motion support.
- **Stimulus rights:** [docs/STIMULUS_RIGHTS_AND_DESIGN.md](docs/STIMULUS_RIGHTS_AND_DESIGN.md).
- **Tests:** `cd frontend && npm test` and `cd backend && pytest -q`. CI
  also runs a privacy grep so raw-media upload APIs cannot sneak in.

### Run it locally

```bash
./scripts/dev.sh
```

Frontend [http://127.0.0.1:5173](http://127.0.0.1:5173) (localhost is the
secure context the camera needs) · Backend
[http://127.0.0.1:8000](http://127.0.0.1:8000). First time only: `npm install`
in `frontend/` vendors the MediaPipe WASM. The stimulus clip is gitignored —
place a licensed copy at `frontend/public/stimuli/social-interaction-v1.mp4`
or the video step shows its honest skip-able notice.

**Research prototype only. This tool does not diagnose autism and cannot
determine whether someone is autistic. It must not be used for medical
decisions.**

## Current prototype scope

The local app walks through one anonymous session:

Welcome → consent → intake → placeholder questionnaire → optional camera
quality and calibration → optional attention clip → numeric feature save →
research-session summary.

- Consent is fail-closed. Intake and later steps are blocked until the three
  required statements are accepted.
- Camera use is optional. Video, audio, frames, and landmarks stay in the
  browser. Only anonymous JSON numbers are posted. Raw media is never
  uploaded or retained.
- Results report session completeness and descriptive task notes. There is
  no autism probability, risk score, or clinical confidence.

## Stack

- Frontend: React 19, Vite, TypeScript, on-device MediaPipe Face Landmarker
- Backend: FastAPI (Python 3.14), Pydantic, SQLite
- Local run: `./scripts/dev.sh` (optional `docker compose` skeleton)

## Known limitations

- The questionnaire is a development placeholder, not a validated instrument.
- One short stimulus task cannot assess autism.
- Webcam estimates depend on lighting, device, pose, and tracking quality.
- No clinical diagnosis, probability, or clinical conclusion is produced.
- Raw media is never uploaded or retained.
- Calibration is client-only; the server does not store a pass/fail.
- This prototype must not be used for medical decisions.

## First-time setup

```bash
python3 -m venv backend/.venv && backend/.venv/bin/pip install -r backend/requirements.txt
cd frontend && npm install
```

`npm install` vendors the MediaPipe WASM and face-landmarker model into
`frontend/public/mediapipe/` (gitignored; LICENSE and NOTICE are tracked) and
needs network access the first time; without it the camera quality step cannot
load.

## Run locally

```bash
./scripts/dev.sh
```

Backend: `http://127.0.0.1:8000`  
Frontend: `http://127.0.0.1:5173`

### Before a real session

Place an approved attention clip at
`frontend/public/stimuli/social-interaction-v1.mp4`. The file is gitignored
on purpose and is not in the repo. Without it, the video step shows a
skip-able notice (“The video clip isn't available in this build”) instead of
playing. Rights, transcript, and replacement guidance:
[docs/STIMULUS_RIGHTS_AND_DESIGN.md](docs/STIMULUS_RIGHTS_AND_DESIGN.md).

The current stimulus is a locally hosted, licensed, silent stock clip used
for technical demonstration. It is not a validated autism-assessment
stimulus. Raw participant webcam media is never uploaded or retained.

## Environment

Copy [`.env.example`](.env.example) to `.env`. Placeholders only.

| Variable | Purpose |
|---|---|
| `CORS_ORIGINS` | Allowed frontend origins (comma-separated) |
| `ENVIRONMENT` | `development` (OpenAPI `/docs` on) or `production` (docs off) |
| `SQLITE_PATH` | Optional SQLite file path |
| `VITE_API_BASE_URL` | Frontend API base (build-time for production builds) |

Camera access needs a secure context: localhost in development, HTTPS when
deployed. Docker Compose (`docker compose up --build`) is an optional local
skeleton; `./scripts/dev.sh` is the usual path.

## Commands

| Area | Command |
|---|---|
| Backend lint / types / tests | `cd backend && ruff check . && ruff format --check . && mypy app && pytest -q` |
| Frontend lint / tests / build | `cd frontend && npm run lint && npm test && npm run build` |

Stimulus rights for the local clip:
[docs/STIMULUS_RIGHTS_AND_DESIGN.md](docs/STIMULUS_RIGHTS_AND_DESIGN.md).

## License

Application source is [MIT](LICENSE) (Copyright 2026 Jonathan Shin).
Vendored MediaPipe assets under `frontend/public/mediapipe/` are Apache-2.0
(see that directory’s LICENSE and NOTICE). The gitignored stimulus `.mp4`
is a Pexels-licensed stock clip, not covered by the MIT grant.
