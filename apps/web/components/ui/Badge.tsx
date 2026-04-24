import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "../../lib/cn";

type BadgeTone = "primary" | "warm" | "cool" | "success" | "warning" | "muted";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
    children: ReactNode;
    tone?: BadgeTone;
}

const badgeToneClasses: Record<BadgeTone, string> = {
    primary: "bg-primary-100 text-primary-700",
    warm: "bg-accent-warm-100 text-text-primary",
    cool: "bg-accent-cool-100 text-text-primary",
    success: "bg-success-bg text-success",
    warning: "bg-warning-bg text-warning",
    muted: "bg-background-subtle text-text-secondary",
};

export function Badge({ children, className, tone = "muted", ...props }: BadgeProps) {
    return (
        <span
            className={cn(
                "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
                badgeToneClasses[tone],
                className,
            )}
            {...props}
        >
            {children}
        </span>
    );
}