import { useCallback, useEffect, useRef, useState } from 'react'
import {
  assertVideoOnly,
  CameraError,
  requestVideoOnlyStream,
  stopMediaStream,
} from '../lib/camera'
import {
  evaluateQuality,
  meanBrightness,
  type QualityReport,
} from '../lib/cameraQuality'
import {
  detectFacesForVideo,
  estimateTrackingConfidence,
  getFaceLandmarker,
  type FaceLandmarkerResult,
} from '../lib/faceLandmarker'

type CameraCheckProps = {
  onBack: () => void
  /** Called after camera is stopped (continue or skip). */
  onComplete: () => void
  /** False when optional camera consent was declined. */
  cameraAllowed?: boolean
}

type Status =
  | { kind: 'idle' }
  | { kind: 'requesting' }
  | { kind: 'preview' }
  | { kind: 'error'; message: string; code: string }

/**
 * Phase 3A/3B: local video-only preview + on-device Face Landmarker quality gate.
 * No frames/images leave the browser.
 */
export function CameraCheck({
  onBack,
  onComplete,
  cameraAllowed = true,
}: CameraCheckProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const sampleCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const mountedRef = useRef(true)
  const requestGenRef = useRef(0)
  const rafRef = useRef<number>(0)
  const lastTsRef = useRef(-1)
  const stableFramesRef = useRef(0)
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [landmarkerReady, setLandmarkerReady] = useState(false)
  const [landmarkerError, setLandmarkerError] = useState<string | null>(null)
  const [quality, setQuality] = useState<QualityReport | null>(null)

  const releaseCamera = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
    }
    lastTsRef.current = -1
    stableFramesRef.current = 0
    stopMediaStream(streamRef.current)
    streamRef.current = null
    const el = videoRef.current
    if (el) {
      el.srcObject = null
    }
    setQuality(null)
  }, [])

  useEffect(() => {
    mountedRef.current = true
    const onPageHide = () => {
      mountedRef.current = false
      requestGenRef.current += 1
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = 0
      }
      stopMediaStream(streamRef.current)
      streamRef.current = null
      if (videoRef.current) videoRef.current.srcObject = null
    }
    window.addEventListener('pagehide', onPageHide)
    return () => {
      window.removeEventListener('pagehide', onPageHide)
      mountedRef.current = false
      requestGenRef.current += 1
      releaseCamera()
    }
  }, [releaseCamera])

  // Warm Face Landmarker (wasm + model) once; failures are non-fatal for skip path.
  useEffect(() => {
    if (!cameraAllowed) return
    let cancelled = false
    getFaceLandmarker()
      .then(() => {
        if (!cancelled) {
          setLandmarkerReady(true)
          setLandmarkerError(null)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLandmarkerReady(false)
          setLandmarkerError(
            err instanceof Error
              ? err.message
              : 'Face landmarker failed to load',
          )
        }
      })
    return () => {
      cancelled = true
    }
  }, [cameraAllowed])

  const sampleBrightness = (video: HTMLVideoElement): number => {
    const w = 64
    const h = 48
    let canvas = sampleCanvasRef.current
    if (!canvas) {
      canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      sampleCanvasRef.current = canvas
    }
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx || video.videoWidth === 0) return 0
    ctx.drawImage(video, 0, 0, w, h)
    const img = ctx.getImageData(0, 0, w, h)
    return meanBrightness(img.data)
  }

  const runQualityLoop = useCallback(() => {
    const tick = async () => {
      if (!mountedRef.current) return
      const video = videoRef.current
      const stream = streamRef.current
      if (!video || !stream || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(() => {
          void tick()
        })
        return
      }

      try {
        const landmarker = await getFaceLandmarker()
        if (!mountedRef.current || !streamRef.current) return

        let ts = performance.now()
        if (ts <= lastTsRef.current) {
          ts = lastTsRef.current + 1
        }
        lastTsRef.current = ts

        const result: FaceLandmarkerResult = detectFacesForVideo(
          landmarker,
          video,
          ts,
        )
        const faces = result.faceLandmarks ?? []
        if (faces.length === 1) {
          stableFramesRef.current += 1
        } else {
          stableFramesRef.current = 0
        }

        const brightness = sampleBrightness(video)
        const conf = estimateTrackingConfidence(result)
        const report = evaluateQuality({
          faceLandmarksList: faces.map((face) =>
            face.map((p) => ({ x: p.x, y: p.y, z: p.z })),
          ),
          brightness,
          trackingConfidence: conf,
          stableSingleFaceFrames: stableFramesRef.current,
        })
        if (mountedRef.current) {
          setQuality(report)
        }
      } catch {
        // Keep preview; quality UI will show landmarker error separately.
      }

      if (mountedRef.current && streamRef.current) {
        rafRef.current = requestAnimationFrame(() => {
          void tick()
        })
      }
    }
    rafRef.current = requestAnimationFrame(() => {
      void tick()
    })
  }, [])

  const startCamera = async () => {
    releaseCamera()
    const gen = ++requestGenRef.current
    setStatus({ kind: 'requesting' })
    try {
      const stream = await requestVideoOnlyStream()
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
        await el.play().catch(() => {})
      }
      if (!mountedRef.current || gen !== requestGenRef.current) {
        stopMediaStream(stream)
        streamRef.current = null
        if (el) el.srcObject = null
        return
      }
      setStatus({ kind: 'preview' })
      runQualityLoop()
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

  const gatePass = quality?.pass === true
  const canContinueWithCamera = status.kind === 'preview' && gatePass

  return (
    <section className="panel" aria-labelledby="camera-title">
      <h2 id="camera-title">Camera quality check</h2>
      <p className="muted">
        Research prototype only. Video and face analysis stay in this browser —
        nothing is uploaded or stored on the server.
      </p>
      <aside className="privacy-camera-note" role="note">
        <strong>Privacy:</strong> getUserMedia uses <code>audio: false</code>.
        Face Landmarker runs on-device. No video, images, or frame data are sent
        in API requests.
      </aside>
      {!cameraAllowed && (
        <p className="muted">
          Camera-based measures were declined at consent. You can continue
          without the camera.
        </p>
      )}

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

      {status.kind === 'preview' && (
        <div className="quality-panel" aria-live="polite">
          <h3 className="quality-heading">Quality gate</h3>
          {landmarkerError && (
            <p className="status-error" role="alert">
              Face landmarker unavailable: {landmarkerError}. You can continue
              without camera.
            </p>
          )}
          {!landmarkerReady && !landmarkerError && (
            <p className="muted">Loading face landmarker…</p>
          )}
          {quality && (
            <>
              <p className="muted">
                Faces:{' '}
                <strong>
                  {quality.faceCountStatus === 'zero'
                    ? 'none'
                    : quality.faceCountStatus === 'one'
                      ? 'one'
                      : `multiple (${quality.faceCount})`}
                </strong>
                {gatePass ? (
                  <span className="status-ok"> · Ready</span>
                ) : (
                  <span className="status-error"> · Adjust position/lighting</span>
                )}
              </p>
              <ul className="quality-checklist">
                {quality.checks.map((c) => (
                  <li
                    key={c.id}
                    className={c.ok ? 'quality-ok' : 'quality-bad'}
                  >
                    <span aria-hidden="true">{c.ok ? '✓' : '✗'}</span> {c.label}:{' '}
                    {c.detail}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {status.kind === 'error' && (
        <div className="camera-fallback" role="alert">
          <p className="status-error">{status.message}</p>
          <p className="muted">
            You can try again, or continue without camera for this research
            prototype.
          </p>
        </div>
      )}

      <div className="button-row">
        <button type="button" className="btn" onClick={handleCancel}>
          Cancel
        </button>
        {cameraAllowed && status.kind !== 'preview' && (
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
            disabled={!canContinueWithCamera}
            onClick={handleSkipOrDone}
          >
            {canContinueWithCamera
              ? 'Continue (stop camera)'
              : 'Waiting for quality gate…'}
          </button>
        )}
        {(status.kind === 'error' ||
          status.kind === 'preview' ||
          !cameraAllowed) && (
          <button type="button" className="btn" onClick={handleSkipOrDone}>
            Continue without camera
          </button>
        )}
      </div>
    </section>
  )
}
