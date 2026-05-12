import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "default";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    children: ReactNode;
    variant?: ButtonVariant;
    size?: ButtonSize;
}

const variantClasses: Record<ButtonVariant, string> = {
    primary:
        "bg-primary-500 text-white shadow-sm hover:bg-primary-600 focus-visible:ring-primary-300",
    default:
        "bg-primary-500 text-white shadow-sm hover:bg-primary-600 focus-visible:ring-primary-300",
    secondary:
        "bg-surface text-text-primary ring-1 ring-inset ring-border hover:bg-background-subtle focus-visible:ring-primary-300",
    ghost:
        "bg-transparent text-text-secondary hover:bg-background-subtle hover:text-text-primary focus-visible:ring-primary-300",
    danger:
        "bg-error text-text-inverse shadow-sm hover:opacity-90 focus-visible:ring-error",
};

const sizeClasses: Record<ButtonSize, string> = {
    sm: "min-h-8 px-3 py-1.5 text-xs rounded-xl",
    md: "min-h-11 px-4 py-2.5 text-sm rounded-2xl",
    lg: "min-h-12 px-5 py-3 text-base rounded-2xl",
};

export function Button({
    children,
    className,
    type = "button",
    variant = "primary",
    size = "md",
    ...props
}: ButtonProps) {
    return (
        <button
            className={cn(
                "inline-flex items-center justify-center font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60",
                sizeClasses[size],
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