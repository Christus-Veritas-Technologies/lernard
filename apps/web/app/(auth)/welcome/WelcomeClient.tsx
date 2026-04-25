"use client";

import Link from "next/link";

import { BookOpen01Icon } from "hugeicons-react";

export function WelcomeClient() {
    return (
        <div className="flex flex-col gap-8">
            {/* Hero */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-500 to-primary-700 px-8 py-10 text-white shadow-lg">
                <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10" />
                <div className="absolute -bottom-10 left-6 h-32 w-32 rounded-full bg-primary-400/30" />
                <div className="relative flex flex-col gap-5">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold uppercase tracking-widest text-primary-200">
                            ✦ AI Tutor
                        </span>
                    </div>
                    <div>
                        <h1 className="text-5xl font-bold tracking-tight">Lernard</h1>
                        <p className="mt-3 text-lg leading-relaxed text-primary-100">
                            Your personal tutor. Always ready, always learning about you.
                        </p>
                    </div>
                    <div className="flex items-center gap-3 rounded-2xl bg-white/15 px-4 py-3 backdrop-blur-sm">
                        <BookOpen01Icon size={20} className="shrink-0 text-white" />
                        <p className="text-sm text-primary-100">
                            Every lesson and quiz is generated fresh, just for you.
                        </p>
                    </div>
                </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-col gap-3">
                <Link
                    href="/register"
                    className="flex h-12 items-center justify-center rounded-2xl bg-primary-500 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-600 active:bg-primary-700"
                >
                    Get started — it&apos;s free
                </Link>
                <Link
                    href="/login"
                    className="flex h-12 items-center justify-center rounded-2xl border border-border bg-surface text-sm font-semibold text-text-primary transition-colors hover:bg-background"
                >
                    I already have an account
                </Link>
            </div>

            <p className="text-center text-xs text-text-tertiary">
                By continuing, you agree to our Terms of Service and Privacy Policy.
            </p>
        </div>
    );
}
