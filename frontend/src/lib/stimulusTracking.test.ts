import { describe, expect, it } from 'vitest'
import type { FaceLandmarkerResult } from './faceLandmarker'
import {
  buildFeaturePayload,
  classifyFeatureQuality,
  emptyTrackingSummary,
  FEATURE_QUALITY_THRESHOLDS,
  frameFromDetection,
  MAX_TRACKING_SAMPLES,
  pushTrackingSample,
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
    const summary = summarizeTrackingFrames(frames, 800, {
      taskCompleted: true,
      tickAttempts: 3,
      tickFailures: 1,
    })
    expect(summary.sample_count).toBe(2)
    expect(summary.duration_ms).toBe(800)
    expect(summary.single_face_ratio).toBe(0.5)
    expect(summary.tracking_ratio).toBe(0.5)
    expect(summary.dropped_frame_ratio).toBeCloseTo(1 / 3)
    expect(summary.task_completed).toBe(true)
    expect(summary.mean_abs_yaw_deg).toBeCloseTo(4)
    expect(summary.mean_blink_estimate).toBeCloseTo(0.2)
    expect(summary.media_uploaded).toBe(false)
  })

  it('builds a JSON-only FeaturePayload and leaves no frame list', () => {
    const summary = summarizeTrackingFrames(
      [
        {
          timestamp: 0,
          tracking_ok: true,
          one_face: true,
          head_pose: { yawDeg: 1, pitchDeg: 1, rollDeg: 0 },
          blink_estimate: 0.1,
        },
      ],
      400,
      { taskCompleted: true },
    )
    const payload = buildFeaturePayload('sid-1', 'social-interaction-v1', summary)
    expect(payload.session_id).toBe('sid-1')
    expect(payload.media_uploaded).toBe(false)
    expect(payload.task_completed).toBe(true)
    expect(JSON.stringify(payload)).not.toMatch(/faceLandmarks|frames|base64|blob/i)
    expect('frames' in payload).toBe(false)
  })

  it('returns an empty summary with media_uploaded false', () => {
    const summary = emptyTrackingSummary(0)
    expect(summary.sample_count).toBe(0)
    expect(summary.media_uploaded).toBe(false)
    expect(summary.mean_blink_estimate).toBeNull()
    expect(summary.data_quality).toBe('unavailable')
  })

  it('classifies empty buffer as unavailable', () => {
    const summary = summarizeTrackingFrames([], 0)
    expect(summary.data_quality).toBe('unavailable')
    expect(classifyFeatureQuality(summary)).toBe('unavailable')
  })

  it('classifies a low-tracking buffer as insufficient', () => {
    const frames: TrackingFrame[] = [
      {
        timestamp: 0,
        tracking_ok: true,
        one_face: true,
        head_pose: { yawDeg: 1, pitchDeg: 1, rollDeg: 0 },
        blink_estimate: 0.1,
      },
      {
        timestamp: 400,
        tracking_ok: false,
        one_face: false,
        head_pose: null,
        blink_estimate: null,
      },
    ]
    const summary = summarizeTrackingFrames(frames, 800)
    expect(summary.valid_tracking_duration_ms).toBeLessThan(
      FEATURE_QUALITY_THRESHOLDS.min_valid_tracking_duration_ms,
    )
    expect(summary.data_quality).toBe('insufficient')
  })

  it('classifies a well-tracked buffer as ok', () => {
    const frames: TrackingFrame[] = [0, 1000, 2000, 3000, 4000].map((t) => ({
      timestamp: t,
      tracking_ok: true,
      one_face: true,
      head_pose: { yawDeg: 2, pitchDeg: 1, rollDeg: 0 },
      blink_estimate: 0.15,
    }))
    const summary = summarizeTrackingFrames(frames, 8000, {
      taskCompleted: true,
      tickAttempts: 5,
      tickFailures: 0,
    })
    expect(summary.tracking_ratio).toBe(1)
    expect(summary.valid_tracking_duration_ms).toBeGreaterThanOrEqual(
      FEATURE_QUALITY_THRESHOLDS.min_valid_tracking_duration_ms,
    )
    expect(summary.data_quality).toBe('ok')
    expect(buildFeaturePayload('sid', 'social-interaction-v1', summary).data_quality).toBe(
      'ok',
    )
  })

  it('caps the in-memory buffer and counts overflow as dropped ticks', () => {
    const frames: TrackingFrame[] = []
    let overflow = 0
    const extra = 10
    const sample: TrackingFrame = {
      timestamp: 0,
      tracking_ok: true,
      one_face: true,
      head_pose: { yawDeg: 1, pitchDeg: 1, rollDeg: 0 },
      blink_estimate: 0.1,
    }
    for (let i = 0; i < MAX_TRACKING_SAMPLES + extra; i += 1) {
      if (!pushTrackingSample(frames, { ...sample, timestamp: i })) {
        overflow += 1
      }
    }
    expect(frames.length).toBe(MAX_TRACKING_SAMPLES)
    expect(overflow).toBe(extra)
    const summary = summarizeTrackingFrames(frames, 1_000, {
      tickAttempts: MAX_TRACKING_SAMPLES + extra,
      tickFailures: overflow,
    })
    expect(summary.dropped_frame_ratio).toBeGreaterThan(0)
  })
})
