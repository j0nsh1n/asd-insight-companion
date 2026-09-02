import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as camera from '../lib/camera'
import * as faceLandmarker from '../lib/faceLandmarker'
import { getStimulusTaskManifest } from '../lib/stimuliManifest'
import { StimulusTaskPage } from './StimulusTaskPage'

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

vi.mock('../lib/faceLandmarker', () => ({
  getFaceLandmarker: vi.fn().mockRejectedValue(new Error('offline in tests')),
  detectFacesForVideo: vi.fn(),
  estimateTrackingConfidence: vi.fn().mockReturnValue(0),
  estimateBlink: vi.fn().mockReturnValue(null),
  closeFaceLandmarker: vi.fn(),
  WASM_ROOT: '/mediapipe/wasm',
  MODEL_URL: '/mediapipe/face_landmarker.task',
}))

function makeStream(): MediaStream {
  const track = { kind: 'video', stop: vi.fn() } as unknown as MediaStreamTrack
  return {
    getTracks: () => [track],
    getAudioTracks: () => [],
    getVideoTracks: () => [track],
  } as unknown as MediaStream
}

describe('StimulusTaskPage', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () => 'Placeholder transcript.',
      }),
    )
    vi.mocked(camera.requestVideoOnlyStream).mockReset()
    vi.mocked(camera.stopMediaStream).mockReset()
    vi.mocked(faceLandmarker.closeFaceLandmarker).mockReset()
    HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders instruction and start/skip controls from the manifest', () => {
    const task = getStimulusTaskManifest()
    render(
      <StimulusTaskPage
        sessionId="sess-1"
        onBack={vi.fn()}
        onSkip={vi.fn()}
      />,
    )

    expect(
      screen.getByRole('heading', { name: task.title }),
    ).toBeInTheDocument()
    expect(screen.getByText(task.participant_instruction)).toBeInTheDocument()
    expect(
      screen.getByText(
        /this is part of a research prototype and is not a diagnostic test/i,
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /start video task/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /skip video task/i }),
    ).toBeInTheDocument()
    expect(document.querySelector('video')).toBeNull()
  })

  it('skip is available without starting and does not imply a failed task', async () => {
    const user = userEvent.setup()
    const onSkip = vi.fn()
    render(
      <StimulusTaskPage
        sessionId="sess-1"
        onBack={vi.fn()}
        onSkip={onSkip}
      />,
    )
    await user.click(screen.getByRole('button', { name: /skip video task/i }))
    expect(onSkip).toHaveBeenCalledTimes(1)
  })

  it('Start video task loads the player and moves focus to it', async () => {
    const user = userEvent.setup()
    const task = getStimulusTaskManifest()
    render(
      <StimulusTaskPage
        sessionId="sess-1"
        onBack={vi.fn()}
        onSkip={vi.fn()}
      />,
    )
    await user.click(screen.getByRole('button', { name: /start video task/i }))
    const player = screen.getByLabelText(task.video_description)
    expect(player.tagName).toBe('VIDEO')
    expect(player).toHaveAttribute('src', task.video_file)
    expect(player).toHaveFocus()
    expect(player.querySelector('track')).toBeNull()
    expect(player).not.toHaveAttribute('autoplay')
    expect((player as HTMLVideoElement).paused).toBe(true)
  })

  it('shows an alert when the clip fails to load and skip still advances', async () => {
    const user = userEvent.setup()
    const onSkip = vi.fn()
    render(
      <StimulusTaskPage
        sessionId="sess-1"
        onBack={vi.fn()}
        onSkip={onSkip}
      />,
    )
    await user.click(screen.getByRole('button', { name: /start video task/i }))
    const player = document.querySelector('video')
    expect(player).toBeTruthy()
    fireEvent.error(player as HTMLVideoElement)
    expect(screen.getByRole('alert')).toHaveTextContent(
      /the video clip isn't available in this build/i,
    )
    expect(
      screen.getByRole('button', { name: /skip video task/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /^back$/i }),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /skip video task/i }))
    expect(onSkip).toHaveBeenCalledTimes(1)
  })

  it('does not request the camera when consent was declined', async () => {
    const user = userEvent.setup()
    render(
      <StimulusTaskPage
        sessionId="sess-1"
        cameraAllowed={false}
        onBack={vi.fn()}
        onSkip={vi.fn()}
      />,
    )
    await user.click(screen.getByRole('button', { name: /start video task/i }))
    expect(camera.requestVideoOnlyStream).not.toHaveBeenCalled()
  })

  it('starts the camera on Start when consent allows and stops it on skip', async () => {
    const user = userEvent.setup()
    const stream = makeStream()
    vi.mocked(camera.requestVideoOnlyStream).mockResolvedValue(stream)
    const onSkip = vi.fn()
    render(
      <StimulusTaskPage
        sessionId="sess-1"
        cameraAllowed={true}
        onBack={vi.fn()}
        onSkip={onSkip}
      />,
    )
    await user.click(screen.getByRole('button', { name: /start video task/i }))
    await waitFor(() => {
      expect(camera.requestVideoOnlyStream).toHaveBeenCalledTimes(1)
    })
    await user.click(screen.getByRole('button', { name: /skip video task/i }))
    expect(camera.stopMediaStream).toHaveBeenCalled()
    expect(onSkip).toHaveBeenCalledTimes(1)
    const payload = onSkip.mock.calls[0][0] as {
      media_uploaded: boolean
      session_id: string
      frames?: unknown
    }
    expect(payload.media_uploaded).toBe(false)
    expect(payload.session_id).toBe('sess-1')
    expect(payload.frames).toBeUndefined()
  })

  it('pauses tracking on pause and does not upload on play/ended', async () => {
    const user = userEvent.setup()
    vi.mocked(camera.requestVideoOnlyStream).mockResolvedValue(makeStream())
    render(
      <StimulusTaskPage
        sessionId="sess-1"
        cameraAllowed={true}
        onBack={vi.fn()}
        onSkip={vi.fn()}
      />,
    )
    await user.click(screen.getByRole('button', { name: /start video task/i }))
    const clip = document.querySelector('video.stimulus-video')
    expect(clip).toBeTruthy()
    fireEvent.play(clip as HTMLVideoElement)
    fireEvent.pause(clip as HTMLVideoElement)
    fireEvent.ended(clip as HTMLVideoElement)
    expect(camera.stopMediaStream).toHaveBeenCalled()
  })

  it('never requests microphone audio at the stimulus step', async () => {
    const user = userEvent.setup()
    const getUserMedia = vi.fn().mockResolvedValue(makeStream())
    vi.stubGlobal('navigator', {
      mediaDevices: { getUserMedia },
    })
    const actual = await vi.importActual<typeof import('../lib/camera')>(
      '../lib/camera',
    )
    vi.mocked(camera.requestVideoOnlyStream).mockImplementation(
      actual.requestVideoOnlyStream,
    )

    const granted = render(
      <StimulusTaskPage
        sessionId="sess-1"
        cameraAllowed={true}
        onBack={vi.fn()}
        onSkip={vi.fn()}
      />,
    )
    await user.click(screen.getByRole('button', { name: /start video task/i }))
    await waitFor(() => {
      expect(getUserMedia.mock.calls.length).toBeGreaterThan(0)
    })
    for (const args of getUserMedia.mock.calls) {
      const constraints = args[0] as MediaStreamConstraints
      expect(constraints.audio).toBe(false)
      expect(constraints.audio).not.toBe(true)
    }
    granted.unmount()
    getUserMedia.mockClear()

    render(
      <StimulusTaskPage
        sessionId="sess-1"
        cameraAllowed={false}
        onBack={vi.fn()}
        onSkip={vi.fn()}
      />,
    )
    await user.click(screen.getByRole('button', { name: /start video task/i }))
    expect(getUserMedia).not.toHaveBeenCalled()
  })

  it('stops the camera when the clip fails to load', async () => {
    const user = userEvent.setup()
    const stream = makeStream()
    vi.mocked(camera.requestVideoOnlyStream).mockResolvedValue(stream)
    render(
      <StimulusTaskPage
        sessionId="sess-1"
        cameraAllowed={true}
        onBack={vi.fn()}
        onSkip={vi.fn()}
      />,
    )
    await user.click(screen.getByRole('button', { name: /start video task/i }))
    await waitFor(() => {
      expect(camera.requestVideoOnlyStream).toHaveBeenCalled()
    })
    fireEvent.error(document.querySelector('video.stimulus-video') as HTMLVideoElement)
    expect(camera.stopMediaStream).toHaveBeenCalled()
    expect(faceLandmarker.closeFaceLandmarker).toHaveBeenCalled()
    expect(
      screen.getByText(/the video clip isn't available in this build/i),
    ).toBeInTheDocument()
  })

  it('starts the camera only once if Start is clicked twice', async () => {
    const stream = makeStream()
    vi.mocked(camera.requestVideoOnlyStream).mockResolvedValue(stream)
    render(
      <StimulusTaskPage
        sessionId="sess-1"
        cameraAllowed={true}
        onBack={vi.fn()}
        onSkip={vi.fn()}
      />,
    )
    const start = screen.getByRole('button', { name: /start video task/i })
    fireEvent.click(start)
    fireEvent.click(start)
    await waitFor(() => {
      expect(camera.requestVideoOnlyStream).toHaveBeenCalledTimes(1)
    })
  })

  it('stops the camera on Back after Start', async () => {
    const user = userEvent.setup()
    vi.mocked(camera.requestVideoOnlyStream).mockResolvedValue(makeStream())
    const onBack = vi.fn()
    render(
      <StimulusTaskPage
        sessionId="sess-1"
        cameraAllowed={true}
        onBack={onBack}
        onSkip={vi.fn()}
      />,
    )
    await user.click(screen.getByRole('button', { name: /start video task/i }))
    await waitFor(() => {
      expect(camera.requestVideoOnlyStream).toHaveBeenCalled()
    })
    await user.click(screen.getByRole('button', { name: /^back$/i }))
    expect(camera.stopMediaStream).toHaveBeenCalled()
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('stops the camera and landmarker on pagehide during the clip', async () => {
    const user = userEvent.setup()
    vi.mocked(camera.requestVideoOnlyStream).mockResolvedValue(makeStream())
    render(
      <StimulusTaskPage
        sessionId="sess-1"
        cameraAllowed={true}
        onBack={vi.fn()}
        onSkip={vi.fn()}
      />,
    )
    await user.click(screen.getByRole('button', { name: /start video task/i }))
    await waitFor(() => {
      expect(camera.requestVideoOnlyStream).toHaveBeenCalled()
    })
    vi.mocked(camera.stopMediaStream).mockClear()
    vi.mocked(faceLandmarker.closeFaceLandmarker).mockClear()
    window.dispatchEvent(new Event('pagehide'))
    expect(camera.stopMediaStream).toHaveBeenCalled()
    expect(faceLandmarker.closeFaceLandmarker).toHaveBeenCalled()
  })

  it('keeps task_completed when the clip ends with no tracking samples', async () => {
    const user = userEvent.setup()
    const onSkip = vi.fn()
    render(
      <StimulusTaskPage
        sessionId="sess-1"
        cameraAllowed={false}
        onBack={vi.fn()}
        onSkip={onSkip}
      />,
    )
    await user.click(screen.getByRole('button', { name: /start video task/i }))
    const clip = document.querySelector('video.stimulus-video') as HTMLVideoElement
    fireEvent.play(clip)
    fireEvent.ended(clip)
    await user.click(screen.getByRole('button', { name: /skip video task/i }))
    expect(onSkip).toHaveBeenCalledTimes(1)
    const payload = onSkip.mock.calls[0][0] as { task_completed: boolean }
    expect(payload.task_completed).toBe(true)
  })

  it('closes the landmarker when the stimulus step unmounts', async () => {
    const user = userEvent.setup()
    vi.mocked(camera.requestVideoOnlyStream).mockResolvedValue(makeStream())
    const { unmount } = render(
      <StimulusTaskPage
        sessionId="sess-1"
        cameraAllowed={true}
        onBack={vi.fn()}
        onSkip={vi.fn()}
      />,
    )
    await user.click(screen.getByRole('button', { name: /start video task/i }))
    await waitFor(() => {
      expect(camera.requestVideoOnlyStream).toHaveBeenCalled()
    })
    unmount()
    expect(camera.stopMediaStream).toHaveBeenCalled()
    expect(faceLandmarker.closeFaceLandmarker).toHaveBeenCalled()
  })
})
