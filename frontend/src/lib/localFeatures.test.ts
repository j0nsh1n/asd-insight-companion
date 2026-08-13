import { describe, expect, it } from 'vitest'
import { aggregateSamples, type LocalFeatureSample } from './localFeatures'

describe('localFeatures', () => {
  it('aggregates samples without claiming media upload', () => {
    const samples: LocalFeatureSample[] = [
      {
        tMs: 0,
        faceCount: 1,
        visibility: 0.1,
        brightness: 100,
        yawDeg: 5,
        pitchDeg: -2,
        rollDeg: 0,
        trackingConfidence: 0.9,
        qualityPass: true,
      },
      {
        tMs: 500,
        faceCount: 0,
        visibility: 0,
        brightness: 80,
        yawDeg: 0,
        pitchDeg: 0,
        rollDeg: 0,
        trackingConfidence: 0,
        qualityPass: false,
      },
    ]
    const summary = aggregateSamples(samples, 1000)
    expect(summary.sample_count).toBe(2)
    expect(summary.media_uploaded).toBe(false)
    expect(summary.fraction_single_face).toBe(0.5)
    expect(summary.fraction_quality_pass).toBe(0.5)
    expect(summary.mean_brightness).toBe(90)
    expect(summary.mean_visibility).toBeCloseTo(0.05)
    expect(summary.mean_abs_yaw_deg).toBeCloseTo(2.5)
    expect(summary.duration_ms).toBe(1000)
  })

  it('returns zeros for empty sample list', () => {
    const summary = aggregateSamples([], 250)
    expect(summary.sample_count).toBe(0)
    expect(summary.duration_ms).toBe(250)
    expect(summary.media_uploaded).toBe(false)
    expect(summary.fraction_quality_pass).toBe(0)
  })
})