import type { PagePayload } from '@lernard/shared-types'
import { getAccessToken } from '@lernard/auth-core'

export async function apiFetch<T>(route: string, options?: RequestInit): Promise<T> {
  const token = getAccessToken()
  const res = await fetch(`${getBaseUrl()}${route}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  })
  if (!res.ok) throw new ApiError(res.status, await res.text())
  return res.json()
}

export async function fetchPagePayload<T>(route: string): Promise<PagePayload<T>> {
  return apiFetch<PagePayload<T>>(route)
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string,
  ) {
    super(`API Error ${status}`)
    this.name = 'ApiError'
  }
}

function getBaseUrl(): string {
  const runtime = globalThis as typeof globalThis & {
    process?: {
      env?: Record<string, string | undefined>
    }
  }

  return runtime.process?.env?.['API_URL'] ?? 'http://localhost:3001'
}
