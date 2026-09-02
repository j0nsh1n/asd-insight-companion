/**
 * Phase 4A stimulus task loader.
 * Metadata comes from shared/stimuli_manifest.json — do not hardcode in JSX.
 */

import manifestJson from '@shared/stimuli_manifest.json'

export type StimulusRights = {
  source_type: string
  source_platform: string
  source_page_url: string
  creator: string
  license: string
  downloaded_on: string
  original_filename: string
  attribution_required: boolean
  credit_provided_voluntarily: boolean
  endorsement_disclaimer: string
}

export type StimulusResearchStatus = {
  validated_autism_stimulus: boolean
  purpose: string
  not_for_medical_decisions: boolean
  task_limitation: string
}

export type StimulusAccessibility = {
  dialogue_captions_required: boolean
  descriptive_transcript_required: boolean
  keyboard_controls_required: boolean
  skip_allowed: boolean
}

export type StimulusTaskManifest = {
  task_version: string
  status: string
  title: string
  duration_target_seconds: number
  video_file: string
  captions_file?: string
  transcript_file: string
  video_description: string
  audio_present: boolean
  audio_required_for_task: boolean
  stimulus_type: string
  participant_instruction: string
  rights: StimulusRights
  research_status: StimulusResearchStatus
  accessibility: StimulusAccessibility
}

function optionalNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

export function getStimulusTaskManifest(): StimulusTaskManifest {
  const raw = manifestJson as StimulusTaskManifest
  const captions_file = optionalNonEmptyString(
    (raw as { captions_file?: unknown }).captions_file,
  )
  return {
    task_version: String(raw.task_version),
    status: String(raw.status),
    title: String(raw.title),
    duration_target_seconds: Math.max(1, Number(raw.duration_target_seconds) || 1),
    video_file: String(raw.video_file),
    ...(captions_file ? { captions_file } : {}),
    transcript_file: String(raw.transcript_file),
    video_description: String(raw.video_description),
    audio_present: Boolean(raw.audio_present),
    audio_required_for_task: Boolean(raw.audio_required_for_task),
    stimulus_type: String(raw.stimulus_type),
    participant_instruction: String(raw.participant_instruction),
    rights: {
      source_type: String(raw.rights.source_type),
      source_platform: String(raw.rights.source_platform),
      source_page_url: String(raw.rights.source_page_url),
      creator: String(raw.rights.creator),
      license: String(raw.rights.license),
      downloaded_on: String(raw.rights.downloaded_on),
      original_filename: String(raw.rights.original_filename),
      attribution_required: Boolean(raw.rights.attribution_required),
      credit_provided_voluntarily: Boolean(raw.rights.credit_provided_voluntarily),
      endorsement_disclaimer: String(raw.rights.endorsement_disclaimer),
    },
    research_status: {
      validated_autism_stimulus: Boolean(
        raw.research_status.validated_autism_stimulus,
      ),
      purpose: String(raw.research_status.purpose),
      not_for_medical_decisions: Boolean(
        raw.research_status.not_for_medical_decisions,
      ),
      task_limitation: String(raw.research_status.task_limitation),
    },
    accessibility: {
      dialogue_captions_required: Boolean(
        raw.accessibility.dialogue_captions_required,
      ),
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
