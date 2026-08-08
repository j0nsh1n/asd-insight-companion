export type HealthResponse = {
  status: string
  service: string
  version: string
}

export type SessionStage = 'created' | 'consented' | 'intake_complete'

export type AccessibilityPrefs = {
  large_text: boolean
  reduced_motion: boolean
  screen_reader_hints: boolean
}

export type SessionResponse = {
  id: string
  stage: SessionStage
  created_at: string
  updated_at: string
  consent: {
    research_only: boolean
    no_diagnosis: boolean
    data_minimization: boolean
    consented_at: string | null
  }
  intake: {
    age_range: string
    language: string
    accessibility_prefs: AccessibilityPrefs
    optional_context: string | null
  } | null
}

export type ConsentPayload = {
  research_only: boolean
  no_diagnosis: boolean
  data_minimization: boolean
}

export type IntakePayload = {
  age_range: string
  language: string
  accessibility_prefs: AccessibilityPrefs
  optional_context: string | null
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ||
  'http://127.0.0.1:8000'

async function parseError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { detail?: unknown }
    if (typeof body.detail === 'string') return body.detail
    if (Array.isArray(body.detail)) return JSON.stringify(body.detail)
  } catch {
    // ignore
  }
  return `Request failed (${response.status})`
}

async function apiFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const url = `${API_BASE_URL}${path}`
  try {
    return await fetch(url, init)
  } catch {
    throw new Error(
      `Cannot reach backend at ${API_BASE_URL} (${path}). ` +
        `Start it with: ./scripts/run-backend.sh`,
    )
  }
}

export async function fetchHealth(): Promise<HealthResponse> {
  const response = await apiFetch('/api/v1/health')
  if (!response.ok) {
    throw new Error(`Health check failed (${response.status})`)
  }
  const data = (await response.json()) as HealthResponse
  if (data.status !== 'ok') {
    throw new Error(`Unexpected health status: ${data.status ?? 'missing'}`)
  }
  return data
}

export async function createSession(): Promise<SessionResponse> {
  const response = await apiFetch('/api/v1/sessions', {
    method: 'POST',
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) {
    throw new Error(await parseError(response))
  }
  return response.json() as Promise<SessionResponse>
}

export async function getSession(sessionId: string): Promise<SessionResponse> {
  const response = await apiFetch(`/api/v1/sessions/${sessionId}`, {
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) {
    throw new Error(await parseError(response))
  }
  return response.json() as Promise<SessionResponse>
}

export async function postConsent(
  sessionId: string,
  payload: ConsentPayload,
): Promise<SessionResponse> {
  const response = await apiFetch(`/api/v1/sessions/${sessionId}/consent`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    throw new Error(await parseError(response))
  }
  return response.json() as Promise<SessionResponse>
}

export async function postIntake(
  sessionId: string,
  payload: IntakePayload,
): Promise<SessionResponse> {
  const response = await apiFetch(`/api/v1/sessions/${sessionId}/intake`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    throw new Error(await parseError(response))
  }
  return response.json() as Promise<SessionResponse>
}

export { API_BASE_URL }
