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
    // agree-to-all + three required + optional camera
    expect(boxes).toHaveLength(5)
    await user.click(
      screen.getByRole('checkbox', { name: /research-only prototype/i }),
    )
    await user.click(
      screen.getByRole('checkbox', { name: /does not diagnose autism/i }),
    )
    await user.click(
      screen.getByRole('checkbox', { name: /minimized, anonymous research data/i }),
    )
    await user.click(
      screen.getByRole('button', { name: /accept and continue/i }),
    )
    expect(onSubmit).toHaveBeenCalledWith({
      research_only: true,
      no_diagnosis: true,
      data_minimization: true,
      camera_optional: false,
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
        name: /agree to all required consent statements/i,
      }),
    )
    expect(
      screen.getByRole('checkbox', { name: /research-only prototype/i }),
    ).toBeChecked()
    expect(
      screen.getByRole('checkbox', { name: /does not diagnose autism/i }),
    ).toBeChecked()
    expect(
      screen.getByRole('checkbox', {
        name: /minimized, anonymous research data/i,
      }),
    ).toBeChecked()
    expect(
      screen.getByRole('checkbox', {
        name: /optional — camera-based attention measures/i,
      }),
    ).not.toBeChecked()

    await user.click(
      screen.getByRole('button', { name: /accept and continue/i }),
    )
    expect(onSubmit).toHaveBeenCalledWith({
      research_only: true,
      no_diagnosis: true,
      data_minimization: true,
      camera_optional: false,
    })
  })

  it('unchecking agree to all clears every statement', async () => {
    const user = userEvent.setup()
    render(
      <Consent busy={false} error={null} onSubmit={vi.fn()} onBack={vi.fn()} />,
    )

    const agreeAll = screen.getByRole('checkbox', {
      name: /agree to all required consent statements/i,
    })
    await user.click(agreeAll)
    await user.click(agreeAll)
    const boxes = screen.getAllByRole('checkbox')
    expect(boxes.every((b) => !(b as HTMLInputElement).checked)).toBe(true)
  })

  it('data-minimization consent mentions timing telemetry', () => {
    render(
      <Consent busy={false} error={null} onSubmit={vi.fn()} onBack={vi.fn()} />,
    )
    expect(
      screen.getByText(/per-question response timing/i),
    ).toBeInTheDocument()
    expect(screen.getByText(/time-to-first-interaction/i)).toBeInTheDocument()
    expect(screen.getByText(/answer-change counts/i)).toBeInTheDocument()
  })

  it('submits camera_optional true without folding it into required flags', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(
      <Consent busy={false} error={null} onSubmit={onSubmit} onBack={vi.fn()} />,
    )

    await user.click(
      screen.getByRole('checkbox', {
        name: /agree to all required consent statements/i,
      }),
    )
    await user.click(
      screen.getByRole('checkbox', {
        name: /optional — camera-based attention measures/i,
      }),
    )
    await user.click(
      screen.getByRole('button', { name: /accept and continue/i }),
    )
    expect(onSubmit).toHaveBeenCalledWith({
      research_only: true,
      no_diagnosis: true,
      data_minimization: true,
      camera_optional: true,
    })
  })

  it('camera copy does not claim diagnosis or stored-then-deleted video', () => {
    render(
      <Consent busy={false} error={null} onSubmit={vi.fn()} onBack={vi.fn()} />,
    )
    expect(screen.queryByText(/diagnostic accuracy/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/deleted after analysis/i)).not.toBeInTheDocument()
    expect(
      screen.getByText(/never recorded, uploaded, or stored/i),
    ).toBeInTheDocument()
  })
})
