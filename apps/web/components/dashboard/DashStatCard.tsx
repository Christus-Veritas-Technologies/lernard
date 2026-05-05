import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

interface DashStatCardProps {
    icon: ReactNode;
    value: string | number;
    label: string;
    iconBg?: string;
    iconColor?: string;
}

export function DashStatCard({
    icon,
    value,
    label,
    iconBg = "bg-primary-100",
    iconColor = "text-primary-500",
}: DashStatCardProps) {
    return (
        <div className="relative flex items-center gap-4 rounded-2xl border border-border bg-surface p-4 shadow-sm">
            <button
                aria-label="Options"
                className="absolute right-3 top-3 text-text-tertiary transition hover:text-text-secondary"
                type="button"
            >
                <svg fill="currentColor" height="14" viewBox="0 0 14 14" width="14">
                    <circle cx="2" cy="7" r="1.3" />
                    <circle cx="7" cy="7" r="1.3" />
                    <circle cx="12" cy="7" r="1.3" />
                </svg>
            </button>

            <div
                className={cn(
                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
                    iconBg,
                    iconColor,
                )}
            >
                {icon}
            </div>

            <div className="min-w-0">
                <p className="truncate text-2xl font-bold text-text-primary">{value}</p>
                <p className="mt-0.5 truncate text-sm text-text-secondary">{label}</p>
            </div>
        </div>
    );
}
