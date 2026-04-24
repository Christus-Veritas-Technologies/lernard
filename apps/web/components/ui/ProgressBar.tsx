import { cn } from "../../lib/cn";

interface ProgressBarProps {
    value: number;
    className?: string;
    indicatorClassName?: string;
}

function getProgressWidthClass(value: number) {
    const clampedValue = Math.max(0, Math.min(100, value));

    if (clampedValue <= 0) return "w-0";
    if (clampedValue <= 5) return "w-[5%]";
    if (clampedValue <= 10) return "w-[10%]";
    if (clampedValue <= 15) return "w-[15%]";
    if (clampedValue <= 20) return "w-1/5";
    if (clampedValue <= 25) return "w-1/4";
    if (clampedValue <= 30) return "w-[30%]";
    if (clampedValue <= 35) return "w-[35%]";
    if (clampedValue <= 40) return "w-2/5";
    if (clampedValue <= 45) return "w-[45%]";
    if (clampedValue <= 50) return "w-1/2";
    if (clampedValue <= 55) return "w-[55%]";
    if (clampedValue <= 60) return "w-3/5";
    if (clampedValue <= 65) return "w-[65%]";
    if (clampedValue <= 70) return "w-[70%]";
    if (clampedValue <= 75) return "w-3/4";
    if (clampedValue <= 80) return "w-4/5";
    if (clampedValue <= 85) return "w-[85%]";
    if (clampedValue <= 90) return "w-[90%]";
    if (clampedValue <= 95) return "w-[95%]";

    return "w-full";
}

export function ProgressBar({
    value,
    className,
    indicatorClassName,
}: ProgressBarProps) {
    const clampedValue = Math.max(0, Math.min(100, value));

    return (
        <div
            aria-label={`Progress ${Math.round(clampedValue)} percent`}
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={Math.round(clampedValue)}
            className={cn("h-2.5 overflow-hidden rounded-full bg-background-subtle", className)}
            role="progressbar"
        >
            <div
                className={cn(
                    "h-full rounded-full bg-primary-500 transition-[width] duration-300",
                    getProgressWidthClass(clampedValue),
                    indicatorClassName,
                )}
            />
        </div>
    );
}