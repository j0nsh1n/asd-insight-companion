import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getStimulusTaskManifest } from '../lib/stimuliManifest'
import { StimulusTaskPage } from './StimulusTaskPage'

describe('StimulusTaskPage', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () => 'Placeholder transcript.',
      }),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders instruction and start/skip controls from the manifest', () => {
    const task = getStimulusTaskManifest()
    render(<StimulusTaskPage onBack={vi.fn()} onSkip={vi.fn()} />)

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
    render(<StimulusTaskPage onBack={vi.fn()} onSkip={onSkip} />)
    await user.click(screen.getByRole('button', { name: /skip video task/i }))
    expect(onSkip).toHaveBeenCalledTimes(1)
  })

  it('Start video task loads the player and moves focus to it', async () => {
    const user = userEvent.setup()
    const task = getStimulusTaskManifest()
    render(<StimulusTaskPage onBack={vi.fn()} onSkip={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: /start video task/i }))
    const player = screen.getByLabelText(task.video_description)
    expect(player.tagName).toBe('VIDEO')
    expect(player).toHaveAttribute('src', task.video_file)
    expect(player).toHaveFocus()
  })
})
