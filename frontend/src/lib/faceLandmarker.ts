/**
 * MediaPipe Face Landmarker loader (browser-local).
 * WASM + model are served from this origin (/mediapipe/, npm postinstall).
 * Inference stays on-device. Apache-2.0; see public/mediapipe/NOTICE.
 */

import {
  FaceLandmarker,
  FilesetResolver,
  type FaceLandmarkerResult,
} from '@mediapipe/tasks-vision'

/** Same-origin paths filled by `npm run vendor:mediapipe` (postinstall). */
export const WASM_ROOT = '/mediapipe/wasm'
export const MODEL_URL = '/mediapipe/face_landmarker.task'

let landmarkerPromise: Promise<FaceLandmarker> | null = null

/** Create or reuse a VIDEO-mode Face Landmarker (numFaces up to 3). */
export async function getFaceLandmarker(): Promise<FaceLandmarker> {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const vision = await FilesetResolver.forVisionTasks(WASM_ROOT)
      return FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: MODEL_URL,
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numFaces: 3,
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: true,
      })
    })().catch((err) => {
      landmarkerPromise = null
      throw err
    })
  }
  return landmarkerPromise
}

export function closeFaceLandmarker(): void {
  // Instance is process-wide cache; close on demand if needed later.
  void landmarkerPromise?.then((lm) => {
    try {
      lm.close()
    } catch {
      // ignore
    }
  })
  landmarkerPromise = null
}

/** Run detection for a video frame (VIDEO mode). */
export function detectFacesForVideo(
  landmarker: FaceLandmarker,
  video: HTMLVideoElement,
  timestampMs: number,
): FaceLandmarkerResult {
  return landmarker.detectForVideo(video, timestampMs)
}

/**
 * Heuristic tracking confidence 0–1 when API does not expose a score.
 * Uses face presence + size stability proxy from landmark span.
 */
export function estimateTrackingConfidence(
  result: FaceLandmarkerResult,
): number {
  const faces = result.faceLandmarks?.length ?? 0
  if (faces === 0) return 0
  if (faces > 1) return 0.35
  const lm = result.faceLandmarks[0]
  if (!lm || lm.length < 10) return 0.4
  // Presence of a dense mesh implies a solid track.
  return Math.min(1, 0.55 + Math.min(lm.length, 478) / 1000)
}

/**
 * Mean of eyeBlinkLeft / eyeBlinkRight blendshapes, or null if unavailable.
 */
export function estimateBlink(result: FaceLandmarkerResult): number | null {
  const categories = result.faceBlendshapes?.[0]?.categories
  if (!categories?.length) return null
  let left: number | undefined
  let right: number | undefined
  for (const c of categories) {
    if (c.categoryName === 'eyeBlinkLeft') left = c.score
    if (c.categoryName === 'eyeBlinkRight') right = c.score
  }
  if (left == null && right == null) return null
  if (left == null) return right ?? null
  if (right == null) return left
  return (left + right) / 2
}

export type { FaceLandmarkerResult }
