import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SafetyNotice } from './SafetyNotice'
import '../App.css'

describe('SafetyNotice', () => {
  it('renders the persistent research-only non-diagnostic notice', () => {
    render(<SafetyNotice />)

    const notice = screen.getByRole('note', {
      name: /research session notice/i,
    })
    expect(notice).toBeInTheDocument()
    expect(notice).toHaveTextContent(
      /research prototype only — this session summary is not a diagnosis/i,
    )
    expect(notice).toHaveTextContent(
      /cannot determine whether someone is autistic/i,
    )
    expect(
      screen.queryByRole('button', { name: /dismiss|close|hide/i }),
    ).not.toBeInTheDocument()
  })
})
