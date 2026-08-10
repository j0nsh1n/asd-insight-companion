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

function makeStream(): MediaStream {
  const track = { kind: 'video', stop: vi.fn() } as unknown as MediaStreamTrack
  return {
    getTracks: () => [track],
    getAudioTracks: () => [],
    getVideoTracks: () => [track],
  } as unknown as MediaStream
}

describe('CameraCheck', () => {
  beforeEach(() => {
    vi.mocked(camera.requestVideoOnlyStream).mockReset()
    vi.mocked(camera.stopMediaStream).mockReset()
    vi.mocked(camera.assertVideoOnly).mockReset()
    HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('does not call getUserMedia on mount (only after Enable)', () => {
    render(<CameraCheck onBack={vi.fn()} onComplete={vi.fn()} />)
    expect(camera.requestVideoOnlyStream).not.toHaveBeenCalled()
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
      new camera.CameraError(
        'permission_denied',
        'Camera permission was denied.',
      ),
    )
    render(<CameraCheck onBack={vi.fn()} onComplete={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: /enable camera/i }))
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        /permission was denied/i,
      )
    })
    expect(
      screen.getByRole('button', { name: /continue without camera/i }),
    ).toBeInTheDocument()
  })

  it('stops stream on cancel', async () => {
    const user = userEvent.setup()
    const onBack = vi.fn()
    const stream = makeStream()
    vi.mocked(camera.requestVideoOnlyStream).mockResolvedValue(stream)

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

  it('stops every track when unmounting while preview is live', async () => {
    const user = userEvent.setup()
    const stream = makeStream()
    vi.mocked(camera.requestVideoOnlyStream).mockResolvedValue(stream)

    const { unmount } = render(
      <CameraCheck onBack={vi.fn()} onComplete={vi.fn()} />,
    )
    await user.click(screen.getByRole('button', { name: /enable camera/i }))
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /continue \(stop camera\)/i }),
      ).toBeInTheDocument()
    })
    // Live preview holds streamRef; unmount cleanup must stop it.
    vi.mocked(camera.stopMediaStream).mockClear()
    unmount()
    expect(camera.stopMediaStream).toHaveBeenCalledWith(stream)
  })

  it('stops the stream if unmounted while getUserMedia is still pending', async () => {
    const user = userEvent.setup()
    let resolveStream!: (s: MediaStream) => void
    const pending = new Promise<MediaStream>((resolve) => {
      resolveStream = resolve
    })
    vi.mocked(camera.requestVideoOnlyStream).mockReturnValue(pending)

    const { unmount } = render(
      <CameraCheck onBack={vi.fn()} onComplete={vi.fn()} />,
    )
    await user.click(screen.getByRole('button', { name: /enable camera/i }))
    expect(camera.requestVideoOnlyStream).toHaveBeenCalledTimes(1)

    unmount()

    const lateStream = makeStream()
    resolveStream(lateStream)
    await waitFor(() => {
      expect(camera.stopMediaStream).toHaveBeenCalledWith(lateStream)
    })
    // Must not leave a live orphan: stop was applied to the resolved stream.
    expect(
      vi.mocked(camera.stopMediaStream).mock.calls.some((c) => c[0] === lateStream),
    ).toBe(true)
  })
})
