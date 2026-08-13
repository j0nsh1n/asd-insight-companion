import { describe, expect, it } from 'vitest'
import { MODEL_URL, WASM_ROOT } from './faceLandmarker'

describe('faceLandmarker local assets', () => {
  it('points WASM and model at same-origin /mediapipe/ paths', () => {
    expect(WASM_ROOT).toBe('/mediapipe/wasm')
    expect(MODEL_URL).toBe('/mediapipe/face_landmarker.task')
    expect(WASM_ROOT).not.toMatch(/jsdelivr|googleapis|cdn\./i)
    expect(MODEL_URL).not.toMatch(/jsdelivr|googleapis|cdn\./i)
  })
})
