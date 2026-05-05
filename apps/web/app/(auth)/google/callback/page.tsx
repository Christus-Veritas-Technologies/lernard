"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { setAccessToken, setRefreshToken } from "@lernard/auth-core";

export default function GoogleCallbackPage() {
    const router = useRouter();

    useEffect(() => {
        const hash = window.location.hash.slice(1);
        if (!hash) {
            router.replace("/welcome");
            return;
        }

        const params = new URLSearchParams(hash);
        const accessToken = params.get("accessToken");
        const refreshToken = params.get("refreshToken");
        const onboardingComplete = params.get("onboardingComplete") === "1";

        if (!accessToken || !refreshToken) {
            router.replace("/welcome");
            return;
        }

        setAccessToken(accessToken);
        setRefreshToken(refreshToken);

        // Clear the hash from the address bar before navigating
        history.replaceState(null, "", window.location.pathname);

        router.replace(onboardingComplete ? "/home" : "/profile-setup");
    }, [router]);

    return (
        <div className="flex min-h-screen items-center justify-center">
            <p className="text-sm text-text-secondary">Signing you in…</p>
        </div>
    );
}
