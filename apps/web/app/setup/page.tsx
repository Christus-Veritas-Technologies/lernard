"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { AlertCircleIcon, CheckmarkCircle01Icon, LockPasswordIcon, Loading03Icon } from "hugeicons-react";
import { ROUTES } from "@lernard/routes";
import { setAccessToken, setRefreshToken } from "@lernard/auth-core";
import { browserApiFetch, BrowserApiError } from "@/lib/browser-api";

function passwordStrength(password: string): { label: string; color: string; width: string } {
    const length = password.length;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasDigit = /\d/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);
    const score = [length >= 8, hasUpper, hasLower, hasDigit, hasSpecial].filter(Boolean).length;

    if (score <= 1) return { label: "Weak", color: "bg-red-400", width: "w-1/5" };
    if (score === 2) return { label: "Fair", color: "bg-orange-400", width: "w-2/5" };
    if (score === 3) return { label: "Good", color: "bg-yellow-400", width: "w-3/5" };
    if (score === 4) return { label: "Strong", color: "bg-green-400", width: "w-4/5" };
    return { label: "Very strong", color: "bg-green-500", width: "w-full" };
}

function SetupContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token");

    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isDone, setIsDone] = useState(false);
    const passwordRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        passwordRef.current?.focus();
    }, []);

    const strength = password.length > 0 ? passwordStrength(password) : null;

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        if (password.length < 8) {
            setError("Password must be at least 8 characters.");
            return;
        }
        if (password !== confirm) {
            setError("Passwords don't match.");
            return;
        }
        if (!token) {
            setError("This setup link is missing a token.");
            return;
        }

        setIsLoading(true);
        try {
            const response = await browserApiFetch<{ accessToken: string; refreshToken: string }>(
                ROUTES.AUTH.SETUP,
                {
                    method: "POST",
                    body: JSON.stringify({ token, password }),
                    skipAuth: true,
                },
            );
            setAccessToken(response.accessToken);
            setRefreshToken(response.refreshToken);
            setIsDone(true);
            setTimeout(() => router.replace("/account-type"), 1200);
        } catch (err) {
            const message =
                err instanceof BrowserApiError
                    ? err.body
                    : "Something went wrong. Please try again.";
            setError(message);
        } finally {
            setIsLoading(false);
        }
    }

    if (!token) {
        return (
            <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-6 text-center">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                    <AlertCircleIcon size={48} className="mx-auto text-error" strokeWidth={1.5} />
                    <h1 className="text-xl font-bold text-text-primary">Invalid setup link</h1>
                    <p className="text-sm leading-6 text-text-secondary">
                        This link is missing or malformed. Ask your guardian to resend the setup email.
                    </p>
                </motion.div>
            </div>
        );
    }

    if (isDone) {
        return (
            <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-6 text-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-4"
                >
                    <CheckmarkCircle01Icon size={48} className="mx-auto text-success" strokeWidth={1.5} />
                    <p className="text-base font-medium text-text-secondary">Account activated — redirecting…</p>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="mx-auto w-full max-w-sm space-y-8">
            <div className="space-y-2 text-center">
                <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-2xl bg-primary-100 text-primary-700">
                    <LockPasswordIcon size={28} strokeWidth={1.5} />
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-text-primary">Set your password</h1>
                <p className="text-sm leading-6 text-text-secondary">
                    Choose a strong password to activate your Lernard account.
                </p>
            </div>

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-100"
                    >
                        {error}
                    </motion.div>
                )}

                <div className="space-y-1.5">
                    <label htmlFor="password" className="block text-sm font-medium text-text-primary">
                        Password
                    </label>
                    <input
                        id="password"
                        ref={passwordRef}
                        type="password"
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="At least 8 characters"
                        className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-text-primary placeholder-text-tertiary outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                    />
                    {strength && password.length > 0 && (
                        <div className="space-y-1">
                            <div className="h-1 w-full rounded-full bg-border">
                                <div className={`h-1 rounded-full transition-all ${strength.width} ${strength.color}`} />
                            </div>
                            <p className="text-xs text-text-tertiary">{strength.label}</p>
                        </div>
                    )}
                </div>

                <div className="space-y-1.5">
                    <label htmlFor="confirm" className="block text-sm font-medium text-text-primary">
                        Confirm password
                    </label>
                    <input
                        id="confirm"
                        type="password"
                        autoComplete="new-password"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        placeholder="Repeat your password"
                        className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-text-primary placeholder-text-tertiary outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                    />
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary-500 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-600 disabled:opacity-60"
                >
                    {isLoading ? (
                        <Loading03Icon size={18} className="animate-spin" />
                    ) : (
                        "Activate account"
                    )}
                </button>
            </form>
        </div>
    );
}

export default function SetupPage() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
            <Suspense>
                <SetupContent />
            </Suspense>
        </div>
    );
}
