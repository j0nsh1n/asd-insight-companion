/**
 * Swappable stimulus config (Phase 3C).
 * Loaded from repo shared/stimulus.json via Vite alias @shared.
 */

import stimulusJson from '@shared/stimulus.json'

export type StimulusConfig = {
  stimulus_id: string
  title: string
  description: string
  video_url: string
  min_watch_seconds: number
  note?: string
}

export function getStimulusConfig(): StimulusConfig {
  const raw = stimulusJson as StimulusConfig
  return {
    stimulus_id: String(raw.stimulus_id),
    title: String(raw.title),
    description: String(raw.description),
    video_url: String(raw.video_url),
    min_watch_seconds: Math.max(1, Number(raw.min_watch_seconds) || 5),
    note: raw.note ? String(raw.note) : undefined,
  }
}
