export type HealthResponse = {
  status: string
  service: string
  version: string
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ||
  'http://localhost:8000'

export async function fetchHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/health`)
  if (!response.ok) {
    throw new Error(`Health check failed (${response.status})`)
  }
  return response.json() as Promise<HealthResponse>
}

export { API_BASE_URL }
