"use client";

import { getAccessToken, getRefreshToken } from "@lernard/auth-core";
import type { PagePayload } from "@lernard/shared-types";
import { useEffect, useRef, useState } from "react";

import { browserApiFetch, BrowserAuthError } from "../lib/browser-api";

interface UsePagePayloadResult<T> {
    data: PagePayload<T> | null;
    error: Error | null;
    isAuthenticated: boolean;
    loading: boolean;
    refetch: () => void;
}

export function usePagePayload<T>(route: string): UsePagePayloadResult<T> {
    const [data, setData] = useState<PagePayload<T> | null>(null);
    const [error, setError] = useState<Error | null>(null);
    const [loading, setLoading] = useState(true);
    const [requestVersion, setRequestVersion] = useState(0);
    const [isAuthenticated, setIsAuthenticated] = useState(hasBrowserSession());
    const didForceRefresh = useRef(false);

    useEffect(() => {
        let cancelled = false;

        async function loadPayload() {
            setLoading(true);
            setError(null);
            setIsAuthenticated(hasBrowserSession());

            try {
                const payload = await browserApiFetch<PagePayload<T>>(route);

                if (cancelled) {
                    return;
                }

                if (payload.forcePermissionsRefresh && !didForceRefresh.current) {
                    didForceRefresh.current = true;
                    setRequestVersion((current) => current + 1);
                    return;
                }

                didForceRefresh.current = false;
                setData(payload);
                setIsAuthenticated(true);
            } catch (loadError) {
                if (cancelled) {
                    return;
                }

                setData(null);
                setError(
                    loadError instanceof Error
                        ? loadError
                        : new Error("Unable to load this page right now."),
                );
                setIsAuthenticated(!(loadError instanceof BrowserAuthError));
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        void loadPayload();

        return () => {
            cancelled = true;
        };
    }, [route, requestVersion]);

    return {
        data,
        error,
        isAuthenticated,
        loading,
        refetch: () => setRequestVersion((current) => current + 1),
    };
}

function hasBrowserSession(): boolean {
    return Boolean(getAccessToken() || getRefreshToken());
}