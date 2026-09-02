# Demo checklist

Research prototype only. This tool does not diagnose autism and cannot
determine whether someone is autistic.

Script: [DEMO_SCRIPT.md](DEMO_SCRIPT.md). Matrix:
[FINAL_VERIFICATION.md](FINAL_VERIFICATION.md).

## Pre-demo

- [ ] Charge the device
- [ ] Restart the browser; close Zoom, Discord, and other camera apps
- [ ] Start with `./scripts/dev.sh` (backend `:8000`, frontend `:5173`)
- [ ] Confirm `http://127.0.0.1:5173` (localhost is a secure context)
- [ ] Optional clip at `frontend/public/stimuli/social-interaction-v1.mp4`
      (gitignored). Without it, the video step is skippable
- [ ] Test camera permission once **or** plan the denied/skip route
- [ ] Open DevTools → Network if you will show the JSON POST
- [ ] Hide or crop session IDs; no API keys or `.env` on screen
- [ ] Confirm no real participant data in optional context
- [ ] Prepare allowed screenshots/recording only if hackathon rules permit
- [ ] Say the safety line before Results

## Happy path

Welcome → three required consent items (camera optional) → intake →
placeholder questionnaire → camera check or skip → calibration or skip →
watch the clip and Continue, or Skip before Start → research-session
summary.

## Camera-denied fallback

Decline the optional camera item or the browser prompt. Continue without
camera → skip calibration → skip video. Results **partial**; no
blink/head-motion estimates. Do not improvise a camera result.

## Stimulus-failed / skipped fallback

Missing `.mp4` shows a skip-able alert. Skip video task. Network:
`POST /api/v1/assessment/features` is JSON, `media_uploaded: false`, no
frames. Do not show stale video observations.

## Backend-unavailable fallback

Welcome reports the service is down. After a failed save, use Retry or
Start over. Use backup screenshots only if allowed. Do not invent a score
or pretend the live API works.

## If time is short

Use the 60-second script in `DEMO_SCRIPT.md`: consent/privacy → JSON-only
boundary → honest results.

## Network / privacy check

No image, video, audio, or frame payloads. Feature body is numeric JSON
only.

## Safety line to say aloud

“This is a research prototype only. It does not diagnose autism and cannot
determine whether someone is autistic. If you have questions or ongoing
concerns, consider discussing them with a qualified healthcare
professional.”
