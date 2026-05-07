import Constants from 'expo-constants';

import { ROUTES } from '@lernard/routes';

import { useAuthStore } from '@/store/store';

interface NativeApiOptions extends RequestInit {
  skipAuth?: boolean;
}

interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

export class NativeApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string,
  ) {
    super(`API Error ${status}`);
    this.name = 'NativeApiError';
  }
}

export class NativeAuthError extends Error {
  constructor(message = 'You need to sign in to load this screen.') {
    super(message);
    this.name = 'NativeAuthError';
  }
}

export async function nativeApiFetch<T>(
  route: string,
  options: NativeApiOptions = {},
): Promise<T> {
  const refreshToken = useAuthStore.getState().refreshToken;
  let accessToken = useAuthStore.getState().accessToken;

  if (!options.skipAuth && !accessToken && refreshToken) {
    accessToken = await refreshSession(refreshToken);
  }

  if (!options.skipAuth && !accessToken) {
    throw new NativeAuthError();
  }

  try {
    return await requestJson<T>(route, options, accessToken);
  } catch (error) {
    if (
      !options.skipAuth
      && error instanceof NativeApiError
      && error.status === 401
      && refreshToken
    ) {
      const refreshedAccessToken = await refreshSession(refreshToken);
      return requestJson<T>(route, options, refreshedAccessToken);
    }

    if (!options.skipAuth && error instanceof NativeApiError && error.status === 401) {
      useAuthStore.getState().logout();
      throw new NativeAuthError('Your session has expired. Sign in again to continue.');
    }

    throw error;
  }
}

async function requestJson<T>(
  route: string,
  options: NativeApiOptions,
  accessToken: string | null,
): Promise<T> {
  const isFormData = options.body instanceof FormData;
  const response = await fetch(`${getBaseUrl()}${route}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new NativeApiError(response.status, await response.text());
  }

  return response.json() as Promise<T>;
}

async function refreshSession(refreshToken: string): Promise<string> {
  const response = await fetch(`${getBaseUrl()}${ROUTES.AUTH.REFRESH}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    useAuthStore.getState().logout();
    throw new NativeAuthError('Your session has expired. Sign in again to continue.');
  }

  const tokens = (await response.json()) as RefreshResponse;
  useAuthStore.getState().setTokens(tokens);

  return tokens.accessToken;
}

function getBaseUrl() {
  const configuredApiUrl = Constants.expoConfig?.extra?.apiUrl;

  if (typeof configuredApiUrl === 'string' && configuredApiUrl.trim().length > 0) {
    return configuredApiUrl.replace(/\/$/, '');
  }

  return 'http://localhost:3001';
}