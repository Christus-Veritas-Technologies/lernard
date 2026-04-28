import type { InputHTMLAttributes, ReactNode } from "react";
import { useState } from "react";

import { EyeIcon } from "hugeicons-react";

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
    type,
    ...props
}: AuthFieldProps) {
    const [showPassword, setShowPassword] = useState(false);
    const fieldId = id ?? label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const describedBy = error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined;
    const isPasswordField = type === "password";
    const displayType = isPasswordField && showPassword ? "text" : type;

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
                    type={displayType}
                    {...props}
                />
                {isPasswordField ? (
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="ml-3 flex items-center text-text-secondary transition hover:text-text-primary"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                        <EyeIcon size={18} strokeWidth={showPassword ? 1.5 : 1} opacity={showPassword ? 1 : 0.5} />
                    </button>
                ) : trailing ? (
                    <span className="ml-3 flex items-center text-text-secondary">{trailing}</span>
                ) : null}
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