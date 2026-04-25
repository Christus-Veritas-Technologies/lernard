"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Mail01Icon, LockPasswordIcon, User02Icon } from "hugeicons-react";

import { AuthApiError } from "@/lib/auth-client";
import { useRegisterMutation } from "@/hooks/useAuthMutations";

export function RegisterClient() {
    const router = useRouter();
    const { mutate, isPending, isError, error } = useRegisterMutation();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [accountType, setAccountType] = useState<"student" | "guardian">("student");
    const [fieldErrors, setFieldErrors] = useState<{
        name?: string;
        email?: string;
        password?: string;
    }>({});

    function validate() {
        const errors: typeof fieldErrors = {};
        if (!name.trim()) errors.name = "Name is required";
        else if (name.trim().length > 50) errors.name = "Name must be 50 characters or fewer";
        if (!email) errors.email = "Email is required";
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Enter a valid email";
        if (!password) errors.password = "Password is required";
        else if (password.length < 8) errors.password = "Password must be at least 8 characters";
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
            { name: name.trim(), email: email.trim().toLowerCase(), password, accountType },
            {
                onSuccess: () => {
                    router.push("/account-type");
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
                <h1 className="text-3xl font-bold text-text-primary">Create account</h1>
                <p className="mt-1 text-text-secondary">Start your learning journey with Lernard.</p>
            </div>

            {/* Account type toggle */}
            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-background p-1">
                {(["student", "guardian"] as const).map((type) => (
                    <button
                        key={type}
                        type="button"
                        onClick={() => setAccountType(type)}
                        className={`rounded-xl py-2.5 text-sm font-semibold transition-all ${accountType === type
                            ? "bg-surface text-primary-600 shadow-sm"
                            : "text-text-secondary hover:text-text-primary"
                            }`}
                    >
                        {type === "student" ? "Student" : "Guardian"}
                    </button>
                ))}
            </div>

            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
                {apiError && (
                    <div className="rounded-xl bg-error-bg px-4 py-3 text-sm text-error">
                        {apiError}
                    </div>
                )}

                <div className="flex flex-col gap-1.5">
                    <label htmlFor="name" className="text-sm font-semibold text-text-primary">
                        Full name
                    </label>
                    <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary">
                            <User02Icon size={18} />
                        </span>
                        <input
                            id="name"
                            type="text"
                            autoComplete="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Your name"
                            maxLength={50}
                            className="h-12 w-full rounded-2xl border border-border bg-surface pl-10 pr-4 text-sm text-text-primary outline-none placeholder:text-text-tertiary focus:border-primary-400 focus:ring-2 focus:ring-primary-100 aria-invalid:border-error"
                            aria-invalid={Boolean(fieldErrors.name)}
                        />
                    </div>
                    {fieldErrors.name && (
                        <p className="text-xs text-error">{fieldErrors.name}</p>
                    )}
                </div>

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
                            className="h-12 w-full rounded-2xl border border-border bg-surface pl-10 pr-4 text-sm text-text-primary outline-none placeholder:text-text-tertiary focus:border-primary-400 focus:ring-2 focus:ring-primary-100 aria-invalid:border-error"
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
                            autoComplete="new-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="At least 8 characters"
                            className="h-12 w-full rounded-2xl border border-border bg-surface pl-10 pr-4 text-sm text-text-primary outline-none placeholder:text-text-tertiary focus:border-primary-400 focus:ring-2 focus:ring-primary-100 aria-invalid:border-error"
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
                    {isPending ? "Creating account…" : "Create account"}
                </button>
            </form>

            <p className="text-center text-sm text-text-secondary">
                Already have an account?{" "}
                <Link href="/login" className="font-semibold text-primary-500 hover:underline">
                    Log in
                </Link>
            </p>
        </div>
    );
}
