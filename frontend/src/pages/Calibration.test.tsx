import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Calibration } from './Calibration'

vi.mock('../lib/faceLandmarker', () => ({
  getFaceLandmarker: vi.fn().mockRejectedValue(new Error('offline')),
  detectFacesForVideo: vi.fn(),
  estimateTrackingConfidence: vi.fn().mockReturnValue(0),
}))

vi.mock('../lib/camera', async () => {
  const actual = await vi.importActual<typeof import('../lib/camera')>(
    '../lib/camera',
  )
  return {
    ...actual,
    requestVideoOnlyStream: vi.fn(),
    stopMediaStream: vi.fn(),
    assertVideoOnly: vi.fn(),
  }
})

describe('Calibration', () => {
  it('renders intro with skip path', () => {
    render(
      <Calibration onBack={vi.fn()} onComplete={vi.fn()} />,
    )
    expect(
      screen.getByRole('heading', { name: /calibration/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /skip calibration camera/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/nothing is uploaded/i),
    ).toBeInTheDocument()
  })
})
