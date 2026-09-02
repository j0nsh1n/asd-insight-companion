import { describe, expect, it } from 'vitest'
import { getStimulusTaskManifest } from './stimuliManifest'

describe('getStimulusTaskManifest', () => {
  it('loads the Phase 4A task from shared/stimuli_manifest.json', () => {
    const task = getStimulusTaskManifest()
    expect(task.task_version).toBe('social-interaction-v1')
    expect(task.video_file).toBe('/stimuli/social-interaction-v1.mp4')
    expect(task.captions_file).toBeUndefined()
    expect(task.transcript_file).toBe(
      '/stimuli/social-interaction-v1.transcript.md',
    )
    expect(task.audio_present).toBe(false)
    expect(task.accessibility.skip_allowed).toBe(true)
    expect(task.accessibility.dialogue_captions_required).toBe(false)
    expect(task.research_status.validated_autism_stimulus).toBe(false)
    expect(task.rights.source_type).toBe('licensed_stock_video')
  })
})
