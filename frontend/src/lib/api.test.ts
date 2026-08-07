import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchHealth } from './api'

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
