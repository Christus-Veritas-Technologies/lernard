"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useGoogleLogin } from "@react-oauth/google";

import { Button } from "@/components/ui/button";
import { loginWithGoogleCode, persistAuthResponse } from "@/lib/auth-client";

import { GoogleIcon } from "./GoogleIcon";

export function GoogleSignInButton() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

    const signInWithGoogle = useGoogleLogin({
        flow: "auth-code",
        onSuccess: async (response) => {
            setIsLoading(true);
            setError(null);

            try {
                const auth = await loginWithGoogleCode(response.code);
                persistAuthResponse(auth);

                if (!auth.user.onboardingComplete) {
                    router.push("/account-type");
                } else {
                    router.push("/home");
                }
            } catch (e) {
                if (e instanceof Error && e.message.trim().length > 0) {
                    setError(e.message);
                } else {
                    setError("Google sign-in failed. Please try again.");
                }
            } finally {
                setIsLoading(false);
            }
        },
        onError: () => {
            setError("Google sign-in was not completed.");
        },
    });

    const disabled = isLoading || !googleClientId;

    return (
        <div className="flex w-full flex-col gap-2">
            {error ? (
                <div className="rounded-xl bg-error-bg px-4 py-2 text-sm text-error">{error}</div>
            ) : null}

            {!googleClientId ? (
                <div className="rounded-xl bg-warning-bg px-4 py-2 text-sm text-warning">
                    Google sign-in is not configured.
                </div>
            ) : null}

            <Button
                className="flex w-full items-center justify-center gap-3 rounded-2xl text-sm font-semibold transition-colors"
                disabled={disabled}
                onClick={() => {
                    if (!disabled) {
                        signInWithGoogle();
                    }
                }}
                variant="secondary"
            >
                <GoogleIcon size={18} />
                {isLoading ? "Signing in..." : "Continue with Google"}
            </Button>
        </div>
    );
}
