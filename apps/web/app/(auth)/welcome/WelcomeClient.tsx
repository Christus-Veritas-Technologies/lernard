"use client";

import Link from "next/link";
import { motion } from "framer-motion";

import { BookOpen01Icon } from "hugeicons-react";

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.2,
        },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.5, ease: "easeOut" },
    },
};

export function WelcomeClient() {
    return (
        <motion.div
            className="flex flex-col gap-8"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {/* Hero */}
            <motion.div
                className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-lg"
                variants={itemVariants}
            >
                {/* Decorative circles */}
                <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 pointer-events-none select-none" />
                <div className="absolute -bottom-10 left-6 h-32 w-32 rounded-full bg-primary-400/30 pointer-events-none select-none" />
                {/* Main content with padding */}
                <div className="relative flex flex-col gap-5 p-10 md:p-12 lg:p-14">
                    <motion.div
                        className="flex items-center gap-2"
                        variants={itemVariants}
                    >
                        <span className="text-sm font-semibold uppercase tracking-widest text-primary-200">
                            ✦ AI Tutor
                        </span>
                    </motion.div>
                    <motion.div variants={itemVariants}>
                        <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
                            Lernard
                        </h1>
                        <p className="mt-3 text-lg leading-relaxed text-primary-100">
                            Your personal tutor. Always ready, always learning about you.
                        </p>
                    </motion.div>
                    <motion.div
                        className="flex items-center gap-3 rounded-2xl bg-white/15 px-4 py-3 backdrop-blur-sm"
                        variants={itemVariants}
                    >
                        <BookOpen01Icon size={20} className="shrink-0 text-white" />
                        <p className="text-sm text-primary-100">
                            Every lesson and quiz is generated fresh, just for you.
                        </p>
                    </motion.div>
                </div>
            </motion.div>

            {/* CTAs */}
            <motion.div className="flex flex-col gap-3" variants={itemVariants}>
                <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    <Link
                        href="/register"
                        className="flex h-12 items-center justify-center rounded-2xl bg-primary-500 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-600 active:bg-primary-700"
                    >
                        Get started — it&apos;s free
                    </Link>
                </motion.div>
                <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    <Link
                        href="/login"
                        className="flex h-12 items-center justify-center rounded-2xl border border-border bg-surface text-sm font-semibold text-primary-800 transition-colors hover:bg-primary-50 focus-visible:ring-2 focus-visible:ring-primary-400"
                    >
                        I already have an account
                    </Link>
                </motion.div>
            </motion.div>

            <motion.p
                className="text-center text-xs text-text-tertiary"
                variants={itemVariants}
            >
                By continuing, you agree to our Terms of Service and Privacy Policy.
            </motion.p>
        </motion.div>
    );
}
