/**
 * Local-only feature aggregation during stimulus (Phase 3C).
 * Numeric summaries only — never stores raw frames or video.
 */

import type { QualityReport } from './cameraQuality'

export type LocalFeatureSample = {
  tMs: number
  faceCount: number
  visibility: number
  brightness: number
  yawDeg: number
  pitchDeg: number
  rollDeg: number
  trackingConfidence: number
  qualityPass: boolean
}

export type LocalFeatureSummary = {
  sample_count: number
  duration_ms: number
  mean_visibility: number
  mean_brightness: number
  mean_abs_yaw_deg: number
  mean_abs_pitch_deg: number
  mean_tracking_confidence: number
  fraction_single_face: number
  fraction_quality_pass: number
  /** No raw media — safe for optional later API POST. */
  media_uploaded: false
}

export function sampleFromQuality(
  tMs: number,
  report: QualityReport,
): LocalFeatureSample {
  return {
    tMs,
    faceCount: report.faceCount,
    visibility: report.metrics.visibility,
    brightness: report.metrics.brightness,
    yawDeg: report.metrics.yawDeg,
    pitchDeg: report.metrics.pitchDeg,
    rollDeg: report.metrics.rollDeg,
    trackingConfidence: report.metrics.trackingConfidence,
    qualityPass: report.pass,
  }
}

export function aggregateSamples(
  samples: LocalFeatureSample[],
  durationMs: number,
): LocalFeatureSummary {
  const n = samples.length
  if (n === 0) {
    return {
      sample_count: 0,
      duration_ms: durationMs,
      mean_visibility: 0,
      mean_brightness: 0,
      mean_abs_yaw_deg: 0,
      mean_abs_pitch_deg: 0,
      mean_tracking_confidence: 0,
      fraction_single_face: 0,
      fraction_quality_pass: 0,
      media_uploaded: false,
    }
  }
  const sum = samples.reduce(
    (acc, s) => {
      acc.visibility += s.visibility
      acc.brightness += s.brightness
      acc.absYaw += Math.abs(s.yawDeg)
      acc.absPitch += Math.abs(s.pitchDeg)
      acc.conf += s.trackingConfidence
      acc.single += s.faceCount === 1 ? 1 : 0
      acc.pass += s.qualityPass ? 1 : 0
      return acc
    },
    {
      visibility: 0,
      brightness: 0,
      absYaw: 0,
      absPitch: 0,
      conf: 0,
      single: 0,
      pass: 0,
    },
  )
  return {
    sample_count: n,
    duration_ms: durationMs,
    mean_visibility: sum.visibility / n,
    mean_brightness: sum.brightness / n,
    mean_abs_yaw_deg: sum.absYaw / n,
    mean_abs_pitch_deg: sum.absPitch / n,
    mean_tracking_confidence: sum.conf / n,
    fraction_single_face: sum.single / n,
    fraction_quality_pass: sum.pass / n,
    media_uploaded: false,
  }
}
