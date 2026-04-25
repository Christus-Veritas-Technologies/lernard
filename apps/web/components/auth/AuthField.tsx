import type { InputHTMLAttributes, ReactNode } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";

interface AuthFieldProps extends InputHTMLAttributes<HTMLInputElement> {
    label: string;
    hint?: string;
    error?: string;
    icon?: ReactNode;
    trailing?: ReactNode;
}

export function AuthField({
    className,
    error,
    hint,
    icon,
    id,
    label,
    trailing,
    ...props
}: AuthFieldProps) {
    const fieldId = id ?? label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const describedBy = error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined;

    return (
        <label className="flex flex-col gap-2" htmlFor={fieldId}>
            <span className="text-sm font-semibold text-text-primary">{label}</span>
            <span
                className={cn(
                    "flex min-h-12 items-center rounded-2xl border bg-white px-4 shadow-[0_12px_30px_-24px_rgba(30,42,84,0.32)] transition focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-background",
                    error
                        ? "border-error focus-within:ring-error"
                        : "border-border focus-within:border-primary-300 focus-within:ring-primary-300",
                )}
            >
                {icon ? <span className="mr-3 text-text-secondary">{icon}</span> : null}
                <Input
                    aria-invalid={Boolean(error)}
                    aria-describedby={describedBy}
                    className={cn(
                        "border-0 bg-transparent px-0 py-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0",
                        className,
                    )}
                    hasError={Boolean(error)}
                    id={fieldId}
                    {...props}
                />
                {trailing ? <span className="ml-3 flex items-center text-text-secondary">{trailing}</span> : null}
            </span>
            {error ? (
                <span className="text-sm text-error" id={`${fieldId}-error`}>
                    {error}
                </span>
            ) : hint ? (
                <span className="text-sm text-text-secondary" id={`${fieldId}-hint`}>
                    {hint}
                </span>
            ) : null}
        </label>
    );
}