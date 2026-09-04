# Final verification matrix

Research prototype only. This tool does not diagnose autism and cannot
determine whether someone is autistic.

Start the app with `./scripts/dev.sh` (backend `127.0.0.1:8000`, frontend
`127.0.0.1:5173`). Do not mark a row Pass unless you ran that scenario or an
automated test already proves it. Leave unverified rows as
`MANUAL VERIFICATION REQUIRED`.

Related automated commands: `docs/TESTING.md`.

## Status (2026-09-04)

14 of 22 rows are marked Pass on the strength of an automated test that
already proves the scenario; each cites the test by file. 8 rows still read
`MANUAL VERIFICATION REQUIRED` because no automated test covers them:

- Rows 1, 13, 14, 17, 19 — a live end-to-end walk, keyboard-only operation,
  the 360px layout, clip playback controls, and matching the transcript to
  the picture. These need a human at a browser.
- Rows 5 and 11 — the NotFound / NotReadable camera branches and the
  results Retry / stale-summary behaviour. Both are implemented, and both
  were previously described in a way that implied test coverage that does
  not exist.
- Row 22 — blocked by row 17's manual control check.

Rows 6, 15, and 21 are Pass on automated evidence but still deserve a live
look during the demo: real lighting for the quality gate, and DevTools
Network for the two privacy rows.

