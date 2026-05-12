"use client";

import { SparklesIcon } from "hugeicons-react";
import { useRouter } from "next/navigation";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/Button";

interface UpgradeDialogProps {
    open: boolean;
    onClose: () => void;
    /** Which resource triggered the dialog, e.g. "lessons", "chat messages" */
    resource: string;
    /** ISO reset timestamp */
    resetAt?: string;
}

/**
 * Modal that surfaces when a hard limit is hit.
 * No payment UI — navigates to the plans page.
 */
export function UpgradeDialog({ open, onClose, resource, resetAt }: UpgradeDialogProps) {
    const router = useRouter();

    const resetLabel = resetAt
        ? new Date(resetAt).toLocaleDateString(undefined, { month: "long", day: "numeric" })
        : null;

    function goToPlans() {
        onClose();
        router.push("/plans");
    }

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <SparklesIcon size={20} className="text-primary" />
                    </div>
                    <DialogTitle className="text-lg">You've reached your {resource} limit</DialogTitle>
                    <DialogDescription className="text-sm text-text-secondary">
                        {resetLabel
                            ? `Your allowance resets on ${resetLabel}. Upgrade for more ${resource} this cycle.`
                            : `You've used all your ${resource} for this period.`}
                    </DialogDescription>
                </DialogHeader>

                <div className="mt-2 flex flex-col gap-2">
                    <Button className="w-full" onClick={goToPlans}>
                        See upgrade options
                    </Button>
                    <Button variant="ghost" className="w-full" onClick={onClose}>
                        Maybe later
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
