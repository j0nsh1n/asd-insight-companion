/**
 * Local camera quality heuristics for research prototype (Phase 3B).
 * Pure functions — no network, no frame upload.
 */

export type FaceCountStatus = 'zero' | 'one' | 'multiple'

export type QualityCheck = {
  id: string
  label: string
  ok: boolean
  detail: string
}

export type QualityReport = {
  faceCount: number
  faceCountStatus: FaceCountStatus
  checks: QualityCheck[]
  /** All hard checks pass (gate). */
  pass: boolean
  /** Optional continuous scores for UI (0–1-ish). */
  metrics: {
    visibility: number
    brightness: number
    yawDeg: number
    pitchDeg: number
    rollDeg: number
    trackingConfidence: number
  }
}

/** Normalized landmark [0–1] in image coordinates. */
export type NormLandmark = { x: number; y: number; z?: number }

// MediaPipe Face Mesh indices (Face Landmarker compatible subset).
const NOSE_TIP = 1
const LEFT_EYE_OUTER = 33
const RIGHT_EYE_OUTER = 263
const CHIN = 152
const FOREHEAD = 10

export function faceCountStatus(count: number): FaceCountStatus {
  if (count <= 0) return 'zero'
  if (count === 1) return 'one'
  return 'multiple'
}

/** Axis-aligned bbox from landmarks (normalized 0–1). */
export function faceBoundingBox(landmarks: NormLandmark[]): {
  width: number
  height: number
  area: number
  cx: number
  cy: number
} {
  let minX = 1
  let minY = 1
  let maxX = 0
  let maxY = 0
  for (const p of landmarks) {
    minX = Math.min(minX, p.x)
    minY = Math.min(minY, p.y)
    maxX = Math.max(maxX, p.x)
    maxY = Math.max(maxY, p.y)
  }
  const width = Math.max(0, maxX - minX)
  const height = Math.max(0, maxY - minY)
  return {
    width,
    height,
    area: width * height,
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2,
  }
}

/**
 * Head pose estimate (degrees) from a few mesh landmarks.
 * Rough but stable enough for a prototype gate without matrix math.
 */
export function estimateHeadPose(landmarks: NormLandmark[]): {
  yawDeg: number
  pitchDeg: number
  rollDeg: number
} {
  const nose = landmarks[NOSE_TIP]
  const left = landmarks[LEFT_EYE_OUTER]
  const right = landmarks[RIGHT_EYE_OUTER]
  const chin = landmarks[CHIN]
  const forehead = landmarks[FOREHEAD]
  if (!nose || !left || !right) {
    return { yawDeg: 0, pitchDeg: 0, rollDeg: 0 }
  }
  const midEyeX = (left.x + right.x) / 2
  const midEyeY = (left.y + right.y) / 2
  const eyeDist = Math.hypot(right.x - left.x, right.y - left.y) || 1e-6
  // Yaw: nose left/right of eye midpoint, scaled by eye distance.
  const yawDeg = ((nose.x - midEyeX) / eyeDist) * 45
  // Pitch: nose relative to eye line vs chin-forehead span.
  const faceH =
    chin && forehead
      ? Math.max(Math.abs(chin.y - forehead.y), 1e-6)
      : eyeDist * 2
  const pitchDeg = ((nose.y - midEyeY) / faceH) * 60
  // Roll: eye line angle.
  const rollDeg = (Math.atan2(right.y - left.y, right.x - left.x) * 180) / Math.PI
  return { yawDeg, pitchDeg, rollDeg }
}

/** Mean luma 0–255 from RGBA ImageData (local canvas sample). */
export function meanBrightness(data: Uint8ClampedArray): number {
  if (data.length < 4) return 0
  let sum = 0
  let n = 0
  // Subsample for speed.
  for (let i = 0; i < data.length; i += 16) {
    const r = data[i] ?? 0
    const g = data[i + 1] ?? 0
    const b = data[i + 2] ?? 0
    sum += 0.299 * r + 0.587 * g + 0.114 * b
    n += 1
  }
  return n ? sum / n : 0
}

