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
})
