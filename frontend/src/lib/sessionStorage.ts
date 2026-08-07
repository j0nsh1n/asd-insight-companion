const SESSION_KEY = 'asd_insight_session_id'

export function loadSessionId(): string | null {
  try {
    return sessionStorage.getItem(SESSION_KEY)
  } catch {
    return null
  }
}

export function saveSessionId(id: string): void {
  try {
    sessionStorage.setItem(SESSION_KEY, id)
  } catch {
    // ignore quota / private mode
  }
}

export function clearSessionId(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY)
  } catch {
    // ignore
  }
}
