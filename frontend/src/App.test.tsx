import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { fetchHealth } from './lib/api'

vi.mock('./lib/api', async () => {
  const actual = await vi.importActual<typeof import('./lib/api')>('./lib/api')
  return {
    ...actual,
    fetchHealth: vi.fn(),
  }
})

const mockedFetchHealth = vi.mocked(fetchHealth)

describe('App', () => {
  beforeEach(() => {
    mockedFetchHealth.mockReset()
  })

  it('shows the research disclaimer on the shell', async () => {
    mockedFetchHealth.mockResolvedValue({
      status: 'ok',
      service: 'asd-insight-companion',
      version: '0.0.1',
    })

    render(<App />)

    expect(
      screen.getByRole('note', { name: /research disclaimer/i }),
    ).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText(/backend: ok/i)).toBeInTheDocument()
    })
  })

  it('shows backend ok when health succeeds', async () => {
    mockedFetchHealth.mockResolvedValue({
      status: 'ok',
      service: 'asd-insight-companion',
      version: '0.0.1',
    })

    render(<App />)

    expect(screen.getByText(/checking/i)).toBeInTheDocument()
    await waitFor(() => {
      expect(
        screen.getByText(/backend: ok \(asd-insight-companion v0\.0\.1\)/i),
      ).toBeInTheDocument()
    })
  })

  it('shows backend error when health fails', async () => {
    mockedFetchHealth.mockRejectedValue(new Error('network down'))

    render(<App />)

    await waitFor(() => {
      expect(
        screen.getByText(/backend: error — network down/i),
      ).toBeInTheDocument()
    })
  })
})
