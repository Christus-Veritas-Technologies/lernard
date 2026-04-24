"use client";

import { useId } from "react";

import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/cn";

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
    const descriptionId = `${id}-description`;
    const titleId = `${id}-title`;

    return (
        <div
            className={cn(
                "flex min-h-32 flex-col justify-between rounded-3xl border border-border bg-surface p-5 shadow-[0_12px_40px_-28px_rgba(30,42,84,0.45)] transition hover:border-primary-200",
                className,
            )}
        >
            <div className="space-y-2">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="text-base font-semibold text-text-primary" id={titleId}>
                            {title}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-text-secondary" id={descriptionId}>
                            {description}
                        </p>
                    </div>
                    <Switch
                        aria-describedby={descriptionId}
                        aria-labelledby={titleId}
                        checked={checked}
                        id={id}
                        onCheckedChange={onCheckedChange}
                    />
                </div>
            </div>
        </div>
    );
}