import type { HTMLAttributes } from "react";

import { cn } from "@/lib/cn";

type AlertVariant = "default" | "warning" | "success";

interface AlertProps extends HTMLAttributes<HTMLDivElement> {
    variant?: AlertVariant;
}

const variantClasses: Record<AlertVariant, string> = {
    default: "border-border bg-background text-text-primary",
    warning: "border-amber-200 bg-amber-50 text-amber-950",
    success: "border-emerald-200 bg-emerald-50 text-emerald-950",
};

export function Alert({ className, variant = "default", ...props }: AlertProps) {
    return (
        <div
            className={cn(
                "rounded-3xl border px-4 py-3 shadow-[0_16px_48px_-36px_rgba(15,23,42,0.28)]",
                variantClasses[variant],
                className,
            )}
            role="alert"
            {...props}
        />
    );
}

export function AlertTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
    return <h5 className={cn("text-sm font-semibold", className)} {...props} />;
}

export function AlertDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
    return <p className={cn("mt-1 text-sm leading-6 opacity-90", className)} {...props} />;
}