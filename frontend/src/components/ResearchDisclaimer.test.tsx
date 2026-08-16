import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ResearchDisclaimer } from './ResearchDisclaimer'
import '../App.css'

describe('ResearchDisclaimer', () => {
  it('renders persistent research-only non-diagnostic copy', () => {
    render(<ResearchDisclaimer />)

    expect(
      screen.getByRole('note', { name: /research disclaimer/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/research prototype only\. this tool does not diagnose autism/i),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/cannot determine whether someone is autistic/i),
    ).toBeInTheDocument()
    // Not dismissible: no close/dismiss control in the banner.
    expect(
      screen.queryByRole('button', { name: /dismiss|close|hide/i }),
    ).not.toBeInTheDocument()
  })

  it('stays pinned to the top of the viewport while the page scrolls', () => {
    render(<ResearchDisclaimer />)

    const banner = screen.getByRole('note', { name: /research disclaimer/i })
    const style = window.getComputedStyle(banner)

    expect(style.position).toBe('sticky')
    expect(style.top).toBe('0px')
  })
})
