"use client";

import { LockIcon, SparklesIcon } from "hugeicons-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

interface HardPaywallProps {
    /** Which resource is exhausted, e.g. "lessons", "practice exams" */
    resource: string;
    /** ISO reset timestamp */
    resetAt?: string;
}

/**
 * Absolute-positioned overlay that appears over a creation form when a quota is 100% exhausted.
 * User can still navigate away — the overlay is not a modal.
 *
 * Usage: wrap the form container in `relative` and render <HardPaywall> as a sibling.
 *
 * @example
 * <div className="relative">
 *   <MyCreateForm />
 *   {isExhausted && <HardPaywall resource="lessons" resetAt={planUsage.resetAt} />}
 * </div>
 */
export function HardPaywall({ resource, resetAt }: HardPaywallProps) {
    const router = useRouter();

    const resetLabel = resetAt
        ? new Date(resetAt).toLocaleDateString(undefined, { month: "long", day: "numeric" })
        : null;

    return (
        <div
            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 rounded-2xl bg-background/90 backdrop-blur-sm px-6 text-center"
            aria-label={`${resource} limit reached`}
        >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <LockIcon size={22} className="text-primary" />
            </div>
            <div className="space-y-1">
                <p className="text-base font-semibold">
                    You've used all your {resource}
                </p>
                {resetLabel && (
                    <p className="text-sm text-text-secondary">
                        Your allowance resets on {resetLabel}.
                    </p>
                )}
            </div>
            <div className="flex flex-col gap-2 w-full max-w-xs">
                <Button className="w-full gap-2" onClick={() => router.push("/plans")}>
                    <SparklesIcon size={15} />
                    Upgrade plan
                </Button>
                <Button variant="ghost" className="w-full" onClick={() => router.back()}>
                    Go back
                </Button>
            </div>
        </div>
    );
}
