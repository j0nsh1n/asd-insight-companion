import { type Ref } from 'react'

export type StimulusPlayerProps = {
  src: string
  captionsSrc: string
  label: string
  videoRef: Ref<HTMLVideoElement>
  onError?: () => void
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
}: StimulusPlayerProps) {
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
      >
        <track kind="captions" src={captionsSrc} srcLang="en" label="English" default />
      </video>
    </div>
  )
}
