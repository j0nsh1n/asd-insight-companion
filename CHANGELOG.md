# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Session screens use a light healthcare “research notebook” layout (cyan
  paper, teal actions, amber non-diagnostic banner). Safety copy, consent,
  and skip paths are unchanged.
- Welcome tagline drops the stale phase number.
- Form fields and buttons use darker cyan borders so controls stay visible
  on the light panels (WCAG non-text contrast).
- The optional video task moves to a licensed, silent stock clip: captions
  are required only when a clip has dialogue, and a descriptive transcript
  is provided instead. The final clip has not been selected yet.

### Added

- Final verification matrix, judge demo script, and release freeze
  (Phase 8). No new product features.
- Release hardening (Phase 7): skip-to-main link, required-field labels,
  safe 500 bodies, security headers, production-hidden API docs, a CI
  source check that raw-media APIs stay out of the app, and a demo
  checklist.

### Fixed

- README first-time setup (venv, `npm install`, MediaPipe vendor). Demo
  script says raw video is never uploaded. CI vs CodeQL triggers documented
  accurately.
- CI privacy grep now fails on missing scan paths, skips `*.test.ts(x)`,
  and is configured to run on `feat/**` pushes. Unhandled errors are
  covered by tests; consent/intake mark invalid required fields.
- Unknown API error details are no longer shown on recovery screens.
- README now states that raw media is never uploaded or retained, and
  documents that the gitignored attention clip must be added before a demo.

- End-to-end session flow hardening (Phase 6): resume after saved tracking
  notes opens the research-session summary, failed feature saves show retry
  instead of a false success, and a root README plus testing matrix document
  the prototype scope and limitations.
- Research-session summary after the attention clip (Phase 5): a Results
  page and `GET /api/v1/results/{session_id}` combine the stored
  questionnaire and numeric tracking notes, report session completeness,
  and list limitations. This is not a diagnosis, risk score, or clinical
  probability.
- Tracking summaries now include an explicit `data_quality` flag
  (ok / low / insufficient / unavailable), computed from the same shared
  thresholds the API uses. The server still classifies independently.
- Numeric tracking summary sent after the attention clip (Phase 4C): ratios,
  valid-tracking duration, task-completed flag, and blink/head-motion
  averages only. No frames. The API accepts or rejects the JSON and reports
  tracking quality — it does not score autism risk.
- On-device face tracking during the attention clip (Phase 4B): starts with
  the task, pauses when the clip pauses, and stops the camera when the clip
  ends or the participant skips or leaves. Numbers stay in this tab only —
  no frames are recorded or uploaded.
- Accessible attention-clip step (Phase 4A): one local stimulus from
  `shared/stimuli_manifest.json`, captions, a descriptive transcript, Start /
  Skip / Back, and no autoplay. Skipping is allowed and is not scored.
- Optional camera-based attention consent, separate from the three required
  statements. Participants can decline the camera and still finish the
  session; video analysis is never required.
- Guided local face calibration after the camera quality check, then a short
  attention-clip step. Webcam sampling stays in the browser and is summarized
  as numbers only.
- MediaPipe Face Landmarker assets (WASM + model) are served from this app
  instead of third-party CDNs, so a session does not contact jsDelivr or
  Google storage for those files.
- Local camera check after the questionnaire: browser preview only, with
- On-device MediaPipe Face Landmarker quality gate (face count, visibility,
  lighting, head pose, tracking stability). Analysis stays in the browser;
  continue is gated until checks pass (or skip without camera).
  `audio` never requested. Video stays in the tab — nothing is uploaded or
  stored on the server. Participants can continue without camera if access is
  denied or unavailable. Streams stop on cancel, continue, and when leaving
  the step.
- Timed questionnaire stage after intake: one item at a time, progress
  indicator, and a Back control. Items cannot be skipped and the questionnaire
  is unreachable until consent and intake are both complete.
- Per-question research telemetry recorded with each answer: time to first
  interaction, total time on the question, and answer-change count.
- Questionnaire resume: refreshing mid-questionnaire returns to the exact
  unanswered item with previous answers preserved.
- Questionnaire summary stored on completion: total score, per-category
  subscale scores, item count, instrument identifiers, and timing aggregates.
- Swappable question bank at `shared/question_bank.json`, currently a
  development placeholder pending written permission to use the licensed
  AQ-10 (Adult).
- On-screen notice that the questionnaire is a placeholder and not a validated
  clinical instrument.
- Accessibility preferences chosen at intake are now applied to the interface:
  larger text, reduced motion, and screen-reader hints.
- `context.md` and `CHANGELOG.md` adopted as tracked governance files
  (2026-08-07).
- Anonymous research sessions with a fail-closed consent gate: `POST
  /api/v1/sessions`, `GET /api/v1/sessions/{id}`, `POST
  /api/v1/sessions/{id}/consent`, `POST /api/v1/sessions/{id}/intake`.
- Consent screen requiring three separate acknowledgements, with an
  "Agree to all" shortcut. Intake is unreachable until all three are accepted.
- Intake screen collecting age range, language, accessibility preferences, and
  an optional free-text context field.
- Session resume: the session id is kept in browser `sessionStorage`, so a
  reload returns the participant to their current stage.
- SQLite persistence for sessions, created automatically on startup at
  `backend/data/app.db` and overridable via `SQLITE_PATH`.
- Persistent research-only, non-diagnostic disclaimer banner, pinned to the top
  of the viewport on every screen.
- `GET /api/v1/health` and a JSON API root.
- `scripts/run-backend.sh` — starts the backend from any working directory and
  reports clearly when the port is already in use.
- Continuous integration: per-directory backend and frontend jobs, CodeQL
  analysis, and Dependabot updates.
- Backend lint and type checking via `ruff` and `mypy` (strict).

### Changed

- Consent "Agree to all" applies only to the three required statements. The
  camera item is optional and is not folded into that shortcut.
- The data-minimization consent statement now names the response timing,
  time-to-first-interaction, and answer-change data that is collected.
- The questionnaire completion screen no longer shows a numeric score. Scores
  are retained for research only.
- Welcome copy now states the study is for adults 18 and older, matching the
  age options and API validation.
- Intake now warns participants not to enter a name, email, phone number, or
  address in the optional context field.
- `npm run lint` fails on warnings rather than exiting 0.

### Fixed

- Calibration step 1 no longer shows a black preview: the webcam stream is
  attached after the preview element mounts.
- If the attention clip file is missing from this build, the stimulus step
  now says so and still lets the participant skip.
- If the attention clip fails to load or play, sampling stops and the
  participant can continue without the clip instead of being stuck with
  Finish task disabled.
- A questionnaire answer saved at the same moment the questionnaire was
  completed could leave the stored summary disagreeing with the saved answers.
  Answer and completion now take the same write lock.
- The backend container image now includes the question bank file, which it
  previously could not load.
- Questionnaire answers with malformed, out-of-order, or implausibly long
  timings are now rejected instead of stored.
- Answers whose timestamps mixed time zones no longer cause a server error.
- Consent and intake stage transitions are atomic. Concurrent requests
  previously allowed the same session to be consented multiple times and
  overwrote the consent timestamp; exactly one request now succeeds.
- Session creation no longer returns 500 on row mapping.
- Test renders no longer leak between frontend test cases.
