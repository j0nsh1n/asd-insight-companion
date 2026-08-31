# Stimulus rights and design (template)

Fill this in before any real-participant deployment. The placeholder clip
and transcript in `frontend/public/stimuli/` are **not** study-ready.

## Intent

- source_type: licensed stock clip, locally hosted (placeholder until the
  final clip is selected and trimmed)
- intent: research-only, not diagnostic. This stimulus is a generic
  technical-demo asset, not a clinical instrument, and produces no
  diagnostic output.

## Task

| Field | Value |
|---|---|
| `task_version` | social-interaction-v1 |
| Title | Two-Person Object Organization |
| Duration target | ~45 seconds |
| Video path | `/stimuli/social-interaction-v1.mp4` |
| Captions | none — the clip is silent and has no caption track |
| Transcript | `/stimuli/social-interaction-v1.transcript.md` |

## Rights (fill in before any real-participant deployment)

| Field | Value |
|---|---|
| Platform / source | Pexels |
| Exact source page URL | |
| Creator name | |
| Download date | |
| Original downloaded filename | |
| Local file path | `frontend/public/stimuli/social-interaction-v1.mp4` |
| License reviewed (yes/no) | |
| Clip trimmed (yes/no) | |
| Trimmed duration | |

Explicit confirmations:

- [ ] No audio or dialogue is used; the clip is silent
- [ ] Clip contains adults only; no minors
- [ ] No visible brands, logos, or identifying documents
- [ ] No endorsement is implied by the people depicted
- [ ] Clip is a generic licensed demo stimulus, NOT a validated
      autism-assessment stimulus
- [ ] No real participant video is used anywhere in the demo
- [ ] Transcript reviewed against the final trimmed clip
- [ ] Pause, restart, skip, and keyboard controls tested

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

1. Drop the final licensed `.mp4` at `frontend/public/stimuli/social-interaction-v1.mp4`
2. Replace the transcript with final text that matches the trimmed picture
3. Update `shared/stimuli_manifest.json` if the title, duration, or paths change
4. Re-read this file and tick the rights boxes and confirmations
