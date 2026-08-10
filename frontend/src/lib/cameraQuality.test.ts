import { describe, expect, it } from 'vitest'
import {
  estimateHeadPose,
  evaluateQuality,
  faceBoundingBox,
  faceCountStatus,
  meanBrightness,
  type NormLandmark,
} from './cameraQuality'

function gridFace(): NormLandmark[] {
  // Sparse set including indices used by pose helpers.
  const pts: NormLandmark[] = Array.from({ length: 300 }, () => ({
    x: 0.5,
    y: 0.5,
  }))
  pts[1] = { x: 0.5, y: 0.52 } // nose
  pts[33] = { x: 0.4, y: 0.45 } // left eye
  pts[263] = { x: 0.6, y: 0.45 } // right eye
  pts[152] = { x: 0.5, y: 0.7 } // chin
  pts[10] = { x: 0.5, y: 0.3 } // forehead
  // corners for bbox
  pts[0] = { x: 0.35, y: 0.3 }
  pts[2] = { x: 0.65, y: 0.7 }
  return pts
}

describe('cameraQuality', () => {
  it('classifies face counts', () => {
    expect(faceCountStatus(0)).toBe('zero')
    expect(faceCountStatus(1)).toBe('one')
    expect(faceCountStatus(2)).toBe('multiple')
  })

  it('computes bbox area and mean brightness', () => {
    const box = faceBoundingBox([
      { x: 0.2, y: 0.2 },
      { x: 0.4, y: 0.5 },
    ])
    expect(box.width).toBeCloseTo(0.2)
    expect(box.height).toBeCloseTo(0.3)
    expect(box.area).toBeCloseTo(0.06)
    const rgba = new Uint8ClampedArray([100, 100, 100, 255, 200, 200, 200, 255])
    expect(meanBrightness(rgba)).toBeGreaterThan(50)
  })

  it('estimates near-frontal head pose for a symmetric face', () => {
    const pose = estimateHeadPose(gridFace())
    expect(Math.abs(pose.yawDeg)).toBeLessThan(15)
    expect(Math.abs(pose.rollDeg)).toBeLessThan(10)
  })

  it('fails gate with zero faces', () => {
    const r = evaluateQuality({
      faceLandmarksList: [],
      brightness: 120,
      trackingConfidence: 0,
      stableSingleFaceFrames: 0,
    })
    expect(r.faceCountStatus).toBe('zero')
    expect(r.pass).toBe(false)
    expect(r.checks.find((c) => c.id === 'face_count')?.ok).toBe(false)
  })

  it('fails gate with multiple faces', () => {
    const r = evaluateQuality({
      faceLandmarksList: [gridFace(), gridFace()],
      brightness: 120,
      trackingConfidence: 0.9,
      stableSingleFaceFrames: 20,
    })
    expect(r.faceCountStatus).toBe('multiple')
    expect(r.pass).toBe(false)
  })

  it('passes gate with one good face, light, pose, and stability', () => {
    const r = evaluateQuality({
      faceLandmarksList: [gridFace()],
      brightness: 120,
      trackingConfidence: 0.9,
      stableSingleFaceFrames: 20,
    })
    expect(r.faceCountStatus).toBe('one')
    expect(r.pass).toBe(true)
    expect(r.checks.every((c) => c.ok)).toBe(true)
  })

  it('fails on extreme darkness', () => {
    const r = evaluateQuality({
      faceLandmarksList: [gridFace()],
      brightness: 5,
      trackingConfidence: 0.9,
      stableSingleFaceFrames: 20,
    })
    expect(r.checks.find((c) => c.id === 'light')?.ok).toBe(false)
    expect(r.pass).toBe(false)
  })
})
