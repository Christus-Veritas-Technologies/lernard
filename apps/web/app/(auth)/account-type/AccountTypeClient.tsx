"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";

import { GraduateFemaleIcon, UserGroupIcon } from "hugeicons-react";

import { AuthApiError } from "@/lib/auth-client";
import { useAccountTypeMutation } from "@/hooks/useAuthMutations";

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
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

const TYPES = [
    {
        value: "student" as const,
        label: "Student",
        description: "I want to learn and improve my skills.",
        Icon: GraduateFemaleIcon,
    },
    {
        value: "guardian" as const,
        label: "Guardian",
        description: "I want to support a child's learning journey.",
        Icon: UserGroupIcon,
    },
];

export function AccountTypeClient() {
    const router = useRouter();
    const { mutate, isPending, isError, error } = useAccountTypeMutation();
    const [selected, setSelected] = useState<"student" | "guardian" | null>(null);

    function handleContinue() {
        if (!selected) return;
        mutate(
            { accountType: selected },
            {
                onSuccess: () => {
                    if (selected === "guardian") {
                        router.push("/home");
                    } else {
                        router.push("/profile-setup");
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
            className="mx-auto flex w-full max-w-lg flex-col gap-8"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            <motion.div variants={itemVariants}>
                <h1 className="text-3xl font-bold text-text-primary">Who are you?</h1>
                <p className="mt-1 text-text-secondary">
                    Lernard will personalise everything based on your role.
                </p>
            </motion.div>

            {apiError && (
                <motion.div className="rounded-xl bg-error-bg px-4 py-3 text-sm text-error" variants={itemVariants}>
                    {apiError}
                </motion.div>
            )}

            <motion.div className="flex flex-col gap-3" variants={itemVariants}>
                {TYPES.map(({ value, label, description, Icon }) => (
                    <motion.button
                        key={value}
                        type="button"
                        onClick={() => setSelected(value)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`flex items-start gap-4 rounded-2xl border-2 p-5 text-left transition-all ${selected === value
                            ? "border-primary-400 bg-primary-50 shadow-sm"
                            : "border-border bg-surface hover:border-primary-200 hover:bg-primary-50/50"
                            }`}
                    >
                        <span
                            className={`mt-0.5 shrink-0 rounded-xl p-2 ${selected === value
                                ? "bg-primary-100 text-primary-600"
                                : "bg-background text-text-secondary"
                                }`}
                        >
                            <Icon size={24} />
                        </span>
                        <div className="flex flex-col gap-0.5">
                            <span className="text-base font-semibold text-text-primary">{label}</span>
                            <span className="text-sm text-text-secondary">{description}</span>
                        </div>
                        <div
                            className={`ml-auto mt-1 h-5 w-5 shrink-0 rounded-full border-2 transition-all ${selected === value
                                ? "border-primary-500 bg-primary-500"
                                : "border-border"
                                }`}
                        />
                    </motion.button>
                ))}
            </motion.div>

            <motion.button
                type="button"
                onClick={handleContinue}
                disabled={!selected || isPending}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex h-12 items-center justify-center rounded-2xl bg-primary-500 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-600 disabled:opacity-50"
                variants={itemVariants}
            >
                {isPending ? "Saving…" : "Continue"}
            </motion.button>
        </motion.div>
    );
}
