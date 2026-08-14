import type { DataQualityBlock } from '../types/assessment'

function questionnaireWords(quality: DataQualityBlock): {
  mark: string
  text: string
} {
  if (quality.questionnaire_completed) {
    return {
      mark: 'OK',
      text: `completed (${quality.questionnaire_item_count} items)`,
    }
  }
  return { mark: 'No', text: 'incomplete' }
}

function videoWords(status: DataQualityBlock['video_task_status']): {
  mark: string
  text: string
} {
  if (status === 'completed') return { mark: 'OK', text: 'completed' }
  if (status === 'skipped') return { mark: 'Skip', text: 'skipped' }
  return { mark: 'Limited', text: 'limited' }
}

function trackingWords(label: DataQualityBlock['overall_quality_label']): {
  mark: string
  text: string
} {
  if (label === 'usable_for_research_display') {
    return { mark: 'OK', text: 'usable' }
  }
  if (label === 'limited') {
    return { mark: 'Limited', text: 'limited' }
  }
  return { mark: 'Insufficient', text: 'insufficient' }
}

function calibrationWords(status: DataQualityBlock['calibration_status']): {
  mark: string
  text: string
} {
  if (status === 'passed') return { mark: 'OK', text: 'passed' }
  if (status === 'limited') return { mark: 'Limited', text: 'limited' }
  return { mark: 'N/A', text: 'not available' }
}

type DataQualityCardProps = {
  quality: DataQualityBlock
}

export function DataQualityCard({ quality }: DataQualityCardProps) {
  const questionnaire = questionnaireWords(quality)
  const video = videoWords(quality.video_task_status)
  const tracking = trackingWords(quality.overall_quality_label)
  const calibration = calibrationWords(quality.calibration_status)

  return (
    <section className="result-card" aria-labelledby="dq-title">
      <h2 id="dq-title">Session completeness</h2>
      <p className="muted">
        This is data quality for the stored research tasks, not clinical
        confidence.
      </p>
      <ul className="quality-status-list">
        <li aria-label={`Questionnaire: ${questionnaire.text}`}>
          <span className="quality-mark" aria-hidden="true">
            {questionnaire.mark}
          </span>
          <span>Questionnaire: {questionnaire.text}</span>
        </li>
        <li aria-label={`Video task: ${video.text}`}>
          <span className="quality-mark" aria-hidden="true">
            {video.mark}
          </span>
          <span>Video task: {video.text}</span>
        </li>
        <li aria-label={`Tracking quality: ${tracking.text}`}>
          <span className="quality-mark" aria-hidden="true">
            {tracking.mark}
          </span>
          <span>Tracking quality: {tracking.text}</span>
        </li>
        <li aria-label={`Calibration: ${calibration.text}`}>
          <span className="quality-mark" aria-hidden="true">
            {calibration.mark}
          </span>
          <span>Calibration: {calibration.text}</span>
        </li>
      </ul>
    </section>
  )
}
