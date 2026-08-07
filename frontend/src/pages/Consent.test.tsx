import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Consent } from './Consent'

describe('Consent', () => {
  it('blocks submit when consent is incomplete', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(
      <Consent busy={false} error={null} onSubmit={onSubmit} onBack={vi.fn()} />,
    )

    await user.click(
      screen.getByRole('button', { name: /accept and continue/i }),
    )
    expect(onSubmit).not.toHaveBeenCalled()
    expect(
      screen.getByText(/consent is incomplete/i),
    ).toBeInTheDocument()
  })

  it('submits only when all three flags are accepted', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(
      <Consent busy={false} error={null} onSubmit={onSubmit} onBack={vi.fn()} />,
    )

    const boxes = screen.getAllByRole('checkbox')
    expect(boxes).toHaveLength(3)
    for (const box of boxes) {
      await user.click(box)
    }
    await user.click(
      screen.getByRole('button', { name: /accept and continue/i }),
    )
    expect(onSubmit).toHaveBeenCalledWith({
      research_only: true,
      no_diagnosis: true,
      data_minimization: true,
    })
  })
})
