# Devpost Submission — ASD Insight Companion

Hack for Humanity | Summer 2026
Paste-ready text for each Devpost field. Claims-safe throughout — every
statement matches what the build actually does (main @ cedd976).

---

## Project name

ASD Insight Companion

## Tagline / elevator pitch

A privacy-first, non-diagnostic research session prototype: the webcam never
leaves the browser, the server sees only aggregate numbers, and the app never
pretends that means a diagnosis.

## Tracks and prizes to enter

- Health track: **Best Mental Health Tool**
- AI/ML track: **Responsible AI** (primary target — strict privacy/data safety)
- Consider: **Best Design** (WCAG-driven restyle, accessibility-first flows)
- Public Voting (Sept 5–11) — use the 60-second cut for sharing

## Built with (Devpost tags)

react · typescript · vite · fastapi · pydantic · sqlite · mediapipe ·
vitest · pytest · github-actions

---

## Inspiration

Behavioral health tooling is moving toward the webcam. Attention- and
gaze-based research keeps showing promise, and a wave of products now ask
people — often people seeking answers about themselves — to sit in front of
a camera. That raises two problems that have nothing to do with model
accuracy: where does the footage go, and does the product honestly say what
it is? Autism assessment for adults already involves long waitlists and high
costs, which makes overpromising tools genuinely harmful.

The question that became this project: can you build the full session
pipeline for this kind of tool — consent, self-report, camera task, results —
so that privacy is a property of the architecture rather than a promise in a
policy page, and so that the product can never overclaim, even by accident?

## What it does

ASD Insight Companion walks an adult (18+) through a complete anonymous
research session:

- **Fail-closed consent.** Three required statements gate everything; the
  camera is a separate, optional checkbox. Declining it never blocks or
  penalizes the session.
- **Accessibility-aware intake and a self-report task.** One question at a
  time, progress visible, Next disabled until answered. This build uses a
  placeholder questionnaire — a banner on every item says so — not a
  validated clinical instrument.
- **An optional, on-device camera activity.** A text-based quality checklist
  (never color-only), a short calibration, then a brief licensed, silent
  stock video while MediaPipe face tracking runs entirely in the browser
  tab. The camera request is video-only; there is no microphone.
- **A research-session summary.** Completeness and limitations — which task
  data was available and which was limited — with professional follow-up
  wording. No score. No probability. No diagnosis. If the camera was
  declined, the app returns an honest partial session rather than inventing
  numbers it never measured.

The privacy boundary is demonstrable, not rhetorical: the only request the
camera activity produces is a POST of JSON numeric summaries (a tracking
ratio, durations, quality flags). No video, no audio, no images, no frames,
no landmarks — `media_uploaded` is false.

## How we built it

- **Frontend:** React 19, Vite, TypeScript. MediaPipe Face Landmarker runs
  on-device from self-hosted WASM and model files — no CDN calls during a
  session. Frame records live in memory only and are discarded; the camera
  stream is stopped on end, skip, back, and unmount.
- **Backend:** FastAPI + Pydantic with `extra=forbid`, so any unexpected
  field — including anything resembling raw media — is rejected with a 422.
  Anonymous sessions in SQLite; no accounts, no history.
- **Shared contract:** the stimulus manifest and tracking-quality thresholds
  live in shared JSON consumed by both client and server.
- **Process as a feature:** 19 phased pull requests, each gated by CI —
  frontend (lint, 103 vitest tests, production build), backend (ruff, mypy,
  79 pytest tests), markdown lint, CodeQL — plus a fail-closed privacy guard
  that scans every change for raw-media upload paths. The project carries a
  written release freeze with a dated, justified amendment log.
- **Stimulus diligence:** the demo clip is licensed Pexels stock footage
  (creator: Artem Podrez), re-encoded locally with audio stripped, with a
  documented rights record: source URL, license, download date, and an
  explicit non-endorsement note. The media file itself is gitignored; only
  metadata is committed. Because the clip is silent, the descriptive
  transcript is the accessibility accommodation — captions return when a
  future clip has dialogue.

## Challenges we ran into

- **Webcam work under a hard no-upload boundary.** Everything had to happen
  in memory in the tab, with reliable cleanup across end, skip, back,
  refresh, and unmount — and with the server structurally unable to accept
  media even if a client bug tried to send it.
- **Keeping every string honest.** It is easy for a project like this to
  drift into diagnostic language. Copy, manifests, docs, and test names all
  had to carry the same discipline: research-only, non-diagnostic, skip is
  never failure.
- **Rights without a film crew.** The original plan was a team-recorded
  stimulus. Replacing it meant finding properly licensed footage, verifying
  the license terms, documenting the rights record, and rethinking
  accessibility for a silent clip.
- **Scope control at hackathon speed.** A written freeze — and a written
  amendment when the stimulus and restyle needed to land after it — kept the
  final days from turning into unreviewed feature churn.

## Accomplishments that we're proud of

- A privacy story you can watch: open DevTools, finish the camera task, and
  the only payload is JSON numbers. `media_uploaded: false`.
- A CI privacy guard that fails the build on raw-media upload paths —
  privacy enforced by pipeline, not by intentions.
- Accessibility treated as engineering: WCAG non-text contrast verified
  against the palette, keyboard-operable controls, text-not-color quality
  checklists, reduced-motion support, and a descriptive transcript matched
  frame-by-frame to the actual footage.
- 182 automated tests (103 frontend, 79 backend) including a
  mutation-verified test that the stimulus step never requests microphone
  audio.
- A rights record for a stock asset that most hackathon projects would have
  embedded without a second thought.

## What we learned

- Privacy is an architecture, not a policy page. The strongest guarantee in
  this project is that the server cannot accept media — not that it promises
  not to store it.
- Honest scope is a feature. Saying "this is not a diagnosis" everywhere,
  permanently, made every other design decision easier.
- Accessibility requirements follow the stimulus, not a checklist: a silent
  clip needs an accurate descriptive transcript, not a fake caption track.
- A release freeze with a written amendment process is worth the overhead
  even on a two-person-week timeline.

## What's next for ASD Insight Companion

- Collaborate with clinicians on a properly designed, validated stimulus set
  (the current clip is a licensed technical demo, and the app says so)
- Longer stimuli; the 10-second demo window yields intentionally sparse
  aggregate features
- Playwright end-to-end coverage of the live camera paths (deferred by the
  release freeze, not by choice)
- Participant-data lifecycle: withdrawal, time-to-live, encryption at rest
- Ethics review before any session involving real participants

## Links

- Repository: https://github.com/j0nsh1n/asd-insight-companion
- Video: [add after upload — 4:00 max]
- Note for judges: the app runs locally (`./scripts/dev.sh`); the demo video
  shows the full live session including the DevTools network inspection.

## Fill in before submitting

- [ ] Video URL (after recording + upload)
- [ ] Confirm team size ≤ 4 and member details
- [ ] Confirm no code predates the Aug 7, 2026 opening (repo created Aug 7)
- [ ] Optional: attach the 60-second cut as an additional video/image for
      public voting
