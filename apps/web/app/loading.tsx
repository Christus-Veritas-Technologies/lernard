"use client";

import { motion, type Variants } from "framer-motion";
import { SparklesIcon } from "hugeicons-react";
import Link from "next/link";

export default function Loading() {
  const dotVariants: Variants = {
    animate: {
      y: [0, -10, 0],
      transition: {
        duration: 0.6,
        repeat: Infinity,
        ease: "easeInOut" as const,
      },
    },
  };

  const containerVariants: Variants = {
    animate: {
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#f8fbff_0%,#ffffff_42%,#fff8f3_100%)] flex flex-col items-center justify-center gap-8 px-4">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 border-b border-border/40 bg-white/50 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-500">
              <SparklesIcon className="text-white" size={18} />
            </div>
            <span className="text-text-primary">Lernard</span>
          </Link>
          <nav className="hidden sm:flex gap-6 text-sm text-text-secondary">
            <Link href="/" className="hover:text-text-primary transition-colors">Home</Link>
            <Link href="/login" className="hover:text-text-primary transition-colors">Sign in</Link>
          </nav>
        </div>
      </div>

      {/* Loading Content */}
      <div className="flex flex-col items-center gap-6 text-center">
        {/* Animated logo */}
        <motion.div
          className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-500 shadow-lg shadow-primary-500/25"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <SparklesIcon className="text-white" size={32} />
        </motion.div>

        {/* Loading text */}
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-text-primary">Loading</h1>
          <p className="text-sm text-text-secondary">
            Preparing your learning experience…
          </p>
        </div>

        {/* Animated dots */}
        <motion.div
          className="flex gap-2"
          variants={containerVariants}
          animate="animate"
        >
          <motion.div
            className="h-2 w-2 rounded-full bg-primary-500"
            variants={dotVariants}
          />
          <motion.div
            className="h-2 w-2 rounded-full bg-primary-500"
            variants={dotVariants}
          />
          <motion.div
            className="h-2 w-2 rounded-full bg-primary-500"
            variants={dotVariants}
          />
        </motion.div>
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-border/40 bg-white/50 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 h-12 flex items-center justify-center text-xs text-text-tertiary">
          © 2026 Lernard. AI-powered adaptive learning.
        </div>
      </div>
    </div>
  );
}
