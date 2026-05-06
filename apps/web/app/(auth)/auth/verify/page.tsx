"use client";

import { useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";

import { CheckmarkCircle01Icon, AlertCircleIcon } from "hugeicons-react";

import { persistAuthResponse, AuthApiError } from "@/lib/auth-client";
import { useVerifyMagicLinkMutation } from "@/hooks/useAuthMutations";

function VerifyContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token");

    const { mutate, isPending, isError, error, isSuccess, data } = useVerifyMagicLinkMutation();
    const attempted = useRef(false);

    useEffect(() => {
        if (!token || attempted.current) return;
        attempted.current = true;

        mutate(
            { token },
            {
                onSuccess: (authResponse) => {
                    persistAuthResponse(authResponse);
                    if (!authResponse.user.onboardingComplete) {
                        router.replace("/account-type");
                    } else {
                        router.replace("/home");
                    }
                },
            },
        );
    }, [token, mutate, router]);

    const apiError =
        isError && error instanceof AuthApiError
            ? error.message
            : isError
                ? "Something went wrong. Please try again."
                : null;

    if (!token) {
        return (
            <div className="flex flex-col items-center gap-4 text-center">
                <AlertCircleIcon size={40} className="text-error" />
                <h1 className="text-xl font-bold text-text-primary">Invalid link</h1>
                <p className="text-sm text-text-secondary">
                    This sign-in link is missing or malformed.{" "}
                    <button
                        onClick={() => router.push("/login")}
                        className="font-medium text-primary-600 hover:underline"
                    >
                        Request a new one
                    </button>
                </p>
            </div>
        );
    }

    if (isPending) {
        return (
            <div className="flex flex-col items-center gap-4 text-center">
                <motion.div
                    className="h-10 w-10 rounded-full border-4 border-primary-200 border-t-primary-500"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                />
                <p className="text-sm font-medium text-text-secondary">Signing you in…</p>
            </div>
        );
    }

    if (apiError) {
        return (
            <div className="flex flex-col items-center gap-4 text-center">
                <AlertCircleIcon size={40} className="text-error" />
                <h1 className="text-xl font-bold text-text-primary">Link expired</h1>
                <p className="text-sm leading-6 text-text-secondary">{apiError}</p>
                <button
                    onClick={() => router.push("/login")}
                    className="mt-1 text-sm font-semibold text-primary-600 hover:underline"
                >
                    Request a new sign-in link
                </button>
            </div>
        );
    }

    if (isSuccess) {
        return (
            <div className="flex flex-col items-center gap-4 text-center">
                <CheckmarkCircle01Icon size={40} className="text-success" />
                <p className="text-sm font-medium text-text-secondary">Signed in — redirecting…</p>
            </div>
        );
    }

    return null;
}

export default function VerifyPage() {
    return (
        <Suspense>
            <VerifyContent />
        </Suspense>
    );
}
