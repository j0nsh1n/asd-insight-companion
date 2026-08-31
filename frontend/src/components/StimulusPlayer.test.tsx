import { createRef } from 'react'
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StimulusPlayer } from './StimulusPlayer'

describe('StimulusPlayer', () => {
  it('does not render a caption track when captionsSrc is omitted', () => {
    const videoRef = createRef<HTMLVideoElement>()
    const { container } = render(
      <StimulusPlayer
        src="/stimuli/social-interaction-v1.mp4"
        label="Silent clip"
        videoRef={videoRef}
      />,
    )
    const video = container.querySelector('video')
    expect(video).toBeTruthy()
    expect(video?.querySelector('track')).toBeNull()
    expect(video).not.toHaveAttribute('autoplay')
    expect(video?.paused).toBe(true)
  })

  it('renders a captions track when captionsSrc is supplied', () => {
    const videoRef = createRef<HTMLVideoElement>()
    const { container } = render(
      <StimulusPlayer
        src="/stimuli/social-interaction-v1.mp4"
        captionsSrc="/stimuli/social-interaction-v1.en.vtt"
        label="Clip with captions"
        videoRef={videoRef}
      />,
    )
    const track = container.querySelector('video track')
    expect(track).not.toBeNull()
    expect(track).toHaveAttribute('kind', 'captions')
    expect(track).toHaveAttribute('src', '/stimuli/social-interaction-v1.en.vtt')
    expect(track).toHaveAttribute('srclang', 'en')
    expect(track).toHaveAttribute('label', 'English')
    expect(track).toHaveAttribute('default')
  })
})
