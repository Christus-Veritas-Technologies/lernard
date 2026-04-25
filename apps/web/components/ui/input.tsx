import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    hasError?: boolean;
}

export function Input({ className, hasError = false, type = "text", ...props }: InputProps) {
    return (
        <input
            className={cn(
                "flex min-h-12 w-full rounded-2xl border bg-white px-4 py-3 text-sm text-text-primary shadow-[0_12px_30px_-24px_rgba(30,42,84,0.32)] transition placeholder:text-text-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60",
                hasError
                    ? "border-error focus-visible:ring-error"
                    : "border-border focus-visible:border-primary-300 focus-visible:ring-primary-300",
                className,
            )}
            type={type}
            {...props}
        />
    );
}