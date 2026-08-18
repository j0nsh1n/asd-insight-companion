# ASD Insight Companion

Research-only, non-diagnostic ASD-trait prescreen prototype for adults 18+.

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

## Run locally

```bash
./scripts/dev.sh
```

Backend: `http://127.0.0.1:8000`  
Frontend: `http://127.0.0.1:5173`

See [docs/TESTING.md](docs/TESTING.md) for test commands and a manual
end-to-end matrix.

### Before a demo or a real session

Place an approved attention clip at
`frontend/public/stimuli/social-interaction-v1.mp4`. The file is gitignored
on purpose and is not in the repo. Without it, the video step shows a
skip-able notice (“The video clip isn't available in this build”) instead of
playing. Rights, captions, and replacement guidance:
[docs/STIMULUS_RIGHTS_AND_DESIGN.md](docs/STIMULUS_RIGHTS_AND_DESIGN.md).

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

See [docs/DEMO_CHECKLIST.md](docs/DEMO_CHECKLIST.md) and
[docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md) for judging.
[docs/FINAL_VERIFICATION.md](docs/FINAL_VERIFICATION.md) is the release
matrix. [docs/RELEASE_FREEZE.md](docs/RELEASE_FREEZE.md) is the post-Phase-8
feature freeze. Stimulus rights:
[docs/STIMULUS_RIGHTS_AND_DESIGN.md](docs/STIMULUS_RIGHTS_AND_DESIGN.md).
