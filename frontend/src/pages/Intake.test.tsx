import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Intake } from './Intake'

describe('Intake', () => {
  it('does not mark fields invalid before submit', () => {
    render(
      <Intake
        busy={false}
        error={null}
        readOnlySummary={null}
        onSubmit={vi.fn()}
        onBack={vi.fn()}
      />,
    )
    expect(screen.getByLabelText(/age range/i)).not.toHaveAttribute(
      'aria-invalid',
    )
    expect(screen.getByLabelText(/language/i)).not.toHaveAttribute(
      'aria-invalid',
    )
  })

  it('marks empty required language invalid after a failed submit', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(
      <Intake
        busy={false}
        error={null}
        readOnlySummary={null}
        onSubmit={onSubmit}
        onBack={vi.fn()}
      />,
    )

    const language = screen.getByLabelText(/language/i)
    await user.clear(language)
    await user.type(language, '   ')
    await user.click(screen.getByRole('button', { name: /save intake/i }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(language).toHaveAttribute('aria-invalid', 'true')
    expect(language).toHaveAttribute('aria-describedby', 'intake-error')
    expect(screen.getByLabelText(/age range/i)).not.toHaveAttribute(
      'aria-invalid',
    )
  })

  it('shows Back and Continue on a saved intake instead of jumping home', async () => {
    const user = userEvent.setup()
    const onBack = vi.fn()
    const onContinue = vi.fn()
    render(
      <Intake
        busy={false}
        error={null}
        readOnlySummary={{
          age_range: '25-34',
          language: 'en',
          accessibility_prefs: {
            large_text: false,
            reduced_motion: false,
            screen_reader_hints: false,
          },
          optional_context: null,
        }}
        onSubmit={vi.fn()}
        onBack={onBack}
        onContinue={onContinue}
      />,
    )
    expect(
      screen.getByRole('heading', { name: /intake complete/i }),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^back$/i }))
    expect(onBack).toHaveBeenCalledTimes(1)
    await user.click(screen.getByRole('button', { name: /^continue$/i }))
    expect(onContinue).toHaveBeenCalledTimes(1)
  })
})
