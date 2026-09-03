/** Appearance only. Not research data; not sent to the API. */

export type ColorTheme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'asd-color-theme'

export function isColorTheme(value: unknown): value is ColorTheme {
  return value === 'light' || value === 'dark'
}

export function readStoredTheme(): ColorTheme | null {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY)
    return isColorTheme(raw) ? raw : null
  } catch {
    return null
  }
}

export function systemPrefersDark(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function resolveInitialTheme(): ColorTheme {
  return readStoredTheme() ?? (systemPrefersDark() ? 'dark' : 'light')
}

export function applyTheme(theme: ColorTheme): void {
  document.documentElement.dataset.theme = theme
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // Private mode / quota — appearance still applies for this tab.
  }
}

export function toggleTheme(theme: ColorTheme): ColorTheme {
  return theme === 'dark' ? 'light' : 'dark'
}
