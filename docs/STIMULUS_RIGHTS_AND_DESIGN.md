# Stimulus rights and design (template)

Fill this in before any real-participant deployment. Placeholder clip and
captions in `frontend/public/stimuli/` are **not** study-ready.

## Task

| Field | Value |
|---|---|
| `task_version` | social-interaction-v1 |
| Title | Two-Person Object Organization |
| Duration target | ~45 seconds |
| Video path | `/stimuli/social-interaction-v1.mp4` |
| Captions | `/stimuli/social-interaction-v1.en.vtt` |
| Transcript | `/stimuli/social-interaction-v1.transcript.md` |

## Rights

- [ ] Source type: original team recording (or documented licensed clip)
- [ ] Rights status documented (team-owned or written permission on file)
- [ ] Every on-camera adult has written consent to appear in this research prototype
- [ ] No minor actors (18+ only)
- [ ] No recognizable bystanders, logos, or third-party media in frame
- [ ] Music / voiceover rights cleared, or the clip is silent / team-owned audio

Record the permission file location (do not commit signed forms if they contain PII):

```
permission_record:
  date:
  stored_at:
  contact:
```

## Design constraints (do not weaken)

- Neutral viewing: no “look at their eyes / faces” or diagnostic framing
- Captions required (`kind="captions"`, default on)
- Descriptive transcript required and linked from the task page
- Keyboard-operable controls (native video controls + Start / Skip / Back)
- Skip is always allowed and is not treated as failure
- No autoplay
- No camera, tracking, playback telemetry, or scoring on this step (Phase 4A)

## Replacement checklist

1. Drop the approved `.mp4` at `frontend/public/stimuli/social-interaction-v1.mp4`
2. Replace the `.vtt` and transcript with final text that matches the picture
3. Update `shared/stimuli_manifest.json` if the title, duration, or paths change
4. Re-read this file and tick the rights boxes
