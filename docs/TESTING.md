# Testing

## Automated

From `backend/`:

```bash
ruff check .
ruff format --check .
mypy app
pytest -q
```

From `frontend/`:

```bash
npm run lint
npm test
npm run build
```

CI (`.github/workflows/ci.yml`) runs those jobs plus CodeQL. There is no
Playwright suite; do not treat unit tests as a substitute for the matrix
below.

Refresh behavior: only the anonymous session id is kept in tab
`sessionStorage`. Raw media is never stored. After questionnaire complete,
resume returns to the camera step unless `features_recorded` is true, in
which case resume opens the research-session summary. There is no URL
router, so typing a later path or using Back/Forward cannot skip consent.

## Manual end-to-end matrix

Start with `./scripts/dev.sh`.

| Case | What to do | Expected |
|---|---|---|
| Happy path | Accept consent (camera on), intake, finish questionnaire, pass camera, finish calibration, watch or skip clip after starting it | Results show questionnaire notes; video status completed or skipped honestly; safety notice visible; next-step professional wording |
| Consent decline | Leave a required checkbox off | Cannot reach intake |
| Incomplete questionnaire | Stop mid-questionnaire, refresh, resume | Returns to the unanswered item; cannot open results |
| Camera denied | Decline camera at consent or deny the browser prompt | Continue without camera; partial results; no getUserMedia after decline |
| Camera low quality | Enable camera with poor lighting / no face | Continue stays disabled until the gate passes, or use Continue without camera |
| Calibration limited | Skip calibration camera | Stimulus still offered; blink/head-motion not shown as valid |
| Stimulus skipped | Skip video task | `POST /assessment/features` JSON only; results `partial`; no clinical conclusion |
| Missing video file | Start task when `.mp4` is absent | Alert that the clip is missing; skip still works |
| Feature endpoint failure | Stop the backend before Skip | Recovery: Retry / Continue to summary / Return / Start over. Do not show a successful save |
| Results endpoint failure | Break `GET /results` after a successful save | Retry on the results page; safety notice still visible |
| Refresh / back | Refresh after questionnaire; after features | Cannot bypass consent; recorded features resume to results, not a second write |
| Keyboard only | Tab through a full skip path | Visible focus; no trap; Enter/Space on buttons |
| Narrow viewport | 360px wide | Primary actions stay visible; no horizontal overflow |
| Network tab | Skip or complete the video task | No image/video/audio/frame payloads; `media_uploaded: false` |
