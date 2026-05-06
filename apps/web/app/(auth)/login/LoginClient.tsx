"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";

import { Mail01Icon, ShieldKeyIcon, SparklesIcon } from "hugeicons-react";

import { AuthShell } from "@/components/auth/AuthShell";
import { AuthField } from "@/components/auth/AuthField";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { BrowserApiError } from "@/lib/browser-api";
import { useRequestMagicLinkMutation } from "@/hooks/useAuthMutations";

export function LoginClient() {
    const router = useRouter();
    const { mutate, isPending, isError, error } = useRequestMagicLinkMutation();

    const [email, setEmail] = useState("");
    const [emailError, setEmailError] = useState<string | undefined>();

    function validate() {
        if (!email.trim()) return "Email is required";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Enter a valid email address";
        return null;
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const err = validate();
        if (err) { setEmailError(err); return; }
        setEmailError(undefined);

        mutate(
            { email: email.trim().toLowerCase(), platform: "web" },
            {
                onSuccess: () => {
                    router.push(`/auth/check-email?email=${encodeURIComponent(email.trim().toLowerCase())}`);
                },
            },
        );
    }

    const apiError =
        isError && error instanceof BrowserApiError
            ? error.body
            : isError
                ? "Something went wrong. Please try again."
                : null;

    return (
        <AuthShell
            badge="Lernard"
            title="Your personal AI tutor"
            description="Every lesson is built around you — your pace, your gaps, your goals."
            highlights={[
                {
                    title: "Learning that actually sticks",
                    description: "Lernard adapts to what you know and fills the gaps before they become problems.",
                    icon: ShieldKeyIcon,
                    tone: "primary",
                },
                {
                    title: "Pick up exactly where you left off",
                    description: "Your progress, subjects, and next steps are always waiting for you.",
                    icon: SparklesIcon,
                    tone: "secondary",
                },
            ]}
        >
            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
                {apiError && (
                    <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-xl bg-error-bg px-4 py-3 text-sm text-error"
                    >
                        {apiError}
                    </motion.div>
                )}

                <AuthField
                    label="Email address"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    error={emailError}
                    icon={<Mail01Icon size={18} />}
                />

                <motion.button
                    type="submit"
                    disabled={isPending}
                    whileHover={{ scale: 1.015 }}
                    whileTap={{ scale: 0.985 }}
                    className="mt-1 flex h-12 w-full items-center justify-center rounded-2xl bg-primary-500 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-600 disabled:opacity-60"
                >
                    {isPending ? "Sending link…" : "Send sign-in link"}
                </motion.button>
            </form>

            <div className="flex flex-col gap-2.5">
                <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-xs text-text-tertiary">or</span>
                    <div className="h-px flex-1 bg-border" />
                </div>

                <GoogleSignInButton />
            </div>
        </AuthShell>
    );
}
