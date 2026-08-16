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
} from '../lib/faceLandmarker'

type CalibrationProps = {
  allowWithoutCamera?: boolean
  /** False when optional camera consent was declined. */
  cameraAllowed?: boolean
  onBack: () => void
  onComplete: (outcome: 'passed' | 'limited') => void
}

type StepId = 'intro' | 'center' | 'hold' | 'done_local'

const HOLD_MS = 3000

/**
 * Phase 3C: short guided calibration before stimulus.
 * Local-only; no media upload.
 */
export function Calibration({
  allowWithoutCamera = true,
  cameraAllowed = true,
  onBack,
  onComplete,
}: CalibrationProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const mountedRef = useRef(true)
  const requestGenRef = useRef(0)
  const rafRef = useRef(0)
  const lastTsRef = useRef(-1)
  const stableRef = useRef(0)
  const holdStartRef = useRef<number | null>(null)
  const stepRef = useRef<StepId>('intro')

  const [step, setStep] = useState<StepId>('intro')
  const [camError, setCamError] = useState<string | null>(null)
  const [quality, setQuality] = useState<QualityReport | null>(null)
  const [holdProgress, setHoldProgress] = useState(0)
  const [requesting, setRequesting] = useState(false)

  const setStepBoth = (s: StepId) => {
    stepRef.current = s
    setStep(s)
  }

  const releaseCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = 0
    stopMediaStream(streamRef.current)
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    holdStartRef.current = null
    setHoldProgress(0)
  }, [])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      requestGenRef.current += 1
      releaseCamera()
    }
  }, [releaseCamera])

  // Preview <video> only mounts on center/hold. Attach after that paint.
  useEffect(() => {
    if (step !== 'center' && step !== 'hold') return
    const video = videoRef.current
    const stream = streamRef.current
    if (!video || !stream) return
    if (video.srcObject !== stream) {
      video.srcObject = stream
      void video.play().catch(() => {})
    }
  }, [step])

  const sampleBrightness = (video: HTMLVideoElement): number => {
    const w = 64
    const h = 48
    let canvas = canvasRef.current
    if (!canvas) {
      canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      canvasRef.current = canvas
    }
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx || !video.videoWidth) return 0
    ctx.drawImage(video, 0, 0, w, h)
    return meanBrightness(ctx.getImageData(0, 0, w, h).data)
  }

  const startLoop = useCallback(() => {
    const tick = async () => {
      if (!mountedRef.current || !streamRef.current) return
      const video = videoRef.current
      if (!video || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(() => void tick())
        return
      }
      try {
        const lm = await getFaceLandmarker()
        let ts = performance.now()
        if (ts <= lastTsRef.current) ts = lastTsRef.current + 1
        lastTsRef.current = ts
        const result = detectFacesForVideo(lm, video, ts)
        const faces = result.faceLandmarks ?? []
        if (faces.length === 1) stableRef.current += 1
        else stableRef.current = 0
        const report = evaluateQuality({
          faceLandmarksList: faces.map((f) =>
            f.map((p) => ({ x: p.x, y: p.y, z: p.z })),
          ),
          brightness: sampleBrightness(video),
          trackingConfidence: estimateTrackingConfidence(result),
          stableSingleFaceFrames: stableRef.current,
        })
        if (mountedRef.current) setQuality(report)

        if (stepRef.current === 'hold') {
          if (report.pass) {
            if (holdStartRef.current === null) {
              holdStartRef.current = performance.now()
            }
            const elapsed = performance.now() - holdStartRef.current
            setHoldProgress(Math.min(1, elapsed / HOLD_MS))
            if (elapsed >= HOLD_MS) {
              setStepBoth('done_local')
              releaseCamera()
              return
            }
          } else {
            holdStartRef.current = null
            setHoldProgress(0)
          }
        }
      } catch {
        // landmarker optional for skip path
      }
      if (mountedRef.current && streamRef.current) {
        rafRef.current = requestAnimationFrame(() => void tick())
      }
    }
    rafRef.current = requestAnimationFrame(() => void tick())
  }, [releaseCamera])

  const enableCamera = async () => {
    releaseCamera()
    const gen = ++requestGenRef.current
    setRequesting(true)
    setCamError(null)
    try {
      const stream = await requestVideoOnlyStream()
      if (!mountedRef.current || gen !== requestGenRef.current) {
        stopMediaStream(stream)
        return
      }
      assertVideoOnly(stream)
      streamRef.current = stream
      if (!mountedRef.current || gen !== requestGenRef.current) {
        stopMediaStream(stream)
        streamRef.current = null
        return
      }
      setStepBoth('center')
      startLoop()
    } catch (err) {
      if (!mountedRef.current || gen !== requestGenRef.current) return
      if (err instanceof CameraError) setCamError(err.message)
      else setCamError('Camera unavailable.')
    } finally {
      if (mountedRef.current) setRequesting(false)
    }
  }

  const goHold = () => {
    holdStartRef.current = null
    setHoldProgress(0)
    setStepBoth('hold')
  }

  const finish = () => {
    releaseCamera()
    onComplete('passed')
  }

  const skipWithoutCamera = () => {
    releaseCamera()
    onComplete('limited')
  }

  const backToIntro = () => {
    releaseCamera()
    setStepBoth('intro')
    setQuality(null)
  }

  return (
    <section className="panel" aria-labelledby="cal-title">
      <h2 id="cal-title">Calibration</h2>
      <p className="muted">
        Short local setup before the attention clip. Webcam analysis stays in
        this browser; nothing is uploaded.
      </p>

      {(step === 'center' || step === 'hold') && (
        <div className="camera-preview-wrap">
          <video
            ref={videoRef}
            className="camera-preview"
            playsInline
            muted
            autoPlay
            aria-label="Calibration camera preview"
          />
        </div>
      )}

      {step === 'intro' && (
        <>
          <ol className="summary-list">
            <li>Center your face in the frame (optional camera).</li>
            <li>Hold still while looking at the screen for a few seconds.</li>
            <li>Then continue to a short video clip.</li>
          </ol>
          {camError && (
            <p className="status-error" role="alert">
              {camError}
            </p>
          )}
          <div className="button-row">
            <button type="button" className="btn" onClick={onBack}>
              Back
            </button>
            {cameraAllowed && (
              <button
                type="button"
                className="btn primary"
                disabled={requesting}
                onClick={() => void enableCamera()}
              >
                {requesting ? 'Starting…' : 'Start with camera'}
              </button>
            )}
            {(allowWithoutCamera || !cameraAllowed) && (
              <button type="button" className="btn" onClick={skipWithoutCamera}>
                Skip calibration camera
              </button>
            )}
          </div>
        </>
      )}

      {step === 'center' && (
        <>
          <p>
            <strong>Step 1 — Center:</strong> One face, facing the camera, with
            decent lighting.
          </p>
          {quality && (
            <p
              className={quality.pass ? 'status-ok' : 'muted'}
              aria-live="polite"
            >
              {quality.pass
                ? 'Position looks good.'
                : (quality.checks.find((c) => !c.ok)?.detail ??
                  'Adjust position')}
            </p>
          )}
          <div className="button-row">
            <button type="button" className="btn" onClick={backToIntro}>
              Back
            </button>
            <button
              type="button"
              className="btn primary"
              disabled={!quality?.pass}
              onClick={goHold}
            >
              Next: hold still
            </button>
          </div>
        </>
      )}

      {step === 'hold' && (
        <>
          <p>
            <strong>Step 2 — Hold still:</strong> Keep looking at the center of
            the screen.
          </p>
          <div
            className="progress-bar"
            role="progressbar"
            aria-valuenow={Math.round(holdProgress * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="progress-fill"
              style={{ width: `${holdProgress * 100}%` }}
            />
          </div>
          <p className="muted">
            {holdProgress >= 1
              ? 'Done.'
              : `Hold… ${Math.ceil((1 - holdProgress) * (HOLD_MS / 1000))}s`}
          </p>
          <div className="button-row">
            <button
              type="button"
              className="btn"
              onClick={() => {
                holdStartRef.current = null
                setHoldProgress(0)
                setStepBoth('center')
              }}
            >
              Back
            </button>
          </div>
        </>
      )}

      {step === 'done_local' && (
        <>
          <p className="status-ok">Calibration complete (local only).</p>
          <div className="button-row">
            <button type="button" className="btn primary" onClick={finish}>
              Continue to video clip
            </button>
          </div>
        </>
      )}
    </section>
  )
}
