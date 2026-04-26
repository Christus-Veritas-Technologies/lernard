"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";

import { Mail01Icon, LockPasswordIcon } from "hugeicons-react";

import { Button } from "@/components/ui/button";
import { AuthApiError } from "@/lib/auth-client";
import { useLoginMutation } from "@/hooks/useAuthMutations";

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.08,
            delayChildren: 0.1,
        },
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
    const { mutate, isPending, isError, error } = useLoginMutation();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

    function validate() {
        const errors: typeof fieldErrors = {};
        if (!email) errors.email = "Email is required";
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Enter a valid email";
        if (!password) errors.password = "Password is required";
        return errors;
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const errors = validate();
        if (Object.keys(errors).length) {
            setFieldErrors(errors);
            return;
        }
        setFieldErrors({});

        mutate(
            { email: email.trim().toLowerCase(), password },
            {
                onSuccess: (data) => {
                    if (!data.user.onboardingComplete) {
                        router.push("/account-type");
                    } else {
                        router.push("/home");
                    }
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
        <motion.div
            className="flex flex-col gap-8"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            <motion.div variants={itemVariants}>
                <h1 className="text-3xl font-bold text-text-primary">Welcome back</h1>
                <p className="mt-1 text-text-secondary">Log in to continue with Lernard.</p>
            </motion.div>

            <motion.form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4" variants={itemVariants}>
                {apiError && (
                    <div className="rounded-xl bg-error-bg px-4 py-3 text-sm text-error">
                        {apiError}
                    </div>
                )}

                <div className="flex flex-col gap-1.5">
                    <label htmlFor="email" className="text-sm font-semibold text-text-primary">
                        Email
                    </label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary">
                            <Mail01Icon size={18} />
                        </span>
                        <input
                            id="email"
                            type="email"
                            autoComplete="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            className="h-12 w-full rounded-2xl border border-border bg-surface pl-12 pr-4 text-sm text-text-primary outline-none placeholder:text-text-tertiary focus:border-primary-400 focus:ring-2 focus:ring-primary-100 aria-invalid:border-error aria-invalid:ring-error-bg"
                            aria-invalid={Boolean(fieldErrors.email)}
                        />
                    </div>
                    {fieldErrors.email && (
                        <p className="text-xs text-error">{fieldErrors.email}</p>
                    )}
                </div>

                <div className="flex flex-col gap-1.5">
                    <label htmlFor="password" className="text-sm font-semibold text-text-primary">
                        Password
                    </label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary">
                            <LockPasswordIcon size={18} />
                        </span>
                        <input
                            id="password"
                            type="password"
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Your password"
                            className="h-12 w-full rounded-2xl border border-border bg-surface pl-12 pr-4 text-sm text-text-primary outline-none placeholder:text-text-tertiary focus:border-primary-400 focus:ring-2 focus:ring-primary-100 aria-invalid:border-error aria-invalid:ring-error-bg"
                            aria-invalid={Boolean(fieldErrors.password)}
                        />
                    </div>
                    {fieldErrors.password && (
                        <p className="text-xs text-error">{fieldErrors.password}</p>
                    )}
                </div>

                <motion.button
                    type="submit"
                    disabled={isPending}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="mt-2 flex h-12 items-center justify-center rounded-2xl bg-primary-500 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-600 disabled:opacity-60"
                >
                    {isPending ? "Logging in…" : "Log in"}
                </motion.button>
            </motion.form>

            <motion.div className="flex flex-col gap-2.5" variants={itemVariants}>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button asChild variant="secondary" className="w-full h-12 text-sm font-semibold">
                        <Link href="/register">
                            Don&apos;t have an account? Sign up
                        </Link>
                    </Button>
                </motion.div>
            </motion.div>
        </motion.div>
    );
}
