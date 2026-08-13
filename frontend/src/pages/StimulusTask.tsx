import { useCallback, useEffect, useRef, useState } from 'react'
import {
  assertVideoOnly,
  requestVideoOnlyStream,
  stopMediaStream,
} from '../lib/camera'
import {
  evaluateQuality,
  meanBrightness,
} from '../lib/cameraQuality'
import {
  detectFacesForVideo,
  estimateTrackingConfidence,
  getFaceLandmarker,
} from '../lib/faceLandmarker'
import {
  aggregateSamples,
  sampleFromQuality,
  type LocalFeatureSample,
  type LocalFeatureSummary,
} from '../lib/localFeatures'
import { getStimulusConfig } from '../lib/stimulusConfig'

type StimulusTaskProps = {
  onBack: () => void
  onComplete: (summary: LocalFeatureSummary) => void
  /** False when optional camera consent was declined. */
  cameraAllowed?: boolean
}

/**
 * Phase 3C: one short video stimulus + optional local webcam feature sampling.
 * Video playback and webcam frames stay in the browser.
 */
export function StimulusTask({
  onBack,
  onComplete,
  cameraAllowed = true,
}: StimulusTaskProps) {
  const config = getStimulusConfig()
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const camRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const samplesRef = useRef<LocalFeatureSample[]>([])
  const startMsRef = useRef<number | null>(null)
  const rafRef = useRef(0)
  const lastTsRef = useRef(-1)
  const stableRef = useRef(0)
  const mountedRef = useRef(true)
  const genRef = useRef(0)

  const [playing, setPlaying] = useState(false)
  const [watchedSec, setWatchedSec] = useState(0)
  const [ended, setEnded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cameraOn, setCameraOn] = useState(false)
  const [clipFailed, setClipFailed] = useState(false)

  const releaseCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = 0
    stopMediaStream(streamRef.current)
    streamRef.current = null
    if (camRef.current) camRef.current.srcObject = null
    setCameraOn(false)
  }, [])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      genRef.current += 1
      releaseCamera()
    }
  }, [releaseCamera])

  const sampleBrightness = (video: HTMLVideoElement): number => {
    const w = 48
    const h = 36
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

  const startSampling = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    const tick = async () => {
      if (!mountedRef.current || !streamRef.current || !camRef.current) return
      const cam = camRef.current
      if (cam.readyState < 2) {
        rafRef.current = requestAnimationFrame(() => void tick())
        return
      }
      try {
        const lm = await getFaceLandmarker()
        let ts = performance.now()
        if (ts <= lastTsRef.current) ts = lastTsRef.current + 1
        lastTsRef.current = ts
        const result = detectFacesForVideo(lm, cam, ts)
        const faces = result.faceLandmarks ?? []
        if (faces.length === 1) stableRef.current += 1
        else stableRef.current = 0
        const report = evaluateQuality({
          faceLandmarksList: faces.map((f) =>
            f.map((p) => ({ x: p.x, y: p.y, z: p.z })),
          ),
          brightness: sampleBrightness(cam),
          trackingConfidence: estimateTrackingConfidence(result),
          stableSingleFaceFrames: stableRef.current,
        })
        const t0 = startMsRef.current ?? performance.now()
        samplesRef.current.push(
          sampleFromQuality(performance.now() - t0, report),
        )
      } catch {
        // optional — landmarker may fail offline
      }
      if (mountedRef.current && streamRef.current) {
        rafRef.current = requestAnimationFrame(() => void tick())
      }
    }
    rafRef.current = requestAnimationFrame(() => void tick())
  }, [])

  // Attach stream after the thumb video mounts (ref is null until cameraOn).
  useEffect(() => {
    if (!cameraOn) return
    const cam = camRef.current
    const stream = streamRef.current
    if (!cam || !stream) return
    cam.srcObject = stream
    void cam.play().catch(() => {})
    if (playing && !ended) startSampling()
  }, [cameraOn, playing, ended, startSampling])

  const enableCamera = async () => {
    const gen = ++genRef.current
    try {
      const stream = await requestVideoOnlyStream()
      if (!mountedRef.current || gen !== genRef.current) {
        stopMediaStream(stream)
        return
      }
      assertVideoOnly(stream)
      streamRef.current = stream
      setCameraOn(true)
      // srcObject + sampling attach in effect after cam video mounts
    } catch {
      setError('Camera unavailable for optional local sampling.')
    }
  }

  const failClip = (message: string) => {
    releaseCamera()
    setPlaying(false)
    setClipFailed(true)
    setError(message)
  }

  const startClip = async () => {
    const el = videoRef.current
    if (!el) return
    setError(null)
    setClipFailed(false)
    setEnded(false)
    samplesRef.current = []
    startMsRef.current = performance.now()
    try {
      await el.play()
      setPlaying(true)
      // sampling starts via effect when camera is already on
      if (streamRef.current && camRef.current) startSampling()
    } catch {
      failClip('Could not play the stimulus video. Check network access.')
    }
  }

  const onTimeUpdate = () => {
    const el = videoRef.current
    if (!el) return
    setWatchedSec(el.currentTime)
  }

  const finish = () => {
    const el = videoRef.current
    el?.pause()
    const duration =
      startMsRef.current !== null
        ? performance.now() - startMsRef.current
        : (el?.currentTime ?? 0) * 1000
    const summary = aggregateSamples(samplesRef.current, duration)
    releaseCamera()
    onComplete(summary)
  }

  const minOk = watchedSec >= config.min_watch_seconds || ended
  const canFinish = minOk

  return (
    <section className="panel" aria-labelledby="stim-title">
      <h2 id="stim-title">{config.title}</h2>
      <p className="muted">{config.description}</p>
      <aside className="privacy-camera-note" role="note">
        <strong>Privacy:</strong> The clip plays in your browser. Optional webcam
        samples are aggregated locally as numbers only — no raw video is
        uploaded.
        {config.note ? ` ${config.note}` : ''}
      </aside>

      <div className="stimulus-video-wrap">
        <video
          ref={videoRef}
          className="stimulus-video"
          src={config.video_url}
          playsInline
          controls={false}
          onTimeUpdate={onTimeUpdate}
          onEnded={() => {
            setEnded(true)
            setPlaying(false)
            if (rafRef.current) cancelAnimationFrame(rafRef.current)
          }}
          onError={() =>
            failClip('Stimulus video failed to load (network or URL).')
          }
        />
      </div>

      {cameraOn && (
        <video
          ref={camRef}
          className="camera-preview stimulus-cam-thumb"
          playsInline
          muted
          autoPlay
          aria-label="Optional local webcam for sampling"
        />
      )}

      <p className="muted">
        Watched {watchedSec.toFixed(1)}s
        {config.min_watch_seconds
          ? ` (min ${config.min_watch_seconds}s to continue)`
          : ''}
        {cameraOn ? ' · local face sampling on' : ''}
      </p>

      {error && (
        <p className="status-error" role="alert">
          {error}
        </p>
      )}

      <div className="button-row">
        <button
          type="button"
          className="btn"
          onClick={() => {
            releaseCamera()
            onBack()
          }}
        >
          Back
        </button>
        {cameraAllowed && !cameraOn && (
          <button type="button" className="btn" onClick={() => void enableCamera()}>
            Optional: enable camera sampling
          </button>
        )}
        {!playing && !ended && !clipFailed && (
          <button type="button" className="btn primary" onClick={() => void startClip()}>
            Play clip
          </button>
        )}
        {clipFailed && (
          <button type="button" className="btn primary" onClick={finish}>
            Continue without the clip
          </button>
        )}
        <button
          type="button"
          className="btn primary"
          disabled={!canFinish}
          onClick={finish}
        >
          Finish task
        </button>
      </div>
    </section>
  )
}
