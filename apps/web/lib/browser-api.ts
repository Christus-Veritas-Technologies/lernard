"use client";

import {
    clearTokens,
    getAccessToken,
    getRefreshToken,
    setAccessToken,
    setRefreshToken,
} from "@lernard/auth-core";
import { ROUTES } from "@lernard/routes";

interface BrowserApiOptions extends RequestInit {
    skipAuth?: boolean;
}

interface RefreshResponse {
    accessToken: string;
    refreshToken: string;
}

export class BrowserApiError extends Error {
    constructor(
        public readonly status: number,
        public readonly body: string,
    ) {
        super(`API Error ${status}`);
        this.name = "BrowserApiError";
    }
}

export class BrowserAuthError extends Error {
    constructor(message = "You need to sign in to load this page.") {
        super(message);
        this.name = "BrowserAuthError";
    }
}

/**
 * Returns the `resetAt` ISO string if the error is a 429 plan_limit_reached response,
 * or `null` for any other error type.
 */
export function tryParsePlanLimitError(err: unknown): string | null {
    if (!(err instanceof BrowserApiError) || err.status !== 429) return null;
    try {
        const body = JSON.parse(err.body) as Record<string, unknown>;
        if (body.error === "plan_limit_reached") {
            return typeof body.resetAt === "string" ? body.resetAt : null;
        }
    } catch {
        // non-JSON body — treat as generic error
    }
    return null;
}

export async function browserApiFetch<T>(
    route: string,
    options: BrowserApiOptions = {},
): Promise<T> {
    console.log("[browserApiFetch] Starting fetch to:", route);
    const refreshToken = getRefreshToken();
    let accessToken = getAccessToken();

    console.log("[browserApiFetch] Auth state:", {
        hasRefreshToken: !!refreshToken,
        hasAccessToken: !!accessToken,
        skipAuth: options.skipAuth,
    });

    if (!options.skipAuth && !accessToken && refreshToken) {
        console.log("[browserApiFetch] No accessToken but refreshToken exists; attempting refresh...");
        accessToken = await refreshSession(refreshToken);
    }

    if (!options.skipAuth && !accessToken) {
        console.error("[browserApiFetch] No accessToken and no refreshToken; throwing BrowserAuthError");
        throw new BrowserAuthError();
    }

    console.log("[browserApiFetch] Auth check passed; proceeding with fetch");

    try {
        console.log("[browserApiFetch] Making request to:", route);
        return await requestJson<T>(route, options, accessToken);
    } catch (error) {
        console.error("[browserApiFetch] Fetch error:", {
            isApiError: error instanceof BrowserApiError,
            status: error instanceof BrowserApiError ? error.status : null,
            message: error instanceof Error ? error.message : String(error),
        });

        if (
            !options.skipAuth
            && error instanceof BrowserApiError
            && error.status === 401
            && refreshToken
        ) {
            console.log("[browserApiFetch] Got 401 with refreshToken; attempting token refresh...");
            const refreshedAccessToken = await refreshSession(refreshToken);
            return requestJson<T>(route, options, refreshedAccessToken);
        }

        if (!options.skipAuth && error instanceof BrowserApiError && error.status === 401) {
            console.log("[browserApiFetch] Got 401 with no refreshToken; clearing tokens and throwing BrowserAuthError");
            clearTokens();
            throw new BrowserAuthError("Your session has expired. Sign in again to continue.");
        }

        throw error;
    }
}

async function requestJson<T>(
    route: string,
    options: BrowserApiOptions,
    accessToken: string | null,
): Promise<T> {
    const headers = new Headers(options.headers);
    const isMultipartRequest = typeof FormData !== "undefined" && options.body instanceof FormData;

    if (!isMultipartRequest && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
    }

    if (accessToken && !headers.has("Authorization")) {
        headers.set("Authorization", `Bearer ${accessToken}`);
    }

    const response = await fetch(`${getBaseUrl()}${route}`, {
        ...options,
        cache: "no-store",
        headers,
    });

    if (!response.ok) {
        throw new BrowserApiError(response.status, await response.text());
    }

    return response.json() as Promise<T>;
}

async function refreshSession(refreshToken: string): Promise<string> {
    const response = await fetch(`${getBaseUrl()}${ROUTES.AUTH.REFRESH}`, {
        method: "POST",
        cache: "no-store",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
        clearTokens();
        throw new BrowserAuthError("Your session has expired. Sign in again to continue.");
    }

    const tokens = (await response.json()) as RefreshResponse;
    setAccessToken(tokens.accessToken);
    setRefreshToken(tokens.refreshToken);

    return tokens.accessToken;
}

function getBaseUrl(): string {
    return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4002";
}

export async function connectSse(
    route: string,
    signal?: AbortSignal,
): Promise<ReadableStream<Uint8Array>> {
    const refreshToken = getRefreshToken();
    let accessToken = getAccessToken();

    if (!accessToken && refreshToken) {
        accessToken = await refreshSession(refreshToken);
    }

    if (!accessToken) {
        throw new BrowserAuthError();
    }

    const response = await fetch(`${getBaseUrl()}${route}`, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "text/event-stream",
        },
        cache: "no-store",
        signal,
    });

    if (!response.ok || !response.body) {
        throw new BrowserApiError(response.status, await response.text().catch(() => ""));
    }

    return response.body;
}