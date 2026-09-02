import { afterEach, describe, expect, it } from 'vitest'
import {
  applyTheme,
  isColorTheme,
  readStoredTheme,
  resolveInitialTheme,
  THEME_STORAGE_KEY,
  toggleTheme,
} from './theme'

describe('theme', () => {
  afterEach(() => {
    localStorage.removeItem(THEME_STORAGE_KEY)
    delete document.documentElement.dataset.theme
  })

  it('accepts only light or dark', () => {
    expect(isColorTheme('light')).toBe(true)
    expect(isColorTheme('dark')).toBe(true)
    expect(isColorTheme('system')).toBe(false)
  })

  it('applies the theme to the document and stores it', () => {
    applyTheme('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(readStoredTheme()).toBe('dark')
    expect(resolveInitialTheme()).toBe('dark')
  })

  it('toggles between light and dark', () => {
    expect(toggleTheme('light')).toBe('dark')
    expect(toggleTheme('dark')).toBe('light')
  })
})
