import { useEffect, useRef, useState } from 'react'
import { StimulusPlayer } from '../components/StimulusPlayer'
import { getStimulusTaskManifest } from '../lib/stimuliManifest'

export type StimulusTaskPageProps = {
  onBack: () => void
  /** Non-punitive leave — same next step whether or not the clip was watched. */
  onSkip: () => void
}

/**
 * Phase 4A: one accessible stimulus task. No camera, tracking, or scoring.
 */
export function StimulusTaskPage({ onBack, onSkip }: StimulusTaskPageProps) {
  const task = getStimulusTaskManifest()
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [started, setStarted] = useState(false)
  const [transcript, setTranscript] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(task.transcript_file)
      .then((res) => (res.ok ? res.text() : Promise.reject(new Error('missing'))))
      .then((text) => {
        if (!cancelled) setTranscript(text)
      })
      .catch(() => {
        if (!cancelled) setTranscript(null)
      })
    return () => {
      cancelled = true
    }
  }, [task.transcript_file])

  useEffect(() => {
    if (started) {
      videoRef.current?.focus()
    }
  }, [started])

  const startTask = () => {
    setStarted(true)
  }

  return (
    <section className="panel" aria-labelledby="stimulus-4a-title">
      <h2 id="stimulus-4a-title">{task.title}</h2>
      <p className="muted">
        This is part of a research prototype and is not a diagnostic test.
      </p>
      <p className="stimulus-instruction">{task.participant_instruction}</p>

      {started ? (
        <StimulusPlayer
          src={task.video_file}
          captionsSrc={task.captions_file}
          label={task.video_description}
          videoRef={videoRef}
        />
      ) : (
        <div className="stimulus-video-wrap" aria-hidden="true">
          <div className="camera-preview-placeholder">Video not started</div>
        </div>
      )}

      <details className="stimulus-transcript">
        <summary>Descriptive transcript</summary>
        {transcript ? (
          <pre className="stimulus-transcript-body">{transcript}</pre>
        ) : (
          <p className="muted">
            <a href={task.transcript_file}>Open transcript</a>
          </p>
        )}
      </details>

      <div className="button-row">
        <button type="button" className="btn" onClick={onBack}>
          Back
        </button>
        {!started && (
          <button type="button" className="btn primary" onClick={startTask}>
            Start video task
          </button>
        )}
        <button type="button" className="btn" onClick={onSkip}>
          Skip video task
        </button>
      </div>
    </section>
  )
}
