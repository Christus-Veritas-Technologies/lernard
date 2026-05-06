/**
 * Auth-specific API calls.
 *
 * All requests are made through `browserApiFetch` — the single canonical
 * HTTP client for the web app (handles token storage, refresh, 401 retry).
 */
import { setAccessToken, setRefreshToken } from "@lernard/auth-core";
import { ROUTES } from "@lernard/routes";
import type {
    AccountTypePayload,
    AuthResponse,
    FirstLookResult,
    FirstLookSkipResponse,
    FirstLookStartResponse,
    FirstLookSubmission,
    MagicLinkRequestPayload,
    MagicLinkRequestResponse,
    MagicLinkVerifyPayload,
    ProfileSetupPayload,
    ProfileSetupResponse,
    SubjectSelectionResponse,
} from "@lernard/shared-types";

import { browserApiFetch } from "./browser-api";

// Re-export so components that import AuthApiError don't need to change.
export { BrowserApiError as AuthApiError } from "./browser-api";

export function persistAuthResponse(response: AuthResponse) {
    setAccessToken(response.accessToken);
    setRefreshToken(response.refreshToken);
}

// ─── Magic Link ───────────────────────────────────────────────────────────────

export async function requestMagicLink(payload: MagicLinkRequestPayload): Promise<MagicLinkRequestResponse> {
    return browserApiFetch<MagicLinkRequestResponse>(ROUTES.AUTH.MAGIC_LINK_REQUEST, {
        method: "POST",
        body: JSON.stringify(payload),
        skipAuth: true,
    });
}

export async function verifyMagicLink(payload: MagicLinkVerifyPayload): Promise<AuthResponse> {
    return browserApiFetch<AuthResponse>(ROUTES.AUTH.MAGIC_LINK_VERIFY, {
        method: "POST",
        body: JSON.stringify(payload),
        skipAuth: true,
    });
}

// ─── Google OAuth ─────────────────────────────────────────────────────────────

interface GoogleSessionResponse {
    accessToken: string;
    refreshToken: string;
    onboardingComplete: boolean;
}

export async function exchangeGoogleSession(code: string): Promise<GoogleSessionResponse> {
    return browserApiFetch<GoogleSessionResponse>(
        `${ROUTES.AUTH.GOOGLE_SESSION}?code=${encodeURIComponent(code)}`,
        { skipAuth: true },
    );
}

// ─── Session ──────────────────────────────────────────────────────────────────

export async function logout(): Promise<void> {
    const { getRefreshToken, clearTokens } = await import("@lernard/auth-core");
    const refreshToken = getRefreshToken();
    if (!refreshToken) { clearTokens(); return; }
    await browserApiFetch(ROUTES.AUTH.LOGOUT, {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
    });
    clearTokens();
}

export async function getMe(): Promise<AuthResponse["user"]> {
    return browserApiFetch<AuthResponse["user"]>(ROUTES.AUTH.ME);
}

// ─── Onboarding ───────────────────────────────────────────────────────────────

export async function setAccountType(payload: AccountTypePayload): Promise<AccountTypePayload> {
    return browserApiFetch<AccountTypePayload>(ROUTES.ONBOARDING.ACCOUNT_TYPE, {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export async function saveProfileSetup(payload: ProfileSetupPayload): Promise<ProfileSetupResponse> {
    return browserApiFetch<ProfileSetupResponse>(ROUTES.ONBOARDING.PROFILE, {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export async function saveSubjects(subjects: string[]): Promise<SubjectSelectionResponse> {
    return browserApiFetch<SubjectSelectionResponse>(ROUTES.ONBOARDING.SUBJECTS, {
        method: "POST",
        body: JSON.stringify({ subjects }),
    });
}

export async function startFirstLook(): Promise<FirstLookStartResponse> {
    return browserApiFetch<FirstLookStartResponse>(ROUTES.ONBOARDING.FIRST_LOOK.START, { method: "POST" });
}

export async function submitFirstLook(payload: FirstLookSubmission): Promise<FirstLookResult> {
    return browserApiFetch<FirstLookResult>(ROUTES.ONBOARDING.FIRST_LOOK.SUBMIT, {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export async function skipFirstLook(): Promise<FirstLookSkipResponse> {
    return browserApiFetch<FirstLookSkipResponse>(ROUTES.ONBOARDING.FIRST_LOOK.SKIP, { method: "POST" });
}
