import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  assertVideoOnly,
  CameraError,
  requestVideoOnlyStream,
  stopMediaStream,
} from './camera'

function mockTrack(kind: 'video' | 'audio'): MediaStreamTrack {
  return {
    kind,
    stop: vi.fn(),
    // minimal stubs
  } as unknown as MediaStreamTrack
}

function mockStream(tracks: MediaStreamTrack[]): MediaStream {
  return {
    getTracks: () => tracks,
    getAudioTracks: () => tracks.filter((t) => t.kind === 'audio'),
    getVideoTracks: () => tracks.filter((t) => t.kind === 'video'),
  } as unknown as MediaStream
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('camera helpers', () => {
  it('requests getUserMedia with audio: false', async () => {
    const stream = mockStream([mockTrack('video')])
    const getUserMedia = vi.fn().mockResolvedValue(stream)
    vi.stubGlobal('navigator', {
      mediaDevices: { getUserMedia },
    })

    const result = await requestVideoOnlyStream()
    expect(result).toBe(stream)
    expect(getUserMedia).toHaveBeenCalledWith(
      expect.objectContaining({ audio: false }),
    )
    const constraints = getUserMedia.mock.calls[0][0] as MediaStreamConstraints
    expect(constraints.audio).toBe(false)
    expect(constraints.video).toBeTruthy()
  })

  it('maps permission denied to CameraError', async () => {
    const err = new Error('denied')
    err.name = 'NotAllowedError'
    vi.stubGlobal('navigator', {
      mediaDevices: {
        getUserMedia: vi.fn().mockRejectedValue(err),
      },
    })
    await expect(requestVideoOnlyStream()).rejects.toMatchObject({
      kind: 'permission_denied',
    })
  })

  it('stops all tracks on stopMediaStream', () => {
    const v = mockTrack('video')
    const stream = mockStream([v])
    stopMediaStream(stream)
    expect(v.stop).toHaveBeenCalled()
  })

  it('assertVideoOnly rejects streams with audio', () => {
    const stream = mockStream([mockTrack('video'), mockTrack('audio')])
    expect(() => assertVideoOnly(stream)).toThrow(CameraError)
  })
})
