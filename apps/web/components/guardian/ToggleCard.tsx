"use client";

import { useId } from "react";

import { cn } from "../../lib/cn";

interface ToggleCardProps {
    title: string;
    description: string;
    checked: boolean;
    onCheckedChange: (nextValue: boolean) => void;
    className?: string;
}

export function ToggleCard({
    title,
    description,
    checked,
    onCheckedChange,
    className,
}: ToggleCardProps) {
    const id = useId();

    return (
        <label
            className={cn(
                "flex min-h-32 cursor-pointer flex-col justify-between rounded-3xl border border-border bg-surface p-5 shadow-[0_12px_40px_-28px_rgba(30,42,84,0.45)] transition hover:border-primary-200",
                className,
            )}
            htmlFor={id}
        >
            <div className="space-y-2">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="text-base font-semibold text-text-primary">{title}</p>
                        <p className="mt-2 text-sm leading-6 text-text-secondary">{description}</p>
                    </div>
                    <div
                        aria-hidden="true"
                        className={cn(
                            "flex h-7 w-12 items-center rounded-full p-1 transition",
                            checked ? "bg-primary-500" : "bg-background-subtle",
                        )}
                    >
                        <span
                            className={cn(
                                "block h-5 w-5 rounded-full bg-white shadow-sm transition",
                                checked ? "translate-x-5" : "translate-x-0",
                            )}
                        />
                    </div>
                </div>
            </div>
            <input
                checked={checked}
                className="sr-only"
                id={id}
                onChange={(event) => onCheckedChange(event.target.checked)}
                type="checkbox"
            />
        </label>
    );
}