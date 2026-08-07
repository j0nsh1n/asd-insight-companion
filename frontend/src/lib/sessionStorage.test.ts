import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearSessionId,
  loadSessionId,
  saveSessionId,
} from './sessionStorage'

describe('sessionStorage helpers', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('saves and loads session id for resume', () => {
    expect(loadSessionId()).toBeNull()
    saveSessionId('abc-123')
    expect(loadSessionId()).toBe('abc-123')
  })

  it('clears session id', () => {
    saveSessionId('abc-123')
    clearSessionId()
    expect(loadSessionId()).toBeNull()
  })
})
