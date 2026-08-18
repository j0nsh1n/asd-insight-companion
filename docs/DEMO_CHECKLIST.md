# Demo checklist

Research prototype only. This tool does not diagnose autism and cannot
determine whether someone is autistic.

## Pre-demo startup

- [ ] `./scripts/dev.sh` — backend `:8000`, frontend `:5173`
- [ ] Optional clip at `frontend/public/stimuli/social-interaction-v1.mp4`
      (gitignored). Without it, the video step is skippable.
- [ ] Camera is optional. A questionnaire-only path is enough.
- [ ] Say the safety line below before showing Results.

## Happy path

Welcome → accept three required consent items (camera optional) → intake →
finish the placeholder questionnaire → camera check or skip → calibration
or skip → watch or skip the clip → research-session summary.

## Camera-denied fallback

Decline the optional camera item or the browser prompt. Continue without
camera through calibration skip and video skip. Results should be **partial**
with no blink/head-motion estimates.

## Stimulus-skipped fallback

Skip the video task. Network tab: `POST /api/v1/assessment/features` is
JSON only, `media_uploaded: false`, no frames. Results stay non-diagnostic.

## Network / privacy check

In DevTools → Network, confirm no image, video, audio, or frame payloads
leave the browser.

## Safety line to say aloud

“This is a research prototype only. It does not diagnose autism and cannot
determine whether someone is autistic. If you have questions or ongoing
concerns, consider discussing them with a qualified healthcare
professional.”

## Backup if camera or backend fails

- Camera fail: Continue without camera / Skip video task.
- Backend down: Welcome shows backend error; after a failed save, use
  Retry or Start over. Do not invent a score.
