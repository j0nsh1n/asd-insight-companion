import { type Ref } from 'react'

export type StimulusPlayerProps = {
  src: string
  captionsSrc?: string
  label: string
  videoRef: Ref<HTMLVideoElement>
  onError?: () => void
  onPlay?: () => void
  onPause?: () => void
  onEnded?: () => void
}

/**
 * Accessible HTML video player. No autoplay, camera, or event telemetry.
 * Phase 4B can attach play/pause/ended listeners later.
 */
export function StimulusPlayer({
  src,
  captionsSrc,
  label,
  videoRef,
  onError,
  onPlay,
  onPause,
  onEnded,
}: StimulusPlayerProps) {
  const captionTrackSrc =
    typeof captionsSrc === 'string' && captionsSrc.trim().length > 0
      ? captionsSrc
      : undefined

  return (
    <div className="stimulus-video-wrap">
      <video
        ref={videoRef}
        className="stimulus-video"
        src={src}
        controls
        playsInline
        preload="metadata"
        tabIndex={0}
        aria-label={label}
        onError={onError}
        onPlay={onPlay}
        onPause={onPause}
        onEnded={onEnded}
      >
        {captionTrackSrc ? (
          <track
            kind="captions"
            src={captionTrackSrc}
            srcLang="en"
            label="English"
            default
          />
        ) : null}
      </video>
    </div>
  )
}
