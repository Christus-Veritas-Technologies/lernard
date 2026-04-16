const TOKEN_KEY = 'lernard_access_token'
const REFRESH_KEY = 'lernard_refresh_token'

export function getAccessToken(): string | null {
  if (typeof globalThis.localStorage === 'undefined') return null
  return globalThis.localStorage.getItem(TOKEN_KEY)
}

export function setAccessToken(token: string): void {
  if (typeof globalThis.localStorage === 'undefined') return
  globalThis.localStorage.setItem(TOKEN_KEY, token)
}

export function getRefreshToken(): string | null {
  if (typeof globalThis.localStorage === 'undefined') return null
  return globalThis.localStorage.getItem(REFRESH_KEY)
}

export function setRefreshToken(token: string): void {
  if (typeof globalThis.localStorage === 'undefined') return
  globalThis.localStorage.setItem(REFRESH_KEY, token)
}

export function clearTokens(): void {
  if (typeof globalThis.localStorage === 'undefined') return
  globalThis.localStorage.removeItem(TOKEN_KEY)
  globalThis.localStorage.removeItem(REFRESH_KEY)
}
