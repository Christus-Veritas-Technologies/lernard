import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "../../lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    children: ReactNode;
    variant?: ButtonVariant;
}

const variantClasses: Record<ButtonVariant, string> = {
    primary:
        "bg-primary-500 text-text-inverse shadow-sm hover:bg-primary-600 focus-visible:ring-primary-300",
    secondary:
        "bg-surface text-text-primary ring-1 ring-inset ring-border hover:bg-background-subtle focus-visible:ring-primary-300",
    ghost:
        "bg-transparent text-text-secondary hover:bg-background-subtle hover:text-text-primary focus-visible:ring-primary-300",
    danger:
        "bg-error text-text-inverse shadow-sm hover:opacity-90 focus-visible:ring-error",
};

export function Button({
    children,
    className,
    type = "button",
    variant = "primary",
    ...props
}: ButtonProps) {
    return (
        <button
            className={cn(
                "inline-flex min-h-11 items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60",
                variantClasses[variant],
                className,
            )}
            type={type}
            {...props}
        >
            {children}
        </button>
    );
}