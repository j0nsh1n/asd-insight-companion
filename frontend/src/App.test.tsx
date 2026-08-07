import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import * as api from './lib/api'
import * as sessionStore from './lib/sessionStorage'

vi.mock('./lib/api', async () => {
  const actual = await vi.importActual<typeof import('./lib/api')>('./lib/api')
  return {
    ...actual,
    fetchHealth: vi.fn(),
    createSession: vi.fn(),
    getSession: vi.fn(),
    postConsent: vi.fn(),
    postIntake: vi.fn(),
  }
})

const mocked = {
  fetchHealth: vi.mocked(api.fetchHealth),
  createSession: vi.mocked(api.createSession),
  getSession: vi.mocked(api.getSession),
  postConsent: vi.mocked(api.postConsent),
  postIntake: vi.mocked(api.postIntake),
}

const baseSession = (
  stage: api.SessionStage,
  extras: Partial<api.SessionResponse> = {},
): api.SessionResponse => ({
  id: '11111111-2222-3333-4444-555555555555',
  stage,
  created_at: '2026-01-01T00:00:00+00:00',
  updated_at: '2026-01-01T00:00:00+00:00',
  consent: {
    research_only: stage !== 'created',
    no_diagnosis: stage !== 'created',
    data_minimization: stage !== 'created',
    consented_at: stage === 'created' ? null : '2026-01-01T00:01:00+00:00',
  },
  intake:
    stage === 'intake_complete'
      ? {
          age_range: '25-34',
          language: 'en',
          accessibility_prefs: {
            large_text: false,
            reduced_motion: false,
            screen_reader_hints: false,
          },
          optional_context: null,
        }
      : null,
  ...extras,
})

describe('App Phase 1 flow', () => {
  beforeEach(() => {
    sessionStorage.clear()
    mocked.fetchHealth.mockReset()
    mocked.createSession.mockReset()
    mocked.getSession.mockReset()
    mocked.postConsent.mockReset()
    mocked.postIntake.mockReset()
    mocked.fetchHealth.mockResolvedValue({
      status: 'ok',
      service: 'asd-insight-companion',
      version: '0.0.1',
    })
  })

  it('shows research disclaimer and welcome shell', async () => {
    render(<App />)
    expect(
      screen.getByRole('note', { name: /research disclaimer/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /welcome/i }),
    ).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText(/backend: ok/i)).toBeInTheDocument()
    })
  })

  it('starts a session and reaches consent (cannot skip to intake)', async () => {
    const user = userEvent.setup()
    mocked.createSession.mockResolvedValue(baseSession('created'))

    render(<App />)
    await user.click(
      screen.getByRole('button', { name: /start anonymous session/i }),
    )

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /^consent$/i }),
      ).toBeInTheDocument()
    })
    expect(
      screen.queryByRole('heading', { name: /^intake$/i }),
    ).not.toBeInTheDocument()
    expect(sessionStore.loadSessionId()).toBe(
      '11111111-2222-3333-4444-555555555555',
    )
  })

  it('resumes consented session into intake view', async () => {
    const user = userEvent.setup()
    sessionStore.saveSessionId('11111111-2222-3333-4444-555555555555')
    mocked.getSession.mockResolvedValue(baseSession('consented'))

    render(<App />)
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /resume saved session/i }),
      ).toBeInTheDocument()
    })
    await user.click(
      screen.getByRole('button', { name: /resume saved session/i }),
    )
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /^intake$/i }),
      ).toBeInTheDocument()
    })
  })

  it('shows intake complete summary after full resume of completed stage', async () => {
    const user = userEvent.setup()
    sessionStore.saveSessionId('11111111-2222-3333-4444-555555555555')
    mocked.getSession.mockResolvedValue(baseSession('intake_complete'))

    render(<App />)
    await user.click(
      screen.getByRole('button', { name: /resume saved session/i }),
    )
    await waitFor(() => {
      expect(screen.getByText(/intake complete/i)).toBeInTheDocument()
      expect(screen.getByText(/age range: 25-34/i)).toBeInTheDocument()
    })
  })
})
