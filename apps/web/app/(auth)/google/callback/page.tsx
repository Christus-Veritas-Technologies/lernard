"use client";

import { useEffect } from "react";

import { setAccessToken, setRefreshToken } from "@lernard/auth-core";

export default function GoogleCallbackPage() {
    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            window.location.replace("/login?error=oauth_timeout");
        }, 8000);

        try {
            const params = readCallbackParams();
            const accessToken = params.get("accessToken");
            const refreshToken = params.get("refreshToken");
            const onboardingComplete = params.get("onboardingComplete") === "1";

            if (!accessToken || !refreshToken) {
                window.clearTimeout(timeoutId);
                window.location.replace("/login?error=oauth_missing_tokens");
                return;
            }

            setAccessToken(accessToken);
            setRefreshToken(refreshToken);

            window.history.replaceState(null, "", window.location.pathname);
            window.clearTimeout(timeoutId);
            window.location.replace(onboardingComplete ? "/home" : "/profile-setup");
        } catch {
            window.clearTimeout(timeoutId);
            window.location.replace("/login?error=oauth_failed");
        }

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, []);

    return (
        <div className="flex min-h-screen items-center justify-center">
            <p className="text-sm text-text-secondary">Signing you in…</p>
        </div>
    );
}

function readCallbackParams(): URLSearchParams {
    const hash = window.location.hash.startsWith("#")
        ? window.location.hash.slice(1)
        : window.location.hash;

    if (hash.trim().length > 0) {
        return new URLSearchParams(hash);
    }

    const search = window.location.search.startsWith("?")
        ? window.location.search.slice(1)
        : window.location.search;

    return new URLSearchParams(search);
}
