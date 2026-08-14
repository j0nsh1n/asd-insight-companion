/**
 * In-memory stimulus tracking (Phase 4B/4C).
 * Numeric observations only — never frames, never persisted to disk.
 */

import featureQualityThresholds from '@shared/feature_quality_thresholds.json'
import { estimateHeadPose, type NormLandmark } from './cameraQuality'
import {
  estimateBlink,
  estimateTrackingConfidence,
  type FaceLandmarkerResult,
} from './faceLandmarker'

export type HeadPoseSample = {
  yawDeg: number
  pitchDeg: number
  rollDeg: number
}

export type TrackingFrame = {
  timestamp: number
  tracking_ok: boolean
  one_face: boolean
  head_pose: HeadPoseSample | null
  blink_estimate: number | null
}

export type DataQuality = 'ok' | 'low' | 'insufficient' | 'unavailable'

/** Shared with backend via shared/feature_quality_thresholds.json. */
export const FEATURE_QUALITY_THRESHOLDS = {
  min_valid_tracking_duration_ms: Number(
    featureQualityThresholds.min_valid_tracking_duration_ms,
  ),
  min_tracking_ratio_sufficient: Number(
    featureQualityThresholds.min_tracking_ratio_sufficient,
  ),
  min_tracking_ratio_ok: Number(featureQualityThresholds.min_tracking_ratio_ok),
  max_dropped_frame_ratio_ok: Number(
    featureQualityThresholds.max_dropped_frame_ratio_ok,
  ),
} as const

export type TrackingSessionSummary = {
  sample_count: number
  duration_ms: number
  tracking_ratio: number
  single_face_ratio: number
  dropped_frame_ratio: number
  valid_tracking_duration_ms: number
  task_completed: boolean
  data_quality: DataQuality
  mean_abs_yaw_deg: number
  mean_abs_pitch_deg: number
  mean_blink_estimate: number | null
  media_uploaded: false
}

/** JSON-only wire format. No frames, images, or landmarks. */
export type FeaturePayload = {
  session_id: string
  task_version: string
  sample_count: number
  duration_ms: number
  tracking_ratio: number
  single_face_ratio: number
  dropped_frame_ratio: number
  valid_tracking_duration_ms: number
  task_completed: boolean
  data_quality: DataQuality
  mean_abs_yaw_deg: number
  mean_abs_pitch_deg: number
  mean_blink_estimate: number | null
  media_uploaded: false
}

const TRACKING_OK_MIN_CONF = 0.5

export function emptyTrackingSummary(
  durationMs = 0,
): TrackingSessionSummary {
  return {
    sample_count: 0,
    duration_ms: durationMs,
    tracking_ratio: 0,
    single_face_ratio: 0,
    dropped_frame_ratio: 0,
    valid_tracking_duration_ms: 0,
    task_completed: false,
    data_quality: 'unavailable',
    mean_abs_yaw_deg: 0,
    mean_abs_pitch_deg: 0,
    mean_blink_estimate: null,
    media_uploaded: false,
  }
}

export function frameFromDetection(
  timestamp: number,
  result: FaceLandmarkerResult,
): TrackingFrame {
  const faces = result.faceLandmarks ?? []
  const one_face = faces.length === 1
  const conf = estimateTrackingConfidence(result)
  const tracking_ok = one_face && conf >= TRACKING_OK_MIN_CONF
  let head_pose: HeadPoseSample | null = null
  if (one_face) {
    const lm: NormLandmark[] = faces[0]!.map((p) => ({
      x: p.x,
      y: p.y,
      z: p.z,
    }))
    head_pose = estimateHeadPose(lm)
  }
  return {
    timestamp,
    tracking_ok,
    one_face,
    head_pose,
    blink_estimate: one_face ? estimateBlink(result) : null,
  }
}

export function classifyFeatureQuality(input: {
  sample_count: number
  valid_tracking_duration_ms: number
  tracking_ratio: number
  dropped_frame_ratio: number
}): DataQuality {
  const t = FEATURE_QUALITY_THRESHOLDS
  if (input.sample_count === 0) return 'unavailable'
  if (
    input.valid_tracking_duration_ms < t.min_valid_tracking_duration_ms ||
    input.tracking_ratio < t.min_tracking_ratio_sufficient
  ) {
    return 'insufficient'
  }
  if (
    input.tracking_ratio < t.min_tracking_ratio_ok ||
    input.dropped_frame_ratio > t.max_dropped_frame_ratio_ok
  ) {
    return 'low'
  }
  return 'ok'
}

