/**
 * Phase 4A stimulus task loader.
 * Metadata comes from shared/stimuli_manifest.json — do not hardcode in JSX.
 */

import manifestJson from '@shared/stimuli_manifest.json'

export type StimulusRights = {
  source_type: string
  rights_status: string
  actor_consent_required: boolean
  minor_actors_allowed: boolean
}

export type StimulusAccessibility = {
  captions_required: boolean
  descriptive_transcript_required: boolean
  keyboard_controls_required: boolean
  skip_allowed: boolean
}

export type StimulusTaskManifest = {
  task_version: string
  title: string
  duration_target_seconds: number
  video_file: string
  captions_file: string
  transcript_file: string
  video_description: string
  participant_instruction: string
  rights: StimulusRights
  accessibility: StimulusAccessibility
}

export function getStimulusTaskManifest(): StimulusTaskManifest {
  const raw = manifestJson as StimulusTaskManifest
  return {
    task_version: String(raw.task_version),
    title: String(raw.title),
    duration_target_seconds: Math.max(1, Number(raw.duration_target_seconds) || 1),
    video_file: String(raw.video_file),
    captions_file: String(raw.captions_file),
    transcript_file: String(raw.transcript_file),
    video_description: String(raw.video_description),
    participant_instruction: String(raw.participant_instruction),
    rights: {
      source_type: String(raw.rights.source_type),
      rights_status: String(raw.rights.rights_status),
      actor_consent_required: Boolean(raw.rights.actor_consent_required),
      minor_actors_allowed: Boolean(raw.rights.minor_actors_allowed),
    },
    accessibility: {
      captions_required: Boolean(raw.accessibility.captions_required),
      descriptive_transcript_required: Boolean(
        raw.accessibility.descriptive_transcript_required,
      ),
      keyboard_controls_required: Boolean(
        raw.accessibility.keyboard_controls_required,
      ),
      skip_allowed: Boolean(raw.accessibility.skip_allowed),
    },
  }
}
