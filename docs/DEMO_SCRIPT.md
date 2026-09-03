# Demo script (about 5 minutes)

Use only this prototype’s placeholder questionnaire and, if present, the
local attention clip. Do not show real participant data, names, emails, or
full session IDs. Do not invent a score if something fails.

## 5-minute judge walkthrough

### 0:00–0:25 — Problem, scope, and safety

This is an anonymous research-session prototype for adults 18+. It walks
through consent, a short self-report task, and an optional on-device camera
clip, then shows a **research-session summary**.

Say: “This is a research-only prototype. It does not diagnose autism or make
medical decisions.”

### 0:25–0:55 — Consent and privacy

Open Consent. Check the three required statements. Leave the camera item
unchecked or checked, and say what you will demo.

Say: “The optional camera activity processes data locally. Raw video is
never uploaded or retained.”

(Implementation: webcam frames stay in the tab and are never posted.)

### 0:55–1:30 — Placeholder questionnaire

Complete two or three items so judges see one-at-a-time flow, progress, and
that Next stays off until an answer is chosen.

Say: “This development version uses a placeholder questionnaire, not a
validated clinical instrument.”

Point at the on-screen placeholder banner.

### 1:30–2:30 — Optional camera and stimulus

Either: enable camera, show the quality checklist (text, not color only),
then a short calibration **or** skip both and say that is allowed.

Then Start the clip. Skip is available before Start and if the clip fails.
After the clip ends, Continue saves the numeric notes and moves on. If the
`.mp4` is missing, the skip-able alert is the honest demo.

Say: “For this prototype, we use a licensed, silent stock interaction clip
to demonstrate the local visual-task pipeline. It is not a validated autism
assessment stimulus.”

Say: “Camera access is optional. Participants can finish the session without
it.”

### 2:30–3:15 — Privacy boundary

With DevTools → Network open, Skip or finish the clip. Select
`POST /api/v1/assessment/features`.

Point out:

- JSON numeric summaries only (`tracking_ratio`, durations, quality)
- no raw video
- no audio
- no image, frame, or landmark upload
- `media_uploaded` is false

### 3:15–4:10 — Results

Show the persistent safety notice, session completeness card, available vs
limited data, and the same professional follow-up wording.

Say: “This is not a diagnosis or probability. It explains which task data
was available or limited.”

### 4:10–4:40 — Safe fallback

If you have not already: decline camera or skip the clip. Results stay
**partial**. No invented blink or head-motion numbers.

Say: “The app returns an honest partial session rather than pretending
unavailable data was measured.”

### 4:40–5:00 — Close

Limitations to state:

- placeholder questionnaire
- one short task
- webcam quality depends on lighting, device, and pose
- not clinically validated
- not for medical decisions

## 60-second version

1. Safety line (research-only, not a diagnosis).
2. Consent + “raw video stays local.”
3. Placeholder banner on the questionnaire.
4. Network: JSON only, `media_uploaded: false`.
5. Results: completeness and limitations, not a probability.

## Camera-denied fallback script

Uncheck optional camera (or deny the browser prompt). Continue without
camera → skip calibration → skip video → Results partial. Do not improvise
tracking numbers. Say the camera step is optional by design.

## Backend-unavailable fallback script

If Welcome shows a backend error, do not pretend the API works. Use
`docs/DEMO_CHECKLIST.md` backup screenshots only if the hackathon allows
them. Walk the architecture: browser → FastAPI → SQLite session + JSON
features → GET results. No live score.

## Data rules for the demo

- Use the built-in placeholder items only.
- Do not paste real clinical answers or identifiable notes in optional
  context.
- Crop or omit the session-id prefix if you record the screen.
