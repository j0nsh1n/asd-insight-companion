/**
 * Local webcam + Face Landmarker loop during the stimulus clip (Phase 4B).
 * Buffer is in-memory only. No MediaRecorder, no frame export, no upload.
 */

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import {
  assertVideoOnly,
  CameraError,
  requestVideoOnlyStream,
  stopMediaStream,
} from './camera'
import {
  detectFacesForVideo,
  getFaceLandmarker,
} from './faceLandmarker'
import {
  emptyTrackingSummary,
  frameFromDetection,
  summarizeTrackingFrames,
  type TrackingFrame,
  type TrackingSessionSummary,
} from './stimulusTracking'

export function useStimulusTracking(
  cameraAllowed: boolean,
  clipVideoRef: RefObject<HTMLVideoElement | null>,
) {
  const camRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef(0)
  const playingRef = useRef(false)
  const mountedRef = useRef(true)
  const genRef = useRef(0)
  const lastTsRef = useRef(-1)
  const playOriginMsRef = useRef<number | null>(null)
  const framesRef = useRef<TrackingFrame[]>([])
  const tickAttemptsRef = useRef(0)
  const tickFailuresRef = useRef(0)
  const taskCompletedRef = useRef(false)
  const lastSummaryRef = useRef<TrackingSessionSummary>(emptyTrackingSummary())

  const [cameraOn, setCameraOn] = useState(false)
  const [camError, setCamError] = useState<string | null>(null)

  const stopLoop = useCallback(() => {
    playingRef.current = false
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = 0
  }, [])

  const releaseCamera = useCallback(() => {
    stopLoop()
    stopMediaStream(streamRef.current)
    streamRef.current = null
    if (camRef.current) camRef.current.srcObject = null
    setCameraOn(false)
  }, [stopLoop])

  const durationMs = () => {
    if (playOriginMsRef.current == null) return 0
    return Math.max(0, performance.now() - playOriginMsRef.current)
  }

  const snapshotSummary = useCallback((): TrackingSessionSummary => {
    const summary = summarizeTrackingFrames(framesRef.current, durationMs(), {
      taskCompleted: taskCompletedRef.current,
      tickAttempts: tickAttemptsRef.current,
      tickFailures: tickFailuresRef.current,
    })
    lastSummaryRef.current = summary
    framesRef.current = []
    return summary
  }, [])

  const clearBuffer = useCallback(() => {
    framesRef.current = []
    playOriginMsRef.current = null
    lastTsRef.current = -1
    tickAttemptsRef.current = 0
    tickFailuresRef.current = 0
    taskCompletedRef.current = false
  }, [])

  const stopAndClear = useCallback((): TrackingSessionSummary => {
    genRef.current += 1
    if (framesRef.current.length > 0) {
      snapshotSummary()
    }
    stopLoop()
    releaseCamera()
    clearBuffer()
    return lastSummaryRef.current
  }, [clearBuffer, releaseCamera, snapshotSummary, stopLoop])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      genRef.current += 1
      stopAndClear()
    }
  }, [stopAndClear])

  const startCamera = useCallback(async () => {
    if (!cameraAllowed) return
    const gen = ++genRef.current
    setCamError(null)
    try {
      const stream = await requestVideoOnlyStream()
      if (!mountedRef.current || gen !== genRef.current) {
        stopMediaStream(stream)
        return
      }
      assertVideoOnly(stream)
      streamRef.current = stream
      const el = camRef.current
      if (el) {
        el.srcObject = stream
        await el.play().catch(() => {})
      }
      if (!mountedRef.current || gen !== genRef.current) {
        stopMediaStream(stream)
        streamRef.current = null
        return
      }
      setCameraOn(true)
      void getFaceLandmarker().catch(() => {
        if (mountedRef.current && gen === genRef.current) {
          setCamError('Face landmarker unavailable. You can still watch or skip.')
        }
      })
    } catch (err) {
      if (!mountedRef.current || gen !== genRef.current) return
      if (err instanceof CameraError) setCamError(err.message)
      else setCamError('Camera unavailable. You can still watch or skip.')
    }
  }, [cameraAllowed])

  const startLoop = useCallback(() => {
    if (!cameraAllowed || !streamRef.current) return
    playingRef.current = true
    if (playOriginMsRef.current == null) {
      playOriginMsRef.current = performance.now()
    }
    if (rafRef.current) return

    const tick = async () => {
      if (!mountedRef.current || !playingRef.current || !streamRef.current) {
        rafRef.current = 0
        return
      }
      const cam = camRef.current
      tickAttemptsRef.current += 1
      if (cam && cam.readyState >= 2) {
        try {
          const lm = await getFaceLandmarker()
          if (!mountedRef.current || !playingRef.current) {
            rafRef.current = 0
            return
          }
          let ts = performance.now()
          if (ts <= lastTsRef.current) ts = lastTsRef.current + 1
          lastTsRef.current = ts
          const result = detectFacesForVideo(lm, cam, ts)
          const clipTs = clipVideoRef.current?.currentTime ?? 0
          framesRef.current.push(frameFromDetection(clipTs * 1000, result))
        } catch {
          tickFailuresRef.current += 1
        }
      } else {
        tickFailuresRef.current += 1
      }
      if (mountedRef.current && playingRef.current && streamRef.current) {
        rafRef.current = requestAnimationFrame(() => void tick())
      } else {
        rafRef.current = 0
      }
    }
    rafRef.current = requestAnimationFrame(() => void tick())
  }, [cameraAllowed, clipVideoRef])

  const pauseLoop = useCallback(() => {
    stopLoop()
  }, [stopLoop])

  const markTaskCompleted = useCallback(() => {
    taskCompletedRef.current = true
  }, [])

  return {
    camRef,
    cameraOn,
    camError,
    startCamera,
    startLoop,
    pauseLoop,
    markTaskCompleted,
    stopAndClear,
    latestSummary: () => lastSummaryRef.current,
  }
}
