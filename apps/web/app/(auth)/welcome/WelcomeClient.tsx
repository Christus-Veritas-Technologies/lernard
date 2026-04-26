"use client";

import Link from "next/link";
import { motion } from "framer-motion";

import { BookOpen01Icon, ArrowRight01Icon } from "hugeicons-react";
import { Button } from "@/components/ui/button";

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
            {/* Hero Card */}
            <motion.div
                className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-400 via-primary-500 to-primary-700 px-8 py-12 text-white md:px-10 md:py-14 lg:px-12 lg:py-16"
                variants={itemVariants}
            >
                {/* Subtle top accent */}
                <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-white/5 blur-3xl" />
                
                {/* Main content */}
                <div className="relative space-y-6">
                    {/* Badge */}
                    <motion.div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 backdrop-blur-sm" variants={itemVariants}>
                        <BookOpen01Icon size={16} />
                        <span className="text-xs font-semibold uppercase tracking-widest">AI-Powered Tutoring</span>
                    </motion.div>

                    {/* Heading */}
                    <motion.div className="space-y-3" variants={itemVariants}>
                        <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight">
                            Lernard
                        </h1>
                        <p className="text-lg md:text-xl leading-relaxed text-primary-100 max-w-2xl">
                            Your personal AI tutor that adapts to your pace, remembers your progress, and makes learning feel like a conversation with a friend.
                        </p>
                    </motion.div>

                    {/* Key benefit */}
                    <motion.div className="flex items-start gap-3 rounded-2xl bg-white/10 px-4 py-3 backdrop-blur-sm w-fit" variants={itemVariants}>
                        <BookOpen01Icon size={18} className="shrink-0 mt-0.5" />
                        <p className="text-sm font-medium text-primary-50">
                            Every lesson is generated fresh, tailored just for you
                        </p>
                    </motion.div>
                </div>
            </motion.div>

            {/* CTA Buttons */}
            <motion.div className="flex flex-col gap-3" variants={itemVariants}>
                <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    <Button className="w-full h-12 text-base font-semibold bg-primary-500 hover:bg-primary-600 active:bg-primary-700 transition-colors">
                        <Link href="/register" className="flex items-center justify-center w-full gap-2">
                            Get started — it&apos;s free
                            <ArrowRight01Icon size={18} />
                        </Link>
                    </Button>
                </motion.div>
                <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    <Button variant="secondary" className="w-full h-12 text-base font-semibold transition-colors">
                        <Link href="/login" className="flex items-center justify-center w-full">
                            I already have an account
                        </Link>
                    </Button>
                </motion.div>
            </motion.div>

            {/* Footer text */}
            <motion.p
                className="text-center text-xs text-text-tertiary"
                variants={itemVariants}
            >
                By continuing, you agree to our{" "}
                <a href="#" className="underline hover:text-text-secondary transition-colors">
                    Terms of Service
                </a>{" "}
                and{" "}
                <a href="#" className="underline hover:text-text-secondary transition-colors">
                    Privacy Policy
                </a>
                .
            </motion.p>
        </motion.div>
    );
}
