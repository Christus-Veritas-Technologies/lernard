"use client";

import { cn } from "@/lib/cn";
import { Progress } from "@/components/ui/progress";

interface QuotaBarProps {
    label: string;
    used: number;
    limit: number;
    /** Show unit suffix, e.g. "MB" */
    unit?: string;
    className?: string;
}

/**
 * A single resource consumption bar.
 * Turns amber at ≥80%, red at 100%.
 */
export function QuotaBar({ label, used, limit, unit, className }: QuotaBarProps) {
    if (limit <= 0) return null;

    const pct = Math.min(Math.round((used / limit) * 100), 100);
    const isWarning = pct >= 80 && pct < 100;
    const isExhausted = pct >= 100;

    const barClass = isExhausted
        ? "[&>div]:bg-destructive"
        : isWarning
          ? "[&>div]:bg-amber-500"
          : "[&>div]:bg-primary";

    const countText = unit ? `${used}/${limit} ${unit}` : `${used}/${limit}`;

    return (
        <div className={cn("flex flex-1 min-w-[140px] items-center gap-2", className)}>
            <span className="text-xs text-text-secondary whitespace-nowrap">{label}</span>
            <Progress value={pct} className={cn("flex-1", barClass)} />
            <span className={cn("text-xs whitespace-nowrap", isExhausted ? "text-destructive font-semibold" : isWarning ? "text-amber-600 font-medium" : "text-text-secondary")}>
                {countText}
            </span>
        </div>
    );
}
