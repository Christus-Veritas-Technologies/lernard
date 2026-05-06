"use client";

import Link from "next/link";
import { motion } from "framer-motion";

import { ArrowRight01Icon } from "hugeicons-react";
import { Button } from "@/components/ui/Button";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";

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
                variants={itemVariants}
            >
                {/* Main content with padding */}
                <div className="relative flex flex-col gap-5 p-10 md:p-12 lg:p-14">
                    <motion.div
                        className="flex items-center gap-2"
                        variants={itemVariants}
                    >
                        <span className="text-sm font-semibold uppercase tracking-widest text-gray-500">
                            ✦ AI Tutor
                        </span>
                    </motion.div>
                    <motion.div variants={itemVariants}>
                        <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-primary-500">
                            Lernard
                        </h1>
                        <p className="mt-3 text-lg leading-relaxed text-gray-500">
                            Your personal tutor. Always ready, always learning about you.
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
                    <Button asChild className="w-full h-12 text-sm font-semibold">
                        <Link
                            href="/register"
                            className="flex items-center justify-center gap-2"
                        >
                            Get started — it&apos;s free
                            <ArrowRight01Icon size={18} />
                        </Link>
                    </Button>
                </motion.div>
                <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    <Button asChild variant="secondary" className="w-full h-12 text-sm font-semibold">
                        <Link
                            href="/login"
                            className="flex items-center justify-center"
                        >
                            I already have an account
                        </Link>
                    </Button>
                </motion.div>

                <div className="flex items-center gap-3 py-1">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-xs text-text-tertiary">or</span>
                    <div className="h-px flex-1 bg-border" />
                </div>

                <GoogleSignInButton />
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