| Scenario | Expected behavior | Actual result | Pass/Fail | Tester/date | Notes |
|---|---|---|---|---|---|
| 1. Happy path: consent → intake → questionnaire → optional camera/calibration → stimulus → feature POST → results | Session summary loads; safety notice visible; quality is completeness, not a score | MANUAL VERIFICATION REQUIRED | | | Unit tests cover pieces, not a live E2E walk |
| 2. Consent declined (required boxes unchecked) | Cannot reach intake; no questionnaire/features/results | PASS (automated) | Pass | automated / 2026-09-04 | `Consent.test.tsx` blocks submit and requires all three flags; `App.test.tsx` cannot skip to intake; backend `test_no_consent_blocks_intake`, `test_incomplete_consent_rejected`, `test_results_no_consent_403` |
| 3. Incomplete questionnaire | Cannot treat session as complete; cannot open a normal results path | PASS (automated) | Pass | automated / 2026-09-04 | Backend `test_features_rejects_before_questionnaire_complete`, `test_incomplete_complete_rejected`; `assessmentFlow.test.ts` keeps an incomplete questionnaire on the questionnaire step |
| 4. Camera permission denied | Continue without camera; partial results; no getUserMedia after decline | PASS (automated) | Pass | automated / 2026-09-04 | `App.test.tsx`, `CameraCheck.test.tsx`, `StimulusTaskPage.test.tsx` all assert a declined camera never calls getUserMedia and the session still completes; `camera.test.ts` maps permission denied |
| 5. No camera / camera in use | Retry or skip; no crash | MANUAL VERIFICATION REQUIRED | | | `camera.ts:67,73` maps NotFound/DevicesNotFound and NotReadable/TrackStart, but NO test covers those branches — only permission-denied is tested. Previous note overstated coverage |
| 6. No face / multiple faces / low light / unstable tracking | Text quality feedback; retry or skip; no unsupported estimates | PASS (automated) | Pass | automated / 2026-09-04 | `cameraQuality.test.ts` fails the gate on zero faces, multiple faces, and extreme darkness, and passes one good face with light, pose, stability. Gate logic only — real lighting and pose on a physical device still warrant a human look |
| 7. Calibration limited or skipped | Blink/head-motion not shown as valid | PASS (automated) | Pass | automated / 2026-09-04 | Backend `test_results_low_tracking_is_limited`, `test_results_insufficient_tracking_is_not_a_clinical_score`; `ResultsPage.test.tsx` renders limited tracking as a quality limitation, not a score |
| 8. Stimulus file missing or fails | Alert; skip still works; camera/tracking stop | PASS (automated) | Pass | automated / 2026-09-04 | `StimulusTaskPage.test.tsx` shows the alert when the clip fails to load, skip still advances, the camera stops, and the landmarker closes on unmount |
| 9. Stimulus skipped | Partial, non-diagnostic result; no punitive copy | PASS (automated) | Pass | automated / 2026-09-04 | Backend `test_results_video_skipped_is_partial`, `test_results_no_features_row_is_partial_skip`, `test_results_watched_clip_without_samples_is_not_skipped`; `StimulusTaskPage.test.tsx` skip does not imply a failed task |
| 10. Feature submission failure | Retry / Continue to summary / Return / Start over; no false success | PASS (automated) | Pass | automated / 2026-09-04 | `App.test.tsx` shows retry recovery when the feature submit fails; `Questionnaire.test.tsx` treats `questionnaire_already_complete` as success; `stimulusTracking.test.ts` rounds duration fields so a played clip does not 422 |
| 11. Results request failure | Retry; no other session’s summary | MANUAL VERIFICATION REQUIRED | | | `ResultsPage.test.tsx` covers a missing session only. NO test covers the Retry control or clearing a stale summary when the session id changes. Previous note overstated coverage |
| 12. Refresh / back | Cannot skip consent/questionnaire; camera stops; no raw media in storage | PASS (automated) | Pass | automated / 2026-09-04 | `pagehide` stops the stream in `CameraCheck`, `Calibration`, and `StimulusTaskPage` tests; `sessionStorage.test.ts` stores only the session id; backend `test_resume_after_consent_and_intake`, `test_resume_mid_questionnaire` |
| 13. Keyboard-only core flow | Complete skip path without a mouse; visible focus; no trap | MANUAL VERIFICATION REQUIRED | | | `App.test.tsx` moves focus to `#main-content` after a view change, but tab order, focus visibility, and trap-freedom are not automated. No Playwright |
| 14. Narrow layout (360px) | Primary actions visible; no horizontal overflow on core screens | MANUAL VERIFICATION REQUIRED | | | No automated coverage. Mobile CSS stacks actions; needs a human check |
| 15. Privacy (DevTools Network) | Feature POST is JSON numbers only; `media_uploaded: false`; no video/audio/image/frame | PASS (automated) | Pass | automated / 2026-09-04 | Backend rejects raw media, extra frame fields, media-like keys, and `media_uploaded: true`; `stimulusTracking.test.ts` builds a JSON-only payload with no frame list and `stimulusTracking.test.ts` returns an empty summary with `media_uploaded` false; CI privacy grep. Automated proof only — still show DevTools Network live in the demo |
| 16. Production config | `/docs` `/redoc` `/openapi.json` 404 when `ENVIRONMENT=production`; 500 is `internal_error`; security headers present | PASS (automated) | Pass | automated / 2026-09-04 | Backend `test_docs_hidden_in_production`, `test_unhandled_exception_returns_generic_internal_error`, `test_http_errors_are_not_converted_to_500`, `test_health_sets_security_headers` |
| 17. Final selected local stimulus file loads and plays | Trimmed licensed clip plays with pause, restart, and keyboard controls | MANUAL VERIFICATION REQUIRED | | | Clip selected and encoded (Pexels 6585548, 10.4 s); playback, pause, restart, and keyboard controls still need a human with the .mp4 in place |
| 18. Silent clip requests no microphone permission | No audio `getUserMedia` prompt on the stimulus step | PASS (automated) | Pass | automated / 2026-09-04 | `StimulusTaskPage.test.tsx` never requests microphone audio in either consent state; `camera.test.ts` requests `audio: false` and `assertVideoOnly` rejects streams carrying audio |
| 19. Transcript accurately matches the final trimmed clip | Descriptive transcript reviewed against the trimmed picture | MANUAL VERIFICATION REQUIRED | | | Transcript is written against the encoded clip; a human still has to match it to the picture |
| 20. Skip path works when the clip file is missing | Skip-able alert; skip completes; camera/tracking stop | PASS (automated) | Pass | automated / 2026-09-04 | Same evidence as row 8. The .mp4 is gitignored, so the missing-clip path is this build's default state and is the one under test |
| 21. DevTools Network shows only app/static asset loading; no participant raw-media upload | No video/audio/image/frame upload anywhere; features are JSON numbers only | PASS (automated) | Pass | automated / 2026-09-04 | Extends row 15 to the stimulus step: tracking pauses on pause and uploads nothing on play/ended; the buffer is summarized in memory with `media_uploaded` false. Automated proof only — still show DevTools Network live in the demo |
| 22. Stimulus source and license fields are complete before the demo | All rights fields filled and confirmations ticked in docs/STIMULUS_RIGHTS_AND_DESIGN.md | MANUAL VERIFICATION REQUIRED | | | Rights table in docs/STIMULUS_RIGHTS_AND_DESIGN.md is filled and 7 of 8 confirmations are ticked; the unticked one is 'Pause, restart, skip, and keyboard controls tested', which is row 17's manual check |

## Automated coverage (does not replace the matrix)

From `backend/`: `ruff check . && ruff format --check . && mypy app && pytest -q`

From `frontend/`: `npm run lint && npm test && npm run build`

`.github/workflows/ci.yml` runs backend, frontend, privacy grep, and
markdown on pull requests and on pushes to `main` and `feat/**`.
`.github/workflows/codeql.yml` runs on pushes to `main`, on pull
requests, and weekly. It does not use a `feat/**` push trigger.
