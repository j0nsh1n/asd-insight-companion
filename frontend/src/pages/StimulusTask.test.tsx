import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { StimulusTask } from './StimulusTask'

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

describe('StimulusTask', () => {
  it('loads title from shared stimulus config and privacy copy', () => {
    render(<StimulusTask onBack={vi.fn()} onComplete={vi.fn()} />)
    expect(
      screen.getByRole('heading', { name: /short attention clip/i }),
    ).toBeInTheDocument()
    expect(screen.getByText(/no raw video is uploaded/i)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /play clip/i }),
    ).toBeInTheDocument()
  })
})
