import { describe, expect, it } from 'vitest'
import type { FaceLandmarkerResult } from './faceLandmarker'
import {
  emptyTrackingSummary,
  frameFromDetection,
  summarizeTrackingFrames,
  type TrackingFrame,
} from './stimulusTracking'

function pt(x: number, y: number): FaceLandmarkerResult['faceLandmarks'][0][0] {
  return { x, y, z: 0, visibility: 1 }
}

function faceMesh(): FaceLandmarkerResult['faceLandmarks'][0] {
  const pts = Array.from({ length: 300 }, () => pt(0.5, 0.5))
  pts[1] = pt(0.5, 0.52)
  pts[33] = pt(0.4, 0.45)
  pts[263] = pt(0.6, 0.45)
  pts[152] = pt(0.5, 0.7)
  pts[10] = pt(0.5, 0.3)
  return pts
}

function result(faces: number): FaceLandmarkerResult {
  return {
    faceLandmarks: Array.from({ length: faces }, () => faceMesh()),
    faceBlendshapes: [],
    facialTransformationMatrixes: [],
  }
}

describe('stimulusTracking', () => {
  it('marks one face as tracking_ok and never claims upload', () => {
    const frame = frameFromDetection(1200, result(1))
    expect(frame.timestamp).toBe(1200)
    expect(frame.one_face).toBe(true)
    expect(frame.tracking_ok).toBe(true)
    expect(frame.head_pose).not.toBeNull()
  })

  it('treats zero or multiple faces as not one_face', () => {
    expect(frameFromDetection(0, result(0)).one_face).toBe(false)
    expect(frameFromDetection(0, result(2)).one_face).toBe(false)
    expect(frameFromDetection(0, result(0)).tracking_ok).toBe(false)
  })

  it('summarizes a buffer in memory with media_uploaded false', () => {
    const frames: TrackingFrame[] = [
      {
        timestamp: 0,
        tracking_ok: true,
        one_face: true,
        head_pose: { yawDeg: 4, pitchDeg: -2, rollDeg: 0 },
        blink_estimate: 0.2,
      },
      {
        timestamp: 500,
        tracking_ok: false,
        one_face: false,
        head_pose: null,
        blink_estimate: null,
      },
    ]
    const summary = summarizeTrackingFrames(frames, 800)
    expect(summary.sample_count).toBe(2)
    expect(summary.duration_ms).toBe(800)
    expect(summary.fraction_one_face).toBe(0.5)
    expect(summary.fraction_tracking_ok).toBe(0.5)
    expect(summary.mean_abs_yaw_deg).toBeCloseTo(4)
    expect(summary.mean_blink_estimate).toBeCloseTo(0.2)
    expect(summary.media_uploaded).toBe(false)
  })

  it('returns an empty summary with media_uploaded false', () => {
    const summary = emptyTrackingSummary(0)
    expect(summary.sample_count).toBe(0)
    expect(summary.media_uploaded).toBe(false)
    expect(summary.mean_blink_estimate).toBeNull()
  })
})
