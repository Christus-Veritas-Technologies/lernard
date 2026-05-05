"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { AlertCircleIcon, SparklesIcon, ArrowRight01Icon } from "hugeicons-react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#f8fbff_0%,#ffffff_42%,#fff8f3_100%)] flex flex-col">
      {/* Header */}
      <div className="border-b border-border/40 bg-white/50 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-500">
              <SparklesIcon className="text-white" size={18} />
            </div>
            <span className="text-text-primary">Lernard</span>
          </Link>
          <nav className="hidden sm:flex gap-6 text-sm text-text-secondary">
            <Link href="/" className="hover:text-text-primary transition-colors">
              Home
            </Link>
            <Link href="/login" className="hover:text-text-primary transition-colors">
              Sign in
            </Link>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center gap-8 px-4 py-12">
        {/* Error Illustration */}
        <motion.div
          className="flex flex-col items-center gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            className="flex h-24 w-24 items-center justify-center rounded-2xl bg-error-bg"
            animate={{ rotate: [0, -5, 5, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            <AlertCircleIcon className="text-error" size={48} />
          </motion.div>

          <div className="text-center space-y-2 max-w-sm">
            <h1 className="text-3xl font-bold text-text-primary">Something went wrong</h1>
            <p className="text-text-secondary">
              We encountered an unexpected error. Don't worry, our team has been notified.
            </p>
            {error.digest && (
              <p className="text-xs text-text-tertiary font-mono mt-4 break-all">
                Error ID: {error.digest}
              </p>
            )}
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          className="flex flex-col sm:flex-row gap-3 w-full max-w-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <button
            onClick={reset}
            className="flex items-center justify-center gap-2 rounded-2xl bg-primary-500 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-600 transition-colors flex-1"
          >
            Try again
            <ArrowRight01Icon size={16} />
          </button>
          <Link
            href="/"
            className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-surface px-6 py-3 text-sm font-semibold text-text-primary shadow-sm hover:bg-background-subtle transition-colors flex-1"
          >
            Back to Home
          </Link>
        </motion.div>

        {/* Help Section */}
        <div className="space-y-2 text-center max-w-sm text-xs text-text-tertiary">
          <p>Need help? Contact our support team at:</p>
          <a
            href="mailto:support@lernard.co.zw"
            className="text-primary-500 hover:text-primary-600 underline block"
          >
            support@lernard.co.zw
          </a>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border/40 bg-white/50 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 h-12 flex items-center justify-center text-xs text-text-tertiary">
          © 2026 Lernard. AI-powered adaptive learning.
        </div>
      </div>
    </div>
  );
}
