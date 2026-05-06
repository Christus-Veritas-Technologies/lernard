"use client";

import { Orbit01Icon, SparklesIcon } from "hugeicons-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

import { setAccessToken, setRefreshToken } from "@lernard/auth-core";

import { exchangeGoogleSession } from "@/lib/auth-client";
import { getPostCallbackRoute } from "@/lib/auth-routes";

export default function GoogleCallbackPage() {
    const [status, setStatus] = useState("Signing you in...");

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            window.location.replace("/login?error=oauth_timeout");
        }, 10_000);

        async function run() {
            try {
                const params = new URLSearchParams(window.location.search);
                const code = params.get("code");

                if (!code) {
                    window.clearTimeout(timeoutId);
                    window.location.replace("/login?error=oauth_missing_code");
                    return;
                }

                setStatus("Verifying your Google sign-in...");
                const session = await exchangeGoogleSession(code);

                setStatus("Saving your secure session...");
                setAccessToken(session.accessToken);
                setRefreshToken(session.refreshToken);

                setStatus("Opening your Lernard space...");
                window.history.replaceState(null, "", window.location.pathname);
                window.clearTimeout(timeoutId);
                window.location.replace(getPostCallbackRoute(session.onboardingComplete));
            } catch {
                window.clearTimeout(timeoutId);
                window.location.replace("/login?error=oauth_failed");
            }
        }

        void run();

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, []);

    return (
        <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#f7fbff_0%,#ffffff_42%,#fff7ef_100%)] px-4">
            <motion.div
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md rounded-4xl border border-primary-100 bg-white/90 p-8 shadow-[0_24px_80px_rgba(79,98,163,0.14)] backdrop-blur"
                initial={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.45, ease: "easeOut" }}
            >
                <div className="flex flex-col items-center gap-6 text-center">
                    <motion.div
                        animate={{ rotate: 360 }}
                        className="flex h-18 w-18 items-center justify-center rounded-full bg-primary-100 text-primary-600"
                        transition={{ duration: 6, ease: "linear", repeat: Number.POSITIVE_INFINITY }}
                    >
                        <Orbit01Icon size={32} strokeWidth={1.8} />
                    </motion.div>

                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary-700">
                            <SparklesIcon size={14} strokeWidth={1.8} />
                            Lernard
                        </div>
                        <h1 className="text-2xl font-semibold text-text-primary">Connecting your account</h1>
                        <p className="text-sm leading-6 text-text-secondary">{status}</p>
                    </div>

                    <div className="w-full space-y-3 rounded-3xl bg-slate-50 p-4 text-left">
                        <div className="flex items-center gap-3">
                            <LoadingDot delay={0} />
                            <span className="text-sm font-medium text-text-primary">Verifying Google sign-in</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <LoadingDot delay={0.15} />
                            <span className="text-sm font-medium text-text-primary">Saving your secure session</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <LoadingDot delay={0.3} />
                            <span className="text-sm font-medium text-text-primary">Preparing your Lernard experience</span>
                        </div>
                    </div>

                    <div className="w-full space-y-2">
                        <motion.div
                            animate={{ opacity: [0.35, 0.7, 0.35] }}
                            className="h-3 rounded-full bg-primary-100"
                            transition={{ duration: 1.4, repeat: Number.POSITIVE_INFINITY }}
                        />
                        <motion.div
                            animate={{ opacity: [0.25, 0.6, 0.25] }}
                            className="h-3 w-5/6 rounded-full bg-primary-50"
                            transition={{ delay: 0.15, duration: 1.4, repeat: Number.POSITIVE_INFINITY }}
                        />
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

function LoadingDot({ delay }: { delay: number }) {
    return (
        <motion.span
            animate={{ opacity: [0.3, 1, 0.3], scale: [0.92, 1, 0.92] }}
            className="h-2.5 w-2.5 rounded-full bg-primary-500"
            transition={{ delay, duration: 1.2, repeat: Number.POSITIVE_INFINITY }}
        />
    );
}
