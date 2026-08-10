/**
 * Browser camera helpers (Phase 3A).
 * Video only — audio never requested. Streams are local; never encode/upload frames.
 */

export type CameraErrorKind =
  | 'unsupported'
  | 'permission_denied'
  | 'not_found'
  | 'in_use'
  | 'unavailable'

export class CameraError extends Error {
  readonly kind: CameraErrorKind

  constructor(kind: CameraErrorKind, message: string) {
    super(message)
    this.name = 'CameraError'
    this.kind = kind
  }
}

/** Stop every MediaStreamTrack on a stream (safe if already stopped). */
export function stopMediaStream(stream: MediaStream | null | undefined): void {
  if (!stream) return
  for (const track of stream.getTracks()) {
    try {
      track.stop()
    } catch {
      // ignore
    }
  }
}

/**
 * Request a local webcam stream with audio disabled.
 * Does not send any media to a server.
 */
export async function requestVideoOnlyStream(): Promise<MediaStream> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    throw new CameraError(
      'unsupported',
      'Camera access is not supported in this browser.',
    )
  }

  try {
    return await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'user',
        width: { ideal: 640 },
        height: { ideal: 480 },
      },
      audio: false,
    })
  } catch (err) {
    const name =
      err && typeof err === 'object' && 'name' in err
        ? String((err as { name: string }).name)
        : ''
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
      throw new CameraError(
        'permission_denied',
        'Camera permission was denied. You can continue without camera for this research step, or enable access in browser settings.',
      )
    }
    if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
      throw new CameraError(
        'not_found',
        'No camera was found on this device.',
      )
    }
    if (name === 'NotReadableError' || name === 'TrackStartError') {
      throw new CameraError(
        'in_use',
        'The camera is already in use by another application.',
      )
    }
    throw new CameraError(
      'unavailable',
      'Camera is unavailable. You may skip this step for the research prototype.',
    )
  }
}

/** Assert stream has no audio tracks (privacy: audio must stay off). */
export function assertVideoOnly(stream: MediaStream): void {
  if (stream.getAudioTracks().length > 0) {
    stopMediaStream(stream)
    throw new CameraError(
      'unavailable',
      'Audio was unexpectedly enabled; camera session stopped for privacy.',
    )
  }
}
