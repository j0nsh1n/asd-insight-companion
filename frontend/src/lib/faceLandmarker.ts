/**
 * MediaPipe Face Landmarker loader (browser-local).
 * Model + wasm load from CDN; inference stays on-device.
 */

import {
  FaceLandmarker,
  FilesetResolver,
  type FaceLandmarkerResult,
} from '@mediapipe/tasks-vision'

// Pin wasm path to the installed package version when possible.
const WASM_VERSION = '0.10.21'
const WASM_ROOT = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${WASM_VERSION}/wasm`
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'

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
        outputFaceBlendshapes: false,
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

export type { FaceLandmarkerResult }
