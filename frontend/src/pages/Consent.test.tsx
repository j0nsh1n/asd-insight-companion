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
    // agree-to-all + three statements
    expect(boxes).toHaveLength(4)
    for (const box of boxes.slice(1)) {
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

  it('agree to all checks every statement and allows submit', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(
      <Consent busy={false} error={null} onSubmit={onSubmit} onBack={vi.fn()} />,
    )

    await user.click(
      screen.getByRole('checkbox', {
        name: /agree to all consent statements/i,
      }),
    )
    const boxes = screen.getAllByRole('checkbox')
    expect(boxes.every((b) => (b as HTMLInputElement).checked)).toBe(true)

    await user.click(
      screen.getByRole('button', { name: /accept and continue/i }),
    )
    expect(onSubmit).toHaveBeenCalledWith({
      research_only: true,
      no_diagnosis: true,
      data_minimization: true,
    })
  })

  it('unchecking agree to all clears every statement', async () => {
    const user = userEvent.setup()
    render(
      <Consent busy={false} error={null} onSubmit={vi.fn()} onBack={vi.fn()} />,
    )

    const agreeAll = screen.getByRole('checkbox', {
      name: /agree to all consent statements/i,
    })
    await user.click(agreeAll)
    await user.click(agreeAll)
    const boxes = screen.getAllByRole('checkbox')
    expect(boxes.every((b) => !(b as HTMLInputElement).checked)).toBe(true)
  })
})
