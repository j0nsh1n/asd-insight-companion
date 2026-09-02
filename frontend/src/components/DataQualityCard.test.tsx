import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { DataQualityBlock } from '../types/assessment'
import { DataQualityCard } from './DataQualityCard'

const baseQuality = (
  extras: Partial<DataQualityBlock> = {},
): DataQualityBlock => ({
  questionnaire_completed: true,
  questionnaire_item_count: 10,
  video_task_status: 'completed',
  tracking_ratio: 0.8,
  calibration_status: 'not_available',
  overall_quality_label: 'usable_for_research_display',
  ...extras,
})

describe('DataQualityCard', () => {
  it('labels completed and usable quality states for screen readers', () => {
    render(<DataQualityCard quality={baseQuality()} />)

    expect(
      screen.getByLabelText(/questionnaire: completed/i),
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/video task: completed/i)).toBeInTheDocument()
    expect(
      screen.getByLabelText(/tracking quality: usable/i),
    ).toBeInTheDocument()
    expect(
      screen.getByLabelText(/calibration: not available/i),
    ).toBeInTheDocument()
    expect(screen.getByText(/not clinical confidence/i)).toBeInTheDocument()
  })

  it('renders limited tracking as a quality limitation, not a score', () => {
    const { container } = render(
      <DataQualityCard
        quality={baseQuality({
          video_task_status: 'completed',
          tracking_ratio: 0.4,
          overall_quality_label: 'limited',
        })}
      />,
    )

    expect(
      screen.getByLabelText(/tracking quality: limited/i),
    ).toBeInTheDocument()
    expect(container.textContent).not.toMatch(/\brisk\b/i)
    expect(container.textContent).not.toMatch(/\bprobability\b/i)
    expect(container.textContent).not.toMatch(/\b\d+%\s*confidence\b/i)
  })

  it('renders skipped video without crashing', () => {
    render(
      <DataQualityCard
        quality={baseQuality({
          video_task_status: 'skipped',
          tracking_ratio: 0,
          overall_quality_label: 'limited',
        })}
      />,
    )

    expect(screen.getByLabelText(/video task: skipped/i)).toBeInTheDocument()
  })

  it('labels a watched clip with limited tracking without calling it skipped', () => {
    const { container } = render(
      <DataQualityCard
        quality={baseQuality({
          video_task_status: 'insufficient_tracking',
          tracking_ratio: 0,
          overall_quality_label: 'insufficient',
        })}
      />,
    )
    expect(
      screen.getByLabelText(/video task: watched, tracking limited/i),
    ).toBeInTheDocument()
    expect(container.textContent?.toLowerCase()).not.toContain('skipped')
  })
})
