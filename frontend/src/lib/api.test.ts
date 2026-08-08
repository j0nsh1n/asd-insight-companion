import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createSession,
  fetchHealth,
  getSession,
  postConsent,
  postIntake,
} from './api'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('fetchHealth', () => {
  it('returns body when status is ok', async () => {
    const body = {
      status: 'ok',
      service: 'asd-insight-companion',
      version: '0.0.1',
    }
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => body,
      }),
    )

    await expect(fetchHealth()).resolves.toEqual(body)
    expect(fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/v1\/health$/),
      undefined,
    )
  })

  it('throws when HTTP response is not ok', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      }),
    )

    await expect(fetchHealth()).rejects.toThrow(/Health check failed \(500\)/)
  })

  it('throws when JSON status is not ok', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'degraded' }),
      }),
    )

    await expect(fetchHealth()).rejects.toThrow(/Unexpected health status/)
  })
})

describe('session API helpers', () => {
  const sessionBody = {
    id: 'sid-1',
    stage: 'created',
    created_at: '2026-01-01T00:00:00+00:00',
    updated_at: '2026-01-01T00:00:00+00:00',
    consent: {
      research_only: false,
      no_diagnosis: false,
      data_minimization: false,
      consented_at: null,
    },
    intake: null,
  }

  it('createSession POSTs /sessions', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => sessionBody,
      }),
    )
    await expect(createSession()).resolves.toEqual(sessionBody)
    expect(fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/v1\/sessions$/),
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('surfaces a clear error when backend is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    await expect(createSession()).rejects.toThrow(/Cannot reach backend/)
  })

  it('getSession surfaces session_not_found detail', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ detail: 'session_not_found' }),
      }),
    )
    await expect(getSession('missing')).rejects.toThrow('session_not_found')
  })

  it('postConsent surfaces consent_required style details', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        json: async () => ({ detail: 'consent_already_recorded' }),
      }),
    )
    await expect(
      postConsent('sid-1', {
        research_only: true,
        no_diagnosis: true,
        data_minimization: true,
      }),
    ).rejects.toThrow('consent_already_recorded')
  })

  it('postIntake rejects with consent_required detail', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({ detail: 'consent_required' }),
      }),
    )
    await expect(
      postIntake('sid-1', {
        age_range: '25-34',
        language: 'en',
        accessibility_prefs: {
          large_text: false,
          reduced_motion: false,
          screen_reader_hints: false,
        },
        optional_context: null,
      }),
    ).rejects.toThrow('consent_required')
  })
})
