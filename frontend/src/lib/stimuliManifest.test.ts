import { describe, expect, it } from 'vitest'
import { getStimulusTaskManifest } from './stimuliManifest'

describe('getStimulusTaskManifest', () => {
  it('loads the Phase 4A task from shared/stimuli_manifest.json', () => {
    const task = getStimulusTaskManifest()
    expect(task.task_version).toBe('social-interaction-v1')
    expect(task.video_file).toBe('/stimuli/social-interaction-v1.mp4')
    expect(task.captions_file).toBe('/stimuli/social-interaction-v1.en.vtt')
    expect(task.transcript_file).toBe(
      '/stimuli/social-interaction-v1.transcript.md',
    )
    expect(task.accessibility.skip_allowed).toBe(true)
    expect(task.rights.minor_actors_allowed).toBe(false)
  })
})
