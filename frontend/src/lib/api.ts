export type HealthResponse = {
  status: string
  service: string
  version: string
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ||
  'http://127.0.0.1:8000'

export async function fetchHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/health`)
  if (!response.ok) {
    throw new Error(`Health check failed (${response.status})`)
  }
  const data = (await response.json()) as HealthResponse
  if (data.status !== 'ok') {
    throw new Error(`Unexpected health status: ${data.status ?? 'missing'}`)
  }
  return data
}

export { API_BASE_URL }
