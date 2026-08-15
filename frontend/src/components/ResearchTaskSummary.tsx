import type { ResearchTaskObservations } from '../types/assessment'

type ResearchTaskSummaryProps = {
  observations: ResearchTaskObservations
}

export function ResearchTaskSummary({ observations }: ResearchTaskSummaryProps) {
  const q = observations.questionnaire_response_pattern
  const v = observations.video_task_summary
  return (
    <section className="result-card" aria-labelledby="obs-title">
      <h3 id="obs-title">Research-task measurements</h3>
      <p className="muted">
        These are descriptive notes from this prototype session. They are not
        clinical evidence.
      </p>

      {q ? (
        <dl className="metric-list">
          <div>
            <dt>
              Mean time on each question
              <span className="metric-hint">
                Average time spent on an item. A research-task timing note
                only.
              </span>
            </dt>
            <dd>{Math.round(q.mean_response_time_ms)} ms</dd>
          </div>
          <div>
            <dt>
              Response-time variability
              <span className="metric-hint">
                Spread of per-item times. Not a clinical marker.
              </span>
            </dt>
            <dd>{Math.round(q.response_time_variability_ms)} ms</dd>
          </div>
          <div>
            <dt>
              Answer changes
              <span className="metric-hint">
                How often an answer was changed before submit.
              </span>
            </dt>
            <dd>{q.answer_change_count}</dd>
          </div>
        </dl>
      ) : (
        <p>No questionnaire measurements are stored for this session.</p>
      )}

      {v ? (
        <dl className="metric-list">
          <div>
            <dt>
              Video task finished
              <span className="metric-hint">
                Whether the clip reached its end in this browser.
              </span>
            </dt>
            <dd>{v.task_completed ? 'Yes' : 'No'}</dd>
          </div>
          <div>
            <dt>
              Valid tracking duration
              <span className="metric-hint">
                Clip time while a single face was tracked. Device-dependent.
              </span>
            </dt>
            <dd>{v.valid_tracking_duration_ms} ms</dd>
          </div>
          {v.attention_estimates_available && v.mean_blink_estimate != null && (
            <div>
              <dt>
                Mean blink estimate
                <span className="metric-hint">
                  On-device blendshape average (0–1). Not a clinical blink
                  rate.
                </span>
              </dt>
              <dd>{v.mean_blink_estimate.toFixed(2)}</dd>
            </div>
          )}
          {v.attention_estimates_available && v.head_motion_summary && (
            <div>
              <dt>
                Head-motion averages
                <span className="metric-hint">
                  Mean absolute yaw and pitch in degrees from the webcam
                  mesh. Research-task only.
                </span>
              </dt>
              <dd>
                yaw {v.head_motion_summary.mean_abs_yaw_deg.toFixed(1)}° ·
                pitch {v.head_motion_summary.mean_abs_pitch_deg.toFixed(1)}°
              </dd>
            </div>
          )}
        </dl>
      ) : (
        <p>No video-task measurements are stored for this session.</p>
      )}
    </section>
  )
}