export type QualityThresholds = {
  minFaceArea: number
  maxFaceArea: number
  minBrightness: number
  maxBrightness: number
  maxAbsYawDeg: number
  maxAbsPitchDeg: number
  maxAbsRollDeg: number
  minTrackingConfidence: number
  /** Consecutive single-face frames needed for “stable” tracking. */
  minStableFrames: number
}

export const DEFAULT_QUALITY_THRESHOLDS: QualityThresholds = {
  minFaceArea: 0.04,
  maxFaceArea: 0.55,
  minBrightness: 35,
  maxBrightness: 230,
  maxAbsYawDeg: 25,
  maxAbsPitchDeg: 25,
  maxAbsRollDeg: 20,
  minTrackingConfidence: 0.5,
  minStableFrames: 8,
}

export function evaluateQuality(input: {
  faceLandmarksList: NormLandmark[][]
  brightness: number
  trackingConfidence: number
  stableSingleFaceFrames: number
  thresholds?: Partial<QualityThresholds>
}): QualityReport {
  const t = { ...DEFAULT_QUALITY_THRESHOLDS, ...input.thresholds }
  const faceCount = input.faceLandmarksList.length
  const status = faceCountStatus(faceCount)

  let visibility = 0
  let yawDeg = 0
  let pitchDeg = 0
  let rollDeg = 0
  if (faceCount === 1) {
    const lm = input.faceLandmarksList[0]!
    const box = faceBoundingBox(lm)
    visibility = box.area
    const pose = estimateHeadPose(lm)
    yawDeg = pose.yawDeg
    pitchDeg = pose.pitchDeg
    rollDeg = pose.rollDeg
  }

  const checks: QualityCheck[] = [
    {
      id: 'face_count',
      label: 'Face count',
      ok: status === 'one',
      detail:
        status === 'zero'
          ? 'No face detected'
          : status === 'multiple'
            ? `Multiple faces (${faceCount})`
            : 'One face',
    },
    {
      id: 'visibility',
      label: 'Face visibility',
      ok:
        status === 'one' &&
        visibility >= t.minFaceArea &&
        visibility <= t.maxFaceArea,
      detail:
        status !== 'one'
          ? 'Need one face'
          : `Face size ${(visibility * 100).toFixed(0)}% of frame`,
    },
    {
      id: 'light',
      label: 'Lighting',
      ok:
        input.brightness >= t.minBrightness &&
        input.brightness <= t.maxBrightness,
      detail: `Brightness ${input.brightness.toFixed(0)} / 255`,
    },
    {
      id: 'head_pose',
      label: 'Head pose',
      ok:
        status === 'one' &&
        Math.abs(yawDeg) <= t.maxAbsYawDeg &&
        Math.abs(pitchDeg) <= t.maxAbsPitchDeg &&
        Math.abs(rollDeg) <= t.maxAbsRollDeg,
      detail:
        status !== 'one'
          ? 'Need one face'
          : `Yaw ${yawDeg.toFixed(0)}° · Pitch ${pitchDeg.toFixed(0)}° · Roll ${rollDeg.toFixed(0)}°`,
    },
    {
      id: 'tracking',
      label: 'Tracking confidence',
      ok:
        status === 'one' &&
        input.trackingConfidence >= t.minTrackingConfidence &&
        input.stableSingleFaceFrames >= t.minStableFrames,
      detail:
        status !== 'one'
          ? 'Need one face'
          : `Confidence ${(input.trackingConfidence * 100).toFixed(0)}% · stable ${input.stableSingleFaceFrames} frames`,
    },
  ]

  return {
    faceCount,
    faceCountStatus: status,
    checks,
    pass: checks.every((c) => c.ok),
    metrics: {
      visibility,
      brightness: input.brightness,
      yawDeg,
      pitchDeg,
      rollDeg,
      trackingConfidence: input.trackingConfidence,
    },
  }
}
