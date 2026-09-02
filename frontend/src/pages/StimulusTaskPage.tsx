import { useEffect, useRef, useState } from 'react'
import { StimulusPlayer } from '../components/StimulusPlayer'
import { getStimulusTaskManifest } from '../lib/stimuliManifest'
import {
  buildFeaturePayload,
  type FeaturePayload,
} from '../lib/stimulusTracking'
import { useStimulusTracking } from '../lib/useStimulusTracking'

export type StimulusTaskPageProps = {
  sessionId: string
  onBack: () => void
  /** Non-punitive leave — same next step whether or not the clip was watched. */
  onSkip: (payload: FeaturePayload) => void
  /** False when optional camera consent was declined. */
  cameraAllowed?: boolean
}

/**
 * Phase 4B: accessible stimulus task + local-only face tracking while playing.
 * No upload, no disk, no scoring.
 */
export function StimulusTaskPage({
  sessionId,
  onBack,
  onSkip,
  cameraAllowed = false,
}: StimulusTaskPageProps) {
  const task = getStimulusTaskManifest()
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [started, setStarted] = useState(false)
  const [clipError, setClipError] = useState(false)
  const [clipEnded, setClipEnded] = useState(false)
  const [transcript, setTranscript] = useState<string | null>(null)
  const tracking = useStimulusTracking(cameraAllowed, videoRef)
  const startedLock = useRef(false)
  const continueRef = useRef<HTMLButtonElement | null>(null)

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
    if (started && !clipEnded) {
      videoRef.current?.focus()
    }
  }, [started, clipEnded])

  useEffect(() => {
    if (clipEnded) {
      continueRef.current?.focus()
    }
  }, [clipEnded])

  const startTask = () => {
    if (startedLock.current) return
    startedLock.current = true
    setStarted(true)
    void tracking.startCamera()
  }

  const leave = (next: (payload: FeaturePayload) => void) => {
    const summary = tracking.stopAndClear()
    next(buildFeaturePayload(sessionId, task.task_version, summary))
  }

  return (
    <section className="panel" aria-labelledby="stimulus-4a-title">
      <h2 id="stimulus-4a-title">{task.title}</h2>
      <p className="muted">
        This is part of a research prototype and is not a diagnostic test.
      </p>
      <p className="stimulus-instruction">{task.participant_instruction}</p>
      {cameraAllowed ? (
        <aside className="privacy-camera-note" role="note">
          <strong>Privacy:</strong> If you start this step, the webcam is used
          only on this device while the clip plays. Frames are not recorded,
          uploaded, or stored — only anonymous numbers stay in this tab.
        </aside>
      ) : (
        <p className="muted">
          Camera-based measures were declined at consent. You can still watch
          or skip the clip.
        </p>
      )}

      {started ? (
        <StimulusPlayer
          src={task.video_file}
          captionsSrc={task.captions_file}
          label={task.video_description}
          videoRef={videoRef}
          onError={() => {
            tracking.stopAndClear()
            setClipError(true)
          }}
          onPlay={() => tracking.startLoop()}
          onPause={() => tracking.pauseLoop()}
          onEnded={() => {
            tracking.markTaskCompleted()
            tracking.stopAndClear()
            setClipEnded(true)
          }}
        />
      ) : (
        <div className="stimulus-video-wrap" aria-hidden="true">
          <div className="camera-preview-placeholder">Video not started</div>
        </div>
      )}

      {cameraAllowed && (
        <video
          ref={tracking.camRef}
          className="stimulus-cam-hidden"
          playsInline
          muted
          autoPlay
          aria-hidden="true"
        />
      )}

      {tracking.camError && (
        <p className="status-error" role="alert">
          {tracking.camError}
        </p>
      )}

      {clipError && (
        <p className="status-error" role="alert">
          The video clip isn't available in this build. You can skip this step.
        </p>
      )}

      {clipEnded && !clipError && (
        <p className="status-ok" role="status">
          The video finished. Continue to save this step. Camera sampling has
          stopped in this browser.
        </p>
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
        <button
          type="button"
          className="btn"
          onClick={() => leave(() => onBack())}
        >
          Back
        </button>
        {!started && (
          <button type="button" className="btn primary" onClick={startTask}>
            Start video task
          </button>
        )}
        {(!started || clipError) && (
          <button
            type="button"
            className="btn"
            onClick={() => leave(onSkip)}
          >
            Skip video task
          </button>
        )}
        {clipEnded && !clipError && (
          <button
            ref={continueRef}
            type="button"
            className="btn primary"
            onClick={() => leave(onSkip)}
          >
            Continue
          </button>
        )}
      </div>
    </section>
  )
}
