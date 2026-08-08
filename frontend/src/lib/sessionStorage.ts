/** Browser sessionStorage helpers for anonymous session resume. */

const SESSION_KEY = 'asd_insight_session_id'

export function loadSessionId(): string | null {
  try {
    return sessionStorage.getItem(SESSION_KEY)
  } catch {
    return null
  }
}

/** Persist session id. Returns false if storage is unavailable. */
export function saveSessionId(id: string): boolean {
  try {
    sessionStorage.setItem(SESSION_KEY, id)
    return true
  } catch {
    return false
  }
}

export function clearSessionId(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY)
  } catch {
    // ignore
  }
}
