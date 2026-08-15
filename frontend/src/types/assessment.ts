/** Research-session summary types (Phase 5). Not a diagnostic score. */

export type SessionDisplayStatus = 'complete' | 'partial' | 'insufficient_data'

export type VideoTaskStatus =
  | 'completed'
  | 'skipped'
  | 'insufficient_tracking'

export type CalibrationStatus = 'passed' | 'limited' | 'not_available'

export type OverallQualityLabel =
  | 'usable_for_research_display'
  | 'limited'
  | 'insufficient'

export type DataQualityBlock = {
  questionnaire_completed: boolean
  questionnaire_item_count: number
  video_task_status: VideoTaskStatus
  tracking_ratio: number
  calibration_status: CalibrationStatus
  overall_quality_label: OverallQualityLabel
}

export type QuestionnaireResponsePattern = {
  mean_response_time_ms: number
  response_time_variability_ms: number
  answer_change_count: number
}

export type HeadMotionSummary = {
  mean_abs_yaw_deg: number
  mean_abs_pitch_deg: number
}

export type VideoTaskSummary = {
  task_completed: boolean
  valid_tracking_duration_ms: number
  mean_blink_estimate: number | null
  head_motion_summary: HeadMotionSummary | null
  attention_estimates_available: boolean
}

export type ResearchTaskObservations = {
  questionnaire_response_pattern: QuestionnaireResponsePattern | null
  video_task_summary: VideoTaskSummary | null
}

export type ExplanationBlock = {
  summary: string
  available_data: string[]
  unavailable_or_limited_data: string[]
  limitations: string[]
  next_steps: string[]
}

export type SafetyBlock = {
  research_only: true
  not_a_diagnosis: true
  no_clinical_probability_provided: true
}

export type ResearchSessionSummary = {
  session_id: string
  status: SessionDisplayStatus
  data_quality: DataQualityBlock
  research_task_observations: ResearchTaskObservations
  explanation: ExplanationBlock
  safety: SafetyBlock
}
