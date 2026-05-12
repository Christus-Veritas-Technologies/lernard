"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { motion, type Variants } from "framer-motion";

import { Mail01Icon, ArrowLeft01Icon, Loading03Icon } from "hugeicons-react";

import { BrowserApiError } from "@/lib/browser-api";
import { useRequestMagicLinkMutation } from "@/hooks/useAuthMutations";

const item: Variants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const } },
};

function CheckEmailContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const email = searchParams.get("email") ?? "";

    const { mutate, isPending, isError, error } = useRequestMagicLinkMutation();
    const [resent, setResent] = useState(false);

    function handleResend() {
        if (!email) return;
        setResent(false);
        mutate({ email, platform: "web" }, { onSuccess: () => setResent(true) });
    }

    const apiError =
        isError && error instanceof BrowserApiError
            ? error.body
            : isError
                ? "Something went wrong. Please try again."
                : null;

    return (
        <motion.div
            className="mx-auto flex w-full max-w-md flex-col items-center gap-8 text-center"
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
        >
            {/* Icon */}
            <motion.div
                variants={item}
                className="flex h-20 w-20 items-center justify-center rounded-3xl bg-primary-50 shadow-[0_8px_24px_-8px_rgba(79,99,210,0.3)]"
            >
                <Mail01Icon size={36} className="text-primary-500" strokeWidth={1.6} />
            </motion.div>

            {/* Copy */}
            <motion.div variants={item} className="space-y-3">
                <h1 className="text-3xl font-bold tracking-tight text-text-primary">Check your inbox</h1>
                <p className="text-base leading-7 text-text-secondary">
                    We sent a sign-in link to{" "}
                    <span className="font-semibold text-text-primary">{email || "your email"}</span>.
                    <br />
                    Click it to continue — the link expires in 15 minutes.
                </p>
            </motion.div>

            {/* Resend feedback */}
            {(resent || apiError) && (
                <motion.div variants={item}>
                    {resent && !apiError && (
                        <p className="text-sm font-medium text-success">A new link has been sent.</p>
                    )}
                    {apiError && (
                        <p className="text-sm text-error">{apiError}</p>
                    )}
                </motion.div>
            )}

            {/* Actions */}
            <motion.div variants={item} className="flex flex-col items-center gap-4">
                <button
                    onClick={handleResend}
                    disabled={isPending || !email}
                    className="flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-primary-600 ring-1 ring-primary-200 transition hover:bg-primary-50 disabled:opacity-50"
                >
                    {isPending ? (
                        <Loading03Icon size={15} className="animate-spin" />
                    ) : null}
                    {isPending ? "Resending…" : "Resend link"}
                </button>

                <button
                    onClick={() => router.push("/login")}
                    className="flex items-center gap-1.5 text-sm text-text-secondary transition hover:text-text-primary"
                >
                    <ArrowLeft01Icon size={14} />
                    Use a different email
                </button>
            </motion.div>
        </motion.div>
    );
}

export default function CheckEmailPage() {
    return (
        <Suspense>
            <CheckEmailContent />
        </Suspense>
    );
}
