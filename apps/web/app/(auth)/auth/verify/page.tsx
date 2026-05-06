"use client";

import { useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";

import { CheckmarkCircle01Icon, AlertCircleIcon, Loading03Icon } from "hugeicons-react";

import { BrowserApiError } from "@/lib/browser-api";
import { persistAuthResponse } from "@/lib/auth-client";
import { useVerifyMagicLinkMutation } from "@/hooks/useAuthMutations";

function VerifyContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token");

    const { mutate, isPending, isError, error, isSuccess } = useVerifyMagicLinkMutation();
    const attempted = useRef(false);

    useEffect(() => {
        if (!token || attempted.current) return;
        attempted.current = true;

        mutate(
            { token },
            {
                onSuccess: (authResponse) => {
                    persistAuthResponse(authResponse);
                    router.replace(authResponse.user.onboardingComplete ? "/home" : "/account-type");
                },
            },
        );
    }, [token, mutate, router]);

    const apiError =
        isError && error instanceof BrowserApiError
            ? error.body
            : isError
                ? "This link is invalid or has expired."
                : null;

    return (
        <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-6 text-center">
            {!token && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                    <AlertCircleIcon size={48} className="mx-auto text-error" strokeWidth={1.5} />
                    <h1 className="text-xl font-bold text-text-primary">Invalid link</h1>
                    <p className="text-sm leading-6 text-text-secondary">
                        This sign-in link is missing or malformed.
                    </p>
                    <button
                        onClick={() => router.push("/login")}
                        className="mt-1 text-sm font-semibold text-primary-600 hover:underline"
                    >
                        Request a new one
                    </button>
                </motion.div>
            )}

            {token && isPending && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                    <Loading03Icon size={48} className="mx-auto animate-spin text-primary-500" strokeWidth={1.5} />
                    <p className="text-base font-medium text-text-secondary">Signing you in…</p>
                </motion.div>
            )}

            {token && isSuccess && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
                    <CheckmarkCircle01Icon size={48} className="mx-auto text-success" strokeWidth={1.5} />
                    <p className="text-base font-medium text-text-secondary">Signed in — redirecting…</p>
                </motion.div>
            )}

            {token && apiError && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                    <AlertCircleIcon size={48} className="mx-auto text-error" strokeWidth={1.5} />
                    <h1 className="text-xl font-bold text-text-primary">Link expired</h1>
                    <p className="text-sm leading-6 text-text-secondary">{apiError}</p>
                    <button
                        onClick={() => router.push("/login")}
                        className="mt-1 text-sm font-semibold text-primary-600 hover:underline"
                    >
                        Request a new sign-in link
                    </button>
                </motion.div>
            )}
        </div>
    );
}

export default function VerifyPage() {
    return (
        <Suspense>
            <VerifyContent />
        </Suspense>
    );
}