function validTrackingDurationMs(frames: TrackingFrame[]): number {
  let acc = 0
  for (let i = 1; i < frames.length; i += 1) {
    const prev = frames[i - 1]!
    const cur = frames[i]!
    const dt = cur.timestamp - prev.timestamp
    if (dt > 0 && cur.tracking_ok) acc += dt
  }
  return Math.round(acc)
}

export type SummarizeOpts = {
  taskCompleted?: boolean
  tickAttempts?: number
  tickFailures?: number
}

/** Summarize then the caller must drop the frame buffer. Does not I/O. */
export function summarizeTrackingFrames(
  frames: TrackingFrame[],
  durationMs: number,
  opts: SummarizeOpts = {},
): TrackingSessionSummary {
  const n = frames.length
  const attempts = Math.max(0, opts.tickAttempts ?? n)
  const failures = Math.max(0, opts.tickFailures ?? 0)
  if (n === 0) {
    const empty = emptyTrackingSummary(durationMs)
    const dropped = attempts > 0 ? failures / attempts : 0
    return {
      ...empty,
      dropped_frame_ratio: dropped,
      task_completed: Boolean(opts.taskCompleted),
      data_quality: classifyFeatureQuality({
        sample_count: 0,
        valid_tracking_duration_ms: 0,
        tracking_ratio: 0,
        dropped_frame_ratio: dropped,
      }),
    }
  }
  let ok = 0
  let single = 0
  let absYaw = 0
  let absPitch = 0
  let poseN = 0
  let blinkSum = 0
  let blinkN = 0
  for (const f of frames) {
    if (f.tracking_ok) ok += 1
    if (f.one_face) single += 1
    if (f.head_pose) {
      absYaw += Math.abs(f.head_pose.yawDeg)
      absPitch += Math.abs(f.head_pose.pitchDeg)
      poseN += 1
    }
    if (f.blink_estimate != null) {
      blinkSum += f.blink_estimate
      blinkN += 1
    }
  }
  const validMs = Math.min(validTrackingDurationMs(frames), durationMs)
  const trackingRatio = ok / n
  const dropped = attempts > 0 ? Math.min(1, failures / attempts) : 0
  return {
    sample_count: n,
    duration_ms: durationMs,
    tracking_ratio: trackingRatio,
    single_face_ratio: single / n,
    dropped_frame_ratio: dropped,
    valid_tracking_duration_ms: validMs,
    task_completed: Boolean(opts.taskCompleted),
    data_quality: classifyFeatureQuality({
      sample_count: n,
      valid_tracking_duration_ms: validMs,
      tracking_ratio: trackingRatio,
      dropped_frame_ratio: dropped,
    }),
    mean_abs_yaw_deg: poseN ? absYaw / poseN : 0,
    mean_abs_pitch_deg: poseN ? absPitch / poseN : 0,
    mean_blink_estimate: blinkN ? blinkSum / blinkN : null,
    media_uploaded: false,
  }
}

export function buildFeaturePayload(
  sessionId: string,
  taskVersion: string,
  summary: TrackingSessionSummary,
): FeaturePayload {
  return {
    session_id: sessionId,
    task_version: taskVersion,
    sample_count: summary.sample_count,
    duration_ms: summary.duration_ms,
    tracking_ratio: summary.tracking_ratio,
    single_face_ratio: summary.single_face_ratio,
    dropped_frame_ratio: summary.dropped_frame_ratio,
    valid_tracking_duration_ms: summary.valid_tracking_duration_ms,
    task_completed: summary.task_completed,
    data_quality: summary.data_quality,
    mean_abs_yaw_deg: summary.mean_abs_yaw_deg,
    mean_abs_pitch_deg: summary.mean_abs_pitch_deg,
    mean_blink_estimate: summary.mean_blink_estimate,
    media_uploaded: false,
  }
}
