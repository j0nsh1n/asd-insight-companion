# ASD Insight Companion

Research-only, non-diagnostic ASD-trait prescreen prototype for adults 18+.

**Research prototype only. This tool does not diagnose autism and cannot
determine whether someone is autistic.**

## Current prototype scope

The local app walks through one anonymous session:

Welcome → consent → intake → placeholder questionnaire → optional camera
quality and calibration → optional attention clip → numeric feature save →
research-session summary.

- Consent is fail-closed. Intake and later steps are blocked until the three
  required statements are accepted.
- Camera use is optional. Video, audio, frames, and landmarks stay in the
  browser. Only anonymous JSON numbers are posted.
- Results report session completeness and descriptive task notes. There is
  no autism probability, risk score, or clinical confidence.

## Known limitations

- The questionnaire is a development placeholder, not a validated instrument.
- One short stimulus task cannot assess autism.
- Webcam estimates depend on lighting, device, pose, and tracking quality.
- No clinical diagnosis or probability is produced.
- Raw media is never uploaded or retained.
- Calibration is client-only; the server does not store a pass/fail.

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

## Commands

| Area | Command |
|---|---|
| Backend lint / types / tests | `cd backend && ruff check . && ruff format --check . && mypy app && pytest -q` |
| Frontend lint / tests / build | `cd frontend && npm run lint && npm test && npm run build` |
