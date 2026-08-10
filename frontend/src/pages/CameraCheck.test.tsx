import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as camera from '../lib/camera'
import { CameraCheck } from './CameraCheck'

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

describe('CameraCheck', () => {
  beforeEach(() => {
    vi.mocked(camera.requestVideoOnlyStream).mockReset()
    vi.mocked(camera.stopMediaStream).mockReset()
    vi.mocked(camera.assertVideoOnly).mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows privacy note that video is not uploaded', () => {
    render(<CameraCheck onBack={vi.fn()} onComplete={vi.fn()} />)
    expect(
      screen.getByText(/not uploaded or stored on the server/i),
    ).toBeInTheDocument()
    expect(screen.getByText(/audio: false/i)).toBeInTheDocument()
  })

  it('shows permission denied fallback', async () => {
    const user = userEvent.setup()
    vi.mocked(camera.requestVideoOnlyStream).mockRejectedValue(
      new camera.CameraError('permission_denied', 'Camera permission was denied.'),
    )
    render(<CameraCheck onBack={vi.fn()} onComplete={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: /enable camera/i }))
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/permission was denied/i)
    })
    expect(
      screen.getByRole('button', { name: /continue without camera/i }),
    ).toBeInTheDocument()
  })

  it('stops stream on cancel', async () => {
    const user = userEvent.setup()
    const onBack = vi.fn()
    const stream = {
      getTracks: () => [],
      getAudioTracks: () => [],
      getVideoTracks: () => [],
    } as unknown as MediaStream
    vi.mocked(camera.requestVideoOnlyStream).mockResolvedValue(stream)

    // Mock video play
    HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined)

    render(<CameraCheck onBack={onBack} onComplete={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: /enable camera/i }))
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /continue \(stop camera\)/i }),
      ).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /cancel/i }))
    expect(camera.stopMediaStream).toHaveBeenCalled()
    expect(onBack).toHaveBeenCalled()
  })
})
