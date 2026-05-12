"use client";

import { AlertCircleIcon } from "hugeicons-react";
import Link from "next/link";
import { cn } from "@/lib/cn";

interface LimitBannerProps {
    /** Message to display */
    message: string;
    /** ISO timestamp of when the limit resets */
    resetAt?: string;
    className?: string;
}

/**
 * Inline amber/red strip shown above an input when a quota is approaching or exhausted.
 * Low friction — stays inline, does not block navigation.
 */
export function LimitBanner({ message, resetAt, className }: LimitBannerProps) {
    const resetLabel = resetAt
        ? new Date(resetAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })
        : null;

    return (
        <div
            className={cn(
                "flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-700 dark:text-amber-400",
                className,
            )}
            role="alert"
        >
            <AlertCircleIcon size={16} className="mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
                <span>{message}</span>
                {resetLabel && (
                    <span className="ml-1 text-xs opacity-75">Resets {resetLabel}.</span>
                )}
                <Link
                    href="/plans"
                    className="ml-2 whitespace-nowrap underline underline-offset-2 hover:opacity-80"
                >
                    Upgrade plan
                </Link>
            </div>
        </div>
    );
}
