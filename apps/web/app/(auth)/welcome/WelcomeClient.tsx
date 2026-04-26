"use client";

import Link from "next/link";
import { motion } from "framer-motion";

import { BookOpen01Icon, ArrowRight01Icon, CheckmarkCircle02Icon } from "hugeicons-react";
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
            className="flex flex-col gap-12"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {/* Hero Section - Minimal, clean split design */}
            <div className="grid gap-8 lg:grid-cols-2 lg:items-center lg:gap-12">
                {/* Left: Content */}
                <motion.div className="space-y-8" variants={itemVariants}>
                    {/* Overline */}
                    <motion.span className="inline-block text-xs font-semibold uppercase tracking-widest text-primary-600" variants={itemVariants}>
                        The future of learning
                    </motion.span>

                    {/* Main heading */}
                    <motion.div className="space-y-4" variants={itemVariants}>
                        <h1 className="text-6xl lg:text-7xl font-bold tracking-tight text-text-primary">
                            Learn with an AI that knows you.
                        </h1>
                        <p className="text-xl text-text-secondary leading-relaxed max-w-xl">
                            Lernard remembers every lesson, adapts to your pace, and builds a personalized learning journey just for you.
                        </p>
                    </motion.div>

                    {/* Key benefits as list */}
                    <motion.ul className="space-y-3" variants={itemVariants}>
                        {["Personalized lessons generated in real-time", "AI remembers your progress across sessions", "Adapts difficulty to match your level"].map((benefit, i) => (
                            <motion.li key={i} className="flex items-start gap-3" variants={itemVariants}>
                                <CheckmarkCircle02Icon size={20} className="shrink-0 text-secondary-500 mt-0.5" />
                                <span className="text-text-primary">{benefit}</span>
                            </motion.li>
                        ))}
                    </motion.ul>
                </motion.div>

                {/* Right: Visual showcase card */}
                <motion.div
                    className="relative hidden lg:block"
                    variants={itemVariants}
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-primary-500/20 to-secondary-500/20 rounded-3xl blur-3xl" />
                    <div className="relative rounded-3xl bg-gradient-to-br from-primary-50 to-secondary-50 border border-primary-200 p-8 space-y-6">
                        <div className="space-y-2">
                            <p className="text-sm font-semibold text-primary-600 uppercase tracking-wide">Sample Lesson</p>
                            <h3 className="text-2xl font-bold text-text-primary">Quantum Mechanics</h3>
                        </div>
                        <div className="space-y-3">
                            <div className="h-3 w-3/4 rounded-full bg-primary-200" />
                            <div className="h-3 w-5/6 rounded-full bg-primary-100" />
                            <div className="h-3 w-2/3 rounded-full bg-primary-100" />
                        </div>
                        <div className="flex items-center justify-between pt-4 border-t border-primary-200">
                            <span className="text-sm text-text-secondary">Your level: Advanced</span>
                            <span className="text-sm font-semibold text-primary-600">85% complete</span>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* CTA Buttons */}
            <motion.div className="flex flex-col sm:flex-row gap-3" variants={itemVariants}>
                <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1"
                >
                    <Button asChild className="w-full h-12 text-base font-semibold">
                        <Link href="/register" className="flex items-center justify-center gap-2">
                            Get started — it&apos;s free
                            <ArrowRight01Icon size={18} />
                        </Link>
                    </Button>
                </motion.div>
                <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1 sm:flex-none sm:min-w-max"
                >
                    <Button asChild variant="secondary" className="w-full h-12 text-base font-semibold">
                        <Link href="/login">
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
