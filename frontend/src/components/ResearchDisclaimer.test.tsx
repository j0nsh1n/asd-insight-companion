import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ResearchDisclaimer } from './ResearchDisclaimer'

describe('ResearchDisclaimer', () => {
  it('renders persistent research-only non-diagnostic copy', () => {
    render(<ResearchDisclaimer />)

    expect(
      screen.getByRole('note', { name: /research disclaimer/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/research prototype only — not a medical diagnosis/i),
    ).toBeInTheDocument()
    expect(screen.getByText(/does not diagnose autism/i)).toBeInTheDocument()
    // Not dismissible: no close/dismiss control in the banner.
    expect(
      screen.queryByRole('button', { name: /dismiss|close|hide/i }),
    ).not.toBeInTheDocument()
  })
})
