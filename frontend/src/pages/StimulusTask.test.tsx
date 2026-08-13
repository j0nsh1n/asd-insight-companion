import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import * as camera from '../lib/camera'
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

  it('declined consent hides camera sampling and never calls getUserMedia', () => {
    render(
      <StimulusTask
        cameraAllowed={false}
        onBack={vi.fn()}
        onComplete={vi.fn()}
      />,
    )
    expect(
      screen.queryByRole('button', { name: /enable camera sampling/i }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /play clip/i }),
    ).toBeInTheDocument()
    expect(camera.requestVideoOnlyStream).not.toHaveBeenCalled()
  })

  it('load error stops the dead end and offers continue without the clip', async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn()
    const { container } = render(
      <StimulusTask onBack={vi.fn()} onComplete={onComplete} />,
    )
    const clip = container.querySelector('video.stimulus-video')
    expect(clip).toBeTruthy()
    fireEvent.error(clip as HTMLVideoElement)
    expect(
      await screen.findByRole('button', { name: /continue without the clip/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /finish task/i }),
    ).toBeDisabled()
    expect(camera.stopMediaStream).toHaveBeenCalled()
    await user.click(
      screen.getByRole('button', { name: /continue without the clip/i }),
    )
    expect(onComplete).toHaveBeenCalled()
    const summary = onComplete.mock.calls[0][0] as { media_uploaded: boolean }
    expect(summary.media_uploaded).toBe(false)
  })
})
