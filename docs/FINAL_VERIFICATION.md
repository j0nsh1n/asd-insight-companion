# Final verification matrix

Research prototype only. This tool does not diagnose autism and cannot
determine whether someone is autistic.

Start the app with `./scripts/dev.sh` (backend `127.0.0.1:8000`, frontend
`127.0.0.1:5173`). Do not mark a row Pass unless you ran that scenario or an
automated test already proves it. Leave unverified rows as
`MANUAL VERIFICATION REQUIRED`.

Related automated commands: `docs/TESTING.md`. Demo walkthrough:
`docs/DEMO_SCRIPT.md`.

| Scenario | Expected behavior | Actual result | Pass/Fail | Tester/date | Notes |
|---|---|---|---|---|---|
| 1. Happy path: consent → intake → questionnaire → optional camera/calibration → stimulus → feature POST → results | Session summary loads; safety notice visible; quality is completeness, not a score | MANUAL VERIFICATION REQUIRED | | | Unit tests cover pieces, not a live E2E walk |
| 2. Consent declined (required boxes unchecked) | Cannot reach intake; no questionnaire/features/results | MANUAL VERIFICATION REQUIRED | | | Automated: `Consent.test.tsx` blocks submit; `POST /intake` without consent is 403 |
| 3. Incomplete questionnaire | Cannot treat session as complete; cannot open a normal results path | MANUAL VERIFICATION REQUIRED | | | Automated: features before complete → 403 `questionnaire_not_complete` |
| 4. Camera permission denied | Continue without camera; partial results; no getUserMedia after decline | MANUAL VERIFICATION REQUIRED | | | Automated: App declined-camera path never calls getUserMedia |
| 5. No camera / camera in use | Retry or skip; no crash | MANUAL VERIFICATION REQUIRED | | | CameraCheck maps NotFound / NotReadable and offers continue without camera |
| 6. No face / multiple faces / low light / unstable tracking | Text quality feedback; retry or skip; no unsupported estimates | MANUAL VERIFICATION REQUIRED | | | Quality gate disables Continue until pass |
| 7. Calibration limited or skipped | Blink/head-motion not shown as valid | MANUAL VERIFICATION REQUIRED | | | Skip reports `limited`; Results can suppress estimates |
| 8. Stimulus file missing or fails | Alert; skip still works; camera/tracking stop | MANUAL VERIFICATION REQUIRED | | | StimulusTaskPage missing-clip alert; skip posts zeros |
| 9. Stimulus skipped | Partial, non-diagnostic result; no punitive copy | MANUAL VERIFICATION REQUIRED | | | Automated: results status `partial` when video skipped |
| 10. Feature submission failure | Retry / Continue to summary / Return / Start over; no false success | MANUAL VERIFICATION REQUIRED | | | Automated: App test for failed POST stays on recovery |
| 11. Results request failure | Retry; no other session’s summary | MANUAL VERIFICATION REQUIRED | | | ResultsPage clears summary on session id change; Retry button |
| 12. Refresh / back | Cannot skip consent/questionnaire; camera stops; no raw media in storage | MANUAL VERIFICATION REQUIRED | | | Only session id in `sessionStorage`; no URL router |
| 13. Keyboard-only core flow | Complete skip path without a mouse; visible focus; no trap | MANUAL VERIFICATION REQUIRED | | | Skip-to-main + `:focus-visible` exist; no Playwright |
| 14. Narrow layout (360px) | Primary actions visible; no horizontal overflow on core screens | MANUAL VERIFICATION REQUIRED | | | Mobile CSS stacks actions; needs a human check |
| 15. Privacy (DevTools Network) | Feature POST is JSON numbers only; `media_uploaded: false`; no video/audio/image/frame | MANUAL VERIFICATION REQUIRED | | | Automated: extra media keys 422; CI privacy grep |
| 16. Production config | `/docs` `/redoc` `/openapi.json` 404 when `ENVIRONMENT=production`; 500 is `internal_error`; security headers present | MANUAL VERIFICATION REQUIRED | | | Automated: docs-hidden test; 500/HTTP tests; headers on `/health` |

## Automated coverage (does not replace the matrix)

From `backend/`: `ruff check . && ruff format --check . && mypy app && pytest -q`

From `frontend/`: `npm run lint && npm test && npm run build`

`.github/workflows/ci.yml` runs backend, frontend, privacy grep, and
markdown on pull requests and on pushes to `main` and `feat/**`.
`.github/workflows/codeql.yml` runs on pushes to `main`, on pull
requests, and weekly. It does not use a `feat/**` push trigger.
