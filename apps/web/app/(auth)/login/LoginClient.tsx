"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";

import { Mail01Icon, SparklesIcon, ShieldKeyIcon } from "hugeicons-react";

import { AuthShell } from "@/components/auth/AuthShell";
import { AuthField } from "@/components/auth/AuthField";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { AuthApiError } from "@/lib/auth-client";
import { useRequestMagicLinkMutation } from "@/hooks/useAuthMutations";

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.08, delayChildren: 0.1 },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.4, ease: "easeOut" },
    },
};

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
        if (err) {
            setEmailError(err);
            return;
        }
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
        isError && error instanceof AuthApiError
            ? error.message
            : isError
                ? "Something went wrong. Please try again."
                : null;

    return (
        <AuthShell
            badge="Welcome"
            title="Sign in to Lernard"
            description="Enter your email and we'll send you a sign-in link — no password needed."
            highlights={[
                {
                    title: "No password to remember",
                    description: "We'll email you a one-click link every time you want to sign in.",
                    icon: ShieldKeyIcon,
                    tone: "primary",
                },
                {
                    title: "New? We'll set you up",
                    description: "If you don't have an account yet, we'll create one automatically.",
                    icon: SparklesIcon,
                    tone: "secondary",
                },
            ]}
        >
            <motion.div
                className="flex flex-col gap-6"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                <motion.form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4" variants={itemVariants}>
                    {apiError && (
                        <div className="rounded-xl bg-error-bg px-4 py-3 text-sm text-error">
                            {apiError}
                        </div>
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
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="mt-1 flex h-12 items-center justify-center rounded-2xl bg-primary-500 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-600 disabled:opacity-60"
                    >
                        {isPending ? "Sending link…" : "Send sign-in link"}
                    </motion.button>
                </motion.form>

                <motion.div className="flex flex-col gap-2.5" variants={itemVariants}>
                    <div className="flex items-center gap-3 py-1">
                        <div className="h-px flex-1 bg-border" />
                        <span className="text-xs text-text-tertiary">or</span>
                        <div className="h-px flex-1 bg-border" />
                    </div>

                    <GoogleSignInButton />
                </motion.div>
            </motion.div>
        </AuthShell>
    );
}
