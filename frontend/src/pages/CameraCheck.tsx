import { useCallback, useEffect, useRef, useState } from 'react'
import {
  assertVideoOnly,
  CameraError,
  requestVideoOnlyStream,
  stopMediaStream,
} from '../lib/camera'

type CameraCheckProps = {
  onBack: () => void
  /** Called after camera is stopped (continue or skip). */
  onComplete: () => void
}

type Status =
  | { kind: 'idle' }
  | { kind: 'requesting' }
  | { kind: 'preview' }
  | { kind: 'error'; message: string; code: string }

/**
 * Phase 3A: local video-only preview. No frames/images/blobs leave the browser.
 */
export function CameraCheck({ onBack, onComplete }: CameraCheckProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  /** False after unmount so late getUserMedia results are discarded and stopped. */
  const mountedRef = useRef(true)
  /** Bumped on each start/cancel so superseded in-flight requests are abandoned. */
  const requestGenRef = useRef(0)
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  const releaseCamera = useCallback(() => {
    stopMediaStream(streamRef.current)
    streamRef.current = null
    const el = videoRef.current
    if (el) {
      el.srcObject = null
    }
  }, [])

  // Always stop tracks on unmount (navigation / leave step).
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      requestGenRef.current += 1
      releaseCamera()
    }
  }, [releaseCamera])

  const startCamera = async () => {
    releaseCamera()
    const gen = ++requestGenRef.current
    setStatus({ kind: 'requesting' })
    try {
      const stream = await requestVideoOnlyStream()
      // Unmounted or superseded (cancel / newer Enable) — stop immediately.
      if (!mountedRef.current || gen !== requestGenRef.current) {
        stopMediaStream(stream)
        return
      }
      assertVideoOnly(stream)
      if (!mountedRef.current || gen !== requestGenRef.current) {
        stopMediaStream(stream)
        return
      }
      streamRef.current = stream
      const el = videoRef.current
      if (el) {
        el.srcObject = stream
        await el.play().catch(() => {
          // Autoplay policies: still show frame once track is live.
        })
      }
      if (!mountedRef.current || gen !== requestGenRef.current) {
        stopMediaStream(stream)
        streamRef.current = null
        if (el) el.srcObject = null
        return
      }
      setStatus({ kind: 'preview' })
    } catch (err) {
      if (!mountedRef.current || gen !== requestGenRef.current) {
        return
      }
      releaseCamera()
      if (err instanceof CameraError) {
        setStatus({ kind: 'error', message: err.message, code: err.kind })
      } else {
        setStatus({
          kind: 'error',
          message: 'Camera is unavailable.',
          code: 'unavailable',
        })
      }
    }
  }

  const handleCancel = () => {
    // Abandon any in-flight getUserMedia; late resolve will stop the stream.
    requestGenRef.current += 1
    releaseCamera()
    setStatus({ kind: 'idle' })
    onBack()
  }

  const handleSkipOrDone = () => {
    requestGenRef.current += 1
    releaseCamera()
    setStatus({ kind: 'idle' })
    onComplete()
  }

  return (
    <section className="panel" aria-labelledby="camera-title">
      <h2 id="camera-title">Camera check</h2>
      <p className="muted">
        Research prototype only. Video stays in this browser for a local preview
        — it is not uploaded or stored on the server.
      </p>
      <aside className="privacy-camera-note" role="note">
        <strong>Privacy:</strong> getUserMedia is requested with{' '}
        <code>audio: false</code>. Preview uses a local{' '}
        <code>MediaStream</code> only. No video, images, or frame data are sent
        in API requests.
      </aside>

      <div className="camera-preview-wrap">
        <video
          ref={videoRef}
          className="camera-preview"
          playsInline
          muted
          autoPlay
          aria-label="Local camera preview"
        />
        {status.kind !== 'preview' && (
          <div
            className="camera-preview-placeholder"
            aria-hidden={status.kind === 'requesting'}
          >
            {status.kind === 'requesting'
              ? 'Requesting camera…'
              : 'Camera preview off'}
          </div>
        )}
      </div>

      {status.kind === 'error' && (
        <div className="camera-fallback" role="alert">
          <p className="status-error">{status.message}</p>
          <p className="muted">
            You can try again, or continue without camera. Later quality checks
            will use camera only when available.
          </p>
        </div>
      )}

      <div className="button-row">
        <button type="button" className="btn" onClick={handleCancel}>
          Cancel
        </button>
        {status.kind !== 'preview' && (
          <button
            type="button"
            className="btn primary"
            disabled={status.kind === 'requesting'}
            onClick={() => void startCamera()}
          >
            {status.kind === 'requesting' ? 'Starting…' : 'Enable camera'}
          </button>
        )}
        {status.kind === 'preview' && (
          <button
            type="button"
            className="btn primary"
            onClick={handleSkipOrDone}
          >
            Continue (stop camera)
          </button>
        )}
        {status.kind === 'error' && (
          <button
            type="button"
            className="btn primary"
            onClick={handleSkipOrDone}
          >
            Continue without camera
          </button>
        )}
      </div>
    </section>
  )
}
