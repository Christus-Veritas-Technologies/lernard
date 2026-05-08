import { ChartBarLineIcon, Settings02Icon } from "hugeicons-react";

import { cn } from "@/lib/cn";

interface GuardianEmptyVisualProps {
    title: string;
    subtitle: string;
    className?: string;
}

export function GuardianEmptyVisual({ title, subtitle, className }: GuardianEmptyVisualProps) {
    return (
        <div className={cn("rounded-2xl border border-dashed border-border bg-surface p-5", className)}>
            <div className="flex items-center justify-between">
                <div className="rounded-xl bg-accent-cool-100 p-2 text-accent-cool-700">
                    <ChartBarLineIcon size={18} strokeWidth={1.8} />
                </div>
                <div className="rounded-xl bg-accent-primary-100 p-2 text-accent-primary-700">
                    <Settings02Icon size={18} strokeWidth={1.8} />
                </div>
            </div>

            <p className="mt-4 text-sm font-semibold text-text-primary">{title}</p>
            <p className="mt-1 text-sm text-text-secondary">{subtitle}</p>

            <div className="mt-4 space-y-2">
                <div className="h-2 w-[92%] rounded-full bg-border" />
                <div className="h-2 w-[74%] rounded-full bg-border" />
                <div className="h-2 w-[82%] rounded-full bg-border" />
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="h-14 rounded-xl bg-background" />
                <div className="h-14 rounded-xl bg-background" />
                <div className="h-14 rounded-xl bg-background" />
            </div>
        </div>
    );
}
