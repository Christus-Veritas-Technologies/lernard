import { useCallback, useState } from 'react';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

import { ROUTES } from '@lernard/routes';
import type {
    AccountTypePayload,
    AuthSessionExchangeResponse,
    AuthResponse,
    FirstLookResult,
    FirstLookSkipResponse,
    FirstLookStartResponse,
    FirstLookSubmission,
    MagicLinkNativeVerifyResponse,
    MagicLinkRequestPayload,
    MagicLinkRequestResponse,
    ProfileSetupPayload,
    ProfileSetupResponse,
} from '@lernard/shared-types';

import { nativeApiFetch } from '@/lib/native-api';
import { useAuthStore } from '@/store/store';

WebBrowser.maybeCompleteAuthSession();

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function extractMessage(e: unknown): string {
    if (e instanceof Error) return e.message;
    return 'Something went wrong. Please try again.';
}

function isAuthResponse(value: AuthResponse | MagicLinkNativeVerifyResponse): value is AuthResponse {
    return typeof (value as AuthResponse).accessToken === 'string'
        && typeof (value as AuthResponse).refreshToken === 'string'
        && typeof (value as AuthResponse).user?.onboardingComplete === 'boolean';
}

// ---------------------------------------------------------------------------
// Magic link — request
// ---------------------------------------------------------------------------

export function useNativeRequestMagicLink() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const mutate = useCallback(
        async (
            payload: MagicLinkRequestPayload,
            callbacks?: { onSuccess?: () => void; onError?: (msg: string) => void },
        ) => {
            setIsLoading(true);
            setError(null);
            try {
                await nativeApiFetch<MagicLinkRequestResponse>(ROUTES.AUTH.MAGIC_LINK_REQUEST, {
                    method: 'POST',
                    body: JSON.stringify({ ...payload, platform: 'native' }),
                    skipAuth: true,
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

// ---------------------------------------------------------------------------
// Magic link — verify OTP
// ---------------------------------------------------------------------------

export function useNativeVerifyMagicLink() {
    const setTokens = useAuthStore((s) => s.setTokens);
    const setOnboardingComplete = useAuthStore((s) => s.setOnboardingComplete);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const mutate = useCallback(
        async (
            payload: { email: string; otp: string },
            callbacks?: { onSuccess?: (data: { onboardingComplete: boolean }) => void; onError?: (msg: string) => void },
        ) => {
            setIsLoading(true);
            setError(null);
            try {
                const result = await nativeApiFetch<AuthResponse | MagicLinkNativeVerifyResponse>(ROUTES.AUTH.MAGIC_LINK_VERIFY, {
                    method: 'POST',
                    body: JSON.stringify(payload),
                    skipAuth: true,
                });

                let accessToken = '';
                let refreshToken = '';
                let onboardingComplete = false;

                if (isAuthResponse(result)) {
                    accessToken = result.accessToken;
                    refreshToken = result.refreshToken;
                    onboardingComplete = result.user.onboardingComplete;
                } else {
                    const session = await nativeApiFetch<AuthSessionExchangeResponse>(
                        `${ROUTES.AUTH.GOOGLE_SESSION}?code=${encodeURIComponent(result.sessionCode)}`,
                        { skipAuth: true },
                    );
                    accessToken = session.accessToken;
                    refreshToken = session.refreshToken;
                    onboardingComplete = session.onboardingComplete;
                }

                setTokens({ accessToken, refreshToken });
                setOnboardingComplete(onboardingComplete);
                callbacks?.onSuccess?.({ onboardingComplete });
                return { onboardingComplete };
            } catch (e) {
                const msg = extractMessage(e);
                setError(msg);
                callbacks?.onError?.(msg);
            } finally {
                setIsLoading(false);
            }
        },
        [setTokens, setOnboardingComplete],
    );

    return { mutate, isLoading, error, reset: () => setError(null) };
}

// ---------------------------------------------------------------------------
// Google OAuth
// ---------------------------------------------------------------------------

export function useNativeGoogleAuth() {
    const router = useRouter();
    const setTokens = useAuthStore((s) => s.setTokens);
    const setOnboardingComplete = useAuthStore((s) => s.setOnboardingComplete);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const signIn = useCallback(async () => {
        if (isLoading) return;

        setIsLoading(true);
        setError(null);
        try {
            const baseUrl = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001').replace(/\/$/, '');

            const result = await WebBrowser.openAuthSessionAsync(
                `${baseUrl}/v1/auth/google?state=${encodeURIComponent('client=native')}`,
                `${process.env.EXPO_PUBLIC_APP_SCHEME ?? 'lernard'}://`,
            );

            if (result.type === 'cancel' || result.type === 'dismiss') return;

            if (result.type !== 'success' || !result.url) {
                setError('Google sign-in did not complete. Please try again.');
                return;
            }

            const callbackUrl = new URL(result.url);
            const hash = callbackUrl.hash.startsWith('#') ? callbackUrl.hash.slice(1) : callbackUrl.hash;

            if (!hash) {
                setError('Google sign-in returned an invalid response.');
                return;
            }

            const params = new URLSearchParams(hash);
            const accessToken = params.get('accessToken');
            const refreshToken = params.get('refreshToken');
            const onboardingComplete = params.get('onboardingComplete') === '1';

            if (!accessToken || !refreshToken) {
                setError('Sign-in failed. Please try again.');
                return;
            }

            setTokens({ accessToken, refreshToken });
            setOnboardingComplete(onboardingComplete);
            router.replace(onboardingComplete ? '/(app)/(home)' : '/(auth)/account-type');
        } catch (e) {
            setError(extractMessage(e));
        } finally {
            setIsLoading(false);
        }
    }, [isLoading, router, setTokens, setOnboardingComplete]);

    return { signIn, isLoading, error };
}

// ---------------------------------------------------------------------------
// Account type
// ---------------------------------------------------------------------------

export function useNativeAccountType() {
    const setOnboardingComplete = useAuthStore((s) => s.setOnboardingComplete);
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
                if (payload.accountType === 'guardian') {
                    setOnboardingComplete(true);
                }
                callbacks?.onSuccess?.();
            } catch (e) {
                const msg = extractMessage(e);
                setError(msg);
                callbacks?.onError?.(msg);
            } finally {
                setIsLoading(false);
            }
        },
        [setOnboardingComplete],
    );

    return { mutate, isLoading, error, reset: () => setError(null) };
}

// ---------------------------------------------------------------------------
// Profile setup
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// First look
// ---------------------------------------------------------------------------

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
    const setOnboardingComplete = useAuthStore((s) => s.setOnboardingComplete);
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
                setOnboardingComplete(true);
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
        [setOnboardingComplete],
    );

    return { mutate, isLoading, error };
}

export function useNativeFirstLookSkip() {
    const setOnboardingComplete = useAuthStore((s) => s.setOnboardingComplete);
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
                setOnboardingComplete(true);
                callbacks?.onSuccess?.();
            } catch (e) {
                const msg = extractMessage(e);
                setError(msg);
                callbacks?.onError?.(msg);
            } finally {
                setIsLoading(false);
            }
        },
        [setOnboardingComplete],
    );

    return { mutate, isLoading, error };
}
