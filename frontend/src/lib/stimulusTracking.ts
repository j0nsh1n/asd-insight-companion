/**
 * In-memory stimulus tracking records (Phase 4B).
 * Numeric observations only — never frames, never uploaded, never persisted.
 */

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

export type TrackingSessionSummary = {
  sample_count: number
  duration_ms: number
  fraction_tracking_ok: number
  fraction_one_face: number
  mean_abs_yaw_deg: number
  mean_abs_pitch_deg: number
  mean_blink_estimate: number | null
  /** Frames never leave the tab. */
  media_uploaded: false
}

const TRACKING_OK_MIN_CONF = 0.5

export function emptyTrackingSummary(
  durationMs = 0,
): TrackingSessionSummary {
  return {
    sample_count: 0,
    duration_ms: durationMs,
    fraction_tracking_ok: 0,
    fraction_one_face: 0,
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

/** Summarize an in-memory frame buffer for Phase 4C. Does not I/O. */
export function summarizeTrackingFrames(
  frames: TrackingFrame[],
  durationMs: number,
): TrackingSessionSummary {
  const n = frames.length
  if (n === 0) return emptyTrackingSummary(durationMs)
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
  return {
    sample_count: n,
    duration_ms: durationMs,
    fraction_tracking_ok: ok / n,
    fraction_one_face: single / n,
    mean_abs_yaw_deg: poseN ? absYaw / poseN : 0,
    mean_abs_pitch_deg: poseN ? absPitch / poseN : 0,
    mean_blink_estimate: blinkN ? blinkSum / blinkN : null,
    media_uploaded: false,
  }
}
