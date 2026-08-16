import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as camera from '../lib/camera'
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

function makeStream(): MediaStream {
  const track = { kind: 'video', stop: vi.fn() } as unknown as MediaStreamTrack
  return {
    getTracks: () => [track],
    getAudioTracks: () => [],
    getVideoTracks: () => [track],
  } as unknown as MediaStream
}

describe('Calibration', () => {
  beforeEach(() => {
    vi.mocked(camera.requestVideoOnlyStream).mockReset()
    vi.mocked(camera.stopMediaStream).mockReset()
    HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined)
  })

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

  it('declined consent hides start-with-camera and never calls getUserMedia', async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn()
    render(
      <Calibration
        cameraAllowed={false}
        onBack={vi.fn()}
        onComplete={onComplete}
      />,
    )
    expect(
      screen.queryByRole('button', { name: /start with camera/i }),
    ).not.toBeInTheDocument()
    expect(camera.requestVideoOnlyStream).not.toHaveBeenCalled()
    await user.click(
      screen.getByRole('button', { name: /skip calibration camera/i }),
    )
    expect(onComplete).toHaveBeenCalledWith('limited')
    expect(camera.requestVideoOnlyStream).not.toHaveBeenCalled()
  })

  it('attaches the live stream after Start with camera mounts step 1', async () => {
    const user = userEvent.setup()
    const stream = makeStream()
    vi.mocked(camera.requestVideoOnlyStream).mockResolvedValue(stream)

    const { container } = render(
      <Calibration onBack={vi.fn()} onComplete={vi.fn()} />,
    )
    await user.click(screen.getByRole('button', { name: /start with camera/i }))
    await waitFor(() => {
      expect(screen.getByText(/step 1 — center/i)).toBeInTheDocument()
    })
    const preview = container.querySelector('video.camera-preview')
    expect(preview).toBeTruthy()
    expect((preview as HTMLVideoElement).srcObject).toBe(stream)
  })
})
