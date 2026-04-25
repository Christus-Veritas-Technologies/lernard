import { useCallback, useState } from 'react';

import { ROUTES } from '@lernard/routes';
import type {
    AccountTypePayload,
    AuthResponse,
    FirstLookResult,
    FirstLookSkipResponse,
    FirstLookStartResponse,
    FirstLookSubmission,
    LoginPayload,
    ProfileSetupPayload,
    ProfileSetupResponse,
    RegisterPayload,
} from '@lernard/shared-types';

import { nativeApiFetch } from '@/lib/native-api';
import { useAuthStore } from '@/store/store';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function extractMessage(e: unknown): string {
    if (e instanceof Error) return e.message;
    return 'Something went wrong. Please try again.';
}

// ---------------------------------------------------------------------------
// Auth hooks
// ---------------------------------------------------------------------------

export function useNativeLogin() {
    const setTokens = useAuthStore((s) => s.setTokens);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const mutate = useCallback(
        async (
            payload: LoginPayload,
            callbacks?: { onSuccess?: (data: AuthResponse) => void; onError?: (msg: string) => void },
        ) => {
            setIsLoading(true);
            setError(null);
            try {
                const result = await nativeApiFetch<AuthResponse>(ROUTES.AUTH.LOGIN, {
                    method: 'POST',
                    body: JSON.stringify(payload),
                    skipAuth: true,
                });
                setTokens({ accessToken: result.accessToken, refreshToken: result.refreshToken });
                callbacks?.onSuccess?.(result);
                return result;
            } catch (e) {
                const msg = extractMessage(e);
                setError(msg);
                callbacks?.onError?.(msg);
            } finally {
                setIsLoading(false);
            }
        },
        [setTokens],
    );

    return { mutate, isLoading, error, reset: () => setError(null) };
}

export function useNativeRegister() {
    const setTokens = useAuthStore((s) => s.setTokens);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const mutate = useCallback(
        async (
            payload: RegisterPayload,
            callbacks?: { onSuccess?: (data: AuthResponse) => void; onError?: (msg: string) => void },
        ) => {
            setIsLoading(true);
            setError(null);
            try {
                const result = await nativeApiFetch<AuthResponse>(ROUTES.AUTH.REGISTER, {
                    method: 'POST',
                    body: JSON.stringify(payload),
                    skipAuth: true,
                });
                setTokens({ accessToken: result.accessToken, refreshToken: result.refreshToken });
                callbacks?.onSuccess?.(result);
                return result;
            } catch (e) {
                const msg = extractMessage(e);
                setError(msg);
                callbacks?.onError?.(msg);
            } finally {
                setIsLoading(false);
            }
        },
        [setTokens],
    );

    return { mutate, isLoading, error, reset: () => setError(null) };
}

export function useNativeAccountType() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const mutate = useCallback(
        async (
            payload: AccountTypePayload,
            callbacks?: { onSuccess?: () => void; onError?: (msg: string) => void },
        ) => {
            setIsLoading(true);
            setError(null);
            try {
                await nativeApiFetch<AccountTypePayload>(ROUTES.ONBOARDING.ACCOUNT_TYPE, {
                    method: 'POST',
                    body: JSON.stringify(payload),
                });
                callbacks?.onSuccess?.();
            } catch (e) {
                const msg = extractMessage(e);
                setError(msg);
                callbacks?.onError?.(msg);
            } finally {
                setIsLoading(false);
            }
        },
        [],
    );

    return { mutate, isLoading, error, reset: () => setError(null) };
}

export function useNativeProfileSetup() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const mutate = useCallback(
        async (
            payload: ProfileSetupPayload,
            callbacks?: { onSuccess?: (data: ProfileSetupResponse) => void; onError?: (msg: string) => void },
        ) => {
            setIsLoading(true);
            setError(null);
            try {
                const result = await nativeApiFetch<ProfileSetupResponse>(ROUTES.ONBOARDING.PROFILE, {
                    method: 'POST',
                    body: JSON.stringify(payload),
                });
                callbacks?.onSuccess?.(result);
                return result;
            } catch (e) {
                const msg = extractMessage(e);
                setError(msg);
                callbacks?.onError?.(msg);
            } finally {
                setIsLoading(false);
            }
        },
        [],
    );

    return { mutate, isLoading, error, reset: () => setError(null) };
}

export function useNativeFirstLookStart() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<FirstLookStartResponse | null>(null);

    const fetch = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await nativeApiFetch<FirstLookStartResponse>(
                ROUTES.ONBOARDING.FIRST_LOOK.START,
                { method: 'POST' },
            );
            setData(result);
            return result;
        } catch (e) {
            setError(extractMessage(e));
        } finally {
            setIsLoading(false);
        }
    }, []);

    return { fetch, isLoading, error, data };
}

export function useNativeFirstLookSubmit() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const mutate = useCallback(
        async (
            payload: FirstLookSubmission,
            callbacks?: { onSuccess?: (data: FirstLookResult) => void; onError?: (msg: string) => void },
        ) => {
            setIsLoading(true);
            setError(null);
            try {
                const result = await nativeApiFetch<FirstLookResult>(
                    ROUTES.ONBOARDING.FIRST_LOOK.SUBMIT,
                    { method: 'POST', body: JSON.stringify(payload) },
                );
                callbacks?.onSuccess?.(result);
                return result;
            } catch (e) {
                const msg = extractMessage(e);
                setError(msg);
                callbacks?.onError?.(msg);
            } finally {
                setIsLoading(false);
            }
        },
        [],
    );

    return { mutate, isLoading, error };
}

export function useNativeFirstLookSkip() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const mutate = useCallback(
        async (callbacks?: { onSuccess?: () => void; onError?: (msg: string) => void }) => {
            setIsLoading(true);
            setError(null);
            try {
                await nativeApiFetch<FirstLookSkipResponse>(ROUTES.ONBOARDING.FIRST_LOOK.SKIP, {
                    method: 'POST',
                });
                callbacks?.onSuccess?.();
            } catch (e) {
                const msg = extractMessage(e);
                setError(msg);
                callbacks?.onError?.(msg);
            } finally {
                setIsLoading(false);
            }
        },
        [],
    );

    return { mutate, isLoading, error };
}
