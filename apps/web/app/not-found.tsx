import { SparklesIcon, ArrowRight01Icon } from "hugeicons-react";
import Link from "next/link";

export default function NotFound() {
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
        {/* 404 Illustration */}
        <div className="flex flex-col items-center gap-6">
          <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-error-bg">
            <span className="text-5xl font-bold text-error">404</span>
          </div>

          <div className="text-center space-y-2 max-w-sm">
            <h1 className="text-3xl font-bold text-text-primary">Page not found</h1>
            <p className="text-text-secondary">
              We couldn't find what you're looking for. Let's get you back on track with your learning.
            </p>
          </div>
        </div>

        {/* Navigation Options */}
        <div className="grid gap-3 sm:grid-cols-2 w-full max-w-sm">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 rounded-2xl bg-primary-500 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-600 transition-colors"
          >
            Back to Home
            <ArrowRight01Icon size={16} />
          </Link>
          <Link
            href="/login"
            className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-surface px-6 py-3 text-sm font-semibold text-text-primary shadow-sm hover:bg-background-subtle transition-colors"
          >
            Sign in
            <ArrowRight01Icon size={16} />
          </Link>
        </div>

        {/* Help Text */}
        <p className="text-xs text-text-tertiary text-center max-w-sm">
          If you think this is a mistake, please{" "}
          <a href="mailto:support@lernard.co.zw" className="text-primary-500 hover:text-primary-600 underline">
            contact support
          </a>
        </p>
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
