# Stimulus rights and design (template)

The clip below is a licensed stock asset selected for technical demonstration.
Re-check this file before any real-participant deployment.

## Intent

- source_type: licensed stock clip, locally hosted (Pexels, selected
  2026-08-31)
- intent: research-only, not diagnostic. This stimulus is a generic
  technical-demo asset, not a clinical instrument, and produces no
  diagnostic output.

## Task

| Field | Value |
|---|---|
| `task_version` | social-interaction-v1 |
| Title | Neutral Two-Person Conversation |
| Duration target | ~10 seconds (full clip length) |
| Video path | `/stimuli/social-interaction-v1.mp4` |
| Captions | none — the clip is silent and has no caption track |
| Transcript | `/stimuli/social-interaction-v1.transcript.md` |

## Rights

| Field | Value |
|---|---|
| Platform / source | Pexels |
| Exact source page URL | https://www.pexels.com/video/two-people-talking-6585548/ |
| Creator name | Artem Podrez |
| Download date | 2026-08-31 |
| Original downloaded filename | `6585548-uhd_3840_2160_30fps.mp4` |
| Local file path | `frontend/public/stimuli/social-interaction-v1.mp4` |
| License reviewed (yes/no) | yes — Pexels License; source page marked "Free to use" |
| Clip trimmed (yes/no) | no — full length kept; re-encoded 3840x2160 to 1280x720 and audio stripped |
| Trimmed duration | 10.4 s (unchanged from source) |

Explicit confirmations:

- [x] No audio or dialogue is used; the clip is silent
      (source has no audio stream; encoded with `-an`)
- [x] Clip contains adults only; no minors
      (checked across sampled frames spanning the full clip)
- [x] No visible brands, logos, or identifying documents
- [x] No endorsement is implied by the people depicted
      (disclaimer recorded in `shared/stimuli_manifest.json`)
- [x] Clip is a generic licensed demo stimulus, NOT a validated
      autism-assessment stimulus
- [x] No real participant video is used anywhere in the demo
- [x] Transcript reviewed against the final encoded clip
- [x] Pause, restart, skip, and keyboard controls tested live

## Design constraints (do not weaken)

- Neutral viewing: no “look at their eyes / faces” or diagnostic framing
- Captions are required only when the clip has dialogue; a silent clip
  requires a descriptive transcript instead
- Descriptive transcript required and linked from the task page
- Keyboard-operable controls (native video controls + Start / Skip / Back)
- Skip is always allowed and is not treated as failure
- No autoplay
- No camera, tracking, playback telemetry, or scoring on this step (Phase 4A)

## Replacement checklist

If the clip is ever replaced:

1. Drop the new licensed `.mp4` at `frontend/public/stimuli/social-interaction-v1.mp4`
2. Replace the transcript with text that matches the new picture
3. Update `shared/stimuli_manifest.json` (title, duration, description, rights)
4. Re-read this file and redo the rights table and confirmations
