import { describe, expect, it } from 'vitest'
import {
  estimateBlink,
  MODEL_URL,
  WASM_ROOT,
  type FaceLandmarkerResult,
} from './faceLandmarker'

function blendResult(
  categories: { categoryName: string; score: number }[],
): FaceLandmarkerResult {
  return {
    faceLandmarks: [],
    faceBlendshapes: [
      {
        categories: categories.map((c, index) => ({
          ...c,
          index,
          displayName: '',
        })),
        headIndex: 0,
        headName: '',
      },
    ],
    facialTransformationMatrixes: [],
  }
}

describe('faceLandmarker local assets', () => {
  it('points WASM and model at same-origin /mediapipe/ paths', () => {
    expect(WASM_ROOT).toBe('/mediapipe/wasm')
    expect(MODEL_URL).toBe('/mediapipe/face_landmarker.task')
    expect(WASM_ROOT).not.toMatch(/jsdelivr|googleapis|cdn\./i)
    expect(MODEL_URL).not.toMatch(/jsdelivr|googleapis|cdn\./i)
  })

  it('averages eye blink blendshapes and returns null when absent', () => {
    expect(estimateBlink(blendResult([]))).toBeNull()
    expect(
      estimateBlink(
        blendResult([
          { categoryName: 'eyeBlinkLeft', score: 0.2 },
          { categoryName: 'eyeBlinkRight', score: 0.4 },
        ]),
      ),
    ).toBeCloseTo(0.3)
  })
})
