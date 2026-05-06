import axios, { AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from "axios";

import {
    clearTokens,
    getAccessToken,
    getRefreshToken,
    setAccessToken,
    setRefreshToken,
} from "@lernard/auth-core";
import { ROUTES } from "@lernard/routes";
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
    SubjectSelectionResponse,
} from "@lernard/shared-types";

declare module "axios" {
    interface AxiosRequestConfig {
        skipAuth?: boolean;
        _retry?: boolean;
    }

    interface InternalAxiosRequestConfig {
        skipAuth?: boolean;
        _retry?: boolean;
    }
}

interface RefreshResponse {
    accessToken: string;
    refreshToken: string;
}

export class AuthApiError extends Error {
    readonly status: number;
    readonly body: string;

    constructor(status: number, body: string) {
        super(getErrorMessage(body, status));
        this.name = "AuthApiError";
        this.status = status;
        this.body = body;
    }
}

const authApi = axios.create({
    baseURL: getBaseUrl(),
    headers: {
        "Content-Type": "application/json",
    },
});

const refreshApi = axios.create({
    baseURL: getBaseUrl(),
    headers: {
        "Content-Type": "application/json",
    },
});

authApi.interceptors.request.use((config) => {
    const nextConfig = config;
    const accessToken = getAccessToken();

    if (!nextConfig.skipAuth && accessToken) {
        nextConfig.headers.set("Authorization", `Bearer ${accessToken}`);
    }

    return nextConfig;
});

authApi.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const response = error.response;
        const config = error.config as InternalAxiosRequestConfig | undefined;

        if (!response || !config) {
            throw normalizeAxiosError(error);
        }

        if (config.skipAuth || response.status !== 401 || config._retry) {
            if (response.status === 401 && !config.skipAuth) {
                clearTokens();
            }
            throw normalizeAxiosError(error);
        }

        const refreshToken = getRefreshToken();
        if (!refreshToken) {
            clearTokens();
            throw normalizeAxiosError(error);
        }

        try {
            const refreshed = await refreshSession(refreshToken);
            config._retry = true;
            config.headers.set("Authorization", `Bearer ${refreshed}`);
            return authApi(config);
        } catch {
            clearTokens();
            throw normalizeAxiosError(error);
        }
    },
);

export function persistAuthResponse(response: AuthResponse) {
    setAccessToken(response.accessToken);
    setRefreshToken(response.refreshToken);
}

export async function register(payload: RegisterPayload): Promise<AuthResponse> {
    const response = await authApi.post<AuthResponse>(
        ROUTES.AUTH.REGISTER,
        payload,
        { skipAuth: true } satisfies AxiosRequestConfig,
    );
    return response.data;
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
    const response = await authApi.post<AuthResponse>(
        ROUTES.AUTH.LOGIN,
        payload,
        { skipAuth: true } satisfies AxiosRequestConfig,
    );
    return response.data;
}

export async function loginWithGoogleCode(code: string): Promise<AuthResponse> {
    const response = await authApi.post<AuthResponse>(
        ROUTES.AUTH.GOOGLE_CODE,
        { code },
        { skipAuth: true } satisfies AxiosRequestConfig,
    );
    return response.data;
}

export async function logout(): Promise<void> {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
        clearTokens();
        return;
    }

    await authApi.post(
        ROUTES.AUTH.LOGOUT,
        { refreshToken },
    );
    clearTokens();
}

export async function getMe() {
    const response = await authApi.get<AuthResponse["user"]>(ROUTES.AUTH.ME);
    return response.data;
}

export async function setAccountType(payload: AccountTypePayload): Promise<AccountTypePayload> {
    const response = await authApi.post<AccountTypePayload>(ROUTES.ONBOARDING.ACCOUNT_TYPE, payload);
    return response.data;
}

export async function saveProfileSetup(payload: ProfileSetupPayload): Promise<ProfileSetupResponse> {
    const response = await authApi.post<ProfileSetupResponse>(ROUTES.ONBOARDING.PROFILE, payload);
    return response.data;
}

export async function saveSubjects(subjects: string[]): Promise<SubjectSelectionResponse> {
    const response = await authApi.post<SubjectSelectionResponse>(ROUTES.ONBOARDING.SUBJECTS, { subjects });
    return response.data;
}

export async function startFirstLook(): Promise<FirstLookStartResponse> {
    const response = await authApi.post<FirstLookStartResponse>(ROUTES.ONBOARDING.FIRST_LOOK.START);
    return response.data;
}

export async function submitFirstLook(payload: FirstLookSubmission): Promise<FirstLookResult> {
    const response = await authApi.post<FirstLookResult>(ROUTES.ONBOARDING.FIRST_LOOK.SUBMIT, payload);
    return response.data;
}

export async function skipFirstLook(): Promise<FirstLookSkipResponse> {
    const response = await authApi.post<FirstLookSkipResponse>(ROUTES.ONBOARDING.FIRST_LOOK.SKIP);
    return response.data;
}

async function refreshSession(refreshToken: string): Promise<string> {
    const response = await refreshApi.post<RefreshResponse>(ROUTES.AUTH.REFRESH, { refreshToken });
    setAccessToken(response.data.accessToken);
    setRefreshToken(response.data.refreshToken);
    return response.data.accessToken;
}

function normalizeAxiosError(error: AxiosError): AuthApiError {
    const status = error.response?.status ?? 500;
    const body = stringifyErrorBody(error.response?.data);
    return new AuthApiError(status, body);
}

function stringifyErrorBody(value: unknown): string {
    if (typeof value === "string") {
        return value;
    }

    if (value && typeof value === "object" && "message" in value) {
        const message = (value as { message?: unknown }).message;
        if (Array.isArray(message)) {
            return message.join(" ");
        }
        if (typeof message === "string") {
            return message;
        }
    }

    return "Something went wrong. Please try again.";
}

function getErrorMessage(body: string, status: number): string {
    if (body.trim().length > 0) {
        return body;
    }

    if (status === 401) {
        return "Your session has expired. Sign in again to continue.";
    }

    return `Request failed with status ${status}.`;
}

function getBaseUrl(): string {
    return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001";
}