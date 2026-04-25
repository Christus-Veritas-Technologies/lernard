"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Mail01Icon, LockPasswordIcon } from "hugeicons-react";

import { AuthApiError } from "@/lib/auth-client";
import { useLoginMutation } from "@/hooks/useAuthMutations";

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
        <div className="flex flex-col gap-8">
            <div>
                <h1 className="text-3xl font-bold text-text-primary">Welcome back</h1>
                <p className="mt-1 text-text-secondary">Log in to continue with Lernard.</p>
            </div>

            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
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
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary">
                            <Mail01Icon size={18} />
                        </span>
                        <input
                            id="email"
                            type="email"
                            autoComplete="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            className="h-12 w-full rounded-2xl border border-border bg-surface pl-10 pr-4 text-sm text-text-primary outline-none placeholder:text-text-tertiary focus:border-primary-400 focus:ring-2 focus:ring-primary-100 aria-invalid:border-error aria-invalid:ring-error-bg"
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
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary">
                            <LockPasswordIcon size={18} />
                        </span>
                        <input
                            id="password"
                            type="password"
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Your password"
                            className="h-12 w-full rounded-2xl border border-border bg-surface pl-10 pr-4 text-sm text-text-primary outline-none placeholder:text-text-tertiary focus:border-primary-400 focus:ring-2 focus:ring-primary-100 aria-invalid:border-error aria-invalid:ring-error-bg"
                            aria-invalid={Boolean(fieldErrors.password)}
                        />
                    </div>
                    {fieldErrors.password && (
                        <p className="text-xs text-error">{fieldErrors.password}</p>
                    )}
                </div>

                <button
                    type="submit"
                    disabled={isPending}
                    className="mt-2 flex h-12 items-center justify-center rounded-2xl bg-primary-500 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-600 disabled:opacity-60"
                >
                    {isPending ? "Logging in…" : "Log in"}
                </button>
            </form>

            <p className="text-center text-sm text-text-secondary">
                Don&apos;t have an account?{" "}
                <Link href="/register" className="font-semibold text-primary-500 hover:underline">
                    Sign up
                </Link>
            </p>
        </div>
    );
}
