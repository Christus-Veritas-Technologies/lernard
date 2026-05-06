"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { motion } from "framer-motion";

import { Mail01Icon, ArrowLeft01Icon, RefreshIcon } from "hugeicons-react";

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

function CheckEmailContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const email = searchParams.get("email") ?? "";

    const { mutate, isPending, isError, error, isSuccess } = useRequestMagicLinkMutation();
    const [resent, setResent] = useState(false);

    function handleResend() {
        if (!email) return;
        mutate(
            { email, platform: "web" },
            {
                onSuccess: () => setResent(true),
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
            {/* Icon */}
            <motion.div
                variants={itemVariants}
                className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50"
            >
                <Mail01Icon size={32} className="text-primary-600" />
            </motion.div>

            {/* Heading */}
            <motion.div variants={itemVariants} className="text-center">
                <h1 className="text-2xl font-bold text-text-primary">Check your inbox</h1>
                <p className="mt-2 text-sm leading-6 text-text-secondary">
                    We sent a sign-in link to{" "}
                    <span className="font-semibold text-text-primary">{email || "your email"}</span>.
                    {" "}Click it to continue — it expires in 15 minutes.
                </p>
            </motion.div>

            {/* Resend */}
            <motion.div variants={itemVariants} className="flex flex-col items-center gap-3">
                {resent && !isError ? (
                    <p className="text-sm font-medium text-success">
                        A new link has been sent.
                    </p>
                ) : null}

                {apiError && (
                    <p className="text-sm text-error">{apiError}</p>
                )}

                <button
                    onClick={handleResend}
                    disabled={isPending || !email}
                    className="flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700 disabled:opacity-50"
                >
                    <RefreshIcon size={15} />
                    {isPending ? "Resending…" : "Resend link"}
                </button>
            </motion.div>

            {/* Back */}
            <motion.div variants={itemVariants} className="flex justify-center">
                <button
                    onClick={() => router.push("/login")}
                    className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary"
                >
                    <ArrowLeft01Icon size={15} />
                    Back to sign in
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
