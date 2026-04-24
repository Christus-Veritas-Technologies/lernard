import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
    children: ReactNode;
}

interface CardSectionProps extends HTMLAttributes<HTMLDivElement> {
    children: ReactNode;
}

export function Card({ children, className, ...props }: CardProps) {
    return (
        <div
            className={cn(
                "rounded-3xl border border-border bg-surface p-5 shadow-[0_12px_40px_-28px_rgba(30,42,84,0.45)] sm:p-6",
                className,
            )}
            {...props}
        >
            {children}
        </div>
    );
}

export function CardHeader({ children, className, ...props }: CardSectionProps) {
    return (
        <div className={cn("flex flex-col gap-2", className)} {...props}>
            {children}
        </div>
    );
}

export function CardTitle({ children, className, ...props }: CardSectionProps) {
    return (
        <div className={cn("text-lg font-semibold text-text-primary", className)} {...props}>
            {children}
        </div>
    );
}

export function CardDescription({ children, className, ...props }: CardSectionProps) {
    return (
        <div className={cn("text-sm leading-6 text-text-secondary", className)} {...props}>
            {children}
        </div>
    );
}

export function CardContent({ children, className, ...props }: CardSectionProps) {
    return (
        <div className={cn("mt-5", className)} {...props}>
            {children}
        </div>
    );
}

export function CardFooter({ children, className, ...props }: CardSectionProps) {
    return (
        <div className={cn("mt-5 flex flex-wrap gap-3", className)} {...props}>
            {children}
        </div>
    );
}